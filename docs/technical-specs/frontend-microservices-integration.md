# Technical Specification: Frontend Microservices Integration

## 1. Overview

### Business Context

Transform the Stock Portfolio Management System v3.0 frontend from monolithic architecture to microservices integration, enabling scalable portfolio management for 1000+ concurrent users with real-time stock data.

### Technical Scope

- **Architecture**: Next.js 15.4.5 + React 19 + TypeScript frontend with 6 microservices
- **Services**: Gateway (4110), User Management (4001), Terminal (4002), AI Assistant (4003), Workspace (4004), Portfolio (4160)
- **UI Framework**: 70% reusable shadcn/ui components + new Portfolio-specific components
- **Real-time**: WebSocket integration for live stock data and portfolio updates
- **State Management**: Zustand + React Query for optimal microservices data flow

### Dependencies

- ✅ Business Analysis Complete (2025-08-15)
- ✅ Terminal V2 Clean Architecture (60% memory reduction, 40% CPU improvement)
- ✅ Gateway Service Implementation
- ✅ Portfolio Service Implementation

## 2. Frontend Architecture Design

### 2.1 Component Hierarchy & Data Flow

```typescript
// Root Application Architecture
App (Next.js 15.4.5)
├── Authentication Layer (authClient)
├── Service Communication Layer
│   ├── Gateway Client (Service Orchestration)
│   ├── User Management Client
│   ├── AI Assistant Client
│   ├── Terminal V2 Client
│   ├── Workspace Client
│   └── Portfolio Client (NEW)
├── State Management Layer
│   ├── Global Auth State (Zustand)
│   ├── Service-specific Stores (React Query)
│   ├── Terminal Store (Zustand - Existing)
│   └── Portfolio Store (Zustand - NEW)
├── UI Component Layer
│   ├── Existing Components (70% reusable)
│   │   ├── shadcn/ui base components
│   │   ├── Terminal V2 components
│   │   ├── AI Assistant components
│   │   └── Workspace components
│   └── Portfolio Components (NEW - 30%)
│       ├── Portfolio Dashboard
│       ├── Stock Widgets
│       ├── Trading Interface
│       └── Performance Charts
└── WebSocket Layer (Real-time Updates)
```

### 2.2 State Management Architecture

**Primary Architecture**: Zustand + React Query Hybrid

```typescript
// Global State Distribution
interface StateArchitecture {
  // Authentication & User State (Zustand - Global)
  authStore: {
    user: User | null;
    tokens: AuthTokens;
    isAuthenticated: boolean;
  };

  // Service Data (React Query - Cached & Synchronized)
  serviceQueries: {
    portfolioData: UseQueryResult<Portfolio[]>;
    stockPrices: UseQueryResult<StockPrice[]>;
    aiSessions: UseQueryResult<ChatSession[]>;
    terminalSessions: UseQueryResult<TerminalSession[]>;
  };

  // UI State (Zustand - Per Feature)
  portfolioStore: PortfolioUIState;
  terminalStore: TerminalUIState; // Existing
  workspaceStore: WorkspaceUIState;

  // Real-time Updates (WebSocket + React Query Mutations)
  realtimeStore: {
    portfolioUpdates: WebSocketData<PortfolioUpdate>;
    stockPriceUpdates: WebSocketData<StockPriceUpdate>;
    terminalOutput: WebSocketData<TerminalOutput>;
  };
}
```

**Architecture Decision Rationale**:

- **Zustand for UI State**: Fast, lightweight, perfect for component state
- **React Query for Service Data**: Built-in caching, background updates, optimistic updates
- **WebSocket + React Query**: Real-time updates with cache invalidation

### 2.3 Service Communication Layer Design

```typescript
// Service Client Interface Standard
interface ServiceClient<TConfig = any> {
  baseUrl: string;
  auth: AuthenticationHandler;
  request: <T>(
    endpoint: string,
    options?: RequestOptions,
  ) => Promise<ApiResponse<T>>;
  websocket?: WebSocketHandler;
  health: () => Promise<HealthStatus>;
  retryPolicy: RetryConfiguration;
  errorHandler: ErrorHandler;
}

// Gateway-First Communication Pattern
class ServiceCommunicationLayer {
  private gateway: GatewayClient;
  private directClients: Map<string, ServiceClient>;

  // Route through Gateway for service discovery and load balancing
  async request<T>(
    service: string,
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T> {
    try {
      // Primary: Route through Gateway
      return await this.gateway.proxy(service, endpoint, options);
    } catch (error) {
      if (this.shouldFallbackToDirect(error)) {
        // Fallback: Direct service communication
        const directClient = this.directClients.get(service);
        return await directClient?.request(endpoint, options);
      }
      throw error;
    }
  }
}
```

### 2.4 Real-time Data Handling

**WebSocket Strategy**: Service-specific WebSocket connections with centralized state management

```typescript
// WebSocket Manager for Real-time Updates
class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<Subscription>> = new Map();

  // Service-specific WebSocket connections
  async connectToService(service: ServiceType): Promise<WebSocket> {
    const wsUrl = this.getWebSocketUrl(service);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleServiceMessage(service, data);
    };

    this.connections.set(service, ws);
    return ws;
  }

  private handleServiceMessage(service: ServiceType, data: any) {
    switch (service) {
      case "portfolio":
        this.updatePortfolioData(data);
        break;
      case "terminal":
        this.updateTerminalOutput(data);
        break;
      case "ai-assistant":
        this.updateChatStream(data);
        break;
    }
  }
}

// WebSocket URLs by Service
const WEBSOCKET_ENDPOINTS = {
  terminal: "ws://localhost:4110/ws/terminal-v2",
  portfolio: "ws://localhost:4160/ws/portfolio",
  aiAssistant: "ws://localhost:4003/ws/chat",
  gateway: "ws://localhost:4110/ws/events",
} as const;
```

## 3. API Integration Patterns

### 3.1 Service Client Implementations

