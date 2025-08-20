// @AI-MARKER:SERVICE:GATEWAY
// @AI-MARKER:COMPONENT:API_GATEWAY
// @AI-MARKER:PORT:4110
import express from "express";
import { PortConfig } from '@shared/config/ports.config';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";
import { logger } from "./utils/logger";
import { globalRateLimit } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { healthAggregator } from "./services/health-aggregator";
import { serviceRegistry } from "./services/service-registry";
import {
  dynamicRouter,
  addCorrelationId,
  createWebSocketProxy,
} from "./middleware/dynamic-router";
import { ApiResponse, ServiceHealth } from "./types";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;
const SERVICE_NAME = "gateway";

// Security middleware
app.use(helmet());
// CORS configuration - support both localhost and 127.0.0.1
const portConfig = PortConfig.getInstance();
const frontendPort = portConfig.getServicePort('frontend');
const gatewayPort = portConfig.getServicePort('gateway');

const corsOrigins = [
  `http://localhost:${frontendPort}`,
  `http://127.0.0.1:${frontendPort}`,
  `http://localhost:${gatewayPort}`, // For service-to-service communication
  `http://127.0.0.1:${gatewayPort}`,
  // Legacy ports for backward compatibility
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4000",
  "http://127.0.0.1:4000"
];

// Add custom FRONTEND_URL if defined
if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-correlation-id",
      "Accept",
      "Origin",
      "X-Requested-With",
      "Cache-Control"
    ],
    exposedHeaders: ["x-correlation-id"],
    preflightContinue: false,
    optionsSuccessStatus: 200, // For legacy browsers
    maxAge: 86400 // 24 hours
  }),
);

// Additional OPTIONS handler for preflight requests
app.options('*', (req: express.Request, res: express.Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-correlation-id, Accept, Origin, X-Requested-With, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Rate limiting
app.use(globalRateLimit);

// General middleware (before proxy)
app.use(compression());
app.use(morgan("combined"));

// Custom middleware (before proxy)
app.use(requestLogger);
app.use(addCorrelationId);

// CRITICAL: Dynamic routing MUST be BEFORE body parsing
// Body parsing consumes the request stream, making proxy forwarding impossible
app.use(dynamicRouter);

// Body parsing middleware (ONLY for Gateway's own routes)
// This runs AFTER proxy routes have been handled
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// @AI-MARKER:ENDPOINT:HEALTH_CHECK
// Health check endpoint
app.get("/health", async (req, res) => {
  const health: ServiceHealth = {
    service: SERVICE_NAME,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "3.0.0",
    environment: process.env.NODE_ENV || "development",
  };

  res.json(health);
});

// Service info endpoint
app.get("/info", (req, res) => {
  const services = serviceRegistry.getAllServices();
  const serviceInfo: any = {
    service: SERVICE_NAME,
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    services: {},
  };

  services.forEach((instances, name) => {
    serviceInfo.services[name] = instances.map((i) => ({
      id: i.id,
      host: i.host,
      port: i.port,
      healthy: i.isHealthy,
      lastCheck: i.lastHealthCheck,
    }));
  });

  res.json(serviceInfo);
});

// Aggregated health check for all services
app.get("/health/all", async (req, res) => {
  try {
    const health = await healthAggregator.getAggregatedHealth();
    res.json(health);
  } catch (error: any) {
    logger.error("Failed to get aggregated health:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve health status",
      message: error.message,
    } as ApiResponse);
  }
});

// @AI-MARKER:ENDPOINT:SERVICE_DISCOVERY
// Service discovery endpoint
app.get("/services", (req, res) => {
  const services = serviceRegistry.getAllServices();
  const result: any = {};

  services.forEach((instances, name) => {
    result[name] = {
      instances: instances.length,
      healthy: instances.filter((i) => i.isHealthy).length,
      endpoints: instances.map((i) => ({
        id: i.id,
        url: `http://${i.host}:${i.port}`,
        healthy: i.isHealthy,
      })),
    };
  });

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Service-specific health checks
app.get("/health/:service", async (req, res) => {
  const serviceName = req.params.service;
  const instance = serviceRegistry.getHealthyInstance(serviceName);

  if (!instance) {
    return res.status(503).json({
      success: false,
      error: `Service ${serviceName} is not available`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  try {
    const response = await fetch(instance.healthUrl);
    const health = await response.json();
    res.json(health);
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: `Failed to check health of ${serviceName}`,
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// @AI-MARKER:WEBSOCKET:PROXY_HANDLER
// WebSocket proxies
server.on("upgrade", (request, socket: any, head) => {
  const pathname = request.url || "";

  if (pathname.startsWith("/ws/terminal")) {
    const proxy = createWebSocketProxy("terminal");
    proxy.upgrade?.(request, socket, head);
  } else if (pathname.startsWith("/ws/chat")) {
    const proxy = createWebSocketProxy("ai-assistant");
    proxy.upgrade?.(request, socket, head);
  } else if (pathname.startsWith("/ws/portfolio")) {
    const proxy = createWebSocketProxy("portfolio");
    proxy.upgrade?.(request, socket, head);
  } else {
    socket.destroy();
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("Unhandled error:", err);

    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
      correlationId: req.headers["x-correlation-id"],
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  },
);

// @AI-MARKER:INIT:SERVER_START
// Start server
server.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔄 Service discovery: http://localhost:${PORT}/services`);
  logger.info(`📊 Aggregated health: http://localhost:${PORT}/health/all`);
  logger.info(`🌐 API Gateway ready to route requests`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  serviceRegistry.stop();
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully...");
  serviceRegistry.stop();
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
