# API Reference

## Authentication Endpoints

### POST /api/ums/auth/login

Login user with credentials

```json
Request: { "email": "string", "password": "string" }
Response: { "success": true, "user": {...}, "token": "..." }
```

### POST /api/ums/auth/register

Register new user

```json
Request: { "email": "string", "password": "string", "name": "string" }
Response: { "success": true, "user": {...} }
```

### POST /api/ums/auth/logout

Logout current user

```json
Response: { "success": true }
```

### POST /api/ums/auth/refresh

Refresh access token

```json
Request: { "refreshToken": "string" }
Response: { "accessToken": "string", "refreshToken": "string" }
```

## User Management

### GET /api/ums/users/me

Get current user profile

```json
Response: { "user": {...} }
```

### PUT /api/ums/users/:id

Update user profile

```json
Request: { "name": "string", "email": "string" }
Response: { "success": true, "user": {...} }
```

## AI Assistant

### POST /api/assistant/chat

Send message to AI assistant

```json
Request: { "message": "string", "sessionId": "string" }
Response: Stream of { "content": "string", "done": boolean }
```

### GET /api/assistant/sessions

Get user's chat sessions

```json
Response: { "sessions": [...] }
```

### GET /api/assistant/sessions/:id

Get specific session history

```json
Response: { "messages": [...] }
```

## AI Orchestration & Task Management

### POST /api/v1/ai/orchestration/chains

Create and execute a task chain from goals

```json
Request: {
  "goals": ["string[]"],
  "context": {
    "userId": "string",
    "sessionId": "string",
    "workspaceId": "string?",
    "portfolioId": "string?",
    "metadata": {}
  },
  "options": {
    "priority": "low|medium|high|critical",
    "timeout": "number?",
    "parallelization": "boolean?"
  }
}
Response: {
  "success": true,
  "chainId": "string",
  "estimatedDuration": "number",
  "tasksCount": "number",
  "status": "planning|executing|completed|failed",
  "websocketUrl": "string"
}
```

### GET /api/v1/ai/orchestration/chains/{chainId}/status

Get detailed status of a task chain

```json
Response: {
  "chainId": "string",
  "status": "TaskStatus",
  "progress": {
    "completed": "number",
    "total": "number",
    "percentage": "number",
    "currentTask": "string?"
  },
  "tasks": [
    {
      "id": "string",
      "name": "string",
      "status": "TaskStatus",
      "progress": "number",
      "startTime": "Date?",
      "endTime": "Date?",
      "result": "any?",
      "error": "string?"
    }
  ],
  "estimatedCompletion": "Date",
  "performance": {
    "executionTime": "number",
    "averageTaskTime": "number",
    "errorRate": "number"
  }
}
```

### PUT /api/v1/ai/orchestration/chains/{chainId}/control

Control chain execution (pause, resume, cancel)

```json
Request: {
  "action": "pause|resume|cancel|priority_change",
  "reason": "string?",
  "newPriority": "TaskPriority?"
}
Response: { "success": true, "status": "string" }
```

### POST /api/v1/ai/planning/analyze

Analyze goals and generate task plans

```json
Request: {
  "goals": [
    {
      "description": "string",
      "type": "development|analysis|documentation|trading|management",
      "priority": "number",
      "constraints": {
        "deadline": "Date?",
        "budget": "number?",
        "resources": "string[]?",
        "dependencies": "string[]?"
      }
    }
  ],
  "context": "TaskContext"
}
Response: {
  "plans": [
    {
      "id": "string",
      "goalId": "string",
      "tasks": "PlannedTask[]",
      "executionStrategy": "ExecutionStrategy",
      "estimatedDuration": "number",
      "requiredResources": "string[]",
      "riskAssessment": "RiskAssessment",
      "alternatives": "AlternativePlan[]"
    }
  ],
  "recommendations": "string[]",
  "complexityAnalysis": {
    "level": "simple|moderate|complex|highly-complex",
    "factors": {},
    "approach": "string"
  }
}
```

