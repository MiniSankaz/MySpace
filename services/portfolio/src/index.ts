import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";
import portfolioRoutes from "./routes/portfolio.routes";
import holdingRoutes from "./routes/holding.routes";
import positionRoutes from "./routes/position.routes";
import tradeRoutes from "./routes/trade.routes";
import stockRoutes from "./routes/stock.routes";
import performanceRoutes from "./routes/performance.routes";
import exportRoutes from "./routes/export.routes";
import transactionRoutes from "./routes/transaction.routes";
import { initializeWebSocket } from "./services/websocket.service";
import { startPriceUpdateJob } from "./jobs/price-updater";
import { startPortfolioCalculationJob } from "./jobs/portfolio-calculator";

// Load environment variables
dotenv.config();

const app = express();

// Portfolio service configuration with fallback
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4160; // Default portfolio port

// Always use fallback configuration for simplicity
const getServiceUrl = (service: string) => {
  const servicePorts: Record<string, number> = {
    frontend: 4100,
    gateway: 4110,
    user: 4120,
    ai: 4130,
    terminal: 4140,
    workspace: 4150,
    portfolio: 4160,
    market: 4170
  };
  const port = servicePorts[service] || 4000;
  return `http://127.0.0.1:${port}`;
};

const SERVICE_NAME = "portfolio";

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
// CORS configuration - support both localhost and 127.0.0.1
const corsOrigins = [
  getServiceUrl('frontend'),
  "http://127.0.0.1:3000", // Legacy support
  getServiceUrl('gateway'),
  "http://127.0.0.1:4000", // Legacy support
  "http://localhost:4100", // Frontend
  "http://localhost:4110"  // Gateway
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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // limit each IP to 600 requests per windowMs for portfolio service
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
    // Test mock database connection (always succeeds)
    // await prisma.$queryRaw`SELECT 1`; // Not available in mock

    const health = {
      service: SERVICE_NAME,
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      marketData: {
        provider: "Alpha Vantage",
        apiKey: process.env.ALPHA_VANTAGE_API_KEY
          ? "configured"
          : "not configured",
        cacheTTL: process.env.MARKET_DATA_CACHE_TTL || "300 seconds",
        lastSync: "Not implemented",
      },
      portfolio: {
        calculationInterval: process.env.PORTFOLIO_CALC_INTERVAL || "60000ms",
        lastCalculation: "Not implemented",
      },
      database: {
        status: "connected",
        url: process.env.DATABASE_URL ? "configured" : "not configured",
      },
      features: {
        mockPrices: process.env.USE_MOCK_PRICES === "true",
        priceUpdateInterval: process.env.MOCK_UPDATE_INTERVAL || 5000,
        maxPortfoliosPerUser: process.env.MAX_PORTFOLIOS_PER_USER || 10,
        maxPositionsPerPortfolio:
          process.env.MAX_POSITIONS_PER_PORTFOLIO || 100,
      },
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      service: SERVICE_NAME,
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: "Database connection failed",
    });
  }
});

// Service info endpoint
app.get("/info", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    description: "Portfolio Service - Stock Trading Features & Market Data",
    version: "3.0.0",
    routes: {
      health: "/health",
      info: "/info",
      portfolios: "/portfolios/*",
      stocks: "/stocks/*",
      trades: "/trades/*",
      marketData: "/market-data/*",
      analysis: "/analysis/*",
      reports: "/reports/*",
    },
    features: [
      "Portfolio Management",
      "Stock Trading & Order Management",
      "Real-time Market Data Integration",
      "Portfolio Performance Analysis",
      "Risk Assessment & Analytics",
      "Trade Execution & History",
      "Financial Reports & Exports",
      "Market Data Caching & Sync",
      "Automated Portfolio Calculations",
    ],
    marketData: {
      provider: "Alpha Vantage",
      supportedAssets: ["Stocks", "ETFs", "Indices"],
      updateFrequency: "Real-time (with rate limits)",
      cacheTTL: process.env.MARKET_DATA_CACHE_TTL || "5 minutes",
    },
  });
});

// API Routes
app.use("/api/v1/portfolios", portfolioRoutes);
app.use("/api/v1/portfolios", holdingRoutes); // Holdings are nested under portfolios
app.use("/api/v1", transactionRoutes); // Transaction routes
app.use("/api/v1/positions", positionRoutes);
app.use("/api/v1/trades", tradeRoutes);
app.use("/api/v1/stocks", stockRoutes);
app.use("/api/v1/performance", performanceRoutes);
app.use("/api/v1/export", exportRoutes);

// Request abort handling middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Set longer timeout for POST requests
  if (req.method === 'POST' || req.method === 'PUT') {
    req.setTimeout(60000); // 60 seconds
  }
  
  // Handle aborted requests gracefully
  req.on('aborted', () => {
    logger.warn('Request aborted:', {
      method: req.method,
      path: req.path,
      correlationId: req.headers['x-correlation-id'],
      userAgent: req.headers['user-agent']
    });
  });
  
  next();
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Handle specific ECONNABORTED and request aborted errors
    if (err.code === 'ECONNABORTED' || err.type === 'request.aborted' || err.message?.includes('aborted')) {
      logger.warn('Request aborted error handled:', {
        error: err.message,
        code: err.code,
        type: err.type,
        method: req.method,
        path: req.path,
        correlationId: req.headers['x-correlation-id']
      });
      
      if (!res.headersSent) {
        return res.status(408).json({
          success: false,
          error: "Request timeout - please try again",
          service: SERVICE_NAME,
          timestamp: new Date().toISOString(),
          code: 'REQUEST_TIMEOUT'
        });
      }
      return;
    }
    
    logger.error("Portfolio service error:", {
      error: err.message,
      stack: err.stack,
      code: err.code,
      method: req.method,
      path: req.path,
      correlationId: req.headers['x-correlation-id']
    });
    
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal Server Error",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
      });
    }
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

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({
  server,
  path: "/ws",
});

// Initialize WebSocket handler
initializeWebSocket(wss);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} service running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`ℹ️  Service info: http://localhost:${PORT}/info`);
  logger.info(`🔌 WebSocket: ws://localhost:${PORT}/ws`);

  // Start background jobs if mock prices are enabled
  if (process.env.USE_MOCK_PRICES === "true") {
    logger.info("📊 Starting mock price update job...");
    startPriceUpdateJob();
    startPortfolioCalculationJob();
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);
  // await prisma.$disconnect(); // Not available in mock
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info(`${SERVICE_NAME} service shutting down gracefully`);
  // await prisma.$disconnect(); // Not available in mock
  server.close(() => {
    process.exit(0);
  });
});

export default app;
