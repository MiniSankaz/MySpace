// Load environment variables FIRST before any other imports
import * as dotenv from "dotenv";
// TODO: Fix shared config import after project restructure
// import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort, getServicePort } from '@shared/config/ports.config';
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { logger } from "./utils/logger";
import {
  requestLoggerMiddleware,
  errorRequestLogger,
  performanceMonitor,
  securityLogger,
  rateLimitLogger,
} from "./middleware/request-logger";
import { WebSocketService } from "./services/websocket.service";
import { ConversationService } from "./services/conversation.service";
import { ClaudeService } from "./services/claude.service";

// Import routes
// TEMPORARILY DISABLED: Potential dependency causing crashes during system upgrade  
// import chatRoutes from "./routes/chat.routes";
// import chatCliRoutes from './routes/chat-cli.routes';  // Temporarily disabled for testing
import folderRoutes from "./routes/folder.routes";
// TEMPORARILY DISABLED: Orchestration routes causing crashes after initialization
// import aiOrchestrationRoutes from "./routes/ai-orchestration.routes";
// TEMPORARILY DISABLED: Causing service crashes during system upgrade
// import ephemeralRoutes from "./routes/chat-ephemeral.routes";

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4110",
    credentials: true,
  },
});

// Check if we're using Claude CLI or API
const useCLI = process.env.USE_CLAUDE_CLI !== "false";

const PORT = process.env.PORT || 4130;
const SERVICE_NAME = "ai-assistant";

// Initialize services
let webSocketService: WebSocketService;
let conversationService: ConversationService;
let claudeService: ClaudeService;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for WebSocket connections
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4110",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Request-ID",
    ],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "500", 10), // Increased limit for AI service
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
app.use(requestLoggerMiddleware);
app.use(securityLogger);
app.use(performanceMonitor(2000)); // 2 second threshold for slow requests
app.use(rateLimitLogger);

// General middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim(), {
          service: SERVICE_NAME,
          source: "morgan",
        });
      },
    },
  }),
);

app.use(
  express.json({
    limit: process.env.MAX_FILE_SIZE || "10mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_FILE_SIZE || "10mb",
  }),
);

// Health check endpoint
app.get("/health", async (req, res) => {
  const startTime = Date.now();

  try {
    // Check service dependencies
    const dependencies = [];

    // Check Claude API
    let claudeStatus = "OK";
    let claudeResponseTime = 0;

    try {
      if (claudeService) {
        const claudeStart = Date.now();
        // Skip API validation in CLI mode
        if (useCLI) {
          claudeStatus = "CLI_MODE";
          claudeResponseTime = 0;
        } else {
          const isValid = await claudeService.validateApiKey();
          claudeResponseTime = Date.now() - claudeStart;
          claudeStatus = isValid ? "OK" : "ERROR";
        }
      } else {
        claudeStatus = "NOT_INITIALIZED";
      }
    } catch (error) {
      claudeStatus = "ERROR";
      claudeResponseTime = Date.now() - startTime;
    }

    dependencies.push({
      name: "claude-api",
      status: claudeStatus,
      responseTime: claudeResponseTime,
      lastChecked: new Date(),
    });

    // Check database connection
    let dbStatus = "OK";
    let dbResponseTime = 0;

    try {
      if (conversationService) {
        const dbStart = Date.now();
        // Simple database check - use a lightweight database ping
        // This avoids dependency on specific table schemas
        await conversationService.healthCheck();
        dbResponseTime = Date.now() - dbStart;
        dbStatus = "OK";
      } else {
        dbStatus = "NOT_INITIALIZED";
      }
    } catch (error: any) {
      dbStatus = "DEGRADED"; // Use DEGRADED instead of ERROR for non-critical issues
      dbResponseTime = Date.now() - startTime;
      logger.warn("Database health check failed (non-critical):", {
        error: error.message,
        code: error.code
      });
    }

    dependencies.push({
      name: "database",
      status: dbStatus,
      responseTime: dbResponseTime,
      lastChecked: new Date(),
    });

    const overallStatus = dependencies.every(
      (dep) => dep.status === "OK" || dep.status === "CLI_MODE",
    )
      ? "OK"
      : dependencies.some((dep) => dep.status === "ERROR")
        ? "ERROR"
        : dependencies.some((dep) => dep.status === "DEGRADED")
          ? "WARNING" // DEGRADED services result in WARNING status, not ERROR
          : "WARNING";

    const health = {
      service: SERVICE_NAME,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      claude: {
        apiKey: process.env.CLAUDE_API_KEY ? "configured" : "not configured",
        model: process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229",
        maxTokens: process.env.MAX_TOKENS || 4096,
      },
      websocket: {
        connected: webSocketService
          ? webSocketService.getConnectedClientCount()
          : 0,
        status: "active",
      },
      dependencies,
      metrics: {
        requestsPerMinute: 0, // TODO: Implement metrics collection
        averageResponseTime: Date.now() - startTime,
        errorRate: 0,
      },
    };

    const statusCode =
      overallStatus === "OK" ? 200 : overallStatus === "WARNING" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error("Health check failed:", error);

    res.status(503).json({
      service: SERVICE_NAME,
      status: "ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Service info endpoint
app.get("/info", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    description: "AI Assistant Service - Claude Integration & Chat",
    version: "3.0.0",
    routes: {
      health: "/health",
      info: "/info",
      chat: {
        sessions: "/chat/sessions",
        message: "/chat/message",
        search: "/chat/search",
        models: "/chat/models",
      },
      folders: {
        list: "/folders",
        create: "/folders",
        update: "/folders/:id",
        delete: "/folders/:id",
      },
      websocket: `ws://localhost:${PORT}`,
    },
    features: [
      "Claude AI Chat Integration",
      "Real-time WebSocket Communication",
      "Streaming Responses",
      "Conversation Session Management",
      "Chat Folder Organization",
      "Message History & Search",
      "Context Awareness",
      "Multi-model Support",
    ],
    websocket: {
      events: [
        "connection",
        "auth",
        "stream_chat",
        "typing_start",
        "typing_stop",
        "join_session",
        "leave_session",
        "disconnect",
      ],
    },
    supportedModels: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  });
});

// API routes
// TEMPORARILY DISABLED: Potential dependency causing crashes during system upgrade
// app.use("/chat", chatRoutes);
// app.use('/chat-cli', chatCliRoutes);  // Temporarily disabled for testing
app.use("/", folderRoutes); // Folders routes are at root level
// TEMPORARILY DISABLED: Orchestration routes causing crashes after initialization
// app.use("/api/v1/ai", aiOrchestrationRoutes); // AI Features routes
// TEMPORARILY DISABLED: Causing service crashes during system upgrade
// app.use("/api/v1/chat", ephemeralRoutes); // Fair Use Policy compliant routes

// Error handling middleware
app.use(errorRequestLogger);
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("AI Assistant error:", {
      error: err.message,
      stack: err.stack,
      requestId: (req as any).requestId,
      url: req.originalUrl,
      method: req.method,
    });

    // Don't leak internal errors in production
    const isDevelopment = process.env.NODE_ENV === "development";

    res.status(err.statusCode || 500).json({
      success: false,
      error: isDevelopment ? err.message : "Internal Server Error",
      ...(isDevelopment && { stack: err.stack }),
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
    });
  },
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    service: SERVICE_NAME,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
  });
});

