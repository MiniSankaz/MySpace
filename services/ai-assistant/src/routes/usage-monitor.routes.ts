/**
 * Usage Monitor Routes
 * API endpoints for AI usage monitoring and analytics
 * @AI-MARKER:ROUTES:USAGE_MONITOR
 */

import { Router } from 'express';
import { usageMonitorController } from '../controllers/usage-monitor.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/v1/ai/usage/summary
 * @desc    Get usage summary for a period
 * @access  Private
 */
router.get(
  '/summary',
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
    query('userId').optional().isString().withMessage('User ID must be a string'),
    validateRequest
  ],
  (req, res) => usageMonitorController.getUsageSummary(req as any, res)
);

/**
 * @route   GET /api/v1/ai/usage/realtime
 * @desc    Get real-time usage data
 * @access  Private
 */
router.get(
  '/realtime',
  [
    query('userId').optional().isString().withMessage('User ID must be a string'),
    validateRequest
  ],
  (req, res) => usageMonitorController.getRealTimeUsage(req as any, res)
);

/**
 * @route   GET /api/v1/ai/usage/agents/:agentId
 * @desc    Get metrics for a specific agent
 * @access  Private
 */
router.get(
  '/agents/:agentId',
  [
    param('agentId').isString().notEmpty().withMessage('Agent ID is required'),
    validateRequest
  ],
  (req, res) => usageMonitorController.getAgentMetrics(req as any, res)
);

/**
 * @route   GET /api/v1/ai/usage/alerts
 * @desc    Get usage alerts
 * @access  Private
 */
router.get(
  '/alerts',
  [
    query('acknowledged').optional().isBoolean().withMessage('Acknowledged must be boolean'),
    query('level').optional().isIn(['info', 'warning', 'critical']).withMessage('Invalid alert level'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('userId').optional().isString().withMessage('User ID must be a string'),
    validateRequest
  ],
  (req, res) => usageMonitorController.getAlerts(req as any, res)
);

/**
 * @route   POST /api/v1/ai/usage/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private
 */
router.post(
  '/alerts/:alertId/acknowledge',
  [
    param('alertId').isString().notEmpty().withMessage('Alert ID is required'),
    validateRequest
  ],
  (req, res) => usageMonitorController.acknowledgeAlert(req as any, res)
);

/**
 * @route   GET /api/v1/ai/usage/report
 * @desc    Generate usage report
 * @access  Private
 */
router.get(
  '/report',
  [
    query('startDate').isISO8601().withMessage('Start date must be valid ISO 8601 date'),
    query('endDate').isISO8601().withMessage('End date must be valid ISO 8601 date'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
    query('userId').optional().isString().withMessage('User ID must be a string'),
    validateRequest
  ],
  (req, res) => usageMonitorController.getUsageReport(req as any, res)
);

/**
 * @route   GET /api/v1/ai/usage/dashboard
 * @desc    Get dashboard metrics
 * @access  Private
 */
router.get(
  '/dashboard',
  validateRequest,
  (req, res) => usageMonitorController.getDashboardMetrics(req as any, res)
);

export default router;