# 🔧 Configuration Templates - Zero Hardcoding Compliance

> **Purpose**: ใช้แทนทุก hardcoded values ในโปรเจค  
> **Policy**: ZERO hardcoded values อนุญาต  
> **Status**: ต้องใช้ในทุก implementation  

## 📋 Terminal WebSocket Configuration Template

### 1. Environment Variables Template (.env.example)

```bash
# ===========================================
# TERMINAL WEBSOCKET REFACTOR CONFIGURATION
# ===========================================

# WebSocket Server Configuration
TERMINAL_WS_PORT=4001
CLAUDE_WS_PORT=4002
WS_HOST=127.0.0.1
WS_PROTOCOL=ws
WS_TIMEOUT=5000
WS_RECONNECT_ATTEMPTS=3
WS_RECONNECT_DELAY=1000

# API Configuration
API_BASE_URL=http://localhost:4000
API_TIMEOUT=30000
HEALTH_ENDPOINT=/api/health
METRICS_ENDPOINT=/api/metrics

# Security Configuration
WS_AUTH_REQUIRED=true
JWT_SECRET_KEY=your-jwt-secret-here
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Session Management
MAX_TERMINAL_SESSIONS=50
MAX_SESSIONS_PER_PROJECT=20
MAX_FOCUSED_PER_PROJECT=10
SESSION_TIMEOUT=300000

# Memory Management
MEMORY_RSS_WARNING=2048
MEMORY_RSS_EMERGENCY=6144
MEMORY_HEAP_WARNING=4000
MEMORY_CLEANUP_INTERVAL=300000
MEMORY_EMERGENCY_CHECK=120000

# Performance Settings
TERMINAL_SWITCH_DEBOUNCE=500
QUEUE_PROCESS_DELAY=100
OPERATION_QUEUE_DELAY=50
BACKGROUND_CHECK_INTERVAL=2000

# Monitoring & Logging
LOG_LEVEL=info
METRICS_COLLECTION_ENABLED=true
METRICS_INTERVAL=10000
HEALTH_CHECK_INTERVAL=30000

# Development vs Production
NODE_ENV=development
DEBUG_TERMINAL=false
ENABLE_DETAILED_LOGGING=false
```

### 2. Centralized Configuration Module

