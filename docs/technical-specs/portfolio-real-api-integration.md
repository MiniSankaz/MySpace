# Technical Specification: Portfolio Real API Integration & UI Enhancement

## Executive Summary

This specification details the comprehensive integration of real-time market data APIs with the Portfolio Management System, addressing database connectivity issues, UI enhancements for multi-currency support, decimal precision improvements, and implementation of production-ready features for handling real market data.

**Version**: 1.0.0  
**Date**: 2025-08-19  
**Status**: Draft  
**Author**: Technical Architect Agent

## System Architecture Overview

### Current Architecture Issues
1. Database connection failure to DigitalOcean PostgreSQL
2. Mock data usage instead of real market APIs
3. Limited currency support (USD only)
4. Insufficient decimal precision for stock quantities
5. Incomplete transaction page functionality
6. Static day change calculations

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (4100)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Transaction  │  │   Holdings   │  │  Portfolio   │        │
│  │     UI       │  │  UI (THB)    │  │  Dashboard   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (4110)                          │
│              (Rate Limiting, Circuit Breaker)                   │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Portfolio   │      │ Market Data  │      │  Currency    │
│Service (4160)│      │Service (4170)│      │   Service    │
│              │◄─────│              │      │   (4171)     │
│  PostgreSQL  │      │ Yahoo/Polygon│      │   ExchangeRate│
└──────────────┘      └──────────────┘      └──────────────┘
```

## Detailed Component Specifications

### 1. Database Layer Enhancements

#### 1.1 Connection Configuration
```typescript
// Enhanced database configuration with retry logic
interface DatabaseConfig {
  url: string;
  ssl: {
    rejectUnauthorized: false;
    ca?: string;
  };
  pool: {
    min: 2;
    max: 10;
    acquireTimeoutMillis: 60000;
    createTimeoutMillis: 30000;
    idleTimeoutMillis: 30000;
    reapIntervalMillis: 1000;
    createRetryIntervalMillis: 200;
  };
  retry: {
    maxAttempts: 5;
    delay: 1000;
    backoff: 'exponential';
  };
}
```

#### 1.2 Schema Migrations
```sql
-- Migration: Update decimal precision for quantities
ALTER TABLE holdings 
  ALTER COLUMN quantity TYPE DECIMAL(20,7);

ALTER TABLE transactions 
  ALTER COLUMN quantity TYPE DECIMAL(20,7);

-- Migration: Add multi-currency support
ALTER TABLE portfolios 
  ADD COLUMN display_currency VARCHAR(3) DEFAULT 'USD',
  ADD COLUMN base_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE holdings 
  ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
  ADD COLUMN exchange_rate DECIMAL(20,10) DEFAULT 1.0;

ALTER TABLE transactions 
  ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
  ADD COLUMN exchange_rate DECIMAL(20,10) DEFAULT 1.0;

-- Migration: Add real-time price tracking
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  price DECIMAL(20,4) NOT NULL,
  previous_close DECIMAL(20,4),
  day_change DECIMAL(20,4),
  day_change_percent DECIMAL(10,4),
  volume BIGINT,
  market_cap BIGINT,
  currency VARCHAR(3) DEFAULT 'USD',
  source VARCHAR(50), -- 'yahoo', 'polygon', 'manual'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_symbol_timestamp 
  ON price_snapshots(symbol, timestamp DESC);
```

### 2. Market Data Service Integration

#### 2.1 API Provider Strategy
```typescript
interface MarketDataProvider {
  name: 'yahoo' | 'polygon' | 'alphavantage' | 'finnhub';
  priority: number;
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  capabilities: string[];
}

class MarketDataAggregator {
  private providers: MarketDataProvider[] = [
    {
      name: 'yahoo',
      priority: 1,
      rateLimit: { requests: 100, window: 60000 },
      capabilities: ['quotes', 'historical', 'news']
    },
    {
      name: 'polygon',
      priority: 2,
      rateLimit: { requests: 5, window: 60000 }, // Free tier
      capabilities: ['quotes', 'historical', 'websocket']
    }
  ];

  async getQuote(symbol: string, options?: QuoteOptions): Promise<MarketQuote> {
    // Implement circuit breaker pattern
    // Fallback through providers by priority
    // Cache results with TTL
  }
}
```

#### 2.2 Real-time WebSocket Integration
```typescript
interface WebSocketConfig {
  providers: {
    polygon?: {
      apiKey: string;
      clusters: string[];
    };
    finnhub?: {
      apiKey: string;
    };
  };
  reconnect: {
    maxAttempts: 10;
    delay: 1000;
    backoff: 'exponential';
  };
}

