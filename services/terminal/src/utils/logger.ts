import winston from "winston";

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
      ({ timestamp, level, message, service = "terminal", ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          service,
          message,
          ...meta,
        });
      },
    ),
  ),
  defaultMeta: {
    service: "terminal",
    version: process.env.npm_package_version || "3.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(
          ({ timestamp, level, message, service = "terminal", ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : "";
            return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
          },
        ),
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/terminal-combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // File transport for errors only
    new winston.transports.File({
      filename: "logs/terminal-errors.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/terminal-exceptions.log",
      maxsize: 5242880,
      maxFiles: 3,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/terminal-rejections.log",
      maxsize: 5242880,
      maxFiles: 3,
    }),
  ],
});

// In non-production environments, log to console with colors
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

// Create logs directory if it doesn't exist
import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
