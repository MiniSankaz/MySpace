import express from "express";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Use local logger instead of shared
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4400;
const SERVICE_NAME = "workspace";

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://${getFrontendPort()}",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // limit each IP to 400 requests per windowMs for workspace service
});
app.use(limiter);

// General middleware
app.use(morgan("combined"));
app.use(express.json({ limit: "20mb" })); // Larger limit for file operations
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    service: SERVICE_NAME,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "3.0.0",
    environment: process.env.NODE_ENV || "development",
    workspace: {
      root: process.env.WORKSPACE_ROOT || "./workspaces",
      maxFileSize: process.env.MAX_FILE_SIZE || "10MB",
      allowedExtensions: process.env.ALLOWED_EXTENSIONS?.split(",") || [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        ".md",
      ],
      gitEnabled: true,
    },
    redis: {
      url: process.env.REDIS_URL ? "configured" : "not configured",
    },
  };

  res.status(200).json(health);
});

// Service info endpoint
app.get("/info", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    description: "Workspace Service - File & Git Management",
    version: "3.0.0",
    routes: {
      health: "/health",
      info: "/info",
      files: "/files/*",
      projects: "/projects/*",
      git: "/git/*",
      upload: "/upload",
      download: "/download/*",
    },
    features: [
      "File System Management",
      "Project Structure Management",
      "Git Integration (Branch, Commit, Push, Pull)",
      "File Upload & Download",
      "Code Editor Integration",
      "Workspace Synchronization",
      "Project Templates",
      "File Watching & Auto-sync",
    ],
    limits: {
      maxFileSize: process.env.MAX_FILE_SIZE || "10MB",
      allowedExtensions: process.env.ALLOWED_EXTENSIONS?.split(",") || [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        ".md",
      ],
      workspaceRoot: process.env.WORKSPACE_ROOT || "./workspaces",
    },
  });
});

// File management endpoints (placeholder)
app.get("/files", (req, res) => {
  res.status(501).json({
    error: "Not implemented yet",
    service: SERVICE_NAME,
    endpoint: "/files",
    message: "File listing will be implemented",
  });
});

app.post("/files", (req, res) => {
  res.status(501).json({
    error: "Not implemented yet",
    service: SERVICE_NAME,
    endpoint: "POST /files",
    message: "File creation will be implemented",
  });
});

app.get("/projects", (req, res) => {
  res.status(501).json({
    error: "Not implemented yet",
    service: SERVICE_NAME,
    endpoint: "/projects",
    message: "Project management will be implemented",
  });
});

// Git management endpoints (placeholder)
app.get("/git/status", (req, res) => {
  res.status(501).json({
    error: "Not implemented yet",
    service: SERVICE_NAME,
    endpoint: "/git/status",
    message: "Git status will be implemented",
  });
});

app.post("/git/commit", (req, res) => {
  res.status(501).json({
    error: "Not implemented yet",
    service: SERVICE_NAME,
    endpoint: "/git/commit",
    message: "Git commit will be implemented",
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("Workspace service error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    });
  },
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    service: SERVICE_NAME,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`ℹ️  Service info: http://localhost:${PORT}/info`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);
  process.exit(0);
});

export default app;
