"use strict";
/**
 * Jest Test Setup for Gateway Service
 * Global test configuration and utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockServiceResponse =
  exports.createMockNext =
  exports.createMockResponse =
  exports.createMockRequest =
    void 0;
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
const createMockRequest = (overrides = {}) => ({
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
exports.createMockRequest = createMockRequest;
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};
exports.createMockResponse = createMockResponse;
const createMockNext = () => jest.fn();
exports.createMockNext = createMockNext;
// Mock service responses
const createMockServiceResponse = (data, success = true) => ({
  success,
  data: success ? data : null,
  error: success ? null : data,
  status: success ? 200 : 500,
});
exports.createMockServiceResponse = createMockServiceResponse;
//# sourceMappingURL=setup.js.map
