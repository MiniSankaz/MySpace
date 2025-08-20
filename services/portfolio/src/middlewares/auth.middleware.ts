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
    // Development mode bypass - enhanced for testing
    if (process.env.NODE_ENV === 'development') {
      // Check for x-user-id header first (for testing)
      if (req.headers['x-user-id']) {
        req.user = {
          id: req.headers['x-user-id'] as string,
          email: req.headers['x-user-email'] as string || 'test@example.com',
          username: req.headers['x-user-username'] as string || 'testuser',
          roles: req.headers['x-user-roles'] 
            ? (req.headers['x-user-roles'] as string).split(',') 
            : ['user']
        };
        logger.debug('Auth bypassed in dev mode with x-user-id header');
        return next();
      }

      // Check for mock token for development
      if (req.headers.authorization === 'Bearer mock-token') {
        req.user = {
          id: 'test-user-123',
          email: 'test@example.com',
          username: 'testuser',
          roles: ['user']
        };
        logger.debug('Auth bypassed in dev mode with mock token');
        return next();
      }
    }

    // Get token from multiple sources
    let token: string | undefined;
    
    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    }
    
    // 2. Check cookies as fallback
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      token = cookies['auth_token'] || cookies['jwt'];
    }
    
    // 3. Check query parameter (for WebSocket connections)
    if (!token && req.query?.token) {
      token = req.query.token as string;
    }

    if (!token) {
      // In development, provide helpful error message
      if (process.env.NODE_ENV === 'development') {
        return res.status(401).json({
          success: false,
          error: "No authentication token provided",
          hint: "In development, you can use 'x-user-id' header or 'Authorization: Bearer mock-token'"
        });
      }
      
      return res.status(401).json({
        success: false,
        error: "No authentication token provided"
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      // Add user to request
      req.user = {
        id: decoded.id || decoded.sub || 'unknown',
        email: decoded.email || 'unknown@example.com',
        username: decoded.username || decoded.name || 'unknown',
        roles: decoded.roles || ['user']
      };
      
      logger.debug(`User authenticated: ${req.user.id}`);
      next();
    } catch (jwtError) {
      // In development, allow mock-user-* tokens
      if (process.env.NODE_ENV === 'development' && token.startsWith('mock-user-')) {
        const userId = token.replace('mock-user-', '');
        req.user = {
          id: userId,
          email: `${userId}@example.com`,
          username: userId,
          roles: ['user']
        };
        logger.debug(`Mock user authenticated: ${userId}`);
        return next();
      }
      
      throw jwtError;
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        code: "TOKEN_EXPIRED"
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }

    logger.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_ERROR"
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
    // In development, check for x-user-id header
    if (process.env.NODE_ENV === 'development' && req.headers['x-user-id']) {
      req.user = {
        id: req.headers['x-user-id'] as string,
        email: req.headers['x-user-email'] as string || 'test@example.com',
        username: req.headers['x-user-username'] as string || 'testuser',
        roles: req.headers['x-user-roles'] 
          ? (req.headers['x-user-roles'] as string).split(',') 
          : ['user']
      };
      return next();
    }
    
    // Try to get token from various sources
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    }
    
    // Check cookies
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      token = cookies['auth_token'] || cookies['jwt'];
    }

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        req.user = {
          id: decoded.id || decoded.sub || 'unknown',
          email: decoded.email || 'unknown@example.com',
          username: decoded.username || decoded.name || 'unknown',
          roles: decoded.roles || ['user']
        };
      } catch (jwtError) {
        // In development, allow mock tokens
        if (process.env.NODE_ENV === 'development' && token.startsWith('mock-')) {
          req.user = {
            id: 'test-user',
            email: 'test@example.com',
            username: 'testuser',
            roles: ['user']
          };
        }
      }
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