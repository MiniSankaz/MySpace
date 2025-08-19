#!/usr/bin/env node

/**
 * Portfolio Management System - Comprehensive Test Suite
 * ทดสอบระบบหลังจากแก้ไข Database และ Services
 * 
 * Test Coverage:
 * 1. Database Connection & User Table
 * 2. Authentication Flow & JWT
 * 3. API Services Health Checks
 * 4. Integration Testing
 * 5. Performance Testing
 */

const axios = require('axios');
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();
const { performance } = require('perf_hooks');

// Test Configuration
const CONFIG = {
  baseUrl: 'http://${getGatewayPort()}',
  services: {
    gateway: 4000,
    user: 4100,
    ai: 4200,
    terminal: 4300,
    workspace: 4400,
    portfolio: 4500
  },
  testUsers: {
    admin: { email: 'admin@personalai.com', password: 'admin123' },
    sankaz: { email: 'sankaz@example.com', password: 'Sankaz#3E25167B@2025' }
  }
};

// Test Results Storage
const testResults = {
  database: { passed: 0, failed: 0, tests: [] },
  authentication: { passed: 0, failed: 0, tests: [] },
  services: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] },
  performance: { passed: 0, failed: 0, tests: [] },
  totalTime: 0
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warning: '\x1b[33m', // yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function recordTest(category, testName, passed, details = '', responseTime = 0) {
  const test = {
    name: testName,
    passed,
    details,
    responseTime: Math.round(responseTime),
    timestamp: new Date().toISOString()
  };
  
  testResults[category].tests.push(test);
  if (passed) {
    testResults[category].passed++;
    log(`✅ ${testName} - ${details} (${responseTime}ms)`, 'success');
  } else {
    testResults[category].failed++;
    log(`❌ ${testName} - ${details}`, 'error');
  }
}

async function makeRequest(url, options = {}) {
  const startTime = performance.now();
  try {
    const response = await axios({
      timeout: 10000,
      validateStatus: () => true, // Accept all status codes
      ...options,
      url
    });
    const responseTime = performance.now() - startTime;
    return { response, responseTime, error: null };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return { response: null, responseTime, error };
  }
}

// Test Categories

// 1. Database Connection Tests
async function testDatabaseConnection() {
  log('🔍 Starting Database Connection Tests...', 'info');
  
  // Test 1: Health Check Database
  const { response: healthRes, responseTime: healthTime, error: healthError } = 
    await makeRequest(`${CONFIG.baseUrl}/health/database`);
  
  if (healthError) {
    recordTest('database', 'Database Health Check', false, `Connection Error: ${healthError.message}`);
  } else if (healthRes.status === 200) {
    recordTest('database', 'Database Health Check', true, 'Database accessible', healthTime);
  } else {
    recordTest('database', 'Database Health Check', false, `HTTP ${healthRes.status}`, healthTime);
  }

  // Test 2: Direct Database Check (bypassing authentication for testing)
  const { response: directDbRes, responseTime: directDbTime, error: directDbError } = 
    await makeRequest(`${CONFIG.baseUrl}/health/database`);
  
  if (directDbError) {
    recordTest('database', 'Direct Database Check', false, `Connection Error: ${directDbError.message}`);
  } else if (directDbRes.status === 200) {
    recordTest('database', 'Direct Database Check', true, 'Database accessible via health endpoint', directDbTime);
  } else {
    recordTest('database', 'Direct Database Check', false, `HTTP ${directDbRes.status}`, directDbTime);
  }
}

// 2. Authentication Flow Tests
async function testAuthenticationFlow() {
  log('🔐 Starting Authentication Flow Tests...', 'info');
  
  for (const [userType, credentials] of Object.entries(CONFIG.testUsers)) {
    // Test Login
    const { response: loginRes, responseTime: loginTime, error: loginError } = 
      await makeRequest(`${CONFIG.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: credentials
      });
    
    if (loginError) {
      recordTest('authentication', `${userType} Login`, false, `Login Error: ${loginError.message}`);
      continue;
    }

    if (loginRes.status === 200 && loginRes.data?.token) {
      const token = loginRes.data.token;
      recordTest('authentication', `${userType} Login`, true, 'Login successful, token received', loginTime);
      
      // Test Token Validation
      const { response: profileRes, responseTime: profileTime, error: profileError } = 
        await makeRequest(`${CONFIG.baseUrl}/api/v1/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      if (profileError) {
        recordTest('authentication', `${userType} Token Validation`, false, `Profile Error: ${profileError.message}`);
      } else if (profileRes.status === 200) {
        const userEmail = profileRes.data?.email || 'unknown';
        recordTest('authentication', `${userType} Token Validation`, true, `Profile retrieved: ${userEmail}`, profileTime);
      } else {
        recordTest('authentication', `${userType} Token Validation`, false, `HTTP ${profileRes.status}`, profileTime);
      }
      
    } else {
      const errorMsg = loginRes.data?.message || `HTTP ${loginRes.status}`;
      recordTest('authentication', `${userType} Login`, false, errorMsg, loginTime);
    }
  }
}

