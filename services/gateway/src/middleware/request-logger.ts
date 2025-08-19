import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  // Add request ID to request object for tracking
  (req as any).requestId = requestId;

  // Log incoming request
  logger.info("Incoming request", {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentType: req.get("Content-Type"),
    contentLength: req.get("Content-Length"),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // Log response
    logger.info("Outgoing response", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: JSON.stringify(body).length,
      userId: req.user?.id,
      success: res.statusCode < 400,
      timestamp: new Date().toISOString(),
    });

    // Log slow requests (>2 seconds)
    if (responseTime > 2000) {
      logger.warn("Slow request detected", {
        requestId,
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id,
      });
    }

    // Log error responses
    if (res.statusCode >= 400) {
      logger.warn("Error response", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        error: body?.error || "Unknown error",
        userId: req.user?.id,
      });
    }

    return originalJson.call(this, body);
  };

  // Override res.send for non-JSON responses
  const originalSend = res.send;
  res.send = function (body: any) {
    const responseTime = Date.now() - startTime;

    logger.info("Outgoing response (non-JSON)", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, body);
  };

  // Handle response finish event
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    // Log request completion
    logger.debug("Request completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
    });
  });

  // Handle errors
  res.on("error", (error) => {
    logger.error("Response error", {
      requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      userId: req.user?.id,
    });
  });

  next();
};
