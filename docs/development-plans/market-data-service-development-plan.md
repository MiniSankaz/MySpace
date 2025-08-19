# Development Plan: Market Data Service with Polygon.io Integration

> **📅 Date Created**: 2025-08-17  
> **👤 Development Planner**: Claude  
> **🔗 References**: 
> - BA Requirements: Not provided (proceeding with SA specs)
> - SA Technical Specs: `/docs/technical-specs/market-data-service-polygon-integration.md` [2025-08-17]
> **🎯 Target Phase**: Phase 1 - Core Infrastructure & Basic Endpoints

## Executive Summary

พัฒนา Market Data Service เป็น microservice ที่ port 4170 สำหรับให้บริการข้อมูลราคาหุ้นแบบ real-time และ historical data โดยเชื่อมต่อกับ Polygon.io API ตาม technical specification ที่ System Analyst วางไว้เมื่อ 2025-08-17

## Gap Analysis

### Current State ❌
- ไม่มี Market Data Service 
- Frontend แสดงข้อมูล mock data
- Portfolio value คำนวณจากราคา static
- ไม่มีกราฟราคาหุ้นจริง
- ไม่มีระบบ caching สำหรับ market data

### Desired State ✅
- Market Data Service ทำงานที่ port 4170
- เชื่อมต่อ Polygon.io API สำเร็จ
- มี caching strategy ด้วย Redis + PostgreSQL
- Frontend แสดงราคาหุ้นจริง
- Portfolio value คำนวณจากราคาตลาด real-time

## Development Artifacts

### 1. User Stories

#### US-001: Real-time Quote Service
**As a** portfolio holder  
**I want to** see real-time stock prices  
**So that** I can track my portfolio value accurately  
**Acceptance Criteria**:
- ราคาอัปเดตภายใน 30 วินาที
- แสดง price, change, volume
- มี indicator บอก data freshness

#### US-002: Historical Data Access
**As a** trader  
**I want to** view historical price charts  
**So that** I can analyze price trends  
**Acceptance Criteria**:
- มี timeframe: 1D, 1W, 1M, 3M, 6M, 1Y
- Response time < 2 seconds
- แสดงข้อมูล OHLCV

#### US-003: Batch Quote Updates
**As a** system  
**I want to** fetch multiple stock prices efficiently  
**So that** portfolio values update quickly  
**Acceptance Criteria**:
- Support up to 100 symbols per request
- Response time < 3 seconds
- Proper error handling for invalid symbols

### 2. Feature List (Priority Order)

| Priority | Feature | Effort (hrs) | Dependencies |
|----------|---------|--------------|--------------|
| P0 | Service Setup & Structure | 4 | None |
| P0 | Polygon.io Client Integration | 6 | API credentials |
| P0 | Database Schema Setup | 3 | PostgreSQL |
| P0 | Redis Cache Setup | 3 | Redis |
| P1 | GET /quote/:symbol endpoint | 4 | Polygon client |
| P1 | GET /quotes batch endpoint | 4 | Polygon client |
| P1 | Caching Layer Implementation | 6 | Redis + DB |
| P1 | API Gateway Integration | 2 | Gateway service |
| P2 | GET /history/:symbol endpoint | 6 | Database |
| P2 | GET /chart/:symbol endpoint | 4 | History data |
| P2 | Rate Limiting Implementation | 4 | Redis |
| P3 | WebSocket Streaming | 8 | WS infrastructure |
| P3 | Frontend Integration | 8 | All endpoints |
| P3 | Performance Optimization | 6 | Monitoring |

