import Redis from 'ioredis';
import logger from '@utils/logger';
import { QuoteData, BarData } from '../types/index';

export class CacheService {
  private redis: Redis;
  private quoteTTL: number;
  private historyTTL: number;
  private dailyTTL: number;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '1')
    });

    this.quoteTTL = parseInt(process.env.CACHE_TTL_QUOTES || '60');  // Changed to 60 seconds
    this.historyTTL = parseInt(process.env.CACHE_TTL_HISTORY || '3600');
    this.dailyTTL = parseInt(process.env.CACHE_TTL_DAILY || '86400');

    this.redis.on('connect', () => {
      logger.info('Redis cache connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache error:', error);
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, params: any): string {
    return `market:${type}:${JSON.stringify(params)}`;
  }

  /**
   * Get quote from cache
   */
  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const key = this.getCacheKey('quote', { symbol });
      const cached = await this.redis.get(key);
      
      if (cached) {
        logger.debug(`Cache hit for quote: ${symbol}`);
        const data = JSON.parse(cached);
        return { ...data, source: 'cache' };
      }
      
      logger.debug(`Cache miss for quote: ${symbol}`);
      return null;
    } catch (error) {
      logger.error('Error getting quote from cache:', error);
      return null;
    }
  }

  /**
   * Set quote in cache
   */
  async setQuote(symbol: string, data: QuoteData): Promise<void> {
    try {
      const key = this.getCacheKey('quote', { symbol });
      await this.redis.setex(key, this.quoteTTL, JSON.stringify(data));
      logger.debug(`Cached quote for ${symbol} with TTL ${this.quoteTTL}s`);
    } catch (error) {
      logger.error('Error setting quote in cache:', error);
    }
  }

  /**
   * Get batch quotes from cache
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
    const quotes = new Map<string, QuoteData>();
    
    try {
      const pipeline = this.redis.pipeline();
      const keys = symbols.map(symbol => this.getCacheKey('quote', { symbol }));
      
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();
      
      if (results) {
        results.forEach((result, index) => {
          if (result && result[1]) {
            const data = JSON.parse(result[1] as string);
            quotes.set(symbols[index], { ...data, source: 'cache' });
          }
        });
      }
    } catch (error) {
      logger.error('Error getting batch quotes from cache:', error);
    }
    
    return quotes;
  }

  /**
   * Set batch quotes in cache
   */
  async setBatchQuotes(quotes: QuoteData[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      quotes.forEach(quote => {
        const key = this.getCacheKey('quote', { symbol: quote.symbol });
        pipeline.setex(key, this.quoteTTL, JSON.stringify(quote));
      });
      
      await pipeline.exec();
      logger.debug(`Cached ${quotes.length} quotes`);
    } catch (error) {
      logger.error('Error setting batch quotes in cache:', error);
    }
  }

  /**
   * Get historical bars from cache
   */
  async getHistoricalBars(
    symbol: string,
    interval: string,
    from: string,
    to: string
  ): Promise<BarData[] | null> {
    try {
      const key = this.getCacheKey('bars', { symbol, interval, from, to });
      const cached = await this.redis.get(key);
      
      if (cached) {
        logger.debug(`Cache hit for historical bars: ${symbol}`);
        return JSON.parse(cached);
      }
      
      logger.debug(`Cache miss for historical bars: ${symbol}`);
      return null;
    } catch (error) {
      logger.error('Error getting historical bars from cache:', error);
      return null;
    }
  }

  /**
   * Set historical bars in cache
   */
  async setHistoricalBars(
    symbol: string,
    interval: string,
    from: string,
    to: string,
    data: BarData[]
  ): Promise<void> {
    try {
      const key = this.getCacheKey('bars', { symbol, interval, from, to });
      const ttl = interval.includes('d') ? this.dailyTTL : this.historyTTL;
      
      await this.redis.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cached historical bars for ${symbol} with TTL ${ttl}s`);
    } catch (error) {
      logger.error('Error setting historical bars in cache:', error);
    }
  }

  /**
   * Generic get method for any key
   */
  async get(key: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error(`Error getting key ${key} from cache:`, error);
      return null;
    }
  }

  /**
   * Generic set method with TTL
   */
  async set(key: string, data: any, ttl: number = 60): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cached ${key} with TTL ${ttl}s`);
    } catch (error) {
      logger.error(`Error setting key ${key} in cache:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: this.redis.status === 'ready',
        memoryUsage: info,
        keyCount: dbSize
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern || 'market:*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis cache connection closed');
  }
}