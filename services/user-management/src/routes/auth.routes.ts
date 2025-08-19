import express from "express";
import { body, validationResult } from "express-validator";
import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";
import {
  ApiResponse,
  LoginRequest,
  CreateUserRequest,
  RefreshTokenRequest,
} from "../types";

export const createAuthRoutes = (authService: AuthService) => {
  const router = express.Router();

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

  // Register endpoint
  router.post(
    "/register",
    [
      body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),
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
        const userData: CreateUserRequest = {
          email: req.body.email,
          password: req.body.password,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          username: req.body.username,
        };

        const user = await authService.register(userData);

        res.status(201).json({
          success: true,
          data: { user },
          message: "User registered successfully",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Registration endpoint error:", error);

        res.status(400).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Login endpoint
  router.post(
    "/login",
    [
      body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
      body("password").isLength({ min: 1 }).withMessage("Password is required"),
      body("rememberMe").optional().isBoolean(),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        const loginData: LoginRequest = {
          email: req.body.email,
          password: req.body.password,
          rememberMe: req.body.rememberMe || false,
        };

        const userAgent = req.get("User-Agent");
        const ipAddress = req.ip;

        const result = await authService.login(loginData, userAgent, ipAddress);

        res.status(200).json({
          success: true,
          data: result,
          message: "Login successful",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Login endpoint error:", error);

        res.status(401).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Refresh token endpoint
  router.post(
    "/refresh",
    [
      body("refreshToken")
        .isLength({ min: 1 })
        .withMessage("Refresh token is required"),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        const refreshTokenData: RefreshTokenRequest = {
          refreshToken: req.body.refreshToken,
        };

        const tokens = await authService.refreshToken(refreshTokenData);

        res.status(200).json({
          success: true,
          data: { tokens },
          message: "Tokens refreshed successfully",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Refresh token endpoint error:", error);

        res.status(401).json({
          success: false,
          error: error.message,
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Logout endpoint
  router.post(
    "/logout",
    async (req: express.Request, res: express.Response) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          res.status(400).json({
            success: false,
            error: "Authorization header required for logout",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
          res.status(400).json({
            success: false,
            error: "Token required for logout",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        await authService.logout(token);

        res.status(200).json({
          success: true,
          message: "Logout successful",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Logout endpoint error:", error);

        res.status(500).json({
          success: false,
          error: "Logout failed",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Validate token endpoint (for other services)
  router.post(
    "/validate",
    async (req: express.Request, res: express.Response) => {
      try {
        const { token } = req.body;

        if (!token) {
          res.status(400).json({
            success: false,
            error: "Token is required",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        const payload = await authService.validateToken(token);

        if (!payload) {
          res.status(401).json({
            success: false,
            error: "Invalid token",
            service: "user-management",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: { payload },
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Token validation endpoint error:", error);

        res.status(500).json({
          success: false,
          error: "Token validation failed",
          service: "user-management",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  return router;
};
