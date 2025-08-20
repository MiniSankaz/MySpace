/**
 * AI Orchestration Routes
 * REST API routes for Task Orchestration, Planning, and Multi-Agent features
 */

import { Router } from "express";
import { aiOrchestrationController } from "../controllers/ai-orchestration.controller";
import { authMiddleware } from "../middleware/auth";
import { requestLoggerMiddleware } from "../middleware/request-logger";
import approvalGatesRoutes from "./approval-gates.routes";

const router = Router();

// Apply middleware to all routes
router.use(requestLoggerMiddleware);
router.use(authMiddleware);

// ======================
// Task Orchestration Routes
// ======================

/**
 * POST /api/v1/ai/orchestration/chains
 * Create and execute a task chain from goals
 */
router.post(
  "/orchestration/chains",
  aiOrchestrationController.createTaskChain.bind(aiOrchestrationController),
);

/**
 * GET /api/v1/ai/orchestration/chains/:chainId/status
 * Get detailed status of a task chain
 */
router.get(
  "/orchestration/chains/:chainId/status",
  aiOrchestrationController.getChainStatus.bind(aiOrchestrationController),
);

/**
 * PUT /api/v1/ai/orchestration/chains/:chainId/control
 * Control chain execution (pause, resume, cancel)
 */
router.put(
  "/orchestration/chains/:chainId/control",
  aiOrchestrationController.controlChain.bind(aiOrchestrationController),
);

// ======================
// Task Planning Routes
// ======================

/**
 * POST /api/v1/ai/planning/analyze
 * Analyze goals and generate task plans
 */
router.post(
  "/planning/analyze",
  aiOrchestrationController.analyzeGoals.bind(aiOrchestrationController),
);

/**
 * GET /api/v1/ai/planning/templates
 * Get available planning templates
 */
router.get(
  "/planning/templates",
  aiOrchestrationController.getPlanningTemplates.bind(
    aiOrchestrationController,
  ),
);

// ======================
// Multi-Agent Routes
// ======================

/**
 * POST /api/v1/ai/agents/collaboration
 * Create a collaboration session
 */
router.post(
  "/agents/collaboration",
  aiOrchestrationController.createCollaboration.bind(aiOrchestrationController),
);

/**
 * GET /api/v1/ai/agents/available
 * Get available agents and their status
 */
router.get(
  "/agents/available",
  aiOrchestrationController.getAvailableAgents.bind(aiOrchestrationController),
);

/**
 * POST /api/v1/ai/agents/sessions/:sessionId/tasks
 * Assign a collaborative task
 */
router.post(
  "/agents/sessions/:sessionId/tasks",
  aiOrchestrationController.assignTask.bind(aiOrchestrationController),
);

// ======================
// Approval Gates Routes
// ======================

/**
 * Mount approval gates routes under /approval
 */
router.use("/approval", approvalGatesRoutes);

// ======================
// Health Check Route
// ======================

/**
 * GET /api/v1/ai/health
 * Health check for AI orchestration services
 */
router.get("/health", (req, res) => {
  try {
    // Check if services are running
    const services = {
      taskOrchestrator: !!aiOrchestrationController,
      taskPlanner: true, // Add actual health check when taskPlanner is available
      multiAgent: true, // Add actual health check when multiAgentCoordinator is available
    };

    const allHealthy = Object.values(services).every(Boolean);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        status: allHealthy ? "healthy" : "degraded",
        services,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      correlationId: req.headers["x-correlation-id"],
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: "Health check failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ======================
// Error Handling
// ======================

// 404 handler for unknown AI routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "AI endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    correlationId: req.headers["x-correlation-id"],
  });
});

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error("[AI Routes Error]:", error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || "Internal server error",
    timestamp: new Date().toISOString(),
    correlationId: req.headers["x-correlation-id"],
    service: "ai-assistant",
  });
});

export default router;
