# WebSocket Synchronization Design Document

## Problem Statement

The Terminal System suffers from critical synchronization issues between:

1. **Frontend State** (TerminalContainerV2.tsx) - Local focus management
2. **API Layer** (/api/terminal/focus) - Updates InMemoryService
3. **InMemoryService** (terminal-memory.service.ts) - Focus state storage
4. **WebSocket Servers** (terminal-ws-standalone.js, claude-terminal-ws.js) - Streaming logic

**Current Flow Issues**:

```
Frontend → API → InMemoryService ✅ (Working)
InMemoryService → WebSocket Servers ❌ (Missing)
WebSocket Servers → Frontend ❌ (Incomplete)
```

## Current State Analysis

### Existing WebSocket Message Types

```typescript
// Client → Server (Working)
{
  type: 'focus' | 'blur' | 'input' | 'resize'
  sessionId: string;
  data?: any;
}

// Server → Client (Limited)
{
  type: 'stream' | 'error'
  sessionId: string;
  data: string;
}
```

### Missing Synchronization Events

1. **Focus State Changes**: When InMemoryService updates focus, WebSocket servers don't know
2. **Multi-Session Updates**: Focus changes affect multiple sessions, but only one gets notified
3. **Connection State**: Frontend doesn't know WebSocket connection success/failure
4. **Layout Switching**: Grid mode focus changes not synchronized

## Solution Architecture

### Enhanced Event-Driven Synchronization

```typescript
// 1. InMemoryService becomes EventEmitter
class InMemoryTerminalService extends EventEmitter {
  setSessionFocus(sessionId: string, focused: boolean): void {
    // ... existing logic ...

    // NEW: Emit real-time events
    this.emit("focus_changed", {
      projectId: session.projectId,
      sessionId,
      focused,
      focusedSessions: Array.from(
        this.focusedSessions.get(session.projectId) || [],
      ),
      timestamp: Date.now(),
    });
  }
}

// 2. WebSocket servers subscribe to events
class TerminalWebSocketServer {
  constructor() {
    // Subscribe to focus changes
    memoryService.on("focus_changed", this.handleFocusChanged.bind(this));
  }

  handleFocusChanged({ projectId, sessionId, focused, focusedSessions }) {
    // Update local cache for performance
    this.focusedSessions.set(projectId, new Set(focusedSessions));

    // Notify all connected sessions for this project
    this.notifyProjectSessions(projectId, {
      type: "focus_update",
      focusedSessions,
      timestamp: Date.now(),
    });
  }
}
```

### Bidirectional Message Protocol

#### Server → Client Messages (Enhanced)

```typescript
interface ServerMessage {
  type:
    | "stream"
    | "focus_update"
    | "connection_status"
    | "error"
    | "sync_complete";
  sessionId: string;
  projectId?: string;
  data?: any;

  // Focus-specific fields
  focusedSessions?: string[];
  totalFocused?: number;
  maxFocused?: number;

  // Connection fields
  status?: "connected" | "disconnected" | "error";
  retryCount?: number;

  // Sync fields
  version?: number;
  timestamp: number;
}
```

#### Client → Server Messages (Enhanced)

```typescript
interface ClientMessage {
  type: "focus" | "blur" | "input" | "resize" | "sync_request" | "heartbeat";
  sessionId: string;
  projectId?: string;
  data?: any;

  // Sync fields
  expectedVersion?: number;
  timestamp: number;
}
```

## Implementation Details

### 1. InMemoryService Event Enhancement

```typescript
// File: /src/services/terminal-memory.service.ts
import { EventEmitter } from "events";

export class InMemoryTerminalService extends EventEmitter {
  // ... existing code ...

  public setSessionFocus(sessionId: string, focused: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(
        `[InMemoryTerminalService] Session ${sessionId} not found for focus update`,
      );
      return;
    }

    const projectId = session.projectId;
    let projectFocused = this.focusedSessions.get(projectId) || new Set();

    if (focused) {
      // Handle max focus limit
      if (projectFocused.size >= this.MAX_FOCUSED_PER_PROJECT) {
        const leastActive = this.getLeastActiveSession(
          projectId,
          projectFocused,
        );
        if (leastActive) {
          // Recursively unfocus least active session
          this.setSessionFocus(leastActive, false);
        }
      }

      projectFocused.add(sessionId);
      session.isFocused = true;
    } else {
      projectFocused.delete(sessionId);
      session.isFocused = false;
    }

    // Update the focused sessions map
    this.focusedSessions.set(projectId, projectFocused);
    session.lastActivity = new Date();

    // NEW: Emit focus change event
    this.emit("focus_changed", {
      projectId,
      sessionId,
      focused,
      focusedSessions: Array.from(projectFocused),
      totalFocused: projectFocused.size,
      maxFocused: this.MAX_FOCUSED_PER_PROJECT,
      timestamp: Date.now(),
      version: ++this.focusVersion,
    });

    console.log(
      `[InMemoryTerminalService] Session ${sessionId} focus set to ${focused}, total focused in project: ${projectFocused.size}`,
    );
  }

  // NEW: Focus version tracking for sync
  private focusVersion = 0;

  public getFocusVersion(): number {
    return this.focusVersion;
  }
}
```

