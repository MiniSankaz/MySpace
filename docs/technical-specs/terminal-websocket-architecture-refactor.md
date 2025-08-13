# Terminal WebSocket Architecture Refactor - Technical Specification

**Document Version**: 1.0.0  
**Date**: 2025-08-13  
**Author**: Technical Architect Agent  
**Status**: Final Specification  

## Executive Summary

This document presents a comprehensive technical specification for refactoring the Terminal WebSocket module to eliminate redundancy, improve performance, and establish a clean, maintainable architecture. The current system suffers from severe architectural issues including duplicate session management across 7+ services, memory management scattered across 3 locations, and overlapping lifecycle management causing state synchronization problems.

The proposed architecture introduces a clean separation of concerns with single responsibility services, event-driven communication, and a unified state management approach that will reduce code complexity by approximately 60% while improving performance and reliability.

## System Architecture Overview

### Current Architecture Problems

```
Current Flawed Architecture:
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
├─────────────────────────────────────────────────┤
│  TerminalContainerV2 │ TerminalStore │ Various  │
└────────┬──────────────┴───────┬──────┴──────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────┐
│           Overlapping Service Layer              │
├──────────────┬──────────────┬──────────────────┤
│MemoryService│LifecycleServ │ MetricsService   │
│ MemoryPool   │ Orchestrator │ AnalyticsService │
│ LoggingServ  │ SessionMgr   │ IntegrationServ  │
└──────────────┴──────────────┴──────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────┐
│        WebSocket Servers (Multiple)              │
├──────────────────────────────────────────────────┤
│ terminal-ws-standalone │ terminal-ws │ others   │
└──────────────────────────────────────────────────┘

Issues:
- 7+ services managing same session data
- 3 different memory management implementations
- Multiple WebSocket servers with overlapping functionality
- State synchronization failures between components
- Race conditions in session creation/registration
- Memory leaks due to incomplete cleanup across services
```

### Proposed Clean Architecture

```
New Clean Architecture:
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
├─────────────────────────────────────────────────┤
│         TerminalUI │ TerminalStore              │
└────────────────────┴─────────────────────────────┘
                    │
                    ▼ (API Gateway)
┌─────────────────────────────────────────────────┐
│             Terminal API Gateway                 │
├─────────────────────────────────────────────────┤
│   Request Router │ Auth │ Rate Limiting         │
└─────────────────────────────────────────────────┘
                    │
                    ▼ (Event Bus)
┌─────────────────────────────────────────────────┐
│          Core Terminal Services                  │
├──────────────┬──────────────┬──────────────────┤
│SessionManager│StreamManager │MetricsCollector  │
│(Single Truth)│(WS Handler)  │(Passive Observer)│
└──────────────┴──────────────┴──────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│         Single WebSocket Server                  │
├─────────────────────────────────────────────────┤
│      Unified Connection Handler (Port 4001)      │
└─────────────────────────────────────────────────┘
```

## Detailed Component Specifications

### 1. Session Manager Service (Single Source of Truth)

**File**: `/src/services/terminal/session-manager.service.ts`

```typescript
interface ISessionManager {
  // Session CRUD Operations
  createSession(params: CreateSessionParams): Promise<Session>;
  getSession(sessionId: string): Session | null;
  updateSession(sessionId: string, updates: Partial<Session>): void;
  deleteSession(sessionId: string): void;
  
  // Project Operations
  listProjectSessions(projectId: string): Session[];
  suspendProject(projectId: string): void;
  resumeProject(projectId: string): void;
  
  // Focus Management
  setFocus(sessionId: string, focused: boolean): void;
  getFocusedSessions(projectId: string): string[];
  
  // Events
  on(event: SessionEvent, handler: EventHandler): void;
  off(event: SessionEvent, handler: EventHandler): void;
}

class SessionManager extends EventEmitter implements ISessionManager {
  private sessions: Map<string, Session> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map();
  private focusIndex: Map<string, Set<string>> = new Map();
  
  // Configuration
  private readonly config = {
    maxSessionsPerProject: 10,
    maxFocusedPerProject: 4,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 60 * 1000 // 1 minute
  };
  
  // Lifecycle hooks for extensibility
  private hooks = {
    beforeCreate: [],
    afterCreate: [],
    beforeDelete: [],
    afterDelete: []
  };
}
```

