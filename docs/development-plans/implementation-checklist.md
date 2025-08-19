# Frontend Microservices Implementation Checklist

## Quick Start Guide

This checklist provides step-by-step implementation tasks with code patterns from existing codebase.

## Phase 1: Service Communication Layer (Week 1-2)

### Day 1-3: Base Service Client Architecture

#### Task 1.1: Create Base Service Client

- [ ] Create `/src/services/base/BaseServiceClient.ts`

```typescript
// Pattern from: src/utils/api-client.ts + services/gateway patterns
export class BaseServiceClient {
  constructor(config: ServiceConfig) {
    // Reuse pattern from ApiClient
    // Add: retry logic, circuit breaker, auth headers
  }
}
```

- [ ] Copy authentication logic from `/src/core/auth/auth-client.ts`
- [ ] Add retry mechanism (3 attempts with exponential backoff)
- [ ] Implement circuit breaker (fail fast after 3 consecutive errors)
- [ ] Add request/response interceptors for token refresh
- [ ] Create error transformation utilities
- [ ] Add logging for debugging

**Acceptance Criteria**:

- Auth headers automatically attached
- Failed requests retry up to 3 times
- Circuit breaker prevents cascade failures
- Tokens refresh automatically

#### Task 1.2: Gateway Client Implementation

- [ ] Create `/src/services/gateway/GatewayClient.ts`

```typescript
// Reference: services/gateway/src/services/service-registry.ts
export class GatewayClient extends BaseServiceClient {
  private services = new Map<string, ServiceInfo>();

  async discoverServices() {
    // GET http://localhost:4110/api/services
  }

  async checkHealth() {
    // GET http://localhost:4110/health
  }
}
```

- [ ] Implement service discovery
- [ ] Add health monitoring
- [ ] Create service routing logic
- [ ] Add caching for service endpoints
- [ ] Implement fallback mechanisms

**Acceptance Criteria**:

- Services auto-discovered on startup
- Health status updated every 30s
- Automatic failover to healthy services

### Day 4-6: Portfolio Service Client

#### Task 1.3: Portfolio Service Client

- [ ] Create `/src/services/portfolio/PortfolioClient.ts`

```typescript
// Pattern from: src/modules/workspace/services/terminal.service.client.ts
export class PortfolioClient extends BaseServiceClient {
  constructor() {
    super({
      baseUrl: "http://localhost:4110", // Gateway
      service: "portfolio",
      timeout: 5000,
    });
  }

  // CRUD Operations
  async getPortfolios(userId: string) {}
  async getPortfolio(id: string) {}
  async createPortfolio(data: CreatePortfolioDto) {}
  async updatePortfolio(id: string, data: UpdatePortfolioDto) {}
  async deletePortfolio(id: string) {}

  // Trading Operations
  async executeTrade(trade: TradeDto) {}
  async getPositions(portfolioId: string) {}

  // Analytics
  async getPerformance(portfolioId: string, period: string) {}
}
```

- [ ] Implement all CRUD methods
- [ ] Add TypeScript interfaces for all DTOs
- [ ] Create trading operation methods
- [ ] Add batch operation support
- [ ] Implement response caching
- [ ] Add request validation

**Acceptance Criteria**:

- All portfolio operations functional
- Type-safe request/response
- Batch updates support 100+ items
- Responses cached for 60 seconds

### Day 7-8: WebSocket Integration

#### Task 1.4: WebSocket Layer

- [ ] Create `/src/services/websocket/PortfolioWebSocket.ts`

```typescript
// Pattern from: src/modules/workspace/hooks/useTerminalWebSocket.ts
export class PortfolioWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Subscription>();

  connect() {
    this.ws = new WebSocket("ws://localhost:4110/ws/portfolio");
    // Copy reconnection logic from terminal WebSocket
  }

  subscribe(channel: string, callback: (data: any) => void) {
    // Pattern from Terminal V2
  }
}
```

- [ ] Copy WebSocket patterns from Terminal V2
- [ ] Implement auto-reconnection with exponential backoff
- [ ] Add subscription management
- [ ] Create event emitter for updates
- [ ] Add connection state management
- [ ] Implement message queuing for offline mode

**Acceptance Criteria**:

- Auto-reconnects within 5 seconds
- Queues messages when offline
- Handles 1000+ messages/second

## Phase 2: Portfolio Components (Week 3-4)

### Day 9-11: Portfolio Dashboard

#### Task 2.1: Portfolio Dashboard Component

- [ ] Create `/src/components/portfolio/PortfolioDashboard.tsx`

