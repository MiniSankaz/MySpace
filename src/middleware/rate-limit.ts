import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.store[identifier];

    if (!record || record.resetTime < now) {
      // Create new record or reset expired one
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const record = this.store[identifier];
    if (!record) return this.maxRequests;

    const now = Date.now();
    if (record.resetTime < now) return this.maxRequests;

    return Math.max(0, this.maxRequests - record.count);
  }

  getResetTime(identifier: string): number {
    const record = this.store[identifier];
    if (!record) return Date.now() + this.windowMs;
    return record.resetTime;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}

// Create rate limiters for different endpoints
const rateLimiters = {
  api: new RateLimiter(60000, 60), // 60 requests per minute for general API
  assistant: new RateLimiter(60000, 30), // 30 requests per minute for assistant
  auth: new RateLimiter(300000, 5), // 5 requests per 5 minutes for auth
  heavy: new RateLimiter(60000, 10), // 10 requests per minute for heavy operations
};

export function getRateLimiter(
  type: keyof typeof rateLimiters = "api",
): RateLimiter {
  return rateLimiters[type] || rateLimiters.api;
}

export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiters = "api",
): Promise<NextResponse | null> {
  const limiter = getRateLimiter(type);

  // Get identifier (IP address or user ID)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  const identifier = `${type}-${ip}`;

  if (!limiter.isAllowed(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Please slow down and try again later",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limiter["maxRequests"].toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  // Request is allowed
  return null;
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: keyof typeof rateLimiters = "api",
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, type);
    if (rateLimitResponse) return rateLimitResponse;

    const response = await handler(request);

    // Add rate limit headers to successful responses
    const limiter = getRateLimiter(type);
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const identifier = `${type}-${ip}`;

    response.headers.set(
      "X-RateLimit-Limit",
      limiter["maxRequests"].toString(),
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      limiter.getRemainingRequests(identifier).toString(),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      limiter.getResetTime(identifier).toString(),
    );

    return response;
  };
}
