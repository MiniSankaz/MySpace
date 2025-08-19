import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { ApiResponse } from "../types";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const jwtMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Authorization header missing",
        service: "gateway",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Token missing from authorization header",
        service: "gateway",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      // Log successful authentication
      logger.debug("JWT verified successfully", {
        userId: req.user.id,
        email: req.user.email,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (jwtError: any) {
      logger.warn("JWT verification failed", {
        error: jwtError.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      let errorMessage = "Invalid token";
      if (jwtError.name === "TokenExpiredError") {
        errorMessage = "Token expired";
      } else if (jwtError.name === "JsonWebTokenError") {
        errorMessage = "Invalid token format";
      }

      res.status(401).json({
        success: false,
        error: errorMessage,
        service: "gateway",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }
  } catch (error: any) {
    logger.error("JWT middleware error:", {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: "Authentication service error",
      service: "gateway",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
    return;
  }
};

export const optionalJwtMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    // For optional middleware, we don't throw errors
    logger.debug(
      "Optional JWT verification failed, proceeding without user context",
    );
  }

  next();
};
