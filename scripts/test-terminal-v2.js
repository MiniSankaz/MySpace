#!/usr/bin/env node

/**
 * Test script for Terminal V2 System
 * This script tests the new Terminal V2 implementation
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://127.0.0.1:4000';
const TEST_PROJECT_ID = 'test_project_v2';
const TEST_PROJECT_PATH = '/tmp/test_project_v2';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testCreateSession() {
  console.log(`${colors.cyan}Testing: Create Terminal Session${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/terminal/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      projectId: TEST_PROJECT_ID,
      type: 'system',
      projectPath: TEST_PROJECT_PATH,
      tabName: 'Test Terminal'
    });

    if (response.status === 201 || (response.status === 200 && response.data.sessionId)) {
      console.log(`${colors.green}✓ Session created: ${response.data.sessionId}${colors.reset}`);
      return response.data.sessionId;
    } else {
      console.log(`${colors.red}✗ Failed to create session: ${response.status}${colors.reset}`);
      console.log(response.data);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error creating session: ${error.message}${colors.reset}`);
    return null;
  }
}

async function testListSessions() {
  console.log(`${colors.cyan}Testing: List Terminal Sessions${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: `/api/terminal/list?projectId=${TEST_PROJECT_ID}`,
      method: 'GET',
    });

    if (response.status === 200) {
      const sessions = response.data.sessions || [];
      console.log(`${colors.green}✓ Found ${sessions.length} session(s)${colors.reset}`);
      return sessions;
    } else {
      console.log(`${colors.red}✗ Failed to list sessions: ${response.status}${colors.reset}`);
      return [];
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error listing sessions: ${error.message}${colors.reset}`);
    return [];
  }
}

async function testFocusSession(sessionId) {
  console.log(`${colors.cyan}Testing: Focus Terminal Session${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/terminal/focus',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      projectId: TEST_PROJECT_ID,
      sessionId: sessionId,
    });

    if (response.status === 200) {
      console.log(`${colors.green}✓ Session focused: ${sessionId}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Failed to focus session: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error focusing session: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testHealthCheck() {
  console.log(`${colors.cyan}Testing: Terminal Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/terminal/health',
      method: 'GET',
    });

    if (response.status === 200) {
      console.log(`${colors.green}✓ Health check passed${colors.reset}`);
      if (response.data.statistics) {
        console.log(`  Sessions: ${response.data.statistics.totalSessions}`);
        console.log(`  Active: ${response.data.statistics.activeSessions}`);
        console.log(`  Connected: ${response.data.statistics.connectedSessions}`);
      }
      return true;
    } else {
      console.log(`${colors.red}✗ Health check failed: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error in health check: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCloseSession(sessionId) {
  console.log(`${colors.cyan}Testing: Close Terminal Session${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: `/api/terminal/close/${sessionId}`,
      method: 'DELETE',
    });

    if (response.status === 200) {
      console.log(`${colors.green}✓ Session closed: ${sessionId}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Failed to close session: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error closing session: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCleanup() {
  console.log(`${colors.cyan}Testing: Cleanup Terminal Sessions${colors.reset}`);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/terminal/cleanup',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      projectId: TEST_PROJECT_ID,
    });

    if (response.status === 200) {
      console.log(`${colors.green}✓ Cleanup successful${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Cleanup failed: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error in cleanup: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}    Terminal V2 System Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

  let sessionId = null;
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Health Check
  totalTests++;
  if (await testHealthCheck()) passedTests++;
  console.log();

  // Test 2: Create Session
  totalTests++;
  sessionId = await testCreateSession();
  if (sessionId) passedTests++;
  console.log();

  // Test 3: List Sessions
  totalTests++;
  const sessions = await testListSessions();
  if (sessions.length > 0) passedTests++;
  console.log();

  // Test 4: Focus Session
  if (sessionId) {
    totalTests++;
    if (await testFocusSession(sessionId)) passedTests++;
    console.log();
  }

  // Test 5: Close Session
  if (sessionId) {
    totalTests++;
    if (await testCloseSession(sessionId)) passedTests++;
    console.log();
  }

  // Test 6: Cleanup
  totalTests++;
  if (await testCleanup()) passedTests++;
  console.log();

  // Final Results
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}           Test Results${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const resultColor = percentage === 100 ? colors.green : percentage >= 70 ? colors.yellow : colors.red;
  
  console.log(`${resultColor}Passed: ${passedTests}/${totalTests} (${percentage}%)${colors.reset}`);
  
  if (percentage === 100) {
    console.log(`${colors.green}✓ All tests passed! Terminal V2 is working correctly.${colors.reset}`);
  } else if (percentage >= 70) {
    console.log(`${colors.yellow}⚠ Most tests passed, but some issues detected.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Multiple tests failed. Please check the implementation.${colors.reset}`);
  }
}

// Check if server is running
console.log(`${colors.cyan}Checking if server is running on port 4000...${colors.reset}`);

const checkServer = http.get('http://127.0.0.1:4000/api/health', (res) => {
  if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 301 || res.statusCode === 302) {
    console.log(`${colors.green}✓ Server is running${colors.reset}\n`);
    runTests();
  } else {
    console.log(`${colors.red}✗ Server returned unexpected status: ${res.statusCode}${colors.reset}`);
    process.exit(1);
  }
}).on('error', (err) => {
  console.log(`${colors.red}✗ Server is not running on port 4000${colors.reset}`);
  console.log(`${colors.yellow}Please start the development server with: npm run dev${colors.reset}`);
  process.exit(1);
});