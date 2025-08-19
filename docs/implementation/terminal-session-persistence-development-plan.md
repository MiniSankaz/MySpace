# Terminal Session Persistence - Development Implementation Plan

**Development Planner**: Development Planning Architect  
**Date**: 2025-08-12  
**Priority**: P0 CRITICAL - Major Developer Workflow Improvement  
**References**: SA Technical Specification from 2025-08-12 01:15

## Executive Summary

This development plan transforms the System Analyst's comprehensive technical specification for terminal session persistence into actionable implementation tasks. The plan addresses the critical issue where terminal sessions are killed when switching projects, eliminating a major productivity bottleneck in multi-project workflows.

**Core Problem**: Terminal sessions killed on project switch due to React component cleanup  
**Solution**: Replace destructive cleanup with suspension/resumption pattern  
**Timeline**: Phase 0 hotfix TODAY (2 hours), full implementation over 3 weeks (56 hours)  
**Impact**: 100% session survival, 40% workflow efficiency improvement

---

## 📋 Master Development Checklist

### Overall Progress: ⏳ 0% Complete

#### Phase 0: Immediate Hotfix ⏳ (0%)

- [ ] Remove cleanupAllSessions from useEffect cleanup
- [ ] Test basic persistence working
- [ ] Deploy hotfix to staging

#### Phase 1: Core Infrastructure ⏳ (0%)

- [ ] Fix React component lifecycle
- [ ] Enhance InMemoryTerminalService
- [ ] Create suspension/resumption APIs
- [ ] Integration testing

#### Phase 2: WebSocket Enhancements ⏳ (0%)

- [ ] Update WebSocket server for suspension
- [ ] Implement message protocol extensions
- [ ] Frontend WebSocket client updates
- [ ] Connection stability testing

#### Phase 3: Database Persistence ⏳ (0%)

- [ ] Create database schema
- [ ] Run migrations
- [ ] Implement persistent storage service
- [ ] Long-term storage testing

#### Phase 4: UI/UX Improvements ⏳ (0%)

- [ ] Terminal header enhancements
- [ ] Session status indicators
- [ ] Project switch notifications
- [ ] User acceptance testing

#### Phase 5: Production Deployment ⏳ (0%)

- [ ] Performance monitoring setup
- [ ] Documentation updates
- [ ] Production deployment
- [ ] Post-deployment validation

---

## PHASE 0: IMMEDIATE HOTFIX (TODAY - 2 HOURS)

### 🚨 Critical Quick Fix to Stop Session Killing

**Goal**: Stop terminals from being killed when switching projects  
**Timeline**: 1-2 hours MAX  
**Risk**: MINIMAL - Simple code removal

### Implementation Checklist

#### Step 1: Remove Cleanup Hook (30 minutes)

**File**: `/src/modules/workspace/components/Terminal/TerminalContainerV3.tsx`

```typescript
// CURRENT CODE (Lines 48-56) - REMOVE THIS:
useEffect(() => {
  loadSessions();

  return () => {
    // ❌ DELETE THIS ENTIRE CLEANUP BLOCK
    console.log(
      `[TerminalContainer] Cleaning up sessions for project: ${project.id}`,
    );
    cleanupAllSessions(); // THIS IS THE PROBLEM
  };
}, [project.id]);

// NEW CODE - REPLACE WITH:
useEffect(() => {
  loadSessions();
  // ✅ NO CLEANUP - Sessions persist across project switches
}, [project.id]);
```

**Acceptance Criteria**:

- [ ] useEffect cleanup function removed
- [ ] loadSessions() still called on project change
- [ ] No cleanupAllSessions() call on project switch

#### Step 2: Add Basic Session Filtering (30 minutes)

**File**: `/src/modules/workspace/components/Terminal/TerminalContainerV3.tsx`

```typescript
// Update loadSessions function to only show current project sessions
const loadSessions = async () => {
  try {
    setLoading(true);
    setError(null);

    // Existing fetch logic...
    const response = await fetch(`/api/terminal/list?projectId=${project.id}`, {
      credentials: "include",
    });

    // Process only sessions for current project
    if (data.success && Array.isArray(data.sessions)) {
      // Filter to current project sessions only
      const projectSessions = data.sessions.filter(
        (s) => s.projectId === project.id,
      );
      const sessionList = projectSessions.map((s: any, index: number) => ({
        ...s,
        type: "terminal",
        mode: s.mode || "normal",
        gridPosition: index,
        isFocused: s.isFocused || false,
      }));
      setSessions(sessionList);
    }
  } catch (err) {
    // Error handling...
  }
};
```

