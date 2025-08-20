# Human Approval Gates System - Technical Specification

## Overview

The Human Approval Gates System provides comprehensive workflow management for critical AI decisions, ensuring human oversight and compliance for high-risk operations. This system integrates seamlessly with the AI Orchestration framework to provide automated approval workflows with robust audit trails.

## System Architecture

### Core Components

1. **Approval Gates Service** (`approval-gates.service.ts`)
   - Main workflow engine managing approval requests
   - Policy evaluation and enforcement
   - Queue management with timeout handling
   - Emergency bypass mechanisms

2. **Notification Service** (`approval-notifications.service.ts`)
   - Multi-channel notifications (Email, WebSocket, Slack, SMS, Webhooks)
   - Template-based messaging system
   - Delivery tracking and retry mechanisms
   - Recipient preference management

3. **Policy Engine**
   - Rule-based policy evaluation
   - Dynamic approval requirement assessment
   - Configurable approval levels and timeouts

4. **Audit System**
   - Comprehensive audit logging
   - Security monitoring for bypasses
   - Compliance reporting

## Technical Implementation

### Approval Types

```typescript
enum ApprovalType {
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
```

### Approval Levels

```typescript
enum ApprovalLevel {
  USER = "user",           // User approval required
  ADMIN = "admin",         // Admin approval required  
  SECURITY = "security",   // Security team approval
  EMERGENCY = "emergency", // Emergency approval (bypass with audit)
  SYSTEM = "system"        // System auto-approval (whitelisted operations)
}
```

### Data Models

#### ApprovalRequest
```typescript
interface ApprovalRequest {
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
  context: TaskContext;
  
  // Audit trail
  auditLog: ApprovalAuditEntry[];
  
  // Emergency bypass
  bypassReason?: string;
  bypassedBy?: string;
  bypassedAt?: Date;
}
```

#### ApprovalPolicy
```typescript
interface ApprovalPolicy {
  id: string;
  name: string;
  description: string;
  
  // Conditions for policy application
  conditions: {
    types: ApprovalType[];
    riskLevels: string[];
    resourcePatterns: string[];
    userRoles: string[];
    timeWindows?: { start: string; end: string }[];
  };
  
  // Approval requirements
  requirements: {
    level: ApprovalLevel;
    approverCount: number;
    timeoutMinutes: number;
    allowSelfApproval: boolean;
    requireAllApprovers: boolean;
  };
  
  // Notification configuration
  notifications: {
    channels: NotificationChannel[];
    immediateNotify: boolean;
    reminderIntervals: number[];
    escalationNotify: boolean;
  };
  
  // Emergency bypass settings
  emergency: {
    allowBypass: boolean;
    bypassRoles: string[];
    requireBypassReason: boolean;
    auditBypass: boolean;
  };
}
```

## API Endpoints

### Approval Request Management

#### Submit Approval Request
```http
POST /api/v1/ai/approval/requests
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "code_deployment",
  "operation": {
    "action": "deploy_to_production",
    "resource": "production/api-service",
    "riskLevel": "high",
    "impact": "Deploy new API version to production",
    "reversible": true,
    "parameters": {
      "version": "v2.1.0",
      "environment": "production"
    }
  },
  "title": "Deploy API Service v2.1.0",
  "description": "Deploy new API service version with performance improvements",
  "context": {
    "sessionId": "session_123",
    "taskChainId": "chain_456",
    "metadata": {
      "environment": "production",
      "deploymentType": "rolling"
    }
  }
}
```

#### Get Approval Requests
```http
GET /api/v1/ai/approval/requests?status=pending&assignedToMe=true&limit=20
Authorization: Bearer <token>
```

#### Make Approval Decision
```http
POST /api/v1/ai/approval/requests/{requestId}/decision
Content-Type: application/json
Authorization: Bearer <token>

{
  "decision": "approve",
  "reason": "Code review completed, all tests pass",
  "metadata": {
    "reviewedFiles": ["api.ts", "controller.ts"],
    "testResults": "all_pass"
  }
}
```

#### Emergency Bypass
```http
POST /api/v1/ai/approval/requests/{requestId}/bypass
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Critical production issue requires immediate deployment of hotfix",
  "emergencyContext": {
    "incidentId": "INC-12345",
    "severity": "critical",
    "affectedUsers": 10000
  }
}
```

## Integration with AI Orchestration

### Automatic Approval Detection

The system automatically analyzes AI task chains to determine if approval is required:

