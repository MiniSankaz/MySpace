import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { ApiResponse } from "../types";

// Rate limiting configurations per service
const rateLimitConfigs = {
  "user-auth": {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
  },
  user: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: "Too many user service requests, please try again later",
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 AI requests per minute
    message: "Too many AI requests, please try again later",
  },
  terminal: {
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 terminal requests per minute
    message: "Too many terminal requests, please try again later",
  },
  workspace: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 workspace requests per 15 minutes
    message: "Too many workspace requests, please try again later",
  },
  portfolio: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 portfolio requests per minute
    message: "Too many portfolio requests, please try again later",
  },
};

// Create service-specific rate limiters
const rateLimiters = Object.entries(rateLimitConfigs).reduce(
  (acc, [serviceName, config]) => {
    acc[serviceName] = rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: {
        success: false,
        error: config.message,
        service: "gateway",
        timestamp: new Date().toISOString(),
        rateLimitInfo: {
          service: serviceName,
          windowMs: config.windowMs,
          maxRequests: config.max,
        },
      } as ApiResponse,
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req: Request, res: Response) => {
        logger.warn("Rate limit exceeded", {
          service: serviceName,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
          method: req.method,
          userId: req.user?.id,
        });

        res.status(429).json({
          success: false,
          error: config.message,
          service: "gateway",
          timestamp: new Date().toISOString(),
          rateLimitInfo: {
            service: serviceName,
            windowMs: config.windowMs,
            maxRequests: config.max,
            retryAfter: Math.ceil(config.windowMs / 1000),
          },
        } as ApiResponse);
      },
      keyGenerator: (req: Request) => {
        // Use user ID if authenticated, otherwise fall back to IP
        const userKey = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
        return `${serviceName}:${userKey}`;
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === "/health" || req.path === "/info";
      },
    });

    return acc;
  },
  {} as Record<string, any>,
);

export const serviceRateLimit = (serviceName: string) => {
  const limiter = rateLimiters[serviceName];

  if (!limiter) {
    logger.warn(`No rate limiter found for service: ${serviceName}`);
    // Return a no-op middleware if service not found
    return (req: Request, res: Response, next: any) => next();
  }

  return limiter;
};

// Global rate limiter for all requests
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
    service: "gateway",
    timestamp: new Date().toISOString(),
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Global rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: "Too many requests from this IP, please try again later",
      service: "gateway",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  },
});

// Export rate limit configurations for monitoring
export const getRateLimitConfigs = () => rateLimitConfigs;