**Acceptance Criteria**:

- [ ] Sessions filtered by current projectId
- [ ] Other project sessions remain in backend
- [ ] UI only shows current project terminals

#### Step 3: Test & Verify (30 minutes)

**Test Procedure**:

1. Start development server: `npm run dev`
2. Open Project A, create 2 terminals
3. Run a long process: `sleep 60` in Terminal 1
4. Switch to Project B
5. Switch back to Project A
6. Verify Terminal 1 still exists and sleep is running

**Verification Checklist**:

- [ ] Terminal sessions survive project switch
- [ ] Running processes continue (sleep test)
- [ ] No console errors on project switch
- [ ] Sessions correctly filtered per project

#### Step 4: Deploy Hotfix (30 minutes)

```bash
# Commit hotfix
git add src/modules/workspace/components/Terminal/TerminalContainerV3.tsx
git commit -m "fix: Remove terminal cleanup on project switch - sessions now persist

- Removed cleanupAllSessions() from useEffect cleanup
- Terminal sessions now persist across project switches
- Running processes continue uninterrupted
- Fixes critical workflow issue

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Test in staging
npm run build
npm run start

# If successful, deploy to production
./quick-restart.sh
```

**Deployment Checklist**:

- [ ] Code committed with descriptive message
- [ ] Staging environment tested
- [ ] No regression in terminal creation
- [ ] Production deployment successful

### Phase 0 Success Criteria ✅

- [ ] Terminals persist when switching projects
- [ ] Running processes continue uninterrupted
- [ ] No new errors introduced
- [ ] Basic functionality maintained

---

## PHASE 1: CORE INFRASTRUCTURE (Week 1 - 16 Hours)

### Development Tasks with Detailed Implementation

### Task 1.1: Enhanced React Component Lifecycle (4 hours)

#### Pre-Development Checklist

- [ ] Review current TerminalContainerV3.tsx implementation
- [ ] Understand project switching flow
- [ ] Identify all cleanup points
- [ ] Design suspension state management

#### Implementation Steps

**File**: `/src/modules/workspace/components/Terminal/TerminalContainerV3.tsx`

```typescript
import { useRef, useEffect, useState } from "react";

// Helper hook to track previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const TerminalContainerV3: React.FC<Props> = ({ project }) => {
  const previousProjectId = usePrevious(project.id);
  const [suspendedProjects, setSuspendedProjects] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    // Handle project switching
    const handleProjectSwitch = async () => {
      // Suspend previous project if switching
      if (previousProjectId && previousProjectId !== project.id) {
        await suspendProjectSessions(previousProjectId);
        setSuspendedProjects((prev) => new Set(prev).add(previousProjectId));
      }

      // Load or resume current project sessions
      if (suspendedProjects.has(project.id)) {
        await resumeProjectSessions(project.id);
        setSuspendedProjects((prev) => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      } else {
        await loadSessions();
      }
    };

    handleProjectSwitch();
  }, [project.id]);

  // New suspension function
  const suspendProjectSessions = async (projectId: string) => {
    try {
      const response = await fetch("/api/terminal/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `Suspended ${data.suspendedSessionCount} sessions for project ${projectId}`,
        );
      }
    } catch (err) {
      console.error("Failed to suspend sessions:", err);
    }
  };

  // New resumption function
  const resumeProjectSessions = async (projectId: string) => {
    try {
      const response = await fetch("/api/terminal/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resumed && data.sessions.length > 0) {
          setSessions(data.sessions);
          setCurrentLayout(data.uiState?.currentLayout || "1x1");
          console.log(
            `Resumed ${data.sessions.length} sessions for project ${projectId}`,
          );
        }
      }
    } catch (err) {
      console.error("Failed to resume sessions:", err);
    }
  };

  // Rest of component...
};
```

#### Testing Checklist

- [ ] Project switch triggers suspension
- [ ] Previous project sessions suspended
- [ ] Current project sessions loaded/resumed
- [ ] No cleanup on unmount
- [ ] State properly tracked

### Task 1.2: InMemoryTerminalService Enhancement (6 hours)

#### Pre-Development Checklist