**Responsibilities**:
- Maintains the single source of truth for all session data
- Manages session lifecycle (create, read, update, delete)
- Handles focus state management with multi-focus support
- Provides event emission for state changes
- Implements session timeout and cleanup logic

**Key Design Decisions**:
- Uses Map data structures for O(1) lookups
- Implements indexing for efficient project-based queries
- Event-driven architecture for loose coupling
- Configurable limits and timeouts
- Hook system for extensibility

### 2. Stream Manager Service (WebSocket Handler)

**File**: `/src/services/terminal/stream-manager.service.ts`

```typescript
interface IStreamManager {
  // Connection Management
  registerConnection(sessionId: string, ws: WebSocket): void;
  unregisterConnection(sessionId: string): void;
  isConnected(sessionId: string): boolean;
  
  // Stream Operations
  sendToSession(sessionId: string, data: any): void;
  broadcast(projectId: string, data: any): void;
  
  // Process Management
  createProcess(sessionId: string, command: string): void;
  killProcess(sessionId: string): void;
  resizeProcess(sessionId: string, cols: number, rows: number): void;
}

class StreamManager implements IStreamManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private readonly sessionManager: ISessionManager;
  
  constructor(sessionManager: ISessionManager) {
    this.sessionManager = sessionManager;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.sessionManager.on('session:deleted', (sessionId) => {
      this.cleanup(sessionId);
    });
    
    this.sessionManager.on('focus:changed', (data) => {
      this.updateStreamPriority(data);
    });
  }
  
  // Intelligent streaming based on focus state
  private updateStreamPriority(focusData: FocusChangeData): void {
    const session = this.sessionManager.getSession(focusData.sessionId);
    if (!session) return;
    
    const connection = this.connections.get(focusData.sessionId);
    if (connection) {
      connection.streamingEnabled = focusData.focused;
      if (!focusData.focused) {
        connection.bufferOutput = true;
      }
    }
  }
}
```

**Responsibilities**:
- Manages WebSocket connections lifecycle
- Handles process creation and management
- Implements intelligent streaming based on focus state
- Provides buffering for unfocused sessions
- Manages process resize operations

**Key Design Decisions**:
- Delegates session state to SessionManager
- Implements connection pooling for efficiency
- Uses node-pty for reliable terminal emulation
- Implements backpressure handling for stream control
- Separate process management from session management

### 3. Metrics Collector Service (Passive Observer)

**File**: `/src/services/terminal/metrics-collector.service.ts`

```typescript
interface IMetricsCollector {
  // Metric Recording
  recordSessionMetric(sessionId: string, metric: Metric): void;
  recordSystemMetric(metric: SystemMetric): void;
  
  // Metric Queries
  getSessionMetrics(sessionId: string): SessionMetrics;
  getSystemMetrics(): SystemMetrics;
  getHealthStatus(): HealthStatus;
  
  // Alerting
  setAlert(alert: AlertConfig): void;
  getActiveAlerts(): Alert[];
}

class MetricsCollector implements IMetricsCollector {
  private sessionMetrics: Map<string, SessionMetrics> = new Map();
  private systemMetrics: SystemMetrics;
  private alerts: Map<string, Alert> = new Map();
  
  constructor(
    private sessionManager: ISessionManager,
    private streamManager: IStreamManager
  ) {
    this.initializeCollectors();
  }
  
  private initializeCollectors(): void {
    // Passive observation - no state modification
    this.sessionManager.on('session:created', this.onSessionCreated);
    this.sessionManager.on('session:deleted', this.onSessionDeleted);
    this.streamManager.on('data:sent', this.onDataSent);
    this.streamManager.on('data:received', this.onDataReceived);
    
    // System metrics collection
    setInterval(() => this.collectSystemMetrics(), 10000);
  }
  
  private collectSystemMetrics(): void {
    this.systemMetrics = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      sessionCount: this.sessionManager.getAllSessions().length,
      activeConnections: this.streamManager.getActiveConnections().length
    };
    
    this.checkAlerts();
  }
}
```

