/**
 * Cache service for performance optimization
 * Can be backed by Redis or in-memory storage
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class CacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private prefix: string;

  constructor(prefix: string = "") {
    this.prefix = prefix ? `${prefix}:` : "";
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefix + key;
    const item = this.cache.get(fullKey);

    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(fullKey);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const fullKey = this.prefix + key;
    const expires = Date.now() + ttl * 1000;

    this.cache.set(fullKey, { value, expires });
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    this.cache.delete(fullKey);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace("*", ".*"));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async invalidateAll(): Promise<void> {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  startCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }
}

// Global cache instance
export const globalCache = new CacheService();

// Start cleanup
globalCache.startCleanup();
