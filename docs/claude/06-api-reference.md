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

## Terminal System

### POST /api/terminal/create
Create new terminal session
```json
Request: { "projectId": "string", "type": "system|claude" }
Response: { "sessionId": "string", "wsUrl": "string" }
```

### GET /api/terminal/list
List terminal sessions for project
```json
Query: ?projectId=string
Response: { "sessions": [...] }
```

### PUT /api/terminal/focus
Set focused terminal
```json
Request: { "sessionId": "string", "projectId": "string" }
Response: { "success": true }
```

### DELETE /api/terminal/close/:sessionId
Close terminal session
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