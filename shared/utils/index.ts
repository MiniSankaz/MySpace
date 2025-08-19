// Shared utilities for Stock Portfolio v3.0 Microservices

export {
  logger,
  createChildLogger,
  logRequest,
  logError,
  type LogContext,
} from "./logger";

// Common utility functions
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const generateCorrelationId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 1000,
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeString = (str: string): string => {
  return str.replace(/[<>\"']/g, "");
};

export const formatCurrency = (
  amount: number,
  currency: string = "USD",
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const parseEnvInt = (
  value: string | undefined,
  defaultValue: number,
): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const parseEnvBool = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
};

export const maskSensitiveData = (
  data: any,
  keys: string[] = ["password", "token", "secret", "key"],
): any => {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const masked = { ...data };

  for (const key in masked) {
    if (keys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))) {
      masked[key] = "***MASKED***";
    } else if (typeof masked[key] === "object") {
      masked[key] = maskSensitiveData(masked[key], keys);
    }
  }

  return masked;
};

export const calculatePercentageChange = (
  current: number,
  previous: number,
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const roundToDecimals = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day > 0 && day < 6; // Monday (1) to Friday (5)
};

export const getBusinessDaysUntil = (
  endDate: Date,
  startDate: Date = new Date(),
): number => {
  let count = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// Error handling utilities
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: any,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const createError = (
  code: string,
  message: string,
  statusCode: number = 500,
  context?: any,
): ServiceError => {
  return new ServiceError(code, message, statusCode, context);
};

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Response utilities
export const createSuccessResponse = <T>(data: T, message?: string) => ({
  success: true,
  data,
  message,
  timestamp: getCurrentTimestamp(),
});

export const createErrorResponse = (
  error: string | Error,
  code?: string,
  statusCode?: number,
) => ({
  success: false,
  error: typeof error === "string" ? error : error.message,
  code,
  statusCode,
  timestamp: getCurrentTimestamp(),
});

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrevious: page > 1,
  },
});

// Environment utilities
export const getEnvironment = (): "development" | "staging" | "production" => {
  const env = process.env.NODE_ENV || "development";
  if (["development", "staging", "production"].includes(env)) {
    return env as "development" | "staging" | "production";
  }
  return "development";
};

export const isDevelopment = (): boolean => getEnvironment() === "development";
export const isProduction = (): boolean => getEnvironment() === "production";
export const isStaging = (): boolean => getEnvironment() === "staging";

// Export all utilities
export * from "./logger";
