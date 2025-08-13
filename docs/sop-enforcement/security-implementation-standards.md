# 🔐 Security Implementation Standards - Terminal WebSocket Refactor

> **Status**: MANDATORY SECURITY REQUIREMENTS  
> **Compliance**: ZERO HARDCODED SECURITY VALUES  
> **Date**: 2025-08-13  

## 🚨 CRITICAL SECURITY VIOLATIONS FOUND

### Current Security Issues in Refactor Plan:
1. **No authentication configuration specified**
2. **Missing security environment variables**
3. **No rate limiting configuration**
4. **Missing input validation standards**
5. **No security monitoring requirements**

## 🛡️ MANDATORY Security Configuration

### 1. Authentication & Authorization

#### Environment Variables Required:
```bash
# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256

# WebSocket Authentication
WS_AUTH_REQUIRED=true
WS_AUTH_TIMEOUT=5000
WS_REQUIRE_HTTPS=true

# API Authentication
API_AUTH_REQUIRED=true
API_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
API_CSRF_ENABLED=true

# Role-Based Access Control
RBAC_ENABLED=true
RBAC_ADMIN_EMAILS=admin@yourdomain.com
RBAC_DEFAULT_ROLE=user
```

#### Configuration Module:
```typescript
// /src/config/security.config.ts
interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  websocket: {
    authRequired: boolean;
    authTimeout: number;
    requireHttps: boolean;
  };
  api: {
    authRequired: boolean;
    corsOrigins: string[];
    csrfEnabled: boolean;
  };
  rbac: {
    enabled: boolean;
    adminEmails: string[];
    defaultRole: string;
  };
}

export const securityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET_KEY || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  websocket: {
    authRequired: process.env.WS_AUTH_REQUIRED === 'true',
    authTimeout: parseInt(process.env.WS_AUTH_TIMEOUT || '5000'),
    requireHttps: process.env.WS_REQUIRE_HTTPS === 'true'
  },
  api: {
    authRequired: process.env.API_AUTH_REQUIRED === 'true',
    corsOrigins: (process.env.API_CORS_ORIGINS || '').split(',').filter(Boolean),
    csrfEnabled: process.env.API_CSRF_ENABLED === 'true'
  },
  rbac: {
    enabled: process.env.RBAC_ENABLED === 'true',
    adminEmails: (process.env.RBAC_ADMIN_EMAILS || '').split(',').filter(Boolean),
    defaultRole: process.env.RBAC_DEFAULT_ROLE || 'user'
  }
};
```

### 2. Rate Limiting & DDoS Protection

#### Environment Variables:
```bash
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_SKIP_SUCCESS=false

# Connection Limits
MAX_CONCURRENT_CONNECTIONS=1000
MAX_CONNECTIONS_PER_IP=10
CONNECTION_TIMEOUT_MS=30000

# DDoS Protection
DDOS_PROTECTION_ENABLED=true
DDOS_BURST_SIZE=20
DDOS_RATE_LIMIT=2
DDOS_BAN_DURATION=300000
```

#### Implementation:
```typescript
// /src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';
import { securityConfig } from '@/config/security.config';

export const createRateLimiter = () => {
  if (!process.env.RATE_LIMIT_ENABLED) {
    throw new Error('RATE_LIMIT_ENABLED must be configured');
  }

  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
      error: 'Too many requests from this IP',
      retryAfter: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true' ? (req, res) => res.statusCode < 400 : undefined
  });
};

// WebSocket Rate Limiting
export class WebSocketRateLimiter {
  private connections = new Map<string, { count: number; lastReset: number }>();
  private readonly maxConnections: number;
  private readonly windowMs: number;

  constructor() {
    this.maxConnections = parseInt(process.env.MAX_CONNECTIONS_PER_IP || '10');
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  }

  checkLimit(ip: string): boolean {
    const now = Date.now();
    const connection = this.connections.get(ip);

    if (!connection || now - connection.lastReset > this.windowMs) {
      this.connections.set(ip, { count: 1, lastReset: now });
      return true;
    }

    if (connection.count >= this.maxConnections) {
      return false;
    }

    connection.count++;
    return true;
  }
}
```

### 3. Input Validation & Sanitization

