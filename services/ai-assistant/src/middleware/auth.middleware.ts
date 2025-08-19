/**
 * Authentication Middleware
 * For protecting API routes
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // For development, allow without auth
      if (process.env.NODE_ENV === "development") {
        (req as AuthRequest).user = {
          id: "dev-user-123",
          email: "dev@example.com",
          role: "admin",
        };
        return next();
      }

      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Add user to request
      (req as AuthRequest).user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      logger.error("Token verification failed:", error);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
