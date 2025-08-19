import winston from "winston";
interface LogContext {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}
declare class EnhancedLogger {
  baseLogger: winston.Logger;
  constructor(baseLogger: winston.Logger);
  private log;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | any, context?: LogContext): void;
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
  ): void;
  performance(operation: string, startTime: number, context?: LogContext): void;
  audit(
    action: string,
    context: LogContext & {
      userId: string;
      resource?: string;
      outcome: "success" | "failure";
      metadata?: any;
    },
  ): void;
  security(
    event: string,
    context: LogContext & {
      severity: "low" | "medium" | "high" | "critical";
      source?: string;
      details?: any;
    },
  ): void;
  metrics(
    metric: string,
    value: number,
    context?: LogContext & {
      unit?: string;
      tags?: Record<string, string>;
    },
  ): void;
}
declare const enhancedLogger: EnhancedLogger;
export declare const createChildLogger: (
  service: string,
  context?: LogContext,
) => {
  debug: (message: string, additionalContext?: LogContext) => void;
  info: (message: string, additionalContext?: LogContext) => void;
  warn: (message: string, additionalContext?: LogContext) => void;
  error: (
    message: string,
    error?: Error,
    additionalContext?: LogContext,
  ) => void;
  http: (message: string, additionalContext?: LogContext) => void;
};
export declare const logRequest: (req: any, res: any, next: any) => void;
export declare const logError: (
  err: any,
  req: any,
  res: any,
  next: any,
) => void;
export { enhancedLogger as logger };
export type { LogContext };
export declare const winstonLogger: winston.Logger;
export declare const LOG_LEVELS: {
  error: number;
  warn: number;
  info: number;
  http: number;
  debug: number;
};
export default enhancedLogger;
//# sourceMappingURL=logger.d.ts.map
