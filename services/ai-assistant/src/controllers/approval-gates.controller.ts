/**
 * Approval Gates Controller
 * Handles REST API endpoints for Human Approval Gates system
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../utils/logger";
import { 
  approvalGatesService,
  ApprovalType,
  ApprovalLevel,
  ApprovalStatus,
  ApprovalRequest,
  ApprovalPolicy
} from "../services/ai-orchestration/approval-gates.service";
import { approvalNotificationsService } from "../services/ai-orchestration/approval-notifications.service";

export class ApprovalGatesController {
  // ===========================
  // Approval Request Management
  // ===========================

  /**
   * POST /api/v1/ai/approval/requests
   * Submit a new approval request
   */
  async submitApprovalRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        type, 
        operation, 
        title, 
        description, 
        approvers, 
        timeoutMinutes,
        context 
      } = req.body;

      // Validate required fields
      if (!type || !operation) {
        res.status(400).json({
          success: false,
          error: "Type and operation are required",
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!Object.values(ApprovalType).includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid approval type: ${type}`,
          validTypes: Object.values(ApprovalType),
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Enrich context with request metadata
      const enrichedContext = {
        userId: req.userId!,
        sessionId: context?.sessionId || req.headers["x-correlation-id"] as string,
        taskChainId: context?.taskChainId,
        correlationId: req.headers["x-correlation-id"] as string,
        metadata: {
          ...context?.metadata,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
          timestamp: new Date().toISOString()
        }
      };

      // Submit approval request
      const request = await approvalGatesService.submitApprovalRequest(
        type,
        operation,
        enrichedContext,
        {
          title,
          description,
          approvers,
          timeoutMinutes
        }
      );

      const response = {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          type: request.type,
          level: request.level,
          approvers: request.approvers,
          requiredApprovals: request.requiredApprovals,
          expiresAt: request.expiresAt,
          estimatedResponseTime: this.calculateEstimatedResponseTime(request),
          trackingUrl: `/api/v1/ai/approval/requests/${request.id}`,
          websocketChannel: `approval:${request.id}`
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      logger.info(`Approval request submitted: ${request.id} by ${req.userId}`);
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Submit approval request error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to submit approval request",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/ai/approval/requests/:requestId
   * Get approval request details
   */
  async getApprovalRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;

      const history = await approvalGatesService.getRequestHistory(requestId);
      
      if (!history.request) {
        res.status(404).json({
          success: false,
          error: "Approval request not found",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const request = history.request;
      const progress = this.calculateProgress(request);
      const timeRemaining = this.calculateTimeRemaining(request);

      const response = {
        success: true,
        data: {
          request: {
            id: request.id,
            type: request.type,
            level: request.level,
            status: request.status,
            title: request.title,
            description: request.description,
            requestedBy: request.requestedBy,
            requestedAt: request.requestedAt,
            operation: request.operation,
            approvers: request.approvers,
            requiredApprovals: request.requiredApprovals,
            expiresAt: request.expiresAt,
            bypassReason: request.bypassReason,
            bypassedBy: request.bypassedBy,
            bypassedAt: request.bypassedAt
          },
          progress: {
            currentApprovals: request.currentApprovals.length,
            requiredApprovals: request.requiredApprovals,
            percentage: progress.percentage,
            pendingApprovers: progress.pendingApprovers,
            completedApprovers: progress.completedApprovers
          },
          timing: {
            timeRemaining: timeRemaining.ms,
            timeRemainingFormatted: timeRemaining.formatted,
            isUrgent: timeRemaining.isUrgent,
            estimatedResponseTime: this.calculateEstimatedResponseTime(request)
          },
          decisions: history.decisions.map(d => ({
            id: d.id,
            decidedBy: d.decidedBy,
            decision: d.decision,
            reason: d.reason,
            timestamp: d.timestamp
          })),
          auditTrail: history.auditLog.map(entry => ({
            id: entry.id,
            action: entry.action,
            performedBy: entry.performedBy,
            timestamp: entry.timestamp,
            details: entry.details
          }))
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      res.json(response);
    } catch (error: any) {
      logger.error("Get approval request error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get approval request",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/ai/approval/requests/:requestId/decision
   * Make an approval decision
   */
  async makeDecision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { decision, reason, metadata } = req.body;

      // Validate decision
      if (!decision || !["approve", "reject"].includes(decision)) {
        res.status(400).json({
          success: false,
          error: "Decision must be 'approve' or 'reject'",
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Process decision
      const approvalDecision = await approvalGatesService.processDecision(
        requestId,
        req.userId!,
        decision,
        reason,
        {
          ...metadata,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );

      // Get updated request
      const request = approvalGatesService.getRequest(requestId);
      
      const response = {
        success: true,
        data: {
          decisionId: approvalDecision.id,
          decision: approvalDecision.decision,
          reason: approvalDecision.reason,
          timestamp: approvalDecision.timestamp,
          requestStatus: request?.status,
          isResolved: request?.status !== ApprovalStatus.PENDING,
          nextSteps: this.getNextSteps(request)
        },
        message: `Decision '${decision}' recorded successfully`,
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      logger.info(`Approval decision made: ${requestId} -> ${decision} by ${req.userId}`);
      res.json(response);
    } catch (error: any) {
      logger.error("Make decision error:", error);
      res.status(400).json({
        success: false,
        error: "Failed to process decision",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/ai/approval/requests/:requestId/bypass
   * Request emergency bypass
   */
  async requestBypass(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { reason, emergencyContext } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: "Bypass reason is required",
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Request bypass
      const request = await approvalGatesService.requestEmergencyBypass(
        requestId,
        req.userId!,
        reason,
        {
          ...emergencyContext,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
          correlationId: req.headers["x-correlation-id"]
        }
      );

      const response = {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          bypassedBy: request.bypassedBy,
          bypassedAt: request.bypassedAt,
          bypassReason: request.bypassReason
        },
        message: "Emergency bypass applied successfully",
        warning: "This action has been logged and will be audited",
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      logger.warn(`Emergency bypass requested: ${requestId} by ${req.userId}`);
      res.json(response);
    } catch (error: any) {
      logger.error("Request bypass error:", error);
      res.status(400).json({
        success: false,
        error: "Failed to process bypass request",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===========================
  // Queue Management
  // ===========================

  /**
   * GET /api/v1/ai/approval/requests
   * Get approval requests (with filtering)
   */
  async getApprovalRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        status, 
        type, 
        level, 
        assignedToMe, 
        requestedByMe, 
        limit = 50, 
        offset = 0,
        sortBy = "requestedAt",
        sortOrder = "desc"
      } = req.query;

      // Get requests based on user role and filters
      let requests: ApprovalRequest[] = [];
      
      if (assignedToMe === "true") {
        requests = approvalGatesService.getPendingRequestsForUser(req.userId!);
      } else if (requestedByMe === "true") {
        requests = approvalGatesService.getPendingRequestsForUser(req.userId!)
          .filter(r => r.requestedBy === req.userId);
      } else {
        // TODO: Check if user has permission to view all requests
        requests = approvalGatesService.getPendingRequestsForUser(req.userId!);
      }

      // Apply filters
      if (status) {
        requests = requests.filter(r => r.status === status);
      }
      if (type) {
        requests = requests.filter(r => r.type === type);
      }
      if (level) {
        requests = requests.filter(r => r.level === level);
      }

      // Sort
      requests.sort((a, b) => {
        const aVal = (a as any)[sortBy as string];
        const bVal = (b as any)[sortBy as string];
        
        if (sortOrder === "desc") {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Paginate
      const total = requests.length;
      const paginatedRequests = requests.slice(Number(offset), Number(offset) + Number(limit));

      const response = {
        success: true,
        data: {
          requests: paginatedRequests.map(request => ({
            id: request.id,
            type: request.type,
            level: request.level,
            status: request.status,
            title: request.title,
            requestedBy: request.requestedBy,
            requestedAt: request.requestedAt,
            expiresAt: request.expiresAt,
            operation: {
              action: request.operation.action,
              resource: request.operation.resource,
              riskLevel: request.operation.riskLevel
            },
            progress: {
              currentApprovals: request.currentApprovals.length,
              requiredApprovals: request.requiredApprovals
            },
            timeRemaining: this.calculateTimeRemaining(request)
          })),
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: Number(offset) + Number(limit) < total
          },
          summary: {
            totalPending: requests.filter(r => r.status === ApprovalStatus.PENDING).length,
            urgentCount: requests.filter(r => this.calculateTimeRemaining(r).isUrgent).length,
            myPendingCount: requests.filter(r => 
              r.status === ApprovalStatus.PENDING && 
              r.approvers.includes(req.userId!)
            ).length
          }
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      res.json(response);
    } catch (error: any) {
      logger.error("Get approval requests error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get approval requests",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===========================
  // Policy Management
  // ===========================

  /**
   * GET /api/v1/ai/approval/policies
   * Get approval policies
   */
  async getApprovalPolicies(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Get policies from service (implement getter)
      const policies: ApprovalPolicy[] = []; // approvalGatesService.getPolicies();

      const response = {
        success: true,
        data: {
          policies: policies.map(policy => ({
            id: policy.id,
            name: policy.name,
            description: policy.description,
            conditions: policy.conditions,
            requirements: policy.requirements,
            notifications: policy.notifications,
            emergency: policy.emergency,
            isActive: policy.isActive,
            priority: policy.priority,
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt
          }))
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      res.json(response);
    } catch (error: any) {
      logger.error("Get approval policies error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get approval policies",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===========================
  // Analytics and Reporting
  // ===========================

  /**
   * GET /api/v1/ai/approval/analytics
   * Get approval analytics
   */
  async getApprovalAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString()
      } = req.query;

      const timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const stats = approvalGatesService.getApprovalStatistics(timeRange);

      const response = {
        success: true,
        data: {
          timeRange,
          statistics: stats,
          trends: {
            // TODO: Calculate trends
            approvalRate: stats.total > 0 ? (stats.byStatus[ApprovalStatus.APPROVED] || 0) / stats.total * 100 : 0,
            averageProcessingTime: stats.avgProcessingTime || 0,
            bypassRate: stats.total > 0 ? stats.bypassCount / stats.total * 100 : 0,
            escalationRate: stats.total > 0 ? stats.escalationCount / stats.total * 100 : 0
          },
          recommendations: this.generateRecommendations(stats)
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"]
      };

      res.json(response);
    } catch (error: any) {
      logger.error("Get approval analytics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get approval analytics",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===========================
  // Helper Methods
  // ===========================

  private calculateProgress(request: ApprovalRequest) {
    const completedApprovers = request.currentApprovals.map(d => d.decidedBy);
    const pendingApprovers = request.approvers.filter(id => !completedApprovers.includes(id));
    
    return {
      percentage: Math.round((request.currentApprovals.length / request.requiredApprovals) * 100),
      pendingApprovers,
      completedApprovers
    };
  }

  private calculateTimeRemaining(request: ApprovalRequest) {
    const now = Date.now();
    const expiresAt = request.expiresAt.getTime();
    const remaining = Math.max(0, expiresAt - now);
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      ms: remaining,
      formatted: `${hours}h ${minutes}m`,
      isUrgent: remaining < 30 * 60 * 1000 // Less than 30 minutes
    };
  }

  private calculateEstimatedResponseTime(request: ApprovalRequest): string {
    // Simple estimation based on approval level and urgency
    const baseMinutes = {
      [ApprovalLevel.USER]: 15,
      [ApprovalLevel.ADMIN]: 60,
      [ApprovalLevel.SECURITY]: 120,
      [ApprovalLevel.EMERGENCY]: 5,
      [ApprovalLevel.SYSTEM]: 1
    };

    const base = baseMinutes[request.level] || 60;
    const multiplier = request.operation.riskLevel === "critical" ? 0.5 : 1;
    
    return `${Math.round(base * multiplier)} minutes`;
  }

  private getNextSteps(request?: ApprovalRequest): string[] {
    if (!request) return [];
    
    switch (request.status) {
      case ApprovalStatus.PENDING:
        return [
          `Waiting for ${request.requiredApprovals - request.currentApprovals.length} more approval(s)`,
          `Request expires at ${request.expiresAt.toISOString()}`
        ];
      case ApprovalStatus.APPROVED:
        return ["Request approved - operation can proceed"];
      case ApprovalStatus.REJECTED:
        return ["Request rejected - operation blocked"];
      case ApprovalStatus.EXPIRED:
        return ["Request expired - resubmit if needed"];
      case ApprovalStatus.BYPASSED:
        return ["Request bypassed - audit trail created"];
      default:
        return [];
    }
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    if (stats.bypassCount > stats.total * 0.1) {
      recommendations.push("High bypass rate detected - review approval policies");
    }
    
    if (stats.escalationCount > stats.total * 0.2) {
      recommendations.push("High escalation rate - consider adjusting timeout periods");
    }
    
    if (stats.avgProcessingTime > 2 * 60 * 60 * 1000) { // 2 hours
      recommendations.push("Long processing times - consider additional approvers");
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const approvalGatesController = new ApprovalGatesController();