**Responsibilities**:
- Passively observes and records metrics
- Never modifies session or stream state
- Provides metric aggregation and queries
- Implements alerting based on thresholds
- Tracks system resource usage

**Key Design Decisions**:
- Pure observer pattern - no side effects
- Efficient metric storage with automatic cleanup
- Time-series data structure for historical metrics
- Configurable alert thresholds
- Minimal performance impact design

## Data Models and Schemas

### Core Session Model

```typescript
interface Session {
  // Identity
  id: string;
  projectId: string;
  userId?: string;
  
  // State
  status: SessionStatus;
  mode: SessionMode;
  
  // UI Properties
  tabName: string;
  layout?: LayoutConfig;
  theme?: ThemeConfig;
  
  // Focus Management
  isFocused: boolean;
  focusedAt?: Date;
  focusOrder?: number;
  
  // Process Information
  processId?: number;
  shell: string;
  currentPath: string;
  environment: Record<string, string>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  suspendedAt?: Date;
  
  // Performance
  metrics: {
    bytesIn: number;
    bytesOut: number;
    commandCount: number;
    errorCount: number;
  };
}

enum SessionStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ERROR = 'error',
  CLOSED = 'closed'
}

enum SessionMode {
  NORMAL = 'normal',
  CLAUDE = 'claude',
  READONLY = 'readonly'
}
```

### WebSocket Message Protocol

```typescript
// Client -> Server Messages
interface ClientMessage {
  type: ClientMessageType;
  sessionId: string;
  payload: any;
  timestamp: number;
}

enum ClientMessageType {
  CREATE_SESSION = 'create_session',
  CLOSE_SESSION = 'close_session',
  SEND_INPUT = 'send_input',
  RESIZE = 'resize',
  SET_FOCUS = 'set_focus',
  REQUEST_HISTORY = 'request_history'
}

// Server -> Client Messages
interface ServerMessage {
  type: ServerMessageType;
  sessionId: string;
  payload: any;
  timestamp: number;
}

enum ServerMessageType {
  SESSION_CREATED = 'session_created',
  SESSION_CLOSED = 'session_closed',
  OUTPUT = 'output',
  ERROR = 'error',
  STATUS_CHANGE = 'status_change',
  FOCUS_CHANGED = 'focus_changed',
  METRICS_UPDATE = 'metrics_update'
}
```

## API Specifications

### REST API Endpoints

```yaml
# Session Management API
POST   /api/terminal/sessions
  Body: { projectId, projectPath, config? }
  Response: { session: Session }

GET    /api/terminal/sessions/:sessionId
  Response: { session: Session }

DELETE /api/terminal/sessions/:sessionId
  Response: { success: boolean }

GET    /api/terminal/projects/:projectId/sessions
  Response: { sessions: Session[] }

# Focus Management API  
PUT    /api/terminal/sessions/:sessionId/focus
  Body: { focused: boolean }
  Response: { focusedSessions: string[] }

GET    /api/terminal/projects/:projectId/focus
  Response: { focusedSessions: string[] }

# Project Management API
POST   /api/terminal/projects/:projectId/suspend
  Response: { suspendedCount: number }

POST   /api/terminal/projects/:projectId/resume
  Response: { resumedSessions: Session[] }

# Metrics API
GET    /api/terminal/metrics/sessions/:sessionId
  Response: { metrics: SessionMetrics }

GET    /api/terminal/metrics/system
  Response: { metrics: SystemMetrics }
```

### WebSocket API

```typescript
// WebSocket Connection URL
ws://localhost:4001/terminal

// Connection Protocol
interface ConnectionHandshake {
  type: 'handshake';
  auth: {
    token: string;
    userId: string;
  };
  client: {
    version: string;
    capabilities: string[];
  };
}

// Multiplexed Sessions on Single Connection
interface MultiplexedMessage {
  channel: string; // sessionId
  type: MessageType;
  payload: any;
}
```

