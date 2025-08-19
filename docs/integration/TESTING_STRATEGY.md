# Testing Strategy for UI-API Integration

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Agent**: System Analyst
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: Testing Strategy
- **Status**: Final
- **Dependencies**: UI-API Integration Plan, State Management Plan, React Hooks Plan

---

## Executive Summary

This document outlines the comprehensive testing strategy for the UI-API integration, covering unit tests, integration tests, end-to-end tests, and performance testing. The strategy ensures robust functionality, reliability, and performance of the frontend-backend integration.

### Testing Objectives

- **Functional Verification**: Ensure all API integrations work correctly
- **Real-time Testing**: Validate WebSocket connections and real-time updates
- **Error Handling**: Test error scenarios and recovery mechanisms
- **Performance Validation**: Verify response times and scalability
- **Type Safety**: Ensure TypeScript integration works correctly
- **User Experience**: Validate smooth user interactions

---

## Testing Architecture

### Testing Pyramid

```
                     E2E Tests
                  (High-level flows)
                 ╱────────────────╲
                ╱                  ╲
              ╱   Integration Tests  ╲
             ╱   (API + WebSocket)    ╲
            ╱──────────────────────────╲
           ╱                            ╲
          ╱         Unit Tests           ╲
         ╱    (Hooks, Services, Utils)    ╲
        ╱──────────────────────────────────╲
```

### Testing Framework Stack

- **Unit Testing**: Jest + React Testing Library
- **Integration Testing**: Jest + MSW (Mock Service Worker)
- **E2E Testing**: Playwright
- **Performance Testing**: Lighthouse + Custom metrics
- **WebSocket Testing**: WS + Jest
- **Type Checking**: TypeScript compiler + tsc-watch

---

## Unit Testing Strategy

### 1. Custom Hooks Testing

```typescript
// /src/hooks/__tests__/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../api/useAuth';
import { authService } from '@/services/api/auth.service';

// Mock the auth service
jest.mock('@/services/api/auth.service');
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
      preferences: {},
    };

    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      accessToken: 'token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      permissions: [],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login('test@example.com', 'password');
    });

    expect(result.current.isLoggingIn).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoggingIn).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle login error', async () => {
    const error = new Error('Invalid credentials');
    mockAuthService.login.mockRejectedValue(error);

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login('test@example.com', 'wrong-password');
    });

    await waitFor(() => {
      expect(result.current.isLoggingIn).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should logout successfully', async () => {
    mockAuthService.logout.mockResolvedValue();

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set initial authenticated state
    act(() => {
      result.current.setUser({
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
        preferences: {},
      });
    });

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.isLoggingOut).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
```

### 2. Service Client Testing

```typescript
// /src/services/api/__tests__/portfolio.service.test.ts
import { portfolioService } from "../portfolio.service";
import { gatewayClient } from "../gateway.client";

jest.mock("../gateway.client");
const mockGatewayClient = gatewayClient as jest.Mocked<typeof gatewayClient>;

describe("PortfolioService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPortfolios", () => {
    it("should fetch portfolios successfully", async () => {
      const mockPortfolios = [
        {
          id: "1",
          name: "My Portfolio",
          totalValue: 10000,
          positions: [],
        },
      ];

      mockGatewayClient.get.mockResolvedValue({
        success: true,
        data: mockPortfolios,
        timestamp: Date.now(),
        service: "portfolio-service",
      });

      const result = await portfolioService.getPortfolios();

      expect(result).toEqual(mockPortfolios);
      expect(mockGatewayClient.get).toHaveBeenCalledWith("/api/v1/portfolios");
    });

    it("should handle API error", async () => {
      const error = new Error("API Error");
      mockGatewayClient.get.mockRejectedValue(error);

      await expect(portfolioService.getPortfolios()).rejects.toThrow(
        "API Error",
      );
    });
  });

  describe("executeTrade", () => {
    it("should execute trade successfully", async () => {
      const portfolioId = "1";
      const tradeRequest = {
        symbol: "AAPL",
        type: "BUY" as const,
        quantity: 10,
        price: 150,
      };

      const mockTransaction = {
        id: "trade-1",
        portfolioId,
        ...tradeRequest,
        timestamp: new Date().toISOString(),
        commission: 1,
        total: 1501,
      };

      mockGatewayClient.post.mockResolvedValue({
        success: true,
        data: mockTransaction,
        timestamp: Date.now(),
        service: "portfolio-service",
      });

      const result = await portfolioService.executeTrade(
        portfolioId,
        tradeRequest,
      );

      expect(result).toEqual(mockTransaction);
      expect(mockGatewayClient.post).toHaveBeenCalledWith(
        `/api/v1/portfolios/${portfolioId}/trades`,
        tradeRequest,
      );
    });
  });
});
```