- [ ] Review current service architecture
- [ ] Design suspension state structure
- [ ] Plan event emission strategy
- [ ] Consider memory implications

#### Implementation Steps

**File**: `/src/services/terminal-memory.service.ts`

```typescript
export class InMemoryTerminalService extends EventEmitter {
  private suspendedProjects: Map<string, ProjectSuspensionState> = new Map();

  // New suspension method
  public suspendProjectSessions(projectId: string): void {
    const sessionIds = this.projectSessions.get(projectId) || new Set();

    if (sessionIds.size === 0) {
      console.log(
        `[InMemoryTerminalService] No sessions to suspend for project ${projectId}`,
      );
      return;
    }

    // Capture current UI state
    const uiState = this.captureProjectUIState(projectId);

    // Create suspension state
    const suspensionState: ProjectSuspensionState = {
      projectId,
      sessionIds: Array.from(sessionIds),
      suspendedAt: new Date(),
      uiState,
    };

    // Store suspension state
    this.suspendedProjects.set(projectId, suspensionState);

    // Mark sessions as suspended
    sessionIds.forEach((sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.metadata = {
          ...session.metadata,
          suspended: true,
          suspendedAt: new Date(),
        };
        session.status = "suspended";
        session.updatedAt = new Date();
      }
    });

    console.log(
      `[InMemoryTerminalService] Suspended ${sessionIds.size} sessions for project ${projectId}`,
    );
    this.emit("projectSuspended", { projectId, sessionCount: sessionIds.size });
  }

  // New resumption method
  public resumeProjectSessions(
    projectId: string,
  ): ProjectSuspensionState | null {
    const suspensionState = this.suspendedProjects.get(projectId);

    if (!suspensionState) {
      console.log(
        `[InMemoryTerminalService] No suspended sessions for project ${projectId}`,
      );
      return null;
    }

    // Reactivate sessions
    suspensionState.sessionIds.forEach((sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.metadata = {
          ...session.metadata,
          suspended: false,
        };
        delete session.metadata.suspendedAt;
        session.status = session.wsConnected ? "active" : "inactive";
        session.updatedAt = new Date();
      }
    });

    // Clean up suspension state
    this.suspendedProjects.delete(projectId);

    console.log(
      `[InMemoryTerminalService] Resumed ${suspensionState.sessionIds.length} sessions for project ${projectId}`,
    );
    this.emit("projectResumed", {
      projectId,
      sessionCount: suspensionState.sessionIds.length,
      uiState: suspensionState.uiState,
    });

    return suspensionState;
  }

  // UI state capture helper
  private captureProjectUIState(projectId: string): TerminalUIState {
    const sessionIds = this.projectSessions.get(projectId) || new Set();
    const focusedSessions = Array.from(sessionIds).filter((id) => {
      const session = this.sessions.get(id);
      return session?.isFocused;
    });

    return {
      currentLayout: "1x1", // Will be passed from frontend
      focusedSessions,
      sessionPositions: {}, // Will be enhanced later
    };
  }
}

interface ProjectSuspensionState {
  projectId: string;
  sessionIds: string[];
  suspendedAt: Date;
  uiState: TerminalUIState;
}

interface TerminalUIState {
  currentLayout: string;
  focusedSessions: string[];
  sessionPositions: Record<string, number>;
}
```

#### Testing Checklist

- [ ] Sessions properly marked as suspended
- [ ] Suspension state stored correctly
- [ ] Events emitted on suspend/resume
- [ ] UI state captured and restored
- [ ] Memory cleanup on resume

### Task 1.3: Create Suspension/Resumption APIs (6 hours)

#### Pre-Development Checklist

- [ ] Design API contracts
- [ ] Plan error handling
- [ ] Consider security implications
- [ ] Define response schemas

#### Implementation Steps

**File**: `/src/app/api/terminal/suspend/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { InMemoryTerminalService } from "@/services/terminal-memory.service";

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID required" },
        { status: 400 },
      );
    }

    // Get service instance
    const service = InMemoryTerminalService.getInstance();

    // Get session count before suspension
    const sessionCount = service.getProjectSessionCount(projectId);

    // Suspend sessions
    service.suspendProjectSessions(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      suspendedSessionCount: sessionCount,
      message: `Suspended ${sessionCount} terminal sessions`,
    });
  } catch (error) {
    console.error("[API] Terminal suspend error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to suspend sessions",
      },
      { status: 500 },
    );
  }
}
```

