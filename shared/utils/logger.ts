import * as winston from "winston";
import { format } from "winston";
import * as path from "path";

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

winston.addColors(logColors);

// Environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");
const SERVICE_NAME = process.env.SERVICE_NAME || "unknown-service";

// Custom format for structured logging
const structuredFormat = format.combine(
  format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  format.errors({ stack: true }),
  format.json(),
  format.printf((info: any) => {
    const { timestamp, level, message, service = SERVICE_NAME, ...meta } = info;

    const logEntry: any = {
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
const consoleFormat = format.combine(
  format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf((info: any) => {
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
const transports: winston.transport[] = [];

// Console transport (always present)
transports.push(
  new winston.transports.Console({
    level: LOG_LEVEL,
    format: NODE_ENV === "production" ? structuredFormat : consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
);

// File transports for production
if (NODE_ENV === "production" || process.env.ENABLE_FILE_LOGGING === "true") {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, `${SERVICE_NAME}-combined.log`),
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
    new winston.transports.File({
      filename: path.join(logDir, `${SERVICE_NAME}-error.log`),
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
const logger = winston.createLogger({
  levels: logLevels,
  level: LOG_LEVEL,
  format: structuredFormat,
  transports,
  exitOnError: false,
});

// Enhanced logging methods with context
interface LogContext {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

class EnhancedLogger {
  public baseLogger: winston.Logger;

  constructor(baseLogger: winston.Logger) {
    this.baseLogger = baseLogger;
  }

  private log(level: string, message: string, context?: LogContext) {
    this.baseLogger.log(level, message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
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

  http(
    message: string,
    context?: LogContext & {
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
      userAgent?: string;
      ip?: string;
    },
  ) {
    this.log("http", message, context);
  }

  // Performance logging
  performance(operation: string, startTime: number, context?: LogContext) {
    const duration = Date.now() - startTime;
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  // Audit logging
  audit(
    action: string,
    context: LogContext & {
      userId: string;
      resource?: string;
      outcome: "success" | "failure";
      metadata?: any;
    },
  ) {
    this.info(`Audit: ${action}`, {
      ...context,
      auditLog: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Security logging
  security(
    event: string,
    context: LogContext & {
      severity: "low" | "medium" | "high" | "critical";
      source?: string;
      details?: any;
    },
  ) {
    this.warn(`Security: ${event}`, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Business metrics logging
  metrics(
    metric: string,
    value: number,
    context?: LogContext & {
      unit?: string;
      tags?: Record<string, string>;
    },
  ) {
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

// Utility functions
export const createChildLogger = (
  service: string,
  context: LogContext = {},
) => {
  return {
    debug: (message: string, additionalContext?: LogContext) =>
      enhancedLogger.debug(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    info: (message: string, additionalContext?: LogContext) =>
      enhancedLogger.info(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    warn: (message: string, additionalContext?: LogContext) =>
      enhancedLogger.warn(message, {
        ...context,
        service,
        ...additionalContext,
      }),
    error: (message: string, error?: Error, additionalContext?: LogContext) =>
      enhancedLogger.error(message, error, {
        ...context,
        service,
        ...additionalContext,
      }),
    http: (message: string, additionalContext?: LogContext) =>
      enhancedLogger.http(message, {
        ...context,
        service,
        ...additionalContext,
      }),
  };
};

export const logRequest = (req: any, res: any, next: any) => {
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

export const logError = (err: any, req: any, res: any, next: any) => {
  enhancedLogger.error("Request error", err, {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    statusCode: res.statusCode || 500,
  });

  next(err);
};

// Export the enhanced logger as default
export { enhancedLogger as logger };
export type { LogContext };

// For backward compatibility, also export Winston logger
export const winstonLogger = enhancedLogger.baseLogger;

// Export logger levels for external use
export const LOG_LEVELS = logLevels;

export default enhancedLogger;
