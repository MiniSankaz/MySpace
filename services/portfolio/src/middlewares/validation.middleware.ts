import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

/**
 * Validation error handler
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array()
    });
  }
  
  next();
};

/**
 * Transaction validation rules
 */
export const validateCreateTransaction = [
  body("type")
    .isIn(["BUY", "SELL", "DIVIDEND", "SPLIT", "TRANSFER_IN", "TRANSFER_OUT"])
    .withMessage("Invalid transaction type"),
  body("symbol")
    .notEmpty()
    .isString()
    .isLength({ min: 1, max: 10 })
    .toUpperCase()
    .withMessage("Symbol is required and must be 1-10 characters"),
  body("quantity")
    .isFloat({ min: 0.001 })
    .withMessage("Quantity must be a positive number"),
  body("price")
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),
  body("fees")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Fees must be a non-negative number"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage("Notes must be less than 500 characters"),
  body("executedAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  handleValidationErrors
];

export const validateUpdateTransaction = [
  param("transactionId")
    .isUUID()
    .withMessage("Invalid transaction ID"),
  body("type")
    .optional()
    .isIn(["BUY", "SELL", "DIVIDEND", "SPLIT", "TRANSFER_IN", "TRANSFER_OUT"])
    .withMessage("Invalid transaction type"),
  body("symbol")
    .optional()
    .isString()
    .isLength({ min: 1, max: 10 })
    .toUpperCase()
    .withMessage("Symbol must be 1-10 characters"),
  body("quantity")
    .optional()
    .isFloat({ min: 0.001 })
    .withMessage("Quantity must be a positive number"),
  body("price")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),
  body("fees")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Fees must be a non-negative number"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage("Notes must be less than 500 characters"),
  body("executedAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  handleValidationErrors
];

/**
 * Portfolio validation rules
 */
export const validateCreatePortfolio = [
  body("name")
    .notEmpty()
    .isString()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage("Name is required and must be 1-100 characters"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage("Description must be less than 500 characters"),
  body("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB"])
    .withMessage("Invalid currency code"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  handleValidationErrors
];

export const validateUpdatePortfolio = [
  param("portfolioId")
    .isUUID()
    .withMessage("Invalid portfolio ID"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage("Name must be 1-100 characters"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage("Description must be less than 500 characters"),
  body("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB"])
    .withMessage("Invalid currency code"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  handleValidationErrors
];

/**
 * Query validation rules
 */
export const validateGetTransactions = [
  param("portfolioId")
    .isUUID()
    .withMessage("Invalid portfolio ID"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
  query("symbol")
    .optional()
    .isString()
    .isLength({ min: 1, max: 10 })
    .toUpperCase()
    .withMessage("Symbol must be 1-10 characters"),
  query("type")
    .optional()
    .isIn(["BUY", "SELL", "DIVIDEND", "SPLIT", "TRANSFER_IN", "TRANSFER_OUT"])
    .withMessage("Invalid transaction type"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),
  handleValidationErrors
];

/**
 * ID validation rules
 */
export const validatePortfolioId = [
  param("portfolioId")
    .isUUID()
    .withMessage("Invalid portfolio ID"),
  handleValidationErrors
];

export const validateTransactionId = [
  param("portfolioId")
    .isUUID()
    .withMessage("Invalid portfolio ID"),
  param("transactionId")
    .isUUID()
    .withMessage("Invalid transaction ID"),
  handleValidationErrors
];

/**
 * Sanitize input - remove dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  // Remove SQL injection attempts
  let sanitized = input.replace(/['";\\]/g, "");
  
  // Remove script tags and HTML
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/<[^>]+>/g, "");
  
  // Remove special characters that could be used for NoSQL injection
  sanitized = sanitized.replace(/[${}]/g, "");
  
  return sanitized.trim();
};

/**
 * Validate and sanitize stock symbol
 */
export const validateStockSymbol = (symbol: string): string => {
  // Convert to uppercase
  let validated = symbol.toUpperCase();
  
  // Remove non-alphanumeric characters
  validated = validated.replace(/[^A-Z0-9]/g, "");
  
  // Limit length
  validated = validated.substring(0, 10);
  
  return validated;
};