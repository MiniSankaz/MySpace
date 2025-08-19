export interface RequestContext {
  userId?: string;
  sessionId?: string;
  correlationId: string;
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
}
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  path: string;
  method: string;
  correlationId?: string;
}
export interface ValidationError {
  field: string;
  message: string;
  value: any;
  constraint: string;
}
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
}
export interface HealthCheckResult {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  checks: {
    database?: HealthStatus;
    redis?: HealthStatus;
    externalServices?: Record<string, HealthStatus>;
  };
  timestamp: Date;
}
export interface HealthStatus {
  status: "up" | "down" | "degraded";
  responseTime?: number;
  message?: string;
  lastChecked: Date;
}
//# sourceMappingURL=api.types.d.ts.map
