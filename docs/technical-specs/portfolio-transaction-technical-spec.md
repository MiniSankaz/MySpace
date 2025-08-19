# Portfolio Transaction & Performance - Technical Specifications

**วันที่**: 2025-08-17  
**เวอร์ชั่น**: 1.0  
**สถานะ**: READY FOR IMPLEMENTATION

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend - Port 4100"
        UI[Portfolio UI]
        TF[Transaction Form]
        TH[Transaction History]
        PD[Performance Dashboard]
        RT[Real-time Updates]
    end
    
    subgraph "API Gateway - Port 4110"
        GW[Gateway Router]
    end
    
    subgraph "Portfolio Service - Port 4160"
        TC[Transaction Controller]
        PC[Portfolio Controller]
        WS[WebSocket Server]
        BG[Background Jobs]
    end
    
    subgraph "Database"
        DB[(PostgreSQL)]
    end
    
    UI --> GW
    TF --> GW
    TH --> GW
    PD --> GW
    RT --> WS
    
    GW --> TC
    GW --> PC
    
    TC --> DB
    PC --> DB
    BG --> DB
```

## 2. API Specifications

### 2.1 Transaction Management APIs

#### Create Transaction
```typescript
POST /api/v1/portfolios/:portfolioId/transactions

Request Headers:
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json",
  "x-user-id": "string"
}

Request Body:
{
  "type": "BUY" | "SELL" | "DIVIDEND" | "TRANSFER_IN" | "TRANSFER_OUT",
  "symbol": "string",
  "quantity": number,
  "price": number,
  "fees": number,
  "notes": "string?",
  "executedAt": "ISO8601 datetime"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "uuid",
    "portfolioId": "uuid",
    "type": "BUY",
    "symbol": "AAPL",
    "quantity": 100,
    "price": 150.50,
    "fees": 10,
    "total": 15060,
    "notes": "Long-term investment",
    "executedAt": "2025-08-17T10:00:00Z",
    "createdAt": "2025-08-17T10:00:00Z"
  }
}
```

#### Get Transactions
```typescript
GET /api/v1/portfolios/:portfolioId/transactions

Query Parameters:
- limit: number (default: 50)
- offset: number (default: 0)
- symbol: string (optional)
- type: TransactionType (optional)
- startDate: ISO8601 (optional)
- endDate: ISO8601 (optional)
- sortBy: "date" | "symbol" | "type" | "amount" (default: "date")
- sortOrder: "asc" | "desc" (default: "desc")

