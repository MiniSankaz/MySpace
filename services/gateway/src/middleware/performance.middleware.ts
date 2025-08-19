import { Request, Response, NextFunction } from "express";
import compression from "compression";
import { createHash } from "crypto";
import { logger } from "../utils/logger";

export interface OptimizationConfig {
  compression: {
    enabled: boolean;
    threshold: number;
    algorithms: ("gzip" | "br" | "deflate")[];
  };

  caching: {
    publicCache: boolean;
    maxAge: number;
    sMaxAge: number;
    mustRevalidate: boolean;
    staleWhileRevalidate: number;
    staleIfError: number;
  };

  batching: {
    enabled: boolean;
    maxBatchSize: number;
    maxWaitTime: number;
  };

  etag: {
    enabled: boolean;
    weak: boolean;
  };
}

interface BatchRequest {
  id: string;
  request: Request;
  response: Response;
  next: NextFunction;
  timestamp: number;
}

export class PerformanceMiddleware {
  private config: OptimizationConfig;
  private batchQueue: Map<string, BatchRequest[]>;
  private batchTimers: Map<string, NodeJS.Timeout>;
  private requestCache: Map<string, any>;
  private etagCache: Map<string, string>;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      compression: {
        enabled: true,
        threshold: 1024, // 1KB minimum
        algorithms: ["gzip", "br", "deflate"],
        ...config.compression,
      },
      caching: {
        publicCache: false,
        maxAge: 300, // 5 minutes
        sMaxAge: 600, // 10 minutes for CDN
        mustRevalidate: true,
        staleWhileRevalidate: 60,
        staleIfError: 3600,
        ...config.caching,
      },
      batching: {
        enabled: true,
        maxBatchSize: 10,
        maxWaitTime: 100, // 100ms
        ...config.batching,
      },
      etag: {
        enabled: true,
        weak: true,
        ...config.etag,
      },
    };

    this.batchQueue = new Map();
    this.batchTimers = new Map();
    this.requestCache = new Map();
    this.etagCache = new Map();
  }

  // Compression middleware
  public getCompressionMiddleware() {
    if (!this.config.compression.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return compression({
      threshold: this.config.compression.threshold,
      filter: (req, res) => {
        // Don't compress if already compressed
        if (res.getHeader("Content-Encoding")) {
          return false;
        }

        // Check if content type is compressible
        const contentType = res.getHeader("Content-Type");
        if (typeof contentType === "string") {
          const compressibleTypes = [
            "text/",
            "application/json",
            "application/javascript",
            "application/xml",
            "application/x-www-form-urlencoded",
          ];
          return compressibleTypes.some((type) => contentType.includes(type));
        }

        return true;
      },
    });
  }

  // Cache headers middleware
  public setCacheHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Cache-Control", "no-store");
        return next();
      }

      // Build Cache-Control header
      const directives: string[] = [];

      if (this.config.caching.publicCache) {
        directives.push("public");
      } else {
        directives.push("private");
      }

      directives.push(`max-age=${this.config.caching.maxAge}`);
      directives.push(`s-maxage=${this.config.caching.sMaxAge}`);

      if (this.config.caching.mustRevalidate) {
        directives.push("must-revalidate");
      }

      if (this.config.caching.staleWhileRevalidate > 0) {
        directives.push(
          `stale-while-revalidate=${this.config.caching.staleWhileRevalidate}`,
        );
      }

      if (this.config.caching.staleIfError > 0) {
        directives.push(`stale-if-error=${this.config.caching.staleIfError}`);
      }

      res.setHeader("Cache-Control", directives.join(", "));

      // Add Vary header for proper caching
      res.setHeader("Vary", "Accept-Encoding, Accept, Authorization");

      next();
    };
  }

  // ETag generation and validation
  public handleEtag() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.etag.enabled) {
        return next();
      }

      // Check If-None-Match header
      const ifNoneMatch = req.headers["if-none-match"];

      // Store original send functions
      const originalSend = res.send;
      const originalJson = res.json;

      // Override send function to add ETag
      res.send = function (body: any): Response {
        const etag = generateEtag(body, this.config.etag.weak);
        res.setHeader("ETag", etag);

        // Check if client has matching ETag
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.status(304).end();
          return res;
        }

        return originalSend.call(this, body);
      }.bind(this);

      // Override json function to add ETag
      res.json = function (body: any): Response {
        const etag = generateEtag(JSON.stringify(body), this.config.etag.weak);
        res.setHeader("ETag", etag);

        // Check if client has matching ETag
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.status(304).end();
          return res;
        }

        return originalJson.call(this, body);
      }.bind(this);

      next();
    };
  }

  // Request deduplication middleware
  public deduplicateRequests() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Only deduplicate GET requests
      if (req.method !== "GET") {
        return next();
      }

      const cacheKey = this.generateRequestKey(req);

      // Check if request is already being processed
      const cached = this.requestCache.get(cacheKey);
      if (cached) {
        // Wait for the original request to complete
        cached.listeners.push({ res, timestamp: Date.now() });
        return;
      }

      // Mark request as being processed
      this.requestCache.set(cacheKey, {
        timestamp: Date.now(),
        listeners: [],
      });

      // Store original send functions
      const originalSend = res.send;
      const originalJson = res.json;

      // Override send to broadcast to waiting requests
      res.send = function (body: any): Response {
        const cached = this.requestCache.get(cacheKey);
        if (cached && cached.listeners.length > 0) {
          // Send response to all waiting requests
          for (const listener of cached.listeners) {
            listener.res.send(body);
          }
        }

        // Clean up cache after a short delay
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 100);

        return originalSend.call(this, body);
      }.bind(this);

      // Override json to broadcast to waiting requests
      res.json = function (body: any): Response {
        const cached = this.requestCache.get(cacheKey);
        if (cached && cached.listeners.length > 0) {
          // Send response to all waiting requests
          for (const listener of cached.listeners) {
            listener.res.json(body);
          }
        }

        // Clean up cache after a short delay
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 100);

        return originalJson.call(this, body);
      }.bind(this);

      next();
    };
  }

  // Batch request processing
  public batchRequests() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.batching.enabled) {
        return next();
      }

      // Check if request supports batching
      const batchKey = this.getBatchKey(req);
      if (!batchKey) {
        return next();
      }

      // Add request to batch queue
      const batchRequest: BatchRequest = {
        id: generateRequestId(),
        request: req,
        response: res,
        next,
        timestamp: Date.now(),
      };

      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      const queue = this.batchQueue.get(batchKey)!;
      queue.push(batchRequest);

      // Process batch if it's full
      if (queue.length >= this.config.batching.maxBatchSize) {
        this.processBatch(batchKey);
        return;
      }

      // Set timer to process batch after max wait time
      if (!this.batchTimers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.processBatch(batchKey);
        }, this.config.batching.maxWaitTime);

        this.batchTimers.set(batchKey, timer);
      }
    };
  }

  // Process batched requests
  private processBatch(batchKey: string): void {
    const queue = this.batchQueue.get(batchKey);
    if (!queue || queue.length === 0) {
      return;
    }

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Clear queue
    this.batchQueue.delete(batchKey);

    logger.info(`Processing batch of ${queue.length} requests for ${batchKey}`);

    // Process all requests in the batch
    // In a real implementation, this would combine the requests
    // and make a single call to the backend service
    for (const batchRequest of queue) {
      batchRequest.next();
    }
  }

  // Generate cache key for request
  private generateRequestKey(req: Request): string {
    const parts = [
      req.method,
      req.path,
      JSON.stringify(req.query),
      req.headers.authorization || "",
    ];

    return createHash("sha256").update(parts.join(":")).digest("hex");
  }

  // Determine batch key for request
  private getBatchKey(req: Request): string | null {
    // Only batch certain types of requests
    const batchablePaths = [
      "/api/v1/stocks/quotes",
      "/api/v1/portfolios/values",
      "/api/v1/trades/history",
    ];

    const pathMatch = batchablePaths.find((path) => req.path.startsWith(path));
    if (!pathMatch) {
      return null;
    }

    // Group by path and user
    const userId = (req as any).userId || "anonymous";
    return `${pathMatch}:${userId}`;
  }

  // Performance monitoring middleware
  public monitorPerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Add performance data to request
      (req as any).performance = {
        startTime,
        startMemory,
      };

      // Monitor response
      const originalSend = res.send;
      const originalJson = res.json;

      const recordMetrics = () => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        logger.debug("Request performance", {
          method: req.method,
          path: req.path,
          duration,
          memoryDelta,
          status: res.statusCode,
        });

        // Emit metrics event
        process.emit("metrics:request" as any, {
          method: req.method,
          path: req.path,
          duration,
          memoryDelta,
          status: res.statusCode,
        });
      };

      res.send = function (body: any): Response {
        recordMetrics();
        return originalSend.call(this, body);
      };

      res.json = function (body: any): Response {
        recordMetrics();
        return originalJson.call(this, body);
      };

      next();
    };
  }

  // Get all middleware functions
  public getMiddleware() {
    return [
      this.monitorPerformance(),
      this.getCompressionMiddleware(),
      this.setCacheHeaders(),
      this.handleEtag(),
      this.deduplicateRequests(),
      this.batchRequests(),
    ];
  }
}

// Helper functions
function generateEtag(content: string, weak: boolean = true): string {
  const hash = createHash("sha256")
    .update(content)
    .digest("hex")
    .substring(0, 16);

  return weak ? `W/"${hash}"` : `"${hash}"`;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Export singleton instance with default config
export const performanceMiddleware = new PerformanceMiddleware();
