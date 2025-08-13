# Terminal WebSocket Refactor - File-by-File Changes

## New Files to Create

### 1. Core Service Files

#### `/src/services/refactored/SessionManager.service.ts`
**Purpose**: Single source of truth for all terminal sessions
**Size**: ~800 lines
**Key Responsibilities**:
- Session CRUD operations
- State management
- Project-session mapping
- Session persistence
- Recovery mechanisms

```typescript
// Key interfaces to implement
interface ISessionManager {
  createSession(projectId: string, userId: string): Promise<Session>
  getSession(sessionId: string): Session | null
  updateSession(sessionId: string, updates: Partial<Session>): void
  deleteSession(sessionId: string): Promise<void>
  getSessionsByProject(projectId: string): Session[]
  getSessionsByUser(userId: string): Session[]
  recoverSession(sessionId: string): Promise<Session>
}
```

#### `/src/services/refactored/StreamManager.service.ts`
**Purpose**: WebSocket and process stream management
**Size**: ~600 lines
**Key Responsibilities**:
- WebSocket connection pooling
- Process spawning and management
- Stream multiplexing
- Buffer management
- Connection recovery

```typescript
// Key interfaces to implement
interface IStreamManager {
  createStream(sessionId: string, type: StreamType): Stream
  attachWebSocket(sessionId: string, ws: WebSocket): void
  spawnProcess(sessionId: string, command: string): ChildProcess
  pipeStream(from: Stream, to: Stream): void
  closeStream(streamId: string): void
  getActiveStreams(): Stream[]
}
```

#### `/src/services/refactored/MetricsCollector.service.ts`
**Purpose**: Unified metrics, monitoring, and logging
**Size**: ~500 lines
**Key Responsibilities**:
- Performance metrics collection
- Resource usage monitoring
- Event logging
- Alert triggering
- Dashboard data provision

```typescript
// Key interfaces to implement
interface IMetricsCollector {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void
  logEvent(level: LogLevel, message: string, context?: any): void
  getMetrics(timeRange: TimeRange): Metrics
  setAlert(name: string, condition: AlertCondition): void
  getResourceUsage(): ResourceUsage
}
```

### 2. Supporting Files

#### `/src/services/refactored/types/terminal-refactor.types.ts`
**Purpose**: Shared type definitions
**Size**: ~200 lines

#### `/src/services/refactored/adapters/LegacyAdapter.base.ts`
**Purpose**: Base adapter class for backward compatibility
**Size**: ~150 lines

#### `/src/services/refactored/utils/migration.utils.ts`
**Purpose**: Migration helper functions
**Size**: ~300 lines

## Files to Modify

### Phase 1: Add Adapter Hooks (Days 4-6)

#### `/src/services/terminal.service.ts`
**Changes Required**:
- Add feature flag checks
- Import adapter when flag enabled
- Dual-write to both old and new services
- Add migration logging

```typescript
// Line 10-20: Add imports
import { SessionManager } from './refactored/SessionManager.service';
import { TerminalServiceAdapter } from './refactored/adapters/TerminalServiceAdapter';
import { isRefactorEnabled } from '@/core/feature-flags';

// Line 50-60: Add adapter initialization
private adapter?: TerminalServiceAdapter;

constructor() {
  if (isRefactorEnabled('terminal-refactor')) {
    this.adapter = new TerminalServiceAdapter(this);
  }
}

// Line 100+: Wrap methods with adapter calls
async createTerminal(config: TerminalConfig) {
  if (this.adapter) {
    return this.adapter.createTerminal(config);
  }
  // Original implementation...
}
```

#### `/src/services/terminal-memory.service.ts`
**Changes Required**:
- Add SessionManager integration
- Implement state migration logic
- Add dual-write capability
- Maintain backward compatibility

```typescript
// Line 15-25: Add imports
import { SessionManager } from './refactored/SessionManager.service';
import { MemoryServiceAdapter } from './refactored/adapters/MemoryServiceAdapter';

// Line 80+: Add migration methods
private async migrateToSessionManager() {
  const sessions = this.getAllSessions();
  for (const session of sessions) {
    await SessionManager.getInstance().importSession(session);
  }
}
```

### Phase 2: Core Service Migration (Days 7-10)

#### `/src/services/terminal-orchestrator.service.ts`
**Changes Required**:
- Replace process management with StreamManager
- Update coordination logic
- Migrate event handlers
- Add compatibility layer

```typescript
// Replace process spawning (Line 200-250)
// OLD:
const process = spawn(command, args, options);

// NEW:
const process = this.streamManager.spawnProcess(sessionId, command);
```

#### `/src/services/terminal-lifecycle.service.ts`
**Changes Required**:
- Redirect lifecycle methods to SessionManager
- Maintain API compatibility
- Add deprecation warnings

```typescript
// Line 100+: Redirect to SessionManager
async createSession(config: SessionConfig) {
  console.warn('terminal-lifecycle.service is deprecated, use SessionManager');
  return SessionManager.getInstance().createSession(
    config.projectId,
    config.userId
  );
}
```

### Phase 3: Service Consolidation (Days 11-13)

#### `/src/services/terminal-metrics.service.ts`
**Status**: TO BE REMOVED
**Migration**: All functionality moved to MetricsCollector
**Deprecation**: Add deprecation warnings in Phase 2

#### `/src/services/terminal-analytics.service.ts`
**Status**: TO BE REMOVED
**Migration**: Merged into MetricsCollector
**Deprecation**: Add warnings, then remove