// 3. API Services Health Checks
async function testAPIServices() {
  log('🔌 Starting API Services Tests...', 'info');
  
  // Test Gateway Health
  const { response: gatewayRes, responseTime: gatewayTime, error: gatewayError } = 
    await makeRequest(`${CONFIG.baseUrl}/health`);
  
  if (gatewayError) {
    recordTest('services', 'Gateway Health', false, `Connection Error: ${gatewayError.message}`);
  } else if (gatewayRes.status === 200) {
    recordTest('services', 'Gateway Health', true, 'Gateway responding', gatewayTime);
  } else {
    recordTest('services', 'Gateway Health', false, `HTTP ${gatewayRes.status}`, gatewayTime);
  }

  // Test All Services Health
  const { response: allHealthRes, responseTime: allHealthTime, error: allHealthError } = 
    await makeRequest(`${CONFIG.baseUrl}/health/all`);
  
  if (allHealthError) {
    recordTest('services', 'All Services Health', false, `Connection Error: ${allHealthError.message}`);
  } else if (allHealthRes.status === 200) {
    const services = allHealthRes.data?.services || {};
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(services).length;
    recordTest('services', 'All Services Health', true, `${healthyCount}/${totalCount} services healthy`, allHealthTime);
    
    // Test Individual Services
    for (const [serviceName, serviceInfo] of Object.entries(services)) {
      const isHealthy = serviceInfo.status === 'healthy';
      const details = isHealthy ? `Port ${serviceInfo.port}` : serviceInfo.error || 'Unknown error';
      recordTest('services', `${serviceName} Service`, isHealthy, details, serviceInfo.responseTime || 0);
    }
  } else {
    recordTest('services', 'All Services Health', false, `HTTP ${allHealthRes.status}`, allHealthTime);
  }

  // Test Service Discovery
  const { response: discoveryRes, responseTime: discoveryTime, error: discoveryError } = 
    await makeRequest(`${CONFIG.baseUrl}/services`);
  
  if (discoveryError) {
    recordTest('services', 'Service Discovery', false, `Connection Error: ${discoveryError.message}`);
  } else if (discoveryRes.status === 200) {
    const services = discoveryRes.data?.services || [];
    recordTest('services', 'Service Discovery', true, `${services.length} services registered`, discoveryTime);
  } else {
    recordTest('services', 'Service Discovery', false, `HTTP ${discoveryRes.status}`, discoveryTime);
  }
}

// 4. Integration Testing
async function testIntegration() {
  log('🔗 Starting Integration Tests...', 'info');
  
  // Login and get token for integration tests
  const { response: loginRes } = await makeRequest(`${CONFIG.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: CONFIG.testUsers.admin
  });
  
  if (loginRes?.status !== 200 || !loginRes.data?.token) {
    recordTest('integration', 'Authentication Setup', false, 'Cannot get auth token for integration tests');
    return;
  }
  
  const token = loginRes.data.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };
  
  recordTest('integration', 'Authentication Setup', true, 'Auth token obtained for integration tests');

  // Test Portfolio API Integration
  const { response: portfolioRes, responseTime: portfolioTime, error: portfolioError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/portfolios`, {
      headers: authHeaders
    });
  
  if (portfolioError) {
    recordTest('integration', 'Portfolio API', false, `Portfolio Error: ${portfolioError.message}`);
  } else if (portfolioRes.status === 200) {
    const portfolios = portfolioRes.data?.portfolios || [];
    recordTest('integration', 'Portfolio API', true, `Retrieved ${portfolios.length} portfolios`, portfolioTime);
  } else {
    recordTest('integration', 'Portfolio API', false, `HTTP ${portfolioRes.status}`, portfolioTime);
  }

  // Test User Management Integration
  const { response: userProfileRes, responseTime: userProfileTime, error: userProfileError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/users/profile`, {
      headers: authHeaders
    });
  
  if (userProfileError) {
    recordTest('integration', 'User Profile API', false, `Profile Error: ${userProfileError.message}`);
  } else if (userProfileRes.status === 200) {
    const userEmail = userProfileRes.data?.email || 'unknown';
    recordTest('integration', 'User Profile API', true, `Profile loaded: ${userEmail}`, userProfileTime);
  } else {
    recordTest('integration', 'User Profile API', false, `HTTP ${userProfileRes.status}`, userProfileTime);
  }

  // Test Terminal Service Integration
  const { response: terminalRes, responseTime: terminalTime, error: terminalError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/terminal/health`, {
      headers: authHeaders
    });
  
  if (terminalError) {
    recordTest('integration', 'Terminal Service', false, `Terminal Error: ${terminalError.message}`);
  } else if (terminalRes.status === 200) {
    recordTest('integration', 'Terminal Service', true, 'Terminal service accessible', terminalTime);
  } else {
    recordTest('integration', 'Terminal Service', false, `HTTP ${terminalRes.status}`, terminalTime);
  }
}

