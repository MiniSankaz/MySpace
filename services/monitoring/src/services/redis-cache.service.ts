import Redis from "ioredis";
import { EventEmitter } from "events";
import { createHash } from "crypto";
import { logger } from "../utils/logger";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export enum CacheStrategy {
  CACHE_ASIDE = "cache-aside",
  WRITE_THROUGH = "write-through",
  WRITE_BEHIND = "write-behind",
  REFRESH_AHEAD = "refresh-ahead",
}

export interface CacheConfig {
  strategy: CacheStrategy;
  ttl: number;
  maxSize: number;
  evictionPolicy: "LRU" | "LFU" | "FIFO";
  compression: boolean;
  serialization: "json" | "msgpack" | "protobuf";
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  created: number;
  accessed: number;
  hits: number;
  size: number;
  compressed: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keys: number;
}

export class RedisCacheService extends EventEmitter {
  private redis: Redis;
  private localCache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: CacheStats;
  private refreshQueue: Map<string, NodeJS.Timeout>;

  constructor(config: Partial<CacheConfig> = {}) {
    super();

    this.config = {
      strategy: CacheStrategy.CACHE_ASIDE,
      ttl: 300, // 5 minutes default
      maxSize: 100 * 1024 * 1024, // 100MB default
      evictionPolicy: "LRU",
      compression: true,
      serialization: "json",
      ...config,
    };

    this.localCache = new Map();
    this.refreshQueue = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsage: 0,
      keys: 0,
    };