```typescript
// /src/config/terminal-refactor.config.ts
/**
 * Terminal WebSocket Refactor Configuration
 * ZERO HARDCODING POLICY COMPLIANT
 * All values must come from environment variables
 */

interface TerminalRefactorConfig {
  websocket: WebSocketConfig;
  api: ApiConfig;
  security: SecurityConfig;
  sessions: SessionConfig;
  memory: MemoryConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
}

interface WebSocketConfig {
  systemPort: number;
  claudePort: number;
  host: string;
  protocol: 'ws' | 'wss';
  timeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  endpoints: {
    health: string;
    metrics: string;
    sessions: string;
    websocket: string;
  };
}

interface SecurityConfig {
  authRequired: boolean;
  jwtSecret: string;
  rateLimiting: {
    maxRequests: number;
    windowMs: number;
  };
}

interface SessionConfig {
  maxTotal: number;
  maxPerProject: number;
  maxFocusedPerProject: number;
  timeoutMs: number;
  naming: {
    prefix: string;
    separator: string;
  };
}

interface MemoryConfig {
  thresholds: {
    rssWarning: number;
    rssEmergency: number;
    heapWarning: number;
  };
  cleanup: {
    interval: number;
    emergencyCheckInterval: number;
  };
}

interface PerformanceConfig {
  debounce: {
    switchMs: number;
    queueProcessDelay: number;
    operationQueueDelay: number;
  };
  backgroundCheckInterval: number;
}

interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsEnabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  detailedLogging: boolean;
}

export const terminalRefactorConfig: TerminalRefactorConfig = {
  websocket: {
    systemPort: parseInt(process.env.TERMINAL_WS_PORT || '4001'),
    claudePort: parseInt(process.env.CLAUDE_WS_PORT || '4002'),
    host: process.env.WS_HOST || '127.0.0.1',
    protocol: (process.env.WS_PROTOCOL as 'ws' | 'wss') || 'ws',
    timeout: parseInt(process.env.WS_TIMEOUT || '5000'),
    reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || '3'),
    reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || '1000')
  },

  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    endpoints: {
      health: process.env.HEALTH_ENDPOINT || '/api/health',
      metrics: process.env.METRICS_ENDPOINT || '/api/metrics',
      sessions: process.env.SESSIONS_ENDPOINT || '/api/terminal/sessions',
      websocket: process.env.WS_ENDPOINT || '/terminal'
    }
  },

  security: {
    authRequired: process.env.WS_AUTH_REQUIRED === 'true',
    jwtSecret: process.env.JWT_SECRET_KEY || '',
    rateLimiting: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
    }
  },

  sessions: {
    maxTotal: parseInt(process.env.MAX_TERMINAL_SESSIONS || '50'),
    maxPerProject: parseInt(process.env.MAX_SESSIONS_PER_PROJECT || '20'),
    maxFocusedPerProject: parseInt(process.env.MAX_FOCUSED_PER_PROJECT || '10'),
    timeoutMs: parseInt(process.env.SESSION_TIMEOUT || '300000'),
    naming: {
      prefix: process.env.TERMINAL_NAME_PREFIX || 'Terminal',
      separator: process.env.TERMINAL_NAME_SEPARATOR || ' '
    }
  },

  memory: {
    thresholds: {
      rssWarning: parseInt(process.env.MEMORY_RSS_WARNING || '2048'),
      rssEmergency: parseInt(process.env.MEMORY_RSS_EMERGENCY || '6144'),
      heapWarning: parseInt(process.env.MEMORY_HEAP_WARNING || '4000')
    },
    cleanup: {
      interval: parseInt(process.env.MEMORY_CLEANUP_INTERVAL || '300000'),
      emergencyCheckInterval: parseInt(process.env.MEMORY_EMERGENCY_CHECK || '120000')
    }
  },

  performance: {
    debounce: {
      switchMs: parseInt(process.env.TERMINAL_SWITCH_DEBOUNCE || '500'),
      queueProcessDelay: parseInt(process.env.QUEUE_PROCESS_DELAY || '100'),
      operationQueueDelay: parseInt(process.env.OPERATION_QUEUE_DELAY || '50')
    },
    backgroundCheckInterval: parseInt(process.env.BACKGROUND_CHECK_INTERVAL || '2000')
  },

  monitoring: {
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    metricsEnabled: process.env.METRICS_COLLECTION_ENABLED === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '10000'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
    detailedLogging: process.env.ENABLE_DETAILED_LOGGING === 'true'
  }
};

// Helper Functions (REQUIRED for all URL generation)

/**
 * Get WebSocket URL with proper protocol and port
 * ✅ ZERO HARDCODING COMPLIANT
 */
export function getWebSocketUrl(type: 'system' | 'claude' = 'system'): string {
  const { websocket } = terminalRefactorConfig;
  const port = type === 'system' ? websocket.systemPort : websocket.claudePort;
  return `${websocket.protocol}://${websocket.host}:${port}${terminalRefactorConfig.api.endpoints.websocket}`;
}

/**
 * Get API URL for HTTP requests
 * ✅ ZERO HARDCODING COMPLIANT
 */
export function getApiUrl(endpoint: string): string {
  const { api } = terminalRefactorConfig;
  return `${api.baseUrl}${endpoint}`;
}

/**
 * Get full API endpoint URL
 * ✅ ZERO HARDCODING COMPLIANT
 */
export function getApiEndpoint(endpoint: keyof typeof terminalRefactorConfig.api.endpoints): string {
  return getApiUrl(terminalRefactorConfig.api.endpoints[endpoint]);
}

/**
 * Validate configuration on startup
 * ✅ ZERO HARDCODING COMPLIANT
 */