```typescript
// Base Service Client with Authentication & Error Handling
abstract class BaseServiceClient implements ServiceClient {
  protected baseUrl: string;
  protected authClient: AuthClient;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.authClient = authClient; // Global auth client
  }

  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add authentication header
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.authClient.getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new ServiceError(response.status, await response.text());
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleError(error: any): Promise<never> {
    if (error.status === 401) {
      // Token refresh and retry logic
      await this.authClient.refreshTokens();
      // Retry original request once
    }

    throw new ServiceError(error.status || 500, error.message);
  }
}

// Portfolio Service Client
class PortfolioServiceClient extends BaseServiceClient {
  constructor() {
    super("http://localhost:4160/api/v1");
  }

  // Portfolio CRUD Operations
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await this.request<Portfolio[]>("/portfolios");
    return response.data;
  }

  async createPortfolio(portfolio: CreatePortfolioRequest): Promise<Portfolio> {
    const response = await this.request<Portfolio>("/portfolios", {
      method: "POST",
      body: JSON.stringify(portfolio),
    });
    return response.data;
  }

  // Real-time Stock Data
  async getStockPrice(symbol: string): Promise<StockPrice> {
    const response = await this.request<StockPrice>(`/stocks/${symbol}/price`);
    return response.data;
  }

  // Trading Operations
  async executeTrade(trade: TradeRequest): Promise<Trade> {
    const response = await this.request<Trade>("/trades", {
      method: "POST",
      body: JSON.stringify(trade),
    });
    return response.data;
  }
}

// Gateway Service Client (Service Discovery & Routing)
class GatewayServiceClient extends BaseServiceClient {
  constructor() {
    super("http://localhost:4110/api/gateway");
  }

  async proxy<T>(
    service: string,
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(`/proxy/${service}${endpoint}`, options);
  }

  async getServiceHealth(): Promise<ServiceHealthMap> {
    const response = await this.request<ServiceHealthMap>("/health");
    return response.data;
  }

  async discoverServices(): Promise<ServiceRegistry> {
    const response = await this.request<ServiceRegistry>("/discovery");
    return response.data;
  }
}
```

### 3.2 Error Handling and Retry Logic

```typescript
// Comprehensive Error Handling Strategy
class ServiceErrorHandler {
  private retryConfig: RetryConfiguration = {
    maxRetries: 3,
    backoffStrategy: "exponential",
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryDelay: 1000,
  };

  async handleServiceCall<T>(
    serviceCall: () => Promise<T>,
    context: ErrorContext,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await serviceCall();
      } catch (error) {
        lastError = error;

        if (this.shouldRetry(error, attempt)) {
          await this.delay(this.calculateBackoff(attempt));
          continue;
        }

        break;
      }
    }

    // Log error and handle gracefully
    this.logError(lastError, context);
    return this.handleFinalError(lastError, context);
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) return false;
    if (
      error.status &&
      this.retryConfig.retryableStatusCodes.includes(error.status)
    )
      return true;
    if (error.name === "NetworkError") return true;
    return false;
  }

  private calculateBackoff(attempt: number): number {
    return this.retryConfig.retryDelay * Math.pow(2, attempt);
  }
}

// Circuit Breaker Pattern for Service Resilience
class CircuitBreaker {
  private failures: number = 0;
  private nextAttempt: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
```

### 3.3 Caching Strategies

```typescript
// Multi-layer Caching Strategy
interface CacheStrategy {
  // Level 1: React Query Cache (In-Memory, Fast)
  reactQuery: {
    staleTime: number;
    cacheTime: number;
    refetchInterval?: number;
  };

  // Level 2: Browser Cache (Persistent)
  browserCache: {
    ttl: number;
    storage: "localStorage" | "sessionStorage" | "indexedDB";
  };

  // Level 3: Service-level Cache (Redis/Memory)
  serviceCache: {
    ttl: number;
    strategy: "write-through" | "write-back" | "cache-aside";
  };
}

// Cache Configuration by Data Type
const CACHE_STRATEGIES: Record<DataType, CacheStrategy> = {
  // Real-time data - Short cache, frequent updates
  stockPrices: {
    reactQuery: { staleTime: 5000, cacheTime: 300000, refetchInterval: 5000 },
    browserCache: { ttl: 60000, storage: "sessionStorage" },
    serviceCache: { ttl: 10000, strategy: "write-through" },
  },

  // User portfolios - Medium cache, background updates
  portfolios: {
    reactQuery: { staleTime: 30000, cacheTime: 600000 },
    browserCache: { ttl: 300000, storage: "localStorage" },
    serviceCache: { ttl: 180000, strategy: "cache-aside" },
  },

  // Static data - Long cache, rare updates
  stockMetadata: {
    reactQuery: { staleTime: 3600000, cacheTime: 86400000 },
    browserCache: { ttl: 86400000, storage: "indexedDB" },
    serviceCache: { ttl: 3600000, strategy: "write-back" },
  },
};

// Smart Cache Invalidation
class CacheInvalidationManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // WebSocket-triggered cache invalidation
  handleRealtimeUpdate(update: RealtimeUpdate) {
    switch (update.type) {
      case "portfolio_update":
        this.queryClient.invalidateQueries(["portfolios", update.portfolioId]);
        break;
      case "stock_price_update":
        this.queryClient.setQueryData(
          ["stockPrice", update.symbol],
          update.data,
        );
        break;
      case "trade_executed":
        this.queryClient.invalidateQueries(["portfolios"]);
        this.queryClient.invalidateQueries(["trades"]);
        break;
    }
  }
}
```

### 3.4 Authentication Flow

```typescript
// Microservices Authentication Flow
class MicroservicesAuthFlow {
  private authClient: AuthClient;
  private serviceClients: Map<string, ServiceClient>;

  // Unified authentication across all services
  async authenticateWithServices(
    credentials: LoginCredentials,
  ): Promise<AuthResult> {
    // 1. Authenticate with User Management Service
    const authResult = await this.userManagementClient.login(credentials);

    if (authResult.success) {
      // 2. Store tokens globally
      this.authClient.storeTokens(authResult.tokens);
      this.authClient.storeUser(authResult.user);

      // 3. Initialize service-specific authentication
      await this.initializeServiceAuthentication(authResult.tokens);

      // 4. Setup WebSocket connections with authentication
      await this.initializeWebSocketConnections(authResult.tokens);

      return authResult;
    }

    throw new AuthenticationError("Login failed");
  }

  private async initializeServiceAuthentication(tokens: AuthTokens) {
    // Configure all service clients with auth tokens
    for (const [serviceName, client] of this.serviceClients) {
      client.setAuthTokens(tokens);

      // Verify service connectivity
      try {
        await client.health();
        console.log(`✅ ${serviceName} service authenticated`);
      } catch (error) {
        console.warn(`⚠️ ${serviceName} service unavailable:`, error);
      }
    }
  }

  // Token refresh across all services
  async refreshAuthentication(): Promise<void> {
    const newTokens = await this.authClient.refreshTokens();

    // Update tokens in all service clients
    for (const client of this.serviceClients.values()) {
      client.setAuthTokens(newTokens);
    }

    // Update WebSocket authentication
    await this.refreshWebSocketAuthentication(newTokens);
  }
}
```

## 4. Component Specifications

### 4.1 Portfolio Dashboard Components

