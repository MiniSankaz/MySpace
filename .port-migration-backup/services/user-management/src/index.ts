import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";
import { logger } from "./utils/logger";
import { AuthService } from "./services/auth.service";
import { createAuthRoutes } from "./routes/auth.routes";
import { createUserRoutes } from "./routes/user.routes";
import { ApiResponse, ServiceHealth } from "./types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;
const SERVICE_NAME = "user-management";

// Initialize database and Redis connections
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Initialize services
const authService = new AuthService(prisma, redis);

// Connect to Redis
redis.connect().catch((error) => {
  logger.error("Redis connection failed:", error);
  logger.warn("Service will continue running without Redis connection");
});

redis.on("error", (error) => {
  logger.error("Redis error:", error);
});

redis.on("connect", () => {
  logger.info("Redis connected successfully");
});

// Test database connection
prisma
  .$connect()
  .then(() => {
    logger.info("Database connected successfully");
  })
  .catch((error) => {
    logger.error("Database connection failed:", error);
    logger.warn("Service will continue running without database connection");
  });

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
  max: 500, // limit each IP to 500 requests per windowMs for auth service
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
    // Test database connection
    let dbStatus = "error";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (dbError) {
      logger.warn("Database not connected in health check");
    }

    // Test Redis connection (optional)
    let redisStatus = "not available";
    if (!process.env.SKIP_REDIS) {
      try {
        if (redis.isOpen) {
          await redis.ping();
          redisStatus = "connected";
        }
      } catch (redisError) {
        logger.warn("Redis not connected in health check");
        redisStatus = "disconnected";
      }
    } else {
      redisStatus = "skipped";
    }

    const health: ServiceHealth = {
      service: SERVICE_NAME,
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        url: process.env.DATABASE_URL ? "configured" : "not configured",
      },
      redis: {
        status: redisStatus,
        url: process.env.REDIS_URL ? "configured" : "not configured",
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
      database: {
        status: "error",
        url: process.env.DATABASE_URL ? "configured" : "not configured",
      },
      redis: {
        status: "error",
        url: process.env.REDIS_URL ? "configured" : "not configured",
      },
    };

    res.status(503).json(health);
  }
});

// Service info endpoint
app.get("/info", (req: any, res: any) => {
  res.json({
    service: SERVICE_NAME,
    description: "User Management Service - Authentication & Authorization",
    version: "3.0.0",
    routes: {
      health: "/health",
      info: "/info",
      login: "/auth/login",
      register: "/auth/register",
      refresh: "/auth/refresh",
      logout: "/auth/logout",
      validate: "/auth/validate",
      profile: "/users/me",
      users: "/users/*",
    },
    features: [
      "User Registration & Authentication",
      "JWT Token Management",
      "Role-Based Access Control (RBAC)",
      "Password Management",
      "Session Management",
      "User Profile Management",
    ],
    database: {
      provider: "PostgreSQL",
      status: "connected",
    },
    cache: {
      provider: "Redis",
      status: "connected",
    },
  });
});

// Routes
app.use("/auth", createAuthRoutes(authService));
app.use("/users", createUserRoutes(authService));

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("User Management error:", err);

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

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`ℹ️  Service info: http://localhost:${PORT}/info`);
  logger.info(`🔐 Authentication endpoints available`);
  logger.info(`👤 User management endpoints available`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);

  // Close database connection
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.warn("Error disconnecting database:", error);
  }

  // Close Redis connection if connected
  try {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  } catch (error) {
    logger.warn("Error disconnecting Redis:", error);
  }

  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;
