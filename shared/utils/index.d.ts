export {
  logger,
  createChildLogger,
  logRequest,
  logError,
  type LogContext,
} from "./logger";
export declare const generateId: () => string;
export declare const generateCorrelationId: () => string;
export declare const delay: (ms: number) => Promise<void>;
export declare const retry: <T>(
  fn: () => Promise<T>,
  attempts?: number,
  delayMs?: number,
) => Promise<T>;
export declare const validateEmail: (email: string) => boolean;
export declare const sanitizeString: (str: string) => string;
export declare const formatCurrency: (
  amount: number,
  currency?: string,
) => string;
export declare const formatPercentage: (value: number) => string;
export declare const parseEnvInt: (
  value: string | undefined,
  defaultValue: number,
) => number;
export declare const parseEnvBool: (
  value: string | undefined,
  defaultValue: boolean,
) => boolean;
export declare const maskSensitiveData: (data: any, keys?: string[]) => any;
export declare const calculatePercentageChange: (
  current: number,
  previous: number,
) => number;
export declare const roundToDecimals: (
  num: number,
  decimals?: number,
) => number;
export declare const isValidUUID: (uuid: string) => boolean;
export declare const getCurrentTimestamp: () => string;
export declare const addDays: (date: Date, days: number) => Date;
export declare const isBusinessDay: (date: Date) => boolean;
export declare const getBusinessDaysUntil: (
  endDate: Date,
  startDate?: Date,
) => number;
export declare class ServiceError extends Error {
  code: string;
  statusCode: number;
  context?: any | undefined;
  constructor(
    code: string,
    message: string,
    statusCode?: number,
    context?: any | undefined,
  );
}
export declare const createError: (
  code: string,
  message: string,
  statusCode?: number,
  context?: any,
) => ServiceError;
export declare const asyncHandler: (
  fn: Function,
) => (req: any, res: any, next: any) => void;
export declare const createSuccessResponse: <T>(
  data: T,
  message?: string,
) => {
  success: boolean;
  data: T;
  message: string | undefined;
  timestamp: string;
};
export declare const createErrorResponse: (
  error: string | Error,
  code?: string,
  statusCode?: number,
) => {
  success: boolean;
  error: string;
  code: string | undefined;
  statusCode: number | undefined;
  timestamp: string;
};
export declare const createPaginatedResponse: <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) => {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
export declare const getEnvironment: () =>
  | "development"
  | "staging"
  | "production";
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isStaging: () => boolean;
export * from "./logger";
//# sourceMappingURL=index.d.ts.map
