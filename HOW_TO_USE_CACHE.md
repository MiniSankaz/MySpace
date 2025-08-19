# How to Use Cache Manager - Developer Guide

## 🚀 Quick Start

### 1. Import Cache Manager

```typescript
import { cacheManager } from "@/core/database/cache-manager";
```

### 2. Basic Usage

#### Simple Cache Set/Get

```typescript
// Cache data for 2 minutes
cacheManager.set("user:123:profile", userData, 2 * 60 * 1000);

// Retrieve from cache
const cached = cacheManager.get("user:123:profile");
if (cached) {
  return cached; // Cache hit
}
```

#### Database Operations with Timeout Protection

```typescript
const result = await cacheManager.withCacheAndTimeout(
  'dashboard:stats:user123',
  async () => {
    // Your database operation
    return await db.user.findMany({...});
  },
  {
    ttl: 5 * 60 * 1000,      // Cache for 5 minutes
    timeout: 5000,           // 5 second timeout
    fallbackValue: []        // Return empty array if timeout
  }
);
```

## 🔧 Advanced Usage

### Cache with Custom Configuration

```typescript
// Different TTL values for different data types
const CACHE_CONFIG = {
  USER_SESSIONS: 2 * 60 * 1000, // 2 minutes
  DASHBOARD_STATS: 5 * 60 * 1000, // 5 minutes
  CHAT_MESSAGES: 1 * 60 * 1000, // 1 minute
  SYSTEM_HEALTH: 30 * 1000, // 30 seconds
};

// Use in API routes
async function getUserSessions(userId: string) {
  return await cacheManager.withCacheAndTimeout(
    `sessions:${userId}`,
    async () => {
      return await prisma.sessions.findMany({
        where: { userId },
      });
    },
    {
      ttl: CACHE_CONFIG.USER_SESSIONS,
      timeout: 5000,
      fallbackValue: [],
    },
  );
}
```

### Cache Invalidation Patterns

```typescript
// Clear specific user's cache when data changes
function clearUserCache(userId: string) {
  cacheManager.clearByPattern(`user:${userId}:.*`);
  cacheManager.clearByPattern(`dashboard:.*:${userId}`);
}

// Clear all session-related cache
function clearSessionCache(userId: string, sessionId?: string) {
  if (sessionId) {
    cacheManager.clearByPattern(`session:.*:${userId}:${sessionId}`);
  }
  cacheManager.clearByPattern(`sessions:.*:${userId}`);
}
```

### Error Handling Best Practices

```typescript
async function getDashboardData(userId: string) {
  try {
    const data = await cacheManager.withCacheAndTimeout(
      `dashboard:${userId}`,
      async () => {
        // Complex database queries
        const [users, sessions, activity] = await Promise.all([
          db.user.count(),
          db.sessions.count({ where: { userId } }),
          db.activity.findMany({ where: { userId }, take: 10 }),
        ]);
        return { users, sessions, activity };
      },
      {
        ttl: 5 * 60 * 1000,
        timeout: 8000, // Longer timeout for complex queries
        fallbackValue: {
          users: 0,
          sessions: 0,
          activity: [],
        },
      },
    );

    return NextResponse.json({
      success: true,
      data,
      cached: cacheManager.get(`dashboard:${userId}`) !== null,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);

    // Try to return any cached data as last resort
    const fallback = cacheManager.get(`dashboard:${userId}`);
    if (fallback) {
      return NextResponse.json({
        success: true,
        data: fallback,
        warning: "Using cached data due to database issues",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Service temporarily unavailable",
      },
      { status: 503 },
    );
  }
}
```

## 🎯 Common Patterns

### 1. API Route with Caching

```typescript
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request);
  const cacheKey = `api:data:${user.id}`;

  try {
    const data = await cacheManager.withCacheAndTimeout(
      cacheKey,
      async () => {
        return await fetchDataFromDatabase(user.id);
      },
      {
        ttl: 2 * 60 * 1000, // 2 minutes
        timeout: 5000, // 5 seconds
        fallbackValue: null,
      },
    );

    return NextResponse.json({
      success: true,
      data,
      cached: !!cacheManager.get(cacheKey),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Service unavailable",
      },
      { status: 503 },
    );
  }
}
```

### 2. Service Layer with Caching