### GET /api/v1/ai/planning/templates

Get available planning templates

```json
Response: {
  "templates": [
    {
      "id": "string",
      "goalType": "string",
      "name": "string",
      "description": "string",
      "standardTasks": "string[]",
      "typicalDuration": "number",
      "requiredCapabilities": "string[]",
      "successRate": "number"
    }
  ]
}
```

## Multi-Agent Coordination

### POST /api/v1/ai/agents/collaboration

Create a collaboration session

```json
Request: {
  "goal": "string",
  "requiredCapabilities": "string[]",
  "options": {
    "maxAgents": "number?",
    "timeoutMinutes": "number?",
    "consensusThreshold": "number?",
    "preferredAgents": "string[]?"
  },
  "context": "TaskContext"
}
Response: {
  "sessionId": "string",
  "participants": [
    {
      "id": "string",
      "name": "string",
      "type": "AgentType",
      "capabilities": "string[]",
      "role": "coordinator|participant"
    }
  ],
  "estimatedDuration": "number",
  "websocketUrl": "string"
}
```

### GET /api/v1/ai/agents/available

Get available agents and their status

```json
Response: {
  "agents": [
    {
      "id": "string",
      "name": "string",
      "type": "AgentType",
      "status": "AgentStatus",
      "capabilities": "string[]",
      "workload": "number",
      "performance": "AgentPerformance",
      "availability": "available|busy|offline"
    }
  ],
  "totalCapabilities": "string[]",
  "recommendedCombinations": [
    {
      "purpose": "string",
      "agents": "string[]",
      "coverage": "number"
    }
  ]
}
```

### POST /api/v1/ai/agents/sessions/{sessionId}/tasks

Assign a collaborative task

```json
Request: {
  "task": {
    "description": "string",
    "requiredCapabilities": "string[]",
    "assignedAgents": "string[]?",
    "consensusRequired": "boolean?",
    "votingThreshold": "number?",
    "deadline": "Date?"
  }
}
Response: {
  "taskId": "string",
  "assignedAgents": "string[]",
  "estimatedCompletion": "Date"
}
```

## Terminal V2 System (Recommended)

### POST /api/terminal-v2/create

Create new terminal session with V2 architecture

```json
Request: {
  "projectId": "string",
  "projectPath": "string",
  "mode": "normal|claude"
}
Response: {
  "session": {
    "id": "string",
    "projectId": "string",
    "wsUrl": "ws://localhost:4110/ws/terminal-v2"
  }
}
```

### GET /api/terminal-v2/list

List terminal sessions for project

```json
Query: ?projectId=string
Response: {
  "sessions": [
    {
      "id": "string",
      "projectId": "string",
      "status": "active|suspended|closed",
      "createdAt": "string",
      "lastActivity": "string"
    }
  ]
}
```

### DELETE /api/terminal-v2/close/:sessionId

Close terminal session

```json
Response: { "success": true }
```

### GET /api/terminal-v2/migration-status

Get migration status and system metrics

```json
Response: {
  "migrationMode": "legacy|dual|new|progressive",
  "featureFlags": {...},
  "metrics": {
    "activeSessions": 0,
    "memoryUsage": 0,
    "cpuUsage": 0,
    "errorRate": 0
  },
  "health": "healthy|degraded|unhealthy",
  "recommendations": ["string"]
}
```

## Terminal Legacy System (Backward Compatible)

### POST /api/terminal/create

Create new terminal session (legacy)

```json
Request: { "projectId": "string", "type": "system|claude" }
Response: { "sessionId": "string", "wsUrl": "string" }
```

### GET /api/terminal/list

List terminal sessions for project (legacy)

```json
Query: ?projectId=string
Response: { "sessions": [...] }
```

### PUT /api/terminal/focus

Set focused terminal (legacy)

```json
Request: { "sessionId": "string", "projectId": "string" }
Response: { "success": true }
```

### DELETE /api/terminal/close/:sessionId