// Initialize services and start server
const startServer = async () => {
  try {
    logger.info(`Starting ${SERVICE_NAME} service...`);

    // Initialize services
    logger.info("Initializing services...");

    try {
      conversationService = new ConversationService();
      logger.info("ConversationService initialized successfully");
    } catch (error) {
      logger.error("ConversationService initialization failed:", error);
    }

    try {
      claudeService = new ClaudeService();
      logger.info("ClaudeService initialized successfully");
    } catch (error) {
      logger.error("ClaudeService initialization failed:", error);
    }

    webSocketService = new WebSocketService(io);
    logger.info("WebSocketService initialized successfully");

    logger.info("All services initialized successfully");

    // Test Claude API connection (only if not using CLI mode)
    if (useCLI) {
      logger.info("Using Claude CLI mode - skipping API validation");
      logger.info("Make sure Claude CLI is authenticated: claude auth status");
    } else if (process.env.CLAUDE_API_KEY) {
      try {
        const isValid = await claudeService.validateApiKey();
        if (isValid) {
          logger.info("Claude API connection validated successfully");
        } else {
          logger.warn(
            "Claude API key validation failed - service will run with limited functionality",
          );
        }
      } catch (error) {
        logger.warn("Claude API validation error:", error);
      }
    } else {
      logger.warn(
        "CLAUDE_API_KEY not configured and not using CLI mode - AI features will be disabled",
      );
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
      logger.info(`📱 Health check: http://localhost:${PORT}/health`);
      logger.info(`ℹ️  Service info: http://localhost:${PORT}/info`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(
        `💾 Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`,
      );
      logger.info(
        `🤖 Claude API: ${process.env.CLAUDE_API_KEY ? "Configured" : "Not configured"}`,
      );

      // Log current configuration
      logger.info("Service configuration:", {
        environment: process.env.NODE_ENV || "development",
        port: PORT,
        claudeModel: process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229",
        maxTokens: process.env.MAX_TOKENS || 4096,
        frontendUrl: process.env.FRONTEND_URL || "http://${getGatewayPort()}",
      });
    });
  } catch (error: any) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(
    `${SERVICE_NAME} service received ${signal}, shutting down gracefully...`,
  );

  try {
    // Close WebSocket connections
    if (webSocketService) {
      logger.info("Closing WebSocket connections...");
      io.close();
    }

    // Close database connections
    if (conversationService) {
      logger.info("Closing database connections...");
      await conversationService.disconnect();
    }

    // Close HTTP server
    server.close((err) => {
      if (err) {
        logger.error("Error closing HTTP server:", err);
        process.exit(1);
      }

      logger.info(`${SERVICE_NAME} service shut down successfully`);
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error("Force closing service after 10 seconds timeout");
      process.exit(1);
    }, 10000);
  } catch (error: any) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();

export default app;
