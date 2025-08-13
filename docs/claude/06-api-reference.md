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
    "wsUrl": "ws://localhost:4000/ws/terminal-v2"
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
URL: ws://localhost:4000/ws/terminal-v2
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