```typescript
// Task chain analysis for approval requirements
const requiresApproval = await checkApprovalRequirement(chain);

if (requiresApproval.required) {
  // Submit approval request
  const approvalRequest = await approvalGatesService.submitApprovalRequest(
    requiresApproval.type,
    requiresApproval.operation,
    chain.context
  );
  
  // Wait for approval before proceeding
  await waitForApproval(chainId, approvalRequest.id);
}
```

### Risk Assessment Criteria

1. **Code Deployment**: Any task involving code deployment or builds
2. **Database Operations**: Schema changes, migrations, data modifications
3. **Production Operations**: Operations in production environment
4. **High-Risk Tasks**: Infrastructure, security, or system-level changes
5. **Cost-Exceeding Operations**: Operations above configured cost thresholds

## Notification System

### Multi-Channel Support

1. **Email Notifications**
   - Rich HTML templates
   - Request details and action buttons
   - Reminder and escalation emails

2. **WebSocket Real-time**
   - Instant notifications to active sessions
   - Real-time status updates
   - Browser notifications

3. **Slack Integration**
   - Channel and direct message notifications
   - Interactive approval buttons
   - Thread-based conversations

4. **SMS Alerts**
   - Critical and urgent requests only
   - Brief notification with link to details

5. **Webhook Integration**
   - Custom integrations with external systems
   - Structured payload with full request data

### Notification Templates

Templates support variable substitution:

```typescript
const emailTemplate = {
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
    
    Please review and approve or reject this request.
  `,
  format: "html"
};
```

## Security Features

### Access Control

1. **Role-Based Permissions**
   - Approval permissions based on user roles
   - Hierarchical approval levels
   - Department-based approver assignment

2. **Request Validation**
   - Input sanitization and validation
   - Request rate limiting
   - Suspicious activity detection

3. **Audit Logging**
   - All actions logged with timestamps
   - IP address and user agent tracking
   - Tamper-evident audit trails

### Emergency Bypass Controls

1. **Strict Justification Requirements**
   - Minimum 10-character reason
   - Incident context required
   - Multiple approver validation for bypasses

2. **Security Monitoring**
   - Real-time alerts for bypass usage
   - Security team notifications
   - Bypass pattern analysis

3. **Compliance Reporting**
   - Automated bypass reports
   - Compliance dashboard
   - Audit trail exports

## Performance Optimizations

### Queue Management

1. **Efficient Storage**
   - In-memory queue for active requests
   - Database persistence for audit trails
   - Automatic cleanup of expired requests

2. **Timeout Handling**
   - Precise timeout management
   - Automatic request expiration
   - Escalation on approaching deadlines

3. **Notification Optimization**
   - Batch notification processing
   - Retry mechanisms with exponential backoff
   - Delivery status tracking

### Scalability Features

1. **Horizontal Scaling**
   - Stateless service design
   - Event-driven architecture
   - Load balancer compatible

2. **Performance Monitoring**
   - Request processing metrics
   - Notification delivery tracking
   - Queue depth monitoring

## Configuration Management

### Environment Variables

```bash
# Approval system configuration
APPROVAL_MAX_PENDING_REQUESTS=1000
APPROVAL_DEFAULT_TIMEOUT_MINUTES=60
APPROVAL_CLEANUP_INTERVAL_MS=3600000

# Notification configuration
NOTIFICATION_EMAIL_PROVIDER=sendgrid
NOTIFICATION_SLACK_TOKEN=xoxb-...
NOTIFICATION_SMS_PROVIDER=twilio

