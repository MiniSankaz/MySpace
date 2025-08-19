"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_LEVELS =
  exports.winstonLogger =
  exports.logger =
  exports.logError =
  exports.logRequest =
  exports.createChildLogger =
    void 0;
const winston_1 = __importDefault(require("winston"));
const winston_2 = require("winston");
const path_1 = __importDefault(require("path"));
// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};
const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};
winston_1.default.addColors(logColors);
// Environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");
const SERVICE_NAME = process.env.SERVICE_NAME || "unknown-service";
// Custom format for structured logging
const structuredFormat = winston_2.format.combine(
  winston_2.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston_2.format.errors({ stack: true }),
  winston_2.format.json(),
  winston_2.format.printf((info) => {
    const { timestamp, level, message, service = SERVICE_NAME, ...meta } = info;
    const logEntry = {
      timestamp,
      level,
      service,
      message,
      ...(Object.keys(meta).length > 0 && { meta }),
    };
    // Add correlation ID if available
    if (process.env.CORRELATION_ID) {
      logEntry.correlationId = process.env.CORRELATION_ID;
    }
    return JSON.stringify(logEntry);
  }),
);
// Console format for development
const consoleFormat = winston_2.format.combine(
  winston_2.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston_2.format.errors({ stack: true }),
  winston_2.format.colorize({ all: true }),
  winston_2.format.printf((info) => {
    const { timestamp, level, message, service = SERVICE_NAME, ...meta } = info;
    let logLine = `${timestamp} [${service}] ${level}: ${message}`;
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    return logLine;
  }),
);
// Create transports based on environment
const transports = [];
// Console transport (always present)
transports.push(
  new winston_1.default.transports.Console({
    level: LOG_LEVEL,
    format: NODE_ENV === "production" ? structuredFormat : consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
);
// File transports for production
if (NODE_ENV === "production" || process.env.ENABLE_FILE_LOGGING === "true") {
  const logDir =
    process.env.LOG_DIR || path_1.default.join(process.cwd(), "logs");
  // Combined log file
  transports.push(
    new winston_1.default.transports.File({
      filename: path_1.default.join(logDir, `${SERVICE_NAME}-combined.log`),
      level: LOG_LEVEL,
      format: structuredFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );
  // Error log file
  transports.push(
    new winston_1.default.transports.File({
      filename: path_1.default.join(logDir, `${SERVICE_NAME}-error.log`),
      level: "error",
      format: structuredFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );
}
// Create logger instance
const logger = winston_1.default.createLogger({
  levels: logLevels,
  level: LOG_LEVEL,
  format: structuredFormat,
  transports,
  exitOnError: false,
});
class EnhancedLogger {
  baseLogger;
  constructor(baseLogger) {
    this.baseLogger = baseLogger;
  }
  log(level, message, context) {
    this.baseLogger.log(level, message, context);
  }
  debug(message, context) {
    this.log("debug", message, context);
  }
  info(message, context) {
    this.log("info", message, context);
  }
  warn(message, context) {
    this.log("warn", message, context);
  }
  error(message, error, context) {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...(error.code && { code: error.code }),
        },
      }),
    };
    this.log("error", message, errorContext);
  }
  http(message, context) {
    this.log("http", message, context);
  }
  // Performance logging
  performance(operation, startTime, context) {
    const duration = Date.now() - startTime;
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
  // Audit logging
  audit(action, context) {
    this.info(`Audit: ${action}`, {
      ...context,
      auditLog: true,
      timestamp: new Date().toISOString(),
    });
  }
  // Security logging
  security(event, context) {
    this.warn(`Security: ${event}`, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
  }
  // Business metrics logging
  metrics(metric, value, context) {
    this.info(`Metric: ${metric}=${value}`, {
      ...context,
      metricLog: true,
      metric,
      value,
      timestamp: new Date().toISOString(),
    });
  }
}
// Create enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger);
exports.logger = enhancedLogger;
// Utility functions
const createChildLogger = (service, context = {}) => {
  return {
    debug: (message, additionalContext) =>
      enhancedLogger.debug(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    info: (message, additionalContext) =>
      enhancedLogger.info(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    warn: (message, additionalContext) =>
      enhancedLogger.warn(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    error: (message, error, additionalContext) =>
      enhancedLogger.error(message, error, {
        ...context,
        service,
        ...additionalContext,
      }),
    http: (message, additionalContext) =>
      enhancedLogger.http(message, {
        ...context,
        service,
        ...additionalContext,
      }),
  };
};
exports.createChildLogger = createChildLogger;
const logRequest = (req, res, next) => {
  const start = Date.now();
  const correlationId =
    req.headers["x-correlation-id"] || req.id || Math.random().toString(36);
  req.correlationId = correlationId;
  enhancedLogger.http("Request started", {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: req.user?.id,
  });
  res.on("finish", () => {
    enhancedLogger.http("Request completed", {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - start,
      userId: req.user?.id,
    });
  });
  next();
};
exports.logRequest = logRequest;
const logError = (err, req, res, next) => {
  enhancedLogger.error("Request error", err, {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    statusCode: res.statusCode || 500,
  });
  next(err);
};
exports.logError = logError;
// For backward compatibility, also export Winston logger
exports.winstonLogger = enhancedLogger.baseLogger;
// Export logger levels for external use
exports.LOG_LEVELS = logLevels;
exports.default = enhancedLogger;
//# sourceMappingURL=logger.js.map
