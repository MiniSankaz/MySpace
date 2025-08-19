/**
 * Jest Test Setup for Gateway Service
 * Global test configuration and utilities
 */

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.AI_SERVICE_URL = "http://localhost:4200";
process.env.PORTFOLIO_SERVICE_URL = "http://localhost:4500";
process.env.TERMINAL_SERVICE_URL = "http://localhost:4300";
process.env.USER_SERVICE_URL = "http://localhost:4100";
process.env.WORKSPACE_SERVICE_URL = "http://localhost:4400";

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

// Test utilities for Gateway
export const createMockRequest = (overrides = {}) => ({
  method: "GET",
  url: "/test",
  headers: {
    "content-type": "application/json",
    authorization: "Bearer test-token",
  },
  body: {},
  query: {},
  params: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

// Mock service responses
export const createMockServiceResponse = (data: any, success = true) => ({
  success,
  data: success ? data : null,
  error: success ? null : data,
  status: success ? 200 : 500,
});