class RealTimeMarketData {
  private connections: Map<string, WebSocket>;
  private subscriptions: Map<string, Set<string>>;
  
  subscribe(symbols: string[], callback: (data: MarketUpdate) => void): void {
    // Manage WebSocket subscriptions
    // Handle reconnection logic
    // Batch updates for efficiency
  }
}
```

### 3. Currency Service Implementation

#### 3.1 Exchange Rate Management
```typescript
interface CurrencyService {
  getExchangeRate(from: string, to: string): Promise<number>;
  getBatchRates(base: string, targets: string[]): Promise<Map<string, number>>;
  subscribeToRates(pairs: string[], callback: (rates: RateUpdate) => void): void;
}

class ExchangeRateService implements CurrencyService {
  private cache: Map<string, { rate: number; timestamp: number }>;
  private providers: ExchangeRateProvider[];
  
  async getExchangeRate(from: string, to: string): Promise<number> {
    // Check cache first (5-minute TTL)
    // Try primary provider (exchangerate-api.com)
    // Fallback to secondary (fixer.io)
    // Store in cache
  }
  
  convertAmount(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }
}
```

#### 3.2 THB Integration
```typescript
interface ThaiMarketData {
  symbol: string;
  exchange: 'SET' | 'MAI';
  price: number;
  currency: 'THB';
  tradingHours: {
    morning: { start: '10:00', end: '12:30' };
    afternoon: { start: '14:30', end: '16:30' };
    timezone: 'Asia/Bangkok';
  };
}

class SETMarketDataProvider {
  async getQuote(symbol: string): Promise<ThaiMarketData> {
    // Integrate with SET API or scraping service
    // Handle Thai market hours
    // Return THB-denominated prices
  }
}
```

### 4. UI Component Enhancements

#### 4.1 Multi-Currency Display Component
```tsx
interface CurrencyToggleProps {
  currencies: string[];
  current: string;
  onChange: (currency: string) => void;
}

const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ currencies, current, onChange }) => {
  return (
    <div className="currency-toggle">
      {currencies.map(currency => (
        <button
          key={currency}
          className={current === currency ? 'active' : ''}
          onClick={() => onChange(currency)}
        >
          {currency}
        </button>
      ))}
    </div>
  );
};

// Enhanced Portfolio Value Display
interface PortfolioValueProps {
  value: number;
  baseCurrency: string;
  displayCurrency: string;
  exchangeRate?: number;
}

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  value,
  baseCurrency,
  displayCurrency,
  exchangeRate = 1
}) => {
  const displayValue = value * exchangeRate;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: displayCurrency === 'THB' ? 0 : 2,
    maximumFractionDigits: displayCurrency === 'THB' ? 0 : 2
  });
  
  return (
    <div className="portfolio-value">
      <span className="value">{formatter.format(displayValue)}</span>
      {baseCurrency !== displayCurrency && (
        <span className="exchange-info">
          1 {baseCurrency} = {exchangeRate.toFixed(4)} {displayCurrency}
        </span>
      )}
    </div>
  );
};
```

#### 4.2 Enhanced Quantity Input
```tsx
interface DecimalInputProps {
  value: string;
  onChange: (value: string) => void;
  decimalPlaces?: number;
  min?: number;
  max?: number;
}

const DecimalQuantityInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  decimalPlaces = 7,
  min = 0,
  max
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string for clearing
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Validate decimal places
    const regex = new RegExp(`^\\d*\\.?\\d{0,${decimalPlaces}}$`);
    if (regex.test(inputValue)) {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= min && (!max || numValue <= max)) {
        onChange(inputValue);
      }
    }
  };
  
  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={`0.${'0'.repeat(decimalPlaces)}`}
      className="decimal-input"
      pattern={`\\d*\\.?\\d{0,${decimalPlaces}}`}
    />
  );
};
```

#### 4.3 Transaction Page Fix
```tsx
interface TransactionPageProps {
  portfolioId: string;
}