### 3. Zustand Store Testing

```typescript
// /src/store/__tests__/portfolio.store.test.ts
import { act, renderHook } from "@testing-library/react";
import { usePortfolioStore } from "../portfolio.store";

describe("PortfolioStore", () => {
  beforeEach(() => {
    usePortfolioStore.getState().setActivePortfolio(null);
    usePortfolioStore
      .getState()
      .updateRealtimePrice("AAPL", { price: 0, change: 0, timestamp: 0 });
  });

  it("should set active portfolio", () => {
    const { result } = renderHook(() => usePortfolioStore());

    act(() => {
      result.current.setActivePortfolio("portfolio-1");
    });

    expect(result.current.activePortfolioId).toBe("portfolio-1");
  });

  it("should update realtime prices", () => {
    const { result } = renderHook(() => usePortfolioStore());

    const priceData = {
      price: 150.5,
      change: 2.5,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.updateRealtimePrice("AAPL", priceData);
    });

    expect(result.current.realtimePrices["AAPL"]).toEqual(priceData);
  });

  it("should manage watchlist", () => {
    const { result } = renderHook(() => usePortfolioStore());

    act(() => {
      result.current.addToWatchlist("AAPL");
    });

    expect(result.current.watchlistSymbols).toContain("AAPL");

    act(() => {
      result.current.removeFromWatchlist("AAPL");
    });

    expect(result.current.watchlistSymbols).not.toContain("AAPL");
  });
});
```

---

## Integration Testing Strategy

### 1. API Integration Testing with MSW

```typescript
// /src/__tests__/integration/portfolio-api.test.tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';

const server = setupServer(
  rest.get('/api/v1/portfolios', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          {
            id: '1',
            name: 'Test Portfolio',
            totalValue: 10000,
            positions: [
              {
                id: '1',
                symbol: 'AAPL',
                quantity: 10,
                currentPrice: 150,
                marketValue: 1500,
              },
            ],
          },
        ],
      })
    );
  }),

  rest.post('/api/v1/portfolios/1/trades', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          id: 'trade-1',
          portfolioId: '1',
          type: 'BUY',
          symbol: 'AAPL',
          quantity: 5,
          price: 150,
          total: 750,
          timestamp: new Date().toISOString(),
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Portfolio API Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should load and display portfolio data', async () => {
    renderWithProviders(<PortfolioDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });

    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10 shares')).toBeInTheDocument();
  });

  it('should execute a trade successfully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioDashboard />);

    // Wait for portfolio to load
    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });

    // Open trade form
    await user.click(screen.getByText('Execute Trade'));

    // Fill trade form
    await user.selectOptions(screen.getByLabelText('Symbol'), 'AAPL');
    await user.selectOptions(screen.getByLabelText('Type'), 'BUY');
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.type(screen.getByLabelText('Price'), '150');

    // Submit trade
    await user.click(screen.getByText('Submit Trade'));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Trade executed successfully')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Override server to return error
    server.use(
      rest.get('/api/v1/portfolios', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            success: false,
            error: 'Internal server error',
          })
        );
      })
    );

    renderWithProviders(<PortfolioDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load portfolios')).toBeInTheDocument();
    });
  });
});
```

### 2. WebSocket Integration Testing

```typescript
// /src/__tests__/integration/websocket.test.ts
import WS from "jest-websocket-mock";
import { wsManager } from "@/services/websocket/ws.client";
import { portfolioWs } from "@/services/websocket/portfolio.ws";

describe("WebSocket Integration", () => {
  let server: WS;

  beforeEach(() => {
    server = new WS("ws://localhost:4110/ws/portfolio");
  });

  afterEach(() => {
    WS.clean();
  });

  it("should connect and authenticate", async () => {
    await portfolioWs.connect();
    await server.connected;

    expect(server).toHaveReceivedMessages([
      JSON.stringify({
        type: "auth",
        data: { token: "mock-token" },
        timestamp: expect.any(Number),
        id: expect.any(String),
      }),
    ]);
  });

  it("should subscribe to portfolio updates", async () => {
    await portfolioWs.connect();
    await server.connected;

    portfolioWs.subscribeToPortfolio("portfolio-1");

    expect(server).toHaveReceivedMessages([
      expect.any(String), // auth message
      JSON.stringify({
        type: "subscribe_portfolio",
        data: { portfolioId: "portfolio-1" },
        timestamp: expect.any(Number),
        id: expect.any(String),
      }),
    ]);
  });

  it("should handle price updates", async () => {
    const onPriceUpdate = jest.fn();
    portfolioWs.onPriceUpdate(onPriceUpdate);

    await portfolioWs.connect();
    await server.connected;

    // Send price update from server
    server.send(
      JSON.stringify({
        type: "price_update",
        data: {
          symbol: "AAPL",
          price: 150.5,
          change: 2.5,
        },
        timestamp: Date.now(),
        id: "msg-1",
      }),
    );

    expect(onPriceUpdate).toHaveBeenCalledWith("AAPL", 150.5, 2.5);
  });

  it("should reconnect on connection loss", async () => {
    await portfolioWs.connect();
    await server.connected;

    // Simulate connection loss
    server.close();

    // Wait for reconnection
    await server.connected;

    expect(server).toHaveReceivedMessages([
      expect.any(String), // initial auth
      expect.any(String), // reconnection auth
    ]);
  });
});
```