export function validateTerminalRefactorConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'TERMINAL_WS_PORT',
    'CLAUDE_WS_PORT', 
    'WS_HOST',
    'API_BASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      errors.push(`Missing required environment variables: ${missing.join(', ')}`);
    } else {
      warnings.push(`Missing environment variables (using defaults): ${missing.join(', ')}`);
    }
  }

  // Validate port ranges
  const { websocket } = terminalRefactorConfig;
  if (websocket.systemPort < 1024 || websocket.systemPort > 65535) {
    errors.push(`Invalid TERMINAL_WS_PORT: ${websocket.systemPort}`);
  }
  
  if (websocket.claudePort < 1024 || websocket.claudePort > 65535) {
    errors.push(`Invalid CLAUDE_WS_PORT: ${websocket.claudePort}`);
  }

  // Validate security settings
  if (terminalRefactorConfig.security.authRequired && !terminalRefactorConfig.security.jwtSecret) {
    errors.push('JWT_SECRET_KEY is required when WS_AUTH_REQUIRED=true');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export default terminalRefactorConfig;
```

### 3. Dynamic URL Generation Examples

#### ❌ WRONG - Hardcoded Values
```typescript
// DON'T DO THIS - POLICY VIOLATION
const systemWs = new WebSocket('ws://localhost:4001');
const claudeWs = new WebSocket('ws://localhost:4002');
const healthCheck = fetch('http://localhost:4000/api/health');
```

#### ✅ CORRECT - Dynamic Configuration
```typescript
// DO THIS - POLICY COMPLIANT
import { getWebSocketUrl, getApiEndpoint } from '@/config/terminal-refactor.config';

const systemWs = new WebSocket(getWebSocketUrl('system'));
const claudeWs = new WebSocket(getWebSocketUrl('claude'));
const healthCheck = fetch(getApiEndpoint('health'));
```

### 4. Docker Configuration Template

#### docker-compose.yml
```yaml
version: '3.8'
services:
  terminal-service:
    build: .
    environment:
      # Use environment variables - NO hardcoded values
      - TERMINAL_WS_PORT=${TERMINAL_WS_PORT:-4001}
      - CLAUDE_WS_PORT=${CLAUDE_WS_PORT:-4002}
      - WS_HOST=${WS_HOST:-0.0.0.0}
      - API_BASE_URL=${API_BASE_URL}
      - NODE_ENV=${NODE_ENV:-production}
    ports:
      # Dynamic port mapping
      - "${TERMINAL_WS_PORT:-4001}:${TERMINAL_WS_PORT:-4001}"
      - "${CLAUDE_WS_PORT:-4002}:${CLAUDE_WS_PORT:-4002}"
    networks:
      - terminal-network

networks:
  terminal-network:
    driver: bridge
```

#### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .
RUN npm run build

# Use environment variables for configuration
ENV NODE_ENV=production
ENV WS_HOST=0.0.0.0

# Dynamic port exposure
EXPOSE ${TERMINAL_WS_PORT:-4001} ${CLAUDE_WS_PORT:-4002}

# Health check with dynamic URL
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "dist/server.js"]
```

### 5. Testing Configuration Templates

#### Jest Configuration
```typescript
// tests/config/test.config.ts
export const testConfig = {
  websocket: {
    systemPort: parseInt(process.env.TEST_TERMINAL_WS_PORT || '14001'),
    claudePort: parseInt(process.env.TEST_CLAUDE_WS_PORT || '14002'),
    host: process.env.TEST_WS_HOST || '127.0.0.1',
  },
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:14000'
  }
};

// Test helper functions
export function getTestWebSocketUrl(type: 'system' | 'claude'): string {
  const port = type === 'system' ? testConfig.websocket.systemPort : testConfig.websocket.claudePort;
  return `ws://${testConfig.websocket.host}:${port}`;
}