```typescript
// Portfolio Dashboard Component Architecture
interface PortfolioDashboardProps {
  userId: string;
  portfolioId?: string;
  view: 'overview' | 'detailed' | 'performance';
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  userId,
  portfolioId,
  view
}) => {
  // Data fetching with React Query
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => portfolioServiceClient.getPortfolios(),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: activePortfolio } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioServiceClient.getPortfolio(portfolioId!),
    enabled: !!portfolioId,
  });

  // Real-time portfolio updates
  const { data: realtimeUpdates } = useWebSocketQuery({
    url: `ws://localhost:4160/ws/portfolio/${portfolioId}`,
    enabled: !!portfolioId,
  });

  // Portfolio state management
  const {
    selectedPortfolio,
    setSelectedPortfolio,
    dashboardLayout,
    updateLayout,
  } = usePortfolioStore();

  return (
    <div className="portfolio-dashboard">
      <PortfolioHeader
        portfolios={portfolios}
        activePortfolio={activePortfolio}
        onPortfolioSelect={setSelectedPortfolio}
      />

      <PortfolioMetrics
        portfolio={activePortfolio}
        realtimeUpdates={realtimeUpdates}
        layout={dashboardLayout}
      />

      <PortfolioGrid layout={dashboardLayout}>
        <PositionsWidget portfolio={activePortfolio} />
        <PerformanceChartWidget portfolio={activePortfolio} />
        <WatchlistWidget userId={userId} />
        <RecentTradesWidget portfolio={activePortfolio} />
      </PortfolioGrid>
    </div>
  );
};

// Portfolio Metrics Component with Real-time Updates
interface PortfolioMetricsProps {
  portfolio: Portfolio;
  realtimeUpdates: RealtimePortfolioUpdate[];
  layout: DashboardLayout;
}

const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({
  portfolio,
  realtimeUpdates,
  layout
}) => {
  // Calculate real-time metrics
  const metrics = useMemo(() => {
    return calculatePortfolioMetrics(portfolio, realtimeUpdates);
  }, [portfolio, realtimeUpdates]);

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Total Value"
        value={formatCurrency(metrics.totalValue)}
        change={metrics.dailyChange}
        trend={metrics.trend}
        realtime={true}
      />
      <MetricCard
        title="Daily P&L"
        value={formatCurrency(metrics.dailyPnL)}
        change={metrics.dailyChangePercent}
        trend={metrics.dailyTrend}
        realtime={true}
      />
      <MetricCard
        title="Total Return"
        value={formatPercentage(metrics.totalReturn)}
        change={metrics.totalReturnChange}
        trend={metrics.returnTrend}
      />
      <MetricCard
        title="Cash Balance"
        value={formatCurrency(metrics.cashBalance)}
        trend="neutral"
      />
    </div>
  );
};
```

### 4.2 Real-time Stock Widgets

```typescript
// Real-time Stock Price Widget
interface StockWidgetProps {
  symbol: string;
  showChart?: boolean;
  compact?: boolean;
  onTrade?: (symbol: string, action: 'buy' | 'sell') => void;
}

