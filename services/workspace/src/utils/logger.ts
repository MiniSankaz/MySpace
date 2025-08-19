import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";
const serviceName = "workspace";

// Create logger configuration
const loggerConfig: winston.LoggerOptions = {
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
      ({ timestamp, level, message, service = serviceName, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          service,
          message,
          ...meta,
        };

        return JSON.stringify(logEntry);
      },
    ),
  ),
  defaultMeta: {
    service: serviceName,
  },
  transports: [],
};

// Console transport for development
if (process.env.NODE_ENV !== "production") {
  (loggerConfig.transports as winston.transport[]).push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: "HH:mm:ss",
        }),
        winston.format.printf(
          ({ timestamp, level, message, service, ...meta }) => {
            const metaStr =
              Object.keys(meta).length > 0
                ? `\n${JSON.stringify(meta, null, 2)}`
                : "";
            return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
          },
        ),
      ),
    }),
  );
}

// File transports for production
(loggerConfig.transports as winston.transport[]).push(
  // Combined logs
  new winston.transports.File({
    filename: path.join(logsDir, `${serviceName}-combined.log`),
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true,
  }),

  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, `${serviceName}-errors.log`),
    level: "error",
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true,
  }),
);

// Create logger instance
export const logger = winston.createLogger(loggerConfig);

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, `${serviceName}-exceptions.log`),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3,
    tailable: true,
  }),
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, `${serviceName}-rejections.log`),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3,
    tailable: true,
  }),
);

// Helper functions
export const createTimer = (label: string) => {
  const startTime = Date.now();

  return {
    end: () => {
      const duration = Date.now() - startTime;
      logger.debug(`Timer: ${label}`, { duration: `${duration}ms` });
      return duration;
    },
  };
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    error: error.name,
    stack: error.stack,
    context,
  });
};

export default logger;
