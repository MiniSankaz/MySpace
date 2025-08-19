import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'market-data-service' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'market-data-combined.log'),
      level: 'info'
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'market-data-errors.log'),
      level: 'error'
    })
  ]
});

// If not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Log unhandled exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'market-data-exceptions.log')
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'market-data-rejections.log')
  })
);

export default logger;