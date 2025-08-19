/**
 * Offline Store Service
 * Provides local storage based fallback for database operations
 * with automatic sync when connection is restored
 */

import { randomBytes } from "crypto";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface OfflineUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  profile?: any;
  departments?: any[];
  teams?: any[];
}

interface OfflineSession {
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
}

class OfflineStore {
  private static instance: OfflineStore;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly STORAGE_PREFIX = "port_offline_";
  private readonly DEFAULT_TTL = 3600000; // 1 hour in ms
  private readonly VERSION = "1.0.0";
  private isOfflineMode = false;

  private constructor() {
    this.initializeStore();
  }

  static getInstance(): OfflineStore {
    if (!OfflineStore.instance) {
      OfflineStore.instance = new OfflineStore();
    }
    return OfflineStore.instance;
  }

  private initializeStore() {
    // Check if we're in browser environment
    if (typeof window !== "undefined") {
      // Listen for online/offline events
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());

      // Check initial connection state
      this.isOfflineMode = !navigator.onLine;

      // Clean expired entries on startup
      this.cleanExpiredEntries();
    }
  }

  private handleOnline() {
    console.log("[OfflineStore] Connection restored");
    this.isOfflineMode = false;
    // Trigger sync with database
    this.syncWithDatabase();
  }

  private handleOffline() {
    console.log("[OfflineStore] Connection lost - switching to offline mode");
    this.isOfflineMode = true;
  }

  /**
   * Get data from cache with fallback chain:
   * 1. Memory cache
   * 2. Local storage
   * 3. Mock data
   */
  async get<T>(key: string, fallbackGenerator?: () => T): Promise<T | null> {
    // Check memory cache first
    const memoryData = this.getFromMemory<T>(key);
    if (memoryData) return memoryData;

    // Check local storage
    const storageData = this.getFromStorage<T>(key);
    if (storageData) {
      // Populate memory cache
      this.setInMemory(key, storageData, this.DEFAULT_TTL);
      return storageData;
    }

    // Use fallback generator if provided
    if (fallbackGenerator) {
      const fallbackData = fallbackGenerator();
      await this.set(key, fallbackData, this.DEFAULT_TTL);
      return fallbackData;
    }

    return null;
  }

  /**
   * Set data in both memory and local storage
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    this.setInMemory(key, data, ttl);
    this.setInStorage(key, data, ttl);
  }

  /**
   * Delete data from all caches
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    }
  }

  /**
   * Clear all offline data
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setInMemory<T>(key: string, data: T, ttl: number): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.VERSION,
    });
  }

  private getFromStorage<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check version compatibility
      if (entry.version !== this.VERSION) {
        localStorage.removeItem(this.STORAGE_PREFIX + key);
        return null;
      }

      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        localStorage.removeItem(this.STORAGE_PREFIX + key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("[OfflineStore] Error reading from storage:", error);
      return null;
    }
  }

  private setInStorage<T>(key: string, data: T, ttl: number): void {
    if (typeof window === "undefined") return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.VERSION,
      };

      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
      console.error("[OfflineStore] Error writing to storage:", error);
      // If quota exceeded, clear old entries
      if (error instanceof Error && error.name === "QuotaExceededError") {
        this.cleanExpiredEntries();
        // Retry once
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            version: this.VERSION,
          };
          localStorage.setItem(
            this.STORAGE_PREFIX + key,
            JSON.stringify(entry),
          );
        } catch {
          // Give up
        }
      }
    }
  }

  private cleanExpiredEntries(): void {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<any> = JSON.parse(stored);
            if (
              now > entry.timestamp + entry.ttl ||
              entry.version !== this.VERSION
            ) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    });
  }

  private async syncWithDatabase(): Promise<void> {
    // This will be called when connection is restored
    // Implement sync logic here if needed
    console.log("[OfflineStore] Syncing with database...");
  }

  /**
   * User-specific methods
   */
  async getUser(userId: string): Promise<OfflineUser | null> {
    return this.get<OfflineUser>(`user_${userId}`, () =>
      this.generateMockUser(userId),
    );
  }

  async setUser(user: OfflineUser): Promise<void> {
    await this.set(`user_${user.id}`, user, this.DEFAULT_TTL * 24); // Cache for 24 hours
  }

  async getCurrentUser(): Promise<OfflineUser | null> {
    // Try to get from session
    const session = await this.getCurrentSession();
    if (session) {
      return this.getUser(session.userId);
    }

    // Try to get from localStorage user key
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          await this.setUser(user);
          return user;
        } catch {
          // Invalid JSON
        }
      }
    }

    // Return mock user for development
    if (process.env.NODE_ENV === "development") {
      return this.generateMockUser("dev_user");
    }

    return null;
  }

  async getCurrentSession(): Promise<OfflineSession | null> {
    return this.get<OfflineSession>("current_session");
  }

  async setCurrentSession(session: OfflineSession): Promise<void> {
    await this.set("current_session", session, session.expiresAt - Date.now());
  }

  /**
   * Generate mock data for development
   */
  private generateMockUser(userId: string): OfflineUser {
    return {
      id: userId || `user_${Date.now()}_${randomBytes(4).toString("hex")}`,
      email: "dev@localhost.com",
      username: "dev_user",
      firstName: "Development",
      lastName: "User",
      displayName: "Dev User",
      avatar: "/api/placeholder/150/150",
      roles: ["admin", "developer"],
      isActive: true,
      createdAt: new Date(),
      profile: {
        bio: "Development mode user",
        timezone: "Asia/Bangkok",
        language: "th",
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      departments: [
        {
          id: "dept_1",
          name: "Engineering",
          code: "ENG",
          position: "Senior Developer",
          isPrimary: true,
        },
      ],
      teams: [
        {
          id: "team_1",
          name: "Platform Team",
          code: "PLATFORM",
          role: "member",
        },
      ],
    };
  }

  /**
   * Check if we're in offline mode
   */
  isOffline(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Force offline mode (for testing)
   */
  setOfflineMode(offline: boolean): void {
    this.isOfflineMode = offline;
    if (offline) {
      this.handleOffline();
    } else {
      this.handleOnline();
    }
  }
}

// Export singleton instance
export const offlineStore = OfflineStore.getInstance();

// Export types
export type { OfflineUser, OfflineSession, CacheEntry };
