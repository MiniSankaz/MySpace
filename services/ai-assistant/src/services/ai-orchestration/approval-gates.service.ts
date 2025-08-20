/**
 * Human Approval Gates Service
 * Manages approval workflows for critical AI decisions with comprehensive audit trails
 */

import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

// ===========================
// Core Types and Interfaces
// ===========================

export enum ApprovalType {
  CODE_DEPLOYMENT = "code_deployment",
  DATABASE_CHANGES = "database_changes",
  SYSTEM_CONFIGURATION = "system_configuration",
  COST_EXCEEDING_OPERATIONS = "cost_exceeding_operations",
  SECURITY_CHANGES = "security_changes",
  USER_DATA_ACCESS = "user_data_access",
  EXTERNAL_API_CALLS = "external_api_calls",
  FILE_SYSTEM_CHANGES = "file_system_changes",
  PRODUCTION_OPERATIONS = "production_operations",
  EMERGENCY_OVERRIDE = "emergency_override"
}

export enum ApprovalLevel {
  USER = "user",           // User approval required
  ADMIN = "admin",         // Admin approval required  
  SECURITY = "security",   // Security team approval
  EMERGENCY = "emergency", // Emergency approval (bypass with audit)
  SYSTEM = "system"        // System auto-approval (whitelisted operations)
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
  BYPASSED = "bypassed",
  CANCELLED = "cancelled"
}

export enum NotificationChannel {
  EMAIL = "email",
  WEBSOCKET = "websocket", 
  SLACK = "slack",
  WEBHOOK = "webhook",
  SMS = "sms"
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  level: ApprovalLevel;
  status: ApprovalStatus;
  
  // Request details
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: Date;
  
  // Operation details
  operation: {
    action: string;
    resource: string;
    parameters: Record<string, any>;
    riskLevel: "low" | "medium" | "high" | "critical";
    impact: string;
    reversible: boolean;
  };
  
  // Approval flow
  approvers: string[];
  requiredApprovals: number;
  currentApprovals: ApprovalDecision[];
  
  // Timing
  expiresAt: Date;
  timeoutMs: number;
  
  // Context
  context: {
    userId: string;
    sessionId: string;
    taskChainId?: string;
    correlationId?: string;
    metadata: Record<string, any>;
  };
  
  // Audit trail
  auditLog: ApprovalAuditEntry[];
  
  // Escalation
  escalationLevel: number;
  escalationHistory: ApprovalEscalation[];
  
  // Bypass
  bypassReason?: string;
  bypassedBy?: string;
  bypassedAt?: Date;
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  decidedBy: string;
  decision: "approve" | "reject";
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  description: string;
  
  // Conditions
  conditions: {
    types: ApprovalType[];
    riskLevels: string[];
    resourcePatterns: string[];
    userRoles: string[];
    timeWindows?: { start: string; end: string }[];
  };
  
  // Requirements
  requirements: {
    level: ApprovalLevel;
    approverCount: number;
    timeoutMinutes: number;
    allowSelfApproval: boolean;
    requireAllApprovers: boolean;
  };
  
  // Notifications
  notifications: {
    channels: NotificationChannel[];
    immediateNotify: boolean;
    reminderIntervals: number[];
    escalationNotify: boolean;
  };
  
