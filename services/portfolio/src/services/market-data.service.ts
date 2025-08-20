import axios from 'axios';
// import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import { logger } from '../utils/logger';
import { Market } from '../types';
import { MarketValidationService } from './market-validation.service';
import { redisCache, RedisCacheService } from './redis-cache.service';

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  timestamp: string;
  market?: Market;
  currency?: string;
}

interface YahooQuoteResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketOpen: number;
        regularMarketVolume: number;
        marketCap?: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          high: number[];
          low: number[];
          open: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error?: any;
  };
}

enum ApiProvider {
  PRIMARY = 'primary',
  YAHOO_FINANCE = 'yahoo_finance',
  FALLBACK = 'fallback'
}

export class MarketDataService {
  private baseUrl: string;
  private cache: Map<string, { data: MarketQuote; timestamp: number }>;
  private cacheTTL: number = 60; // 60 seconds cache (in seconds for Redis)
  private memoryCacheTTL: number = 30000; // 30 seconds for in-memory cache (milliseconds)
  private yahooBaseUrl: string = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private apiFailureCount: Map<string, number> = new Map();
  private maxRetries: number = 3;
  private batchRequestQueue: Map<string, Promise<MarketQuote>> = new Map();
  private isRedisInitialized: boolean = false;

  constructor() {
    this.baseUrl = process.env.MARKET_DATA_URL || "http://localhost:4170"; // Default Market Data service port
    this.cache = new Map();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redisCache.connect();
      this.isRedisInitialized = true;
      logger.info('Redis cache initialized for market data service');
    } catch (error) {
      logger.warn('Redis cache initialization failed, falling back to in-memory cache:', error);
      this.isRedisInitialized = false;
    }
  }

  /**
   * Get current price for a single symbol
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const quote = await this.getQuote(symbol);
      return quote.price;
    } catch (error) {
      logger.warn(`Failed to get price for ${symbol}, using fallback`);
      return this.getFallbackPrice(symbol);
    }
  }

  /**
   * Get quote from Yahoo Finance API
   */
  private async getYahooQuote(symbol: string): Promise<MarketQuote> {
    try {
      const response = await axios.get<YahooQuoteResponse>(
        `${this.yahooBaseUrl}/${symbol}?interval=1d&range=1d`,
        {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        
        if (!meta || !quote) {
          throw new Error('Invalid Yahoo Finance response structure');
        }

        const currentPrice = meta.regularMarketPrice || quote.close?.[quote.close.length - 1] || 0;
        const previousClose = meta.previousClose || (meta as any).chartPreviousClose || quote.close?.[quote.close.length - 2] || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

        const marketQuote: MarketQuote = {
          symbol: meta.symbol,
          name: meta.symbol,
          price: parseFloat(currentPrice.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          previousClose: parseFloat(previousClose.toFixed(2)),
          volume: meta.regularMarketVolume || quote.volume?.[quote.volume.length - 1] || 0,
          marketCap: meta.marketCap || 0,
          high: meta.regularMarketDayHigh || Math.max(...(quote.high || [currentPrice])),
          low: meta.regularMarketDayLow || Math.min(...(quote.low || [currentPrice])),
          open: meta.regularMarketOpen || quote.open?.[0] || currentPrice,
          timestamp: new Date().toISOString()
        };

        return marketQuote;
      }

      throw new Error('No data found in Yahoo Finance response');
    } catch (error) {
      logger.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes from Yahoo Finance for multiple symbols
   */
  private async getYahooQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const quotes: MarketQuote[] = [];
    
    // Yahoo Finance doesn't support bulk requests, so we need to make individual calls
    for (const symbol of symbols) {
      try {
        const quote = await this.getYahooQuote(symbol);
        quotes.push(quote);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.warn(`Failed to get Yahoo Finance quote for ${symbol}:`, error);
        
        // Add fallback quote for failed symbol
        quotes.push({
          symbol,
          name: symbol,
          price: this.getFallbackPrice(symbol),
          change: 0,
          changePercent: 0,
          previousClose: this.getFallbackPrice(symbol),
          volume: 0,
          marketCap: 0,
          high: this.getFallbackPrice(symbol),
          low: this.getFallbackPrice(symbol),
          open: this.getFallbackPrice(symbol),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return quotes;
  }

  /**
   * Determine which API should be used based on failure count
   */
  private shouldUseYahooFinance(symbol: string): boolean {
    const failureCount = this.apiFailureCount.get(ApiProvider.PRIMARY) || 0;
    return failureCount >= this.maxRetries;
  }

  /**
   * Record API failure for circuit breaker pattern
   */
  private recordApiFailure(provider: ApiProvider): void {
    const currentCount = this.apiFailureCount.get(provider) || 0;
    this.apiFailureCount.set(provider, currentCount + 1);
    
    // Reset failure count after some time (5 minutes)
    if (currentCount === 0) {
      setTimeout(() => {
        this.apiFailureCount.set(provider, 0);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Get full quote data for a symbol with fallback support
   */
  async getQuote(symbol: string): Promise<MarketQuote> {
    // Check Redis cache first
    if (redisCache.isAvailable()) {
      const cacheKey = RedisCacheService.createMarketDataKey(symbol);
      const cachedData = await redisCache.get<MarketQuote>(cacheKey);
      if (cachedData) {
        logger.debug(`Redis cache hit for symbol: ${symbol}`);
        return cachedData;
      }
    }
    
    // Check in-memory cache as fallback
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.memoryCacheTTL) {
      logger.debug(`Memory cache hit for symbol: ${symbol}`);
      return cached.data;
    }
    
    // Check if there's already a request in progress for this symbol
    const existingRequest = this.batchRequestQueue.get(symbol);
    if (existingRequest) {
      logger.debug(`Reusing existing request for symbol: ${symbol}`);
      return existingRequest;
    }

    // Try primary API first unless it has too many failures
    if (!this.shouldUseYahooFinance(symbol)) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/api/v1/market/quote/${symbol}`,
          { timeout: 5000 }
        );

        if (response.data?.success && response.data?.data) {
          const quote = response.data.data;
          
          // Update both caches and reset failure count on success
          await this.updateCaches(symbol, quote);
          this.apiFailureCount.set(ApiProvider.PRIMARY, 0);
          
          logger.debug(`Successfully fetched quote for ${symbol} from primary API`);
          return quote;
        }

        throw new Error('Invalid response from primary market data service');
      } catch (error) {
        logger.warn(`Primary API failed for ${symbol}, trying Yahoo Finance:`, error);
        this.recordApiFailure(ApiProvider.PRIMARY);
        
        // Fall through to Yahoo Finance
      }
    }

    // Try Yahoo Finance as backup
    try {
      const quote = await this.getYahooQuote(symbol);
      
      // Update both caches
      await this.updateCaches(symbol, quote);
      
      logger.info(`Successfully fetched quote for ${symbol} from Yahoo Finance backup`);
      return quote;
    } catch (error) {
      logger.error(`Yahoo Finance also failed for ${symbol}:`, error);
      this.recordApiFailure(ApiProvider.YAHOO_FINANCE);
      
      // Final fallback to static prices
      const fallbackQuote: MarketQuote = {
        symbol,
        name: symbol,
        price: this.getFallbackPrice(symbol),
        change: 0,
        changePercent: 0,
        previousClose: this.getFallbackPrice(symbol),
        volume: 0,
        marketCap: 0,
        high: this.getFallbackPrice(symbol),
        low: this.getFallbackPrice(symbol),
        open: this.getFallbackPrice(symbol),
        timestamp: new Date().toISOString()
      };
      
      logger.warn(`Using static fallback price for ${symbol}: $${fallbackQuote.price}`);
      return fallbackQuote;
    }
  }

  /**
   * Get quotes for multiple symbols with fallback support
   */
  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    // Check cache first for all symbols
    const quotes: MarketQuote[] = [];
    const symbolsToFetch: string[] = [];

    symbols.forEach(symbol => {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        quotes.push(cached.data);
      } else {
        symbolsToFetch.push(symbol);
      }
    });

    // If all symbols are cached, return them
    if (symbolsToFetch.length === 0) {
      return quotes.sort((a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol));
    }

    // Try primary API first unless it has too many failures
    if (!this.shouldUseYahooFinance('bulk')) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/api/v1/market/quotes`,
          {
            params: { symbols: symbolsToFetch.join(',') },
            timeout: 8000
          }
        );

        if (response.data?.success && response.data?.data) {
          const fetchedQuotes = response.data.data;
          
          // Update cache for each quote and reset failure count
          fetchedQuotes.forEach((quote: MarketQuote) => {
            this.cache.set(quote.symbol, {
              data: quote,
              timestamp: Date.now()
            });
            quotes.push(quote);
          });
          
          this.apiFailureCount.set(ApiProvider.PRIMARY, 0);
          logger.debug(`Successfully fetched ${fetchedQuotes.length} quotes from primary API`);
          
          // Check if we got all requested symbols
          const fetchedSymbols = fetchedQuotes.map((q: MarketQuote) => q.symbol);
          const missingSymbols = symbolsToFetch.filter(s => !fetchedSymbols.includes(s));
          
          if (missingSymbols.length > 0) {
            logger.warn(`Primary API missing ${missingSymbols.length} symbols, fetching from Yahoo Finance`);
            const yahooQuotes = await this.getYahooQuotes(missingSymbols);
            quotes.push(...yahooQuotes);
          }
          
          return quotes.sort((a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol));
        }

        throw new Error('Invalid response from primary market data service');
      } catch (error) {
        logger.warn('Primary API failed for bulk quotes, trying Yahoo Finance:', error);
        this.recordApiFailure(ApiProvider.PRIMARY);
        
        // Fall through to Yahoo Finance
      }
    }

    // Try Yahoo Finance as backup
    try {
      const yahooQuotes = await this.getYahooQuotes(symbolsToFetch);
      
      // Update cache for each quote
      yahooQuotes.forEach(quote => {
        this.cache.set(quote.symbol, {
          data: quote,
          timestamp: Date.now()
        });
      });
      
      quotes.push(...yahooQuotes);
      logger.info(`Successfully fetched ${yahooQuotes.length} quotes from Yahoo Finance backup`);
      
      return quotes.sort((a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol));
    } catch (error) {
      logger.error('Yahoo Finance also failed for bulk quotes:', error);
      this.recordApiFailure(ApiProvider.YAHOO_FINANCE);
      
      // Final fallback to static prices for missing symbols
      const fallbackQuotes = symbolsToFetch.map(symbol => ({
        symbol,
        name: symbol,
        price: this.getFallbackPrice(symbol),
        change: 0,
        changePercent: 0,
        previousClose: this.getFallbackPrice(symbol),
        volume: 0,
        marketCap: 0,
        high: this.getFallbackPrice(symbol),
        low: this.getFallbackPrice(symbol),
        open: this.getFallbackPrice(symbol),
        timestamp: new Date().toISOString()
      }));
      
      quotes.push(...fallbackQuotes);
      logger.warn(`Using static fallback prices for ${fallbackQuotes.length} symbols`);
      
      return quotes.sort((a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol));
    }
  }

  /**
   * Update both Redis and in-memory caches
   */
  private async updateCaches(symbol: string, quote: MarketQuote): Promise<void> {
    // Update in-memory cache
    this.cache.set(symbol, {
      data: quote,
      timestamp: Date.now()
    });
    
    // Update Redis cache if available
    if (redisCache.isAvailable()) {
      const cacheKey = RedisCacheService.createMarketDataKey(symbol);
      await redisCache.set(cacheKey, quote, { ttl: this.cacheTTL });
    }
  }
  
  /**
   * Clear cache for a specific symbol
   */
  async clearCache(symbol?: string): Promise<void> {
    if (symbol) {
      this.cache.delete(symbol);
      if (redisCache.isAvailable()) {
        const cacheKey = RedisCacheService.createMarketDataKey(symbol);
        await redisCache.del(cacheKey);
      }
    } else {
      // Clear all caches
      this.cache.clear();
      if (redisCache.isAvailable()) {
        await redisCache.flush();
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ 
    memoryCache: number; 
    redisCache: { connected: boolean; keys: number; memory?: string };
    hitRate: number;
  }> {
    const redisStats = await redisCache.getStats();
    
    return {
      memoryCache: this.cache.size,
      redisCache: redisStats,
      hitRate: 0 // Will be calculated based on actual hits/misses
    };
  }

  /**
   * Get fallback price when API is unavailable
   */
  private getFallbackPrice(symbol: string): number {
    const fallbackPrices: Record<string, number> = {
      'AAPL': 180.50,
      'GOOGL': 140.25,
      'MSFT': 380.75,
      'TSLA': 250.30,
      'AMZN': 175.45,
      'META': 485.20,
      'NVDA': 720.50,
      'JPM': 195.80,
      'V': 265.30,
      'JNJ': 155.20
    };

    return fallbackPrices[symbol.toUpperCase()] || 100.00;
  }

  /**
   * Calculate portfolio value with real-time prices
   */
  async calculatePortfolioValue(holdings: Array<{ symbol: string; quantity: number }>): Promise<number> {
    if (!holdings || holdings.length === 0) {
      return 0;
    }

    try {
      const symbols = holdings.map(h => h.symbol);
      const quotes = await this.getQuotes(symbols);
      
      const priceMap = new Map(
        quotes.map(q => [q.symbol, q.price])
      );

      let totalValue = 0;
      for (const holding of holdings) {
        const price = priceMap.get(holding.symbol) || this.getFallbackPrice(holding.symbol);
        totalValue += price * holding.quantity;
      }

      return parseFloat(totalValue.toFixed(2));
    } catch (error) {
      logger.error('Error calculating portfolio value:', error);
      
      // Calculate with fallback prices
      let totalValue = 0;
      for (const holding of holdings) {
        const price = this.getFallbackPrice(holding.symbol);
        totalValue += price * holding.quantity;
      }
      
      return parseFloat(totalValue.toFixed(2));
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if market data service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { timeout: 2000 }
      );
      return response.data?.status === 'healthy';
    } catch (error) {
      logger.warn('Market data service is not available');
      return false;
    }
  }

  /**
   * Check if Yahoo Finance is available
   */
  async isYahooFinanceAvailable(): Promise<boolean> {
    try {
      // Test with a common symbol
      const response = await axios.get(
        `${this.yahooBaseUrl}/AAPL?interval=1d&range=1d`,
        { 
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      return response.data?.chart?.result?.length > 0;
    } catch (error) {
      logger.warn('Yahoo Finance is not available');
      return false;
    }
  }

  /**
   * Get API status and statistics
   */
  async getApiStatus(): Promise<{
    primary: { available: boolean; failures: number };
    yahoo: { available: boolean; failures: number };
    cache: { size: number; hitRate?: number };
  }> {
    const [primaryAvailable, yahooAvailable] = await Promise.allSettled([
      this.isServiceAvailable(),
      this.isYahooFinanceAvailable()
    ]);

    return {
      primary: {
        available: primaryAvailable.status === 'fulfilled' ? primaryAvailable.value : false,
        failures: this.apiFailureCount.get(ApiProvider.PRIMARY) || 0
      },
      yahoo: {
        available: yahooAvailable.status === 'fulfilled' ? yahooAvailable.value : false,
        failures: this.apiFailureCount.get(ApiProvider.YAHOO_FINANCE) || 0
      },
      cache: {
        size: this.cache.size
      }
    };
  }

  /**
   * Force use of specific API provider for testing
   */
  async forceApiProvider(provider: ApiProvider, symbol: string): Promise<MarketQuote> {
    switch (provider) {
      case ApiProvider.PRIMARY:
        const response = await axios.get(
          `${this.baseUrl}/api/v1/market/quote/${symbol}`,
          { timeout: 5000 }
        );
        if (response.data?.success && response.data?.data) {
          return response.data.data;
        }
        throw new Error('Primary API failed');

      case ApiProvider.YAHOO_FINANCE:
        return await this.getYahooQuote(symbol);

      case ApiProvider.FALLBACK:
      default:
        return {
          symbol,
          name: symbol,
          price: this.getFallbackPrice(symbol),
          change: 0,
          changePercent: 0,
          previousClose: this.getFallbackPrice(symbol),
          volume: 0,
          marketCap: 0,
          high: this.getFallbackPrice(symbol),
          low: this.getFallbackPrice(symbol),
          open: this.getFallbackPrice(symbol),
          timestamp: new Date().toISOString()
        };
    }
  }

  /**
   * Reset API failure counts (useful for testing)
   */
  resetFailureCounts(): void {
    this.apiFailureCount.clear();
    logger.info('API failure counts have been reset');
  }

  /**
   * Get quote with market specification
   */
  async getQuoteByMarket(symbol: string, market: Market): Promise<MarketQuote> {
    const yahooSymbol = MarketValidationService.getYahooSymbol(symbol, market);
    const quote = await this.getQuote(yahooSymbol);
    
    return {
      ...quote,
      market,
      symbol: MarketValidationService.formatSymbol(symbol, market)
    };
  }

  /**
   * Get quotes for multiple symbols from different markets
   */
  async getQuotesByMarket(requests: Array<{symbol: string; market: Market}>): Promise<MarketQuote[]> {
    if (!requests || requests.length === 0) {
      return [];
    }

    // Convert to Yahoo Finance format
    const yahooSymbols = requests.map(req => 
      MarketValidationService.getYahooSymbol(req.symbol, req.market)
    );

    // Get quotes using existing method
    const quotes = await this.getQuotes(yahooSymbols);
    
    // Map back to original requests with market info
    return quotes.map((quote, index) => {
      const request = requests[index];
      return {
        ...quote,
        market: request.market,
        symbol: MarketValidationService.formatSymbol(request.symbol, request.market)
      };
    });
  }

  /**
   * Search for stocks across different markets
   */
  async searchStocks(query: string, market?: Market): Promise<Array<{
    symbol: string;
    name: string;
    market: Market;
    exchange: string;
  }>> {
    // This is a simplified implementation
    // In a real system, you'd integrate with market-specific search APIs
    
    const mockResults = [
      // US stocks
      { symbol: 'AAPL', name: 'Apple Inc.', market: Market.NASDAQ, exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', market: Market.NASDAQ, exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', market: Market.NASDAQ, exchange: 'NASDAQ' },
      
      // Thai stocks
      { symbol: 'CPALL', name: 'CP ALL Public Company Limited', market: Market.SET, exchange: 'SET' },
      { symbol: 'PTT', name: 'PTT Public Company Limited', market: Market.SET, exchange: 'SET' },
      { symbol: 'KBANK', name: 'Kasikornbank Public Company Limited', market: Market.SET, exchange: 'SET' },
      
      // Hong Kong stocks
      { symbol: '0700', name: 'Tencent Holdings Limited', market: Market.HKSE, exchange: 'HKSE' },
      { symbol: '0941', name: 'China Mobile Limited', market: Market.HKSE, exchange: 'HKSE' },
      
      // Japanese stocks
      { symbol: '7203', name: 'Toyota Motor Corporation', market: Market.TSE, exchange: 'TSE' },
      { symbol: '6758', name: 'Sony Group Corporation', market: Market.TSE, exchange: 'TSE' }
    ];

    let filteredResults = mockResults;
    
    // Filter by market if specified
    if (market) {
      filteredResults = mockResults.filter(result => result.market === market);
    }
    
    // Filter by query
    if (query) {
      const queryLower = query.toLowerCase();
      filteredResults = filteredResults.filter(result => 
        result.symbol.toLowerCase().includes(queryLower) ||
        result.name.toLowerCase().includes(queryLower)
      );
    }
    
    return filteredResults.slice(0, 20); // Limit results
  }

  /**
   * Get market-specific fallback price
   */
  private getMarketFallbackPrice(symbol: string, market: Market): number {
    // Market-specific fallback prices
    const fallbackPrices: Record<Market, Record<string, number>> = {
      [Market.US]: {
        'AAPL': 180.50, 'GOOGL': 140.25, 'MSFT': 380.75,
        'TSLA': 250.30, 'AMZN': 175.45, 'META': 485.20
      },
      [Market.NASDAQ]: {
        'AAPL': 180.50, 'GOOGL': 140.25, 'MSFT': 380.75,
        'TSLA': 250.30, 'AMZN': 175.45, 'META': 485.20
      },
      [Market.NYSE]: {
        'JPM': 195.80, 'V': 265.30, 'JNJ': 155.20
      },
      [Market.NYSE_ARCA]: {
        'ICOI': 43.25, 'SPY': 450.00, 'QQQ': 380.00
      },
      [Market.SET]: {
        'CPALL': 65.50, 'PTT': 38.25, 'KBANK': 142.00,
        'ADVANC': 195.50, 'AOT': 68.75
      },
      [Market.MAI]: {
        'ASIAN': 15.20, 'SIRI': 1.85, 'SYNTEC': 12.50
      },
      [Market.HKSE]: {
        '0700': 320.40, '0941': 58.15, '0005': 45.80
      },
      [Market.TSE]: {
        '7203': 2850.00, '6758': 12500.00, '9984': 8950.00
      },
      [Market.LSE]: {
        'BARC': 195.50, 'VOD': 78.25, 'BP': 485.60
      },
      [Market.SGX]: {
        'D05': 32.15, 'O39': 28.90, 'U11': 25.75
      },
      [Market.ASX]: {
        'CBA': 102.50, 'BHP': 45.80, 'CSL': 285.75
      },
      [Market.OTC]: {
        'OTCQX': 25.00, 'OTCQB': 15.00
      },
      [Market.OTHER]: {}
    };
    
    return fallbackPrices[market]?.[symbol.toUpperCase()] || 100.00;
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();