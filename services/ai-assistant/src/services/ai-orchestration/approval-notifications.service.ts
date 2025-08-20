/**
 * Approval Notifications Service
 * Handles multi-channel notifications for approval workflows
 */

import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";
import { 
  ApprovalRequest, 
  ApprovalDecision, 
  ApprovalPolicy, 
  NotificationChannel,
  ApprovalNotification
} from "./approval-gates.service";

// ===========================
// Notification Templates
// ===========================

interface NotificationTemplate {
  id: string;
  name: string;
  type: "request" | "reminder" | "escalation" | "decision" | "timeout" | "bypass";
  channels: NotificationChannel[];
  templates: {
    [key in NotificationChannel]?: {
      subject: string;
      body: string;
      format: "text" | "html" | "markdown";
    };
  };
  variables: string[];
  isActive: boolean;
}

interface NotificationRecipient {
  id: string;
  name?: string;
  email?: string;
  slackUserId?: string;
  websocketSessionId?: string;
  phoneNumber?: string;
  roles: string[];
  preferences: {
    channels: NotificationChannel[];
    urgencyThreshold: "low" | "medium" | "high" | "critical";
    quietHours?: { start: string; end: string };
    timezone?: string;
  };
}

interface NotificationDeliveryStatus {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  recipientId: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

// ===========================
// Enhanced Notification Service
// ===========================

export class ApprovalNotificationsService extends EventEmitter {
  private templates: Map<string, NotificationTemplate> = new Map();
  private recipients: Map<string, NotificationRecipient> = new Map();
  private deliveryStatus: Map<string, NotificationDeliveryStatus[]> = new Map();
  private pendingNotifications: Map<string, ApprovalNotification> = new Map();
  
  private emailProvider: EmailProvider;
  private slackProvider: SlackProvider;
  private websocketProvider: WebSocketProvider;
  private webhookProvider: WebhookProvider;
  private smsProvider: SMSProvider;
  
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 30000; // 30 seconds
  
  constructor() {
    super();
    this.setMaxListeners(50);
    
    // Initialize providers
    this.emailProvider = new EmailProvider();
    this.slackProvider = new SlackProvider();
    this.websocketProvider = new WebSocketProvider();
    this.webhookProvider = new WebhookProvider();
    this.smsProvider = new SMSProvider();
    
    this.initializeDefaultTemplates();
    this.setupRetryScheduler();
    
    logger.info("ApprovalNotificationsService initialized");
  }

  // ===========================
  // Main Notification Methods
  // ===========================

