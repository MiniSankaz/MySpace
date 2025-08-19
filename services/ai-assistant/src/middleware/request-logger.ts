import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Request logging middleware
 * Logs incoming requests and responses with timing information
 */
export const requestLoggerMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers for debugging
  res.setHeader("X-Request-ID", req.requestId);

  // Log incoming request
  logger.info("Incoming request", {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: (req as any).userId,
    contentLength: req.get("content-length"),
    timestamp: new Date().toISOString(),
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };

    // Remove sensitive fields
    const sensitiveFields = ["password", "token", "apiKey", "secret"];
    sensitiveFields.forEach((field) => {
      if (logBody[field]) {
        logBody[field] = "[REDACTED]";
      }
    });

    logger.debug("Request body", {
      requestId: req.requestId,
      body: logBody,
    });
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function (body?: any): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());

    // Log response
    logger.info("Request completed", {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get("content-length"),
      userId: (req as any).userId,
      timestamp: new Date().toISOString(),
    });

    // Log response body for errors or debug mode
    if (res.statusCode >= 400 || process.env.LOG_LEVEL === "debug") {
      logger.debug("Response body", {
        requestId: req.requestId,
        statusCode: res.statusCode,
        body: typeof body === "object" ? JSON.stringify(body) : body,
      });
    }

    return originalJson.call(this, body);
  };

  // Override res.send to handle non-JSON responses
  const originalSend = res.send;
  res.send = function (body?: any): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());

    if (!res.headersSent) {
      logger.info("Request completed", {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get("content-length"),
        userId: (req as any).userId,
        timestamp: new Date().toISOString(),
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Error request logger middleware
 * Logs requests that result in errors with additional context
 */
export const errorRequestLogger = (
  err: any,
  req: LoggedRequest,
  res: Response,
  next: NextFunction,
) => {
  const responseTime = Date.now() - (req.startTime || Date.now());

  logger.error("Request failed", {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode || 500,
    responseTime: `${responseTime}ms`,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    userId: (req as any).userId,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  next(err);
};

/**
 * Performance monitoring middleware
 * Logs slow requests and tracks performance metrics
 */
export const performanceMonitor = (slowThreshold: number = 1000) => {
  return (req: LoggedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (body?: any): Response {
      const responseTime = Date.now() - (req.startTime || Date.now());

      // Log slow requests
      if (responseTime > slowThreshold) {
        logger.warn("Slow request detected", {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          threshold: `${slowThreshold}ms`,
          statusCode: res.statusCode,
          userId: (req as any).userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Log performance metrics for analytics
      logger.debug("Performance metrics", {
        requestId: req.requestId,
        method: req.method,
        endpoint: req.route?.path || req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Security event logger
 * Logs security-related events and suspicious activities
 */
export const securityLogger = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Log authentication attempts
  if (req.path.includes("login") || req.path.includes("auth")) {
    logger.info("Authentication attempt", {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
  }

  // Log admin endpoint access
  if (req.path.includes("admin") || req.originalUrl.includes("admin")) {
    logger.info("Admin endpoint access", {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      userId: (req as any).userId,
      userRole: (req as any).userRole,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  }

  // Log suspicious request patterns
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
  ];

  const fullUrl = req.originalUrl + JSON.stringify(req.body);
  const isSuspicious = suspiciousPatterns.some((pattern) =>
    pattern.test(fullUrl),
  );

  if (isSuspicious) {
    logger.warn("Suspicious request detected", {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: (req as any).userId,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Rate limiting logger
 * Logs rate limiting events
 */
export const rateLimitLogger = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Check if rate limit headers are present (added by express-rate-limit)
  const rateLimitRemaining = res.get("X-RateLimit-Remaining");
  const rateLimitReset = res.get("X-RateLimit-Reset");

  if (rateLimitRemaining === "0") {
    logger.warn("Rate limit reached", {
      requestId: req.requestId,
      ip: req.ip,
      userId: (req as any).userId,
      endpoint: req.originalUrl,
      rateLimitReset,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