**File**: `/src/app/api/terminal/resume/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { InMemoryTerminalService } from "@/services/terminal-memory.service";

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID required" },
        { status: 400 },
      );
    }

    // Get service instance
    const service = InMemoryTerminalService.getInstance();

    // Resume sessions
    const suspensionState = service.resumeProjectSessions(projectId);

    if (suspensionState) {
      // Get current session details
      const sessions = service.listSessions(projectId);

      return NextResponse.json({
        success: true,
        projectId,
        resumed: true,
        sessions,
        uiState: suspensionState.uiState,
        message: `Resumed ${sessions.length} terminal sessions`,
      });
    } else {
      return NextResponse.json({
        success: true,
        projectId,
        resumed: false,
        sessions: [],
        message: "No suspended sessions found",
      });
    }
  } catch (error) {
    console.error("[API] Terminal resume error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to resume sessions",
      },
      { status: 500 },
    );
  }
}
```

#### Testing Checklist

- [ ] Suspend endpoint working
- [ ] Resume endpoint working
- [ ] Error handling robust
- [ ] Response schemas correct
- [ ] Service integration verified

### Phase 1 Verification Checklist

#### Integration Testing

- [ ] Create test project A with 3 terminals
- [ ] Run different commands in each terminal
- [ ] Switch to project B
- [ ] Verify project A sessions suspended
- [ ] Create 2 terminals in project B
- [ ] Switch back to project A
- [ ] Verify project A sessions resumed
- [ ] Verify all processes still running

#### Success Metrics

- [ ] 100% session survival rate
- [ ] <500ms suspension time
- [ ] <500ms resumption time
- [ ] Zero process interruption
- [ ] Correct UI state restoration

---

## PHASE 2: WEBSOCKET ENHANCEMENTS (Week 1 - 12 Hours)

### Task 2.1: WebSocket Server Suspension Support (8 hours)

#### Pre-Development Checklist

- [ ] Review current WebSocket server architecture
- [ ] Design suspension message protocol
- [ ] Plan connection state management
- [ ] Consider buffering strategy

#### Implementation Steps

**File**: `/src/server/websocket/terminal-ws-standalone.js`

```javascript
class TerminalWebSocketServer {
  constructor(port = 4001) {
    // Existing initialization...

    // New suspension tracking
    this.projectSessionMap = new Map(); // projectId -> Set<sessionId>
    this.sessionProjectMap = new Map(); // sessionId -> projectId
    this.suspendedSessions = new Map(); // sessionId -> suspensionData
    this.outputBuffers = new Map(); // sessionId -> buffered output

    // Listen to memory service events
    if (this.memoryService) {
      this.memoryService.on("projectSuspended", (data) => {
        this.handleProjectSuspension(data.projectId, data.sessionCount);
      });

      this.memoryService.on("projectResumed", (data) => {
        this.handleProjectResumption(data.projectId, data.sessionCount);
      });
    }
  }

  // Handle project suspension
  handleProjectSuspension(projectId, sessionCount) {
    const sessionIds = this.projectSessionMap.get(projectId) || new Set();

    console.log(
      `[Terminal WS] Suspending ${sessionIds.size} WebSocket connections for project ${projectId}`,
    );

    sessionIds.forEach((sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        // Mark as suspended but keep WebSocket alive
        session.suspended = true;
        session.suspendedAt = new Date();

        // Start buffering output
        if (!this.outputBuffers.has(sessionId)) {
          this.outputBuffers.set(sessionId, []);
        }

        // Store suspension data
        this.suspendedSessions.set(sessionId, {
          projectId,
          suspendedAt: new Date(),
          webSocketAlive: session.ws && session.ws.readyState === 1,
        });

        // Notify frontend
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(
            JSON.stringify({
              type: "projectSuspended",
              projectId,
              sessionId,
              message: "Project suspended - terminal session preserved",
            }),
          );
        }
      }
    });
  }

  // Handle project resumption
  handleProjectResumption(projectId, sessionCount) {
    const sessionIds = this.projectSessionMap.get(projectId) || new Set();

    console.log(
      `[Terminal WS] Resuming ${sessionIds.size} WebSocket connections for project ${projectId}`,
    );

    sessionIds.forEach((sessionId) => {
      const session = this.sessions.get(sessionId);
      const suspensionData = this.suspendedSessions.get(sessionId);

      if (session && suspensionData) {
        // Resume session
        session.suspended = false;
        delete session.suspendedAt;

        // Send buffered output
        const bufferedOutput = this.outputBuffers.get(sessionId) || [];
        if (
          bufferedOutput.length > 0 &&
          session.ws &&
          session.ws.readyState === 1
        ) {
          bufferedOutput.forEach((output) => {
            session.ws.send(
              JSON.stringify({
                type: "output",
                data: output.data,
                timestamp: output.timestamp,
              }),
            );
          });

          // Clear buffer
          this.outputBuffers.delete(sessionId);
        }

        // Clean up suspension data
        this.suspendedSessions.delete(sessionId);

        // Notify frontend
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(
            JSON.stringify({
              type: "projectResumed",
              projectId,
              sessionId,
              suspendedDuration:
                Date.now() - suspensionData.suspendedAt.getTime(),
              message: "Project resumed - terminal session restored",
            }),
          );
        }
      }
    });
  }

  // Enhanced cleanup respecting suspension
  cleanupInactiveSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const suspensionMaxAge = 2 * 60 * 60 * 1000; // 2 hours for suspended

    for (const [sessionKey, session] of this.sessions) {
      if (!session.ws || session.ws.readyState !== 1) {
        // Use longer timeout for suspended sessions
        const maxAgeToUse = session.suspended ? suspensionMaxAge : maxAge;
        const relevantTime =
          session.suspendedAt || session.lastDisconnectTime || now;
        const disconnectedTime = now - relevantTime;

        if (disconnectedTime > maxAgeToUse) {
          console.log(
            `Cleaning up ${session.suspended ? "suspended" : "disconnected"} session: ${sessionKey}`,
          );
          this.cleanupSession(sessionKey);
        }
      }
    }
  }
}
```

