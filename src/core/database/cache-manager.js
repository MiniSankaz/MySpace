"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = exports.CacheManager = void 0;
/**
 * Enhanced in-memory cache for database queries with timeout handling
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.DEFAULT_TTL = 60000; // 1 minute
    this.DEFAULT_TIMEOUT = 5000; // 5 seconds
  }
  static getInstance() {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  /**
   * Get cached data with TTL check
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    // Check if expired based on individual TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  /**
   * Set cache data with custom TTL
   */
  set(key, data, ttl) {
    const cacheTTL = ttl || this.DEFAULT_TTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });
    // Auto-cleanup after TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, cacheTTL);
    console.log(`[CacheManager] Cached ${key} with TTL ${cacheTTL}ms`);
  }
  /**
   * Execute database operation with cache and timeout handling
   */
  async withCacheAndTimeout(key, operation, options) {
    const {
      ttl = this.DEFAULT_TTL,
      timeout = this.DEFAULT_TIMEOUT,
      fallbackValue,
      skipCache = false,
    } = options || {};
    // Try cache first (unless skipped)
    if (!skipCache) {
      const cached = this.get(key);
      if (cached !== null) {
        console.log(`[CacheManager] Cache hit for ${key}`);
        return cached;
      }
    }
    // Execute with timeout
    try {
      console.log(
        `[CacheManager] Cache miss for ${key}, executing with ${timeout}ms timeout`,
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database operation timeout")),
          timeout,
        ),
      );
      const result = await Promise.race([operation(), timeoutPromise]);
      // Cache the result
      if (!skipCache) {
        this.set(key, result, ttl);
      }
      return result;
    } catch (error) {
      console.error(`[CacheManager] Operation failed for ${key}:`, error);
      // Return fallback value if provided
      if (fallbackValue !== undefined) {
        console.log(`[CacheManager] Returning fallback value for ${key}`);
        return fallbackValue;
      }
      throw error;
    }
  }
  /**
   * Clear cache by pattern
   */
  clearByPattern(pattern) {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern);
    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
    console.log(
      `[CacheManager] Cleared cache entries matching pattern: ${pattern}`,
    );
  }
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log("[CacheManager] Cleared all cache");
  }
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp,
      ttl: value.ttl,
    }));
    return {
      size: this.cache.size,
      entries,
    };
  }
  /**
   * Generate cache key
   */
  static generateKey(...args) {
    return args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg),
      )
      .join(":");
  }
}
exports.CacheManager = CacheManager;
exports.cacheManager = CacheManager.getInstance();
