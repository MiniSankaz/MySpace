#!/usr/bin/env node

/**
 * Portfolio Management System - Fixed Test Suite
 * ทดสอบระบบหลังจากแก้ไข Database และ Services (ฉบับปรับปรุง)
 * 
 * Test Coverage:
 * 1. Service Health Checks (ตรวจสอบ services ทุกตัว)
 * 2. Database Connectivity (ผ่าน health endpoints)
 * 3. Authentication Flow (ทดสอบ login และ JWT)
 * 4. User Management APIs (สร้าง test user และทดสอบ CRUD)
 * 5. Integration & Performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Test Configuration
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  services: {
    gateway: 4000,
    user: 4100,
    ai: 4200,
    terminal: 4300,
    workspace: 4400,
    portfolio: 4500
  },
  testUsers: {
    // Use actual seeded users
    admin: { email: 'admin@personalai.com', password: 'admin123' },
    sankaz: { email: 'sankaz@example.com', password: 'Sankaz#3E25167B@2025' }
  },
  // Create a test user for comprehensive testing
  newTestUser: {
    email: 'test-' + Date.now() + '@example.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User'
  }
};

// Test Results Storage
const testResults = {
  services: { passed: 0, failed: 0, tests: [] },
  database: { passed: 0, failed: 0, tests: [] },
  authentication: { passed: 0, failed: 0, tests: [] },
  userManagement: { passed: 0, failed: 0, tests: [] },
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
      timeout: 15000, // เพิ่ม timeout
      validateStatus: () => true,
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

// 1. Service Health Tests
async function testServiceHealth() {
  log('🔌 Starting Service Health Tests...', 'info');
  
  // Test individual services directly
  const serviceTests = [
    { name: 'Gateway', port: 4000, endpoint: '/health' },
    { name: 'User Management', port: 4100, endpoint: '/health' },
    { name: 'AI Assistant', port: 4200, endpoint: '/health' },
    { name: 'Terminal', port: 4300, endpoint: '/health' },
    { name: 'Workspace', port: 4400, endpoint: '/health' },
    { name: 'Portfolio', port: 4500, endpoint: '/health' }
  ];

  for (const service of serviceTests) {
    const url = `http://localhost:${service.port}${service.endpoint}`;
    const { response, responseTime, error } = await makeRequest(url);
    
    if (error) {
      recordTest('services', `${service.name} Direct Health`, false, `Connection Error: ${error.message}`);
    } else if (response.status === 200) {
      const serviceInfo = response.data?.service || service.name.toLowerCase();
      recordTest('services', `${service.name} Direct Health`, true, `Service: ${serviceInfo}`, responseTime);
    } else {
      recordTest('services', `${service.name} Direct Health`, false, `HTTP ${response.status}`, responseTime);
    }
  }

  // Test Gateway aggregated health
  const { response: aggRes, responseTime: aggTime, error: aggError } = 
    await makeRequest(`${CONFIG.baseUrl}/health/all`);
  
  if (aggError) {
    recordTest('services', 'Gateway Health Aggregation', false, `Error: ${aggError.message}`);
  } else if (aggRes.status === 200) {
    const overall = aggRes.data?.overall || {};
    const servicesUp = overall.servicesUp || 0;
    const servicesTotal = overall.servicesTotal || 0;
    recordTest('services', 'Gateway Health Aggregation', true, `${servicesUp}/${servicesTotal} services healthy`, aggTime);
  } else {
    recordTest('services', 'Gateway Health Aggregation', false, `HTTP ${aggRes.status}`, aggTime);
  }
}

// 2. Database Connectivity Tests
async function testDatabaseConnectivity() {
  log('🗄️ Starting Database Connectivity Tests...', 'info');
  
  // Test through User Management service health (includes DB status)
  const { response: userHealthRes, responseTime: userHealthTime, error: userHealthError } = 
    await makeRequest('http://localhost:4100/health');
  
  if (userHealthError) {
    recordTest('database', 'User Service DB Health', false, `Error: ${userHealthError.message}`);
  } else if (userHealthRes.status === 200 && userHealthRes.data?.database?.status === 'connected') {
    recordTest('database', 'User Service DB Health', true, 'Database connected via User service', userHealthTime);
  } else {
    recordTest('database', 'User Service DB Health', false, 'Database not connected', userHealthTime);
  }

  // Test through Portfolio service health
  const { response: portfolioHealthRes, responseTime: portfolioHealthTime, error: portfolioHealthError } = 
    await makeRequest('http://localhost:4500/health');
  
  if (portfolioHealthError) {
    recordTest('database', 'Portfolio Service DB Health', false, `Error: ${portfolioHealthError.message}`);
  } else if (portfolioHealthRes.status === 200 && portfolioHealthRes.data?.database?.status === 'connected') {
    recordTest('database', 'Portfolio Service DB Health', true, 'Database connected via Portfolio service', portfolioHealthTime);
  } else {
    recordTest('database', 'Portfolio Service DB Health', false, 'Database not connected', portfolioHealthTime);
  }
}

// 3. Authentication Flow Tests
async function testAuthenticationFlow() {
  log('🔐 Starting Authentication Flow Tests...', 'info');
  
  // Test login with seeded users (direct to User Management service)
  for (const [userType, credentials] of Object.entries(CONFIG.testUsers)) {
    const { response: loginRes, responseTime: loginTime, error: loginError } = 
      await makeRequest(`http://localhost:4100/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: credentials
      });
    
    if (loginError) {
      recordTest('authentication', `${userType} Login`, false, `Error: ${loginError.message}`);
      continue;
    }

    if (loginRes.status === 200 && loginRes.data?.success && loginRes.data?.data?.tokens?.accessToken) {
      const token = loginRes.data.data.tokens.accessToken;
      const user = loginRes.data.data.user;
      recordTest('authentication', `${userType} Login`, true, `User: ${user.email}`, loginTime);
      
      // Test token validation with profile endpoint
      const { response: profileRes, responseTime: profileTime, error: profileError } = 
        await makeRequest(`http://localhost:4100/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      if (profileError) {
        recordTest('authentication', `${userType} Token Validation`, false, `Error: ${profileError.message}`);
      } else if (profileRes.status === 200 && profileRes.data?.success) {
        const profileUser = profileRes.data.data.user;
        recordTest('authentication', `${userType} Token Validation`, true, `Profile: ${profileUser.email}`, profileTime);
      } else {
        recordTest('authentication', `${userType} Token Validation`, false, `HTTP ${profileRes.status}`, profileTime);
      }
      
      // Store token for later tests
      if (userType === 'admin') {
        CONFIG.adminToken = token;
      }
      
    } else {
      const errorMsg = loginRes.data?.error || `HTTP ${loginRes.status}`;
      recordTest('authentication', `${userType} Login`, false, errorMsg, loginTime);
    }
  }
}

// 4. User Management Tests
async function testUserManagement() {
  log('👥 Starting User Management Tests...', 'info');
  
  if (!CONFIG.adminToken) {
    recordTest('userManagement', 'Admin Token Required', false, 'No admin token available for user management tests');
    return;
  }

  const authHeaders = { 'Authorization': `Bearer ${CONFIG.adminToken}` };

  // Test user count (requires admin token)
  const { response: countRes, responseTime: countTime, error: countError } = 
    await makeRequest(`http://localhost:4100/users/count`, {
      headers: authHeaders
    });
  
  if (countError) {
    recordTest('userManagement', 'Get User Count', false, `Error: ${countError.message}`);
  } else if (countRes.status === 200 && countRes.data?.success) {
    const count = countRes.data.data.count;
    recordTest('userManagement', 'Get User Count', true, `Found ${count} users`, countTime);
  } else {
    recordTest('userManagement', 'Get User Count', false, `HTTP ${countRes.status}`, countTime);
  }

  // Test user registration
  const { response: registerRes, responseTime: registerTime, error: registerError } = 
    await makeRequest(`http://localhost:4100/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: CONFIG.newTestUser
    });
  
  if (registerError) {
    recordTest('userManagement', 'User Registration', false, `Error: ${registerError.message}`);
  } else if (registerRes.status === 201 && registerRes.data?.success) {
    const newUser = registerRes.data.data.user;
    recordTest('userManagement', 'User Registration', true, `Created: ${newUser.email}`, registerTime);
    CONFIG.newUserId = newUser.id;
  } else {
    const errorMsg = registerRes.data?.error || `HTTP ${registerRes.status}`;
    recordTest('userManagement', 'User Registration', false, errorMsg, registerTime);
  }

  // Test get user by email (if we have admin token)
  const testEmail = 'admin@personalai.com';
  const { response: emailRes, responseTime: emailTime, error: emailError } = 
    await makeRequest(`http://localhost:4100/users/by-email/${testEmail}`, {
      headers: authHeaders
    });
  
  if (emailError) {
    recordTest('userManagement', 'Get User by Email', false, `Error: ${emailError.message}`);
  } else if (emailRes.status === 200 && emailRes.data?.success) {
    const foundUser = emailRes.data.data.user;
    recordTest('userManagement', 'Get User by Email', true, `Found: ${foundUser.email}`, emailTime);
  } else {
    recordTest('userManagement', 'Get User by Email', false, `HTTP ${emailRes.status}`, emailTime);
  }
}

// 5. Integration Tests
async function testIntegration() {
  log('🔗 Starting Integration Tests...', 'info');
  
  if (!CONFIG.adminToken) {
    recordTest('integration', 'Admin Token Required', false, 'No admin token for integration tests');
    return;
  }

  const authHeaders = { 'Authorization': `Bearer ${CONFIG.adminToken}` };

  // Test Portfolio API
  const { response: portfolioRes, responseTime: portfolioTime, error: portfolioError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/portfolios`, {
      headers: authHeaders
    });
  
  if (portfolioError) {
    recordTest('integration', 'Portfolio API', false, `Error: ${portfolioError.message}`);
  } else if (portfolioRes.status === 200 || portfolioRes.status === 404) {
    // 404 is OK for empty portfolios
    const msg = portfolioRes.status === 200 ? 'Portfolio API accessible' : 'Portfolio API accessible (empty)';
    recordTest('integration', 'Portfolio API', true, msg, portfolioTime);
  } else {
    recordTest('integration', 'Portfolio API', false, `HTTP ${portfolioRes.status}`, portfolioTime);
  }

  // Test AI Assistant info
  const { response: aiInfoRes, responseTime: aiInfoTime, error: aiInfoError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/assistant/info`);
  
  if (aiInfoError) {
    recordTest('integration', 'AI Assistant Info', false, `Error: ${aiInfoError.message}`);
  } else if (aiInfoRes.status === 200) {
    recordTest('integration', 'AI Assistant Info', true, 'AI service info accessible', aiInfoTime);
  } else {
    recordTest('integration', 'AI Assistant Info', false, `HTTP ${aiInfoRes.status}`, aiInfoTime);
  }

  // Test Terminal health
  const { response: terminalRes, responseTime: terminalTime, error: terminalError } = 
    await makeRequest(`${CONFIG.baseUrl}/api/v1/terminal/health`);
  
  if (terminalError) {
    recordTest('integration', 'Terminal Health', false, `Error: ${terminalError.message}`);
  } else if (terminalRes.status === 200) {
    recordTest('integration', 'Terminal Health', true, 'Terminal service accessible', terminalTime);
  } else {
    recordTest('integration', 'Terminal Health', false, `HTTP ${terminalRes.status}`, terminalTime);
  }
}

// 6. Performance Tests
async function testPerformance() {
  log('⚡ Starting Performance Tests...', 'info');
  
  const performanceTests = [
    { endpoint: '/health', threshold: 100, name: 'Gateway Health Response' },
    { endpoint: '/health/all', threshold: 1000, name: 'All Services Health' }
  ];
  
  for (const test of performanceTests) {
    const { response, responseTime, error } = 
      await makeRequest(`${CONFIG.baseUrl}${test.endpoint}`);
    
    if (error) {
      recordTest('performance', test.name, false, `Error: ${error.message}`, responseTime);
    } else {
      const withinThreshold = responseTime <= test.threshold;
      const status = response.status >= 200 && response.status < 300;
      const passed = withinThreshold && status;
      const details = `${Math.round(responseTime)}ms (threshold: ${test.threshold}ms)`;
      recordTest('performance', test.name, passed, details, responseTime);
    }
  }

  // Test concurrent health checks
  const concurrentCount = 3;
  const startTime = performance.now();
  
  try {
    const promises = Array(concurrentCount).fill().map(() => 
      makeRequest(`${CONFIG.baseUrl}/health`)
    );
    
    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / concurrentCount;
    const successCount = results.filter(r => r.response?.status === 200).length;
    
    const passed = successCount === concurrentCount && avgTime < 500;
    recordTest('performance', 'Concurrent Health Checks', passed, 
      `${successCount}/${concurrentCount} successful, avg: ${Math.round(avgTime)}ms`, totalTime);
      
  } catch (error) {
    recordTest('performance', 'Concurrent Health Checks', false, `Error: ${error.message}`);
  }
}

// Test Report Generation
function generateTestReport() {
  log('📊 Generating Test Report...', 'info');
  
  const totalTests = Object.values(testResults).reduce((sum, category) => 
    typeof category === 'object' && category.passed !== undefined ? sum + category.passed + category.failed : sum, 0);
  const totalPassed = Object.values(testResults).reduce((sum, category) => 
    typeof category === 'object' && category.passed !== undefined ? sum + category.passed : sum, 0);
  const totalFailed = Object.values(testResults).reduce((sum, category) => 
    typeof category === 'object' && category.failed !== undefined ? sum + category.failed : sum, 0);
  
  const report = {
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      totalTime: Math.round(testResults.totalTime),
      timestamp: new Date().toISOString(),
      testEnvironment: {
        baseUrl: CONFIG.baseUrl,
        services: Object.keys(CONFIG.services).length,
        nodeVersion: process.version
      }
    },
    categories: Object.fromEntries(
      Object.entries(testResults).filter(([key]) => key !== 'totalTime')
    ),
    recommendations: []
  };

  // Add recommendations
  if (testResults.services.failed > 0) {
    report.recommendations.push('🔴 Service failures detected - check microservice logs and restart failed services');
  }
  if (testResults.database.failed > 0) {
    report.recommendations.push('🔴 Database connectivity issues - verify PostgreSQL connection and Prisma setup');
  }
  if (testResults.authentication.failed > 0) {
    report.recommendations.push('🔴 Authentication problems - check JWT secret, user credentials, and token validation');
  }
  if (testResults.userManagement.failed > 0) {
    report.recommendations.push('🟡 User management issues - verify admin permissions and database schema');
  }
  if (testResults.integration.failed > 0) {
    report.recommendations.push('🟡 Integration issues - check API routing and service communication');
  }
  if (testResults.performance.failed > 0) {
    report.recommendations.push('🟡 Performance issues - optimize slow endpoints and consider caching');
  }
  if (totalPassed === totalTests && totalTests > 0) {
    report.recommendations.push('✅ All tests passed - Portfolio Management System is functioning correctly');
  }

  return report;
}

// Display Results
function displayResults(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 PORTFOLIO MANAGEMENT SYSTEM - COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n📊 EXECUTIVE SUMMARY:`);
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   ✅ Passed: ${report.summary.totalPassed}`);
  console.log(`   ❌ Failed: ${report.summary.totalFailed}`);
  console.log(`   📈 Success Rate: ${report.summary.successRate}%`);
  console.log(`   ⏱️  Total Time: ${report.summary.totalTime}ms`);
  console.log(`   🌐 Base URL: ${report.summary.testEnvironment.baseUrl}`);
  console.log(`   🔧 Node Version: ${report.summary.testEnvironment.nodeVersion}`);
  
  console.log(`\n📋 DETAILED RESULTS BY CATEGORY:`);
  
  for (const [categoryName, category] of Object.entries(report.categories)) {
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
    console.log(`\n💡 RECOMMENDATIONS & NEXT STEPS:`);
    for (const rec of report.recommendations) {
      console.log(`   ${rec}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main Test Function
async function runAllTests() {
  const startTime = performance.now();
  
  log('🚀 Starting Portfolio Management System Tests (Fixed Version)...', 'info');
  log(`📍 Testing against: ${CONFIG.baseUrl}`, 'info');
  
  try {
    await testServiceHealth();
    await testDatabaseConnectivity();
    await testAuthenticationFlow();
    await testUserManagement();
    await testIntegration();
    await testPerformance();
    
    testResults.totalTime = performance.now() - startTime;
    
    const report = generateTestReport();
    displayResults(report);
    
    // Save report
    const fs = require('fs');
    const reportPath = `./PORTFOLIO_TEST_REPORT_FIXED_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Detailed test report saved to: ${reportPath}`, 'success');
    
    // Final assessment
    const successRate = report.summary.successRate;
    if (successRate >= 90) {
      log('🎉 System Status: EXCELLENT - Ready for production use', 'success');
    } else if (successRate >= 75) {
      log('✅ System Status: GOOD - Minor issues to address', 'success');
    } else if (successRate >= 50) {
      log('⚠️ System Status: FAIR - Several issues need attention', 'warning');
    } else {
      log('🚨 System Status: POOR - Critical issues require immediate attention', 'error');
    }
    
    process.exit(report.summary.totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`💥 Test execution failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, CONFIG, testResults };