const StockWidget: React.FC<StockWidgetProps> = ({
  symbol,
  showChart = false,
  compact = false,
  onTrade
}) => {
  // Real-time stock price with WebSocket
  const { data: stockPrice, isConnected } = useWebSocketQuery({
    url: `ws://localhost:4160/ws/stocks/${symbol}`,
    queryKey: ['stockPrice', symbol],
    parser: (data) => JSON.parse(data) as StockPrice,
  });

  // Historical data for chart
  const { data: historicalData } = useQuery({
    queryKey: ['stockChart', symbol, '1D'],
    queryFn: () => portfolioServiceClient.getStockChart(symbol, '1D'),
    enabled: showChart,
    staleTime: 300000,
  });

  // Animation for price changes
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (stockPrice?.change !== 0) {
      setPriceAnimation(stockPrice.change > 0 ? 'up' : 'down');
      const timer = setTimeout(() => setPriceAnimation(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [stockPrice?.change]);

  if (!stockPrice) {
    return <StockWidgetSkeleton compact={compact} />;
  }

  return (
    <Card className={cn(
      "stock-widget",
      compact && "p-3",
      priceAnimation && `animate-pulse-${priceAnimation}`
    )}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{symbol}</h3>
            {!compact && (
              <p className="text-sm text-muted-foreground">{stockPrice.name}</p>
            )}
          </div>
          <ConnectionStatus connected={isConnected} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatCurrency(stockPrice.price)}
            </span>
            <PriceChangeIndicator
              change={stockPrice.change}
              changePercent={stockPrice.changePercent}
            />
          </div>

          {showChart && historicalData && (
            <MiniChart
              data={historicalData}
              height={60}
              color={stockPrice.change >= 0 ? 'green' : 'red'}
            />
          )}

          {onTrade && !compact && (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-green-600"
                onClick={() => onTrade(symbol, 'buy')}
              >
                Buy
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-600"
                onClick={() => onTrade(symbol, 'sell')}
              >
                Sell
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Stock Watchlist Component
const StockWatchlist: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: watchlist } = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => portfolioServiceClient.getWatchlist(userId),
    staleTime: 60000,
  });

  // Real-time updates for all watched stocks
  const { data: realtimeUpdates } = useWebSocketQuery({
    url: `ws://localhost:4160/ws/watchlist/${userId}`,
    enabled: !!watchlist?.symbols.length,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {watchlist?.symbols.map((symbol) => (
            <StockWidget
              key={symbol}
              symbol={symbol}
              compact={true}
              onTrade={handleQuickTrade}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.3 Trading Interface Components

```typescript
// Trading Interface Component
interface TradingInterfaceProps {
  portfolioId: string;
  initialSymbol?: string;
  mode: 'simple' | 'advanced';
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({
  portfolioId,
  initialSymbol,
  mode
}) => {
  const [tradeForm, setTradeForm] = useState<TradeFormData>({
    symbol: initialSymbol || '',
    action: 'buy',
    orderType: 'market',
    quantity: 0,
    price: 0,
    timeInForce: 'day',
  });

  // Portfolio and buying power
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioServiceClient.getPortfolio(portfolioId),
  });

  // Current stock price
  const { data: stockPrice } = useQuery({
    queryKey: ['stockPrice', tradeForm.symbol],
    queryFn: () => portfolioServiceClient.getStockPrice(tradeForm.symbol),
    enabled: !!tradeForm.symbol,
    refetchInterval: 5000,
  });

  // Trade execution mutation
  const executeTradeMutation = useMutation({
    mutationFn: (trade: TradeRequest) => portfolioServiceClient.executeTrade(trade),
    onSuccess: (trade) => {
      // Invalidate portfolio and position queries
      queryClient.invalidateQueries(['portfolio', portfolioId]);
      queryClient.invalidateQueries(['positions', portfolioId]);

      // Show success notification
      toast.success(`${trade.action.toUpperCase()} order executed: ${trade.quantity} shares of ${trade.symbol}`);
    },
    onError: (error) => {
      toast.error(`Trade failed: ${error.message}`);
    },
  });

  const handleTradeSubmit = async () => {
    try {
      // Validate trade
      const validation = validateTrade(tradeForm, portfolio, stockPrice);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      // Execute trade
      await executeTradeMutation.mutateAsync({
        portfolioId,
        ...tradeForm,
        estimatedValue: tradeForm.quantity * (stockPrice?.price || 0),
      });

      // Reset form
      setTradeForm(prev => ({ ...prev, quantity: 0 }));
    } catch (error) {
      console.error('Trade execution error:', error);
    }
  };

  return (
    <Card className="trading-interface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trade
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stock Symbol Input */}
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <StockSymbolInput
            value={tradeForm.symbol}
            onChange={(symbol) => setTradeForm(prev => ({ ...prev, symbol }))}
            placeholder="Enter stock symbol..."
          />
          {stockPrice && (
            <div className="text-sm text-muted-foreground">
              Current Price: {formatCurrency(stockPrice.price)}
            </div>
          )}
        </div>

        {/* Buy/Sell Toggle */}
        <div className="space-y-2">
          <Label>Action</Label>
          <ToggleGroup
            type="single"
            value={tradeForm.action}
            onValueChange={(action) => setTradeForm(prev => ({ ...prev, action: action as 'buy' | 'sell' }))}
          >
            <ToggleGroupItem value="buy" className="flex-1">
              <ArrowUp className="h-4 w-4 mr-2" />
              Buy
            </ToggleGroupItem>
            <ToggleGroupItem value="sell" className="flex-1">
              <ArrowDown className="h-4 w-4 mr-2" />
              Sell
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Order Type */}
        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Select
            value={tradeForm.orderType}
            onValueChange={(orderType) => setTradeForm(prev => ({ ...prev, orderType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
              <SelectItem value="stop">Stop Order</SelectItem>
              <SelectItem value="stop-limit">Stop-Limit Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={tradeForm.quantity || ''}
            onChange={(e) => setTradeForm(prev => ({
              ...prev,
              quantity: parseInt(e.target.value) || 0
            }))}
            placeholder="Number of shares"
          />
        </div>

        {/* Limit Price (if limit order) */}
        {(tradeForm.orderType === 'limit' || tradeForm.orderType === 'stop-limit') && (
          <div className="space-y-2">
            <Label htmlFor="price">Limit Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={tradeForm.price || ''}
              onChange={(e) => setTradeForm(prev => ({
                ...prev,
                price: parseFloat(e.target.value) || 0
              }))}
              placeholder="Limit price"
            />
          </div>
        )}

        {/* Trade Summary */}
        {tradeForm.quantity > 0 && stockPrice && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Estimated Value:</span>
              <span className="font-medium">
                {formatCurrency(tradeForm.quantity * stockPrice.price)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Buying Power:</span>
              <span className={cn(
                portfolio?.cashBalance! >= (tradeForm.quantity * stockPrice.price)
                  ? "text-green-600"
                  : "text-red-600"
              )}>
                {formatCurrency(portfolio?.cashBalance || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Execute Trade Button */}
        <Button
          onClick={handleTradeSubmit}
          disabled={!tradeForm.symbol || !tradeForm.quantity || executeTradeMutation.isPending}
          className="w-full"
          variant={tradeForm.action === 'buy' ? 'default' : 'destructive'}
        >
          {executeTradeMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          {tradeForm.action === 'buy' ? 'Buy' : 'Sell'} {tradeForm.quantity} shares
        </Button>
      </CardContent>
    </Card>
  );
};
```

### 4.4 Performance Charts

```typescript
// Portfolio Performance Chart Component
interface PerformanceChartProps {
  portfolioId: string;
  timeRange: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  chartType: 'line' | 'candlestick' | 'area';
  showComparison?: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  portfolioId,
  timeRange,
  chartType,
  showComparison
}) => {
  // Portfolio performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['portfolioPerformance', portfolioId, timeRange],
    queryFn: () => portfolioServiceClient.getPerformanceData(portfolioId, timeRange),
    staleTime: timeRange === '1D' ? 60000 : 300000,
    refetchInterval: timeRange === '1D' ? 60000 : undefined,
  });

  // Benchmark comparison data
  const { data: benchmarkData } = useQuery({
    queryKey: ['benchmark', 'SPY', timeRange],
    queryFn: () => portfolioServiceClient.getBenchmarkData('SPY', timeRange),
    enabled: showComparison,
    staleTime: 300000,
  });

  // Chart configuration
  const chartConfig = useMemo(() => {
    const baseConfig = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = formatCurrency(context.parsed.y);
              const change = calculateDayChange(context.parsed.y, context.parsed.x);
              return `${label}: ${value} (${formatPercentage(change)})`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            displayFormats: {
              day: 'MMM DD',
              week: 'MMM DD',
              month: 'MMM YYYY',
            },
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value: any) => formatCurrency(value),
          },
        },
      },
    };

    return baseConfig;
  }, []);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!performanceData) return null;

    const datasets = [
      {
        label: 'Portfolio Value',
        data: performanceData.map(point => ({
          x: point.timestamp,
          y: point.totalValue,
        })),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: chartType === 'area' ? 'rgba(59, 130, 246, 0.1)' : undefined,
        fill: chartType === 'area',
      },
    ];

    if (showComparison && benchmarkData) {
      datasets.push({
        label: 'S&P 500',
        data: benchmarkData.map(point => ({
          x: point.timestamp,
          y: point.value,
        })),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: undefined,
        fill: false,
      });
    }

    return { datasets };
  }, [performanceData, benchmarkData, showComparison, chartType]);

  if (isLoading || !chartData) {
    return <ChartSkeleton height={300} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Performance</CardTitle>
          <div className="flex items-center gap-2">
            <TimeRangeSelector
              selected={timeRange}
              onChange={onTimeRangeChange}
            />
            <ChartTypeSelector
              selected={chartType}
              onChange={onChartTypeChange}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          {chartType === 'line' || chartType === 'area' ? (
            <Line data={chartData} options={chartConfig} />
          ) : (
            <CandlestickChart data={chartData} options={chartConfig} />
          )}
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Return</div>
            <div className={cn(
              "text-lg font-semibold",
              performanceData?.totalReturn >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatPercentage(performanceData?.totalReturn || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Period Return</div>
            <div className={cn(
              "text-lg font-semibold",
              performanceData?.periodReturn >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatPercentage(performanceData?.periodReturn || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Volatility</div>
            <div className="text-lg font-semibold">
              {formatPercentage(performanceData?.volatility || 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

## 5. Technical Implementation Details

### 5.1 TypeScript Interfaces and Types

```typescript
// Core Portfolio Types
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  totalValue: number;
  cashBalance: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  createdAt: string;
  updatedAt: string;
  positions: Position[];
  isActive: boolean;
}

interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number; // Percentage of portfolio
  lastUpdated: string;
}

interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  timestamp: string;
  isMarketOpen: boolean;
}

interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  action: "buy" | "sell";
  orderType: "market" | "limit" | "stop" | "stop-limit";
  quantity: number;
  price: number;
  executedPrice?: number;
  status: "pending" | "executed" | "cancelled" | "failed";
  timeInForce: "day" | "gtc" | "ioc" | "fok";
  createdAt: string;
  executedAt?: string;
  fees: number;
  totalAmount: number;
}

// Service Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

interface ServiceError {
  status: number;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// WebSocket Message Types
interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  sessionId?: string;
}

interface PortfolioUpdate extends WebSocketMessage {
  type: "portfolio_update";
  data: {
    portfolioId: string;
    field: keyof Portfolio;
    value: any;
    previousValue?: any;
  };
}

interface StockPriceUpdate extends WebSocketMessage {
  type: "stock_price_update";
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  };
}

interface TradeUpdate extends WebSocketMessage {
  type: "trade_update";
  data: {
    trade: Trade;
    portfolioId: string;
    impact: {
      newCashBalance: number;
      newPosition?: Position;
      updatedPosition?: Position;
    };
  };
}

// State Management Types
interface PortfolioStore {
  // UI State
  selectedPortfolioId: string | null;
  dashboardLayout: DashboardLayout;
  tradeDialogOpen: boolean;
  watchlistSymbols: string[];

  // Actions
  setSelectedPortfolio: (id: string | null) => void;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => void;
  toggleTradeDialog: (open?: boolean) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
}

interface DashboardLayout {
  grid: {
    columns: number;
    rows: number;
  };
  widgets: DashboardWidget[];
  compactMode: boolean;
}

interface DashboardWidget {
  id: string;
  type: "positions" | "performance" | "watchlist" | "trades" | "news";
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  visible: boolean;
}

// Service Configuration Types
interface ServiceConfiguration {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    resetTimeout: number;
  };
  cacheConfig: {
    defaultTTL: number;
    maxSize: number;
  };
}

interface MicroserviceEndpoints {
  gateway: ServiceConfiguration;
  userManagement: ServiceConfiguration;
  aiAssistant: ServiceConfiguration;
  terminal: ServiceConfiguration;
  workspace: ServiceConfiguration;
  portfolio: ServiceConfiguration;
}
```

### 5.2 Hook Patterns for Service Integration

```typescript
// Custom Hooks for Service Integration

// Portfolio Service Hook
export const usePortfolioService = () => {
  const portfolioClient = useMemo(() => new PortfolioServiceClient(), []);

  return {
    // Portfolio CRUD
    usePortfolios: (userId: string) =>
      useQuery({
        queryKey: ["portfolios", userId],
        queryFn: () => portfolioClient.getPortfolios(),
        staleTime: 30000,
      }),

    usePortfolio: (portfolioId: string) =>
      useQuery({
        queryKey: ["portfolio", portfolioId],
        queryFn: () => portfolioClient.getPortfolio(portfolioId),
        enabled: !!portfolioId,
        staleTime: 15000,
      }),

    useCreatePortfolio: () =>
      useMutation({
        mutationFn: (portfolio: CreatePortfolioRequest) =>
          portfolioClient.createPortfolio(portfolio),
        onSuccess: () => {
          queryClient.invalidateQueries(["portfolios"]);
        },
      }),

    // Positions
    usePositions: (portfolioId: string) =>
      useQuery({
        queryKey: ["positions", portfolioId],
        queryFn: () => portfolioClient.getPositions(portfolioId),
        enabled: !!portfolioId,
        staleTime: 15000,
      }),

    // Trading
    useExecuteTrade: () =>
      useMutation({
        mutationFn: (trade: TradeRequest) =>
          portfolioClient.executeTrade(trade),
        onSuccess: (trade) => {
          queryClient.invalidateQueries(["portfolio", trade.portfolioId]);
          queryClient.invalidateQueries(["positions", trade.portfolioId]);
          queryClient.invalidateQueries(["trades", trade.portfolioId]);
        },
      }),

    // Stock Data
    useStockPrice: (symbol: string) =>
      useQuery({
        queryKey: ["stockPrice", symbol],
        queryFn: () => portfolioClient.getStockPrice(symbol),
        enabled: !!symbol,
        staleTime: 5000,
        refetchInterval: 10000,
      }),

    useStockSearch: (query: string) =>
      useQuery({
        queryKey: ["stockSearch", query],
        queryFn: () => portfolioClient.searchStocks(query),
        enabled: query.length >= 2,
        staleTime: 300000,
      }),
  };
};

// WebSocket Hook for Real-time Updates
export const useWebSocketQuery = <T>({
  url,
  queryKey,
  parser,
  enabled = true,
}: {
  url: string;
  queryKey: string[];
  parser?: (data: string) => T;
  enabled?: boolean;
}) => {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = parser ? parser(event.data) : JSON.parse(event.data);
        setData(parsedData);

        // Update React Query cache
        queryClient.setQueryData(queryKey, parsedData);
      } catch (err) {
        setError(new Error("Failed to parse WebSocket message"));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setError(new Error("WebSocket connection error"));
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url, enabled, queryKey, parser]);

  return { data, isConnected, error };
};

