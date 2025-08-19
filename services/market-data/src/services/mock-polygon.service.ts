import logger from '@utils/logger';
import { QuoteData } from '../types/index';

/**
 * Mock Polygon Service for testing when API key is not available
 */
export class MockPolygonService {
  private mockPrices: Record<string, number> = {
    'AAPL': 180.25,
    'GOOGL': 142.67,
    'MSFT': 425.34,
    'TSLA': 245.78,
    'AMZN': 178.92,
    'META': 512.45,
    'NVDA': 885.67,
    'SPY': 545.23,
    'QQQ': 456.78,
    'BTC': 65432.10
  };

  constructor() {
    logger.info('Using Mock Polygon Service (no API key configured)');
  }

  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const basePrice = this.mockPrices[symbol] || Math.random() * 500 + 50;
      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      const price = basePrice * (1 + variation);
      const previousClose = basePrice;
      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;

      const quote: QuoteData = {
        symbol,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        high: parseFloat((price * 1.02).toFixed(2)),
        low: parseFloat((price * 0.98).toFixed(2)),
        open: parseFloat((previousClose * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
        previousClose: parseFloat(previousClose.toFixed(2)),
        marketCap: Math.floor(Math.random() * 1000000000000) + 100000000,
        timestamp: new Date().toISOString(),
        source: 'cache' as const,
        delay: 0
      };

      logger.debug(`Mock quote generated for ${symbol}: $${price.toFixed(2)}`);
      return quote;
    } catch (error) {
      logger.error(`Error generating mock quote for ${symbol}:`, error);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const quotes: QuoteData[] = [];
    
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        quotes.push(quote);
      }
    }

    return quotes;
  }

  getRateLimitStatus() {
    return {
      remaining: 999999,
      resetIn: 60,
      limit: 999999
    };
  }

  checkRateLimit(): boolean {
    return true; // Always allow in mock mode
  }
}