# Technical Specification: Terminal System Recovery Plan

## 1. Overview

### Business Context

The terminal system is experiencing critical failures affecting core functionality:

- Syntax errors preventing TypeScript compilation
- Memory leaks causing 3GB+ usage with 0 active sessions
- API endpoints returning 500 errors
- WebSocket connection conflicts

### Technical Scope

- Immediate syntax error resolution
- Memory leak identification and cleanup
- API restoration and error handling
- Architectural improvements for stability

### Dependencies

- TypeScript compilation system
- Node.js memory management
- WebSocket server infrastructure
- Database connection handling

## 2. Architecture

### Current System Components

```
┌─────────────────────┐    ┌─────────────────────┐
│   Development       │    │   WebSocket         │
│   Server (4110)     │────│   Servers           │
│   - 1761MB Memory   │    │   - Port 4001       │
└─────────────────────┘    │   - Port 4002       │
                           └─────────────────────┘
┌─────────────────────┐    ┌─────────────────────┐
│   TypeScript        │    │   Database          │
│   Servers           │    │   - PostgreSQL      │
│   - 536MB + 139MB   │    │   - Port 25060      │
└─────────────────────┘    └─────────────────────┘
```

### Proposed System Components

```
┌─────────────────────┐    ┌─────────────────────┐
│   Single Dev        │    │   Unified WebSocket │
│   Server (4110)     │────│   Server (4001)     │
│   - <500MB Memory   │    │   - Error Recovery  │
└─────────────────────┘    └─────────────────────┘
┌─────────────────────┐    ┌─────────────────────┐
│   In-Memory         │    │   Database          │
│   Terminal Service  │    │   (Optional)        │
│   - Circuit Breaker │    │   - Fallback Only   │
└─────────────────────┘    └─────────────────────┘
```

### Data Flow

```
Client Request → TypeScript Validation → API Route → Terminal Service → WebSocket Response
     ↓                    ↓                  ↓            ↓              ↓
Error Boundary → Compilation Check → Auth/Validation → Session Mgmt → Response Format
```

### Integration Points

- **Frontend**: React components connecting to WebSocket
- **Backend**: API routes handling terminal operations
- **Database**: Optional persistence for session data
- **WebSocket**: Real-time terminal communication

## 3. API Specifications

### Terminal Session API

```typescript
// GET /api/terminal/list
interface TerminalListResponse {
  success: boolean;
  sessions: TerminalSession[];
  memoryUsage: {
    rss: string;
    heap: string;
    external: string;
    sessionCount: number;
  };
}

// POST /api/terminal/create
interface CreateTerminalRequest {
  projectId: string;
  type: "system" | "claude";
  tabName: string;
  projectPath: string;
}

interface CreateTerminalResponse {
  success: boolean;
  session: TerminalSession;
  connectionUrl: string;
}

// GET /api/workspace/projects/[id]/terminals
interface ProjectTerminalsResponse {
  success: boolean;
  projectId: string;
  terminals: TerminalSession[];
  activeCount: number;
}
```

### Error Response Schema

```typescript
interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  requestId: string;
}
```

## 4. Data Models

### Terminal Session Model

```typescript
interface TerminalSession {
  id: string; // session_timestamp_random
  projectId: string; // Project identifier
  userId?: string; // Optional user association
  type: "system" | "claude"; // Terminal type
  tabName: string; // Display name
  active: boolean; // Status flag
  output: string[]; // Command history
  currentPath: string; // Working directory
  pid: number | null; // Process ID
  createdAt: Date; // Creation timestamp
  lastActivity?: Date; // Last interaction
}

interface SessionState {
  session: TerminalSession;
  metadata: SessionMetadata;
  connectionId?: string;
  isConnected: boolean;
  buffer: string[];
  maxBufferSize: number;
}

interface SessionMetadata {
  projectId: string;
  projectPath: string;
  userId?: string;
  environment?: Record<string, string>;
  lastActivity?: Date;
}
```

### Database Schema (Optional)

```sql
-- Terminal Sessions Table
CREATE TABLE terminal_sessions (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'claude')),
  tab_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  output JSONB DEFAULT '[]'::jsonb,
  current_path TEXT,
  pid INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_terminal_sessions_project_id ON terminal_sessions(project_id);
CREATE INDEX idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX idx_terminal_sessions_active ON terminal_sessions(active);
```

## 5. Business Logic

### Core Algorithms

#### Session Creation with Fallback

```typescript
async createOrRestoreSession(params: CreateSessionParams): Promise<TerminalSession> {
  // 1. Check for existing session
  const existing = await this.findExistingSession(params);
  if (existing) return existing;

  // 2. Generate session ID
  const sessionId = `session_${Date.now()}_${randomString()}`;

  // 3. Try database creation with timeout
  try {
    const dbSession = await Promise.race([
      this.createDatabaseSession(sessionId, params),
      timeout(4100)
    ]);
    return this.formatSession(dbSession);
  } catch (error) {
    // 4. Fallback to in-memory session
    return this.createInMemorySession(sessionId, params);
  }
}
```

#### Memory Management