#### Testing Checklist

- [ ] Suspension events handled correctly
- [ ] Output buffering during suspension
- [ ] Resumption replays buffered output
- [ ] WebSocket connections maintained
- [ ] Cleanup respects suspension state

### Task 2.2: Frontend WebSocket Client Updates (4 hours)

#### Pre-Development Checklist

- [ ] Review current WebSocket client
- [ ] Design message handling
- [ ] Plan UI feedback
- [ ] Consider reconnection logic

#### Implementation Steps

**File**: `/src/modules/workspace/components/Terminal/XTermViewV2.tsx`

```typescript
// Add suspension state tracking
const [isSuspended, setIsSuspended] = useState(false);
const [suspensionMessage, setSuspensionMessage] = useState<string | null>(null);

// Enhanced WebSocket message handler
const handleWebSocketMessage = (event: MessageEvent) => {
  try {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'output':
        if (terminalRef.current && !isSuspended) {
          terminalRef.current.write(message.data);
        }
        break;

      case 'projectSuspended':
        setIsSuspended(true);
        setSuspensionMessage('Session suspended - switching projects');
        console.log(`Terminal ${sessionId} suspended for project switch`);
        break;

      case 'projectResumed':
        setIsSuspended(false);
        setSuspensionMessage(null);
        console.log(`Terminal ${sessionId} resumed after ${message.suspendedDuration}ms`);
        // Clear terminal and show resumption message
        if (terminalRef.current) {
          terminalRef.current.write('\r\n\x1b[32m[Session Resumed]\x1b[0m\r\n');
        }
        break;

      case 'error':
        console.error('Terminal error:', message.data);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  } catch (err) {
    console.error('Failed to parse WebSocket message:', err);
  }
};

// Visual suspension indicator
{isSuspended && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
    <div className="bg-slate-800 p-4 rounded-lg">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-yellow-300 text-sm">{suspensionMessage}</span>
      </div>
    </div>
  </div>
)}
```

#### Testing Checklist

- [ ] Suspension messages handled
- [ ] Visual indicators working
- [ ] Resumption messages displayed
- [ ] Terminal output continues after resume
- [ ] No errors during suspension

### Phase 2 Verification Checklist

#### WebSocket Testing

- [ ] Create terminals in project A
- [ ] Monitor WebSocket messages in DevTools
- [ ] Switch to project B
- [ ] Verify suspension messages sent
- [ ] Switch back to project A
- [ ] Verify resumption messages sent
- [ ] Check buffered output delivered

#### Success Metrics

