# Claude CLI Rate Limit Prevention Strategy

## 📊 Problem Analysis

### Current Issues:

1. **Frequent Requests**: การส่ง request บ่อยเกินไป
2. **Large Context**: ส่งข้อมูล context ขนาดใหญ่
3. **Unnecessary Calls**: เรียกใช้ในกรณีที่ไม่จำเป็น
4. **No Caching**: ไม่มีการ cache คำตอบที่ซ้ำๆ

## 🛡️ Prevention Strategy

### 1. Request Throttling & Rate Limiting

```javascript
// ควบคุมจำนวน requests per minute
const rateLimitConfig = {
  userLevel: 10, // req/min per user
  systemLevel: 30, // req/min system-wide
  maxConcurrent: 3, // Max concurrent requests
  burstProtection: true,
};
```

### 2. Smart Caching System

```javascript
// Multi-layer cache strategy
const cacheStrategy = {
  responseCache: {
    provider: "Redis",
    ttl: "15-60 mins",
  },
  contextCache: {
    reuseFor: "similar queries",
    similarity: 0.85,
  },
  sessionGrouping: {
    batch: "related questions",
    window: "5 mins",
  },
};
```

### 3. Request Optimization

```javascript
// Reduce request payload
const optimization = {
  compression: true,
  summarization: {
    enabled: true,
    afterMessages: 20,
    keepRecent: 5,
  },
  selectiveContext: true,
};
```

### 4. Fallback Mechanisms

```javascript
// Backup strategies when approaching limits
const fallbackOptions = {
  localAI: "Ollama for simple tasks",
  precomputed: "Common questions DB",
  queueSystem: "Delay non-urgent requests",
  hybridMode: "Mix API + CLI based on load",
};
```

### 5. Monitoring & Alerts

```javascript
// Usage tracking and alerts
const monitoring = {
  requestCounter: "per user/session",
  warningAt: "70% limit",
  autoPauseAt: "90% limit",
  reporting: "daily/hourly",
};
```

## 💡 Implementation Design

```typescript
interface RateLimitStrategy {
  // 1. Request Manager
  requestManager: {
    throttle: "sliding-window" | "token-bucket";
    maxRequestsPerMinute: number;
    maxConcurrent: number;
    queueTimeout: number;
  };

  // 2. Cache Strategy
  cache: {
    provider: "redis" | "memory";
    ttl: {
      exact: number; // Exact match cache time
      similar: number; // Similar query cache time
      context: number; // Context cache time
    };
    similarity: number; // Similarity threshold (0-1)
  };

  // 3. Context Optimization
  context: {
    maxTokens: number;
    compression: boolean;
    summarization: {
      enabled: boolean;
      afterMessages: number;
      keepRecent: number;
    };
  };

  // 4. Fallback Options
  fallback: {
    useLocalModels: boolean;
    localModel: string;
    precomputedResponses: boolean;
    queueNonUrgent: boolean;
  };

  // 5. Monitoring
  monitoring: {
    trackUsage: boolean;
    alertThreshold: number;
    pauseThreshold: number;
    resetPeriod: "hourly" | "daily" | "weekly";
  };
}
```

## 🔧 Implementation Phases

### Phase 1: Basic Throttling (1-2 days)

- [ ] Add rate limiter middleware
- [ ] Implement request queue
- [ ] Add basic monitoring
- [ ] User-level rate limiting

### Phase 2: Caching Layer (2-3 days)

- [ ] Setup Redis cache
- [ ] Implement similarity matching algorithm
- [ ] Add cache-first strategy
- [ ] Response deduplication

### Phase 3: Smart Optimization (3-4 days)

- [ ] Context compression algorithm
- [ ] Auto-summarization for long conversations
- [ ] Selective history sending
- [ ] Token counting and optimization

### Phase 4: Fallback System (3-4 days)

- [ ] Integrate Ollama for local AI
- [ ] Pre-compute common responses database
- [ ] Implement hybrid mode (CLI + API)
- [ ] Queue system for non-urgent requests

### Phase 5: Monitoring Dashboard (2-3 days)