Close terminal session (legacy)

```json
Response: { "success": true }
```

## Market Data Service (NEW - Port 4170)

### GET /api/v1/market/quote/:symbol

Get real-time quote for single symbol

```json
Request: GET /api/v1/market/quote/AAPL
Response: {
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 175.25,
    "change": 2.15,
    "changePercent": 1.24,
    "volume": 45123456,
    "high": 176.50,
    "low": 173.10,
    "open": 174.00,
    "previousClose": 173.10,
    "timestamp": "2025-08-17T20:00:00Z",
    "source": "polygon",
    "delay": 0
  },
  "meta": {
    "cached": false,
    "apiCallsUsed": 1,
    "rateLimit": {
      "remaining": 99,
      "reset": "2025-08-17T20:01:00Z"
    }
  }
}
```

### GET /api/v1/market/quotes

Get batch quotes for multiple symbols

```json
Request: GET /api/v1/market/quotes?symbols=AAPL,GOOGL,MSFT
Response: {
  "success": true,
  "data": [
    { "symbol": "AAPL", "price": 175.25, ... },
    { "symbol": "GOOGL", "price": 2831.50, ... },
    { "symbol": "MSFT", "price": 378.90, ... }
  ],
  "meta": { "apiCallsUsed": 3, ... }
}
```

### GET /api/v1/market/history/:symbol

Get historical price data

```json
Request: GET /api/v1/market/history/AAPL?period=1M&interval=1d
Response: {
  "success": true,
  "data": {
    "symbol": "AAPL",
    "period": "1M",
    "interval": "1d",
    "bars": [
      {
        "timestamp": "2025-08-01T00:00:00Z",
        "open": 170.00,
        "high": 172.50,
        "low": 169.00,
        "close": 171.25,
        "volume": 42135678
      }
    ]
  }
}
```

### GET /api/v1/market/chart/:symbol

Get chart data optimized for frontend

```json
Request: GET /api/v1/market/chart/AAPL?timeframe=intraday&period=1D
Response: {
  "success": true,
  "data": {
    "symbol": "AAPL",
    "timeframe": "intraday",
    "charts": { "prices": [...], "volume": [...] },
    "indicators": { "sma": [...], "rsi": [...] }
  }
}
```

### GET /api/v1/market/search

Search for symbols and companies

```json
Request: GET /api/v1/market/search?query=apple&limit=5
Response: {
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "exchange": "NASDAQ",
      "sector": "Technology"
    }
  ]
}
```

### WebSocket /ws/market

Real-time market data streaming

```json
Connection: ws://localhost:4110/ws/market
Authentication: JWT token required

Subscribe: {
  "action": "subscribe",
  "symbols": ["AAPL", "GOOGL"],
  "types": ["quotes", "trades"]
}

Update: {
  "type": "quote",
  "symbol": "AAPL",
  "data": { "price": 175.30, "change": 2.20, ... },
  "timestamp": "2025-08-17T20:00:15Z"
}
```

## Workspace

### GET /api/workspace/files

List files in directory

```json
Query: ?path=string
Response: { "files": [...] }
```

### POST /api/workspace/files

Create file or directory

```json
Request: { "path": "string", "type": "file|directory", "content": "string" }
Response: { "success": true }
```

### PUT /api/workspace/files

Update file content

```json
Request: { "path": "string", "content": "string" }
Response: { "success": true }
```

### DELETE /api/workspace/files

Delete file or directory

```json
Query: ?path=string
Response: { "success": true }
```

## Dashboard

### GET /api/dashboard/stats

Get dashboard statistics

```json
Response: { "users": 0, "sessions": 0, "files": 0, ... }
```

### GET /api/health

System health check

```json
Response: { "status": "healthy", "services": {...} }
```

## WebSocket Endpoints

### Terminal V2 WebSocket

Connect to Terminal V2 for real-time terminal interaction

