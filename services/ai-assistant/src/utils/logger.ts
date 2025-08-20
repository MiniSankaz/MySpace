import * as winston from "winston";
import * as path from "path";
import * as fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";
const serviceName = "ai-assistant";

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
  const consoleTransport = new winston.transports.Console({
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
  });
  loggerConfig.transports = loggerConfig.transports || [];
  (loggerConfig.transports as winston.transport[]).push(consoleTransport);
}

// File transports for production
const combinedTransport = new winston.transports.File({
  filename: path.join(logsDir, `${serviceName}-combined.log`),
  maxsize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  tailable: true,
});

const errorTransport = new winston.transports.File({
  filename: path.join(logsDir, `${serviceName}-errors.log`),
  level: "error",
  maxsize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  tailable: true,
});

loggerConfig.transports = loggerConfig.transports || [];
(loggerConfig.transports as winston.transport[]).push(
  combinedTransport,
  errorTransport,
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

// Add request ID context when available
export const addRequestContext = (requestId: string) => {
  return logger.child({ requestId });
};

// Helper functions for common logging patterns
export const logRequest = (
  method: string,
  url: string,
  statusCode?: number,
  responseTime?: number,
) => {
  logger.info("Request processed", {
    method,
    url,
    statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    error: error.name,
    stack: error.stack,
    context,
  });
};

export const logClaudeApiCall = (
  model: string,
  inputTokens: number,
  outputTokens: number,
  responseTime: number,
) => {
  logger.info("Claude API call completed", {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    responseTime: `${responseTime}ms`,
  });
};

export const logWebSocketEvent = (
  event: string,
  clientId: string,
  data?: any,
) => {
  logger.debug("WebSocket event", {
    event,
    clientId,
    data: data
      ? typeof data === "object"
        ? JSON.stringify(data)
        : data
      : undefined,
  });
};

// Performance monitoring
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

// Structured logging helpers
export const logWithContext = (
  level: string,
  message: string,
  context: any,
) => {
  (logger as any)[level](message, context);
};

export default logger;