- [ ] Usage analytics dashboard
- [ ] Real-time alert system
- [ ] Auto-scaling logic
- [ ] Usage reports and insights

## 📈 Expected Results

| Metric           | Current  | Target           | Improvement           |
| ---------------- | -------- | ---------------- | --------------------- |
| Claude CLI Calls | 100%     | 30-50%           | 50-70% reduction      |
| Response Time    | 2-5s     | 0.5-2s           | 60% faster (cached)   |
| Cost             | $X/month | $0.3X-0.5X/month | 50-70% savings        |
| Reliability      | 95%      | 99.5%            | Fallback options      |
| User Experience  | Good     | Excellent        | Faster, more reliable |

## 🚀 Quick Start Implementation

### Step 1: Install Dependencies

```bash
npm install express-rate-limit redis ioredis bull
npm install @types/express-rate-limit --save-dev
```

### Step 2: Basic Rate Limiter

```typescript
// middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
});

export const claudeRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "claude_rl:",
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many requests to Claude, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Step 3: Cache Implementation

```typescript
// services/claudeCache.service.ts
import { Redis } from "ioredis";
import crypto from "crypto";

export class ClaudeCacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  async getCached(prompt: string, context?: string): Promise<string | null> {
    const key = this.generateKey(prompt, context);
    return await this.redis.get(key);
  }

  async setCached(
    prompt: string,
    response: string,
    context?: string,
    ttl = 3600,
  ) {
    const key = this.generateKey(prompt, context);
    await this.redis.setex(key, ttl, response);
  }

  private generateKey(prompt: string, context?: string): string {
    const data = `${prompt}:${context || ""}`;
    return `claude:${crypto.createHash("md5").update(data).digest("hex")}`;
  }
}
```

### Step 4: Request Queue

```typescript
// services/requestQueue.service.ts
import Bull from "bull";

export class RequestQueueService {
  private queue: Bull.Queue;

  constructor() {
    this.queue = new Bull("claude-requests", {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: 6379,
      },
    });

    this.setupProcessor();
  }

  async addRequest(data: any, priority: number = 0) {
    return await this.queue.add(data, {
      priority,
      delay: priority > 5 ? 0 : 5000, // Delay low priority
    });
  }

  private setupProcessor() {
    this.queue.process(3, async (job) => {
      // Process Claude request
      return await this.processClaudeRequest(job.data);
    });
  }

  private async processClaudeRequest(data: any) {
    // Implementation here
  }
}
```

## 📝 Configuration Example

```yaml
# config/rateLimits.yml
claude:
  limits:
    user:
      requests_per_minute: 10
      requests_per_hour: 300
      requests_per_day: 2000
    system:
      max_concurrent: 3
      queue_size: 100
      queue_timeout: 30000

  cache:
    enabled: true
    ttl:
      exact_match: 3600
      similar_match: 1800
      context: 900
    similarity_threshold: 0.85

  fallback:
    local_model: "ollama/llama2"
    enable_queue: true
    precomputed_responses: true

  monitoring:
    warn_at: 0.7
    pause_at: 0.9
    reset_period: "hourly"
```

## 🔍 Monitoring Queries

```sql
-- Daily usage by user
SELECT
  user_id,
  DATE(created_at) as date,
  COUNT(*) as requests,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cached_hits
FROM claude_requests
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY user_id, DATE(created_at)
ORDER BY requests DESC;

-- Hourly rate limit hits
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  SUM(CASE WHEN rate_limited = true THEN 1 ELSE 0 END) as rate_limited
FROM claude_requests
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

## 🎯 Success Metrics

1. **Rate Limit Hits**: < 5% of requests
2. **Cache Hit Rate**: > 40%
3. **Average Response Time**: < 2 seconds
4. **Fallback Usage**: < 10% (except during outages)
5. **User Satisfaction**: > 95%

## 📚 References

- [Express Rate Limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/indexes/)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Sliding Window Counter](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)

---

_Last Updated: 2025-08-16_
_Status: Design Phase - Ready for Implementation_