#### `/src/services/terminal-logging.service.ts`
**Status**: TO BE REMOVED
**Migration**: Consolidated into MetricsCollector
**Deprecation**: Gradual removal

#### `/src/services/workspace-terminal-logging.service.ts`
**Status**: TO BE REMOVED
**Migration**: Functionality in MetricsCollector
**Deprecation**: Remove after validation

#### `/src/services/terminal-memory-pool.service.ts`
**Status**: TO BE REMOVED
**Migration**: Pool management in SessionManager
**Deprecation**: Remove in final phase

### Phase 4: Frontend Updates (Days 12-13)

#### `/src/app/(auth)/terminal/page.tsx`
**Changes Required**:
- Update service imports
- Modify state management hooks
- Test all terminal operations

#### `/src/components/terminal/TerminalComponent.tsx`
**Changes Required**:
- Update WebSocket connection logic
- Modify event handlers
- Ensure backward compatibility

### Phase 5: Configuration Updates (Day 14)

#### `/src/config/terminal.config.ts`
**Changes Required**:
- Add new service configurations
- Update connection parameters
- Add performance tuning options

```typescript
export const terminalConfig = {
  // Existing config...
  
  // New refactored service config
  refactored: {
    sessionManager: {
      maxSessions: 100,
      sessionTimeout: 3600000,
      persistenceEnabled: true,
    },
    streamManager: {
      poolSize: 50,
      bufferSize: 65536,
      reconnectAttempts: 3,
    },
    metricsCollector: {
      interval: 5000,
      retention: 86400000,
      alertThresholds: {
        cpu: 80,
        memory: 90,
      },
    },
  },
};
```

#### `/.env.example`
**Changes Required**:
- Add feature flag variables
- Add new service configurations

```bash
# Terminal Refactor Feature Flags
TERMINAL_REFACTOR_ENABLED=false
TERMINAL_REFACTOR_PHASE=0
TERMINAL_DUAL_WRITE=false

# Performance Targets
TERMINAL_MAX_CPU_PERCENT=40
TERMINAL_MAX_MEMORY_MB=512
```

## Files to Delete (Phase 5, Day 14)

After successful migration and validation:

1. `/src/services/terminal-lifecycle.service.ts` (403 lines)
2. `/src/services/terminal-metrics.service.ts` (476 lines)
3. `/src/services/terminal-analytics.service.ts` (404 lines)
4. `/src/services/terminal-logging.service.ts` (514 lines)
5. `/src/services/terminal-memory-pool.service.ts` (254 lines)
6. `/src/services/workspace-terminal-logging.service.ts` (422 lines)
7. `/src/services/refactored/adapters/` (entire directory)

## Import Updates Required

### Files Requiring Import Changes
Count: ~25 files across the codebase

1. **API Routes** (`/src/app/api/terminal/**`)
   - Update service imports
   - Maintain API contracts

2. **Components** (`/src/components/terminal/**`)
   - Update service references
   - Modify state hooks

3. **Tests** (`/src/**/*.test.ts`)
   - Update mocks
   - Modify test setup

## Database Migration Scripts

### `/prisma/migrations/terminal_refactor.sql`
```sql
-- Add new session tracking table
CREATE TABLE IF NOT EXISTS terminal_sessions_v2 (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_sessions_project ON terminal_sessions_v2(project_id);
CREATE INDEX idx_sessions_user ON terminal_sessions_v2(user_id);
CREATE INDEX idx_sessions_activity ON terminal_sessions_v2(last_activity);

-- Migration script for existing data
INSERT INTO terminal_sessions_v2 (id, project_id, user_id, state)
SELECT 
  session_id,
  project_id,
  user_id,
  session_data::JSONB
FROM terminal_sessions
WHERE active = true;
```

## Testing Files to Create

### `/src/services/refactored/__tests__/`
1. `SessionManager.test.ts` (~500 lines)
2. `StreamManager.test.ts` (~400 lines)
3. `MetricsCollector.test.ts` (~300 lines)
4. `integration.test.ts` (~600 lines)
5. `migration.test.ts` (~400 lines)

## Documentation to Update

1. `/docs/claude/05-file-structure.md` - Update service architecture
2. `/docs/claude/06-api-reference.md` - Update API documentation
3. `/docs/claude/09-sops-standards.md` - Add refactoring procedures
4. `/README.md` - Update architecture section

## Scripts to Create

### `/scripts/terminal-refactor/`
1. `rollback.sh` - Emergency rollback script
2. `migrate-data.js` - Data migration utility
3. `validate-migration.js` - Migration validation
4. `performance-test.js` - Performance benchmarking
5. `monitor.js` - Real-time monitoring during migration

---

## Summary Statistics

### File Impact Analysis
- **New Files**: 11 files (~3,500 lines)
- **Modified Files**: 15 files (~2,000 lines changed)
- **Deleted Files**: 7 files (-2,573 lines)
- **Net Change**: -1,073 lines (23% reduction)

### Risk Assessment by File
- **High Risk**: terminal.service.ts, terminal-memory.service.ts
- **Medium Risk**: terminal-orchestrator.service.ts, frontend components
- **Low Risk**: metrics, analytics, logging services

### Migration Order (Critical Path)
1. Create new services (no risk)
2. Add adapters (low risk)
3. Migrate terminal.service.ts (high risk - careful testing)
4. Migrate memory service (high risk - state critical)
5. Consolidate auxiliary services (low risk)
6. Remove legacy code (medium risk - ensure complete migration)

---

**Document Created**: 2025-01-13
**Last Updated**: 2025-01-13
**Owner**: Development Team