## Integration Requirements

### Frontend Integration

```typescript
// Terminal Store Integration
class TerminalStore {
  private sessionManager: RemoteSessionManager;
  private streamClient: StreamClient;
  
  constructor() {
    // Single WebSocket connection for all sessions
    this.streamClient = new StreamClient('ws://localhost:4001/terminal');
    this.sessionManager = new RemoteSessionManager('/api/terminal');
    
    this.setupSynchronization();
  }
  
  private setupSynchronization(): void {
    // Real-time updates via WebSocket
    this.streamClient.on('session:updated', (session) => {
      this.updateLocalState(session);
    });
    
    // Optimistic updates with rollback
    this.sessionManager.on('error', (error) => {
      this.rollbackOptimisticUpdate(error.operationId);
    });
  }
}
```

### Backend Service Integration

```typescript
// Service Registry Pattern
class ServiceRegistry {
  private static services = new Map<string, any>();
  
  static register(name: string, service: any): void {
    this.services.set(name, service);
  }
  
  static get<T>(name: string): T {
    return this.services.get(name) as T;
  }
}

// Dependency Injection Setup
const sessionManager = new SessionManager();
const streamManager = new StreamManager(sessionManager);
const metricsCollector = new MetricsCollector(sessionManager, streamManager);

ServiceRegistry.register('sessionManager', sessionManager);
ServiceRegistry.register('streamManager', streamManager);
ServiceRegistry.register('metricsCollector', metricsCollector);
```

## Security Specifications

### Authentication & Authorization

```typescript
interface SecurityConfig {
  // JWT-based authentication
  authentication: {
    provider: 'jwt';
    secret: string;
    expiresIn: string;
  };
  
  // Role-based access control
  authorization: {
    roles: {
      admin: ['*'];
      user: ['create', 'read', 'update'];
      viewer: ['read'];
    };
  };
  
  // Rate limiting
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    maxSessionsPerUser: number;
  };
  
  // Input sanitization
  sanitization: {
    allowedCommands: string[];
    blockedPatterns: RegExp[];
    maxInputLength: number;
  };
}
```

### Security Measures

1. **Input Validation**
   - Command injection prevention
   - Path traversal protection
   - Environment variable filtering

2. **Resource Limits**
   - Per-user session limits
   - Memory usage caps
   - CPU throttling for processes

3. **Audit Logging**
   - All session operations logged
   - Command history retention
   - Security event monitoring

## Performance Requirements

### Performance Targets

```yaml
Response Times:
  Session Creation: < 100ms (p99)
  Command Execution: < 10ms (p99)
  Output Streaming: < 5ms latency
  Focus Switch: < 20ms

Resource Usage:
  Memory per Session: < 10MB
  CPU per Active Session: < 1%
  WebSocket Connections: Support 10,000 concurrent

Scalability:
  Sessions per Server: 10,000
  Users per Server: 1,000
  Messages per Second: 100,000
```

### Optimization Strategies

1. **Memory Optimization**
   ```typescript
   class MemoryOptimizer {
     // Object pooling for frequently created objects
     private bufferPool = new BufferPool(1000);
     
     // Weak references for cache
     private cache = new WeakMap();
     
     // Automatic cleanup
     private cleanupInterval = setInterval(() => {
       this.performCleanup();
     }, 60000);
   }
   ```

2. **CPU Optimization**
   ```typescript
   class CPUOptimizer {
     // Throttling for unfocused sessions
     private throttleUnfocused = true;
     
     // Batch message processing
     private messageBatch: Message[] = [];
     private batchInterval = 10; // ms
     
     // Worker threads for heavy operations
     private workerPool = new WorkerPool(4);
   }
   ```

3. **Network Optimization**
   ```typescript
   class NetworkOptimizer {
     // Message compression
     private compressionEnabled = true;
     private compressionThreshold = 1024; // bytes
     
     // Binary protocol for efficiency
     private useBinaryProtocol = true;
     
     // Delta updates only
     private deltaUpdates = true;
   }
   ```