```
URL: ws://localhost:4110/ws/terminal-v2
Query Parameters:
  - sessionId: Terminal session ID
  - projectId: Project identifier

Message Format:
Incoming:
{
  "type": "input|resize|focus|ping",
  "data": "string|object",
  "timestamp": number
}

Outgoing:
{
  "type": "output|error|status|pong",
  "sessionId": "string",
  "data": "string|object",
  "timestamp": number
}
```

### Legacy Terminal WebSocket (Backward Compatible)

```
URL: ws://localhost:4001
Query Parameters: Same as above
```

### Claude Terminal WebSocket

```
URL: ws://localhost:4002
For AI-powered terminal sessions
```

### AI Orchestration WebSocket

Real-time updates for task chains and orchestration

```
URL: ws://localhost:4110/ws/ai/orchestration
Query Parameters:
  - chainId: Task chain ID (optional, for specific chain updates)
  - userId: User ID for authentication

Message Types:
Outgoing (Server to Client):
{
  "type": "chain:created|chain:progress|chain:completed|chain:failed",
  "chainId": "string",
  "data": {
    "progress": "number?",
    "currentTask": "string?",
    "results": "any[]?",
    "error": "string?"
  },
  "timestamp": "Date"
}

{
  "type": "task:started|task:progress|task:completed|task:failed",
  "taskId": "string",
  "chainId": "string",
  "data": {
    "progress": "number?",
    "logs": "string[]?",
    "result": "any?",
    "error": "string?"
  },
  "timestamp": "Date"
}
```

### Multi-Agent Collaboration WebSocket

Real-time collaboration between AI agents

```
URL: ws://localhost:4110/ws/ai/collaboration
Query Parameters:
  - sessionId: Collaboration session ID
  - userId: User ID for authentication

Message Types:
Outgoing (Server to Client):
{
  "type": "agent:joined|agent:left|agent:message",
  "sessionId": "string",
  "agentId": "string",
  "data": {
    "agent": "Agent?",
    "message": "any?",
    "role": "string?"
  },
  "timestamp": "Date"
}

{
  "type": "consensus:started|consensus:completed",
  "sessionId": "string",
  "data": {
    "topic": "string",
    "options": "DecisionOption[]?",
    "selectedOption": "string?",
    "votes": "Record<string, string>?",
    "confidence": "number?"
  },
  "timestamp": "Date"
}

Incoming (Client to Server):
{
  "type": "message|vote|task_assignment",
  "sessionId": "string",
  "data": {
    "content": "any",
    "targetAgent": "string?",
    "vote": "string?",
    "task": "CollaborativeTask?"
  }
}
```

## Migration API

### GET /api/terminal-v2/migration-status

Detailed migration status with recommendations

```json
Response: {
  "mode": "progressive",
  "progress": {
    "phase": 1,
    "completion": 75.5,
    "nextPhase": "2025-08-15T10:00:00Z"
  },
  "featureFlags": {
    "useNewSessionManager": true,
    "useNewStreamManager": false,
    "useNewWebSocket": true
  },
  "systemMetrics": {
    "activeSessions": 42,
    "memoryUsage": 1024.5,
    "cpuUsage": 15.2,
    "errorRate": 0.01,
    "responseTime": 45.6
  },
  "recommendations": [
    "Consider enabling new stream manager",
    "Memory usage is optimal",
    "System ready for next migration phase"
  ]
}
```

## Monitoring & Metrics

### GET /metrics

Prometheus metrics endpoint (production)

```
# HELP terminal_v2_active_sessions Current number of active terminal sessions
# TYPE terminal_v2_active_sessions gauge
terminal_v2_active_sessions 42

# HELP terminal_v2_memory_usage_mb Memory usage in megabytes
# TYPE terminal_v2_memory_usage_mb gauge
terminal_v2_memory_usage_mb 1024.5

# HELP terminal_v2_requests_total Total number of requests
# TYPE terminal_v2_requests_total counter
terminal_v2_requests_total{method="POST",endpoint="/api/terminal-v2/create"} 1543
```