// Authentication Hook with Service Integration
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const isAuthenticated = await authClient.isAuthenticated();
        if (isAuthenticated) {
          const userData = await authClient.getUser();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch("/api/ums/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (result.success) {
        authClient.storeTokens(result.tokens);
        authClient.storeUser(result.user);
        setUser(result.user);

        // Initialize service connections
        await initializeServiceConnections(result.tokens);

        return result;
      } else {
        throw new Error(result.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/ums/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authClient.logout();
      setUser(null);

      // Close all service connections
      await closeServiceConnections();

      // Clear all caches
      queryClient.clear();
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};

// Terminal Integration Hook (Existing Enhanced)
export const useTerminalV2 = (projectId: string) => {
  const terminalStore = useTerminalStore();

  const createSession = useMutation({
    mutationFn: (params: { type: "system" | "claude"; projectPath: string }) =>
      fetch("/api/terminal-v2/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectPath: params.projectPath,
          mode: params.type === "claude" ? "claude" : "normal",
        }),
      }).then((res) => res.json()),
    onSuccess: (session) => {
      terminalStore.addSession(projectId, session);
    },
  });

  return {
    sessions: terminalStore.projectSessions[projectId] || {
      system: [],
      claude: [],
    },
    activeTabs: terminalStore.activeTabs[projectId] || {
      system: null,
      claude: null,
    },
    createSession: createSession.mutate,
    setActiveTab: terminalStore.setActiveTab,
    removeSession: terminalStore.removeSession,
  };
};
```

### 5.3 Performance Optimization Strategies

```typescript
// Performance Optimization Implementation

// 1. Component Memoization Strategy
const OptimizedPortfolioDashboard = React.memo(
  PortfolioDashboard,
  (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
      prevProps.userId === nextProps.userId &&
      prevProps.portfolioId === nextProps.portfolioId &&
      prevProps.view === nextProps.view
    );
  }
);

