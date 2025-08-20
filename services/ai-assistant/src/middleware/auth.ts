import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and adds user information to request
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization header is required",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token is required",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;

      req.userId = decoded.userId || decoded.id;
      req.userRole = decoded.role;

      logger.debug("User authenticated", {
        userId: req.userId,
        role: req.userRole,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (jwtError: any) {
      logger.warn("Invalid JWT token", {
        error: jwtError.message,
        token: token.substring(0, 10) + "...",
        path: req.path,
      });

      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  } catch (error: any) {
    logger.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }
};

/**
 * Optional authentication middleware - allows requests without tokens but adds user info if present
 */
export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.userId = decoded.userId || decoded.id;
    req.userRole = decoded.role;

    logger.debug("Optional auth - user authenticated", {
      userId: req.userId,
      role: req.userRole,
    });
  } catch (error) {
    logger.debug("Optional auth - invalid token, proceeding without user info");
  }

  next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: "User role not found in token",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn("Insufficient permissions", {
        userId: req.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    next();
  };
};

/**
 * Verify user owns resource middleware
 */
export const requireOwnership = (
  getUserIdFromRequest: (req: Request) => string,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestUserId = getUserIdFromRequest(req);
    const authenticatedUserId = req.userId;

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    if (requestUserId !== authenticatedUserId && req.userRole !== "ADMIN") {
      logger.warn("User attempting to access resource they do not own", {
        authenticatedUserId,
        requestUserId,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Access denied - resource ownership required",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }

    next();
  };
};

/**
 * API key authentication middleware (alternative to JWT)
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key is required",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  const validApiKey = process.env.API_KEY;
  if (!validApiKey) {
    logger.error("API_KEY environment variable is not set");
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  if (apiKey !== validApiKey) {
    logger.warn("Invalid API key attempt", {
      apiKey: apiKey.substring(0, 8) + "...",
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: "Invalid API key",
      timestamp: new Date().toISOString(),
      service: "ai-assistant",
    });
  }

  next();
};