# Security configuration
APPROVAL_BYPASS_AUDIT_LEVEL=high
APPROVAL_MAX_RETRY_ATTEMPTS=3
```

### Policy Configuration

Policies can be configured via API or configuration files:

```json
{
  "name": "Production Deployment Policy",
  "conditions": {
    "types": ["code_deployment"],
    "riskLevels": ["high", "critical"],
    "resourcePatterns": ["production/*"]
  },
  "requirements": {
    "level": "admin",
    "approverCount": 2,
    "timeoutMinutes": 120
  },
  "notifications": {
    "channels": ["email", "slack"],
    "reminderIntervals": [30, 60]
  }
}
```

## Monitoring and Alerting

### Key Metrics

1. **Request Metrics**
   - Total requests per time period
   - Approval/rejection rates
   - Average processing time
   - Timeout/expiration rates

2. **Security Metrics**
   - Bypass frequency
   - Failed approval attempts
   - Unusual approval patterns

3. **Performance Metrics**
   - Queue depth
   - Notification delivery success rates
   - System response times

### Alert Thresholds

1. **High Priority Alerts**
   - Bypass rate > 10% of total requests
   - Queue depth > 80% of capacity
   - Notification delivery failure > 20%

2. **Security Alerts**
   - Any emergency bypass
   - Multiple failed approval attempts
   - Approval policy violations

## Disaster Recovery

### Backup Procedures

1. **Data Backup**
   - Hourly backup of approval requests
   - Daily backup of policies and configurations
   - Weekly backup of audit logs

2. **State Recovery**
   - Automatic request state restoration
   - Notification delivery retry on startup
   - Policy re-evaluation after recovery

### Failover Mechanisms

1. **Service Redundancy**
   - Multiple service instances
   - Load balancer health checks
   - Automatic failover

2. **Database Failover**
   - Primary/replica database setup
   - Automatic promotion of replicas
   - Data consistency verification

## Testing Strategy

### Unit Tests

- Service logic validation
- Policy evaluation testing
- Notification delivery testing
- Security control verification

### Integration Tests

- End-to-end approval workflows
- Multi-service integration testing
- Database transaction testing
- External service integration

### Security Tests

- Authorization bypass attempts
- Input validation testing
- Audit trail verification
- Notification security testing

## Deployment Guide

### Prerequisites

1. **Database Setup**
   - PostgreSQL database with approval tables
   - User permissions configured
   - Backup strategy implemented

2. **External Services**
   - Email service (SendGrid, AWS SES)
   - Slack workspace and bot token
   - SMS service (Twilio)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Start Service**
   ```bash
   npm run start:approval-gates
   ```

### Configuration Validation

```bash
# Test approval system health
curl http://localhost:4130/api/v1/ai/approval/health

# Validate policies
curl http://localhost:4130/api/v1/ai/approval/policies

# Test notification system
curl -X POST http://localhost:4130/api/v1/ai/approval/test/notifications
```

## Usage Examples

### Basic Approval Workflow

1. **Submit Request**
   ```javascript
   const request = await approvalGatesService.submitApprovalRequest(
     ApprovalType.CODE_DEPLOYMENT,
     {
       action: "deploy_application",
       resource: "production/web-app",
       riskLevel: "medium",
       impact: "Deploy new web application version",
       reversible: true
     },
     context
   );
   ```

2. **Process Decision**
   ```javascript
   const decision = await approvalGatesService.processDecision(
     requestId,
     approverId,
     "approve",
     "Code review passed, tests successful"
   );
   ```

### Emergency Bypass

```javascript
const bypassedRequest = await approvalGatesService.requestEmergencyBypass(
  requestId,
  bypassedBy,
  "Critical production issue - customer data at risk",
  {
    incidentId: "INC-12345",
    severity: "critical"
  }
);
```

### Policy Management

```javascript
const policy = await approvalGatesService.createPolicy({
  name: "Database Changes Policy",
  conditions: {
    types: [ApprovalType.DATABASE_CHANGES],
    riskLevels: ["high", "critical"]
  },
  requirements: {
    level: ApprovalLevel.SECURITY,
    approverCount: 2,
    timeoutMinutes: 240
  }
});
```

## Troubleshooting

### Common Issues

1. **Approval Requests Not Appearing**
   - Check user permissions and role assignments
   - Verify policy conditions match the request
   - Check queue capacity limits

2. **Notifications Not Delivered**
   - Verify external service configurations
   - Check recipient preferences and contact information
   - Review notification service logs

3. **Bypass Requests Failing**
   - Verify user has bypass permissions
   - Check bypass reason length requirements
   - Review bypass audit logs

### Debug Commands

```bash
# Check service health
curl http://localhost:4130/api/v1/ai/approval/health

# View active requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4130/api/v1/ai/approval/requests

# Check notification delivery status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4130/api/v1/ai/approval/notifications/status

# View audit logs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4130/api/v1/ai/approval/audit/{requestId}
```

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**
   - Predictive approval recommendations
   - Risk assessment automation
   - Pattern-based policy suggestions

2. **Advanced Analytics**
   - Approval trend analysis
   - Performance dashboards
   - Compliance reporting automation

3. **Enhanced Integration**
   - ServiceNow integration
   - Jira workflow integration
   - Microsoft Teams notifications

### API Versioning

The approval system supports API versioning for backward compatibility:

- v1: Current implementation
- v2: Planned ML-enhanced version
- v3: Advanced analytics and reporting

---

## Conclusion

The Human Approval Gates System provides a comprehensive, secure, and scalable solution for managing AI decision approvals. With robust audit trails, multi-channel notifications, and emergency bypass capabilities, it ensures both security and operational flexibility for AI-driven workflows.

For additional support or feature requests, please refer to the project documentation or contact the development team.