const TransactionPage: React.FC<TransactionPageProps> = ({ portfolioId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    dateRange: 'last30days',
    symbol: ''
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Enhanced transaction form with decimal support
  const TransactionForm = () => {
    const [formData, setFormData] = useState({
      type: 'BUY',
      symbol: '',
      quantity: '',
      price: '',
      fees: '',
      currency: 'USD',
      notes: ''
    });
    
    const handleSubmit = async () => {
      // Validate decimal quantities
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        showError('Invalid quantity');
        return;
      }
      
      // Submit transaction with proper decimal precision
      await createTransaction({
        ...formData,
        quantity: new Decimal(formData.quantity).toFixed(7),
        price: new Decimal(formData.price).toFixed(4)
      });
    };
    
    return (
      <form onSubmit={handleSubmit}>
        <DecimalQuantityInput
          value={formData.quantity}
          onChange={(value) => setFormData({...formData, quantity: value})}
          decimalPlaces={7}
        />
        {/* Additional form fields */}
      </form>
    );
  };
  
  return (
    <div className="transaction-page">
      <TransactionFilters filters={filters} onChange={setFilters} />
      <TransactionList 
        transactions={transactions}
        onEdit={setEditingTransaction}
        displayCurrency={userPreferences.currency}
      />
      <AddTransactionButton onClick={() => setShowAddModal(true)} />
      
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <TransactionForm />
        </Modal>
      )}
    </div>
  );
};
```

### 5. API Specifications

#### 5.1 Enhanced Portfolio API Endpoints
```typescript
// GET /api/v1/portfolios/:id/value
interface PortfolioValueResponse {
  portfolioId: string;
  values: {
    base: {
      currency: string;
      amount: number;
    };
    display: {
      currency: string;
      amount: number;
      exchangeRate: number;
    };
  };
  dayChange: {
    amount: number;
    percentage: number;
    currency: string;
  };
  holdings: Array<{
    symbol: string;
    quantity: string; // Decimal string
    value: number;
    dayChange: number;
    currency: string;
  }>;
  timestamp: string;
}

// POST /api/v1/transactions
interface CreateTransactionRequest {
  portfolioId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  symbol: string;
  quantity: string; // Decimal string with up to 7 decimal places
  price: string;    // Decimal string with up to 4 decimal places
  fees?: string;
  currency: string;
  executedAt?: string;
  notes?: string;
}

// GET /api/v1/market/quote/:symbol
interface MarketQuoteResponse {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  dayChange: {
    amount: number;
    percentage: number;
  };
  previousClose: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  timestamp: string;
  source: 'yahoo' | 'polygon' | 'cache';
}

// GET /api/v1/currency/rates
interface ExchangeRatesResponse {
  base: string;
  rates: {
    [currency: string]: number;
  };
  timestamp: string;
}
```

#### 5.2 WebSocket Events
```typescript
// WebSocket subscription for real-time prices
interface PriceSubscription {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
  currencies?: string[]; // Optional: subscribe to specific currency pairs
}

// Real-time price update
interface PriceUpdate {
  type: 'price';
  data: {
    symbol: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  };
}

// Portfolio value update
interface PortfolioUpdate {
  type: 'portfolio';
  data: {
    portfolioId: string;
    totalValue: number;
    dayChange: number;
    currency: string;
    timestamp: string;
  };
}
```

## Integration Requirements

### 1. Third-Party Service Configuration

#### Yahoo Finance Integration
```typescript
const yahooConfig = {
  baseUrl: 'https://query1.finance.yahoo.com/v8/finance',
  endpoints: {
    quote: '/chart/:symbol',
    search: '/search',
    trending: '/trending/US'
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)'
  },
  rateLimit: {
    requestsPerMinute: 100,
    burstSize: 10
  }
};
```

#### Polygon.io Integration
```typescript
const polygonConfig = {
  apiKey: process.env.POLYGON_API_KEY,
  baseUrl: 'https://api.polygon.io',
  websocket: 'wss://socket.polygon.io',
  endpoints: {
    quote: '/v2/last/trade/:ticker',
    aggregates: '/v2/aggs/ticker/:ticker/range/:multiplier/:timespan/:from/:to',
    ticker: '/v3/reference/tickers/:ticker'
  },
  subscription: {
    clusters: ['stocks', 'forex'],
    maxSymbols: 50 // Free tier limit
  }
};
```

#### Exchange Rate API Integration
```typescript
const exchangeRateConfig = {
  primary: {
    provider: 'exchangerate-api',
    apiKey: process.env.EXCHANGE_RATE_API_KEY,
    baseUrl: 'https://v6.exchangerate-api.com/v6',
    endpoints: {
      latest: '/:apiKey/latest/:base',
      pair: '/:apiKey/pair/:from/:to'
    }
  },
  fallback: {
    provider: 'fixer',
    apiKey: process.env.FIXER_API_KEY,
    baseUrl: 'https://api.fixer.io',
    endpoints: {
      latest: '/latest'
    }
  }
};
```

### 2. Error Handling & Recovery

#### Database Connection Recovery
```typescript
class DatabaseConnectionManager {
  private pool: Pool;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000
      });
      
      // Test connection
      await this.pool.query('SELECT 1');
      this.reconnectAttempts = 0;
      logger.info('Database connected successfully');
      
    } catch (error) {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        logger.warn(`Database connection failed, retrying in ${delay}ms...`);
        
        setTimeout(() => this.connect(), delay);
      } else {
        logger.error('Max reconnection attempts reached');
        // Switch to fallback mode or alert administrators
        this.enableFallbackMode();
      }
    }
  }
  
  private enableFallbackMode(): void {
    // Use local SQLite or in-memory database
    // Cache critical data
    // Alert monitoring systems
  }
}
```

#### API Fallback Strategy
```typescript
class MarketDataFallbackStrategy {
  private providers: MarketDataProvider[] = [];
  private cache: LRUCache<string, CachedQuote>;
  
