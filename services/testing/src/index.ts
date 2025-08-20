import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthController } from './controllers/health.controller';
import { testController } from './controllers/test.controller';
import { validationController } from './controllers/validation.controller';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4180;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  next();
});

// Routes
app.use('/health', healthController);
app.use('/api/v1/test', testController);
app.use('/api/v1/validate', validationController);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🧪 Testing Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API endpoints: http://localhost:${PORT}/api/v1/test/*`);
  logger.info(`Validation: http://localhost:${PORT}/api/v1/validate`);
});