// 2. Virtual Scrolling for Large Lists
const VirtualizedPositionsList: React.FC<{ positions: Position[] }> = ({ positions }) => {
  const { height, width } = useWindowSize();

  const rowRenderer = useCallback(({ index, key, style }: any) => {
    const position = positions[index];
    return (
      <div key={key} style={style}>
        <PositionItem position={position} />
      </div>
    );
  }, [positions]);

  return (
    <AutoSizer>
      {({ height: containerHeight, width: containerWidth }) => (
        <List
          height={containerHeight}
          width={containerWidth}
          rowCount={positions.length}
          rowHeight={60}
          rowRenderer={rowRenderer}
          overscanRowCount={5}
        />
      )}
    </AutoSizer>
  );
};

// 3. Debounced Search Implementation
const useDebounceSearchStocks = (query: string, delay: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return useQuery({
    queryKey: ['stockSearch', debouncedQuery],
    queryFn: () => portfolioServiceClient.searchStocks(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 300000,
  });
};

// 4. Bundle Splitting Strategy
const LazyPortfolioDashboard = lazy(() =>
  import('./PortfolioDashboard').then(module => ({
    default: module.PortfolioDashboard
  }))
);

const LazyTradingInterface = lazy(() =>
  import('./TradingInterface').then(module => ({
    default: module.TradingInterface
  }))
);

// 5. Service Worker for Offline Support
// public/sw.js
const CACHE_NAME = 'portfolio-app-v1';
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

// 6. Image Optimization
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
}> = ({ src, alt, width, height }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  return (
    <div className="relative">
      {!loaded && !error && (
        <Skeleton className="absolute inset-0" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
      />
    </div>
  );
};

// 7. Memory Leak Prevention
const useCleanupEffect = (cleanup: () => void, deps: any[]) => {
  useEffect(() => {
    return cleanup;
  }, deps);
};

// Example usage in components
const PortfolioWidget: React.FC = () => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useCleanupEffect(() => {
    // Cleanup WebSocket connections
    if (wsConnection) {
      wsConnection.close();
    }
  }, [wsConnection]);

  return <div>Portfolio Widget</div>;
};
```

### 5.4 Security Implementation

```typescript
// Security Implementation for Frontend

// 1. Input Validation and Sanitization
import { z } from "zod";

const TradeFormSchema = z.object({
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10, "Symbol too long")
    .regex(/^[A-Z]+$/, "Invalid symbol format"),
  action: z.enum(["buy", "sell"]),
  quantity: z
    .number()
    .min(1, "Quantity must be at least 1")
    .max(10000, "Quantity too large")
    .int("Quantity must be a whole number"),
  orderType: z.enum(["market", "limit", "stop", "stop-limit"]),
  price: z
    .number()
    .min(0.01, "Price must be positive")
    .max(1000000, "Price too large")
    .optional(),
});

const validateTradeForm = (data: any) => {
  try {
    return TradeFormSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
};

// 2. XSS Prevention
const sanitizeUserInput = (input: string): string => {
  // Remove script tags and dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
};

// 3. CSRF Protection
const csrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute("content") || "";
};

const secureRequest = async (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      "X-CSRF-Token": csrfToken(),
      ...options.headers,
    },
  });
};

// 4. Secure Storage Management
class SecureStorage {
  private static encrypt(data: string): string {
    // Simple encryption for demo - use crypto library in production
    return btoa(data);
  }

  private static decrypt(data: string): string {
    return atob(data);
  }

  static setItem(key: string, value: any): void {
    const encrypted = this.encrypt(JSON.stringify(value));
    localStorage.setItem(key, encrypted);
  }

  static getItem<T>(key: string): T | null {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    try {
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// 5. Rate Limiting for Client-side Requests
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { count: number; window: number }> = new Map();

  constructor() {
    // Default rate limits
    this.limits.set("api_calls", { count: 100, window: 60000 }); // 100 per minute
    this.limits.set("trades", { count: 10, window: 60000 }); // 10 trades per minute
  }

  canMakeRequest(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Filter requests within the time window
    const recentRequests = requests.filter((time) => now - time < limit.window);

    if (recentRequests.length < limit.count) {
      recentRequests.push(now);
      this.requests.set(key, recentRequests);
      return true;
    }

    return false;
  }
}

const rateLimiter = new ClientRateLimiter();

// 6. Secure WebSocket Implementation
class SecureWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string, token: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        // Add authentication to WebSocket URL
        const secureUrl = `${url}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(secureUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve(this.ws!);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.handleReconnect(url, token);
        };

        // Validate incoming messages
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.validateMessage(data);
          } catch (error) {
            console.error("Invalid WebSocket message:", error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private validateMessage(data: any): boolean {
    // Validate message structure and content
    if (!data.type || !data.timestamp) {
      throw new Error("Invalid message format");
    }

    // Check message age (prevent replay attacks)
    const messageAge = Date.now() - data.timestamp;
    if (messageAge > 300000) {
      // 5 minutes
      throw new Error("Message too old");
    }

    return true;
  }

  private handleReconnect(url: string, token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(
        () => {
          this.connect(url, token);
        },
        Math.pow(2, this.reconnectAttempts) * 1000,
      );
    }
  }
}

// 7. Content Security Policy Helper
const initializeCSP = () => {
  // Set CSP headers via meta tag
  const cspMeta = document.createElement("meta");
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https:;
    connect-src 'self' ws: wss:;
    font-src 'self' https://fonts.gstatic.com;
  `
    .replace(/\s+/g, " ")
    .trim();

  document.head.appendChild(cspMeta);
};
```

## 6. Development Standards

### 6.1 Code Organization Structure

```typescript
// Frontend Project Structure for Microservices Integration

src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Protected routes
│   │   ├── portfolio/           # Portfolio module
│   │   │   ├── dashboard/       # Dashboard pages
│   │   │   ├── trading/         # Trading interface
│   │   │   └── performance/     # Performance analytics
│   │   ├── ai-assistant/        # AI Assistant module
│   │   ├── workspace/           # Workspace module
│   │   └── terminal/            # Terminal module
│   ├── api/                     # API routes (proxy layer)
│   │   ├── gateway/             # Gateway proxy
│   │   └── health/              # Health checks
│   └── globals.css              # Global styles
│
├── components/                  # Reusable UI components
│   ├── ui/                      # shadcn/ui base components
│   ├── portfolio/               # Portfolio-specific components
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── trading/             # Trading components
│   │   ├── charts/              # Chart components
│   │   └── shared/              # Shared portfolio components
│   ├── common/                  # Common business components
│   └── layout/                  # Layout components
│
├── services/                    # Service clients
│   ├── clients/                 # Service-specific clients
│   │   ├── portfolio.client.ts  # Portfolio service client
│   │   ├── gateway.client.ts    # Gateway service client
│   │   ├── user.client.ts       # User management client
│   │   └── ai.client.ts         # AI Assistant client
│   ├── websocket/               # WebSocket managers
│   └── base/                    # Base service classes
│
├── stores/                      # State management
│   ├── auth.store.ts            # Global auth state
│   ├── portfolio.store.ts       # Portfolio UI state
│   ├── terminal.store.ts        # Terminal state (existing)
│   └── settings.store.ts        # App settings
│
├── hooks/                       # Custom hooks
│   ├── services/                # Service integration hooks
│   │   ├── usePortfolio.ts      # Portfolio service hooks
│   │   ├── useAuth.ts           # Authentication hooks
│   │   └── useWebSocket.ts      # WebSocket hooks
│   ├── ui/                      # UI-specific hooks
│   └── utils/                   # Utility hooks
│
├── types/                       # TypeScript definitions
│   ├── api/                     # API response types
│   ├── services/                # Service-specific types
│   ├── ui/                      # UI component types
│   └── global.d.ts              # Global type definitions
│
├── utils/                       # Utility functions
│   ├── format/                  # Formatting utilities
│   ├── validation/              # Validation schemas
│   ├── security/                # Security utilities
│   └── constants.ts             # App constants
│
├── config/                      # Configuration
│   ├── services.config.ts       # Service endpoints
│   ├── environment.config.ts    # Environment variables
│   └── cache.config.ts          # Caching configuration
│
└── styles/                      # Styling
    ├── globals.css              # Global styles
    ├── components.css           # Component styles
    └── themes/                  # Theme definitions
```

### 6.2 Testing Approach

```typescript
// Testing Strategy for Microservices Frontend

// 1. Service Client Testing
// __tests__/services/portfolio.client.test.ts
import { PortfolioServiceClient } from '@/services/clients/portfolio.client';
import { mockServer } from '@/test-utils/mock-server';

describe('PortfolioServiceClient', () => {
  let client: PortfolioServiceClient;

  beforeEach(() => {
    client = new PortfolioServiceClient();
    mockServer.listen();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe('getPortfolios', () => {
    it('should fetch portfolios successfully', async () => {
      // Arrange
      const mockPortfolios = [
        { id: '1', name: 'Test Portfolio', totalValue: 10000 },
      ];

      mockServer.use(
        rest.get('/api/v1/portfolios', (req, res, ctx) => {
          return res(ctx.json({ success: true, data: mockPortfolios }));
        })
      );

      // Act
      const result = await client.getPortfolios();

      // Assert
      expect(result).toEqual(mockPortfolios);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      mockServer.use(
        rest.get('/api/v1/portfolios', (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
        })
      );

      // Act & Assert
      await expect(client.getPortfolios()).rejects.toThrow('Unauthorized');
    });
  });
});

// 2. Component Testing with Service Integration
// __tests__/components/PortfolioDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';
import { mockPortfolioData } from '@/test-utils/mock-data';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PortfolioDashboard', () => {
  it('should display portfolio metrics', async () => {
    // Arrange
    mockServer.use(
      rest.get('/api/v1/portfolios', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: mockPortfolioData }));
      })
    );

