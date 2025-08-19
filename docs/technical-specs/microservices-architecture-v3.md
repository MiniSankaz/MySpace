# Stock Portfolio v3.0 - Microservices Architecture Technical Specification

## Executive Summary

The Stock Portfolio Management System v3.0 implements a modern microservices architecture with 6 independent services orchestrated through an API Gateway. The system provides real-time stock trading capabilities, AI-powered assistance, terminal operations, and comprehensive portfolio management features.

## System Architecture Overview

### Architecture Pattern

- **Type**: Microservices with API Gateway Pattern
- **Communication**: REST API + WebSocket for real-time features
- **Service Discovery**: Static registry with health monitoring
- **Load Balancing**: Round-robin with health checks
- **Resilience**: Circuit breaker pattern with automatic retry

### Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
│                  (Next.js App - Port 4100)                 │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Port 4110)                   │
│              - Dynamic Routing & Load Balancing             │
│              - Authentication Forwarding                    │
│              - Rate Limiting & Security                     │
│              - Health Aggregation                          │
└────────────────────────┬───────────────────────────────────┘
                         │
     ┌──────────┬────────┴────────┬────────┬────────┬────────┐
     ▼          ▼                 ▼        ▼        ▼        ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│   User   ││    AI    ││ Terminal ││Workspace ││Portfolio ││  Future  │
│Management││Assistant ││ Service  ││ Service  ││ Service  ││ Services │
│  (4100)  ││  (4130)  ││  (4140)  ││  (4150)  ││  (4160)  ││    ...   │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
     │          │                         │          │
     ▼          ▼                         ▼          ▼