```typescript
// Reuse components from: src/components/dashboard/
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { DashboardKPICard } from '@/components/dashboard/DashboardKPICard';

export function PortfolioDashboard() {
  // Use React Query for data fetching
  const { data: portfolios } = usePortfolios();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DashboardKPICard
        title="Total Value"
        value={totalValue}
        change={dailyChange}
      />
      {/* Reuse existing KPI card pattern */}
    </div>
  );
}
```

- [ ] Create dashboard layout using existing grid system
- [ ] Implement KPI cards (reuse DashboardKPICard)
- [ ] Add holdings table (reuse Table component)
- [ ] Implement sorting and filtering
- [ ] Add pagination (reuse Pagination component)
- [ ] Create loading states (reuse Loading component)
- [ ] Add error boundaries

**Acceptance Criteria**:

- Displays portfolio summary cards
- Holdings table with sort/filter
- Responsive grid layout
- Loading states for all data

### Day 12-13: Stock Widgets

#### Task 2.2: Stock Widget Components

- [ ] Create `/src/components/portfolio/StockTicker.tsx`
- [ ] Create `/src/components/portfolio/MiniChart.tsx`
- [ ] Create `/src/components/portfolio/QuickTrade.tsx`

```typescript
// Use existing UI components
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function StockTicker({ symbol, price, change }) {
  return (
    <div className="flex items-center gap-2">
      <span>{symbol}</span>
      <span>{price}</span>
      <Badge variant={change > 0 ? 'success' : 'danger'}>
        {change}%
      </Badge>
    </div>
  );
}
```

- [ ] Implement real-time price ticker
- [ ] Create sparkline charts using recharts
- [ ] Add buy/sell quick action buttons
- [ ] Implement price alerts
- [ ] Add watchlist functionality

**Acceptance Criteria**:

- Real-time price updates (<200ms)
- Smooth chart animations
- Quick trade execution

### Day 14-16: Trading Interface

#### Task 2.3: Trading Form

- [ ] Create `/src/components/portfolio/TradingForm.tsx`

```typescript
// Reuse form components
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function TradingForm() {
  // Use react-hook-form for validation
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Reuse existing form components */}
    </form>
  );
}
```

- [ ] Create order form with validation
- [ ] Add order type selection (market/limit)
- [ ] Implement confirmation modal
- [ ] Add execution status display
- [ ] Create order history view
- [ ] Add cancel order functionality

**Acceptance Criteria**:

- Form validation prevents errors
- Confirmation before execution
- Real-time status updates

### Day 17-18: Analytics Charts

#### Task 2.4: Performance Charts

- [ ] Create `/src/components/portfolio/PerformanceChart.tsx`
- [ ] Create `/src/components/portfolio/AllocationChart.tsx`
- [ ] Create `/src/components/portfolio/RiskMetrics.tsx`

```typescript
// Use recharts (already installed)
import { LineChart, PieChart } from 'recharts';

export function PerformanceChart({ data }) {
  return (
    <LineChart data={data}>
      {/* Configure chart */}
    </LineChart>
  );
}
```

- [ ] Implement time series performance chart
- [ ] Create allocation pie chart
- [ ] Add risk metrics display
- [ ] Implement period selector
- [ ] Add export functionality

**Acceptance Criteria**:

- Charts render <100ms
- Responsive to screen size
- Exportable as PNG/CSV

## Phase 3: State Management (Week 5)

### Day 19-20: Portfolio Store

#### Task 3.1: Zustand Store

- [ ] Create `/src/stores/portfolioStore.ts`

```typescript
// Pattern from: src/modules/workspace/stores/terminal.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      portfolios: [],
      selectedPortfolio: null,
      filters: {},

      // Actions
      selectPortfolio: (id) => set({ selectedPortfolio: id }),
      setFilter: (filter) => set({ filters: filter }),

      // Copy patterns from terminal.store.ts
    }),
    {
      name: "portfolio-storage",
    },
  ),
);
```

- [ ] Define portfolio state structure
- [ ] Implement selection logic
- [ ] Add filter management
- [ ] Create sorting preferences
- [ ] Add UI preferences
- [ ] Implement persistence

**Acceptance Criteria**:

- State persists across sessions
- Updates trigger re-renders efficiently
- No unnecessary re-renders

### Day 21-22: React Query Integration

#### Task 3.2: Query Configuration

- [ ] Create `/src/hooks/portfolio/usePortfolios.ts`

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";

export function usePortfolios() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: () => portfolioClient.getPortfolios(),
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
  });
}

