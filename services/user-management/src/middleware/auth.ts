import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";
import { ApiResponse } from "../types";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

export const createAuthMiddleware = (authService: AuthService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization || req.headers["x-user-id"];

      // Check if we have user info from gateway
      const userId = req.headers["x-user-id"] as string;
      const userEmail = req.headers["x-user-email"] as string;
      const userRoles = req.headers["x-user-roles"] as string;

      if (userId && userEmail && userRoles) {
        // User info forwarded from gateway
        req.user = {
          id: userId,
          email: userEmail,
          roles: userRoles.split(","),
        };
        return next();
      }

      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: "Authorization header missing",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const token =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : (authHeader as string);

      if (!token) {
        res.status(401).json({
          success: false,
          error: "Token missing",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const payload = await authService.validateToken(token);

      if (!payload) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired token",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      req.user = {
        id: payload.id,
        email: payload.email,
        roles: payload.roles || ["USER"],
      };

      next();
    } catch (error: any) {
      logger.error("Auth middleware error:", {
        error: error.message,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: "Authentication service error",
        service: "user-management",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
};

export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
        service: "user-management",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        service: "user-management",
        timestamp: new Date().toISOString(),
        requiredRoles: allowedRoles,
        userRoles: req.user.roles,
      } as ApiResponse);
      return;
    }

    next();
  };
};
