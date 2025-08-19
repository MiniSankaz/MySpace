# AI Assistant Flow Blueprint

## Overview

This document describes the complete flow of the AI Assistant system, including interactions between Services, Functions, and Database tables. This blueprint serves as a reference for future maintenance and improvements.

## Database Schema

### Primary Tables

- **AssistantChatSession**: Main session records
- **AssistantChatMessage**: Individual messages in sessions
- **User**: User information
- **Project**: Project association (optional)

### Deprecated Tables (No longer used)

- ~~AssistantConversation~~
- ~~AssistantMessage~~

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│   API Routes     │───▶│   Services      │
│                 │    │                  │    │                 │
│ ChatInterface   │    │ /api/assistant/  │    │ AssistantService│
│ Components      │    │ chat/route.ts    │    │ ClaudeAIService │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        ▲
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Database Tables  │    │ External APIs   │
                       │                  │    │                 │
                       │ AssistantChat    │    │ Claude CLI      │
                       │ Session/Message  │    │ Background      │
                       └──────────────────┘    └─────────────────┘
```

## Complete Message Flow

### 1. User Sends Message

#### 1.1 Frontend → API

```
UI Component sends POST request to /api/assistant/chat
├── Headers: Authentication, Content-Type
├── Body: { message, sessionId, directMode? }
└── Response: { success, messageId, response, user }
```

#### 1.2 API Route Processing (`/api/assistant/chat/route.ts`)

```javascript
POST /api/assistant/chat
├── 1. Authentication Check
│   └── verifyAuth(request) → user
├── 2. Input Validation
│   └── messageSchema.safeParse(body)
├── 3. Session Creation/Retrieval
│   └── assistantLogger.createSession({
│       sessionId,
│       userId,
│       projectId,
│       sessionName,
│       model: directMode ? 'claude-direct' : 'claude-assistant'
│   })
├── 4. Log User Message
│   └── assistantLogger.logMessage({
│       sessionId: loggingSessionId,
│       role: 'user',
│       content: message,
│       userId,
│       projectId
│   })
├── 5. Process Message
│   ├── if (directMode):
│   │   └── assistant.sendDirectToClaude(userId, sessionId, message)
│   └── else:
│       └── assistant.processMessage(userId, sessionId, message)
├── 6. Log Assistant Response
│   └── assistantLogger.logMessage({
│       sessionId: loggingSessionId,
│       role: 'assistant',
│       content: responseContent,
│       tokens: estimatedTokens,
│       cost: estimatedCost,
│       userId,
│       projectId
│   })
└── 7. Return Response
```

### 2. Message Processing in AssistantService

#### 2.1 Direct Mode (`sendDirectToClaude`)

```javascript
AssistantService.sendDirectToClaude(userId, sessionId, message)
├── 1. Load Context
│   └── contextManager.getContext(userId, sessionId)
├── 2. Create User Message Object
│   └── userMessage = { id, userId, content, type: 'user', timestamp }
├── 3. Log User Message to DB (Additional)
│   └── assistantLogger.logMessage({
│       sessionId,
│       role: 'user',
│       content: message,
│       userId,
│       projectId: 'default'
│   })
├── 4. Prepare Conversation History
│   └── context.conversation.slice(-10).map(msg => ({ role, content }))
├── 5. Send to Claude with Session
│   └── claudeAI.sendMessageWithSession(message, sessionId, history, userId)
├── 6. Update In-Memory Context
│   └── context.conversation.push(userMessage)
├── 7. Create Response Object
│   └── response = { message, suggestions, data: { source, model } }
├── 8. Save Assistant Message
│   └── saveAssistantMessage(context, response.message)
└── 9. Return Response
```

#### 2.2 Claude AI Service Integration

```javascript
ClaudeAIService.sendMessageWithSession(message, sessionId, context, userId)
├── 1. Initialize Service
│   └── if (!isInitialized) await initialize()
├── 2. Session-Based Processing
│   └── claudeService.sendMessageWithSession(sessionId, message, context, userId)
├── 3. Session Manager
│   └── ClaudeSessionManager.sendMessageToSession(sessionId, fullMessage, userId)
├── 4. Background Claude Process
│   ├── getOrCreateSession(sessionId, userId)
│   ├── ClaudeBackgroundService.start() // if new session
│   └── ClaudeBackgroundService.sendMessage(fullMessage)
└── 5. Return Response
    └── { content, model: 'claude-direct-session', error? }
```

### 3. Database Operations

#### 3.1 AssistantLogger Service

```javascript
AssistantLoggingService
├── createSession(data)
│   └── db.assistantChatSession.upsert({
│       where: { id: sessionId },
│       create: { id, userId, projectId, sessionName, model, ... },
│       update: { lastActiveAt, endedAt: null }
│   })
└── logMessage(data)
    ├── Find session: db.assistantChatSession.findFirst({ where: { id } })
    ├── Create message: db.assistantChatMessage.create({
    │   data: { id, sessionId, userId, projectId, role, content, ... }
    │})
    └── Update session totals: db.assistantChatSession.update({
        data: { totalTokensUsed, totalCost, lastActiveAt }
    })
```

#### 3.2 ConversationStorage Service (Legacy Support)

```javascript
ConversationStorage
├── saveConversation(userId, sessionId, messages)
│   ├── Find/Create session: db.assistantChatSession.upsert()
│   ├── Get existing messages: db.assistantChatMessage.findMany()
│   └── Create new messages: db.assistantChatMessage.createMany()
└── loadConversation(userId, sessionId)
    └── db.assistantChatMessage.findMany({
        where: { sessionId, userId },
        orderBy: { timestamp: 'asc' }
    })
