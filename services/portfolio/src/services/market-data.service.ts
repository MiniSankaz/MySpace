import axios from 'axios';
import { logger } from '../utils/logger';

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
}

export class MarketDataService {
  private baseUrl: string;
  private cache: Map<string, { data: MarketQuote; timestamp: number }>;
  private cacheTTL: number = 30000; // 30 seconds cache

  constructor() {
    this.baseUrl = process.env.MARKET_DATA_URL || 'http://localhost:4600';
    this.cache = new Map();
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
   * Get full quote data for a symbol
   */
  async getQuote(symbol: string): Promise<MarketQuote> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/market/quote/${symbol}`,
        { timeout: 5000 }
      );

      if (response.data?.success && response.data?.data) {
        const quote = response.data.data;
        
        // Update cache
        this.cache.set(symbol, {
          data: quote,
          timestamp: Date.now()
        });

        return quote;
      }

      throw new Error('Invalid response from market data service');
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/market/quotes`,
        {
          params: { symbols: symbols.join(',') },
          timeout: 5000
        }
      );

      if (response.data?.success && response.data?.data) {
        const quotes = response.data.data;
        
        // Update cache for each quote
        quotes.forEach((quote: MarketQuote) => {
          this.cache.set(quote.symbol, {
            data: quote,
            timestamp: Date.now()
          });
        });

        return quotes;
      }

      throw new Error('Invalid response from market data service');
    } catch (error) {
      logger.error('Error fetching multiple quotes:', error);
      
      // Return fallback prices for all symbols
      return symbols.map(symbol => ({
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
    }
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
}

// Export singleton instance
export const marketDataService = new MarketDataService();