┌──────────┐┌──────────┐            ┌──────────┐┌──────────┐
│PostgreSQL││Claude API│            │  Redis   ││ Market   │
│    DB    ││          │            │  Cache   ││   API    │
└──────────┘└──────────┘            └──────────┘└──────────┘
```

## Detailed Component Specifications

### 1. API Gateway Service (Port 4110)

**Purpose**: Central entry point for all client requests with intelligent routing and orchestration.

**Technical Specifications**:

- **Framework**: Express.js with TypeScript
- **Port**: 4110
- **Middleware Stack**:
  - Helmet (Security headers)
  - CORS (Cross-origin handling)
  - Compression (Response optimization)
  - Morgan (HTTP request logging)
  - Rate Limiting (DDoS protection)

**Routing Configuration**:

```typescript
const SERVICE_ROUTES = {
  "/api/v1/auth": "user-management",
  "/api/v1/users": "user-management",
  "/api/v1/chat": "ai-assistant",
  "/api/v1/assistant": "ai-assistant",
  "/api/v1/terminal": "terminal",
  "/api/v1/workspace": "workspace",
  "/api/v1/files": "workspace",
  "/api/v1/git": "workspace",
  "/api/v1/portfolios": "portfolio",
  "/api/v1/stocks": "portfolio",
  "/api/v1/trades": "portfolio",
  "/api/v1/positions": "portfolio",
  "/api/v1/performance": "portfolio",
  "/api/v1/export": "portfolio",
};
```

**WebSocket Proxies**:

- `/ws/terminal` → Terminal Service (4140)
- `/ws/chat` → AI Assistant Service (4130)
- `/ws/portfolio` → Portfolio Service (4160)

**Features**:

- Dynamic service routing with automatic failover
- Correlation ID tracking across services
- Health check aggregation
- Service discovery and registry
- Request/Response transformation
- Circuit breaker implementation (3 retries, exponential backoff)

### 2. User Management Service (Port 4100)

**Purpose**: Authentication, authorization, and user profile management.

**Technical Specifications**:

- **Framework**: Express.js with TypeScript
- **Port**: 4100
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management
- **Authentication**: JWT tokens

**API Endpoints**:

```
POST   /auth/login          - User authentication
POST   /auth/register       - New user registration
POST   /auth/refresh        - Token refresh
POST   /auth/logout         - Session termination
GET    /auth/validate       - Token validation
GET    /users/me           - Current user profile
GET    /users/:id          - User details
PUT    /users/:id          - Update user
DELETE /users/:id          - Delete user
```

**Security Features**:

- Password hashing with bcrypt
- JWT token management with refresh tokens
- Role-Based Access Control (RBAC)
- Rate limiting (500 requests/15min)
- Session management in Redis

### 3. AI Assistant Service (Port 4130)

**Purpose**: Claude AI integration for intelligent chat and code assistance.

**Technical Specifications**:

- **Framework**: Express.js with Socket.io
- **Port**: 4130
- **AI Provider**: Claude API (Anthropic)
- **Database**: PostgreSQL for conversation history
- **WebSocket**: Real-time streaming responses

**API Endpoints**:

```
GET    /chat/sessions       - List chat sessions
POST   /chat/message        - Send message
GET    /chat/search         - Search conversations
GET    /chat/models         - Available AI models
POST   /folders             - Create folder
PUT    /folders/:id         - Update folder
DELETE /folders/:id         - Delete folder
```

**WebSocket Events**:

- `connection` - Client connection
- `auth` - Authentication
- `stream_chat` - Streaming chat response
- `typing_start/stop` - Typing indicators
- `join_session` - Join chat session
- `leave_session` - Leave chat session

**Supported Models**:

- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

### 4. Terminal Service (Port 4140)

**Purpose**: Terminal V2 operations with PTY process management.

**Technical Specifications**:

- **Framework**: Express.js with WebSocket
- **Port**: 4140
- **Architecture**: Clean 3-tier architecture
- **Session Management**: In-memory with auto-cleanup

**API Endpoints**:

```
POST   /terminals/create              - Create terminal session
GET    /terminals                     - List active terminals
GET    /terminals/:sessionId          - Get terminal details
DELETE /terminals/:sessionId          - Close terminal
POST   /terminals/:sessionId/write    - Send input
POST   /terminals/:sessionId/resize   - Resize terminal
GET    /terminals/:sessionId/history  - Command history
GET    /terminals/stats/overview      - Service statistics
```

**WebSocket Protocol**:

- Path: `/ws/terminal-v2/`
- Events: `join`, `data`, `resize`, `ping`, `disconnect`
- Session format: `session_{timestamp}_{random}`

**Performance Metrics**:

- 60% memory reduction vs legacy system
- 40% CPU improvement
- 200+ concurrent sessions support
- Circuit breaker for resilience
- Auto-healing capabilities

### 5. Workspace Service (Port 4150)

**Purpose**: File system and Git operations management.

**Technical Specifications**:

- **Framework**: Express.js with TypeScript
- **Port**: 4150
- **Status**: Partially implemented
- **File Operations**: 20MB limit

**Planned Endpoints**:

```
GET    /files              - List files
POST   /files              - Create file
PUT    /files/:path        - Update file
DELETE /files/:path        - Delete file
GET    /projects           - List projects
POST   /projects           - Create project
GET    /git/status         - Git status
POST   /git/commit         - Create commit
POST   /git/push           - Push changes
POST   /git/pull           - Pull changes
```

**Features** (Planned):

- File system management
- Project structure management
- Git integration (branch, commit, push, pull)
- File upload/download
- Code editor integration
- Workspace synchronization
- Project templates
- File watching & auto-sync

### 6. Portfolio Service (Port 4160)

**Purpose**: Stock trading, portfolio management, and market data integration.

**Technical Specifications**:

- **Framework**: Express.js with WebSocket
- **Port**: 4160
- **Database**: PostgreSQL (Mock implementation)
- **Market Data**: Alpha Vantage API
- **WebSocket**: Real-time price updates

**API Endpoints**:

```
# Portfolio Management
GET    /api/v1/portfolios           - List portfolios
POST   /api/v1/portfolios           - Create portfolio
GET    /api/v1/portfolios/:id       - Get portfolio
PUT    /api/v1/portfolios/:id       - Update portfolio
DELETE /api/v1/portfolios/:id       - Delete portfolio

# Trading Operations
GET    /api/v1/trades               - Trade history
POST   /api/v1/trades               - Execute trade
GET    /api/v1/positions            - Current positions
POST   /api/v1/positions            - Open position

# Market Data
GET    /api/v1/stocks               - Stock search
GET    /api/v1/stocks/:symbol       - Stock details
GET    /api/v1/stocks/:symbol/price - Current price