```

### 4. Claude Session Management

#### 4.1 Session Lifecycle

```javascript
ClaudeSessionManager
├── getOrCreateSession(sessionId, userId)
│   ├── Check existing: sessions.get(sessionId)
│   └── Create new:
│       ├── ClaudeBackgroundService.start()
│       ├── Setup event handlers
│       └── Store in sessions Map
├── sendMessageToSession(sessionId, message, userId)
│   ├── Get/Create session
│   ├── Update lastActivity
│   └── service.sendMessage(message)
├── removeSession(sessionId)
│   ├── service.stop()
│   └── sessions.delete(sessionId)
└── cleanupInactiveSessions() // Every 5 minutes
    └── Remove sessions inactive > 30 minutes
```

#### 4.2 Claude Background Service

```javascript
ClaudeBackgroundService
├── start()
│   ├── spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] })
│   ├── Setup readline interface
│   └── Handle stdout/stderr events
├── sendMessage(query)
│   ├── Generate messageId
│   ├── Add to messageQueue
│   ├── Write to claudeProcess.stdin
│   └── Wait for response with timeout
└── handleClaudeOutput(line)
    ├── Parse Claude response
    ├── Match to messageId
    └── Resolve promise
```

## Service Interactions Matrix

| Service                     | Dependencies                                     | Database Tables                            | External APIs |
| --------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------- |
| **API Route**               | AssistantLogger, AssistantService                | -                                          | -             |
| **AssistantService**        | ContextManager, ClaudeAIService, AssistantLogger | -                                          | -             |
| **AssistantLogger**         | Prisma                                           | AssistantChatSession, AssistantChatMessage | -             |
| **ClaudeAIService**         | ClaudeDirectService                              | -                                          | -             |
| **ClaudeDirectService**     | ClaudeSessionManager                             | -                                          | -             |
| **ClaudeSessionManager**    | ClaudeBackgroundService                          | -                                          | -             |
| **ClaudeBackgroundService** | -                                                | -                                          | Claude CLI    |
| **ContextManager**          | ConversationStorage                              | -                                          | -             |
| **ConversationStorage**     | Prisma                                           | AssistantChatSession, AssistantChatMessage | -             |

## Function Call Flow

### Complete Request Flow

```
1. UI.sendMessage(message)
   ↓
2. POST /api/assistant/chat
   ↓
3. verifyAuth() → user
   ↓
4. assistantLogger.createSession() → session
   ↓
5. assistantLogger.logMessage() → user message saved
   ↓
6. assistant.sendDirectToClaude()
   ↓
7. contextManager.getContext() → conversation history
   ↓
8. assistantLogger.logMessage() → user message logged again
   ↓
9. claudeAI.sendMessageWithSession()
   ↓
10. claudeService.sendMessageWithSession()
    ↓
11. sessionManager.sendMessageToSession()
    ↓
12. backgroundService.sendMessage() → Claude CLI
    ↓
13. Claude CLI Response
    ↓
14. Response flows back through stack
    ↓
15. saveAssistantMessage()
    ↓
16. assistantLogger.logMessage() → assistant message saved
    ↓
17. contextManager.saveContext() → in-memory update
    ↓
18. API returns response to UI
```

## Error Handling Strategy

### Database Errors

- AssistantLogger: Continue without logging, log error
- ConversationStorage: Fallback to file storage
- Session creation: Continue with default session

### Claude Service Errors

- Background service fails: Fallback to direct execution
- API key errors: Return error message to user
- Timeout: Return timeout message

### Authentication Errors

- No auth: Return 401 Unauthorized
- Invalid session: Create new session

## Performance Considerations

### Session Management

- **Memory Usage**: Sessions stored in Map (cleared after 30min)
- **Concurrency**: Multiple sessions can run simultaneously
- **Cleanup**: Automatic cleanup every 5 minutes

### Database Operations

- **Batch Inserts**: Use createMany for multiple messages
- **Indexing**: sessionId, userId, timestamp indexes
- **Deduplication**: Check existing message IDs

### Claude CLI Integration

- **Process Reuse**: Background processes stay alive
- **Timeout**: 30-second timeout for responses
- **Error Recovery**: Automatic process restart on failure

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Logging
ENABLE_TERMINAL_LOGGING=true
ENABLE_ASSISTANT_LOGGING=true

# Session Management
SESSION_TIMEOUT=1800000  # 30 minutes
CLEANUP_INTERVAL=300000  # 5 minutes
```

### Database Schema Updates

If schema changes are needed:

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Update TypeScript interfaces
4. Update service implementations

## Monitoring & Debugging

### Log Points

1. **API Entry**: Request received with sessionId
2. **Authentication**: User verification result
3. **Session Creation**: New session created
4. **Message Logging**: User/Assistant messages saved
5. **Claude Integration**: Request/Response to Claude
6. **Error Points**: All catch blocks log errors

### Debug Queries

```sql
-- Check recent sessions
SELECT * FROM "AssistantChatSession"
ORDER BY "createdAt" DESC LIMIT 10;

-- Check messages for session
SELECT * FROM "AssistantChatMessage"
WHERE "sessionId" = 'your-session-id'
ORDER BY "timestamp" ASC;

-- Session message counts
SELECT
  s."id",
  s."sessionName",
  COUNT(m."id") as message_count
FROM "AssistantChatSession" s
LEFT JOIN "AssistantChatMessage" m ON s."id" = m."sessionId"
GROUP BY s."id", s."sessionName"
ORDER BY s."createdAt" DESC;
```

## Future Improvements

### Scalability

- Move session storage to Redis
- Implement message queuing
- Add horizontal scaling support

### Features

- Message threading
- File attachment support
- Real-time streaming responses
- Message encryption

### Performance

- Database connection pooling
- Response caching
- Lazy loading for conversation history

---

_This document should be updated whenever the flow changes. Last updated: August 2025_