### 2. WebSocket Server Event Handling

```typescript
// File: /src/server/websocket/terminal-ws-standalone.js
class TerminalWebSocketServer {
  constructor() {
    this.sessions = new Map();
    this.focusedSessions = new Map();
    this.memoryService =
      require("../../dist/services/terminal-memory.service.js").inMemoryTerminalService;

    // NEW: Subscribe to focus change events
    this.memoryService.on("focus_changed", this.handleFocusChanged.bind(this));

    // NEW: Track project connections for efficient notifications
    this.projectConnections = new Map(); // projectId -> Set<sessionId>
  }

  // NEW: Handle focus changes from InMemoryService
  handleFocusChanged({
    projectId,
    sessionId,
    focused,
    focusedSessions,
    timestamp,
    version,
  }) {
    console.log(
      `[TerminalWS] Focus changed for project ${projectId}: session ${sessionId} = ${focused}`,
    );

    // Update local cache for performance
    this.focusedSessions.set(projectId, new Set(focusedSessions));

    // Notify all connected clients for this project
    this.notifyProjectClients(projectId, {
      type: "focus_update",
      projectId,
      sessionId,
      focused,
      focusedSessions,
      totalFocused: focusedSessions.length,
      maxFocused: 4,
      timestamp,
      version,
    });
  }

  // NEW: Notify all clients in a project
  notifyProjectClients(projectId, message) {
    const projectSessions = this.projectConnections.get(projectId) || new Set();

    projectSessions.forEach((sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify(message));
      }
    });

    console.log(
      `[TerminalWS] Notified ${projectSessions.size} clients in project ${projectId}`,
    );
  }

  // Enhanced connection handling
  async handleConnection(ws, request) {
    // ... existing parsing logic ...

    // NEW: Track project connections
    if (!this.projectConnections.has(projectId)) {
      this.projectConnections.set(projectId, new Set());
    }
    this.projectConnections.get(projectId).add(sessionId);

    // Enhanced registration with retry
    const success = await this.registerSessionWithRetry(
      sessionId,
      ws,
      projectId,
    );
    if (!success) {
      ws.close(1008, "Session registration failed after retries");
      return;
    }

    // Send initial connection status and focus state
    ws.send(
      JSON.stringify({
        type: "connection_status",
        sessionId,
        status: "connected",
        focusedSessions: this.memoryService.getFocusedSessions(projectId),
        version: this.memoryService.getFocusVersion(),
        timestamp: Date.now(),
      }),
    );
  }

  // NEW: Enhanced session registration with retry
  async registerSessionWithRetry(sessionId, ws, projectId, maxRetries = 5) {
    const retryDelays = [100, 500, 1000, 2000, 4110]; // Progressive backoff

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const session = this.memoryService.getSession(sessionId);

      if (session) {
        // Successful registration
        this.sessions.set(sessionId, { ws, process: null, projectId });

        // Sync focus state immediately
        const focusedSessions =
          this.memoryService.getFocusedSessions(projectId);
        this.focusedSessions.set(projectId, new Set(focusedSessions));

        console.log(
          `[TerminalWS] Session ${sessionId} registered successfully on attempt ${attempt + 1}`,
        );
        return true;
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt] || 4110;
        console.log(
          `[TerminalWS] Session ${sessionId} not found, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error(
      `[TerminalWS] Failed to register session ${sessionId} after ${maxRetries} attempts`,
    );
    return false;
  }

  // Enhanced message handling
  handleMessage(sessionId, message) {
    const parsedMessage = JSON.parse(message);
    const { type, data } = parsedMessage;

    switch (type) {
      case "focus":
        // Client requesting focus (update InMemoryService)
        this.memoryService.setSessionFocus(sessionId, true);
        break;

      case "blur":
        // Client requesting unfocus
        this.memoryService.setSessionFocus(sessionId, false);
        break;

      case "sync_request":
        // Client requesting current focus state
        const session = this.sessions.get(sessionId);
        if (session) {
          const focusedSessions = this.memoryService.getFocusedSessions(
            session.projectId,
          );
          session.ws.send(
            JSON.stringify({
              type: "sync_complete",
              sessionId,
              focusedSessions,
              version: this.memoryService.getFocusVersion(),
              timestamp: Date.now(),
            }),
          );
        }
        break;

      case "heartbeat":
        // Respond to heartbeat
        const heartbeatSession = this.sessions.get(sessionId);
        if (heartbeatSession) {
          heartbeatSession.ws.send(
            JSON.stringify({
              type: "heartbeat",
              sessionId,
              timestamp: Date.now(),
            }),
          );
        }
        break;

      // ... existing input, resize handling ...
    }
  }

  // Enhanced cleanup
  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove from project connections
      if (session.projectId) {
        const projectSessions = this.projectConnections.get(session.projectId);
        if (projectSessions) {
          projectSessions.delete(sessionId);
          if (projectSessions.size === 0) {
            this.projectConnections.delete(session.projectId);
          }
        }
      }

      // ... existing cleanup logic ...
    }
  }
}
```

### 3. Frontend WebSocket Handling Enhancement

```typescript
// File: /src/modules/workspace/components/Terminal/XTermViewV2.tsx
const XTermViewV2 = ({ sessionId, projectId, type, isFocused, onData, onResize }) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [focusVersion, setFocusVersion] = useState(0);

  // Enhanced WebSocket message handling
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'stream':
          // Existing stream handling
          if (xtermRef.current) {
            xtermRef.current.write(message.data);
          }
          break;

        case 'focus_update':
          // NEW: Handle focus state updates from server
          console.log(`[XTermView] Focus update received for project ${projectId}:`, message.focusedSessions);

          // Notify parent component to update focus state
          if (onFocusUpdate) {
            onFocusUpdate(message.focusedSessions, message.version);
          }

          setFocusVersion(message.version);
          break;

        case 'connection_status':
          // NEW: Handle connection status updates
          setConnectionStatus(message.status);

          if (message.status === 'connected' && message.focusedSessions) {
            console.log(`[XTermView] Connected with focus state:`, message.focusedSessions);
            if (onFocusUpdate) {
              onFocusUpdate(message.focusedSessions, message.version || 0);
            }
          }
          break;

        case 'sync_complete':
          // NEW: Handle sync responses
          console.log(`[XTermView] Sync complete for session ${sessionId}`);
          if (onFocusUpdate) {
            onFocusUpdate(message.focusedSessions, message.version);
          }
          break;

        case 'heartbeat':
          // NEW: Handle heartbeat responses
          console.log(`[XTermView] Heartbeat received for session ${sessionId}`);
          break;

        case 'error':
          console.error(`[XTermView] WebSocket error for session ${sessionId}:`, message.data);
          setConnectionStatus('error');
          break;

        default:
          console.warn(`[XTermView] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[XTermView] Failed to parse WebSocket message:', error);
    }
  }, [sessionId, projectId, onFocusUpdate]);

  // NEW: Request sync on connection
  const requestSync = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'sync_request',
        sessionId,
        timestamp: Date.now()
      }));
    }
  }, [sessionId]);

  // Enhanced connection setup
  const connectWebSocket = useCallback(() => {
    // ... existing connection logic ...

    ws.onopen = () => {
      console.log(`Connected to ${type} terminal for session ${sessionId}`);
      setConnectionStatus('connected');

      // Reset reconnection attempts
      reconnectAttemptsRef.current = 0;

      // Request current focus state
      setTimeout(requestSync, 100); // Small delay to ensure server is ready

      // ... existing resize logic ...
    };

    ws.onmessage = handleWebSocketMessage;

    // ... rest of connection logic ...
  }, [sessionId, projectId, type, handleWebSocketMessage, requestSync]);

  // NEW: Heartbeat mechanism
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          sessionId,
          timestamp: Date.now()
        }));
      }
    }, 30000); // 30 second heartbeat

    return () => clearInterval(heartbeatInterval);
  }, [sessionId]);

  // Connection status indicator
  const renderConnectionStatus = () => {
    const statusColors = {
      connecting: 'text-yellow-400',
      connected: 'text-green-400',
      disconnected: 'text-red-400',
      error: 'text-red-600'
    };

    return (
      <div className={`text-xs ${statusColors[connectionStatus]} flex items-center gap-1`}>
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
          connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
          'bg-red-400'
        }`}></div>
        {connectionStatus}
      </div>
    );
  };

  return (
    <div className="h-full relative">
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10">
        {renderConnectionStatus()}
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="h-full w-full bg-black rounded"
        style={{ opacity: connectionStatus === 'connected' ? 1 : 0.7 }}
      />
    </div>
  );
};
```

### 4. TerminalContainer Integration

```typescript
// File: /src/modules/workspace/components/Terminal/TerminalContainerV2.tsx
const TerminalContainerV2 = () => {
  // Remove local focus state management, use server as single source of truth
  const [focusVersion, setFocusVersion] = useState(0);

  // NEW: Handle focus updates from WebSocket
  const handleFocusUpdate = useCallback((focusedSessions: string[], version: number) => {
    // Update sessions based on server state
    setSessions(prev => prev.map(session => ({
      ...session,
      isFocused: focusedSessions.includes(session.id)
    })));

    setFocusVersion(version);
    console.log(`[TerminalContainer] Focus updated to version ${version}:`, focusedSessions);
  }, []);

  // Enhanced terminal focus handling
  const handleTerminalFocus = async (sessionId: string, focused: boolean = true) => {
    try {
      const response = await fetch('/api/terminal/focus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          projectId: project.id,
          focused,
          expectedVersion: focusVersion // For conflict resolution
        })
      });

      const data = await response.json();

      if (data.success) {
        // WebSocket will handle the actual state update via focus_update message
        console.log(`[TerminalContainer] Focus API call successful for session ${sessionId}`);
      } else {
        console.error('[TerminalContainer] Focus API call failed:', data.error);
      }
    } catch (error) {
      console.error('[TerminalContainer] Failed to update terminal focus:', error);
    }
  };

  // Enhanced grid layout handling
  const handleGridLayoutFocus = async (sessionId: string) => {
    if (layout === 'grid') {
      // Grid mode: focus all visible terminals
      const visibleSessions = sessions.slice(0, 4);

      for (const session of visibleSessions) {
        await handleTerminalFocus(session.id, true);
      }
    } else {
      // Other layouts: focus single terminal
      await handleTerminalFocus(sessionId, true);
    }
  };

  // Render terminals with enhanced focus handling
  const renderTerminal = (session: TerminalSession) => (
    <div key={session.id} className={`terminal-panel ${session.isFocused ? 'focused' : ''}`}>
      <div className="terminal-header" onClick={() => handleGridLayoutFocus(session.id)}>
        <span className={`terminal-tab ${session.isFocused ? 'active' : ''}`}>
          {session.tabName}
        </span>
        <div className="focus-indicator">
          {session.isFocused && <div className="focus-dot animate-pulse" />}
        </div>
      </div>

      <XTermViewV2
        sessionId={session.id}
        projectId={project.id}
        type={session.type}
        isFocused={session.isFocused}
        onFocusUpdate={handleFocusUpdate}
        onData={(data) => console.log(`Terminal ${session.id} input:`, data)}
        onResize={(cols, rows) => console.log(`Terminal ${session.id} resized to ${cols}x${rows}`)}
      />
    </div>
  );
};
```

## Expected Outcomes

### Synchronization Flow (Fixed)

```
1. User clicks terminal → handleTerminalFocus()
2. Frontend calls /api/terminal/focus
3. API updates InMemoryService.setSessionFocus()
4. InMemoryService emits 'focus_changed' event
5. WebSocket servers receive event → update local cache
6. WebSocket servers broadcast 'focus_update' to all project clients
7. Frontend receives 'focus_update' → updates local state
8. UI reflects new focus state across all components
```

### Performance Benefits

- **Reduced API Calls**: Focus changes propagate via WebSocket, not polling
- **Consistent State**: Single source of truth eliminates state conflicts
- **Real-time Updates**: All connected clients see focus changes immediately
- **Efficient Streaming**: Only focused sessions receive real-time data

### Reliability Improvements

- **Retry Mechanism**: WebSocket registration with exponential backoff
- **Heartbeat Monitoring**: Detect and recover from connection issues
- **Version Tracking**: Prevent race conditions with state versions
- **Error Recovery**: Graceful degradation when sync fails

This design ensures reliable, real-time synchronization between all Terminal System components, resolving the streaming and focus issues identified in the analysis.