export function getTestApiUrl(endpoint: string): string {
  return `${testConfig.api.baseUrl}${endpoint}`;
}
```

#### Test Environment Variables
```bash
# .env.test
TEST_TERMINAL_WS_PORT=14001
TEST_CLAUDE_WS_PORT=14002
TEST_WS_HOST=127.0.0.1
TEST_API_BASE_URL=http://localhost:14000
```

### 6. Kubernetes Configuration Template

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: terminal-config
data:
  TERMINAL_WS_PORT: "4001"
  CLAUDE_WS_PORT: "4002"
  WS_HOST: "0.0.0.0"
  API_BASE_URL: "http://terminal-api-service:4000"
  NODE_ENV: "production"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terminal-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: terminal-service
  template:
    metadata:
      labels:
        app: terminal-service
    spec:
      containers:
      - name: terminal
        image: terminal-service:latest
        envFrom:
        - configMapRef:
            name: terminal-config
        - secretRef:
            name: terminal-secrets
        ports:
        - containerPort: 4001
          name: terminal-ws
        - containerPort: 4002  
          name: claude-ws
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 7. Monitoring Configuration Template

#### Prometheus Metrics
```typescript
// /src/monitoring/metrics.config.ts
import { terminalRefactorConfig } from '@/config/terminal-refactor.config';

export const metricsConfig = {
  enabled: terminalRefactorConfig.monitoring.metricsEnabled,
  interval: terminalRefactorConfig.monitoring.metricsInterval,
  port: parseInt(process.env.METRICS_PORT || '9090'),
  endpoint: process.env.METRICS_ENDPOINT || '/metrics',
  
  labels: {
    service: process.env.SERVICE_NAME || 'terminal-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
};

export function getMetricsUrl(): string {
  return `http://${process.env.METRICS_HOST || 'localhost'}:${metricsConfig.port}${metricsConfig.endpoint}`;
}
```

## 🔍 Configuration Validation Scripts

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
# Validate no hardcoded values

echo "🔍 Checking for hardcoded values..."

# Check for hardcoded ports
HARDCODED_PORTS=$(grep -r "4001\|4002\|3000\|5555" --exclude-dir=node_modules --exclude="*.md" . || true)
if [ ! -z "$HARDCODED_PORTS" ]; then
  echo "❌ Found hardcoded ports:"
  echo "$HARDCODED_PORTS"
  exit 1
fi

# Check for hardcoded URLs
HARDCODED_URLS=$(grep -r "localhost\|127\.0\.0\.1" --exclude-dir=node_modules --exclude="*.md" . || true)
if [ ! -z "$HARDCODED_URLS" ]; then
  echo "❌ Found hardcoded URLs:"
  echo "$HARDCODED_URLS"
  exit 1
fi

echo "✅ Configuration validation passed"
```

### Runtime Validation
```typescript
// /src/utils/config-validator.ts
import { validateTerminalRefactorConfig } from '@/config/terminal-refactor.config';

export function runConfigValidation(): void {
  console.log('🔍 Validating Terminal Refactor Configuration...');
  
  const validation = validateTerminalRefactorConfig();
  
  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ Configuration validation passed');
}

// Auto-run on app start
if (process.env.NODE_ENV !== 'test') {
  runConfigValidation();
}
```

## 📋 Mandatory Implementation Checklist

### ✅ Configuration Requirements
- [ ] All environment variables defined in .env.example
- [ ] Centralized config module created
- [ ] Helper functions for URL generation implemented
- [ ] Configuration validation system working
- [ ] No hardcoded values anywhere in code

### ✅ Documentation Requirements  
- [ ] All examples use dynamic configuration
- [ ] No hardcoded URLs in any documentation
- [ ] Configuration templates provided
- [ ] Environment setup guides updated

### ✅ Testing Requirements
- [ ] Test-specific configuration created
- [ ] Configuration validation tests added
- [ ] Environment switching tests passing
- [ ] CI/CD compliance checks implemented

---

**⚡ CRITICAL**: ใช้ templates นี้แทน hardcoded values ทั้งหมดในโปรเจค การไม่ทำตามจะทำให้ SOP compliance ล้มเหลว