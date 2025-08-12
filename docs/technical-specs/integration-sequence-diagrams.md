# Workspace Integration Issues - Sequence Diagrams

## Current Problematic Flow (Before Fix)

```mermaid
sequenceDiagram
    participant Frontend as TerminalContainerV3
    participant API as /api/terminal/create
    participant Memory as InMemoryService
    participant WS as WebSocket Server
    participant XTerm as XTermViewV2

    Frontend->>API: Create session request
    API->>Memory: Create session (status: connecting)
    Memory-->>API: Return session object
    API-->>Frontend: Return session immediately
    
    Note over Frontend: Renders XTermViewV2 immediately
    Frontend->>XTerm: Render with sessionId
    
    par Parallel Execution
        XTerm->>WS: Attempt WebSocket connection
        WS->>Memory: Register WebSocket (FAILS - session not ready)
        WS-->>XTerm: Connection rejected
    and
        Memory->>Memory: Continue session initialization
        Memory->>Memory: Status: connecting → active (too late)
    end
    
    Note over XTerm: Terminal appears in UI but not functional
    Note over XTerm: User must refresh page to fix
```

## Enhanced Solution Flow (After Fix)

```mermaid
sequenceDiagram
    participant Frontend as TerminalContainerV3
    participant API as /api/terminal/create  
    participant Memory as InMemoryService
    participant WS as WebSocket Server
    participant XTerm as XTermViewV2

    Frontend->>API: Create session request
    API->>Memory: Create session (status: connecting)
    Memory->>Memory: Initialize session
    
    Note over Memory: Wait for WebSocket server readiness
    Memory->>WS: Prepare session slot
    WS-->>Memory: Confirm readiness
    Memory->>Memory: Status: connecting → ready
    
    Memory-->>API: Return session with websocketReady: true
    API-->>Frontend: Return session + readiness status
    
    Note over Frontend: Only renders when WebSocket is ready
    Frontend->>XTerm: Render with confirmed ready session
    XTerm->>WS: Connect (guaranteed to succeed)
    WS->>Memory: Register WebSocket (SUCCESS)
    Memory-->>XTerm: Session active, begin streaming
    
    Note over XTerm: Terminal immediately functional
```

## Git WebSocket Loop Issue (Before Fix)

```mermaid
sequenceDiagram
    participant Git as GitConfigurationV2
    participant CB as Circuit Breaker
    participant WS as WebSocket
    participant Server as Git WS Server

    Git->>CB: Can attempt connection?
    CB-->>Git: Yes (no cooldown check)
    Git->>WS: new WebSocket(url)
    WS->>Server: Connect attempt
    Server-->>WS: Connection failed
    WS-->>Git: onerror event
    
    Git->>CB: Record failure
    Note over Git: Immediate retry without delay
    
    Git->>CB: Can attempt connection? (no cooldown)
    CB-->>Git: Yes (circuit still allows)
    Git->>WS: new WebSocket(url) (LOOP)
    
    Note over Git: Infinite reconnection loop
    Note over Server: Resource exhaustion
```

## Enhanced Git WebSocket Flow (After Fix)

```mermaid
sequenceDiagram
    participant Git as GitConfigurationV2
    participant ECB as Enhanced Circuit Breaker
    participant Pool as WebSocket Pool
    participant WS as WebSocket
    participant Server as Git WS Server

    Git->>ECB: Can attempt connection?
    ECB->>ECB: Check cooldown period (5 seconds)
    ECB-->>Git: Yes/No based on cooldown + circuit state
    
    alt Connection allowed
        Git->>Pool: Get/create connection for project
        Pool->>WS: Create new WebSocket
        WS->>Server: Connect attempt
        
        alt Connection successful
            Server-->>WS: Connected
            WS-->>Pool: Store healthy connection
            Pool-->>Git: Return ready WebSocket
            ECB->>ECB: Record success
        else Connection failed
            Server-->>WS: Connection failed
            WS-->>Git: onerror event
            ECB->>ECB: Record failure + start cooldown
            Note over ECB: Next attempt blocked for 5+ seconds
        end
    else Connection blocked
        Note over Git: Wait for cooldown period
        Git->>Git: Schedule retry after cooldown
    end
```