    // Act
    renderWithProviders(
      <PortfolioDashboard userId="user-1" portfolioId="portfolio-1" view="overview" />
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    });
  });
});

// 3. Integration Testing for Service Communication
// __tests__/integration/portfolio-flow.test.ts
describe('Portfolio Integration Flow', () => {
  it('should complete portfolio creation and trading flow', async () => {
    // Mock service responses
    mockServer.use(
      rest.post('/api/v1/portfolios', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: mockPortfolio }));
      }),
      rest.post('/api/v1/trades', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: mockTrade }));
      })
    );

    // Test complete flow
    const { user } = renderWithProviders(<App />);

    // Navigate to portfolio creation
    await user.click(screen.getByText('Create Portfolio'));

    // Fill portfolio form
    await user.type(screen.getByLabelText('Portfolio Name'), 'Test Portfolio');
    await user.click(screen.getByText('Create'));

    // Verify portfolio created
    await waitFor(() => {
      expect(screen.getByText('Portfolio created successfully')).toBeInTheDocument();
    });

    // Execute trade
    await user.click(screen.getByText('Trade'));
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.click(screen.getByText('Buy'));

    // Verify trade executed
    await waitFor(() => {
      expect(screen.getByText('Trade executed successfully')).toBeInTheDocument();
    });
  });
});

// 4. WebSocket Testing
// __tests__/websocket/portfolio-updates.test.ts
import { mockWebSocket } from '@/test-utils/mock-websocket';

describe('Portfolio WebSocket Updates', () => {
  it('should handle real-time portfolio updates', async () => {
    const { socket, mockServer } = mockWebSocket('ws://localhost:4160/ws/portfolio/1');

    const { result } = renderHook(
      () => useWebSocketQuery({
        url: 'ws://localhost:4160/ws/portfolio/1',
        queryKey: ['portfolio', '1'],
      }),
      { wrapper: createQueryWrapper() }
    );

    // Simulate WebSocket message
    act(() => {
      mockServer.emit('message', JSON.stringify({
        type: 'portfolio_update',
        data: { portfolioId: '1', totalValue: 55000 },
        timestamp: Date.now(),
      }));
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        type: 'portfolio_update',
        data: { portfolioId: '1', totalValue: 55000 },
      });
    });
  });
});

// 5. Performance Testing
// __tests__/performance/component-rendering.test.ts
describe('Component Performance', () => {
  it('should render large portfolio lists efficiently', async () => {
    const largePortfolioList = Array.from({ length: 1000 }, (_, i) => ({
      id: `portfolio-${i}`,
      name: `Portfolio ${i}`,
      totalValue: Math.random() * 100000,
    }));

    const startTime = performance.now();

    render(
      <VirtualizedPortfolioList portfolios={largePortfolioList} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in less than 100ms
    expect(renderTime).toBeLessThan(100);
  });
});

// 6. Test Utilities
// test-utils/mock-server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const mockServer = setupServer(
  // Default handlers
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'healthy' }));
  }),

  rest.post('/api/ums/auth/login', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
    }));
  })
);

// test-utils/mock-data.ts
export const mockPortfolioData = [
  {
    id: 'portfolio-1',
    userId: 'user-1',
    name: 'My Portfolio',
    totalValue: 50000,
    cashBalance: 5000,
    dayChange: 250,
    dayChangePercent: 0.5,
    positions: [
      {
        id: 'position-1',
        symbol: 'AAPL',
        quantity: 10,
        currentPrice: 150,
        marketValue: 1500,
      },
    ],
  },
];
```

### 6.3 Build and Deployment Configuration

```typescript
// Build Configuration for Production

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Bundle analyzer
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    // Service worker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV,
  },

  // Performance optimization
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Image optimization
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

// Dockerfile for containerized deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4110

ENV PORT 4110
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

