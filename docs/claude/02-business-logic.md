# Business Logic

## Core Business Rules

### Authentication & Authorization

- User authentication required for all protected routes under `(auth)`
- Session-based authorization with JWT access and refresh tokens
- AI Assistant maintains conversation history per user and session
- Workspace management with file explorer capabilities
- Role-based access control (Admin, User, Guest roles)

### System Limits

- Rate limiting: 100 requests/15 minutes per user
- File upload: Maximum 10MB per file
- Workspace: Maximum 100MB per workspace
- AI conversations: Cached for 15 minutes
- Terminal sessions: Maximum 10 per project

## User Roles & Permissions

### Admin Role

- Full system access
- User management capabilities
- All features enabled
- System configuration access
- Can view all user data
- Can modify system settings

### User Role

- Personal workspace access
- AI assistant usage
- Limited admin features
- Own data management
- Terminal access
- File management

### Guest Role

- Read-only access to public content
- No workspace access
- No AI assistant
- Limited functionality

## Key Business Processes

### 1. User Registration

```
1. Email validation required
2. Password complexity: 8+ chars, uppercase, lowercase, number, special char
3. Email verification (optional)
4. Default workspace creation
5. Welcome email sent
6. Initial settings configured
```

### 2. Session Management

```
1. JWT with 15-minute access token
2. 7-day refresh token
3. Automatic token refresh
4. Secure httpOnly cookies
5. Session persistence across tabs
6. Logout clears all tokens
```

### 3. AI Conversation Flow

```
1. Per-user conversation isolation
2. Session-based chat history
3. Message persistence in database
4. Fallback to cache on DB failure
5. Streaming responses
6. Context window management
```

### 4. File Management

```
1. User-scoped workspaces
2. Real-time file sync
3. Version control integration
4. Maximum 100MB per workspace
5. File type restrictions
6. Virus scanning (planned)
```

### 5. Terminal Management

```
1. Project-based isolation
2. Session persistence
3. Environment variable loading
4. Multiple terminal support
5. Background processing
6. Output buffering
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
├─────────────────────────────────────────────────────┤
│                         ↓                            │
│                   API Routes (/api)                  │
│                         ↓                            │
│                Middleware (Auth Check)               │
│                         ↓                            │
│              Services (Business Logic)               │
│                         ↓                            │
│                 Database (Prisma ORM)                │
│                         ↓                            │
│              PostgreSQL (DigitalOcean)               │
└─────────────────────────────────────────────────────┘

Parallel Services:
- WebSocket → Terminal Sessions → PTY Process
- Cache Manager → In-Memory Store → TTL Management
- Claude API → Streaming → Response Processing
```

## Business Metrics & KPIs

### User Engagement

- Daily Active Users (DAU)
- Session duration average
- AI conversations per user
- Terminal usage statistics

### System Performance

- API response time < 500ms
- Page load time < 3 seconds
- WebSocket latency < 100ms
- Database query time < 100ms

### Business Growth

- User registration rate
- Feature adoption rate
- User retention (30-day)
- Error rate < 1%

## Compliance & Security

### Data Protection

- GDPR compliance (planned)
- Data encryption at rest
- Data encryption in transit
- Regular security audits
- Vulnerability scanning

### Access Control

- Multi-factor authentication (planned)
- IP whitelisting (optional)
- Session timeout policies
- Password rotation requirements
- Audit logging

## Revenue Model (Future)

### Subscription Tiers

1. **Free Tier**
   - 5 AI conversations/day
   - 1 workspace
   - 2 terminal sessions
2. **Pro Tier** ($9.99/month)
   - Unlimited AI conversations
   - 5 workspaces
   - 10 terminal sessions
   - Priority support
3. **Enterprise** (Custom)
   - Unlimited everything
   - Custom integrations
   - SLA guarantee
   - Dedicated support