```typescript
class UserService {
  async getUserProfile(userId: string) {
    return await cacheManager.withCacheAndTimeout(
      `user:profile:${userId}`,
      async () => {
        return await this.db.user.findUnique({
          where: { id: userId },
          include: { profile: true },
        });
      },
      {
        ttl: 10 * 60 * 1000, // 10 minutes for user profiles
        timeout: 4100,
        fallbackValue: null,
      },
    );
  }

  async updateUserProfile(userId: string, data: any) {
    const result = await this.db.user.update({
      where: { id: userId },
      data,
    });

    // Invalidate related caches
    cacheManager.clearByPattern(`user:.*:${userId}`);
    cacheManager.clearByPattern(`dashboard:.*:${userId}`);

    return result;
  }
}
```

### 3. Background Tasks with Caching

```typescript
// Periodic cache warming
setInterval(
  async () => {
    try {
      // Pre-warm frequently accessed data
      const activeUsers = await getActiveUsers();

      for (const user of activeUsers) {
        await cacheManager.withCacheAndTimeout(
          `dashboard:${user.id}`,
          () => generateDashboardData(user.id),
          { ttl: 5 * 60 * 1000, timeout: 10000 },
        );
      }

      console.log("Cache warming completed");
    } catch (error) {
      console.error("Cache warming failed:", error);
    }
  },
  10 * 60 * 1000,
); // Every 10 minutes
```

## 📊 Monitoring & Debugging

### Check Cache Statistics

```typescript
// Get cache health info
const stats = cacheManager.getStats();
console.log("Cache Stats:", {
  totalEntries: stats.size,
  entries: stats.entries.map((e) => ({
    key: e.key,
    ageMinutes: Math.round(e.age / (1000 * 60)),
    ttlMinutes: Math.round(e.ttl / (1000 * 60)),
  })),
});
```

### Debug Cache Behavior

```typescript
// Enable detailed logging in development
if (process.env.NODE_ENV === "development") {
  // Override cache methods to add extra logging
  const originalSet = cacheManager.set.bind(cacheManager);
  cacheManager.set = (key: string, data: any, ttl?: number) => {
    console.log(`[DEBUG] Caching ${key} with ${ttl}ms TTL`);
    return originalSet(key, data, ttl);
  };

  const originalGet = cacheManager.get.bind(cacheManager);
  cacheManager.get = <T>(key: string): T | null => {
    const result = originalGet(key);
    console.log(`[DEBUG] Cache ${result ? "HIT" : "MISS"} for ${key}`);
    return result;
  };
}
```

## ⚠️ Important Notes

### 1. Memory Management

```typescript
// Monitor memory usage
const memUsage = process.memoryUsage();
const stats = cacheManager.getStats();

console.log("Memory Usage:", {
  heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
  cacheSize: stats.size,
  estimatedCacheMemory: Math.round(stats.size * 1024) + "bytes",
});

// Clear cache if memory usage is high
if (memUsage.heapUsed > 500 * 1024 * 1024) {
  // 500MB
  console.warn("High memory usage, clearing cache");
  cacheManager.clear();
}
```

### 2. TTL Guidelines

```typescript
const TTL_GUIDELINES = {
  // Fast-changing data
  REAL_TIME_DATA: 30 * 1000, // 30 seconds
  USER_ACTIVITY: 1 * 60 * 1000, // 1 minute
  CHAT_MESSAGES: 1 * 60 * 1000, // 1 minute

  // Medium-change data
  USER_SESSIONS: 2 * 60 * 1000, // 2 minutes
  API_RESPONSES: 2 * 60 * 1000, // 2 minutes

  // Slow-changing data
  USER_PROFILES: 10 * 60 * 1000, // 10 minutes
  SYSTEM_CONFIG: 30 * 60 * 1000, // 30 minutes

  // Very stable data
  REFERENCE_DATA: 60 * 60 * 1000, // 1 hour
};
```

### 3. Cache Key Conventions

```typescript
const CACHE_KEY_PATTERNS = {
  USER_DATA: "user:{userId}:{dataType}",
  SESSION_DATA: "session:{userId}:{sessionId}",
  API_RESPONSE: "api:{endpoint}:{userId}:{params}",
  DASHBOARD: "dashboard:{type}:{userId}",
  SYSTEM: "system:{component}:{metric}",
};

// Example usage
const key = `user:${userId}:profile`;
const key2 = `api:sessions:${userId}:limit=${limit}`;
```

## 🎉 Best Practices Summary

1. **Always provide fallback values** สำหรับ critical operations
2. **Use appropriate TTL values** based on data change frequency
3. **Clear cache when data changes** เพื่อความสม่ำเสมอ
4. **Monitor cache performance** regularly
5. **Handle errors gracefully** ด้วย try-catch
6. **Use consistent naming patterns** สำหรับ cache keys
7. **Test timeout scenarios** in development
8. **Set reasonable timeout values** (3-8 seconds สำหรับ most operations)

Happy caching! 🚀
