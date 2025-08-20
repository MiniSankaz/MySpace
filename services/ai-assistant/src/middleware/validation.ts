import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { logger } from "../utils/logger";
import { ApprovalType } from "../services/ai-orchestration/approval-gates.service";

/**
 * Validation middleware factory using Zod schemas
 */
export const validateRequest = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationData = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      schema.parse(validationData);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
          received: (err as any).received || "unknown",
        }));

        logger.warn("Request validation failed", {
          endpoint: `${req.method} ${req.path}`,
          errors: errorDetails,
          body: req.body,
          query: req.query,
          params: req.params,
        });

        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errorDetails,
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      logger.error("Validation middleware error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal validation error",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };
};

/**
 * Validate specific field types
 */
export const validateUUID = (
  value: string,
  fieldName: string = "id",
): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Custom validation middleware for specific use cases
 */
export const validateChatMessage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      error: "Message is required and must be a string",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Check message length
  if (message.length > 50000) {
    return res.status(400).json({
      success: false,
      error: "Message exceeds maximum length of 50,000 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Check for potentially harmful content (basic check)
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
  ];

  const containsSuspiciousContent = suspiciousPatterns.some((pattern) =>
    pattern.test(message),
  );

  if (containsSuspiciousContent) {
    logger.warn("Suspicious content detected in message", {
      userId: (req as any).userId,
      messageLength: message.length,
      endpoint: req.path,
    });

    return res.status(400).json({
      success: false,
      error: "Message contains potentially harmful content",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: "Page must be a positive integer",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
    if (pageNum > 1000) {
      return res.status(400).json({
        success: false,
        error: "Page number cannot exceed 1000",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: "Limit must be a positive integer",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
    if (limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: "Limit cannot exceed 100",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  }

  next();
};

/**
 * Validate session ownership
 */
export const validateSessionOwnership = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req.body || req.query;
  const authenticatedUserId = (req as any).userId;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "userId is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!validateUUID(userId, "userId")) {
    return res.status(400).json({
      success: false,
      error: "Invalid userId format",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Check if user is trying to access their own data or is an admin
  if (userId !== authenticatedUserId && (req as any).userRole !== "ADMIN") {
    logger.warn("User attempting to access another user's sessions", {
      authenticatedUserId,
      requestedUserId: userId,
      endpoint: req.path,
    });

    return res.status(403).json({
      success: false,
      error: "Access denied - cannot access another user's sessions",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};

/**
 * Rate limiting validation based on message content
 */
export const validateMessageRate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { message } = req.body;
  const userId = (req as any).userId;

  // Simple rate limiting based on message length and complexity
  if (message && message.length > 5000) {
    // For very long messages, add a small delay
    setTimeout(() => next(), 500);
  } else {
    next();
  }
};

/**
 * Schema definitions for common validations
 */
export const commonSchemas = {
  uuid: z.string().uuid("Invalid UUID format"),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  description: z.string().max(500, "Description too long").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid color format (use #RRGGBB)")
    .optional(),
  pagination: {
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().min(1).max(1000))
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().min(1).max(100))
      .optional(),
  },
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(50000, "Message too long"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .trim(),
};

// ===========================
// Approval Gates Validations
// ===========================

/**
 * Validate approval request submission
 */
export const validateApprovalRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { type, operation, title, description, approvers, timeoutMinutes } = req.body;

  // Validate required fields
  if (!type) {
    return res.status(400).json({
      success: false,
      error: "Approval type is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!Object.values(ApprovalType).includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid approval type: ${type}`,
      validTypes: Object.values(ApprovalType),
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!operation || typeof operation !== "object") {
    return res.status(400).json({
      success: false,
      error: "Operation object is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate operation fields
  const { action, resource, riskLevel, impact, reversible } = operation;
  
  if (!action || typeof action !== "string") {
    return res.status(400).json({
      success: false,
      error: "Operation action is required and must be a string",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!resource || typeof resource !== "string") {
    return res.status(400).json({
      success: false,
      error: "Operation resource is required and must be a string",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!riskLevel || !["low", "medium", "high", "critical"].includes(riskLevel)) {
    return res.status(400).json({
      success: false,
      error: "Operation riskLevel must be one of: low, medium, high, critical",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate optional fields
  if (title && (typeof title !== "string" || title.length > 200)) {
    return res.status(400).json({
      success: false,
      error: "Title must be a string with maximum 200 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (description && (typeof description !== "string" || description.length > 2000)) {
    return res.status(400).json({
      success: false,
      error: "Description must be a string with maximum 2000 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (approvers && !Array.isArray(approvers)) {
    return res.status(400).json({
      success: false,
      error: "Approvers must be an array of user IDs",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (approvers && approvers.some((id: any) => typeof id !== "string" || !validateUUID(id))) {
    return res.status(400).json({
      success: false,
      error: "All approver IDs must be valid UUIDs",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (timeoutMinutes && (typeof timeoutMinutes !== "number" || timeoutMinutes < 1 || timeoutMinutes > 10080)) {
    return res.status(400).json({
      success: false,
      error: "Timeout must be a number between 1 and 10080 minutes (1 week)",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};

/**
 * Validate approval decision
 */
export const validateDecision = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { decision, reason, metadata } = req.body;
  const { requestId } = req.params;

  // Validate request ID
  if (!requestId || !validateUUID(requestId)) {
    return res.status(400).json({
      success: false,
      error: "Valid request ID is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate decision
  if (!decision || !["approve", "reject"].includes(decision)) {
    return res.status(400).json({
      success: false,
      error: "Decision must be 'approve' or 'reject'",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate reason (optional but recommended for rejections)
  if (reason && (typeof reason !== "string" || reason.length > 1000)) {
    return res.status(400).json({
      success: false,
      error: "Reason must be a string with maximum 1000 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate metadata (optional)
  if (metadata && typeof metadata !== "object") {
    return res.status(400).json({
      success: false,
      error: "Metadata must be an object",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};

/**
 * Validate emergency bypass request
 */
export const validateBypass = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { reason, emergencyContext } = req.body;
  const { requestId } = req.params;

  // Validate request ID
  if (!requestId || !validateUUID(requestId)) {
    return res.status(400).json({
      success: false,
      error: "Valid request ID is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate reason (required for bypass)
  if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: "Bypass reason is required and must be at least 10 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (reason.length > 2000) {
    return res.status(400).json({
      success: false,
      error: "Bypass reason cannot exceed 2000 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate emergency context (optional)
  if (emergencyContext && typeof emergencyContext !== "object") {
    return res.status(400).json({
      success: false,
      error: "Emergency context must be an object",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Log bypass attempt for security monitoring
  logger.warn("Emergency bypass requested", {
    requestId,
    userId: (req as any).userId,
    reason: reason.substring(0, 100), // Log first 100 chars
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString()
  });

  next();
};

/**
 * Validate approval policy creation/update
 */
export const validateApprovalPolicy = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, description, conditions, requirements, notifications, emergency } = req.body;

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length < 3 || name.length > 100) {
    return res.status(400).json({
      success: false,
      error: "Policy name is required and must be 3-100 characters",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate conditions
  if (!conditions || typeof conditions !== "object") {
    return res.status(400).json({
      success: false,
      error: "Policy conditions are required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  // Validate requirements
  if (!requirements || typeof requirements !== "object") {
    return res.status(400).json({
      success: false,
      error: "Policy requirements are required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  const { level, approverCount, timeoutMinutes } = requirements;
  
  if (!level || !["user", "admin", "security", "emergency", "system"].includes(level)) {
    return res.status(400).json({
      success: false,
      error: "Valid approval level is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!approverCount || typeof approverCount !== "number" || approverCount < 1 || approverCount > 10) {
    return res.status(400).json({
      success: false,
      error: "Approver count must be between 1 and 10",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (!timeoutMinutes || typeof timeoutMinutes !== "number" || timeoutMinutes < 1 || timeoutMinutes > 10080) {
    return res.status(400).json({
      success: false,
      error: "Timeout must be between 1 and 10080 minutes",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};
