/**
 * Usage Monitor Controller
 * Handles REST API endpoints for AI usage monitoring and analytics
 * @AI-MARKER:CONTROLLER:USAGE_MONITOR
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { enhancedUsageMonitor } from '../services/ai-orchestration/enhanced-usage-monitor.service';
import { logger } from '../utils/logger';

export class UsageMonitorController {
  /**
   * GET /api/v1/ai/usage/summary
   * Get usage summary for a period
   */
  async getUsageSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { period = 'weekly', userId: queryUserId } = req.query;
      const userId = queryUserId as string || req.userId!;

      // Validate period
      if (!['daily', 'weekly', 'monthly'].includes(period as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be daily, weekly, or monthly',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check authorization - users can only view their own data unless admin
      if (queryUserId && queryUserId !== req.userId && !req.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view other users usage data',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const summary = await enhancedUsageMonitor.getUsageSummary(
        period as 'daily' | 'weekly' | 'monthly',
        userId
      );

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error getting usage summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage summary',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/usage/realtime
   * Get real-time usage data
   */
  async getRealTimeUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId: queryUserId } = req.query;
      const userId = queryUserId as string || req.userId!;

      // Check authorization
      if (queryUserId && queryUserId !== req.userId && !req.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view other users usage data',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const usage = await enhancedUsageMonitor.getRealTimeUsage(userId);

      if (!usage) {
        res.status(503).json({
          success: false,
          error: 'Real-time usage data temporarily unavailable',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: usage,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error getting real-time usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time usage',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/usage/agents/:agentId
   * Get metrics for a specific agent
   */
  async getAgentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Agent ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const metrics = await enhancedUsageMonitor.getAgentMetrics(agentId);

      // Filter metrics by user unless admin
      const filteredMetrics = req.isAdmin 
        ? metrics 
        : metrics.filter(m => m.userId === req.userId);

      res.json({
        success: true,
        data: {
          agentId,
          metrics: filteredMetrics,
          count: filteredMetrics.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error getting agent metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent metrics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/usage/alerts
   * Get usage alerts
   */
  async getAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        acknowledged, 
        level, 
        limit = '50',
        userId: queryUserId 
      } = req.query;

      // Check authorization
      if (queryUserId && queryUserId !== req.userId && !req.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view other users alerts',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const alerts = await enhancedUsageMonitor.getAlerts({
        userId: (queryUserId as string) || (req.isAdmin ? undefined : req.userId),
        acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
        level: level as 'info' | 'warning' | 'critical' | undefined,
        limit: parseInt(limit as string, 10)
      });

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/ai/usage/alerts/:alertId/acknowledge
   * Acknowledge an alert
   */
  async acknowledgeAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;

      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'Alert ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const success = await enhancedUsageMonitor.acknowledgeAlert(
        alertId,
        req.userId!
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Alert not found or already acknowledged',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: {
          alertId,
          acknowledgedBy: req.userId,
          acknowledgedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/usage/report
   * Generate usage report
   */
  async getUsageReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        startDate, 
        endDate, 
        format = 'json',
        userId: queryUserId 
      } = req.query;

      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (start > end) {
        res.status(400).json({
          success: false,
          error: 'Start date must be before end date',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check authorization
      if (queryUserId && queryUserId !== req.userId && !req.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view other users reports',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = queryUserId as string || req.userId!;
      const report = await enhancedUsageMonitor.getUsageReport(userId, start, end);

      // Format response based on requested format
      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=usage-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: {
            report,
            userId,
            generatedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error('Error generating usage report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate usage report',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/usage/dashboard
   * Get dashboard metrics
   */
  async getDashboardMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      // Get multiple data points in parallel
      const [realTimeUsage, weeklySummary, alerts] = await Promise.all([
        enhancedUsageMonitor.getRealTimeUsage(userId),
        enhancedUsageMonitor.getUsageSummary('weekly', userId),
        enhancedUsageMonitor.getAlerts({
          userId,
          acknowledged: false,
          limit: 10
        })
      ]);

      // Calculate key metrics
      const metrics = {
        current: {
          dailyTokens: realTimeUsage?.daily.totalTokens || 0,
          dailyCost: realTimeUsage?.daily.totalCost || 0,
          weeklyTokens: realTimeUsage?.weekly.totalTokens || 0,
          weeklyCost: realTimeUsage?.weekly.totalCost || 0
        },
        usage: {
          opus: {
            hoursUsed: realTimeUsage?.weekly.opusHoursUsed || 0,
            hoursLimit: realTimeUsage?.limits.weeklyOpusHours || 35,
            percentage: ((realTimeUsage?.weekly.opusHoursUsed || 0) / (realTimeUsage?.limits.weeklyOpusHours || 35)) * 100
          },
          sonnet: {
            hoursUsed: realTimeUsage?.weekly.sonnetHoursUsed || 0,
            hoursLimit: realTimeUsage?.limits.weeklySonnetHours || 280,
            percentage: ((realTimeUsage?.weekly.sonnetHoursUsed || 0) / (realTimeUsage?.limits.weeklySonnetHours || 280)) * 100
          }
        },
        agents: weeklySummary.agentBreakdown,
        alerts: {
          unacknowledged: alerts.length,
          critical: alerts.filter(a => a.level === 'critical').length,
          warning: alerts.filter(a => a.level === 'warning').length,
          recent: alerts.slice(0, 5)
        },
        projections: {
          weeklyEstimate: (realTimeUsage?.daily.totalCost || 0) * 7,
          monthlyEstimate: (realTimeUsage?.daily.totalCost || 0) * 30
        }
      };

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard metrics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Convert report to CSV format
   */
  private convertReportToCSV(report: any): string {
    const headers = [
      'Date',
      'Total Cost',
      'Total Tokens',
      'Opus Hours',
      'Opus Cost',
      'Sonnet Hours',
      'Sonnet Cost',
      'Haiku Hours',
      'Haiku Cost'
    ];

    const rows = report.dailyBreakdown.map((day: any) => [
      day.date,
      day.totalCost.toFixed(2),
      day.totalTokens.input + day.totalTokens.output,
      day.modelUsage.opus.hours.toFixed(2),
      day.modelUsage.opus.cost.toFixed(2),
      day.modelUsage.sonnet.hours.toFixed(2),
      day.modelUsage.sonnet.cost.toFixed(2),
      day.modelUsage.haiku.hours.toFixed(2),
      day.modelUsage.haiku.cost.toFixed(2)
    ]);

    // Add summary row
    rows.push([
      'TOTAL',
      report.totalCost.toFixed(2),
      '',
      report.totalHours.opus.toFixed(2),
      '',
      report.totalHours.sonnet.toFixed(2),
      '',
      report.totalHours.haiku.toFixed(2),
      ''
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}

// Export singleton instance
export const usageMonitorController = new UsageMonitorController();