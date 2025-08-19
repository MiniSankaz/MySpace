import { Request, Response, NextFunction } from "express";
import { createProxyMiddleware, RequestHandler } from "http-proxy-middleware";
import { serviceRegistry } from "../services/service-registry";
import { logger } from "../utils/logger";
import retry from "async-retry";

// Cache proxy middleware instances
const proxyCache: Map<string, RequestHandler> = new Map();

// Service route mapping
const SERVICE_ROUTES = {
  "/api/v1/auth": "user-management",
  "/api/v1/users": "user-management",
  "/api/v1/chat": "ai-assistant",
  "/api/v1/assistant": "ai-assistant",
  // AI Features routes
  "/api/v1/ai/orchestration": "ai-assistant",
  "/api/v1/ai/planning": "ai-assistant",
  "/api/v1/ai/agents": "ai-assistant",
  "/api/v1/terminal": "terminal",
  "/api/v1/workspace": "workspace",
  "/api/v1/files": "workspace",
  "/api/v1/git": "workspace",
  "/api/v1/portfolios": "portfolio",
  "/api/v1/stocks": "portfolio",
  "/api/v1/trades": "portfolio",
  "/api/v1/positions": "portfolio",
  "/api/v1/performance": "portfolio",
  "/api/v1/export": "portfolio",
  // Market Data routes
  "/api/v1/market": "market-data",
};

// Add correlation ID to requests
export const addCorrelationId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  next();
};

// Get target service from path
function getTargetService(path: string): string | null {
  for (const [route, service] of Object.entries(SERVICE_ROUTES)) {
    if (path.startsWith(route)) {
      return service;
    }
  }
  return null;
}

// Create proxy for a service
function createServiceProxy(serviceName: string): RequestHandler | null {
  // Check cache first
  if (proxyCache.has(serviceName)) {
    return proxyCache.get(serviceName)!;
  }

  const instance = serviceRegistry.getHealthyInstance(serviceName);

  if (!instance) {
    logger.error(`No healthy instances found for service: ${serviceName}`);
    return null;
  }

  const target = `http://${instance.host}:${instance.port}`;

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 60000, // 60 seconds timeout for POST requests
    proxyTimeout: 60000, // Proxy timeout
    followRedirects: true,
    secure: false, // For development
    logLevel: 'info', // Enable info logging for troubleshooting
    // Don't use buffer option - let the proxy handle the raw stream
    xfwd: true, // Add X-Forwarded-* headers
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=60'
    },
    pathRewrite: (path, req) => {
      // Keep the path as-is for backend services (they expect /api/v1)
      logger.debug(`Forwarding path ${path} to ${serviceName}`);
      return path;
    },
    on: {
      proxyReq: (proxyReq: any, req: any, res: any) => {
        // Set timeout headers to prevent early termination
        proxyReq.setTimeout(60000); // 60 seconds
        
        // Handle request abort gracefully
        req.on('aborted', () => {
          logger.warn(`Request aborted for ${serviceName}: ${req.method} ${req.path}`);
          proxyReq.destroy();
        });
        
        // Forward correlation ID
        const correlationId = req.headers["x-correlation-id"];
        if (correlationId) {
          proxyReq.setHeader("x-correlation-id", correlationId);
        }

        // Forward authentication
        if (req.headers.authorization) {
          proxyReq.setHeader("authorization", req.headers.authorization);
        }

        // Forward user context if available
        if (req.user) {
          proxyReq.setHeader("x-user-id", req.user.id);
          proxyReq.setHeader("x-user-email", req.user.email);
          proxyReq.setHeader("x-user-roles", req.user.roles?.join(",") || "");
        }
        
        // Forward x-user-id header if present (from external requests)
        if (req.headers["x-user-id"]) {
          proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
        }
        
        // Forward other important headers
        if (req.headers["content-type"]) {
          proxyReq.setHeader("content-type", req.headers["content-type"]);
        }
        if (req.headers["accept"]) {
          proxyReq.setHeader("accept", req.headers["accept"]);
        }
        
        // Content-length should be automatically handled by http-proxy-middleware
        // when the raw request stream is available (no manual body parsing)

        logger.info(
          `Proxying request to ${serviceName}: ${req.method} ${req.path}`,
        );
      },
      proxyRes: (proxyRes: any, req: any, res: any) => {
        logger.info(
          `Received response from ${serviceName}: ${proxyRes.statusCode}`,
        );
      },
      error: (err: any, req: any, res: any) => {
        logger.error(`Proxy error for ${serviceName}:`, {
          error: err.message,
          code: err.code,
          errno: err.errno,
          syscall: err.syscall,
          method: req.method,
          path: req.path,
          correlationId: req.headers["x-correlation-id"]
        });

        // Handle specific ECONNABORTED error
        if (err.code === 'ECONNABORTED' || err.message?.includes('aborted')) {
          logger.warn(`Request aborted for ${serviceName}, not marking as unhealthy`);
          if (!res.headersSent) {
            res.status(408).json({
              success: false,
              error: "Request timeout - please try again",
              service: serviceName,
              correlationId: req.headers["x-correlation-id"],
              code: 'REQUEST_TIMEOUT'
            });
          }
          return;
        }

        // Mark instance as unhealthy only for real service errors
        const instance = serviceRegistry.getHealthyInstance(serviceName);
        if (instance && err.code !== 'ECONNABORTED') {
          instance.isHealthy = false;
        }

        // Clear cache for this service
        proxyCache.delete(serviceName);

        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: "Service temporarily unavailable",
            service: serviceName,
            correlationId: req.headers["x-correlation-id"],
          });
        }
      },
    },
  });

  // Cache the proxy
  proxyCache.set(serviceName, proxy);

  // Clear cache after 5 minutes to allow for service updates
  setTimeout(
    () => {
      proxyCache.delete(serviceName);
    },
    5 * 60 * 1000,
  );

  return proxy;
}

