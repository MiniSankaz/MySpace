/**
 * Correlation ID Middleware
 * Tracks requests across multiple services for distributed tracing
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

// Extend Express Request type to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

export interface CorrelationIdOptions {
  headerName?: string;
  generateIfMissing?: boolean;
  trustProxy?: boolean;
  logRequests?: boolean;
}

/**
 * Correlation ID middleware factory
 */
export function correlationIdMiddleware(options: CorrelationIdOptions = {}) {
  const config = {
    headerName: options.headerName || "x-correlation-id",
    generateIfMissing: options.generateIfMissing ?? true,
    trustProxy: options.trustProxy ?? true,
    logRequests: options.logRequests ?? true,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Record request start time
    req.startTime = Date.now();

    // Extract or generate correlation ID
    let correlationId = req.headers[config.headerName] as string;

    if (!correlationId && config.generateIfMissing) {
      correlationId = uuidv4();
    }

    // Generate unique request ID
    const requestId = uuidv4();

    // Attach to request object
    req.correlationId = correlationId;
    req.requestId = requestId;

    // Add to response headers
    res.setHeader("X-Correlation-Id", correlationId);
    res.setHeader("X-Request-Id", requestId);

    // Add to logging context
    const logContext = {
      correlationId,
      requestId,
      method: req.method,
      path: req.path,
      ip: config.trustProxy ? req.ip : req.socket.remoteAddress,
    };

    // Log request if enabled
    if (config.logRequests) {
      logger.info("Incoming request", logContext);
    }

    // Set up response logging
    const originalEnd = res.end.bind(res);
    (res as any).end = function (...args: any[]) {
      // Calculate response time
      const responseTime = Date.now() - (req.startTime || Date.now());

      // Add response time header
      res.setHeader("X-Response-Time", `${responseTime}ms`);

      // Log response if enabled
      if (config.logRequests) {
        logger.info("Request completed", {
          ...logContext,
          statusCode: res.statusCode,
          responseTime,
        });
      }

      // Call original end method with all arguments
      return (originalEnd as any)(...args);
    };

    // Continue to next middleware
    next();
  };
}

/**
 * Extract correlation ID from request
 */
export function getCorrelationId(req: Request): string | undefined {
  return (
    req.correlationId ||
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string)
  );
}

/**
 * Create child correlation ID for sub-requests
 */
export function createChildCorrelationId(parentId: string): string {
  return `${parentId}.${uuidv4().split("-")[0]}`;
}

/**
 * Correlation ID context manager for async operations
 */
export class CorrelationContext {
  private static storage = new Map<string, any>();

  /**
   * Run function with correlation context
   */
  static async run<T>(correlationId: string, fn: () => Promise<T>): Promise<T> {
    const previousId = this.getCurrentId();

    try {
      this.setCurrentId(correlationId);
      return await fn();
    } finally {
      if (previousId) {
        this.setCurrentId(previousId);
      } else {
        this.clearCurrentId();
      }
    }
  }

  /**
   * Get current correlation ID
   */
  static getCurrentId(): string | undefined {
    // In a real implementation, you might use AsyncLocalStorage
    return this.storage.get("currentId");
  }

  /**
   * Set current correlation ID
   */
  private static setCurrentId(id: string): void {
    this.storage.set("currentId", id);
  }

  /**
   * Clear current correlation ID
   */
  private static clearCurrentId(): void {
    this.storage.delete("currentId");
  }
}

/**
 * Propagate correlation ID in HTTP requests
 */
export function propagateCorrelationId(
  headers: Record<string, string>,
  correlationId?: string,
): Record<string, string> {
  const id = correlationId || CorrelationContext.getCurrentId();

  if (id) {
    headers["x-correlation-id"] = id;
  }

  return headers;
}

/**
 * Express middleware to use AsyncLocalStorage for correlation context
 */
import { AsyncLocalStorage } from "async_hooks";

const asyncLocalStorage = new AsyncLocalStorage<{ correlationId: string }>();

export function asyncCorrelationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId =
      req.correlationId ||
      (req.headers["x-correlation-id"] as string) ||
      uuidv4();

    // Run the rest of the request in async context
    asyncLocalStorage.run({ correlationId }, () => {
      req.correlationId = correlationId;
      res.setHeader("X-Correlation-Id", correlationId);
      next();
    });
  };
}

/**
 * Get correlation ID from async context
 */
export function getAsyncCorrelationId(): string | undefined {
  return asyncLocalStorage.getStore()?.correlationId;
}

/**
 * Decorator for adding correlation ID to class methods
 */
export function WithCorrelation(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const correlationId = getAsyncCorrelationId() || uuidv4();

    logger.debug(
      `Method ${propertyKey} called with correlation ID: ${correlationId}`,
    );

    return asyncLocalStorage.run({ correlationId }, async () => {
      return originalMethod.apply(this, args);
    });
  };

  return descriptor;
}

/**
 * Trace decorator for logging method execution with correlation
 */
export function Trace(serviceName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const correlationId = getAsyncCorrelationId();
      const startTime = Date.now();

      logger.debug(
        `[${serviceName || target.constructor.name}] ${propertyKey} started`,
        {
          correlationId,
          args: args.length,
        },
      );

      try {
        const result = await originalMethod.apply(this, args);

        const duration = Date.now() - startTime;
        logger.debug(
          `[${serviceName || target.constructor.name}] ${propertyKey} completed`,
          {
            correlationId,
            duration,
          },
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `[${serviceName || target.constructor.name}] ${propertyKey} failed`,
          {
            correlationId,
            duration,
            error,
          },
        );
        throw error;
      }
    };

    return descriptor;
  };
}

export default correlationIdMiddleware;