# Analytics
GET    /api/v1/performance          - Performance metrics
GET    /api/v1/export               - Export reports
```

**Background Jobs**:

- Price updater (5-second intervals for mock data)
- Portfolio calculator (60-second intervals)
- Market data synchronization

**WebSocket Features**:

- Real-time price streaming
- Portfolio value updates
- Trade execution notifications

## Data Models and Schemas

### User Model

```typescript
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  sessions: Session[];
}
```

### Portfolio Model

```typescript
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currency: string;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  positions: Position[];
  trades: Trade[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Terminal Session Model

```typescript
interface TerminalSession {
  id: string;
  projectId: string;
  userId: string;
  pty: IPty;
  createdAt: Date;
  lastActivity: Date;
  buffer: string[];
  dimensions: { cols: number; rows: number };
}
```

## API Specifications

### Request/Response Format

All API endpoints follow RESTful conventions with JSON payloads:

```typescript
// Standard Response
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  correlationId?: string;
  service: string;
}

// Paginated Response
interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Authentication Flow

1. Client sends credentials to Gateway `/api/v1/auth/login`
2. Gateway forwards to User Management Service
3. Service validates and returns JWT tokens
4. Client includes token in Authorization header
5. Gateway validates and forwards user context

### Error Handling

```typescript
enum ErrorCodes {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

## Integration Requirements

### Service Communication

- **Protocol**: HTTP/HTTPS for REST, WS/WSS for WebSocket
- **Format**: JSON
- **Timeout**: 30 seconds for standard requests
- **Retry**: 3 attempts with exponential backoff

### External Services

1. **PostgreSQL Database**
   - Host: DigitalOcean
   - Port: 25060
   - Connection pooling enabled

2. **Redis Cache**
   - URL: redis://localhost:6379
   - Used for session management and caching

3. **Claude API**
   - Provider: Anthropic
   - Rate limits apply
   - Streaming support enabled

4. **Alpha Vantage API**
   - Market data provider
   - Rate limited to 5 calls/minute (free tier)

## Security Specifications

### Authentication & Authorization

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Token refresh mechanism
- Session management in Redis

### API Security

- Rate limiting per service
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention via Prisma ORM

### Data Protection

- Password hashing with bcrypt
- Environment variables for secrets
- HTTPS enforcement in production
- Correlation ID tracking

## Performance Requirements

### Response Times

- Health checks: < 100ms
- Standard API calls: < 500ms
- Database queries: < 200ms
- AI responses: Streaming (first byte < 1s)

### Scalability

- Support 200+ concurrent terminal sessions
- Handle 1000+ requests/minute per service
- WebSocket: 500+ concurrent connections
- Database connection pooling

### Resource Limits

- Memory: < 200MB per service
- CPU: < 25% per service (idle)
- File uploads: 20MB max
- Request payload: 10MB default

## Implementation Guidelines

### Development Standards

1. **Language**: TypeScript for all services
2. **Framework**: Express.js as base
3. **Code Style**: ESLint + Prettier
4. **Testing**: Jest for unit/integration tests
5. **Documentation**: JSDoc comments

### Service Structure

```
service-name/
├── src/
│   ├── index.ts           # Entry point
│   ├── routes/            # API routes
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── package.json
├── tsconfig.json
└── .env.example
```

### Deployment Considerations

1. **Containerization**: Docker support ready
2. **Environment Variables**: Centralized configuration
3. **Logging**: Winston with structured logging
4. **Monitoring**: Health endpoints for all services
5. **Graceful Shutdown**: SIGTERM/SIGINT handling

## Testing Requirements

### Unit Testing

- Minimum 80% code coverage
- Mock external dependencies
- Test business logic isolation

### Integration Testing

- Service-to-service communication
- Database operations
- WebSocket connections
- Authentication flows

### Load Testing

- Terminal service: 200 concurrent sessions
- API Gateway: 1000 requests/minute
- WebSocket: 500 concurrent connections

## Deployment Architecture

### Development Environment

- All services run locally
- Mock data for portfolio service
- Local PostgreSQL and Redis

### Production Environment

- Kubernetes orchestration (planned)
- Service mesh for communication
- Centralized logging (ELK stack)
- Prometheus metrics collection

## Appendices

### A. Service Port Allocation

- 4100: Next.js Frontend
- 4110: API Gateway
- 4100: User Management
- 4130: AI Assistant
- 4140: Terminal Service
- 4150: Workspace Service
- 4160: Portfolio Service
- 5555: Prisma Studio

### B. Environment Variables

```env
# Gateway
PORT=4110
FRONTEND_URL=http://localhost:4100
NODE_ENV=development

# User Management
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# AI Assistant
CLAUDE_API_KEY=...
CLAUDE_MODEL=claude-3-sonnet-20240229
MAX_TOKENS=4096

# Portfolio
ALPHA_VANTAGE_API_KEY=...
USE_MOCK_PRICES=true
MOCK_UPDATE_INTERVAL=5000
```

### C. API Testing Commands

```bash
# Health check all services
curl http://localhost:4110/health/all

# Service discovery
curl http://localhost:4110/services

# Individual service health
curl http://localhost:4100/health  # User Management
curl http://localhost:4130/health  # AI Assistant
curl http://localhost:4140/health  # Terminal
curl http://localhost:4150/health  # Workspace
curl http://localhost:4160/health  # Portfolio
```

---

_Document Version: 1.0.0_
_Last Updated: 2025-08-15_
_Architecture Version: v3.0.0_
