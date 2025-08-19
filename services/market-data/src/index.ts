import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

import logger from './utils/logger';
import marketRoutes from './routes/market.routes';
import { errorHandler } from './middleware/error.middleware';
import { pricePollingService } from './services/price-polling.service';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 4170;

// Global middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:4100',  // Frontend (from ports.config.ts)
    'http://localhost:4110',  // API Gateway (from ports.config.ts)
    process.env.FRONTEND_URL || '',
    'http://localhost:3000'   // Fallback for development
  ].filter(Boolean),
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint (no prefix)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'market-data',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API routes
app.use('/api/v1/market', marketRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString()
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  pricePollingService.stopPolling();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  pricePollingService.stopPolling();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Market Data Service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Polygon API configured: ${process.env.POLYGON_API_KEY ? 'Yes' : 'No'}`);
  logger.info(`Redis configured: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  logger.info(`Database configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
  
  // Start price polling service
  await pricePollingService.startPolling();
  logger.info('📊 Price Polling Service started - fetching prices every 1 minute');
});

export default app;