import express from "express";
import { body, validationResult } from "express-validator";
import { AuthService } from "../services/auth.service";
import { createAuthMiddleware, requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";
import { ApiResponse } from "../types";

export const createUserRoutes = (authService: AuthService) => {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authService);

  // Input validation middleware
  const validateInput = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
        service: "user-management",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }
    next();
  };

  // Get current user profile
  router.get(
    "/me",
    authMiddleware,
    async (req: express.Request, res: express.Response) => {
      try {
        const user = await authService.getUserById(req.user!.id);

        if (!user) {
          res.status(404).json({
            success: false,
            error: "User not found",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: { user },
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get user profile error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve user profile",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Update current user profile
  router.put(
    "/me",
    authMiddleware,
    [
      body("firstName").optional().isLength({ min: 1 }).trim(),
      body("lastName").optional().isLength({ min: 1 }).trim(),
      body("username")
        .optional()
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters"),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        const updateData = {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          username: req.body.username,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });

        const user = await authService.updateUser(req.user!.id, updateData);

        res.status(200).json({
          success: true,
          data: { user },
          message: "Profile updated successfully",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Update user profile error:", error);

        res.status(400).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Change password
  router.put(
    "/me/password",
    authMiddleware,
    [
      body("currentPassword")
        .isLength({ min: 1 })
        .withMessage("Current password is required"),
      body("newPassword")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters"),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        await authService.changePassword(
          req.user!.id,
          req.body.currentPassword,
          req.body.newPassword,
        );

        res.status(200).json({
          success: true,
          message: "Password changed successfully",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Change password error:", error);

        res.status(400).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get user by ID (Admin only)
  router.get(
    "/:id",
    authMiddleware,
    requireRole(["ADMIN"]),
    async (req: express.Request, res: express.Response) => {
      try {
        const user = await authService.getUserById(req.params.id);

        if (!user) {
          res.status(404).json({
            success: false,
            error: "User not found",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: { user },
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get user by ID error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve user",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Update user by ID (Admin only)
  router.put(
    "/:id",
    authMiddleware,
    requireRole(["ADMIN"]),
    [
      body("firstName").optional().isLength({ min: 1 }).trim(),
      body("lastName").optional().isLength({ min: 1 }).trim(),
      body("username").optional().isLength({ min: 3 }),
      body("role").optional().isIn(["ADMIN", "USER", "PREMIUM", "GUEST"]),
      body("isActive").optional().isBoolean(),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        const updateData = {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          username: req.body.username,
          role: req.body.role,
          isActive: req.body.isActive,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });

        const user = await authService.updateUser(req.params.id, updateData);

        res.status(200).json({
          success: true,
          data: { user },
          message: "User updated successfully",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Update user by ID error:", error);

        res.status(400).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get user count (Admin only)
  router.get(
    "/count",
    authMiddleware,
    requireRole(["ADMIN"]),
    async (req: express.Request, res: express.Response) => {
      try {
        const count = await authService.getUserCount();

        res.status(200).json({
          success: true,
          data: { count },
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get user count error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve user count",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get user by email (for testing - Admin only)
  router.get(
    "/by-email/:email",
    authMiddleware,
    requireRole(["ADMIN"]),
    async (req: express.Request, res: express.Response) => {
      try {
        const user = await authService.getUserByEmail(req.params.email);

        if (!user) {
          res.status(404).json({
            success: false,
            error: "User not found",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: { user },
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get user by email error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve user",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  return router;
};