---

## End-to-End Testing Strategy

### 1. User Journey Tests

```typescript
// /e2e/portfolio-management.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Portfolio Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "test@example.com");
    await page.fill('[data-testid="password"]', "password");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("/dashboard");
  });

  test("should create and manage portfolio", async ({ page }) => {
    // Navigate to portfolios
    await page.click('[data-testid="portfolios-nav"]');
    await page.waitForURL("/portfolios");

    // Create new portfolio
    await page.click('[data-testid="create-portfolio"]');
    await page.fill('[data-testid="portfolio-name"]', "Test Portfolio");
    await page.fill(
      '[data-testid="portfolio-description"]',
      "E2E Test Portfolio",
    );
    await page.click('[data-testid="create-button"]');

    // Verify portfolio created
    await expect(page.locator('[data-testid="portfolio-card"]')).toContainText(
      "Test Portfolio",
    );

    // Open portfolio
    await page.click('[data-testid="portfolio-card"]');

    // Execute a trade
    await page.click('[data-testid="execute-trade"]');
    await page.selectOption('[data-testid="trade-symbol"]', "AAPL");
    await page.selectOption('[data-testid="trade-type"]', "BUY");
    await page.fill('[data-testid="trade-quantity"]', "10");
    await page.fill('[data-testid="trade-price"]', "150");
    await page.click('[data-testid="submit-trade"]');

    // Verify trade success
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      "Trade executed successfully",
    );

    // Verify position appears
    await expect(page.locator('[data-testid="position-AAPL"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="position-quantity"]'),
    ).toContainText("10");
  });

  test("should handle real-time price updates", async ({ page }) => {
    // Navigate to watchlist
    await page.goto("/watchlist");

    // Add symbol to watchlist
    await page.click('[data-testid="add-symbol"]');
    await page.fill('[data-testid="symbol-input"]', "AAPL");
    await page.click('[data-testid="add-button"]');

    // Wait for initial price
    await expect(page.locator('[data-testid="price-AAPL"]')).not.toBeEmpty();

    // Simulate WebSocket price update (mock server would send this)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("price-update", {
          detail: { symbol: "AAPL", price: 151.5, change: 1.5 },
        }),
      );
    });

    // Verify price updated
    await expect(page.locator('[data-testid="price-AAPL"]')).toContainText(
      "151.50",
    );
    await expect(page.locator('[data-testid="change-AAPL"]')).toContainText(
      "+1.50",
    );
  });
});
```

### 2. AI Chat E2E Tests