Response (200):
{
  "success": true,
  "data": {
    "transactions": Transaction[],
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

#### Update Transaction
```typescript
PUT /api/v1/transactions/:transactionId

Request Body:
{
  "price": number?,
  "quantity": number?,
  "fees": number?,
  "notes": string?,
  "executedAt": "ISO8601 datetime?"
}

Response (200):
{
  "success": true,
  "data": Transaction
}
```

#### Delete Transaction
```typescript
DELETE /api/v1/transactions/:transactionId

Response (200):
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

### 2.2 Performance Analytics APIs

#### Get Portfolio Performance
```typescript
GET /api/v1/portfolios/:portfolioId/performance

Query Parameters:
- period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL"
- startDate: ISO8601 (optional)
- endDate: ISO8601 (optional)

Response (200):
{
  "success": true,
  "data": {
    "totalValue": number,
    "totalCost": number,
    "totalReturn": number,
    "totalReturnPercent": number,
    "dayChange": number,
    "dayChangePercent": number,
    "annualizedReturn": number,
    "sharpeRatio": number,
    "maxDrawdown": number,
    "winLossRatio": number,
    "timeWeightedReturn": number,
    "holdings": [
      {
        "symbol": "AAPL",
        "quantity": 100,
        "avgCost": 150.50,
        "currentPrice": 175.00,
        "marketValue": 17500,
        "gain": 2450,
        "gainPercent": 16.28,
        "allocation": 35.5
      }
    ]
  }
}
```

#### Get Portfolio Snapshots
```typescript
GET /api/v1/portfolios/:portfolioId/snapshots

Query Parameters:
- period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y"
- interval: "hourly" | "daily" | "weekly" | "monthly"
- limit: number (default: 100)

Response (200):
{
  "success": true,
  "data": {
    "snapshots": [
      {
        "id": "uuid",
        "timestamp": "ISO8601",
        "totalValue": number,
        "dayChange": number,
        "dayChangePercent": number
      }
    ]
  }
}
```

### 2.3 WebSocket Real-time Updates

#### Connection
```typescript
// Client connection
const socket = io('ws://localhost:4110/portfolio', {
  auth: {
    token: 'Bearer <token>'
  }
});

// Server events
socket.on('connect', () => {
  console.log('Connected to portfolio WebSocket');
});

socket.on('price_update', (data: PriceUpdate) => {
  // Handle price update
});

socket.on('portfolio_update', (data: PortfolioUpdate) => {
  // Handle portfolio value update
});

socket.on('trade_executed', (data: TradeNotification) => {
  // Handle trade notification
});
```

#### Subscribe to Price Updates
```typescript
// Subscribe to specific symbols
socket.emit('subscribe_prices', {
  symbols: ['AAPL', 'GOOGL', 'MSFT']
});

// Unsubscribe
socket.emit('unsubscribe_prices', {
  symbols: ['AAPL']
});
```

### 2.4 Export APIs

#### Export Transactions
```typescript
GET /api/v1/portfolios/:portfolioId/export/transactions

Query Parameters:
- format: "csv" | "pdf" | "excel" | "json"
- startDate: ISO8601
- endDate: ISO8601

Response (200):
// For CSV/Excel
Content-Type: text/csv or application/vnd.ms-excel
Content-Disposition: attachment; filename="transactions_2025-08-17.csv"

// For PDF
Content-Type: application/pdf
Content-Disposition: attachment; filename="transactions_2025-08-17.pdf"

// For JSON
{
  "success": true,
  "data": {
    "transactions": Transaction[],
    "summary": {
      "totalBuys": number,
      "totalSells": number,
      "totalFees": number,
      "netProfit": number
    }
  }
}
```

## 3. Frontend Component Specifications

### 3.1 Transaction Form Component

```typescript
interface TransactionFormProps {
  portfolioId: string;
  onSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
}

interface TransactionFormData {
  type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  fees: number;
  notes?: string;
  executedAt: Date;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  portfolioId,
  onSuccess,
  onCancel,
  initialData
}) => {
  // Form implementation with validation
  // Auto-calculation of total
  // Symbol autocomplete
  // Date picker for executedAt
};
```

### 3.2 Transaction History Table

```typescript
interface TransactionTableProps {
  portfolioId: string;
  initialFilters?: TransactionFilters;
}

interface TransactionFilters {
  symbol?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  portfolioId,
  initialFilters
}) => {
  // Sortable columns
  // Filter controls
  // Pagination
  // Actions (edit, delete, duplicate)
  // Export button
};
```

### 3.3 Performance Dashboard

```typescript
interface PerformanceDashboardProps {
  portfolioId: string;
  period: TimePeriod;
}

interface PerformanceMetrics {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  portfolioId,
  period
}) => {
  // Metrics cards
  // Portfolio value chart
  // Asset allocation chart
  // Performance comparison
  // Holdings table
};
```

## 4. Database Schema Updates

### 4.1 Transaction Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'TRANSFER_IN', 'TRANSFER_OUT')),
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 4) NOT NULL,
  fees DECIMAL(18, 4) DEFAULT 0,
  total DECIMAL(18, 4) NOT NULL,
  notes TEXT,
  executed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_symbol (symbol),
  INDEX idx_executed_at (executed_at),
  INDEX idx_type (type)
);
```

### 4.2 Portfolio Snapshots Table
```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(18, 4) NOT NULL,
  total_cost DECIMAL(18, 4) NOT NULL,
  day_change DECIMAL(18, 4),
  day_change_percent DECIMAL(10, 4),
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_portfolio_snapshot (portfolio_id, created_at DESC)
);
```

### 4.3 Holdings Table
```sql
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  avg_cost DECIMAL(18, 4) NOT NULL,
  total_cost DECIMAL(18, 4) NOT NULL,
  current_price DECIMAL(18, 4),
  market_value DECIMAL(18, 4),
  unrealized_gain DECIMAL(18, 4),
  unrealized_gain_percent DECIMAL(10, 4),
  last_updated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE KEY unique_portfolio_symbol (portfolio_id, symbol),
  INDEX idx_portfolio_holdings (portfolio_id)
);
```

## 5. State Management

### 5.1 Zustand Store Structure

```typescript
// Transaction Store
interface TransactionStore {
  transactions: Transaction[];
  filters: TransactionFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTransactions: (portfolioId: string) => Promise<void>;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setFilters: (filters: TransactionFilters) => void;
  clearFilters: () => void;
}

// Performance Store
interface PerformanceStore {
  metrics: PerformanceMetrics | null;
  snapshots: PortfolioSnapshot[];
  period: TimePeriod;
  isLoading: boolean;
  
  // Actions
  fetchMetrics: (portfolioId: string, period: TimePeriod) => Promise<void>;
  fetchSnapshots: (portfolioId: string, options: SnapshotOptions) => Promise<void>;
  setPeriod: (period: TimePeriod) => void;
}

// WebSocket Store
interface WebSocketStore {
  isConnected: boolean;
  priceUpdates: Map<string, PriceUpdate>;
  portfolioUpdates: PortfolioUpdate[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribePrices: (symbols: string[]) => void;
  unsubscribePrices: (symbols: string[]) => void;
}
```