    this.initializeRedis();
    this.startMaintenanceLoop();
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || "0"),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetErrors = ["READONLY", "ECONNRESET"];
        if (targetErrors.some((e) => err.message.includes(e))) {
          return true;
        }
        return false;
      },
    });

    this.redis.on("connect", () => {
      logger.info("Redis connected");
      this.emit("connected");
    });

    this.redis.on("error", (error) => {
      logger.error("Redis error:", error);
      this.emit("error", error);
    });

    this.redis.on("close", () => {
      logger.warn("Redis connection closed");
      this.emit("disconnected");
    });
  }

  private startMaintenanceLoop(): void {
    // Run maintenance every minute
    setInterval(() => {
      this.performMaintenance();
    }, 60000);
  }

  private async performMaintenance(): Promise<void> {
    // Clean up expired entries
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.localCache.entries()) {
      if (entry.created + entry.ttl * 1000 < now) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.localCache.delete(key);
      this.stats.evictions++;
    }

    // Update stats
    this.stats.keys = this.localCache.size;
    this.stats.hitRate =
      this.stats.hits / (this.stats.hits + this.stats.misses) || 0;

    // Calculate memory usage
    let memoryUsage = 0;
    for (const entry of this.localCache.values()) {
      memoryUsage += entry.size;
    }
    this.stats.memoryUsage = memoryUsage;

    // Perform eviction if needed
    if (memoryUsage > this.config.maxSize) {
      await this.evictEntries();
    }

    logger.debug("Cache maintenance completed", {
      evicted: toDelete.length,
      keys: this.stats.keys,
      memory: this.stats.memoryUsage,
    });
  }

  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.localCache.entries());

    // Sort based on eviction policy
    switch (this.config.evictionPolicy) {
      case "LRU":
        entries.sort((a, b) => a[1].accessed - b[1].accessed);
        break;
      case "LFU":
        entries.sort((a, b) => a[1].hits - b[1].hits);
        break;
      case "FIFO":
        entries.sort((a, b) => a[1].created - b[1].created);
        break;
    }

    // Evict until under max size
    let currentSize = this.stats.memoryUsage;
    const targetSize = this.config.maxSize * 0.8; // Free up to 80% of max

    for (const [key, entry] of entries) {
      if (currentSize <= targetSize) break;

      this.localCache.delete(key);
      currentSize -= entry.size;
      this.stats.evictions++;

      logger.debug(`Evicted cache entry: ${key}`);
    }
  }

  private generateKey(input: string | object): string {
    const data = typeof input === "string" ? input : JSON.stringify(input);
    return createHash("sha256").update(data).digest("hex");
  }

  private async serialize(value: any): Promise<Buffer> {
    let data: Buffer;

    switch (this.config.serialization) {
      case "json":
        data = Buffer.from(JSON.stringify(value));
        break;
      case "msgpack":
        // TODO: Implement msgpack serialization
        data = Buffer.from(JSON.stringify(value));
        break;
      case "protobuf":
        // TODO: Implement protobuf serialization
        data = Buffer.from(JSON.stringify(value));
        break;
      default:
        data = Buffer.from(JSON.stringify(value));
    }

    if (this.config.compression && data.length > 1024) {
      return await gzipAsync(data);
    }

    return data;
  }

  private async deserialize(data: Buffer, compressed: boolean): Promise<any> {
    let decompressed = data;

    if (compressed) {
      decompressed = await gunzipAsync(data);
    }

    switch (this.config.serialization) {
      case "json":
        return JSON.parse(decompressed.toString());
      case "msgpack":
        // TODO: Implement msgpack deserialization
        return JSON.parse(decompressed.toString());
      case "protobuf":
        // TODO: Implement protobuf deserialization
        return JSON.parse(decompressed.toString());
      default:
        return JSON.parse(decompressed.toString());
    }
  }

  // Get value from cache
  public async get<T = any>(key: string): Promise<T | null> {
    const cacheKey = this.generateKey(key);

    // Check L1 cache (local)
    const localEntry = this.localCache.get(cacheKey);
    if (localEntry) {
      const now = Date.now();
      if (localEntry.created + localEntry.ttl * 1000 > now) {
        localEntry.accessed = now;
        localEntry.hits++;
        this.stats.hits++;

        logger.debug(`Cache hit (L1): ${key}`);
        return localEntry.value;
      } else {
        this.localCache.delete(cacheKey);
      }
    }

    // Check L2 cache (Redis)
    try {
      const redisData = await this.redis.get(cacheKey);
      if (redisData) {
        const entry = JSON.parse(redisData);
        const value = await this.deserialize(
          Buffer.from(entry.value, "base64"),
          entry.compressed,
        );

        // Store in L1 cache
        this.localCache.set(cacheKey, {
          key: cacheKey,
          value,
          ttl: entry.ttl,
          created: entry.created,
          accessed: Date.now(),
          hits: 1,
          size: redisData.length,
          compressed: entry.compressed,
        });

        this.stats.hits++;
        logger.debug(`Cache hit (L2): ${key}`);
        return value;
      }
    } catch (error) {
      logger.error("Redis get error:", error);
    }

    this.stats.misses++;
    logger.debug(`Cache miss: ${key}`);
    return null;
  }

  // Set value in cache
  public async set<T = any>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<boolean> {
    const cacheKey = this.generateKey(key);
    const cacheTtl = ttl || this.config.ttl;

    try {
      const serialized = await this.serialize(value);
      const compressed = this.config.compression && serialized.length > 1024;

      const entry: CacheEntry = {
        key: cacheKey,
        value,
        ttl: cacheTtl,
        created: Date.now(),
        accessed: Date.now(),
        hits: 0,
        size: serialized.length,
        compressed,
      };

      // Store in L1 cache
      this.localCache.set(cacheKey, entry);

      // Store in L2 cache (Redis)
      const redisEntry = {
        value: serialized.toString("base64"),
        ttl: cacheTtl,
        created: entry.created,
        compressed,
      };

      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(redisEntry));

      this.stats.sets++;

      // Handle different caching strategies
      if (this.config.strategy === CacheStrategy.REFRESH_AHEAD) {
        this.scheduleRefresh(key, cacheTtl * 0.8);
      }

      logger.debug(`Cache set: ${key} (TTL: ${cacheTtl}s)`);
      return true;
    } catch (error) {
      logger.error("Cache set error:", error);
      return false;
    }
  }

  // Delete from cache
  public async delete(key: string): Promise<boolean> {
    const cacheKey = this.generateKey(key);

    try {
      // Delete from L1 cache
      this.localCache.delete(cacheKey);

      // Delete from L2 cache
      await this.redis.del(cacheKey);

      // Cancel refresh if scheduled
      const refreshTimer = this.refreshQueue.get(cacheKey);
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        this.refreshQueue.delete(cacheKey);
      }

      this.stats.deletes++;
      logger.debug(`Cache delete: ${key}`);
      return true;
    } catch (error) {
      logger.error("Cache delete error:", error);
      return false;
    }
  }

  // Clear all cache
  public async clear(): Promise<boolean> {
    try {
      // Clear L1 cache
      this.localCache.clear();

      // Clear L2 cache
      await this.redis.flushdb();

      // Clear refresh queue
      for (const timer of this.refreshQueue.values()) {
        clearTimeout(timer);
      }
      this.refreshQueue.clear();

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        hitRate: 0,
        memoryUsage: 0,
        keys: 0,
      };

      logger.info("Cache cleared");
      return true;
    } catch (error) {
      logger.error("Cache clear error:", error);
      return false;
    }
  }

  // Schedule refresh for refresh-ahead strategy
  private scheduleRefresh(key: string, delaySeconds: number): void {
    const cacheKey = this.generateKey(key);

    // Cancel existing refresh if any
    const existing = this.refreshQueue.get(cacheKey);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new refresh
    const timer = setTimeout(async () => {
      this.emit("refresh", key);
      this.refreshQueue.delete(cacheKey);
    }, delaySeconds * 1000);

    this.refreshQueue.set(cacheKey, timer);
  }

  // Get cache statistics
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  // Warm up cache with frequently accessed data
  public async warmUp(
    keys: Array<{ key: string; value: any; ttl?: number }>,
  ): Promise<void> {
    logger.info(`Warming up cache with ${keys.length} entries`);

    const promises = keys.map(({ key, value, ttl }) =>
      this.set(key, value, ttl),
    );

    await Promise.all(promises);
    logger.info("Cache warm-up completed");
  }

  // Clean up
  public async disconnect(): Promise<void> {
    // Clear refresh timers
    for (const timer of this.refreshQueue.values()) {
      clearTimeout(timer);
    }

    // Disconnect from Redis
    await this.redis.quit();

    logger.info("Cache service disconnected");
  }
}

// Export singleton instance
export const cacheService = new RedisCacheService();