  /**
   * Send request notifications to approvers
   */
  async sendRequestNotifications(
    request: ApprovalRequest, 
    policy: ApprovalPolicy
  ): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_request", request.operation.riskLevel);
    if (!template) {
      throw new Error("No template found for approval request notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    for (const approverId of request.approvers) {
      const recipient = await this.getRecipient(approverId);
      if (!recipient) {
        logger.warn(`Recipient not found: ${approverId}`);
        continue;
      }

      // Filter channels based on recipient preferences and policy
      const channels = this.getActiveChannels(recipient, policy.notifications.channels, request.operation.riskLevel);
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          request, 
          recipient, 
          channel, 
          "request", 
          template
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    logger.info(`Sent ${notifications.length} request notifications for ${request.id}`);
    return notifications;
  }

  /**
   * Send decision notifications
   */
  async sendDecisionNotifications(
    request: ApprovalRequest, 
    decision: ApprovalDecision
  ): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_decision", request.operation.riskLevel);
    if (!template) {
      throw new Error("No template found for decision notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    // Notify requester
    const requesterRecipient = await this.getRecipient(request.requestedBy);
    if (requesterRecipient) {
      const channels = this.getActiveChannels(requesterRecipient, [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET], request.operation.riskLevel);
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          request, 
          requesterRecipient, 
          channel, 
          "decision", 
          template,
          { decision }
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    // Notify other approvers if still pending
    if (request.status === "pending") {
      const remainingApprovers = request.approvers.filter(id => 
        id !== decision.decidedBy && 
        !request.currentApprovals.some(d => d.decidedBy === id)
      );

      for (const approverId of remainingApprovers) {
        const recipient = await this.getRecipient(approverId);
        if (!recipient) continue;

        const channels = this.getActiveChannels(recipient, [NotificationChannel.WEBSOCKET], request.operation.riskLevel);
        
        for (const channel of channels) {
          const notification = await this.createNotification(
            request, 
            recipient, 
            channel, 
            "decision", 
            template,
            { decision, updateType: "progress" }
          );
          
          notifications.push(notification);
          await this.sendNotification(notification);
        }
      }
    }

    logger.info(`Sent ${notifications.length} decision notifications for ${request.id}`);
    return notifications;
  }

  /**
   * Send reminder notifications
   */
  async sendReminderNotifications(
    request: ApprovalRequest,
    reminderLevel: number = 1
  ): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_reminder", request.operation.riskLevel);
    if (!template) {
      throw new Error("No template found for reminder notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    // Get pending approvers
    const pendingApprovers = request.approvers.filter(id => 
      !request.currentApprovals.some(d => d.decidedBy === id)
    );

    for (const approverId of pendingApprovers) {
      const recipient = await this.getRecipient(approverId);
      if (!recipient) continue;

      // Escalate channels for higher reminder levels
      let channels = [NotificationChannel.EMAIL];
      if (reminderLevel >= 2) {
        channels.push(NotificationChannel.SLACK);
      }
      if (reminderLevel >= 3) {
        channels.push(NotificationChannel.SMS);
      }

      const activeChannels = this.getActiveChannels(recipient, channels, request.operation.riskLevel);
      
      for (const channel of activeChannels) {
        const notification = await this.createNotification(
          request, 
          recipient, 
          channel, 
          "reminder", 
          template,
          { reminderLevel, urgency: reminderLevel >= 2 ? "high" : "medium" }
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    logger.info(`Sent ${notifications.length} reminder notifications for ${request.id} (level ${reminderLevel})`);
    return notifications;
  }

  /**
   * Send escalation notifications
   */
  async sendEscalationNotifications(
    request: ApprovalRequest,
    escalationLevel: number,
    escalatedTo: string[]
  ): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_escalation", "critical");
    if (!template) {
      throw new Error("No template found for escalation notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    for (const recipientId of escalatedTo) {
      const recipient = await this.getRecipient(recipientId);
      if (!recipient) continue;

      // Use all available channels for escalations
      const channels = this.getActiveChannels(
        recipient, 
        [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.SMS], 
        "critical"
      );
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          request, 
          recipient, 
          channel, 
          "escalation", 
          template,
          { escalationLevel, urgency: "critical" }
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    logger.warn(`Sent ${notifications.length} escalation notifications for ${request.id} (level ${escalationLevel})`);
    return notifications;
  }

  /**
   * Send bypass notifications
   */
  async sendBypassNotifications(
    request: ApprovalRequest,
    bypassedBy: string,
    reason: string
  ): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_bypass", "critical");
    if (!template) {
      throw new Error("No template found for bypass notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    // Notify security team and admins
    const securityTeam = await this.getRecipientsByRole(["security", "admin"]);
    
    for (const recipient of securityTeam) {
      // Use all channels for security notifications
      const channels = [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.WEBHOOK];
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          request, 
          recipient, 
          channel, 
          "bypass", 
          template,
          { bypassedBy, reason, severity: "critical", securityAlert: true }
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    logger.error(`Sent ${notifications.length} bypass notifications for ${request.id} by ${bypassedBy}`);
    return notifications;
  }

  /**
   * Send timeout notifications
   */
  async sendTimeoutNotifications(request: ApprovalRequest): Promise<ApprovalNotification[]> {
    const template = this.getTemplate("approval_timeout", request.operation.riskLevel);
    if (!template) {
      throw new Error("No template found for timeout notifications");
    }

    const notifications: ApprovalNotification[] = [];
    
    // Notify requester and pending approvers
    const allRecipients = [request.requestedBy, ...request.approvers];
    const uniqueRecipients = [...new Set(allRecipients)];
    
    for (const recipientId of uniqueRecipients) {
      const recipient = await this.getRecipient(recipientId);
      if (!recipient) continue;

      const channels = this.getActiveChannels(
        recipient, 
        [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET], 
        request.operation.riskLevel
      );
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          request, 
          recipient, 
          channel, 
          "timeout", 
          template,
          { timeoutReason: "expired", originalTimeout: request.timeoutMs }
        );
        
        notifications.push(notification);
        await this.sendNotification(notification);
      }
    }

    logger.warn(`Sent ${notifications.length} timeout notifications for ${request.id}`);
    return notifications;
  }

  // ===========================
  // Template Management
  // ===========================

  /**
   * Create or update notification template
   */
  async createTemplate(template: Omit<NotificationTemplate, "id">): Promise<NotificationTemplate> {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: uuidv4()
    };

    this.templates.set(newTemplate.id, newTemplate);
    
    logger.info(`Notification template created: ${newTemplate.id} (${newTemplate.name})`);
    return newTemplate;
  }

  /**
   * Get template by type and urgency
   */
  private getTemplate(type: string, urgency: string): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => 
      t.type === type && t.isActive
    );
  }

  // ===========================
  // Recipient Management
  // ===========================

  /**
   * Register or update notification recipient
   */
  async registerRecipient(recipient: NotificationRecipient): Promise<void> {
    this.recipients.set(recipient.id, recipient);
    logger.info(`Notification recipient registered: ${recipient.id}`);
  }

  /**
   * Get recipient by ID
   */
  private async getRecipient(recipientId: string): Promise<NotificationRecipient | undefined> {
    return this.recipients.get(recipientId);
  }

  /**
   * Get recipients by role
   */
  private async getRecipientsByRole(roles: string[]): Promise<NotificationRecipient[]> {
    return Array.from(this.recipients.values()).filter(recipient =>
      recipient.roles.some(role => roles.includes(role))
    );
  }

  // ===========================
  // Delivery Management
  // ===========================

  /**
   * Send notification through appropriate channel
   */
  private async sendNotification(notification: ApprovalNotification): Promise<void> {
    this.pendingNotifications.set(notification.id, notification);
    
    const deliveryStatus: NotificationDeliveryStatus = {
      id: uuidv4(),
      notificationId: notification.id,
      channel: notification.channel,
      recipientId: notification.recipientId,
      status: "pending",
      retryCount: 0
    };

    if (!this.deliveryStatus.has(notification.id)) {
      this.deliveryStatus.set(notification.id, []);
    }
    this.deliveryStatus.get(notification.id)?.push(deliveryStatus);

    try {
      await this.deliverNotification(notification, deliveryStatus);
    } catch (error: any) {
      logger.error(`Failed to send notification ${notification.id}:`, error);
      deliveryStatus.status = "failed";
      deliveryStatus.failureReason = error.message;
      
      this.scheduleRetry(notification, deliveryStatus);
    }
  }

  /**
   * Deliver notification via specific channel
   */
  private async deliverNotification(
    notification: ApprovalNotification, 
    deliveryStatus: NotificationDeliveryStatus
  ): Promise<void> {
    deliveryStatus.status = "sent";
    deliveryStatus.sentAt = new Date();

    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        await this.emailProvider.send({
          to: notification.recipientId,
          subject: notification.content.subject,
          body: notification.content.body,
          isHtml: notification.content.data.format === "html"
        });
        break;

      case NotificationChannel.SLACK:
        await this.slackProvider.send({
          userId: notification.recipientId,
          message: notification.content.body,
          channel: notification.content.data.slackChannel,
          attachments: notification.content.data.attachments
        });
        break;

      case NotificationChannel.WEBSOCKET:
        await this.websocketProvider.send({
          sessionId: notification.recipientId,
          type: "approval_notification",
          data: {
            ...notification.content.data,
            subject: notification.content.subject,
            body: notification.content.body
          }
        });
        break;

      case NotificationChannel.WEBHOOK:
        await this.webhookProvider.send({
          url: notification.content.data.webhookUrl,
          payload: {
            notificationId: notification.id,
            type: notification.type,
            subject: notification.content.subject,
            body: notification.content.body,
            data: notification.content.data
          }
        });
        break;

      case NotificationChannel.SMS:
        await this.smsProvider.send({
          phoneNumber: notification.content.data.phoneNumber,
          message: notification.content.body
        });
        break;

      default:
        throw new Error(`Unsupported notification channel: ${notification.channel}`);
    }

    deliveryStatus.status = "delivered";
    deliveryStatus.deliveredAt = new Date();
    
    this.emit("notification:delivered", { notification, deliveryStatus });
  }

  /**
   * Schedule retry for failed notifications
   */
  private scheduleRetry(
    notification: ApprovalNotification, 
    deliveryStatus: NotificationDeliveryStatus
  ): void {
    if (deliveryStatus.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      logger.error(`Max retry attempts reached for notification ${notification.id}`);
      this.emit("notification:failed", { notification, deliveryStatus });
      return;
    }

    const delay = this.RETRY_DELAY_MS * Math.pow(2, deliveryStatus.retryCount); // Exponential backoff
    
    setTimeout(async () => {
      deliveryStatus.retryCount++;
      deliveryStatus.status = "pending";
      
      try {
        await this.deliverNotification(notification, deliveryStatus);
      } catch (error: any) {
        logger.error(`Retry failed for notification ${notification.id}:`, error);
        deliveryStatus.status = "failed";
        deliveryStatus.failureReason = error.message;
        
        this.scheduleRetry(notification, deliveryStatus);
      }
    }, delay);
  }

  // ===========================
  // Helper Methods
  // ===========================

  /**
   * Get active notification channels for recipient
   */
  private getActiveChannels(
    recipient: NotificationRecipient, 
    policyChannels: NotificationChannel[], 
    urgency: string
  ): NotificationChannel[] {
    const recipientChannels = recipient.preferences.channels;
    const isUrgent = ["high", "critical"].includes(urgency);
    
    // For urgent notifications, use all available channels
    if (isUrgent) {
      return policyChannels.filter(channel => 
        recipientChannels.includes(channel) || 
        channel === NotificationChannel.WEBSOCKET
      );
    }
    
    // For normal notifications, respect recipient preferences
    return policyChannels.filter(channel => recipientChannels.includes(channel));
  }

  /**
   * Create notification from template
   */
  private async createNotification(
    request: ApprovalRequest,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    type: ApprovalNotification["type"],
    template: NotificationTemplate,
    extraData: Record<string, any> = {}
  ): Promise<ApprovalNotification> {
    const templateContent = template.templates[channel];
    if (!templateContent) {
      throw new Error(`No template content for channel ${channel}`);
    }

    // Replace template variables
    const variables = {
      recipientName: recipient.name || recipient.id,
      requestId: request.id,
      requestTitle: request.title,
      requestDescription: request.description,
      requesterName: request.requestedBy,
      operationType: request.type,
      operationAction: request.operation.action,
      operationResource: request.operation.resource,
      riskLevel: request.operation.riskLevel,
      expiresAt: request.expiresAt.toISOString(),
      currentApprovals: request.currentApprovals.length,
      requiredApprovals: request.requiredApprovals,
      ...extraData
    };

    const subject = this.replaceVariables(templateContent.subject, variables);
    const body = this.replaceVariables(templateContent.body, variables);

    return {
      id: uuidv4(),
      requestId: request.id,
      recipientId: recipient.id,
      channel,
      type,
      content: {
        subject,
        body,
        data: {
          ...variables,
          format: templateContent.format,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Replace template variables
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    // Approval request template
    this.createTemplate({
      name: "Approval Request",
      type: "request",
      channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET, NotificationChannel.SLACK],
      templates: {
        [NotificationChannel.EMAIL]: {
          subject: "Approval Required: {{requestTitle}}",
          body: `
Hi {{recipientName}},

An approval request requires your attention:

Request: {{requestTitle}}
Type: {{operationType}}
Risk Level: {{riskLevel}}
Requested by: {{requesterName}}
Expires: {{expiresAt}}

Description:
{{requestDescription}}

Operation Details:
- Action: {{operationAction}}
- Resource: {{operationResource}}

Please review and approve or reject this request.

Current Status: {{currentApprovals}}/{{requiredApprovals}} approvals received.
          `,
          format: "text"
        },
        [NotificationChannel.WEBSOCKET]: {
          subject: "Approval Required",
          body: "{{requestTitle}} requires your approval",
          format: "text"
        },
        [NotificationChannel.SLACK]: {
          subject: "Approval Required",
          body: `🔔 *Approval Required*\n\n*Request:* {{requestTitle}}\n*Type:* {{operationType}}\n*Risk:* {{riskLevel}}\n*Expires:* {{expiresAt}}\n\n{{requestDescription}}`,
          format: "markdown"
        }
      },
      variables: ["recipientName", "requestTitle", "operationType", "riskLevel", "requesterName", "expiresAt", "requestDescription", "operationAction", "operationResource", "currentApprovals", "requiredApprovals"],
      isActive: true
    });

    // Additional templates would be created here...
    
    logger.info("Default notification templates initialized");
  }

  /**
   * Setup retry scheduler
   */
  private setupRetryScheduler(): void {
    // Cleanup completed notifications every hour
    setInterval(() => {
      this.cleanupCompletedNotifications();
    }, 3600000);
  }

  /**
   * Cleanup completed notifications
   */
  private cleanupCompletedNotifications(): void {
    const now = Date.now();
    const cutoff = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [notificationId, notification] of this.pendingNotifications.entries()) {
      if (now - new Date(notification.sentAt || 0).getTime() > cutoff) {
        this.pendingNotifications.delete(notificationId);
        this.deliveryStatus.delete(notificationId);
      }
    }
  }
}

// ===========================
// Channel Providers
// ===========================

class EmailProvider {
  async send(params: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<void> {
    // Integration with email service (SendGrid, AWS SES, etc.)
    logger.info(`Email sent to ${params.to}: ${params.subject}`);
  }
}

class SlackProvider {
  async send(params: {
    userId: string;
    message: string;
    channel?: string;
    attachments?: any[];
  }): Promise<void> {
    // Integration with Slack API
    logger.info(`Slack message sent to ${params.userId}: ${params.message}`);
  }
}

class WebSocketProvider {
  async send(params: {
    sessionId: string;
    type: string;
    data: any;
  }): Promise<void> {
    // Integration with WebSocket service
    logger.info(`WebSocket message sent to ${params.sessionId}: ${params.type}`);
  }
}

class WebhookProvider {
  async send(params: {
    url: string;
    payload: any;
  }): Promise<void> {
    // HTTP POST to webhook URL
    logger.info(`Webhook sent to ${params.url}`);
  }
}

class SMSProvider {
  async send(params: {
    phoneNumber: string;
    message: string;
  }): Promise<void> {
    // Integration with SMS service (Twilio, AWS SNS, etc.)
    logger.info(`SMS sent to ${params.phoneNumber}: ${params.message}`);
  }
}

// Export singleton instance
export const approvalNotificationsService = new ApprovalNotificationsService();