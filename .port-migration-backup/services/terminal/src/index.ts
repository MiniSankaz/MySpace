import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { logger } from "./utils/logger";
import { TerminalService } from "./services/terminal.service";
import { WebSocketService } from "./services/websocket.service";
import { createTerminalRoutes } from "./routes/terminal.routes";
import { ApiResponse, ServiceHealth } from "./types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4300;
const SERVICE_NAME = "terminal";

// Create HTTP server for WebSocket support
const server = createServer(app);

// Initialize services
const terminalService = new TerminalService();
let webSocketService: WebSocketService;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs for terminal service
  message: {
    success: false,
    error: "Too many requests, please try again later",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  } as ApiResponse,
});
app.use(limiter);

// General middleware
app.use(morgan("combined"));
app.use(express.json({ 
  limit: "10mb",
  verify: (req: any, res: any, buf: Buffer) => {
    // Store raw body for debugging request abort issues
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "10mb",
  verify: (req: any, res: any, buf: Buffer) => {
    req.rawBody = buf;
  }
}));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const statistics = terminalService.getStatistics();
    const wsStats = webSocketService?.getConnectionStats();

    const health: ServiceHealth = {
      service: SERVICE_NAME,
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      terminals: {
        active: statistics.activeSessions,
        total: statistics.totalSessions,
      },
    };

    res.status(200).json(health);
  } catch (error: any) {
    logger.error("Health check failed:", error);

    const health: ServiceHealth = {
      service: SERVICE_NAME,
      status: "ERROR",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    res.status(503).json(health);
  }
});

// Service info endpoint
app.get("/info", (req: any, res: any) => {
  const statistics = terminalService.getStatistics();
  const wsStats = webSocketService?.getConnectionStats();

  res.json({
    service: SERVICE_NAME,
    description:
      "Terminal Service for Stock Portfolio v3.0 - Terminal V2 Operations & PTY Management",
    version: "3.0.0",
    routes: {
      health: "/health",
      info: "/info",
      create: "/terminals/create",
      list: "/terminals",
      session: "/terminals/:sessionId",
      close: "/terminals/:sessionId",
      write: "/terminals/:sessionId/write",
      resize: "/terminals/:sessionId/resize",
      history: "/terminals/:sessionId/history",
      stats: "/terminals/stats/overview",
    },
    webSocket: {
      endpoint: "/ws/terminal-v2/",
      events: ["join", "data", "resize", "ping", "disconnect"],
    },
    features: [
      "Terminal V2 Clean Architecture",
      "PTY Process Management",
      "WebSocket Real-time Communication",
      "Session Management",
      "Command History Tracking",
      "Multi-project Support",
      "Auto-cleanup & Resource Management",
    ],
    statistics,
    connections: wsStats,
  });
});

// API Routes
app.use("/terminals", createTerminalRoutes(terminalService));

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("Terminal Service error:", err);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  },
);

// 404 handler
app.use("*", (req: any, res: any) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    service: SERVICE_NAME,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Initialize WebSocket service after server setup
webSocketService = new WebSocketService(server, terminalService);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`ℹ️  Service info: http://localhost:${PORT}/info`);
  logger.info(
    `🖥️  Terminal V2 WebSocket: ws://localhost:${PORT}/ws/terminal-v2/`,
  );
  logger.info(`⚡ Terminal operations ready`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);

  // Shutdown WebSocket service
  if (webSocketService) {
    await webSocketService.shutdown();
  }

  // Close all terminal sessions
  const sessions = terminalService.listAllSessions();
  for (const session of sessions) {
    terminalService.closeSession(session.id);
  }

  // Close server
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection:", { reason, promise });
  gracefulShutdown();
});

export default app;
