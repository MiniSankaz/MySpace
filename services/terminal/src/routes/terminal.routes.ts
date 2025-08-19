import express from "express";
import { body, validationResult } from "express-validator";
import { TerminalService } from "../services/terminal.service";
import { logger } from "../utils/logger";
import { ApiResponse, CreateTerminalRequest, SessionMode } from "../types";

export const createTerminalRoutes = (terminalService: TerminalService) => {
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
        service: "terminal",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }
    next();
  };

  // Create new terminal session
  router.post(
    "/create",
    [
      body("projectId")
        .isLength({ min: 1 })
        .withMessage("Project ID is required"),
      body("projectPath")
        .isLength({ min: 1 })
        .withMessage("Project path is required"),
      body("userId").optional().isLength({ min: 1 }),
      body("name").optional().isLength({ min: 1 }).trim(),
      body("mode").optional().isIn(["terminal", "claude", "interactive"]),
      body("shell").optional().isLength({ min: 1 }),
      body("dimensions.rows").optional().isInt({ min: 1, max: 300 }),
      body("dimensions.cols").optional().isInt({ min: 1, max: 500 }),
    ],
    validateInput,
    async (req: express.Request, res: express.Response) => {
      try {
        const createRequest: CreateTerminalRequest = {
          projectId: req.body.projectId,
          projectPath: req.body.projectPath,
          userId: req.body.userId,
          name: req.body.name,
          mode: req.body.mode,
          shell: req.body.shell,
          dimensions: req.body.dimensions,
          environment: req.body.environment,
        };

        const result = await terminalService.createTerminal(createRequest);

        res.status(201).json({
          success: true,
          data: result,
          message: "Terminal session created successfully",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Create terminal endpoint error:", error);

        res.status(400).json({
          success: false,
          error: error.message,
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get terminal session by ID
  router.get("/:sessionId", (req: express.Request, res: express.Response) => {
    try {
      const { sessionId } = req.params;
      const session = terminalService.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: `Terminal session ${sessionId} not found`,
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: { session },
        service: "terminal",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      logger.error("Get terminal endpoint error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to retrieve terminal session",
        service: "terminal",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  });

  // List all terminal sessions
  router.get("/", (req: express.Request, res: express.Response) => {
    try {
      const projectId = req.query.projectId as string;

      let sessions;
      if (projectId) {
        sessions = terminalService.listProjectSessions(projectId);
      } else {
        sessions = terminalService.listAllSessions();
      }

      res.status(200).json({
        success: true,
        data: { sessions },
        service: "terminal",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      logger.error("List terminals endpoint error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to list terminal sessions",
        service: "terminal",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  });

  // Close terminal session
  router.delete(
    "/:sessionId",
    (req: express.Request, res: express.Response) => {
      try {
        const { sessionId } = req.params;
        const session = terminalService.getSession(sessionId);

        if (!session) {
          res.status(404).json({
            success: false,
            error: `Terminal session ${sessionId} not found`,
            service: "terminal",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        terminalService.closeSession(sessionId);

        res.status(200).json({
          success: true,
          message: "Terminal session closed successfully",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Close terminal endpoint error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to close terminal session",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Write data to terminal
  router.post(
    "/:sessionId/write",
    [body("data").isLength({ min: 1 }).withMessage("Data is required")],
    validateInput,
    (req: express.Request, res: express.Response) => {
      try {
        const { sessionId } = req.params;
        const { data } = req.body;

        const session = terminalService.getSession(sessionId);
        if (!session) {
          res.status(404).json({
            success: false,
            error: `Terminal session ${sessionId} not found`,
            service: "terminal",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        terminalService.writeToTerminal(sessionId, data);

        res.status(200).json({
          success: true,
          message: "Data written to terminal successfully",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Write terminal endpoint error:", error);

        res.status(500).json({
          success: false,
          error: error.message,
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Resize terminal
  router.post(
    "/:sessionId/resize",
    [
      body("rows")
        .isInt({ min: 1, max: 300 })
        .withMessage("Valid rows value is required"),
      body("cols")
        .isInt({ min: 1, max: 500 })
        .withMessage("Valid cols value is required"),
    ],
    validateInput,
    (req: express.Request, res: express.Response) => {
      try {
        const { sessionId } = req.params;
        const { rows, cols } = req.body;

        const session = terminalService.getSession(sessionId);
        if (!session) {
          res.status(404).json({
            success: false,
            error: `Terminal session ${sessionId} not found`,
            service: "terminal",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        terminalService.resizeTerminal(sessionId, { rows, cols });

        res.status(200).json({
          success: true,
          message: "Terminal resized successfully",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Resize terminal endpoint error:", error);

        res.status(500).json({
          success: false,
          error: error.message,
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get terminal command history
  router.get(
    "/:sessionId/history",
    (req: express.Request, res: express.Response) => {
      try {
        const { sessionId } = req.params;
        const session = terminalService.getSession(sessionId);

        if (!session) {
          res.status(404).json({
            success: false,
            error: `Terminal session ${sessionId} not found`,
            service: "terminal",
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        const history = terminalService.getCommandHistory(sessionId);

        res.status(200).json({
          success: true,
          data: { history },
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get history endpoint error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve command history",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  // Get terminal statistics
  router.get(
    "/stats/overview",
    (req: express.Request, res: express.Response) => {
      try {
        const statistics = terminalService.getStatistics();

        res.status(200).json({
          success: true,
          data: { statistics },
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      } catch (error: any) {
        logger.error("Get statistics endpoint error:", error);

        res.status(500).json({
          success: false,
          error: "Failed to retrieve statistics",
          service: "terminal",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    },
  );

  return router;
};
