/**
 * Enhanced in-memory cache for database queries with timeout handling
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 60000; // 1 minute
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  
  private constructor() {}
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Get cached data with TTL check
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check if expired based on individual TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }
  
  /**
   * Set cache data with custom TTL
   */
  set(key: string, data: any, ttl?: number): void {
    const cacheTTL = ttl || this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
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
  async withCacheAndTimeout<T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      ttl?: number;
      timeout?: number;
      fallbackValue?: T;
      skipCache?: boolean;
    }
  ): Promise<T> {
    const {
      ttl = this.DEFAULT_TTL,
      timeout = this.DEFAULT_TIMEOUT,
      fallbackValue,
      skipCache = false
    } = options || {};

    // Try cache first (unless skipped)
    if (!skipCache) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        console.log(`[CacheManager] Cache hit for ${key}`);
        return cached;
      }
    }

    // Execute with timeout
    try {
      console.log(`[CacheManager] Cache miss for ${key}, executing with ${timeout}ms timeout`);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database operation timeout')), timeout)
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
  clearByPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern);
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
    
    console.log(`[CacheManager] Cleared cache entries matching pattern: ${pattern}`);
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[CacheManager] Cleared all cache');
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp,
      ttl: value.ttl
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
  
  /**
   * Generate cache key
   */
  static generateKey(...args: any[]): string {
    return args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(':');
  }
}

export const cacheManager = CacheManager.getInstance();