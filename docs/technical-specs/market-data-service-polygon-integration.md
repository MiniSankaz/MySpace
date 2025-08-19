# Technical Specification: Market Data Service - Polygon.io Integration

## 1. Overview

### Business Context
พัฒนา Market Data Service สำหรับเชื่อมต่อกับ Polygon.io API เพื่อให้บริการข้อมูลราคาหุ้นแบบ real-time และ historical data สำหรับระบบ Stock Portfolio Management v3.0

### Technical Scope
- **Service Name**: Market Data Service
- **Service Port**: 4170
- **Integration**: Polygon.io API (files.polygon.io)
- **Primary Functions**: Real-time quotes, historical data, price charts, WebSocket streams
- **Target Users**: Portfolio holders, traders, analysts

### Dependencies
- Polygon.io API (External)
- API Gateway (Port 4110)
- Portfolio Service (Port 4160) - price updates
- PostgreSQL Database - market data caching
- Redis - rate limiting & caching
- Frontend (Port 4100) - real-time display

## 2. Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET DATA SERVICE (4170)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │  Real-time  │ │ Historical  │ │ WebSocket   │ │   Cache     │ │
│  │  Quotes     │ │    Data     │ │  Manager    │ │  Manager    │ │
│  │ Controller  │ │ Controller  │ │             │ │             │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│           │               │               │               │     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Polygon.io  │ │Rate Limiter │ │   Data      │ │  Database   │ │
│  │  Service    │ │  Service    │ │ Validator   │ │  Service    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌─────────────────────┐
                    │    POLYGON.IO API    │
                    │ (files.polygon.io)   │
                    │                     │
                    │ • Real-time Quotes  │
                    │ • Historical Data   │ 
                    │ • WebSocket Streams │
                    │ • Market Status     │
                    └─────────────────────┘
```

### Data Flow
```
Frontend Request → API Gateway → Market Data Service → Cache Check
                                        ↓
                              Cache Miss → Polygon.io API
                                        ↓
                              Store in Cache ← Validate Data
                                        ↓
                              Return to Frontend ← Format Response