// 5. Performance Testing
async function testPerformance() {
  log('⚡ Starting Performance Tests...', 'info');
  
  // Test Response Time Thresholds
  const performanceTests = [
    { endpoint: '/health', threshold: 100, name: 'Gateway Health' },
    { endpoint: '/health/all', threshold: 500, name: 'All Services Health' },
    { endpoint: '/api/v1/auth/login', threshold: 1000, name: 'Authentication', method: 'POST', data: CONFIG.testUsers.admin }
  ];
  
  for (const test of performanceTests) {
    const requestOptions = {
      method: test.method || 'GET',
      headers: test.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      data: test.data || undefined
    };
    
    const { response, responseTime, error } = 
      await makeRequest(`${CONFIG.baseUrl}${test.endpoint}`, requestOptions);
    
    if (error) {
      recordTest('performance', test.name, false, `Error: ${error.message}`, responseTime);
    } else {
      const withinThreshold = responseTime <= test.threshold;
      const status = response.status >= 200 && response.status < 300;
      const passed = withinThreshold && status;
      const details = `${responseTime}ms (threshold: ${test.threshold}ms)`;
      recordTest('performance', test.name, passed, details, responseTime);
    }
  }

  // Test Concurrent Requests
  const concurrentCount = 5;
  const startTime = performance.now();
  
  try {
    const promises = Array(concurrentCount).fill().map(() => 
      makeRequest(`${CONFIG.baseUrl}/health`)
    );
    
    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / concurrentCount;
    const successCount = results.filter(r => r.response?.status === 200).length;
    
    const passed = successCount === concurrentCount && avgTime < 200;
    recordTest('performance', 'Concurrent Requests', passed, 
      `${successCount}/${concurrentCount} successful, avg: ${Math.round(avgTime)}ms`, totalTime);
      
  } catch (error) {
    recordTest('performance', 'Concurrent Requests', false, `Error: ${error.message}`);
  }
}

// Test Report Generation
function generateTestReport() {
  log('📊 Generating Test Report...', 'info');
  
  const totalTests = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed + category.failed, 0);
  const totalPassed = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, category) => 
    sum + category.failed, 0);
  
  const report = {
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: Math.round((totalPassed / totalTests) * 100),
      totalTime: Math.round(testResults.totalTime),
      timestamp: new Date().toISOString()
    },
    categories: testResults,
    recommendations: []
  };

  // Add recommendations based on test results
  if (testResults.database.failed > 0) {
    report.recommendations.push('🔴 Database issues detected - check connection and table structure');
  }
  if (testResults.authentication.failed > 0) {
    report.recommendations.push('🔴 Authentication problems - verify user credentials and JWT configuration');
  }
  if (testResults.services.failed > 0) {
    report.recommendations.push('🔴 Service failures detected - check microservice health and connectivity');
  }
  if (testResults.performance.failed > 0) {
    report.recommendations.push('🟡 Performance issues - optimize slow endpoints and database queries');
  }
  if (totalPassed === totalTests) {
    report.recommendations.push('✅ All tests passed - system is functioning correctly');
  }

  return report;
}

// Display Results
function displayResults(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 PORTFOLIO MANAGEMENT SYSTEM - TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   ✅ Passed: ${report.summary.totalPassed}`);
  console.log(`   ❌ Failed: ${report.summary.totalFailed}`);
  console.log(`   📈 Success Rate: ${report.summary.successRate}%`);
  console.log(`   ⏱️  Total Time: ${report.summary.totalTime}ms`);
  
  console.log(`\n📋 DETAILED RESULTS:`);
  
  for (const [categoryName, category] of Object.entries(report.categories)) {
    if (categoryName === 'totalTime') continue;
    
    const categoryTitle = categoryName.toUpperCase().replace(/([A-Z])/g, ' $1').trim();
    console.log(`\n   ${categoryTitle}:`);
    console.log(`   ✅ Passed: ${category.passed} | ❌ Failed: ${category.failed}`);
    
    if (category.tests.length > 0) {
      for (const test of category.tests) {
        const status = test.passed ? '✅' : '❌';
        const time = test.responseTime ? ` (${test.responseTime}ms)` : '';
        console.log(`      ${status} ${test.name}: ${test.details}${time}`);
      }
    }
  }
  
  if (report.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS:`);
    for (const rec of report.recommendations) {
      console.log(`   ${rec}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main Test Function
async function runAllTests() {
  const startTime = performance.now();
  
  log('🚀 Starting Portfolio Management System Tests...', 'info');
  log(`📍 Testing against: ${CONFIG.baseUrl}`, 'info');
  
  try {
    await testDatabaseConnection();
    await testAuthenticationFlow();
    await testAPIServices();
    await testIntegration();
    await testPerformance();
    
    testResults.totalTime = performance.now() - startTime;
    
    const report = generateTestReport();
    displayResults(report);
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `./PORTFOLIO_TEST_REPORT_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Test report saved to: ${reportPath}`, 'success');
    
    // Exit with appropriate code
    process.exit(report.summary.totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`💥 Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, CONFIG, testResults };