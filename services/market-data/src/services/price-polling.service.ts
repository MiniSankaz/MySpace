import { PrismaClient } from '@prisma/client';
import logger from '@utils/logger';
import { QuoteController } from '../controllers/quote.controller';
import { CacheService } from './cache.service';

export class PricePollingService {
  private prisma: PrismaClient;
  private quoteController: QuoteController;
  private cacheService: CacheService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastFetchTime: Map<string, Date> = new Map();
  private readonly POLL_INTERVAL = 60000; // 1 minute
  private readonly CACHE_TTL = 60; // 60 seconds
  
  constructor() {
    this.prisma = new PrismaClient();
    this.quoteController = new QuoteController();
    this.cacheService = new CacheService();
  }

  /**
   * Start polling for stock prices
   */
  async startPolling(): Promise<void> {
    logger.info('🚀 Starting Price Polling Service - Fetching every 1 minute');
    
    // Initial fetch
    await this.fetchAndStoreAllPrices();
    
    // Set up interval for every 1 minute
    this.pollingInterval = setInterval(async () => {
      await this.fetchAndStoreAllPrices();
    }, this.POLL_INTERVAL);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('⏹️ Price Polling Service stopped');
    }
  }

  /**
   * Fetch and store prices for all tracked stocks
   */
  private async fetchAndStoreAllPrices(): Promise<void> {
    try {
      // Get all unique symbols from transactions (the stocks we track)
      const trackedStocks = await this.prisma.transaction.findMany({
        select: { symbol: true },
        distinct: ['symbol']
      });

      if (trackedStocks.length === 0) {
        logger.info('No stocks to track in database');
        return;
      }

      const symbols = trackedStocks.map(s => s.symbol);
      logger.info(`📊 Fetching prices for ${symbols.length} stocks: ${symbols.join(', ')}`);

      // Fetch prices for all symbols
      for (const symbol of symbols) {
        await this.fetchAndStorePrice(symbol);
      }

      logger.info(`✅ Price update completed for ${symbols.length} stocks`);
    } catch (error) {
      logger.error('Error in price polling:', error);
    }
  }

  /**
   * Fetch and store price for a single stock
   */
  private async fetchAndStorePrice(symbol: string): Promise<void> {
    try {
      const now = new Date();
      const lastFetch = this.lastFetchTime.get(symbol);
      
      // Check if we already fetched within the last minute
      if (lastFetch && (now.getTime() - lastFetch.getTime()) < this.POLL_INTERVAL) {
        logger.debug(`⏳ Skipping ${symbol} - already fetched within 1 minute`);
        return;
      }

      // First, try to get from cache (if it's less than 1 minute old)
      const cacheKey = `quote:${symbol}`;
      const cachedData = await this.cacheService.get(cacheKey);
      
      if (cachedData) {
        const cacheAge = now.getTime() - new Date(cachedData.timestamp).getTime();
        if (cacheAge < this.POLL_INTERVAL) {
          logger.info(`📦 Using cached price for ${symbol}: $${cachedData.price}`);
          // Still save to database for historical tracking
          await this.saveToDatabase(symbol, cachedData);
          return;
        }
      }

      // Fetch fresh data from API (Polygon or Mock)
      logger.info(`🔄 Fetching fresh price for ${symbol}`);
      
      // Call controller with Express req/res objects
      let quoteData: any = null;
      const req = { params: { symbol } } as any;
      const res = {
        json: (data: any) => {
          quoteData = data;
          return res;
        },
        status: () => res
      } as any;
      
      await this.quoteController.getQuote(req, res);
      
      if (quoteData && quoteData.success && quoteData.data) {
        // Update cache with 1-minute TTL
        await this.cacheService.set(cacheKey, quoteData.data, this.CACHE_TTL);
        
        // Save to database
        await this.saveToDatabase(symbol, quoteData.data);
        
        // Update last fetch time
        this.lastFetchTime.set(symbol, now);
        
        logger.info(`✅ ${symbol}: $${quoteData.data.price} (${quoteData.data.changePercent > 0 ? '+' : ''}${quoteData.data.changePercent}%)`);
      }
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error);
      
      // If API fails, try to use last known price from database
      await this.useLastKnownPrice(symbol);
    }
  }

  /**
   * Save price data to database
   */
  private async saveToDatabase(symbol: string, data: any): Promise<void> {
    try {
      await this.prisma.marketQuote.create({
        data: {
          symbol: symbol,
          price: data.price,
          open: data.open || null,
          high: data.high || null,
          low: data.low || null,
          close: data.close || data.price,
          previousClose: data.previousClose || null,
          volume: data.volume ? BigInt(data.volume) : null,
          change: data.change || null,
          changePercent: data.changePercent || null,
          marketCap: data.marketCap ? BigInt(data.marketCap) : null,
          timestamp: new Date(data.timestamp || new Date()),
          source: data.source || 'polling',
          delaySeconds: 0
        }
      });
      
      logger.debug(`💾 Saved ${symbol} price to database`);
    } catch (error) {
      logger.error(`Error saving ${symbol} to database:`, error);
    }
  }

  /**
   * Use last known price from database when API fails
   */
  private async useLastKnownPrice(symbol: string): Promise<void> {
    try {
      const lastQuote = await this.prisma.marketQuote.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      if (lastQuote) {
        const ageMinutes = Math.floor((Date.now() - lastQuote.timestamp.getTime()) / 60000);
        logger.info(`📈 Using last known price for ${symbol}: $${lastQuote.price} (${ageMinutes} minutes old)`);
        
        // Update cache with last known price
        const cacheKey = `quote:${symbol}`;
        await this.cacheService.set(cacheKey, {
          symbol: symbol,
          price: Number(lastQuote.price),
          change: Number(lastQuote.change || 0),
          changePercent: Number(lastQuote.changePercent || 0),
          volume: lastQuote.volume ? Number(lastQuote.volume) : 0,
          high: Number(lastQuote.high || lastQuote.price),
          low: Number(lastQuote.low || lastQuote.price),
          open: Number(lastQuote.open || lastQuote.price),
          previousClose: Number(lastQuote.previousClose || lastQuote.price),
          marketCap: lastQuote.marketCap ? Number(lastQuote.marketCap) : 0,
          timestamp: lastQuote.timestamp.toISOString(),
          source: 'database',
          delay: 0
        }, this.CACHE_TTL);
      } else {
        logger.warn(`⚠️ No historical price found for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Error fetching last known price for ${symbol}:`, error);
    }
  }

  /**
   * Get latest price for a symbol (from cache or database)
   */
  async getLatestPrice(symbol: string): Promise<any> {
    // First check cache
    const cacheKey = `quote:${symbol}`;
    const cachedData = await this.cacheService.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, get from database
    const lastQuote = await this.prisma.marketQuote.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' }
    });

    if (lastQuote) {
      const data = {
        symbol: symbol,
        price: Number(lastQuote.price),
        change: Number(lastQuote.change || 0),
        changePercent: Number(lastQuote.changePercent || 0),
        volume: lastQuote.volume ? Number(lastQuote.volume) : 0,
        high: Number(lastQuote.high || lastQuote.price),
        low: Number(lastQuote.low || lastQuote.price),
        open: Number(lastQuote.open || lastQuote.price),
        previousClose: Number(lastQuote.previousClose || lastQuote.price),
        marketCap: lastQuote.marketCap ? Number(lastQuote.marketCap) : 0,
        timestamp: lastQuote.timestamp.toISOString(),
        source: 'database',
        delay: 0
      };

      // Cache for next request
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL);
      return data;
    }

    return null;
  }

  /**
   * Get price history for a symbol
   */
  async getPriceHistory(symbol: string, hours: number = 24): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const quotes = await this.prisma.marketQuote.findMany({
      where: {
        symbol,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' },
      select: {
        price: true,
        timestamp: true,
        volume: true,
        change: true,
        changePercent: true
      }
    });

    return quotes.map(q => ({
      price: Number(q.price),
      timestamp: q.timestamp.toISOString(),
      volume: q.volume ? Number(q.volume) : 0,
      change: Number(q.change || 0),
      changePercent: Number(q.changePercent || 0)
    }));
  }
}

// Export singleton instance
export const pricePollingService = new PricePollingService();