```

### Integration Points
1. **API Gateway Routes**: `/api/v1/market/*` → Market Data Service (4170)
2. **Portfolio Service**: Real-time price updates for holdings
3. **Frontend Components**: Real-time charts, price displays, alerts
4. **Database**: Market data persistence and caching
5. **Redis**: Rate limiting and fast data access

## 3. API Specifications

### Core Endpoints

#### GET `/api/v1/market/quote/:symbol`
Real-time quote สำหรับ symbol เดี่ยว

**Request:**
```typescript
interface QuoteRequest {
  symbol: string; // เช่น "AAPL", "GOOGL"
  fields?: string[]; // optional: ["price", "volume", "change"]
}
```

**Response:**
```typescript
interface QuoteResponse {
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
    timestamp: string; // ISO 8601
    source: "polygon" | "cache";
    delay: number; // seconds delay from real-time
  };
  meta: {
    cached: boolean;
    cacheExpiry: string;
    apiCallsUsed: number;
    rateLimit: {
      remaining: number;
      reset: string;
    };
  };
}
```

#### GET `/api/v1/market/quotes`
Batch quotes สำหรับหลาย symbols

**Request:**
```typescript
interface BatchQuotesRequest {
  symbols: string[]; // max 100 symbols
  fields?: string[];
}
```

**Response:**
```typescript
interface BatchQuotesResponse {
  success: boolean;
  data: QuoteData[];
  meta: ResponseMeta;
}
```

#### GET `/api/v1/market/history/:symbol`
Historical price data

**Request:**
```typescript
interface HistoryRequest {
  symbol: string;
  period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "1d";
  from?: string; // ISO date
  to?: string; // ISO date
}
```

**Response:**
```typescript
interface HistoryResponse {
  success: boolean;
  data: {
    symbol: string;
    period: string;
    interval: string;
    bars: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  };
  meta: ResponseMeta;
}
```

#### GET `/api/v1/market/chart/:symbol`
Chart data optimized สำหรับ frontend charts

**Request:**
```typescript
interface ChartRequest {
  symbol: string;
  timeframe: "intraday" | "daily" | "weekly" | "monthly";
  period: string;
  indicators?: string[]; // ["sma", "ema", "rsi", "macd"]
}
```

#### GET `/api/v1/market/search`
Symbol search และ lookup

**Request:**
```typescript
interface SearchRequest {
  query: string; // company name or symbol
  limit?: number; // default 10
  type?: "stocks" | "etf" | "all";
}
```

#### WebSocket `/ws/market`
Real-time price streaming

**Connection:**
```typescript
interface WebSocketConnection {
  endpoint: "ws://localhost:4110/ws/market";
  protocols: ["market-data-v1"];
  authentication: {
    type: "jwt";
    token: string;
  };
}
```

**Subscribe Message:**
```typescript
interface SubscribeMessage {
  action: "subscribe" | "unsubscribe";
  symbols: string[];
  types: ("quotes" | "trades" | "bars")[];
}
```

**Real-time Updates:**
```typescript
interface MarketUpdate {
  type: "quote" | "trade" | "bar";
  symbol: string;
  data: QuoteData | TradeData | BarData;
  timestamp: string;
}
```

## 4. Data Models

### Database Schema

#### Market Quotes Table
```sql
CREATE TABLE market_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  price DECIMAL(12,4) NOT NULL,
  change_amount DECIMAL(12,4),
  change_percent DECIMAL(8,4),
  volume BIGINT,
  high DECIMAL(12,4),
  low DECIMAL(12,4),
  open DECIMAL(12,4),
  previous_close DECIMAL(12,4),
  market_cap BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(20) DEFAULT 'polygon',
  delay_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(symbol, timestamp),
  INDEX idx_symbol_timestamp (symbol, timestamp DESC),
  INDEX idx_timestamp (timestamp DESC)
);
```

#### Historical Bars Table
```sql
CREATE TABLE market_bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  interval VARCHAR(10) NOT NULL, -- '1m', '5m', '1h', '1d'
  open_price DECIMAL(12,4) NOT NULL,
  high_price DECIMAL(12,4) NOT NULL,
  low_price DECIMAL(12,4) NOT NULL,
  close_price DECIMAL(12,4) NOT NULL,
  volume BIGINT NOT NULL,
  bar_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(20) DEFAULT 'polygon',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(symbol, interval, bar_timestamp),
  INDEX idx_symbol_interval_time (symbol, interval, bar_timestamp DESC)
);
```

#### API Usage Tracking
```sql
CREATE TABLE api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  symbols TEXT[], -- array of requested symbols
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  api_calls_used INTEGER DEFAULT 1,
  rate_limit_remaining INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_timestamp (user_id, timestamp DESC),
  INDEX idx_endpoint_timestamp (endpoint, timestamp DESC)
);
```

#### Symbol Master Data
```sql
CREATE TABLE market_symbols (
  symbol VARCHAR(10) PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  exchange VARCHAR(10) NOT NULL,
  sector VARCHAR(50),
  industry VARCHAR(100),
  market_cap BIGINT,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_company_name (company_name),
  INDEX idx_exchange (exchange),
  INDEX idx_sector (sector)
);
```

### Relationships
- `market_quotes` → `market_symbols` (symbol)
- `market_bars` → `market_symbols` (symbol)
- `api_usage_tracking` → `users` (user_id)

## 5. Business Logic

### Rate Limiting Strategy
```typescript
interface RateLimitConfig {
  // Polygon.io API limits
  polygonLimits: {
    freeApiKey: {
      requestsPerMinute: 5;
      requestsPerMonth: 1000;
    };
    basicPlan: {
      requestsPerMinute: 100;
      requestsPerMonth: 100000;
    };
  };
  
  // Internal service limits
  serviceLimits: {
    perUser: {
      requestsPerMinute: 60;
      requestsPerHour: 1000;
    };
    global: {
      requestsPerSecond: 100;
      concurrentConnections: 500;
    };
  };
}
```

### Caching Strategy
```typescript
interface CacheConfig {
  // Real-time quotes cache
  quotes: {
    ttl: 30; // seconds
    maxSize: 10000; // symbols
    strategy: "LRU";
  };
  
  // Historical data cache
  historical: {
    ttl: 3600; // 1 hour for intraday
    dailyTtl: 86400; // 24 hours for daily
    strategy: "Time-based";
  };
  
  // Search results cache
  search: {
    ttl: 3600; // 1 hour
    maxSize: 1000;
  };
}
```

### Data Validation Rules
1. **Symbol Validation**: Must be valid US stock symbol (2-5 characters, uppercase)
2. **Price Validation**: Positive numbers, reasonable ranges (0.01 - 10000)
3. **Volume Validation**: Non-negative integers
4. **Timestamp Validation**: Valid ISO 8601, not future dated
5. **Rate Limit Compliance**: Respect Polygon.io and internal limits

### State Management
```typescript
interface ServiceState {
  polygonConnection: {
    status: "connected" | "disconnected" | "error";
    lastCall: Date;
    callsRemaining: number;
    resetTime: Date;
  };
  
  cache: {
    hitRate: number;
    size: number;
    memory: number;
  };
  
  websockets: {
    activeConnections: number;
    subscriptions: Map<string, string[]>; // userId -> symbols
  };
}
```

## 6. Security Considerations

### Authentication/Authorization
- **JWT Tokens**: Required สำหรับทุก API calls
- **User-based Rate Limiting**: Individual limits per user
- **API Key Security**: Polygon.io API key stored securely in environment
- **CORS**: Restricted to frontend domain only

### Data Protection
- **No PII Storage**: Market data only, no personal financial data
- **Audit Logging**: All API calls logged for security monitoring
- **Rate Limit Protection**: Prevent abuse and cost overruns
- **Input Sanitization**: All user inputs validated and sanitized

### Vulnerability Mitigation
- **DDoS Protection**: Rate limiting and connection throttling
- **API Key Rotation**: Support for key rotation without downtime
- **Error Information**: Minimal error details to prevent information disclosure
- **Timeout Protection**: Request timeouts to prevent hanging connections

## 7. Performance Requirements

### Response Time Targets
- **Real-time Quotes**: < 500ms (cache hit), < 2s (API call)
- **Historical Data**: < 1s (cache hit), < 5s (API call)
- **Batch Quotes**: < 1s สำหรับ 10 symbols, < 3s สำหรับ 100 symbols
- **WebSocket Updates**: < 100ms latency

### Throughput Requirements
- **API Requests**: 100 requests/second sustained
- **WebSocket Connections**: 500 concurrent connections
- **Database Queries**: < 100ms average response time
- **Cache Operations**: < 10ms average response time

### Resource Constraints
- **Memory Usage**: < 512MB base, < 2GB peak
- **CPU Usage**: < 50% average, < 80% peak
- **Database Connections**: Max 20 connections
- **Network Bandwidth**: < 10MB/s average

## 8. Testing Strategy

### Unit Test Coverage
- **Services**: 90%+ coverage
- **Controllers**: 85%+ coverage
- **Utilities**: 95%+ coverage
- **Critical Paths**: 100% coverage

### Integration Test Scenarios
```typescript
interface IntegrationTests {
  polygonApiConnection: {
    validApiKey: boolean;
    invalidApiKey: boolean;
    rateLimitHandling: boolean;
    networkTimeout: boolean;
  };
  
  databaseOperations: {
    quoteStorage: boolean;
    historicalDataStorage: boolean;
    cacheInvalidation: boolean;
  };
  
  websocketStreaming: {
    subscriptionManagement: boolean;
    realTimeUpdates: boolean;
    connectionDropRecovery: boolean;
  };
}
```

### Performance Test Criteria
- **Load Test**: 1000 concurrent users
- **Stress Test**: 2x normal load
- **Endurance Test**: 24 hours continuous operation
- **Spike Test**: 10x sudden load increase

## 9. Deployment Plan

### Environment Requirements
```yaml
# Environment Variables
POLYGON_API_KEY: "454aeb0d-cdaf-4b25-838e-28d8cce05484"
POLYGON_SECRET_KEY: "UD1Xi6n8rYbPhnv1V6U3N9jO5Hn5cHPA"
POLYGON_BASE_URL: "https://files.polygon.io"
DATABASE_URL: "postgresql://..."
REDIS_URL: "redis://..."
PORT: 4170
NODE_ENV: "production"
LOG_LEVEL: "info"
```

### Configuration Management
- **Environment-based**: Dev, staging, production configs
- **Feature Flags**: Enable/disable features without deployment
- **Rate Limit Config**: Adjustable limits based on Polygon.io plan
- **Cache Settings**: Configurable TTL and size limits

### Rollback Procedures
1. **Service Rollback**: Previous Docker image deployment
2. **Database Rollback**: Migration rollback scripts
3. **Cache Invalidation**: Clear affected cache entries
4. **Monitoring**: Verify health checks and metrics

## 10. Monitoring & Maintenance

### Key Metrics
```typescript
interface ServiceMetrics {
  // Performance metrics
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  
  // Business metrics
  apiUsage: {
    callsPerMinute: number;
    rateLimitHits: number;
    cacheHitRate: number;
  };
  
  // Technical metrics
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}
```

### Alerting Rules
- **High Error Rate**: > 5% errors in 5 minutes
- **Rate Limit Approaching**: > 90% of Polygon.io limit
- **High Response Time**: > 2s average for 2 minutes
- **Memory Usage**: > 80% of allocated memory
- **Database Connection**: Connection pool exhaustion

### Maintenance Procedures
- **Daily**: Cache cleanup and optimization
- **Weekly**: Performance metrics review
- **Monthly**: API usage analysis and cost optimization
- **Quarterly**: Security audit and dependency updates

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
1. Service setup และ basic structure
2. Polygon.io API integration
3. Database schema implementation
4. Basic caching layer

### Phase 2: API Development (Week 2-3)
1. REST endpoints implementation
2. Rate limiting and validation
3. Error handling and logging
4. Unit testing

### Phase 3: Real-time Features (Week 3-4)
1. WebSocket implementation
2. Real-time data streaming
3. Subscription management
4. Integration testing

### Phase 4: Integration & Testing (Week 4-5)
1. Portfolio Service integration
2. Frontend integration
3. Performance testing
4. Security testing

### Phase 5: Production Deployment (Week 5-6)
1. Production configuration
2. Monitoring setup
3. Load testing
4. Go-live และ monitoring

---

*Technical Specification v1.0*  
*Created: 2025-08-17*  
*System Analyst: Claude*  
*Next Phase: Development Planning*