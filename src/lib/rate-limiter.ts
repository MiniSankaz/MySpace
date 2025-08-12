// Simple in-memory rate limiter for API routes
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requests.entries()) {
        if (now > data.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }
  
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const current = this.requests.get(key);
    
    if (!current || now > current.resetTime) {
      // New window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }
    
    // Existing window
    current.count++;
    const allowed = current.count <= this.maxRequests;
    
    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - current.count),
      resetTime: current.resetTime
    };
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Create separate rate limiters for different endpoints with more reasonable limits
export const gitStatusRateLimiter = new RateLimiter(60, 60000); // 60 requests per minute (1 per second avg)
export const gitBranchesRateLimiter = new RateLimiter(60, 60000); // 60 requests per minute
export const gitOperationsRateLimiter = new RateLimiter(30, 60000); // 30 operations per minute