```typescript
// /e2e/ai-chat.spec.ts
import { test, expect } from "@playwright/test";

test.describe("AI Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "test@example.com");
    await page.fill('[data-testid="password"]', "password");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("/dashboard");
  });

  test("should create conversation and send message", async ({ page }) => {
    // Navigate to AI assistant
    await page.click('[data-testid="ai-assistant-nav"]');
    await page.waitForURL("/assistant");

    // Create new conversation
    await page.click('[data-testid="new-conversation"]');
    await page.fill('[data-testid="conversation-title"]', "Test Conversation");
    await page.click('[data-testid="create-conversation"]');

    // Verify conversation created
    await expect(
      page.locator('[data-testid="conversation-title"]'),
    ).toContainText("Test Conversation");

    // Send message
    await page.fill(
      '[data-testid="message-input"]',
      "Hello, can you help me analyze my portfolio?",
    );
    await page.click('[data-testid="send-message"]');

    // Verify message sent
    await expect(
      page.locator('[data-testid="user-message"]').last(),
    ).toContainText("Hello, can you help me analyze my portfolio?");

    // Wait for AI response (streaming)
    await expect(
      page.locator('[data-testid="ai-message"]').last(),
    ).not.toBeEmpty({ timeout: 10000 });

    // Verify response contains relevant content
    await expect(
      page.locator('[data-testid="ai-message"]').last(),
    ).toContainText(/portfolio|analysis|help/i);
  });

  test("should handle streaming messages", async ({ page }) => {
    await page.goto("/assistant");

    // Create conversation
    await page.click('[data-testid="new-conversation"]');
    await page.fill('[data-testid="conversation-title"]', "Streaming Test");
    await page.click('[data-testid="create-conversation"]');

    // Send message
    await page.fill(
      '[data-testid="message-input"]',
      "Tell me about stock market trends",
    );
    await page.click('[data-testid="send-message"]');

    // Verify streaming indicator appears
    await expect(
      page.locator('[data-testid="streaming-indicator"]'),
    ).toBeVisible();

    // Wait for streaming to complete
    await expect(
      page.locator('[data-testid="streaming-indicator"]'),
    ).not.toBeVisible({ timeout: 15000 });

    // Verify final message
    await expect(
      page.locator('[data-testid="ai-message"]').last(),
    ).not.toBeEmpty();
  });
});
```

### 3. Terminal E2E Tests

```typescript
// /e2e/terminal.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Terminal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "test@example.com");
    await page.fill('[data-testid="password"]', "password");
    await page.click('[data-testid="login-button"]');
    await page.goto("/workspace");
  });

  test("should create terminal session and execute commands", async ({
    page,
  }) => {
    // Create new terminal
    await page.click('[data-testid="new-terminal"]');
    await page.selectOption('[data-testid="terminal-type"]', "system");
    await page.click('[data-testid="create-terminal"]');

    // Wait for terminal to be ready
    await expect(
      page.locator('[data-testid="terminal-container"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="terminal-ready"]')).toBeVisible({
      timeout: 5000,
    });

    // Execute command
    await page.type('[data-testid="terminal-input"]', 'echo "Hello Terminal"');
    await page.press('[data-testid="terminal-input"]', "Enter");

    // Verify output
    await expect(page.locator('[data-testid="terminal-output"]')).toContainText(
      "Hello Terminal",
    );

    // Execute another command
    await page.type('[data-testid="terminal-input"]', "pwd");
    await page.press('[data-testid="terminal-input"]', "Enter");

    // Verify working directory output
    await expect(page.locator('[data-testid="terminal-output"]')).toContainText(
      "/",
    );
  });

  test("should handle multiple terminal sessions", async ({ page }) => {
    // Create first terminal
    await page.click('[data-testid="new-terminal"]');
    await page.selectOption('[data-testid="terminal-type"]', "system");
    await page.click('[data-testid="create-terminal"]');

    // Wait for first terminal
    await expect(
      page.locator('[data-testid="terminal-tab"]').first(),
    ).toBeVisible();

    // Create second terminal
    await page.click('[data-testid="new-terminal"]');
    await page.selectOption('[data-testid="terminal-type"]', "claude");
    await page.click('[data-testid="create-terminal"]');

    // Verify two tabs exist
    await expect(page.locator('[data-testid="terminal-tab"]')).toHaveCount(2);

    // Switch between tabs
    await page.click('[data-testid="terminal-tab"]').first();
    await expect(
      page.locator('[data-testid="active-terminal"]'),
    ).toHaveAttribute("data-type", "system");

    await page.click('[data-testid="terminal-tab"]').last();
    await expect(
      page.locator('[data-testid="active-terminal"]'),
    ).toHaveAttribute("data-type", "claude");
  });
});
```

---

## Performance Testing Strategy

### 1. API Response Time Testing

```typescript
// /performance/api-performance.test.ts
import { performance } from "perf_hooks";
import { portfolioService } from "@/services/api/portfolio.service";

describe("API Performance", () => {
  it("should load portfolios within 500ms", async () => {
    const start = performance.now();
    await portfolioService.getPortfolios();
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(500);
  });

  it("should execute trades within 1000ms", async () => {
    const start = performance.now();
    await portfolioService.executeTrade("portfolio-1", {
      symbol: "AAPL",
      type: "BUY",
      quantity: 10,
      price: 150,
    });
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(1000);
  });

  it("should handle concurrent requests efficiently", async () => {
    const promises = Array.from({ length: 10 }, () =>
      portfolioService.getPortfolios(),
    );

    const start = performance.now();
    await Promise.all(promises);
    const end = performance.now();

    const duration = end - start;
    // Should handle 10 concurrent requests in under 2 seconds
    expect(duration).toBeLessThan(2000);
  });
});
```

