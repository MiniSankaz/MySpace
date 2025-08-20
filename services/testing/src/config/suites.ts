/**
 * Test suite definitions
 */

export interface TestSuite {
  name: string;
  description: string;
  commands: string[];
  timeout?: number;
  parallel?: boolean;
}

export const TEST_SUITES: Record<string, TestSuite> = {
  health: {
    name: 'Health Check Suite',
    description: 'Basic health checks for all services',
    commands: [
      'curl -s http://localhost:4110/health',
      'curl -s http://localhost:4120/health',
      'curl -s http://localhost:4130/health',
      'curl -s http://localhost:4140/health',
      'curl -s http://localhost:4150/health',
      'curl -s http://localhost:4160/health',
      'curl -s http://localhost:4170/health',
      'curl -s http://localhost:4110/health/all'
    ],
    timeout: 30000,
    parallel: true
  },
  
  api: {
    name: 'API Test Suite',
    description: 'API endpoint testing',
    commands: [
      'curl -s http://localhost:4110/services',
      'curl -X GET http://localhost:4110/api/v1/users/health',
      'curl -X GET http://localhost:4110/api/v1/portfolios/health',
      'curl -X GET http://localhost:4110/api/v1/stocks/trending'
    ],
    timeout: 60000,
    parallel: true
  },
  
  integration: {
    name: 'Integration Test Suite',
    description: 'Service-to-service integration tests',
    commands: [
      './test-all-services.sh',
      './test-gateway-routing.sh'
    ],
    timeout: 120000,
    parallel: false
  },
  
  smoke: {
    name: 'Smoke Test Suite',
    description: 'Quick smoke tests for deployment validation',
    commands: [
      'curl -s http://localhost:4110/health',
      'curl -s http://localhost:4110/services',
      'curl -s http://localhost:4100/' // Frontend check
    ],
    timeout: 15000,
    parallel: true
  },
  
  unit: {
    name: 'Unit Test Suite',
    description: 'Unit tests for individual services',
    commands: [
      'npm test'
    ],
    timeout: 180000,
    parallel: false
  },
  
  e2e: {
    name: 'End-to-End Test Suite',
    description: 'Complete user journey tests',
    commands: [
      'npm run test:e2e'
    ],
    timeout: 300000,
    parallel: false
  }
};

/**
 * Get test suite by name
 */
export function getTestSuite(suiteName: string): TestSuite | undefined {
  return TEST_SUITES[suiteName];
}

/**
 * Get all available test suites
 */
export function getAllSuites(): string[] {
  return Object.keys(TEST_SUITES);
}