// GitHub Actions CI/CD Pipeline
// .github/workflows/deploy.yml
name: Build and Deploy Frontend

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run type checking
      run: npm run type-check

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        NEXT_PUBLIC_WS_URL: ${{ secrets.WS_URL }}

    - name: Build Docker image
      run: docker build -t portfolio-frontend .

    - name: Push to registry
      if: github.ref == 'refs/heads/main'
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker tag portfolio-frontend ${{ secrets.DOCKER_REGISTRY }}/portfolio-frontend:latest
        docker push ${{ secrets.DOCKER_REGISTRY }}/portfolio-frontend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Deploy to production
      run: |
        # Deploy script here
        echo "Deploying to production..."

// Docker Compose for local development
// docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "4110:4110"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:4110
      - NEXT_PUBLIC_WS_URL=ws://localhost:4110
    depends_on:
      - gateway
      - portfolio-service
    networks:
      - portfolio-network

  gateway:
    image: portfolio-gateway:latest
    ports:
      - "4110:4110"
    environment:
      - NODE_ENV=production
    networks:
      - portfolio-network

  portfolio-service:
    image: portfolio-service:latest
    ports:
      - "4160:4160"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    networks:
      - portfolio-network

networks:
  portfolio-network:
    driver: bridge
```

## 7. Performance Targets

### 7.1 Performance Benchmarks

```typescript
// Performance Targets and Monitoring

interface PerformanceTargets {
  // Core Web Vitals
  largestContentfulPaint: number; // < 2.5s
  firstInputDelay: number; // < 100ms
  cumulativeLayoutShift: number; // < 0.1

  // Custom Metrics
  timeToInteractive: number; // < 3s
  apiResponseTime: number; // < 500ms
  websocketLatency: number; // < 100ms
  bundleSize: number; // < 1MB initial

  // Real-time Performance
  stockPriceUpdateLatency: number; // < 200ms
  portfolioCalculationTime: number; // < 100ms
  chartRenderTime: number; // < 500ms
}

const PERFORMANCE_TARGETS: PerformanceTargets = {
  largestContentfulPaint: 2500,
  firstInputDelay: 100,
  cumulativeLayoutShift: 0.1,
  timeToInteractive: 4100,
  apiResponseTime: 500,
  websocketLatency: 100,
  bundleSize: 1048576, // 1MB
  stockPriceUpdateLatency: 200,
  portfolioCalculationTime: 100,
  chartRenderTime: 500,
};

// Performance Monitoring Implementation
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  measureApiCall<T>(name: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    return apiCall().finally(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric(`api_${name}`, duration);

      if (duration > PERFORMANCE_TARGETS.apiResponseTime) {
        console.warn(`API call ${name} exceeded target: ${duration}ms`);
      }
    });
  }

  measureComponentRender(
    componentName: string,
    renderFunction: () => void,
  ): void {
    const startTime = performance.now();

    renderFunction();

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordMetric(`render_${componentName}`, duration);
  }

  measureWebSocketLatency(message: any): void {
    if (message.timestamp) {
      const latency = Date.now() - message.timestamp;
      this.recordMetric("websocket_latency", latency);

      if (latency > PERFORMANCE_TARGETS.websocketLatency) {
        console.warn(`WebSocket latency exceeded target: ${latency}ms`);
      }
    }
  }

  private recordMetric(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }

    this.metrics.set(name, values);
  }

  getMetricSummary(name: string): MetricSummary | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      average: values.reduce((a, b) => a + b) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.percentile(values, 0.95),
      count: values.length,
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}

// Bundle Size Analysis
const analyzeBundleSize = async (): Promise<BundleAnalysis> => {
  const chunks = await import("webpack-bundle-analyzer");

  return {
    totalSize: 0, // Will be calculated
    chunks: [
      { name: "main", size: 0 },
      { name: "portfolio", size: 0 },
      { name: "trading", size: 0 },
    ],
    recommendations: [
      "Consider code splitting for portfolio module",
      "Lazy load trading interface components",
    ],
  };
};

interface MetricSummary {
  average: number;
  min: number;
  max: number;
  p95: number;
  count: number;
}

interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{ name: string; size: number }>;
  recommendations: string[];
}
```

### 7.2 Load Testing Scenarios

```typescript
// Load Testing for Frontend Performance

// Concurrent User Simulation
const loadTestScenarios = {
  // Scenario 1: Normal Trading Day
  normalTradingDay: {
    users: 500,
    duration: "30m",
    actions: [
      { action: "login", weight: 100 },
      { action: "viewPortfolio", weight: 80 },
      { action: "checkStockPrices", weight: 60 },
      { action: "executeTrade", weight: 20 },
      { action: "viewPerformance", weight: 40 },
    ],
  },

  // Scenario 2: Market Volatility Spike
  marketVolatility: {
    users: 1000,
    duration: "15m",
    actions: [
      { action: "realtimeUpdates", weight: 100 },
      { action: "frequentRefresh", weight: 90 },
      { action: "executeTrade", weight: 50 },
      { action: "viewNews", weight: 70 },
    ],
  },

  // Scenario 3: End of Day Settlement
  endOfDay: {
    users: 2000,
    duration: "10m",
    actions: [
      { action: "portfolioCalculation", weight: 100 },
      { action: "generateReports", weight: 80 },
      { action: "viewPerformance", weight: 90 },
    ],
  },
};

// Performance Assertions
const performanceAssertions = {
  responseTime: {
    p95: 500, // 95th percentile < 500ms
    max: 2000, // Maximum < 2s
  },
  throughput: {
    min: 1000, // Minimum 1000 requests/second
  },
  errorRate: {
    max: 0.01, // Maximum 1% error rate
  },
  resourceUtilization: {
    cpu: 70, // Maximum 70% CPU
    memory: 80, // Maximum 80% memory
  },
};
```

## 8. Summary

This technical specification provides a comprehensive blueprint for integrating the Stock Portfolio Management System frontend with 6 microservices. The architecture leverages proven patterns from the existing Terminal V2 system while introducing new portfolio-specific components and real-time capabilities.

### Key Architectural Decisions:

1. **Hybrid State Management**: Zustand for UI state + React Query for service data
2. **Gateway-First Communication**: Primary routing through Gateway service with direct fallback
3. **Real-time Integration**: Service-specific WebSocket connections with unified state management
4. **Progressive Enhancement**: Build upon existing 70% reusable components
5. **Security-First Design**: Input validation, secure storage, rate limiting, and CSRF protection

### Implementation Readiness:

- ✅ **Foundation Complete**: Terminal V2 architecture provides proven patterns
- ✅ **Services Ready**: All 6 microservices implemented and tested
- ✅ **UI Framework**: shadcn/ui component library with 70% reusability
- 🔄 **Next Steps**: Portfolio component development and real-time integration

### Performance Expectations:

- **Scalability**: 1000+ concurrent users
- **Real-time**: <200ms stock price updates
- **API Response**: <500ms average response time
- **Bundle Size**: <1MB initial load with code splitting

The specification ensures seamless integration with existing systems while providing a scalable foundation for future portfolio management features.