#### Environment Variables:
```bash
# Input Validation
INPUT_VALIDATION_ENABLED=true
MAX_INPUT_LENGTH=10000
MAX_COMMAND_LENGTH=500
BLOCKED_COMMANDS=rm,sudo,chmod,chown,passwd
ALLOWED_COMMANDS_ONLY=false

# Path Security
PATH_TRAVERSAL_PROTECTION=true
ALLOWED_PATHS=/home/user,/tmp/safe
BLOCKED_EXTENSIONS=.exe,.bat,.cmd,.com,.scr
```

#### Implementation:
```typescript
// /src/security/input-validator.ts
interface ValidationConfig {
  maxInputLength: number;
  maxCommandLength: number;
  blockedCommands: string[];
  allowedCommandsOnly: boolean;
  pathTraversalProtection: boolean;
  allowedPaths: string[];
  blockedExtensions: string[];
}

export class InputValidator {
  private config: ValidationConfig;

  constructor() {
    this.config = {
      maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000'),
      maxCommandLength: parseInt(process.env.MAX_COMMAND_LENGTH || '500'),
      blockedCommands: (process.env.BLOCKED_COMMANDS || '').split(',').filter(Boolean),
      allowedCommandsOnly: process.env.ALLOWED_COMMANDS_ONLY === 'true',
      pathTraversalProtection: process.env.PATH_TRAVERSAL_PROTECTION === 'true',
      allowedPaths: (process.env.ALLOWED_PATHS || '').split(',').filter(Boolean),
      blockedExtensions: (process.env.BLOCKED_EXTENSIONS || '').split(',').filter(Boolean)
    };
  }

  validateInput(input: string): ValidationResult {
    const errors: string[] = [];

    // Length validation
    if (input.length > this.config.maxInputLength) {
      errors.push(`Input exceeds maximum length of ${this.config.maxInputLength}`);
    }

    // Command validation
    const command = input.trim().split(' ')[0];
    if (command.length > this.config.maxCommandLength) {
      errors.push(`Command exceeds maximum length of ${this.config.maxCommandLength}`);
    }

    // Blocked commands
    if (this.config.blockedCommands.includes(command)) {
      errors.push(`Command '${command}' is not allowed`);
    }

    // Path traversal protection
    if (this.config.pathTraversalProtection && input.includes('..')) {
      errors.push('Path traversal detected');
    }

    // Dangerous patterns
    const dangerousPatterns = [
      /\$\([^)]+\)/,  // Command substitution
      /`[^`]+`/,      // Backticks
      /\|\|/,         // OR operator
      /&&/,           // AND operator
      /[;&|]/         // Command separators
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        errors.push('Potentially dangerous command pattern detected');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedInput: this.sanitizeInput(input)
    };
  }

  private sanitizeInput(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > this.config.maxInputLength) {
      sanitized = sanitized.substring(0, this.config.maxInputLength);
    }

    return sanitized;
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedInput: string;
}
```

### 4. Secure WebSocket Implementation

#### Environment Variables:
```bash
# WebSocket Security
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=5000
WS_MAX_MESSAGE_SIZE=1048576
WS_COMPRESSION=false
WS_PERMESSAGE_DEFLATE=false

# Connection Security
CONNECTION_IDLE_TIMEOUT=300000
CONNECTION_MAX_LIFETIME=3600000
CONNECTION_CLEANUP_INTERVAL=60000
```

#### Implementation:
```typescript
// /src/websocket/secure-websocket.ts
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { securityConfig } from '@/config/security.config';
import { InputValidator } from '@/security/input-validator';
import { WebSocketRateLimiter } from '@/middleware/rate-limiter';

export class SecureWebSocketManager {
  private rateLimiter: WebSocketRateLimiter;
  private inputValidator: InputValidator;
  private connections = new Map<string, SecureConnection>();
  
  constructor() {
    this.rateLimiter = new WebSocketRateLimiter();
    this.inputValidator = new InputValidator();
  }

  authenticate(request: IncomingMessage): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      const token = this.extractToken(request);
      
      if (!token && securityConfig.websocket.authRequired) {
        reject(new Error('Authentication required'));
        return;
      }

