import { Market, Currency, getMarketInfo, getMarketCurrency } from '../types';
import { MarketValidationService } from './market-validation.service';
import { marketDataService } from './market-data.service';
import { logger } from '../utils/logger';

/**
 * Stock Master Data Service
 * Manages stock database operations with multi-market support
 */

interface StockMasterData {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  country: string;
  currency: Currency;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  logo?: string;
  employees?: number;
  marketCap?: number;
  sharesOutstanding?: number;
  peRatio?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  avgVolume?: number;
  isActive: boolean;
  isDelisted: boolean;
  delistedDate?: Date;
  ipoDate?: Date;
  fiscalYearEnd?: string;
  lastUpdated?: Date;
}

interface StockSearchFilters {
  query?: string;
  market?: Market;
  country?: string;
  sector?: string;
  currency?: Currency;
  minMarketCap?: number;
  maxMarketCap?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

interface StockSearchResult {
  stocks: StockMasterData[];
  total: number;
  hasMore: boolean;
}

export class StockMasterService {
  // Mock database for development (replace with actual Prisma calls in production)
  private mockStocks: Map<string, StockMasterData> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize mock stock data for development
   */
  private initializeMockData() {
    const mockStocks: StockMasterData[] = [
      // US Stocks
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        market: Market.NASDAQ,
        country: 'US',
        currency: Currency.USD,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        website: 'https://www.apple.com',
        employees: 154000,
        marketCap: 3200000000000,
        peRatio: 29.5,
        eps: 6.16,
        beta: 1.2,
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        market: Market.NASDAQ,
        country: 'US',
        currency: Currency.USD,
        sector: 'Technology',
        industry: 'Internet Content & Information',
        description: 'Alphabet Inc. provides online advertising services in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
        website: 'https://www.alphabet.com',
        employees: 190000,
        marketCap: 2100000000000,
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        exchange: 'NASDAQ',
        market: Market.NASDAQ,
        country: 'US',
        currency: Currency.USD,
        sector: 'Consumer Discretionary',
        industry: 'Auto Manufacturers',
        description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
        website: 'https://www.tesla.com',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'ICOI',
        name: 'Bitwise COIN Option Income Strategy ETF',
        exchange: 'NYSE Arca',
        market: Market.NYSE_ARCA,
        country: 'US',
        currency: Currency.USD,
        sector: 'Financial Services',
        industry: 'Asset Management',
        description: 'Bitwise COIN Option Income Strategy ETF seeks to track the performance of Coinbase Global Inc. while generating income through a covered call strategy.',
        isActive: true,
        isDelisted: false
      },

      // Thai Stocks
      {
        symbol: 'CPALL',
        name: 'CP ALL Public Company Limited',
        exchange: 'SET',
        market: Market.SET,
        country: 'TH',
        currency: Currency.THB,
        sector: 'Consumer Staples',
        industry: 'Grocery Stores',
        description: 'CP ALL PCL operates convenience stores in Thailand and other countries in Asia.',
        website: 'https://www.cpall.co.th',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'PTT',
        name: 'PTT Public Company Limited',
        exchange: 'SET',
        market: Market.SET,
        country: 'TH',
        currency: Currency.THB,
        sector: 'Energy',
        industry: 'Oil & Gas Integrated',
        description: 'PTT PCL operates as a national oil company of Thailand.',
        website: 'https://www.pttplc.com',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'KBANK',
        name: 'Kasikornbank Public Company Limited',
        exchange: 'SET',
        market: Market.SET,
        country: 'TH',
        currency: Currency.THB,
        sector: 'Financial Services',
        industry: 'Banks—Regional',
        description: 'Kasikornbank PCL provides banking and financial services in Thailand.',
        website: 'https://www.kasikornbank.com',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: 'ADVANC',
        name: 'Advanced Info Service Public Company Limited',
        exchange: 'SET',
        market: Market.SET,
        country: 'TH',
        currency: Currency.THB,
        sector: 'Communication Services',
        industry: 'Telecom Services',
        description: 'Advanced Info Service PCL provides mobile phone services in Thailand.',
        website: 'https://www.ais.co.th',
        isActive: true,
        isDelisted: false
      },

      // Hong Kong Stocks
      {
        symbol: '0700',
        name: 'Tencent Holdings Limited',
        exchange: 'HKSE',
        market: Market.HKSE,
        country: 'HK',
        currency: Currency.HKD,
        sector: 'Technology',
        industry: 'Internet Content & Information',
        description: 'Tencent Holdings Limited provides Internet value-added services in China.',
        website: 'https://www.tencent.com',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: '0941',
        name: 'China Mobile Limited',
        exchange: 'HKSE',
        market: Market.HKSE,
        country: 'HK',
        currency: Currency.HKD,
        sector: 'Communication Services',
        industry: 'Telecom Services',
        description: 'China Mobile Limited provides mobile telecommunications and related services in China.',
        website: 'https://www.chinamobile.com',
        isActive: true,
        isDelisted: false
      },

      // Japanese Stocks
      {
        symbol: '7203',
        name: 'Toyota Motor Corporation',
        exchange: 'TSE',
        market: Market.TSE,
        country: 'JP',
        currency: Currency.JPY,
        sector: 'Consumer Discretionary',
        industry: 'Auto Manufacturers',
        description: 'Toyota Motor Corporation designs, manufactures, and sells passenger cars, minivans, and commercial vehicles worldwide.',
        website: 'https://www.toyota.com',
        isActive: true,
        isDelisted: false
      },
      {
        symbol: '6758',
        name: 'Sony Group Corporation',
        exchange: 'TSE',
        market: Market.TSE,
        country: 'JP',
        currency: Currency.JPY,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        description: 'Sony Group Corporation designs, develops, produces, and sells electronic equipment, instruments, and devices.',
        website: 'https://www.sony.com',
        isActive: true,
        isDelisted: false
      }
    ];