  // Emergency
  emergency: {
    allowBypass: boolean;
    bypassRoles: string[];
    requireBypassReason: boolean;
    auditBypass: boolean;
  };
  
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalAuditEntry {
  id: string;
  requestId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApprovalEscalation {
  id: string;
  requestId: string;
  level: number;
  escalatedTo: string[];
  escalatedBy: string;
  reason: string;
  timestamp: Date;
}

export interface ApprovalNotification {
  id: string;
  requestId: string;
  recipientId: string;
  channel: NotificationChannel;
  type: "request" | "reminder" | "escalation" | "decision" | "timeout";
  content: {
    subject: string;
    body: string;
    data: Record<string, any>;
  };
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
}

// ===========================
// Main Service Class
// ===========================

export class ApprovalGatesService extends EventEmitter {
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private policies: Map<string, ApprovalPolicy> = new Map();
  private decisions: Map<string, ApprovalDecision[]> = new Map();
  private notifications: Map<string, ApprovalNotification[]> = new Map();
  
  private notificationService: NotificationService;
  private auditService: AuditService;
  private policyEngine: PolicyEngine;
  private timeoutManager: TimeoutManager;
  
  private readonly MAX_PENDING_REQUESTS = 1000;
  private readonly CLEANUP_INTERVAL = 3600000; // 1 hour
  
  constructor() {
    super();
    this.setMaxListeners(50);
    
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
    this.policyEngine = new PolicyEngine();
    this.timeoutManager = new TimeoutManager();
    
    this.initializeDefaultPolicies();
    this.startCleanupScheduler();
    
    logger.info("ApprovalGatesService initialized");
  }

  // ===========================
  // Request Management
  // ===========================

  /**
   * Submit a request for approval
   */
  async submitApprovalRequest(
    type: ApprovalType,
    operation: ApprovalRequest["operation"],
    context: ApprovalRequest["context"],
    options: {
      title?: string;
      description?: string;
      approvers?: string[];
      timeoutMinutes?: number;
    } = {}
  ): Promise<ApprovalRequest> {
    // Check queue capacity
    if (this.pendingRequests.size >= this.MAX_PENDING_REQUESTS) {
      throw new Error("Approval queue is full. Please try again later.");
    }

    // Get applicable policy
    const policy = await this.policyEngine.findApplicablePolicy(type, operation, context);
    if (!policy) {
      throw new Error(`No approval policy found for operation type: ${type}`);
    }

    // Create request
    const request: ApprovalRequest = {
      id: uuidv4(),
      type,
      level: policy.requirements.level,
      status: ApprovalStatus.PENDING,
      
      title: options.title || `${type} Request`,
      description: options.description || `Approval required for ${operation.action} on ${operation.resource}`,
      requestedBy: context.userId,
      requestedAt: new Date(),
      
      operation,
      
      approvers: options.approvers || await this.getApproversForPolicy(policy, context),
      requiredApprovals: policy.requirements.approverCount,
      currentApprovals: [],
      
      expiresAt: new Date(Date.now() + (options.timeoutMinutes || policy.requirements.timeoutMinutes) * 60000),
      timeoutMs: (options.timeoutMinutes || policy.requirements.timeoutMinutes) * 60000,
      
      context,
      auditLog: [],
      escalationLevel: 0,
      escalationHistory: []
    };

    // Store request
    this.pendingRequests.set(request.id, request);
    this.decisions.set(request.id, []);
    this.notifications.set(request.id, []);

    // Audit log
    await this.auditService.logAction(request.id, "request_submitted", context.userId, {
      type,
      operation,
      policy: policy.id
    });

    // Set timeout
    this.timeoutManager.scheduleTimeout(request.id, request.timeoutMs, () => {
      this.handleRequestTimeout(request.id);
    });

    // Send notifications
    await this.notificationService.sendRequestNotifications(request, policy);

    // Emit event
    this.emit("request:submitted", request);

    logger.info(`Approval request submitted: ${request.id} (${type})`);
    return request;
  }

  /**
   * Process an approval decision
   */
  async processDecision(
    requestId: string,
    decidedBy: string,
    decision: "approve" | "reject",
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<ApprovalDecision> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${requestId} is not pending approval`);
    }

    // Validate approver authorization
    await this.validateApprover(request, decidedBy);

    // Check for duplicate decision from same approver
    const existingDecision = request.currentApprovals.find(d => d.decidedBy === decidedBy);
    if (existingDecision) {
      throw new Error(`Approver ${decidedBy} has already decided on this request`);
    }

    // Create decision
    const approvalDecision: ApprovalDecision = {
      id: uuidv4(),
      requestId,
      decidedBy,
      decision,
      reason,
      timestamp: new Date(),
      metadata
    };

    // Add to request
    request.currentApprovals.push(approvalDecision);
    this.decisions.get(requestId)?.push(approvalDecision);

    // Audit log
    await this.auditService.logAction(requestId, `decision_${decision}`, decidedBy, {
      decision,
      reason,
      metadata
    });

    // Check if request is resolved
    const result = this.evaluateRequestStatus(request);
    
    if (result.isResolved) {
      request.status = result.status;
      
      // Cancel timeout
      this.timeoutManager.cancelTimeout(requestId);
      
      // Send resolution notifications
      await this.notificationService.sendDecisionNotifications(request, approvalDecision);
      
      // Emit completion event
      this.emit("request:resolved", { request, decision: approvalDecision });
      
      // Remove from pending if not approved (keep approved for execution tracking)
      if (result.status !== ApprovalStatus.APPROVED) {
        this.pendingRequests.delete(requestId);
      }
      
      logger.info(`Approval request resolved: ${requestId} -> ${result.status}`);
    } else {
      // Send decision notification to other approvers
      await this.notificationService.sendDecisionNotifications(request, approvalDecision);
      this.emit("request:decision", { request, decision: approvalDecision });
    }

    return approvalDecision;
  }

  /**
   * Request emergency bypass
   */
  async requestEmergencyBypass(
    requestId: string,
    bypassedBy: string,
    reason: string,
    emergencyContext: Record<string, any>
  ): Promise<ApprovalRequest> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    // Get policy for bypass validation
    const policy = await this.policyEngine.findApplicablePolicy(
      request.type, 
      request.operation, 
      request.context
    );

    if (!policy?.emergency.allowBypass) {
      throw new Error(`Emergency bypass not allowed for request type: ${request.type}`);
    }

    // Validate bypass permissions
    await this.validateBypassPermissions(bypassedBy, policy.emergency.bypassRoles);

    // Apply bypass
    request.status = ApprovalStatus.BYPASSED;
    request.bypassReason = reason;
    request.bypassedBy = bypassedBy;
    request.bypassedAt = new Date();

    // Audit log (critical)
    await this.auditService.logAction(requestId, "emergency_bypass", bypassedBy, {
      reason,
      emergencyContext,
      severity: "critical"
    }, "high");

    // Cancel timeout
    this.timeoutManager.cancelTimeout(requestId);

    // Send bypass notifications to security team
    await this.notificationService.sendBypassNotifications(request, bypassedBy, reason);

    // Emit bypass event
    this.emit("request:bypassed", { request, bypassedBy, reason });

    logger.warn(`Emergency bypass applied: ${requestId} by ${bypassedBy}`);
    return request;
  }

  // ===========================
  // Policy Management
  // ===========================

  /**
   * Create or update approval policy
   */
  async createPolicy(policy: Omit<ApprovalPolicy, "id" | "createdAt" | "updatedAt">): Promise<ApprovalPolicy> {
    const newPolicy: ApprovalPolicy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(newPolicy.id, newPolicy);
    
    logger.info(`Approval policy created: ${newPolicy.id} (${newPolicy.name})`);
    return newPolicy;
  }

  /**
   * Update existing policy
   */
  async updatePolicy(
    policyId: string, 
    updates: Partial<Omit<ApprovalPolicy, "id" | "createdAt">>
  ): Promise<ApprovalPolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date()
    };

    this.policies.set(policyId, updatedPolicy);
    
    logger.info(`Approval policy updated: ${policyId}`);
    return updatedPolicy;
  }

  // ===========================
  // Query Methods
  // ===========================

  /**
   * Get pending requests for a user
   */
  getPendingRequestsForUser(userId: string): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values())
      .filter(request => 
        request.status === ApprovalStatus.PENDING &&
        (request.approvers.includes(userId) || request.requestedBy === userId)
      )
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get request history with audit trail
   */
  async getRequestHistory(requestId: string): Promise<{
    request: ApprovalRequest | undefined;
    decisions: ApprovalDecision[];
    auditLog: ApprovalAuditEntry[];
    notifications: ApprovalNotification[];
  }> {
    const request = this.pendingRequests.get(requestId);
    const decisions = this.decisions.get(requestId) || [];
    const auditLog = await this.auditService.getAuditLog(requestId);
    const notifications = this.notifications.get(requestId) || [];

    return { request, decisions, auditLog, notifications };
  }

  /**
   * Get approval statistics
   */
  getApprovalStatistics(timeRange: { start: Date; end: Date }) {
    const requests = Array.from(this.pendingRequests.values())
      .filter(r => r.requestedAt >= timeRange.start && r.requestedAt <= timeRange.end);

    const stats = {
      total: requests.length,
      byStatus: {} as Record<ApprovalStatus, number>,
      byType: {} as Record<ApprovalType, number>,
      byLevel: {} as Record<ApprovalLevel, number>,
      avgProcessingTime: 0,
      bypassCount: 0,
      escalationCount: 0
    };

    requests.forEach(request => {
      stats.byStatus[request.status] = (stats.byStatus[request.status] || 0) + 1;
      stats.byType[request.type] = (stats.byType[request.type] || 0) + 1;
      stats.byLevel[request.level] = (stats.byLevel[request.level] || 0) + 1;
      
      if (request.status === ApprovalStatus.BYPASSED) {
        stats.bypassCount++;
      }
      
      stats.escalationCount += request.escalationHistory.length;
    });

    return stats;
  }

  // ===========================
  // Private Helper Methods
  // ===========================

  private evaluateRequestStatus(request: ApprovalRequest): { isResolved: boolean; status: ApprovalStatus } {
    const approvals = request.currentApprovals.filter(d => d.decision === "approve");
    const rejections = request.currentApprovals.filter(d => d.decision === "reject");

    // Check for rejection (any rejection resolves as rejected)
    if (rejections.length > 0) {
      return { isResolved: true, status: ApprovalStatus.REJECTED };
    }

    // Check for approval (required number of approvals)
    if (approvals.length >= request.requiredApprovals) {
      return { isResolved: true, status: ApprovalStatus.APPROVED };
    }

    return { isResolved: false, status: ApprovalStatus.PENDING };
  }

  private async validateApprover(request: ApprovalRequest, userId: string): Promise<void> {
    if (!request.approvers.includes(userId)) {
      throw new Error(`User ${userId} is not authorized to approve request ${request.id}`);
    }
  }

  private async validateBypassPermissions(userId: string, allowedRoles: string[]): Promise<void> {
    // This would integrate with your user management service
    // For now, implementing basic validation
    if (!allowedRoles || allowedRoles.length === 0) {
      throw new Error("No bypass roles configured");
    }
    // TODO: Implement actual role validation with user service
  }

  private async getApproversForPolicy(policy: ApprovalPolicy, context: ApprovalRequest["context"]): Promise<string[]> {
    // This would integrate with your user management service to get appropriate approvers
    // For now, returning basic implementation
    switch (policy.requirements.level) {
      case ApprovalLevel.USER:
        return [context.userId];
      case ApprovalLevel.ADMIN:
        return ["admin-user-id"]; // TODO: Get from user service
      case ApprovalLevel.SECURITY:
        return ["security-team-id"]; // TODO: Get from user service
      default:
        return [context.userId];
    }
  }

  private handleRequestTimeout(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== ApprovalStatus.PENDING) {
      return;
    }

    request.status = ApprovalStatus.EXPIRED;
    
    // Audit log
    this.auditService.logAction(requestId, "request_expired", "system", {
      reason: "timeout",
      expiresAt: request.expiresAt
    });

    // Send timeout notifications
    this.notificationService.sendTimeoutNotifications(request);

    // Emit timeout event
    this.emit("request:timeout", request);

    // Remove from pending
    this.pendingRequests.delete(requestId);

    logger.warn(`Approval request timed out: ${requestId}`);
  }

  private initializeDefaultPolicies(): void {
    // Code deployment policy
    this.createPolicy({
      name: "Code Deployment Approval",
      description: "Requires admin approval for code deployments",
      conditions: {
        types: [ApprovalType.CODE_DEPLOYMENT],
        riskLevels: ["medium", "high", "critical"],
        resourcePatterns: ["production/*", "staging/*"],
        userRoles: ["developer", "user"]
      },
      requirements: {
        level: ApprovalLevel.ADMIN,
        approverCount: 1,
        timeoutMinutes: 60,
        allowSelfApproval: false,
        requireAllApprovers: false
      },
      notifications: {
        channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
        immediateNotify: true,
        reminderIntervals: [15, 30],
        escalationNotify: true
      },
      emergency: {
        allowBypass: true,
        bypassRoles: ["admin", "security"],
        requireBypassReason: true,
        auditBypass: true
      },
      isActive: true,
      priority: 100
    });

    // Database changes policy
    this.createPolicy({
      name: "Database Changes Approval",
      description: "Requires security approval for database schema changes",
      conditions: {
        types: [ApprovalType.DATABASE_CHANGES],
        riskLevels: ["high", "critical"],
        resourcePatterns: ["database/*", "schema/*"],
        userRoles: ["developer", "user"]
      },
      requirements: {
        level: ApprovalLevel.SECURITY,
        approverCount: 2,
        timeoutMinutes: 120,
        allowSelfApproval: false,
        requireAllApprovers: true
      },
      notifications: {
        channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
        immediateNotify: true,
        reminderIntervals: [30, 60],
        escalationNotify: true
      },
      emergency: {
        allowBypass: false,
        bypassRoles: [],
        requireBypassReason: true,
        auditBypass: true
      },
      isActive: true,
      priority: 200
    });

    logger.info("Default approval policies initialized");
  }

  private startCleanupScheduler(): void {
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredRequests: string[] = [];

    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.status !== ApprovalStatus.PENDING && 
          now - request.requestedAt.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        expiredRequests.push(requestId);
      }
    }

    expiredRequests.forEach(requestId => {
      this.pendingRequests.delete(requestId);
      this.decisions.delete(requestId);
      this.notifications.delete(requestId);
    });

    if (expiredRequests.length > 0) {
      logger.info(`Cleaned up ${expiredRequests.length} expired approval requests`);
    }
  }
}

// ===========================
// Supporting Services
// ===========================

class NotificationService {
  async sendRequestNotifications(request: ApprovalRequest, policy: ApprovalPolicy): Promise<void> {
    // Implementation for sending notifications
    logger.info(`Sending request notifications for ${request.id}`);
  }

  async sendDecisionNotifications(request: ApprovalRequest, decision: ApprovalDecision): Promise<void> {
    // Implementation for sending decision notifications
    logger.info(`Sending decision notifications for ${request.id}`);
  }

  async sendBypassNotifications(request: ApprovalRequest, bypassedBy: string, reason: string): Promise<void> {
    // Implementation for sending bypass notifications
    logger.warn(`Sending bypass notifications for ${request.id}`);
  }

  async sendTimeoutNotifications(request: ApprovalRequest): Promise<void> {
    // Implementation for sending timeout notifications
    logger.warn(`Sending timeout notifications for ${request.id}`);
  }
}

class AuditService {
  private auditLog: Map<string, ApprovalAuditEntry[]> = new Map();

  async logAction(
    requestId: string, 
    action: string, 
    performedBy: string, 
    details: Record<string, any>,
    severity: string = "info"
  ): Promise<void> {
    const entry: ApprovalAuditEntry = {
      id: uuidv4(),
      requestId,
      action,
      performedBy,
      timestamp: new Date(),
      details
    };

    if (!this.auditLog.has(requestId)) {
      this.auditLog.set(requestId, []);
    }
    this.auditLog.get(requestId)?.push(entry);

    logger.info(`Audit log: ${action} by ${performedBy} for request ${requestId}`);
  }

  async getAuditLog(requestId: string): Promise<ApprovalAuditEntry[]> {
    return this.auditLog.get(requestId) || [];
  }
}

class PolicyEngine {
  async findApplicablePolicy(
    type: ApprovalType, 
    operation: ApprovalRequest["operation"], 
    context: ApprovalRequest["context"]
  ): Promise<ApprovalPolicy | null> {
    // Implementation for finding applicable policy based on conditions
    // For now, returning a default policy structure
    return null; // Will be populated by the service's default policies
  }
}

class TimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  scheduleTimeout(requestId: string, timeoutMs: number, callback: () => void): void {
    const timeout = setTimeout(callback, timeoutMs);
    this.timeouts.set(requestId, timeout);
  }

  cancelTimeout(requestId: string): void {
    const timeout = this.timeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(requestId);
    }
  }
}

// Export singleton instance
// TEMPORARILY DISABLED: Causing service initialization issues
// export const approvalGatesService = new ApprovalGatesService();
export const approvalGatesService = null as any; // Temporary placeholder