## State Synchronization Issue (Before Fix)

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Focus API
    participant Memory as InMemoryService
    participant WS1 as Terminal WS
    participant WS2 as Git WS

    UI->>API: Set focus(sessionId, true)
    API->>Memory: setSessionFocus(sessionId, true)
    Memory->>Memory: Update focus state locally
    Memory-->>API: Return success
    API-->>UI: Focus updated
    
    Note over Memory: Emits focusChanged event
    Memory->>WS1: Focus event (may not reach)
    Note over WS2: Never receives focus event
    
    par Different States
        Note over UI: Shows session as focused
    and
        Note over WS1: May have stale focus state
    and 
        Note over WS2: Definitely has stale focus state
    and
        Note over Memory: Has correct focus state
    end
    
    Note over UI,WS2: State inconsistency across components
```

## Enhanced State Synchronization (After Fix)

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Focus API
    participant Memory as InMemoryService
    participant WS1 as Terminal WS
    participant WS2 as Git WS

    UI->>API: Set focus(sessionId, true)
    API->>Memory: setSessionFocus(sessionId, true)
    Memory->>Memory: Update focus state + increment version
    
    Note over Memory: Version-controlled state update
    Memory->>Memory: Create FocusState{version: n+1, focused: [...]}
    Memory-->>API: Return FocusState with version
    API-->>UI: Focus updated with version
    
    Note over Memory: Broadcast versioned event
    par Synchronized Updates
        Memory->>WS1: focusChanged event with version
        WS1->>WS1: Update local cache with version check
    and
        Memory->>WS2: focusChanged event with version  
        WS2->>WS2: Update local cache with version check
    and
        UI->>UI: Update local state with version
    end
    
    Note over UI,WS2: All components have consistent versioned state
```

## Integration Health Monitoring

```mermaid
sequenceDiagram
    participant Monitor as Health Monitor
    participant Memory as InMemoryService
    participant WS as WebSocket Servers
    participant Metrics as Metrics Store

    loop Every 30 seconds
        Monitor->>Memory: Get session health metrics
        Memory-->>Monitor: Active/Failed/Connecting counts
        
        Monitor->>WS: Get WebSocket connection stats
        WS-->>Monitor: Connection/Reconnection/Error counts
        
        Monitor->>Monitor: Calculate health scores
        Monitor->>Metrics: Store health metrics
        
        alt Health degraded
            Monitor->>Monitor: Trigger alert
            Note over Monitor: Notify operations team
        else Health good
            Note over Monitor: Continue monitoring
        end
    end
```

## Error Recovery Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant Memory as InMemoryService
    participant WS as WebSocket Server
    participant Recovery as Error Recovery

    Note over WS: WebSocket connection lost
    WS->>Memory: Connection lost event
    Memory->>Memory: Mark session as disconnected
    Memory->>UI: Emit connection lost event
    
    UI->>UI: Show reconnecting indicator
    
    Recovery->>Recovery: Start recovery process
    Recovery->>WS: Attempt reconnection with backoff
    
    alt Reconnection successful
        WS->>Memory: Connection restored
        Memory->>Memory: Mark session as active
        Memory->>UI: Emit connection restored
        UI->>UI: Hide reconnecting indicator
        UI->>UI: Resume normal operation
    else Reconnection failed
        Recovery->>Recovery: Escalate to manual intervention
        UI->>UI: Show connection failed state
        Note over UI: User can manually retry
    end
```

---

These sequence diagrams illustrate the complete flow of issues and their solutions in the workspace integration system. The enhanced flows show how proper synchronization, state management, and error handling resolve the critical issues identified in the analysis.