  async getQuote(symbol: string): Promise<MarketQuote> {
    // Try primary provider
    for (const provider of this.providers) {
      try {
        const quote = await provider.getQuote(symbol);
        this.cache.set(symbol, { quote, timestamp: Date.now() });
        return quote;
      } catch (error) {
        logger.warn(`Provider ${provider.name} failed for ${symbol}`);
        continue;
      }
    }
    
    // All providers failed, check cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min
      return { ...cached.quote, stale: true };
    }
    
    // Return last known price from database
    return await this.getLastKnownPrice(symbol);
  }
}
```

## Security Specifications

### 1. API Key Management
```typescript
class SecureApiKeyManager {
  private keys: Map<string, EncryptedKey> = new Map();
  
  constructor() {
    this.loadKeysFromVault();
  }
  
  private async loadKeysFromVault(): Promise<void> {
    // Load from environment or secret management service
    const encryptedKeys = {
      polygon: process.env.POLYGON_API_KEY_ENCRYPTED,
      exchangeRate: process.env.EXCHANGE_RATE_API_KEY_ENCRYPTED
    };
    
    for (const [service, key] of Object.entries(encryptedKeys)) {
      if (key) {
        this.keys.set(service, await this.decrypt(key));
      }
    }
  }
  
  async getKey(service: string): Promise<string> {
    const encrypted = this.keys.get(service);
    if (!encrypted) throw new Error(`No API key for service: ${service}`);
    
    return this.decrypt(encrypted);
  }
}
```

### 2. Rate Limiting Implementation
```typescript
class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  async acquire(key: string, tokens: number = 1): Promise<void> {
    const bucket = this.getBucket(key);
    
    if (!bucket.tryConsume(tokens)) {
      const waitTime = bucket.timeToNextToken();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (!bucket.tryConsume(tokens)) {
        throw new Error('Rate limit exceeded');
      }
    }
  }
  
  private getBucket(key: string): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket(
        this.config.bucketSize,
        this.config.refillRate
      ));
    }
    return this.buckets.get(key)!;
  }
}
```

## Performance Requirements

### 1. Response Time Targets
- Market quote retrieval: < 500ms (cached), < 2s (fresh)
- Portfolio calculation: < 1s for 100 holdings
- Transaction processing: < 500ms
- Currency conversion: < 100ms (cached), < 500ms (fresh)
- WebSocket latency: < 100ms

### 2. Scalability Metrics
- Concurrent users: 1000+
- Holdings per portfolio: 500+
- Transactions per day: 10,000+
- Real-time price subscriptions: 5000 symbols
- API requests per minute: 1000+

### 3. Caching Strategy
```typescript
interface CacheConfig {
  redis: {
    host: string;
    port: number;
    ttl: {
      quotes: 30,        // seconds
      exchangeRates: 300, // seconds
      portfolioValue: 60, // seconds
      staticData: 3600   // seconds
    };
  };
  memory: {
    maxSize: 1000,
    ttl: 30
  };
}

class MultiLevelCache {
  private memoryCache: LRUCache;
  private redisCache: RedisClient;
  
