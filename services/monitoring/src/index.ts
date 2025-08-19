import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";
import { logger } from "./utils/logger";
import { metricsCollector } from "./services/metrics-collector.service";
import { cacheService } from "./services/redis-cache.service";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4600;
const SERVICE_NAME = "monitoring";

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);

// General middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "1.0.0",
  });
});

// Metrics endpoints
app.get("/metrics", async (req, res) => {
  try {
    const metrics = await metricsCollector.getPrometheusMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error: any) {
    logger.error("Failed to get metrics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve metrics",
      message: error.message,
    });
  }
});

app.get("/metrics/snapshot", async (req, res) => {
  try {
    const snapshot = await metricsCollector.getMetricsSnapshot();
    res.json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to get metrics snapshot:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve metrics snapshot",
      message: error.message,
    });
  }
});

// Cache statistics endpoint
app.get("/cache/stats", (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

// Record metrics endpoint (for other services to report metrics)
app.post("/metrics/record", (req, res) => {
  const { type, ...data } = req.body;

  try {
    switch (type) {
      case "http":
        metricsCollector.recordHttpRequest(
          data.method,
          data.route,
          data.status,
          data.duration,
          data.service,
        );
        break;

      case "task":
        metricsCollector.recordTaskExecution(
          data.taskType,
          data.status,
          data.duration,
        );
        break;

      case "queue":
        metricsCollector.updateTaskQueueSize(data.priority, data.size);
        break;

      case "websocket":
        if (data.action === "connection") {
          metricsCollector.recordWebSocketConnection(data.service, data.delta);
        } else if (data.action === "message") {
          metricsCollector.recordWebSocketMessage(data.direction, data.service);
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown metric type: ${type}`,
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("Failed to record metric:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record metric",
      message: error.message,
    });
  }
});

// Cache management endpoints
app.post("/cache/set", async (req, res) => {
  const { key, value, ttl } = req.body;

  try {
    const success = await cacheService.set(key, value, ttl);
    res.json({ success });
  } catch (error: any) {
    logger.error("Failed to set cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set cache",
      message: error.message,
    });
  }
});

app.get("/cache/get/:key", async (req, res) => {
  const { key } = req.params;

  try {
    const value = await cacheService.get(key);
    res.json({
      success: true,
      data: value,
      found: value !== null,
    });
  } catch (error: any) {
    logger.error("Failed to get cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get cache",
      message: error.message,
    });
  }
});

app.delete("/cache/delete/:key", async (req, res) => {
  const { key } = req.params;

  try {
    const success = await cacheService.delete(key);
    res.json({ success });
  } catch (error: any) {
    logger.error("Failed to delete cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete cache",
      message: error.message,
    });
  }
});

app.post("/cache/clear", async (req, res) => {
  try {
    const success = await cacheService.clear();
    res.json({ success });
  } catch (error: any) {
    logger.error("Failed to clear cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

// Warm up cache endpoint
app.post("/cache/warmup", async (req, res) => {
  const { keys } = req.body;

  try {
    await cacheService.warmUp(keys);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("Failed to warm up cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to warm up cache",
      message: error.message,
    });
  }
});

// Alert configuration endpoints (placeholder for now)
app.get("/alerts/config", (req, res) => {
  res.json({
    success: true,
    data: {
      alerts: [
        {
          name: "high_response_time",
          condition: "response_time.p95 > 200",
          severity: "warning",
          notification: ["email", "slack"],
        },
        {
          name: "high_error_rate",
          condition: "error_rate > 0.05",
          severity: "critical",
          notification: ["email", "slack", "pagerduty"],
        },
        {
          name: "memory_threshold",
          condition: "memory_usage > 0.8",
          severity: "warning",
          notification: ["email"],
        },
        {
          name: "task_queue_backup",
          condition: "task_queue_length > 100",
          severity: "warning",
          notification: ["slack"],
        },
      ],
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
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
      timestamp: new Date().toISOString(),
    });
  },
);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📊 Metrics endpoint: http://localhost:${PORT}/metrics`);
  logger.info(`💾 Cache stats: http://localhost:${PORT}/cache/stats`);
  logger.info(`📈 Metrics snapshot: http://localhost:${PORT}/metrics/snapshot`);
  logger.info(`🔔 Alert config: http://localhost:${PORT}/alerts/config`);
  logger.info(`✨ Monitoring service ready`);
});

// Listen for metrics events from other services
process.on("metrics:request" as any, (data: any) => {
  metricsCollector.recordHttpRequest(
    data.method,
    data.path,
    data.status,
    data.duration,
    data.service || "unknown",
  );
});

// Cache refresh handler
cacheService.on("refresh", async (key: string) => {
  logger.info(`Cache refresh requested for key: ${key}`);
  // In a real implementation, this would trigger a data refresh
  // from the original source and update the cache
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");

  metricsCollector.stop();
  await cacheService.disconnect();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");

  metricsCollector.stop();
  await cacheService.disconnect();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