### 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (4100)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (4110)                        │
│  /api/v1/market/* → Market Data Service (4170)                │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   MARKET DATA SERVICE (4170)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Express    │  │   Routes     │  │ Controllers  │         │
│  │   Server     │──│  /quote/*    │──│   Quote      │         │
│  └──────────────┘  │  /history/*  │  │   History    │         │
│                    └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Polygon.io  │  │    Cache     │  │   Database   │         │
│  │   Client     │  │   Manager    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                    │            │              │
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ Polygon  │  │  Redis   │  │PostgreSQL│
            │   API    │  │  Cache   │  │Database  │
            └──────────┘  └──────────┘  └──────────┘
```

### 4. Data Models

```typescript
// Market Quote Model
interface MarketQuote {
  id: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: Date;
  source: 'polygon' | 'cache';
  delay: number;
}

// Historical Bar Model
interface MarketBar {
  id: string;
  symbol: string;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

// Cache Entry Model
interface CacheEntry {
  key: string;
  data: any;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}
```

## 📋 Comprehensive Development Checklist

### ✅ Phase 1: Core Infrastructure (Priority: P0)

#### 📋 Pre-Development Verification (Must be 100% before coding)
- [ ] SA technical specs reviewed (`/docs/technical-specs/market-data-service-polygon-integration.md`)
- [ ] Polygon.io API credentials verified
  - API Key: 454aeb0d-cdaf-4b25-838e-28d8cce05484
  - Secret Key: UD1Xi6n8rYbPhnv1V6U3N9jO5Hn5cHPA
- [ ] Development environment ready
  - Node.js 18+ installed
  - TypeScript configured
  - PostgreSQL accessible
  - Redis running
- [ ] Dependencies identified
  - express, typescript, prisma
  - axios for API calls
  - redis client
  - ws for WebSocket
- [ ] Test data prepared
  - List of test symbols (AAPL, GOOGL, MSFT)
  - Sample API responses

#### 🔨 Implementation Tasks - Service Setup

##### Task 1: Create Service Directory Structure
- [ ] Create `/services/market-data/` directory
  - Acceptance: Directory structure matches other services
  - Dependencies: None
  - Estimated time: 0.5 hours
- [ ] Setup package.json with dependencies
  - Acceptance: All required packages listed
  - Dependencies: Task 1.1
  - Estimated time: 0.5 hours
- [ ] Configure TypeScript (tsconfig.json)
  - Acceptance: Strict mode enabled, paths configured
  - Dependencies: Task 1.2
  - Estimated time: 0.5 hours
- [ ] Setup folder structure
  ```
  market-data/
  ├── src/
  │   ├── controllers/
  │   ├── services/
  │   ├── routes/
  │   ├── middleware/
  │   ├── types/
  │   ├── utils/
  │   └── index.ts
  ├── prisma/
  │   └── schema.prisma
  ├── tests/
  └── package.json
  ```
  - Acceptance: All folders created
  - Dependencies: Task 1.1
  - Estimated time: 0.5 hours

##### Task 2: Express Server Setup
- [ ] Create Express server (index.ts)
  - Acceptance: Server starts on port 4170
  - Dependencies: Task 1
  - Estimated time: 1 hour
- [ ] Add middleware (cors, helmet, compression)
  - Acceptance: Security headers configured
  - Dependencies: Task 2.1
  - Estimated time: 0.5 hours
- [ ] Setup error handling middleware
  - Acceptance: Global error handler working
  - Dependencies: Task 2.1
  - Estimated time: 0.5 hours
- [ ] Add health check endpoint
  - Acceptance: GET /health returns 200
  - Dependencies: Task 2.1
  - Estimated time: 0.5 hours

##### Task 3: Database Setup
- [ ] Create Prisma schema for market data
  - Acceptance: Schema matches SA specification
  - Dependencies: PostgreSQL access
  - Estimated time: 1 hour
- [ ] Generate Prisma client
  - Acceptance: Client generated successfully
  - Dependencies: Task 3.1
  - Estimated time: 0.5 hours
- [ ] Create migration files
  - Acceptance: Tables created in database
  - Dependencies: Task 3.2
  - Estimated time: 0.5 hours
- [ ] Test database connection
  - Acceptance: Can query database
  - Dependencies: Task 3.3
  - Estimated time: 0.5 hours

##### Task 4: Redis Setup
- [ ] Configure Redis client
  - Acceptance: Connected to Redis
  - Dependencies: Redis running
  - Estimated time: 0.5 hours
- [ ] Create cache manager service
  - Acceptance: Get/set operations working
  - Dependencies: Task 4.1
  - Estimated time: 1 hour
- [ ] Implement TTL strategies
  - Acceptance: Auto-expiry working
  - Dependencies: Task 4.2
  - Estimated time: 0.5 hours

##### Task 5: Polygon.io Client Integration
- [ ] Create Polygon client service
  - Acceptance: Client initialized with API key
  - Dependencies: API credentials
  - Estimated time: 1 hour
- [ ] Implement quote fetching method
  - Acceptance: Can fetch single quote
  - Dependencies: Task 5.1
  - Estimated time: 1 hour
- [ ] Implement batch quote method
  - Acceptance: Can fetch multiple quotes
  - Dependencies: Task 5.1
  - Estimated time: 1 hour
- [ ] Add error handling & retry logic
  - Acceptance: Handles API errors gracefully
  - Dependencies: Task 5.2, 5.3
  - Estimated time: 1 hour
- [ ] Implement rate limiting
  - Acceptance: Respects API limits (5/min free)
  - Dependencies: Task 5.1
  - Estimated time: 1 hour

### ✅ Phase 2: API Endpoints (Priority: P1)

#### 🔨 Implementation Tasks - Core Endpoints

##### Task 6: Quote Endpoints
- [ ] Create quote controller
  - Acceptance: Controller methods defined
  - Dependencies: Task 5
  - Estimated time: 1 hour
- [ ] Implement GET /api/v1/market/quote/:symbol
  - Acceptance: Returns real-time quote
  - Dependencies: Task 6.1
  - Estimated time: 2 hours
- [ ] Implement GET /api/v1/market/quotes
  - Acceptance: Returns batch quotes
  - Dependencies: Task 6.1
  - Estimated time: 2 hours
- [ ] Add caching layer to endpoints
  - Acceptance: Cache hit/miss working
  - Dependencies: Task 4, Task 6.2, 6.3
  - Estimated time: 2 hours

##### Task 7: History Endpoints
- [ ] Create history controller
  - Acceptance: Controller methods defined
  - Dependencies: Task 5
  - Estimated time: 1 hour
- [ ] Implement GET /api/v1/market/history/:symbol
  - Acceptance: Returns historical data
  - Dependencies: Task 7.1
  - Estimated time: 3 hours
- [ ] Implement GET /api/v1/market/chart/:symbol
  - Acceptance: Returns chart-ready data
  - Dependencies: Task 7.2
  - Estimated time: 2 hours
- [ ] Add database persistence
  - Acceptance: History saved to DB
  - Dependencies: Task 3, Task 7.2
  - Estimated time: 2 hours

### 🧪 Testing Checklist

#### Unit Tests
- [ ] Polygon client service tests
  - Test API connection
  - Test error handling
  - Mock API responses
- [ ] Cache manager tests
  - Test get/set operations
  - Test TTL expiry
  - Test cache invalidation
- [ ] Controller tests
  - Test request validation
  - Test response formatting
  - Test error responses
- [ ] Database service tests
  - Test CRUD operations
  - Test query performance

#### Integration Tests
- [ ] API endpoint tests
  - Test /quote/:symbol with valid/invalid symbols
  - Test /quotes batch with various sizes
  - Test /history with different timeframes
- [ ] Cache integration tests
  - Test cache hit scenarios
  - Test cache miss & refresh
  - Test concurrent requests
- [ ] Rate limiting tests
  - Test limit enforcement
  - Test quota tracking
  - Test reset behavior

### 🔌 Integration Checklist

#### API Gateway Integration
- [ ] Add routing rules to Gateway
  ```typescript
  '/api/v1/market/*': {
    target: 'http://localhost:4170',
    service: 'market-data'
  }
  ```
- [ ] Test Gateway → Market Data routing
- [ ] Verify JWT authentication passthrough
- [ ] Test health check aggregation

#### Database Integration
- [ ] Verify Prisma migrations applied
- [ ] Test connection pooling
- [ ] Verify indexes created
- [ ] Test query performance

#### Redis Integration
- [ ] Verify Redis connection
- [ ] Test cache operations
- [ ] Monitor memory usage
- [ ] Test failover behavior

### 🚀 Pre-Deployment Checklist

#### Code Quality
- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] Code coverage > 80%
- [ ] All tests passing

#### Configuration
- [ ] Environment variables configured
  ```env
  PORT=4170
  POLYGON_API_KEY=454aeb0d-cdaf-4b25-838e-28d8cce05484
  POLYGON_SECRET_KEY=UD1Xi6n8rYbPhnv1V6U3N9jO5Hn5cHPA
  DATABASE_URL=postgresql://...
  REDIS_URL=redis://localhost:6379
  ```
- [ ] Logging configured
- [ ] Error tracking setup
- [ ] Rate limits configured

#### Documentation
- [ ] API documentation updated
- [ ] README.md created
- [ ] Deployment guide written
- [ ] Troubleshooting guide added

#### Performance
- [ ] Load testing completed
- [ ] Response times < 2s
- [ ] Memory usage < 512MB
- [ ] CPU usage < 50%

## System Impact Assessment

### Touchpoints
1. **API Gateway** - New routes added
2. **Portfolio Service** - Will consume market data
3. **Frontend** - New API integration
4. **Database** - New tables created
5. **Redis** - New cache keys

### Dependencies Matrix
```
Market Data Service
├── Depends On:
│   ├── PostgreSQL Database
│   ├── Redis Cache
│   ├── Polygon.io API
│   └── API Gateway (for routing)
└── Depended By:
    ├── Portfolio Service (price updates)
    ├── Frontend (UI display)
    └── Future: AI Assistant (market analysis)
```

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Polygon.io API downtime | Medium | Implement cache fallback |
| Rate limit exceeded | High | Aggressive caching, queue requests |
| Database performance | Low | Proper indexing, connection pooling |
| Cache invalidation issues | Medium | TTL strategy, manual refresh option |
| Network latency | Low | Timeout handling, retry logic |

## Resource Plan

### Team Allocation
- **Backend Developer**: 40 hours (1 week)
- **DevOps**: 8 hours (deployment)
- **QA**: 16 hours (testing)
- **Frontend Developer**: 16 hours (integration)

### Technical Resources
- PostgreSQL database (existing)
- Redis instance (existing)
- Polygon.io API account (provided)
- Server resources (4170 port)

## Success Criteria

### Functional
- ✅ All P0 and P1 endpoints working
- ✅ Real-time quotes updating < 30s
- ✅ Historical data retrievable
- ✅ Cache hit rate > 60%

### Non-Functional
- ✅ Response time < 2s (cache hit < 500ms)
- ✅ 99.9% uptime
- ✅ Support 100 concurrent users
- ✅ Memory usage < 512MB

### Business
- ✅ Portfolio values reflect real market prices
- ✅ Users can view price charts
- ✅ Reduced API costs through caching
- ✅ Improved user experience

## Next Steps

### Immediate Actions (Today)
1. Create service directory structure
2. Setup package.json and dependencies
3. Configure TypeScript
4. Create Express server skeleton
5. Setup database schema

### Tomorrow
1. Implement Polygon.io client
2. Create cache manager
3. Build first endpoint (/quote/:symbol)
4. Write initial tests

### This Week
1. Complete all P0 tasks
2. Implement P1 endpoints
3. Integration testing
4. Frontend integration
5. Performance testing

## Rollback Plan

If deployment fails:
1. Stop Market Data Service
2. Remove Gateway routing rules
3. Rollback database migrations
4. Clear Redis cache
5. Revert to mock data in Frontend

## ✅ Development Planner Self-Verification

### Prerequisites Check
- [✓] BA requirements document exists and reviewed - **Note**: No BA doc, using SA specs
- [✓] SA technical specifications exist and reviewed - from 2025-08-17
- [✓] Current codebase analyzed for existing functionality
- [✓] Dependencies and constraints identified

### Planning Completeness
- [✓] All SA specifications mapped to development tasks
- [✓] Task breakdown includes clear acceptance criteria
- [✓] Time estimates provided for all tasks (Total: ~60 hours)
- [✓] Dependencies between tasks identified
- [✓] Risk mitigation strategies documented

### Checklist Quality
- [✓] Pre-development checklist complete
- [✓] Implementation tasks detailed with steps
- [✓] Testing requirements specified
- [✓] Integration points documented
- [✓] Deployment procedures included

### Documentation Created
- [✓] Development plan saved to: `/docs/development-plans/market-data-service-development-plan.md`
- [✓] Checklist included in plan
- [✓] Work log to be updated in: `/docs/claude/14-agent-worklog.md`
- [✓] Referenced SA work from: 2025-08-17 21:00
- [✓] BA work not available (noted in plan)

### Ready for Development
- [✓] All planning artifacts complete
- [✓] Next agent (developer) can proceed without clarification
- [✓] Success criteria clearly defined
- [✓] Phase 1 tasks prioritized and ready

---

*Development Plan v1.0*  
*Created: 2025-08-17*  
*Development Planner: Claude*  
*Next Phase: Implementation*