- [ ] 100% WebSocket connection survival
- [ ] Zero message loss during suspension
- [ ] <100ms message delivery time
- [ ] Proper visual feedback
- [ ] Clean error handling

---

## PHASE 3: DATABASE PERSISTENCE (Week 2 - 16 Hours)

### Task 3.1: Database Schema Creation (6 hours)

#### Pre-Development Checklist

- [ ] Review existing Prisma schema
- [ ] Design table relationships
- [ ] Plan indexes for performance
- [ ] Consider data retention policies

#### Implementation Steps

**File**: `/prisma/schema.prisma`

```prisma
// Add to existing schema

model TerminalSessionMetadata {
  sessionId         String   @id @map("session_id")
  projectId         String   @map("project_id")
  processId         Int?     @map("process_id")
  webSocketConnected Boolean @default(false) @map("websocket_connected")
  persistentState   Json     @default("{}") @map("persistent_state")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([updatedAt])
  @@map("terminal_session_metadata")
}

model ProjectTerminalUIState {
  projectId        String   @id @map("project_id")
  currentLayout    String   @default("1x1") @map("current_layout")
  focusedSessions  Json     @default("[]") @map("focused_sessions")
  sessionPositions Json     @default("{}") @map("session_positions")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_terminal_ui_state")
}

model TerminalProcessRegistry {
  sessionId           String   @id @map("session_id")
  projectId           String   @map("project_id")
  processId           Int      @map("process_id")
  commandLine         String?  @map("command_line")
  workingDirectory    String?  @map("working_directory")
  environmentVariables Json    @default("{}") @map("environment_variables")
  processStatus       String   @default("running") @map("process_status")
  startedAt           DateTime @default(now()) @map("started_at")
  lastActivity        DateTime @default(now()) @map("last_activity")

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  session TerminalSessionMetadata @relation(fields: [sessionId], references: [sessionId], onDelete: Cascade)

  @@index([projectId])
  @@index([processStatus])
  @@index([lastActivity])
  @@map("terminal_process_registry")
}
```

**Migration File**: `/prisma/migrations/20250113_terminal_session_persistence/migration.sql`

```sql
-- CreateTable
CREATE TABLE "terminal_session_metadata" (
    "session_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "process_id" INTEGER,
    "websocket_connected" BOOLEAN NOT NULL DEFAULT false,
    "persistent_state" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminal_session_metadata_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "project_terminal_ui_state" (
    "project_id" TEXT NOT NULL,
    "current_layout" TEXT NOT NULL DEFAULT '1x1',
    "focused_sessions" JSONB NOT NULL DEFAULT '[]',
    "session_positions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_terminal_ui_state_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "terminal_process_registry" (
    "session_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "process_id" INTEGER NOT NULL,
    "command_line" TEXT,
    "working_directory" TEXT,
    "environment_variables" JSONB NOT NULL DEFAULT '{}',
    "process_status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminal_process_registry_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE INDEX "terminal_session_metadata_project_id_idx" ON "terminal_session_metadata"("project_id");
CREATE INDEX "terminal_session_metadata_updated_at_idx" ON "terminal_session_metadata"("updated_at");

-- CreateIndex
CREATE INDEX "terminal_process_registry_project_id_idx" ON "terminal_process_registry"("project_id");
CREATE INDEX "terminal_process_registry_process_status_idx" ON "terminal_process_registry"("process_status");
CREATE INDEX "terminal_process_registry_last_activity_idx" ON "terminal_process_registry"("last_activity");

-- AddForeignKey
ALTER TABLE "terminal_session_metadata" ADD CONSTRAINT "terminal_session_metadata_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_terminal_ui_state" ADD CONSTRAINT "project_terminal_ui_state_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminal_process_registry" ADD CONSTRAINT "terminal_process_registry_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminal_process_registry" ADD CONSTRAINT "terminal_process_registry_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "terminal_session_metadata"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
```

#### Testing Checklist

- [ ] Migration runs successfully
- [ ] Tables created with correct structure
- [ ] Indexes created for performance
- [ ] Foreign keys enforced
- [ ] Cascade deletes working

### Task 3.2: Persistent Storage Service (10 hours)

#### Pre-Development Checklist

- [ ] Design service interface
- [ ] Plan error handling
- [ ] Consider transaction boundaries
- [ ] Design cleanup strategy

#### Implementation Steps

**File**: `/src/services/terminal-persistent-storage.service.ts`