### 5.2 React Query Configuration

```typescript
// Query Keys
export const queryKeys = {
  transactions: (portfolioId: string, filters?: TransactionFilters) => 
    ['transactions', portfolioId, filters],
  performance: (portfolioId: string, period: TimePeriod) => 
    ['performance', portfolioId, period],
  snapshots: (portfolioId: string, options: SnapshotOptions) => 
    ['snapshots', portfolioId, options],
  holdings: (portfolioId: string) => 
    ['holdings', portfolioId]
};

// Query Hooks
export const useTransactions = (portfolioId: string, filters?: TransactionFilters) => {
  return useQuery({
    queryKey: queryKeys.transactions(portfolioId, filters),
    queryFn: () => fetchTransactions(portfolioId, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
};

export const usePerformance = (portfolioId: string, period: TimePeriod) => {
  return useQuery({
    queryKey: queryKeys.performance(portfolioId, period),
    queryFn: () => fetchPerformance(portfolioId, period),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000 // Auto-refresh every minute
  });
};
```

## 6. Performance Requirements

### 6.1 Response Times
- Transaction list load: < 500ms for 1000 records
- Performance calculation: < 1s for full portfolio
- Real-time price update: < 100ms latency
- Export generation: < 5s for 10,000 transactions

### 6.2 Scalability
- Support 100+ concurrent users
- Handle 10,000+ transactions per portfolio
- Process 1000+ real-time price updates/second
- Store 5+ years of historical data

### 6.3 Reliability
- 99.9% uptime for core features
- Automatic reconnection for WebSocket
- Transaction rollback on failure
- Data integrity validation

## 7. Security Requirements

### 7.1 Authentication & Authorization
- JWT token validation for all API calls
- Portfolio ownership verification
- Role-based access control (view-only, edit, admin)
- Session timeout after 30 minutes of inactivity

### 7.2 Data Protection
- HTTPS encryption for all API calls
- WSS (WebSocket Secure) for real-time connections
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### 7.3 Audit Trail
- Log all transaction modifications
- Track user actions (create, update, delete)
- Maintain change history
- Export audit logs

## 8. Testing Requirements

### 8.1 Unit Tests
```typescript
// Transaction Form Tests
describe('TransactionForm', () => {
  it('should validate required fields');
  it('should calculate total correctly');
  it('should handle API errors gracefully');
  it('should submit valid transaction data');
});

// Transaction Service Tests
describe('TransactionService', () => {
  it('should create transaction and update holdings');
  it('should handle concurrent transactions');
  it('should rollback on failure');
  it('should validate business rules');
});
```

### 8.2 Integration Tests
```typescript
// Full Transaction Flow
describe('Transaction E2E', () => {
  it('should complete buy transaction flow');
  it('should update portfolio value after transaction');
  it('should reflect changes in real-time');
  it('should export transactions correctly');
});
```

### 8.3 Performance Tests
```typescript
// Load Testing
describe('Performance', () => {
  it('should handle 100 concurrent users');
  it('should process 1000 transactions in < 5s');
  it('should maintain < 100ms WebSocket latency');
  it('should export 10000 records in < 5s');
});
```

## 9. Deployment Configuration

### 9.1 Environment Variables
```env
# Portfolio Service
PORTFOLIO_SERVICE_PORT=4160
DATABASE_URL=postgresql://user:pass@host:5432/portfolio
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# Market Data
MARKET_DATA_API_KEY=your-api-key
MARKET_DATA_API_URL=https://api.marketdata.com

# WebSocket
WS_PORT=4501
WS_CORS_ORIGIN=http://localhost:4100

# Export
EXPORT_TEMP_DIR=/tmp/exports
EXPORT_MAX_SIZE=100MB
```

### 9.2 Docker Configuration
```dockerfile
# Portfolio Service Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4160 4501
CMD ["npm", "start"]
```

### 9.3 Monitoring & Logging
```yaml
# Prometheus metrics
metrics:
  - transaction_count
  - transaction_processing_time
  - api_response_time
  - websocket_connections
  - export_generation_time

# Log levels
logging:
  level: info
  format: json
  outputs:
    - console
    - file: /var/log/portfolio.log
    - elasticsearch: http://elk:9200
```

---

**Document Status**: ✅ COMPLETE  
**Version**: 1.0  
**Last Updated**: 2025-08-17  
**Review Schedule**: After each sprint