      // JWT validation
      try {
        const payload = this.validateJWT(token);
        resolve({ 
          isValid: true, 
          userId: payload.userId,
          permissions: payload.permissions 
        });
      } catch (error) {
        reject(new Error('Invalid authentication token'));
      }
    });
  }

  handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const ip = this.getClientIP(request);
      
      // Rate limiting check
      if (!this.rateLimiter.checkLimit(ip)) {
        ws.close(1008, 'Rate limit exceeded');
        reject(new Error('Rate limit exceeded'));
        return;
      }

      try {
        // Authentication
        const auth = await this.authenticate(request);
        
        // Create secure connection
        const connection = new SecureConnection(ws, auth, ip);
        this.connections.set(connection.id, connection);

        // Set up connection security
        this.setupConnectionSecurity(connection);
        
        resolve();
      } catch (error) {
        ws.close(1008, 'Authentication failed');
        reject(error);
      }
    });
  }

  private setupConnectionSecurity(connection: SecureConnection): void {
    const { ws } = connection;

    // Message size limiting
    const maxSize = parseInt(process.env.WS_MAX_MESSAGE_SIZE || '1048576');
    ws.on('message', (data) => {
      if (data.length > maxSize) {
        connection.close(1009, 'Message too large');
        return;
      }

      this.handleSecureMessage(connection, data);
    });

    // Heartbeat
    const heartbeatInterval = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
    connection.startHeartbeat(heartbeatInterval);

    // Idle timeout
    const idleTimeout = parseInt(process.env.CONNECTION_IDLE_TIMEOUT || '300000');
    connection.setIdleTimeout(idleTimeout);

    // Connection lifetime limit
    const maxLifetime = parseInt(process.env.CONNECTION_MAX_LIFETIME || '3600000');
    setTimeout(() => {
      connection.close(1000, 'Connection lifetime exceeded');
    }, maxLifetime);
  }

  private handleSecureMessage(connection: SecureConnection, data: Buffer): void {
    try {
      const message = data.toString('utf8');
      
      // Input validation
      const validation = this.inputValidator.validateInput(message);
      if (!validation.isValid) {
        connection.send({
          type: 'error',
          message: 'Invalid input: ' + validation.errors.join(', ')
        });
        return;
      }

      // Process validated message
      this.processMessage(connection, validation.sanitizedInput);
    } catch (error) {
      connection.close(1003, 'Invalid message format');
    }
  }

  private extractToken(request: IncomingMessage): string | null {
    // Try Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const url = new URL(request.url!, `http://${request.headers.host}`);
    return url.searchParams.get('token');
  }

  private getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
  }
}

class SecureConnection {
  public readonly id: string;
  public readonly ws: WebSocket;
  public readonly auth: AuthResult;
  public readonly ip: string;
  private heartbeatTimer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;
  private lastActivity: number;

  constructor(ws: WebSocket, auth: AuthResult, ip: string) {
    this.id = crypto.randomUUID();
    this.ws = ws;
    this.auth = auth;
    this.ip = ip;
    this.lastActivity = Date.now();
  }

  startHeartbeat(interval: number): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, interval);
  }

  setIdleTimeout(timeout: number): void {
    this.resetIdleTimeout(timeout);
  }

  private resetIdleTimeout(timeout: number): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.close(1000, 'Connection idle timeout');
    }, timeout);
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    if (this.idleTimer) {
      this.resetIdleTimeout(parseInt(process.env.CONNECTION_IDLE_TIMEOUT || '300000'));
    }
  }

  send(data: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      this.updateActivity();
    }
  }

  close(code: number, reason: string): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.ws.close(code, reason);
  }
}

interface AuthResult {
  isValid: boolean;
  userId: string;
  permissions: string[];
}
```

### 5. Security Monitoring & Logging

#### Environment Variables:
```bash
# Security Logging
SECURITY_LOGGING_ENABLED=true
SECURITY_LOG_LEVEL=warn
SECURITY_LOG_FILE=/var/log/security.log
SECURITY_LOG_MAX_SIZE=100MB
SECURITY_LOG_RETENTION_DAYS=90

# Security Monitoring
SECURITY_MONITORING_ENABLED=true
FAILED_AUTH_THRESHOLD=5
FAILED_AUTH_WINDOW_MS=300000
SUSPICIOUS_ACTIVITY_ENABLED=true
INTRUSION_DETECTION_ENABLED=true

# Alerts
SECURITY_ALERTS_ENABLED=true
ALERT_WEBHOOK_URL=https://your-monitoring.com/webhooks/security
ALERT_EMAIL_RECIPIENTS=security@yourdomain.com
```

#### Implementation:
```typescript
// /src/security/security-monitor.ts
interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  ip: string;
  userId?: string;
  details: any;
  timestamp: Date;
}