  async get(key: string): Promise<any> {
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult;
    
    // Check Redis
    const redisResult = await this.redisCache.get(key);
    if (redisResult) {
      this.memoryCache.set(key, redisResult);
      return redisResult;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, value);
    await this.redisCache.setex(key, ttl || 60, JSON.stringify(value));
  }
}
```

## Implementation Guidelines

### Phase 1: Database & Infrastructure (Day 1-2)
1. Fix database connection with retry logic
2. Run schema migrations for decimal precision
3. Set up Redis for caching
4. Configure monitoring and alerting

### Phase 2: Market Data Integration (Day 3-4)
1. Implement Yahoo Finance integration
2. Add Polygon.io WebSocket support
3. Create fallback mechanism
4. Test rate limiting and circuit breakers

### Phase 3: Currency Service (Day 5)
1. Integrate exchange rate APIs
2. Implement THB support
3. Add currency conversion layer
4. Test multi-currency calculations

### Phase 4: UI Components (Day 6-7)
1. Fix transaction page
2. Add decimal input components
3. Implement currency toggle
4. Update portfolio dashboard

### Phase 5: Testing & Optimization (Day 8-9)
1. Integration testing
2. Performance testing
3. Security audit
4. Documentation update

### Phase 6: Deployment (Day 10)
1. Staged rollout
2. Monitor metrics
3. Gather user feedback
4. Fine-tune configuration

## Testing Requirements

### 1. Unit Tests
```typescript
describe('MarketDataService', () => {
  it('should fallback when primary API fails', async () => {
    // Mock primary API failure
    // Verify fallback is used
    // Check cache is updated
  });
  
  it('should handle decimal precision correctly', () => {
    // Test 7 decimal places for quantities
    // Test currency conversion precision
    // Verify rounding rules
  });
});
```

### 2. Integration Tests
```typescript
describe('Portfolio Integration', () => {
  it('should calculate portfolio value with real-time prices', async () => {
    // Create portfolio with holdings
    // Fetch real-time prices
    // Verify calculation accuracy
    // Test currency conversion
  });
  
  it('should handle database connection failures gracefully', async () => {
    // Simulate connection failure
    // Verify retry logic
    // Test fallback mode
  });
});
```

### 3. Load Tests
```yaml
scenarios:
  - name: "Concurrent Portfolio Updates"
    users: 100
    duration: 300s
    requests:
      - GET /api/v1/portfolios/:id/value
      - POST /api/v1/transactions
      - WS /ws/portfolio
    
  - name: "Market Data Stress Test"
    users: 500
    duration: 600s
    requests:
      - GET /api/v1/market/quotes
      - WS /ws/market
```

## Deployment Considerations

### 1. Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_SSL_CA=/path/to/ca.crt

# Market Data APIs
POLYGON_API_KEY=...
YAHOO_FINANCE_ENABLED=true
EXCHANGE_RATE_API_KEY=...

# Redis
REDIS_URL=redis://...

# Feature Flags
ENABLE_REAL_TIME_PRICES=true
ENABLE_THB_SUPPORT=true
DECIMAL_PRECISION=7
```

### 2. Migration Strategy
1. Deploy database migrations in maintenance window
2. Enable feature flags progressively
3. Monitor error rates and performance
4. Rollback plan for each component

### 3. Monitoring & Alerts
```typescript
interface MonitoringMetrics {
  database: {
    connectionPool: number;
    queryTime: Histogram;
    errorRate: Counter;
  };
  marketData: {
    apiLatency: Histogram;
    cacheHitRate: Gauge;
    fallbackUsage: Counter;
  };
  portfolio: {
    calculationTime: Histogram;
    transactionVolume: Counter;
    activeWebSockets: Gauge;
  };
}
```

## Appendices

### A. Database Connection Troubleshooting
1. Verify DigitalOcean firewall rules
2. Check SSL certificate configuration
3. Test connection with psql client
4. Review connection pool settings
5. Monitor connection timeout patterns

### B. API Provider Comparison
| Provider | Free Tier | Rate Limit | Features | Reliability |
|----------|-----------|------------|----------|-------------|
| Yahoo Finance | Unlimited* | 100/min | Comprehensive | 95% |
| Polygon.io | 5 req/min | Limited | Real-time WS | 99% |
| Alpha Vantage | 5 req/min | 500/day | Historical | 90% |
| Finnhub | 60 req/min | Limited | WebSocket | 95% |

### C. Currency Pairs Priority
1. USD/THB - Primary requirement
2. EUR/THB - European stocks
3. GBP/THB - UK market
4. JPY/THB - Japanese stocks
5. SGD/THB - Singapore market

### D. Decimal Precision Standards
- Quantities: 7 decimal places (0.0000001)
- Prices: 4 decimal places (0.0001)
- Percentages: 4 decimal places (0.0001%)
- Currency rates: 10 decimal places
- Display: Context-dependent rounding

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-08-19  
**Next Review**: 2025-08-26  
**Status**: Ready for Implementation