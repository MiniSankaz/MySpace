"use strict";
// Shared utilities for Stock Portfolio v3.0 Microservices
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStaging =
  exports.isProduction =
  exports.isDevelopment =
  exports.getEnvironment =
  exports.createPaginatedResponse =
  exports.createErrorResponse =
  exports.createSuccessResponse =
  exports.asyncHandler =
  exports.createError =
  exports.ServiceError =
  exports.getBusinessDaysUntil =
  exports.isBusinessDay =
  exports.addDays =
  exports.getCurrentTimestamp =
  exports.isValidUUID =
  exports.roundToDecimals =
  exports.calculatePercentageChange =
  exports.maskSensitiveData =
  exports.parseEnvBool =
  exports.parseEnvInt =
  exports.formatPercentage =
  exports.formatCurrency =
  exports.sanitizeString =
  exports.validateEmail =
  exports.retry =
  exports.delay =
  exports.generateCorrelationId =
  exports.generateId =
  exports.logError =
  exports.logRequest =
  exports.createChildLogger =
  exports.logger =
    void 0;
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", {
  enumerable: true,
  get: function () {
    return logger_1.logger;
  },
});
Object.defineProperty(exports, "createChildLogger", {
  enumerable: true,
  get: function () {
    return logger_1.createChildLogger;
  },
});
Object.defineProperty(exports, "logRequest", {
  enumerable: true,
  get: function () {
    return logger_1.logRequest;
  },
});
Object.defineProperty(exports, "logError", {
  enumerable: true,
  get: function () {
    return logger_1.logError;
  },
});
// Common utility functions
const generateId = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};
exports.generateId = generateId;
const generateCorrelationId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateCorrelationId = generateCorrelationId;
const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.delay = delay;
const retry = async (fn, attempts = 3, delayMs = 1000) => {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await (0, exports.delay)(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  throw lastError;
};
exports.retry = retry;
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const sanitizeString = (str) => {
  return str.replace(/[<>\"']/g, "");
};
exports.sanitizeString = sanitizeString;
const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};
exports.formatCurrency = formatCurrency;
const formatPercentage = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};
exports.formatPercentage = formatPercentage;
const parseEnvInt = (value, defaultValue) => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
exports.parseEnvInt = parseEnvInt;
const parseEnvBool = (value, defaultValue) => {
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
};
exports.parseEnvBool = parseEnvBool;
const maskSensitiveData = (
  data,
  keys = ["password", "token", "secret", "key"],
) => {
  if (typeof data !== "object" || data === null) {
    return data;
  }
  const masked = { ...data };
  for (const key in masked) {
    if (keys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))) {
      masked[key] = "***MASKED***";
    } else if (typeof masked[key] === "object") {
      masked[key] = (0, exports.maskSensitiveData)(masked[key], keys);
    }
  }
  return masked;
};
exports.maskSensitiveData = maskSensitiveData;
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};
exports.calculatePercentageChange = calculatePercentageChange;
const roundToDecimals = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
exports.roundToDecimals = roundToDecimals;
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
exports.isValidUUID = isValidUUID;
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};
exports.getCurrentTimestamp = getCurrentTimestamp;
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
exports.addDays = addDays;
const isBusinessDay = (date) => {
  const day = date.getDay();
  return day > 0 && day < 6; // Monday (1) to Friday (5)
};
exports.isBusinessDay = isBusinessDay;
const getBusinessDaysUntil = (endDate, startDate = new Date()) => {
  let count = 0;
  const current = new Date(startDate);
  while (current < endDate) {
    if ((0, exports.isBusinessDay)(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};
exports.getBusinessDaysUntil = getBusinessDaysUntil;
// Error handling utilities
class ServiceError extends Error {
  code;
  statusCode;
  context;
  constructor(code, message, statusCode = 500, context) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.name = "ServiceError";
  }
}
exports.ServiceError = ServiceError;
const createError = (code, message, statusCode = 500, context) => {
  return new ServiceError(code, message, statusCode, context);
};
exports.createError = createError;
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
exports.asyncHandler = asyncHandler;
// Response utilities
const createSuccessResponse = (data, message) => ({
  success: true,
  data,
  message,
  timestamp: (0, exports.getCurrentTimestamp)(),
});
exports.createSuccessResponse = createSuccessResponse;
const createErrorResponse = (error, code, statusCode) => ({
  success: false,
  error: typeof error === "string" ? error : error.message,
  code,
  statusCode,
  timestamp: (0, exports.getCurrentTimestamp)(),
});
exports.createErrorResponse = createErrorResponse;
const createPaginatedResponse = (data, page, limit, total) => ({
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
exports.createPaginatedResponse = createPaginatedResponse;
// Environment utilities
const getEnvironment = () => {
  const env = process.env.NODE_ENV || "development";
  if (["development", "staging", "production"].includes(env)) {
    return env;
  }
  return "development";
};
exports.getEnvironment = getEnvironment;
const isDevelopment = () => (0, exports.getEnvironment)() === "development";
exports.isDevelopment = isDevelopment;
const isProduction = () => (0, exports.getEnvironment)() === "production";
exports.isProduction = isProduction;
const isStaging = () => (0, exports.getEnvironment)() === "staging";
exports.isStaging = isStaging;
// Export all utilities
__exportStar(require("./logger"), exports);
//# sourceMappingURL=index.js.map
