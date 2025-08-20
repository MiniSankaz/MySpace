/**
 * Approval Gates Routes
 * REST API endpoints for Human Approval Gates system
 */

import { Router } from "express";
import { approvalGatesController } from "../controllers/approval-gates.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateApprovalRequest, validateDecision, validateBypass } from "../middleware/validation";
import { requestLogger } from "../middleware/request-logger";

const router = Router();

// Apply common middleware
router.use(requestLogger);
router.use(authMiddleware);

// ===========================
// Approval Request Management
// ===========================

/**
 * @route POST /api/v1/ai/approval/requests
 * @desc Submit a new approval request
 * @access Private
 */
router.post(
  "/requests",
  validateApprovalRequest,
  approvalGatesController.submitApprovalRequest.bind(approvalGatesController)
);

/**
 * @route GET /api/v1/ai/approval/requests
 * @desc Get approval requests with filtering and pagination
 * @access Private
 */
router.get(
  "/requests",
  approvalGatesController.getApprovalRequests.bind(approvalGatesController)
);

/**
 * @route GET /api/v1/ai/approval/requests/:requestId
 * @desc Get specific approval request details
 * @access Private
 */
router.get(
  "/requests/:requestId",
  approvalGatesController.getApprovalRequest.bind(approvalGatesController)
);

/**
 * @route POST /api/v1/ai/approval/requests/:requestId/decision
 * @desc Make an approval decision (approve/reject)
 * @access Private
 */
router.post(
  "/requests/:requestId/decision",
  validateDecision,
  approvalGatesController.makeDecision.bind(approvalGatesController)
);

/**
 * @route POST /api/v1/ai/approval/requests/:requestId/bypass
 * @desc Request emergency bypass
 * @access Private - Requires special permissions
 */
router.post(
  "/requests/:requestId/bypass",
  validateBypass,
  approvalGatesController.requestBypass.bind(approvalGatesController)
);

// ===========================
// Policy Management
// ===========================

/**
 * @route GET /api/v1/ai/approval/policies
 * @desc Get approval policies
 * @access Private - Admin only
 */
router.get(
  "/policies",
  approvalGatesController.getApprovalPolicies.bind(approvalGatesController)
);

// ===========================
// Analytics and Reporting
// ===========================

/**
 * @route GET /api/v1/ai/approval/analytics
 * @desc Get approval analytics and statistics
 * @access Private - Admin/Manager only
 */
router.get(
  "/analytics",
  approvalGatesController.getApprovalAnalytics.bind(approvalGatesController)
);

// ===========================
// Health Check
// ===========================

/**
 * @route GET /api/v1/ai/approval/health
 * @desc Health check for approval gates service
 * @access Public
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "approval-gates",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

export default router;