    // Populate mock database
    mockStocks.forEach(stock => {
      const key = `${stock.symbol}-${stock.market}`;
      this.mockStocks.set(key, stock);
    });

    logger.info(`Initialized ${mockStocks.length} mock stocks in stock master database`);
  }

  /**
   * Search stocks with filters
   */
  async searchStocks(filters: StockSearchFilters = {}): Promise<StockSearchResult> {
    const {
      query,
      market,
      country,
      sector,
      currency,
      minMarketCap,
      maxMarketCap,
      isActive = true,
      limit = 50,
      offset = 0
    } = filters;

    let results = Array.from(this.mockStocks.values());

    // Apply filters
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(stock => 
        stock.symbol.toLowerCase().includes(queryLower) ||
        stock.name.toLowerCase().includes(queryLower) ||
        stock.description?.toLowerCase().includes(queryLower)
      );
    }

    if (market) {
      results = results.filter(stock => stock.market === market);
    }

    if (country) {
      results = results.filter(stock => stock.country === country);
    }

    if (sector) {
      results = results.filter(stock => stock.sector === sector);
    }

    if (currency) {
      results = results.filter(stock => stock.currency === currency);
    }

    if (minMarketCap !== undefined && maxMarketCap !== undefined) {
      results = results.filter(stock => {
        if (!stock.marketCap) return false;
        return stock.marketCap >= minMarketCap && stock.marketCap <= maxMarketCap;
      });
    } else if (minMarketCap !== undefined) {
      results = results.filter(stock => stock.marketCap && stock.marketCap >= minMarketCap);
    } else if (maxMarketCap !== undefined) {
      results = results.filter(stock => stock.marketCap && stock.marketCap <= maxMarketCap);
    }

    if (isActive !== undefined) {
      results = results.filter(stock => stock.isActive === isActive);
    }

