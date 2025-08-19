/**
 * Jest Test Setup
 * Global configuration for all tests
 */

// Set test environment
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Clean up after all tests
afterAll(async () => {
  // Close database connections, clear caches, etc.
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Global test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Create mock user
  mockUser: () => ({
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  }),

  // Create mock request
  mockRequest: (overrides = {}) => ({
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  }),

  // Create mock response
  mockResponse: () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },
};