// Dynamic routing middleware
export const dynamicRouter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const serviceName = getTargetService(req.path);

  if (!serviceName) {
    // Not a service route, continue to next middleware (like body parsing)
    return next();
  }

  // For service routes, do NOT call next() - handle the request here and finish

  try {
    // Retry logic for resilience
    await retry(
      async () => {
        const proxy = createServiceProxy(serviceName);

        if (!proxy) {
          throw new Error(`Service ${serviceName} is unavailable`);
        }

        // Execute proxy
        return new Promise((resolve, reject) => {
          proxy(req, res, (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(undefined);
            }
          });
        });
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        randomize: true,
        onRetry: (error: any, attempt: number) => {
          logger.warn(
            `Retry attempt ${attempt} for ${serviceName}: ${error.message}`,
          );
          // Clear cache on retry
          proxyCache.delete(serviceName);
        },
      },
    );
  } catch (error: any) {
    logger.error(
      `Failed to proxy request to ${serviceName} after retries:`,
      error,
    );

    res.status(503).json({
      success: false,
      error: "Service unavailable after multiple attempts",
      service: serviceName,
      correlationId: req.headers["x-correlation-id"],
      message: error.message,
    });
  }
};

// WebSocket proxy for real-time services
export const createWebSocketProxy = (serviceName: string) => {
  return createProxyMiddleware({
    target: `ws://localhost:${getServicePort(serviceName)}`,
    ws: true,
    changeOrigin: true,
    on: {
      error: (err: any, req: any, res: any) => {
        logger.error(`WebSocket proxy error for ${serviceName}:`, err);
      },
    },
  });
};

function getServicePort(serviceName: string): number {
  const portMap: Record<string, number> = {
    terminal: 4300,
    "ai-assistant": 4200,
    portfolio: 4500,
  };
  return portMap[serviceName] || 4000;
}