### 2. WebSocket Performance Testing

```typescript
// /performance/websocket-performance.test.ts
import { portfolioWs } from "@/services/websocket/portfolio.ws";

describe("WebSocket Performance", () => {
  it("should handle high-frequency price updates", async () => {
    const updates: any[] = [];
    portfolioWs.onPriceUpdate((symbol, price, change) => {
      updates.push({ symbol, price, change, timestamp: Date.now() });
    });

    await portfolioWs.connect();

    // Simulate 100 price updates per second for 5 seconds
    const totalUpdates = 500;
    const updateInterval = 10; // ms

    for (let i = 0; i < totalUpdates; i++) {
      setTimeout(() => {
        // Simulate server sending price update
        window.dispatchEvent(
          new CustomEvent("price-update", {
            detail: {
              symbol: "AAPL",
              price: 150 + Math.random() * 10,
              change: Math.random() * 2 - 1,
            },
          }),
        );
      }, i * updateInterval);
    }

    // Wait for all updates
    await new Promise((resolve) => setTimeout(resolve, 6000));

    expect(updates.length).toBe(totalUpdates);

    // Check that updates were processed efficiently
    const processingTimes = updates
      .slice(1)
      .map((update, index) => update.timestamp - updates[index].timestamp);

    const averageProcessingTime =
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    expect(averageProcessingTime).toBeLessThan(20); // Average under 20ms
  });
});
```

### 3. Memory Usage Testing

```typescript
// /performance/memory-usage.test.ts
describe("Memory Usage", () => {
  it("should not have memory leaks in portfolio store", () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate intensive portfolio operations
    for (let i = 0; i < 1000; i++) {
      usePortfolioStore.getState().updateRealtimePrice(`STOCK${i}`, {
        price: Math.random() * 100,
        change: Math.random() * 10 - 5,
        timestamp: Date.now(),
      });
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (under 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

---

## Error Handling Testing

### 1. Network Error Testing

```typescript
// /src/__tests__/error-handling/network-errors.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';

const server = setupServer();

describe('Network Error Handling', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should handle 500 server errors', async () => {
    server.use(
      rest.get('/api/v1/portfolios', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
      })
    );

    render(<PortfolioDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load portfolios')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should handle network timeouts', async () => {
    server.use(
      rest.get('/api/v1/portfolios', (req, res, ctx) => {
        return res(ctx.delay(10000)); // 10 second delay
      })
    );

    render(<PortfolioDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Request timed out')).toBeInTheDocument();
    }, { timeout: 15000 });
  });

  it('should handle offline scenarios', async () => {
    server.use(
      rest.get('/api/v1/portfolios', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    render(<PortfolioDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to the server')).toBeInTheDocument();
    });
  });
});
```

### 2. WebSocket Error Testing

```typescript
// /src/__tests__/error-handling/websocket-errors.test.ts
import WS from "jest-websocket-mock";
import { portfolioWs } from "@/services/websocket/portfolio.ws";

describe("WebSocket Error Handling", () => {
  it("should handle connection errors", async () => {
    const server = new WS("ws://localhost:4110/ws/portfolio");

    const onError = jest.fn();
    portfolioWs.onError(onError);

    await portfolioWs.connect();

    // Simulate connection error
    server.error();

    expect(onError).toHaveBeenCalled();

    WS.clean();
  });

  it("should retry connections with exponential backoff", async () => {
    const connectSpy = jest.spyOn(portfolioWs, "connect");

    // First connection fails
    const server1 = new WS("ws://localhost:4110/ws/portfolio");
    server1.error();

    // Second connection succeeds after retry
    const server2 = new WS("ws://localhost:4110/ws/portfolio");

    await portfolioWs.connect();

    expect(connectSpy).toHaveBeenCalledTimes(2);

    WS.clean();
  });
});
```

---

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/*.stories.{ts,tsx}",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{ts,tsx}",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
```

### Test Setup File

```typescript
// /src/__tests__/setup.ts
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock environment variables
process.env.NEXT_PUBLIC_API_GATEWAY_URL = "http://localhost:4110";

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4100",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Testing Automation

### CI/CD Pipeline Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npm run test:performance

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: "./lighthouserc.json"
```

---

This comprehensive testing strategy ensures robust validation of all UI-API integrations, providing confidence in the system's reliability, performance, and user experience.