export function useCreatePortfolio() {
  return useMutation({
    mutationFn: (data) => portfolioClient.createPortfolio(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["portfolios"]);
    },
  });
}
```

- [ ] Configure QueryClient
- [ ] Create portfolio queries
- [ ] Implement mutations
- [ ] Add optimistic updates
- [ ] Set up cache invalidation
- [ ] Add error handling

**Acceptance Criteria**:

- Data cached for 5 minutes
- Optimistic updates feel instant
- Errors handled gracefully

### Day 23: Real-time Sync

#### Task 3.3: WebSocket Bridge

- [ ] Create `/src/services/realtime/RealtimeSync.ts`

```typescript
export class RealtimeSync {
  constructor(
    private ws: PortfolioWebSocket,
    private queryClient: QueryClient,
  ) {}

  sync() {
    this.ws.subscribe("portfolio:update", (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries(["portfolios", data.id]);
    });
  }
}
```

- [ ] Bridge WebSocket to React Query
- [ ] Implement selective cache invalidation
- [ ] Add conflict resolution
- [ ] Handle connection loss
- [ ] Queue updates when offline

**Acceptance Criteria**:

- Updates reflect within 200ms
- Handles offline/online transitions
- No data loss

## Phase 4: Integration & Testing (Week 6)

### Day 24-25: Integration Tests

#### Task 4.1: Service Tests

- [ ] Create `/tests/integration/services.test.ts`
- [ ] Test all service endpoints
- [ ] Test WebSocket connections
- [ ] Test authentication flow
- [ ] Test error scenarios
- [ ] Test retry logic
- [ ] Load test with 1000+ requests

**Acceptance Criteria**:

- All endpoints return <500ms
- WebSocket handles reconnection
- Auth flow works end-to-end

### Day 26: Component Tests

#### Task 4.2: Component Testing

- [ ] Unit tests for all components
- [ ] Integration tests with services
- [ ] Visual regression tests
- [ ] Accessibility tests
- [ ] Performance tests

**Acceptance Criteria**:

- 80% code coverage
- All components accessible
- No visual regressions

### Day 27: Performance Optimization

#### Task 4.3: Optimization

- [ ] Implement code splitting

```typescript
// Lazy load portfolio module
const PortfolioModule = lazy(() => import("./modules/portfolio"));
```

- [ ] Add React.memo to components
- [ ] Implement virtual scrolling for lists
- [ ] Optimize bundle size
- [ ] Add service worker for caching
- [ ] Implement image lazy loading

**Acceptance Criteria**:

- Initial bundle <1MB
- LCP <2.5s
- No unnecessary re-renders

### Day 28: Production Deployment

#### Task 4.4: Deployment

- [ ] Create `.env.production`

```env
NEXT_PUBLIC_GATEWAY_URL=https://api.portfolio.com
NEXT_PUBLIC_WS_URL=wss://api.portfolio.com/ws
```

- [ ] Configure build pipeline
- [ ] Set up monitoring (Sentry/DataDog)
- [ ] Create deployment scripts
- [ ] Document rollback procedures
- [ ] Set up health checks
- [ ] Configure CDN

**Acceptance Criteria**:

- Zero-downtime deployment
- Rollback possible within 1 minute
- Monitoring alerts configured

## Progress Tracking

### Week 1 Deliverables

- [ ] BaseServiceClient complete
- [ ] GatewayClient functional
- [ ] Portfolio service connected

### Week 2 Deliverables

- [ ] WebSocket integration working
- [ ] Basic dashboard visible

### Week 3 Deliverables

- [ ] Portfolio dashboard complete
- [ ] Stock widgets functional

### Week 4 Deliverables

- [ ] Trading interface working
- [ ] Charts displaying data

### Week 5 Deliverables

- [ ] State management integrated
- [ ] Real-time updates working

### Week 6 Deliverables

- [ ] All tests passing
- [ ] Deployed to staging
- [ ] Performance targets met

## Critical Path Items

These must be completed in order:

1. **BaseServiceClient** → Everything depends on this
2. **GatewayClient** → Required for service communication
3. **PortfolioClient** → Needed for data operations
4. **PortfolioDashboard** → Main user interface
5. **State Management** → Required for performance

## Success Metrics Checklist

### Performance

- [ ] Initial load <2 seconds
- [ ] API responses <500ms
- [ ] Stock updates <200ms
- [ ] Bundle size <1MB

### Quality

- [ ] Test coverage >80%
- [ ] Zero critical bugs
- [ ] Accessibility score >90

### Business

- [ ] Supports 1000+ users
- [ ] 99.9% uptime
- [ ] User satisfaction >4.5/5

---

_Use this checklist to track daily progress. Update status in todo list as tasks complete._