    // Sort by relevance (simple sorting by symbol)
    results.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      stocks: paginatedResults,
      total,
      hasMore
    };
  }

  /**
   * Get stock by symbol and market
   */
  async getStock(symbol: string, market: Market): Promise<StockMasterData | null> {
    const key = `${symbol.toUpperCase()}-${market}`;
    return this.mockStocks.get(key) || null;
  }

  /**
   * Get stock suggestions for autocomplete
   */
  async getStockSuggestions(query: string, market?: Market, limit: number = 10): Promise<Array<{
    symbol: string;
    name: string;
    market: Market;
    exchange: string;
    country: string;
    currency: Currency;
  }>> {
    const filters: StockSearchFilters = {
      query,
      market,
      limit,
      isActive: true
    };

    const result = await this.searchStocks(filters);
    
    return result.stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      exchange: stock.exchange,
      country: stock.country,
      currency: stock.currency
    }));
  }

  /**
   * Get stocks by market
   */
  async getStocksByMarket(market: Market, limit: number = 100): Promise<StockMasterData[]> {
    const result = await this.searchStocks({ market, limit });
    return result.stocks;
  }

  /**
   * Get popular stocks by market
   */
  async getPopularStocks(market?: Market, limit: number = 10): Promise<StockMasterData[]> {
    // Mock implementation - in real system, this would be based on trading volume, searches, etc.
    const filters: StockSearchFilters = {
      market,
      limit,
      isActive: true
    };

    const result = await this.searchStocks(filters);
    
    // Sort by market cap (popularity proxy)
    return result.stocks
      .filter(stock => stock.marketCap)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, limit);
  }

  /**
   * Add or update stock
   */
  async upsertStock(stockData: Omit<StockMasterData, 'id'>): Promise<StockMasterData> {
    // Validate symbol format
    const validation = MarketValidationService.validateSymbol(stockData.symbol, stockData.market);
    if (!validation.valid) {
      throw new Error(`Invalid symbol format: ${validation.error}`);
    }

    // Format symbol
    const formattedSymbol = MarketValidationService.formatSymbol(stockData.symbol, stockData.market);
    
    const stock: StockMasterData = {
      ...stockData,
      symbol: formattedSymbol,
      country: stockData.country || getMarketInfo(stockData.market).country,
      currency: stockData.currency || getMarketCurrency(stockData.market),
      lastUpdated: new Date()
    };

    const key = `${stock.symbol}-${stock.market}`;
    this.mockStocks.set(key, stock);

    logger.info(`Upserted stock: ${stock.symbol} (${stock.market})`);
    return stock;
  }

  /**
   * Update stock with real-time data
   */
  async updateStockPriceData(symbol: string, market: Market): Promise<boolean> {
    try {
      const quote = await marketDataService.getQuoteByMarket(symbol, market);
      const stock = await this.getStock(symbol, market);
      
      if (!stock) {
        logger.warn(`Stock not found for price update: ${symbol} (${market})`);
        return false;
      }

      // Update price-related fields
      const updatedStock: StockMasterData = {
        ...stock,
        fiftyTwoWeekHigh: quote.high || stock.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.low || stock.fiftyTwoWeekLow,
        avgVolume: quote.volume || stock.avgVolume,
        lastUpdated: new Date()
      };

      const key = `${symbol}-${market}`;
      this.mockStocks.set(key, updatedStock);

      logger.debug(`Updated price data for: ${symbol} (${market})`);
      return true;
    } catch (error) {
      logger.error(`Failed to update price data for ${symbol} (${market}):`, error);
      return false;
    }
  }

  /**
   * Get stock statistics by market
   */
  async getMarketStatistics(market?: Market): Promise<{
    totalStocks: number;
    activeStocks: number;
    delistedStocks: number;
    sectors: Record<string, number>;
    averageMarketCap: number;
  }> {
    const filters: StockSearchFilters = market ? { market } : {};
    const allStocks = await this.searchStocks({ ...filters, limit: 10000 });

    const activeStocks = allStocks.stocks.filter(stock => stock.isActive).length;
    const delistedStocks = allStocks.stocks.filter(stock => stock.isDelisted).length;

    const sectors: Record<string, number> = {};
    let totalMarketCap = 0;
    let marketCapCount = 0;

    allStocks.stocks.forEach(stock => {
      if (stock.sector) {
        sectors[stock.sector] = (sectors[stock.sector] || 0) + 1;
      }
      if (stock.marketCap) {
        totalMarketCap += stock.marketCap;
        marketCapCount++;
      }
    });

    const averageMarketCap = marketCapCount > 0 ? totalMarketCap / marketCapCount : 0;

    return {
      totalStocks: allStocks.total,
      activeStocks,
      delistedStocks,
      sectors,
      averageMarketCap
    };
  }

  /**
   * Validate stock exists and is tradeable
   */
  async validateStockForTrading(symbol: string, market: Market): Promise<{
    valid: boolean;
    stock?: StockMasterData;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Symbol format validation
    const symbolValidation = MarketValidationService.validateSymbol(symbol, market);
    if (!symbolValidation.valid) {
      errors.push(symbolValidation.error!);
    }

    // Check if stock exists in database
    const stock = await this.getStock(symbol, market);
    if (!stock) {
      errors.push(`Stock ${symbol} not found in ${market} market`);
      return { valid: false, errors, warnings };
    }

    // Check if stock is active
    if (!stock.isActive) {
      errors.push(`Stock ${symbol} is not active for trading`);
    }

    // Check if stock is delisted
    if (stock.isDelisted) {
      errors.push(`Stock ${symbol} is delisted`);
    }

    // Market-specific warnings
    if (stock.marketCap && stock.marketCap < 1000000000) { // Less than 1B
      warnings.push(`${symbol} is a small-cap stock with higher volatility risk`);
    }

    return {
      valid: errors.length === 0,
      stock,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const stockMasterService = new StockMasterService();