```typescript
import { PrismaClient } from "@prisma/client";

export interface SessionMetadata {
  sessionId: string;
  projectId: string;
  processId: number;
  webSocketConnected: boolean;
  persistentState: SessionPersistentState;
}

export interface SessionPersistentState {
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  scrollPosition: number;
  commandHistory: string[];
  processState: "running" | "suspended" | "completed";
}

export interface TerminalUIState {
  currentLayout: string;
  focusedSessions: string[];
  sessionPositions: Record<string, number>;
}

export class DatabaseSessionStore {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async saveSessionMetadata(
    sessionId: string,
    metadata: SessionMetadata,
  ): Promise<void> {
    await this.prisma.terminalSessionMetadata.upsert({
      where: { sessionId },
      update: {
        projectId: metadata.projectId,
        processId: metadata.processId,
        webSocketConnected: metadata.webSocketConnected,
        persistentState: metadata.persistentState as any,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        projectId: metadata.projectId,
        processId: metadata.processId,
        webSocketConnected: metadata.webSocketConnected,
        persistentState: metadata.persistentState as any,
      },
    });
  }

  async loadSessionMetadata(
    sessionId: string,
  ): Promise<SessionMetadata | null> {
    const record = await this.prisma.terminalSessionMetadata.findUnique({
      where: { sessionId },
    });

    if (!record) return null;

    return {
      sessionId: record.sessionId,
      projectId: record.projectId,
      processId: record.processId || 0,
      webSocketConnected: record.webSocketConnected,
      persistentState: record.persistentState as SessionPersistentState,
    };
  }

  async saveProjectUIState(
    projectId: string,
    uiState: TerminalUIState,
  ): Promise<void> {
    await this.prisma.projectTerminalUIState.upsert({
      where: { projectId },
      update: {
        currentLayout: uiState.currentLayout,
        focusedSessions: uiState.focusedSessions,
        sessionPositions: uiState.sessionPositions as any,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        currentLayout: uiState.currentLayout,
        focusedSessions: uiState.focusedSessions,
        sessionPositions: uiState.sessionPositions as any,
      },
    });
  }

  async loadProjectUIState(projectId: string): Promise<TerminalUIState | null> {
    const record = await this.prisma.projectTerminalUIState.findUnique({
      where: { projectId },
    });

    if (!record) return null;

    return {
      currentLayout: record.currentLayout,
      focusedSessions: record.focusedSessions as string[],
      sessionPositions: record.sessionPositions as Record<string, number>,
    };
  }

  async cleanupExpiredSessions(olderThan: Date): Promise<number> {
    const result = await this.prisma.terminalSessionMetadata.deleteMany({
      where: {
        updatedAt: { lt: olderThan },
        webSocketConnected: false,
      },
    });

    return result.count;
  }

  async getProjectSessions(projectId: string): Promise<SessionMetadata[]> {
    const records = await this.prisma.terminalSessionMetadata.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });

    return records.map((record) => ({
      sessionId: record.sessionId,
      projectId: record.projectId,
      processId: record.processId || 0,
      webSocketConnected: record.webSocketConnected,
      persistentState: record.persistentState as SessionPersistentState,
    }));
  }
}

// Singleton instance
let instance: DatabaseSessionStore | null = null;

export function getDatabaseSessionStore(): DatabaseSessionStore {
  if (!instance) {
    instance = new DatabaseSessionStore();
  }
  return instance;
}
```

#### Testing Checklist

- [ ] Session metadata saves correctly
- [ ] Session metadata loads correctly
- [ ] UI state persistence working
- [ ] Cleanup removes old sessions
- [ ] Transaction handling robust

### Phase 3 Verification Checklist

#### Database Testing

- [ ] Run migration successfully
- [ ] Create sessions and verify DB records
- [ ] Suspend project and check persistence
- [ ] Resume project and verify restoration
- [ ] Test cleanup of old sessions

#### Success Metrics

- [ ] 100% data persistence accuracy
- [ ] <50ms save operation time
- [ ] <50ms load operation time
- [ ] Successful cleanup of expired data
- [ ] No data corruption issues

---

## PHASE 4: UI/UX IMPROVEMENTS (Week 2 - 12 Hours)

### Task 4.1: Terminal Header Enhancement (4 hours)

#### Implementation Checklist

- [ ] Add project name to header
- [ ] Show session counts (active/suspended/total)
- [ ] Add status indicators with colors
- [ ] Implement smooth animations
- [ ] Test responsive design

