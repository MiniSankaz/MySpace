import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        roles?: string[];
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  username: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && req.headers['x-user-id']) {
      req.user = {
        id: req.headers['x-user-id'] as string,
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user']
      };
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided"
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Add user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      roles: decoded.roles
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: "Token expired"
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: "Invalid token"
      });
    }

    logger.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed"
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles
      };
    }

    next();
  } catch (error) {
    // Log error but continue without auth
    logger.warn("Optional auth failed:", error);
    next();
  }
};

/**
 * Role-based authorization
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions"
      });
    }

    next();
  };
};