enum SecurityEventType {
  AUTHENTICATION_FAILED = 'auth_failed',
  AUTHENTICATION_SUCCESS = 'auth_success',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_INPUT = 'suspicious_input',
  CONNECTION_REJECTED = 'connection_rejected',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  INTRUSION_DETECTED = 'intrusion_detected'
}

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private failedAuthAttempts = new Map<string, { count: number; lastAttempt: number }>();
  
  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Log to file/database
    this.persistEvent(securityEvent);
    
    // Check for patterns
    this.analyzeEvent(securityEvent);
    
    // Send alerts if needed
    if (securityEvent.severity === 'high' || securityEvent.severity === 'critical') {
      this.sendAlert(securityEvent);
    }
  }

  private analyzeEvent(event: SecurityEvent): void {
    switch (event.type) {
      case SecurityEventType.AUTHENTICATION_FAILED:
        this.trackFailedAuth(event.ip);
        break;
      case SecurityEventType.SUSPICIOUS_INPUT:
        this.checkSuspiciousActivity(event.ip);
        break;
    }
  }

  private trackFailedAuth(ip: string): void {
    const threshold = parseInt(process.env.FAILED_AUTH_THRESHOLD || '5');
    const windowMs = parseInt(process.env.FAILED_AUTH_WINDOW_MS || '300000');
    
    const now = Date.now();
    const record = this.failedAuthAttempts.get(ip);
    
    if (!record || now - record.lastAttempt > windowMs) {
      this.failedAuthAttempts.set(ip, { count: 1, lastAttempt: now });
      return;
    }
    
    record.count++;
    record.lastAttempt = now;
    
    if (record.count >= threshold) {
      this.logSecurityEvent({
        type: SecurityEventType.INTRUSION_DETECTED,
        severity: 'critical',
        source: 'auth-monitor',
        ip,
        details: { failedAttempts: record.count, timeWindow: windowMs }
      });
    }
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    if (!process.env.SECURITY_ALERTS_ENABLED) return;

    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    const emailRecipients = process.env.ALERT_EMAIL_RECIPIENTS;

    // Send webhook alert
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'Security Event',
            severity: event.severity,
            event: event.type,
            source: event.source,
            ip: event.ip,
            timestamp: event.timestamp.toISOString(),
            details: event.details
          })
        });
      } catch (error) {
        console.error('Failed to send security alert:', error);
      }
    }

    // Send email alert (implement based on your email service)
    if (emailRecipients) {
      // Email implementation here
    }
  }

  private startMonitoring(): void {
    // Clean up old events every hour
    setInterval(() => {
      const retentionMs = parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || '90') * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - retentionMs);
      this.events = this.events.filter(event => event.timestamp > cutoff);
    }, 60 * 60 * 1000);
  }
}
```

## 🔒 Security Validation Requirements

### Pre-deployment Security Checklist:
- [ ] All security environment variables configured
- [ ] JWT secret is strong (minimum 32 characters)
- [ ] Rate limiting properly configured
- [ ] Input validation working for all inputs
- [ ] WebSocket authentication working
- [ ] Security monitoring enabled
- [ ] Security logging configured
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] No hardcoded security values anywhere

### Security Testing Requirements:
- [ ] Authentication bypass attempts fail
- [ ] Rate limiting blocks excessive requests
- [ ] Input validation rejects malicious inputs
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Path traversal attempts blocked
- [ ] Command injection attempts blocked
- [ ] Security monitoring detects attacks
- [ ] Alerts are sent for security events

## 📊 Security Metrics to Monitor:

### Required Metrics:
```yaml
# Authentication Metrics
failed_authentication_attempts_total
successful_authentication_attempts_total
authentication_token_renewals_total

# Rate Limiting Metrics
rate_limit_exceeded_total
connection_rejections_total
request_throttling_total

# Security Events
security_events_total{type="suspicious_input"}
security_events_total{type="intrusion_detected"}
security_alerts_sent_total{severity="critical"}

# Connection Security
websocket_connection_security_failures_total
websocket_message_validation_failures_total
websocket_connection_duration_seconds
```

---

**🚨 CRITICAL**: การไม่ implement security standards เหล่านี้จะทำให้ระบบเสี่ยงต่อการโจมตี และผิด SOPs อย่างร้ายแรง