### Task 4.2: Session Status Indicators (4 hours)

#### Implementation Checklist

- [ ] Create status badge component
- [ ] Implement color coding (green/yellow/red)
- [ ] Add pulse animations for active sessions
- [ ] Show connection state clearly
- [ ] Test all status transitions

### Task 4.3: Project Switch Notifications (4 hours)

#### Implementation Checklist

- [ ] Create notification component
- [ ] Implement auto-dismiss timer
- [ ] Add session count information
- [ ] Smooth animation transitions
- [ ] Test notification stacking

---

## PHASE 5: TESTING & DEPLOYMENT (Week 3 - 8 Hours)

### Task 5.1: Comprehensive Testing (4 hours)

#### Testing Checklist

- [ ] Unit tests for all new functions
- [ ] Integration tests for suspend/resume flow
- [ ] Performance tests with 50+ sessions
- [ ] Stress tests with rapid project switching
- [ ] Edge case testing (network failures, etc.)

### Task 5.2: Production Deployment (4 hours)

#### Deployment Checklist

- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Production deployment executed
- [ ] Post-deployment validation

---

## Risk Assessment & Mitigation

### High Priority Risks

#### Memory Leaks (HIGH)

**Risk**: Sessions accumulating unbounded memory  
**Mitigation**:

- Implement session limits (10 per project, 50 per user)
- Auto-cleanup after 2 hours inactive
- Memory monitoring with alerts at 200MB

#### WebSocket Instability (MEDIUM)

**Risk**: Connections dropping during suspension  
**Mitigation**:

- Exponential backoff reconnection
- Output buffering during disconnection
- Fallback to polling if WebSocket fails

#### Database Performance (MEDIUM)

**Risk**: Slow queries with many sessions  
**Mitigation**:

- Proper indexing on projectId and updatedAt
- Batch updates where possible
- Connection pooling optimization

---

## Success Criteria

### Quantitative Metrics

- ✅ 100% session survival rate across project switches
- ✅ <500ms project switch time
- ✅ Zero process interruption
- ✅ <10MB memory per 10 sessions
- ✅ 100% WebSocket recovery rate

### Qualitative Metrics

- ✅ No manual terminal recreation needed
- ✅ Clear visual feedback on session states
- ✅ Intuitive project-terminal associations
- ✅ Smooth user experience
- ✅ Comprehensive error recovery

---

## Rollback Procedures

### Phase 0 Rollback (Immediate)

```bash
# Revert the hotfix
git revert HEAD
npm run build
./quick-restart.sh
```

### Full Rollback (Any Phase)

```bash
# Revert to previous version
git checkout main
git pull origin main
git checkout <previous-release-tag>

# Rollback database
npx prisma migrate reset --skip-seed

# Restart services
pm2 restart all
```

---

## Implementation Timeline

### Week 1 (Current)

- **Day 1**: Phase 0 Hotfix (2 hours) - TODAY
- **Day 2-3**: Phase 1 Core Infrastructure (16 hours)
- **Day 4-5**: Phase 2 WebSocket Enhancements (12 hours)

### Week 2

- **Day 1-3**: Phase 3 Database Persistence (16 hours)
- **Day 4-5**: Phase 4 UI/UX Improvements (12 hours)

### Week 3

- **Day 1**: Phase 5 Testing (4 hours)
- **Day 2**: Phase 5 Deployment (4 hours)
- **Day 3-5**: Buffer for issues and refinements

---

## Development Ready Status

### ✅ Phase 0: Ready for IMMEDIATE Implementation

- Clear code changes identified
- Simple removal of cleanup function
- Low risk, high impact fix
- Can be deployed TODAY

### ✅ Phase 1-5: Ready for Systematic Implementation

- All technical specifications complete
- Code examples provided
- File paths identified
- Testing procedures defined
- Success criteria established

---

## Notes for Developers

1. **Start with Phase 0** - Get immediate relief from the problem
2. **Test thoroughly** - Each phase has specific test procedures
3. **Monitor memory** - Watch for leaks with many sessions
4. **Document changes** - Update API docs and user guides
5. **Communicate status** - Keep team informed of progress

---

**Document Version**: 1.0  
**Created**: 2025-08-12  
**Status**: READY FOR IMPLEMENTATION  
**Next Action**: Execute Phase 0 Hotfix IMMEDIATELY
