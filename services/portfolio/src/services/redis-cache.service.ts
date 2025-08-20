import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

interface CachedData<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class RedisCacheService {
  private static instance: RedisCacheService;
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private defaultTTL: number = 60; // 1 minute default TTL
  private keyPrefix: string = 'portfolio:';

  private constructor() {}

  static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error('Max Redis reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // Error handling
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis Client Reconnecting...');
        this.reconnectAttempts++;
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      // Don't throw - allow service to work without cache
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Get cached value
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }

      const cached: CachedData<T> = JSON.parse(value);
      
      // Check if cache is still valid
      const now = Date.now();
      const age = (now - cached.timestamp) / 1000; // age in seconds
      
      if (age > cached.ttl) {
        // Cache expired, remove it
        await this.del(key);
        return null;
      }

      logger.debug(`Cache hit for key: ${key}`);
      return cached.data;
    } catch (error) {
      logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const ttl = options?.ttl || this.defaultTTL;
      
      const cached: CachedData<T> = {
        data: value,
        timestamp: Date.now(),
        ttl
      };

      await this.client.setEx(fullKey, ttl, JSON.stringify(cached));
      logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const result = await this.client.del(fullKey);
      logger.debug(`Cache deleted for key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries with the prefix
   */
  async flush(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Flushed ${keys.length} cache entries`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Get multiple cached values
   */
  async mget<T = any>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    if (!this.isConnected || !this.client || keys.length === 0) {
      return result;
    }

    try {
      const fullKeys = keys.map(key => `${this.keyPrefix}${key}`);
      const values = await this.client.mGet(fullKeys);
      
      values.forEach((value, index) => {
        if (value) {
          try {
            const cached: CachedData<T> = JSON.parse(value);
            const now = Date.now();
            const age = (now - cached.timestamp) / 1000;
            
            if (age <= cached.ttl) {
              result.set(keys[index], cached.data);
            }
          } catch (e) {
            logger.error(`Error parsing cached value for key ${keys[index]}:`, e);
          }
        }
      });
      
      logger.debug(`Cache multi-get: ${result.size}/${keys.length} hits`);
      return result;
    } catch (error) {
      logger.error('Error in multi-get:', error);
      return result;
    }
  }

  /**
   * Set multiple cached values
   */
  async mset<T = any>(entries: Map<string, T>, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client || entries.size === 0) {
      return false;
    }

    try {
      const ttl = options?.ttl || this.defaultTTL;
      const pipeline = this.client.multi();
      
      entries.forEach((value, key) => {
        const fullKey = `${this.keyPrefix}${key}`;
        const cached: CachedData<T> = {
          data: value,
          timestamp: Date.now(),
          ttl
        };
        pipeline.setEx(fullKey, ttl, JSON.stringify(cached));
      });
      
      await pipeline.exec();
      logger.debug(`Cache multi-set: ${entries.size} entries with TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Error in multi-set:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const exists = await this.client.exists(fullKey);
      return exists > 0;
    } catch (error) {
      logger.error(`Error checking existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; keys: number; memory?: string }> {
    const stats = {
      connected: this.isConnected,
      keys: 0,
      memory: undefined as string | undefined
    };

    if (!this.isConnected || !this.client) {
      return stats;
    }

    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      stats.keys = keys.length;
      
      const info = await this.client.info('memory');
      const memMatch = info.match(/used_memory_human:(.+)/);
      if (memMatch) {
        stats.memory = memMatch[1].trim();
      }
    } catch (error) {
      logger.error('Error getting cache stats:', error);
    }

    return stats;
  }

  /**
   * Create a cache key for market data
   */
  static createMarketDataKey(symbol: string, interval?: string): string {
    return interval ? `market:${symbol}:${interval}` : `market:${symbol}`;
  }

  /**
   * Create a cache key for batch market data
   */
  static createBatchMarketDataKey(symbols: string[]): string {
    return `market:batch:${symbols.sort().join(',')}`;
  }

  /**
   * Helper to check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }
}

// Export singleton instance
export const redisCache = RedisCacheService.getInstance();