## Implementation Guidelines

### Phase 1: Core Services (Week 1)

1. **Day 1-2**: Implement SessionManager
   - Core CRUD operations
   - Event system
   - Focus management

2. **Day 3-4**: Implement StreamManager
   - WebSocket handling
   - Process management
   - Stream control

3. **Day 5**: Implement MetricsCollector
   - Basic metrics
   - System monitoring

### Phase 2: Integration (Week 2)

1. **Day 1-2**: API Gateway
   - REST endpoints
   - WebSocket upgrade
   - Authentication

2. **Day 3-4**: Frontend Integration
   - Update TerminalStore
   - Update UI components
   - Testing

3. **Day 5**: Migration Scripts
   - Data migration
   - Backward compatibility

### Phase 3: Optimization (Week 3)

1. **Day 1-2**: Performance Testing
   - Load testing
   - Memory profiling
   - Bottleneck identification

2. **Day 3-4**: Optimization Implementation
   - Apply optimizations
   - Fine-tuning
   - Caching strategies

3. **Day 5**: Documentation & Deployment
   - API documentation
   - Deployment guide
   - Monitoring setup

## Testing Requirements

### Unit Testing

```typescript
describe('SessionManager', () => {
  it('should create session with unique ID', async () => {
    const session = await sessionManager.createSession({
      projectId: 'test-project',
      projectPath: '/test/path'
    });
    
    expect(session.id).toBeDefined();
    expect(session.projectId).toBe('test-project');
  });
  
  it('should enforce focus limits', () => {
    // Create 5 sessions
    const sessions = Array(5).fill(null).map(() => 
      sessionManager.createSession({ projectId: 'test' })
    );
    
    // Try to focus all 5 (limit is 4)
    sessions.forEach(s => sessionManager.setFocus(s.id, true));
    
    const focused = sessionManager.getFocusedSessions('test');
    expect(focused.length).toBe(4);
  });
});
```

### Integration Testing

```typescript
describe('Terminal System Integration', () => {
  it('should handle complete session lifecycle', async () => {
    // Create session via API
    const response = await api.post('/api/terminal/sessions', {
      projectId: 'test-project'
    });
    
    const sessionId = response.data.session.id;
    
    // Connect WebSocket
    const ws = new WebSocket('ws://localhost:4001/terminal');
    await waitForConnection(ws);
    
    // Send command
    ws.send(JSON.stringify({
      type: 'send_input',
      sessionId,
      payload: 'echo "test"\n'
    }));
    
    // Verify output
    const output = await waitForMessage(ws, 'output');
    expect(output.payload).toContain('test');
    
    // Close session
    await api.delete(`/api/terminal/sessions/${sessionId}`);
  });
});
```

### Performance Testing

```yaml
# k6 Load Test Script
import http from 'k6/http';
import ws from 'k6/ws';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up
    { duration: '1m', target: 100 },   // Stay at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'], // 99% of requests under 100ms
    ws_connecting: ['p(99)<500'],     // WebSocket connection under 500ms
  },
};
```

## Deployment Considerations

### Container Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Configure for production
ENV NODE_ENV=production
ENV MAX_SESSIONS=10000
ENV CLEANUP_INTERVAL=60000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

EXPOSE 4000 4001
CMD ["node", "dist/server.js"]
```

### Kubernetes Deployment

```yaml
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
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        env:
        - name: MAX_SESSIONS
          value: "10000"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

### Monitoring & Observability

```yaml
# Prometheus Metrics
terminal_sessions_total{status="active"}
terminal_sessions_created_total
terminal_sessions_closed_total
terminal_websocket_connections_active
terminal_process_cpu_usage
terminal_process_memory_usage
terminal_command_execution_duration_seconds
terminal_output_bytes_total
terminal_input_bytes_total
terminal_errors_total{type="connection"}
```

## Migration Strategy