```typescript
class MemoryManager {
  private readonly MAX_MEMORY = 500 * 1024 * 1024; // 500MB
  private readonly MAX_SESSIONS = 10;

  monitorMemory(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.rss > this.MAX_MEMORY) {
        this.emergencyCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  emergencyCleanup(): void {
    // Remove oldest inactive sessions
    const sessions = this.getInactiveSessions();
    const toRemove = sessions.slice(0, -5); // Keep only 5 most recent

    for (const session of toRemove) {
      this.terminateSession(session.id);
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}
```

### Validation Rules

- Session IDs must match pattern: `session_[timestamp]_[8-char-random]`
- Maximum 10 concurrent sessions per project
- Session timeout after 30 minutes of inactivity
- Maximum buffer size of 1000 lines per session

### State Management

```typescript
enum SessionState {
  CREATING = "creating",
  ACTIVE = "active",
  INACTIVE = "inactive",
  TERMINATING = "terminating",
  ERROR = "error",
}

class SessionStateMachine {
  transition(sessionId: string, to: SessionState): boolean {
    const current = this.getState(sessionId);
    return this.isValidTransition(current, to);
  }
}
```

## 6. Security Considerations

### Authentication/Authorization

- Session creation requires valid project access
- User isolation for multi-tenant scenarios
- API key validation for terminal operations

### Data Protection

- Environment variables filtered for sensitive data
- Command history sanitization
- Session data encryption in transit

### Vulnerability Mitigation

```typescript
// Command injection prevention
function sanitizeCommand(cmd: string): string {
  // Remove dangerous characters and commands
  return cmd.replace(/[;&|`$]/g, "").substring(0, 1000);
}

// Memory DoS prevention
function limitSessionCreation(userId: string): boolean {
  const userSessions = this.getUserSessions(userId);
  return userSessions.length < MAX_USER_SESSIONS;
}
```

## 7. Performance Requirements

### Response Time Targets

- Session creation: < 2 seconds
- Command execution: < 100ms latency
- WebSocket message delivery: < 50ms
- API endpoint response: < 500ms

### Throughput Requirements

- Support 100 concurrent WebSocket connections
- Handle 1000 terminal operations per minute
- Process 10MB of terminal output per session

### Resource Constraints

- Maximum memory usage: 500MB per development server
- CPU usage should not exceed 80% sustained
- Network bandwidth: 1MB/s per active session

## 8. Testing Strategy

### Unit Test Coverage

```typescript
describe("TerminalSessionManager", () => {
  it("should create session with fallback", async () => {
    const manager = new TerminalSessionManager();
    const session = await manager.createOrRestoreSession(params);
    expect(session.id).toMatch(/^session_\d+_[a-z0-9]{8}$/);
  });

  it("should handle memory pressure", () => {
    const manager = new TerminalSessionManager();
    manager.simulateMemoryPressure();
    expect(manager.getSessionCount()).toBeLessThan(6);
  });
});
```

### Integration Test Scenarios

- Database connection failure with graceful fallback
- WebSocket reconnection after server restart
- Session persistence across development server restarts
- Memory cleanup under load

### Performance Test Criteria

- Load test with 50 concurrent sessions
- Memory leak detection over 24-hour period
- Stress test with rapid session creation/destruction
- Network latency testing with large output

## 9. Deployment Plan

### Environment Requirements

```json
{
  "development": {
    "nodeVersion": "18.x",
    "memoryLimit": "500MB",
    "features": {
      "database": false,
      "inMemoryOnly": true
    }
  },
  "production": {
    "nodeVersion": "18.x",
    "memoryLimit": "2GB",
    "features": {
      "database": true,
      "fallbackToMemory": true
    }
  }
}
```

### Configuration Management

```typescript
interface TerminalConfig {
  mode: "development" | "production";
  database: {
    enabled: boolean;
    timeout: number;
    retries: number;
  };
  memory: {
    maxSessions: number;
    maxMemory: string;
    cleanupInterval: number;
  };
  websocket: {
    port: number;
    maxConnections: number;
  };
}
```

### Rollback Procedures

1. **Immediate Rollback**: Revert to last known working commit
2. **Service Restart**: Kill all Node.js processes and restart
3. **Database Fallback**: Disable database mode and use memory-only
4. **Emergency Mode**: Minimal terminal service with basic functionality

## 10. Monitoring & Maintenance

### Key Metrics

```typescript
interface SystemMetrics {
  memory: {
    rss: number;
    heap: number;
    external: number;
  };
  sessions: {
    active: number;
    total: number;
    errors: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
}
```

### Alerting Rules

- Memory usage > 400MB for 5 minutes
- Error rate > 5% for 10 minutes
- Session creation failures > 10% for 5 minutes
- WebSocket connection failures > 20 per minute

### Maintenance Procedures

- **Daily**: Check memory usage trends
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Load testing and capacity planning

---

## Implementation Priority

### P0 - Critical (Next 30 minutes)

1. Fix syntax error in `terminal-session-manager.ts`
2. Restart development server with memory limits
3. Verify API endpoints return 200 status

### P1 - High (Next 2 hours)

1. Implement memory monitoring and cleanup
2. Add error boundaries to API routes
3. Configure in-memory-only mode for development

### P2 - Medium (Next 24 hours)

1. Implement hybrid database/memory system
2. Add comprehensive error handling
3. Create monitoring dashboard

### P3 - Low (Next week)

1. Implement advanced load balancing
2. Add comprehensive test suite
3. Create production deployment pipeline

This specification provides a complete technical roadmap for recovering and improving the terminal system, with clear implementation priorities and success metrics.
