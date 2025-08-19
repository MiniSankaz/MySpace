/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly enabled
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
  info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock timers for predictable testing
jest.useFakeTimers();

// Global beforeEach setup
beforeEach(() => {
  jest.clearAllTimers();
  jest.resetAllMocks();
});

// Global afterEach cleanup
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});

// Test utilities
export const createMockContext = () => ({
  userId: "test-user-123",
  sessionId: "test-session-456",
  workspaceId: "test-workspace-789",
  metadata: { source: "test" },
  sharedState: {},
});

export const createMockTask = (overrides = {}) => ({
  id: "test-task-123",
  name: "Test Task",
  description: "A test task",
  type: "development",
  priority: 50,
  dependencies: [],
  parallelizable: true,
  timeout: 30000,
  ...overrides,
});

export const createMockAgent = (overrides = {}) => ({
  id: "test-agent-123",
  name: "Test Agent",
  type: "code-assistant",
  capabilities: ["testing"],
  status: "idle",
  workload: 0,
  performance: {
    tasksCompleted: 0,
    successRate: 1.0,
    averageResponseTime: 1000,
    specializations: ["testing"],
    reputation: 100,
  },
  preferences: {
    preferredTaskTypes: ["testing"],
    maxConcurrentTasks: 3,
    communicationStyle: "technical",
    collaborationPreference: "pair",
  },
  messageQueue: [],
  ...overrides,
});

// Mock WebSocket for testing
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  private listeners = new Map<string, Set<Function>>();

  addEventListener(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  send(data: string) {
    // Mock send - can be used to simulate responses
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", {});
  }

  emit(type: string, event: any) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  simulateMessage(data: any) {
    this.emit("message", { data: JSON.stringify(data) });
  }
}

// Make MockWebSocket available globally
(global as any).MockWebSocket = MockWebSocket;