### Phase 1: Parallel Run (Week 1)
1. Deploy new architecture alongside existing
2. Route 10% of traffic to new system
3. Monitor metrics and errors
4. Fix any issues found

### Phase 2: Gradual Migration (Week 2)
1. Increase traffic to 50%
2. Migrate existing sessions
3. Update frontend to use new APIs
4. Maintain backward compatibility

### Phase 3: Complete Cutover (Week 3)
1. Route 100% traffic to new system
2. Decommission old services
3. Clean up obsolete code
4. Update documentation

### Rollback Plan
```typescript
class MigrationController {
  async rollback(): Promise<void> {
    // 1. Stop new system
    await this.stopNewServices();
    
    // 2. Restore traffic routing
    await this.routeToOldSystem();
    
    // 3. Migrate active sessions back
    await this.migrateSessionsBack();
    
    // 4. Restore configuration
    await this.restoreConfiguration();
    
    // 5. Verify old system health
    await this.verifyOldSystemHealth();
  }
}
```

## Appendices

### A. Glossary

- **Session**: A terminal instance with its own process and state
- **Focus**: UI state indicating which sessions are actively displayed
- **Suspension**: Temporary pause of session with state preservation
- **Multiplexing**: Multiple logical channels over single connection
- **Backpressure**: Flow control mechanism for stream management

### B. Configuration Reference

```typescript
// Complete configuration interface
interface TerminalConfig {
  server: {
    port: number;
    host: string;
    cors: CorsOptions;
  };
  
  session: {
    maxPerProject: number;
    maxPerUser: number;
    timeout: number;
    cleanupInterval: number;
  };
  
  focus: {
    maxPerProject: number;
    autoFocusNew: boolean;
  };
  
  process: {
    shell: string;
    env: Record<string, string>;
    cwd: string;
    cols: number;
    rows: number;
  };
  
  streaming: {
    bufferSize: number;
    throttleMs: number;
    compression: boolean;
  };
  
  security: {
    maxInputLength: number;
    allowedCommands: string[];
    blockedPatterns: string[];
  };
  
  monitoring: {
    metricsInterval: number;
    healthCheckInterval: number;
    alertThresholds: Record<string, number>;
  };
}
```

### C. Error Codes

```typescript
enum TerminalErrorCode {
  // Session Errors (1xxx)
  SESSION_NOT_FOUND = 1001,
  SESSION_LIMIT_EXCEEDED = 1002,
  SESSION_ALREADY_EXISTS = 1003,
  SESSION_CREATION_FAILED = 1004,
  
  // Connection Errors (2xxx)
  CONNECTION_FAILED = 2001,
  CONNECTION_TIMEOUT = 2002,
  CONNECTION_REJECTED = 2003,
  
  // Process Errors (3xxx)
  PROCESS_SPAWN_FAILED = 3001,
  PROCESS_KILLED = 3002,
  PROCESS_NOT_FOUND = 3003,
  
  // Authorization Errors (4xxx)
  UNAUTHORIZED = 4001,
  FORBIDDEN = 4002,
  TOKEN_EXPIRED = 4003,
  
  // System Errors (5xxx)
  INTERNAL_ERROR = 5001,
  RESOURCE_EXHAUSTED = 5002,
  SERVICE_UNAVAILABLE = 5003
}
```

### D. Development Guidelines

1. **Code Style**
   - Use TypeScript strict mode
   - Follow ESLint configuration
   - Use Prettier for formatting
   - Write comprehensive JSDoc comments

2. **Git Workflow**
   - Feature branches from `develop`
   - Squash commits before merging
   - Semantic commit messages
   - Required code reviews

3. **Testing Standards**
   - Minimum 80% code coverage
   - Unit tests for all services
   - Integration tests for APIs
   - E2E tests for critical paths

4. **Documentation Requirements**
   - API documentation with OpenAPI
   - Architecture decision records
   - Runbook for operations
   - Troubleshooting guide

---

**End of Technical Specification**

*This document represents the complete technical blueprint for the Terminal WebSocket architecture refactor. Implementation should follow the phases outlined, with regular checkpoints for validation and adjustment.*