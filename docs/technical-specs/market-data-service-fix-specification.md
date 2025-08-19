# Market Data Service Fix Technical Specification

## Executive Summary

The Market Data Service is currently non-operational due to TypeScript compilation errors and Prisma schema mismatches. This specification documents the required fixes to achieve 100% operational status for real-time price API functionality.

## System Architecture Overview

### Service Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 4100)                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Port 4110)                     │
│                  Routes: /api/v1/market/*                    │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│ Portfolio Service (4160) │    │ Market Data Service (4170)  │
│ • Portfolio Management   │◄───│ • Real-time Quotes          │
│ • Value Calculations     │    │ • Historical Data           │
│ • Transaction History    │    │ • Polygon.io Integration    │
└─────────────────────────┘    └─────────────────────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────────┐
                                │     Polygon.io API          │
                                │   • Stock Quotes            │
                                │   • Market Data             │
                                │   • Real-time Updates       │
                                └─────────────────────────────┘
```

## Detailed Component Specifications

### 1. TypeScript Compilation Issues

#### Issue 1.1: Import Path Errors
**Current State**: Import statements use incorrect paths
**Root Cause**: TypeScript path aliases not properly configured
**Solution**: Update tsconfig.json with proper path mappings

#### Issue 1.2: Prisma Schema Field Mismatches
**Current State**: Multiple field name inconsistencies between Prisma schema and TypeScript code
**Issues Identified**:
- `changeAmount` field does not exist in MarketQuote model (should be `change`)
- `responseTimeMs` should be `responseTime` in ApiUsageTracking
- `previousClose` and `marketCap` fields missing from MarketQuote model
- `delaySeconds` field missing from MarketQuote model
- Volume field type mismatch (Int vs BigInt)

**Solution**: Update Prisma schema to match application requirements

#### Issue 1.3: Unused Imports
**Current State**: Several unused imports causing TypeScript warnings
**Solution**: Remove or utilize unused imports

### 2. Data Models and Schemas

#### 2.1 MarketQuote Model (Updated)
```prisma
model MarketQuote {
  id             String    @id @default(uuid())
  symbol         String
  price          Float
  open           Float?
  high           Float?
  low            Float?
  close          Float?
  previousClose  Float?    // NEW: Added field
  volume         BigInt?   // CHANGED: Int to BigInt for large volumes
  change         Float?    // CONFIRMED: Field name correct
  changePercent  Float?
  marketCap      BigInt?   // NEW: Added field
  delaySeconds   Int?      // NEW: Added field for data delay
  timestamp      DateTime
  source         String    @default("polygon")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([symbol, timestamp])
  @@map("market_quotes")
}
```

#### 2.2 ApiUsageTracking Model (Updated)
```prisma
model ApiUsageTracking {
  id                  String    @id @default(uuid())
  userId              String?
  endpoint            String
  method              String
  statusCode          Int       @default(200)
  responseTime        Int       // CONFIRMED: Field name correct
  cacheHit            Boolean   @default(false)
  apiCallsUsed        Int       @default(1)
  rateLimitRemaining  Int?
  timestamp           DateTime  @default(now())
  apiProvider         String    @default("polygon")
  credits             Int       @default(1)

  @@index([userId, timestamp])
  @@index([endpoint, timestamp])
  @@map("api_usage_tracking")
}
```

### 3. API Specifications

#### 3.1 Quote Endpoints

##### GET /api/v1/market/quote/:symbol
**Purpose**: Fetch real-time quote for a single symbol
**Request Parameters**:
- `symbol`: Stock symbol (e.g., AAPL, GOOGL)

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
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
    timestamp: string;
    source: 'polygon' | 'cache';
    delay: number;
  };
  meta: {
    cached: boolean;
    cacheExpiry?: string;
    apiCallsUsed: number;
    rateLimit: {
      remaining: number;
      reset: string;
    };
    responseTime: number;
  };
}
```

##### GET /api/v1/market/quotes
**Purpose**: Fetch batch quotes for multiple symbols
**Request Parameters**:
- `symbols`: Comma-separated list of symbols

**Response**: Same structure with array of quote data

#### 3.2 Health Endpoint

##### GET /health
**Purpose**: Service health check
**Response Schema**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
    polygon: boolean;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}
```

### 4. Integration Requirements

#### 4.1 Polygon.io Integration
- **API Key**: Retrieved from environment variable `POLYGON_API_KEY`
- **Base URL**: `https://api.polygon.io`
- **Rate Limits**: 
  - Free tier: 5 requests/minute
  - Basic tier: 100 requests/minute
- **Retry Strategy**: Exponential backoff with max 3 retries
- **Error Handling**: Graceful degradation to cached/mock data

#### 4.2 Redis Cache Integration
- **TTL Settings**:
  - Quotes: 30 seconds
  - Historical data: 5 minutes
  - Search results: 10 minutes
- **Cache Key Pattern**: `market:quote:{symbol}`
- **Invalidation Strategy**: Time-based expiry

#### 4.3 Portfolio Service Integration
- **Communication**: REST API calls from Portfolio to Market Data
- **Endpoints Used**:
  - `/api/v1/market/quotes` for portfolio valuation
  - `/api/v1/market/quote/:symbol` for individual stock details
- **Fallback**: Mock prices if Market Data Service unavailable
- **Error Handling**: Circuit breaker pattern with 30-second timeout

### 5. Security Specifications

#### 5.1 Authentication
- **Method**: JWT Bearer tokens (optional for public data)
- **Headers**: `Authorization: Bearer {token}`
- **Rate Limiting**: Per-user limits when authenticated

#### 5.2 Input Validation
- **Symbol Validation**: Alphanumeric, 1-10 characters
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

#### 5.3 API Key Security
- **Storage**: Environment variables only
- **Rotation**: Support for multiple API keys
- **Monitoring**: Track API key usage and alerts

### 6. Performance Requirements

#### 6.1 Response Times
- **Quote endpoint**: < 200ms (cached), < 1000ms (API call)
- **Batch quotes**: < 500ms for up to 10 symbols
- **Health check**: < 50ms

#### 6.2 Throughput
- **Concurrent requests**: Support 100+ simultaneous requests
- **Rate limiting**: 100 requests/minute per user
- **Circuit breaker**: Trip after 5 consecutive failures

#### 6.3 Caching Strategy
- **L1 Cache**: In-memory cache for hot data (10 symbols)
- **L2 Cache**: Redis for broader dataset
- **Cache warming**: Pre-fetch popular symbols on startup

### 7. Implementation Guidelines

#### 7.1 Code Organization
```
services/market-data/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── routes/         # Route definitions
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Helper functions
│   └── index.ts        # Entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── tests/              # Test files
└── package.json        # Dependencies
```

#### 7.2 Error Handling Strategy
1. **Validation Errors**: Return 400 with clear message
2. **Not Found**: Return 404 for invalid symbols
3. **Rate Limit**: Return 429 with retry-after header
4. **API Errors**: Log and return 503 with fallback data
5. **Internal Errors**: Log details, return 500 with generic message

#### 7.3 Logging Standards
- **Format**: JSON structured logging
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Context**: Include request ID, user ID, symbol
- **Performance**: Log slow queries (> 1000ms)

### 8. Testing Requirements

#### 8.1 Unit Tests
- **Coverage**: Minimum 80%
- **Focus Areas**:
  - Quote data transformation
  - Cache operations
  - Error handling
  - Rate limiting

#### 8.2 Integration Tests
- **Polygon API**: Mock responses for consistent testing
- **Database**: Use test database
- **Redis**: Use test instance or mock
- **End-to-end**: Test full flow from request to response

#### 8.3 Performance Tests
- **Load Testing**: 100 concurrent users
- **Stress Testing**: Find breaking point
- **Endurance Testing**: 24-hour run
- **Spike Testing**: Sudden traffic increases

### 9. Deployment Considerations

#### 9.1 Environment Variables
```env
# Service Configuration
PORT=4170
NODE_ENV=production

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Polygon.io
POLYGON_API_KEY=your_api_key
POLYGON_BASE_URL=https://api.polygon.io

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=1000
```

#### 9.2 Health Monitoring
- **Metrics**: Response time, error rate, cache hit ratio
- **Alerts**: Service down, high error rate, API limit approaching
- **Dashboard**: Real-time service metrics visualization

#### 9.3 Rollback Strategy
- **Version Control**: Tag stable releases
- **Database**: Migration rollback scripts
- **Configuration**: Environment-specific configs
- **Testing**: Smoke tests after deployment

### 10. Migration Plan

#### Phase 1: Fix Compilation Errors (Immediate)
1. Update Prisma schema with missing fields
2. Fix TypeScript import paths
3. Resolve type mismatches
4. Remove unused imports
5. Run Prisma migration

#### Phase 2: Service Startup (30 minutes)
1. Generate Prisma client
2. Build TypeScript code
3. Start service on port 4170
4. Verify health endpoint

#### Phase 3: API Testing (1 hour)
1. Test Polygon.io connectivity
2. Verify quote endpoints
3. Test cache operations
4. Validate error handling

#### Phase 4: Integration (1 hour)
1. Update Portfolio Service to use real quotes
2. Configure fallback mechanism
3. Test end-to-end flow
4. Monitor performance

#### Phase 5: Production Readiness (30 minutes)
1. Add comprehensive logging
2. Set up monitoring
3. Document API usage
4. Create runbook

## Appendices

### A. Glossary
- **TTL**: Time To Live (cache expiration)
- **JWT**: JSON Web Token
- **CORS**: Cross-Origin Resource Sharing
- **VWAP**: Volume Weighted Average Price

### B. References
- [Polygon.io API Documentation](https://polygon.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### C. Change Log
- 2025-08-18: Initial specification created
- 2025-08-18: Added detailed Prisma schema updates
- 2025-08-18: Included integration patterns with Portfolio Service

---

**Document Status**: FINAL
**Version**: 1.0.0
**Last Updated**: 2025-08-18
**Author**: Technical Architect Agent