#!/usr/bin/env node

/**
 * Comprehensive Port Refactoring Health Test Suite
 * 
 * This script tests all services on their new port configuration (4100-4170)
 * and verifies inter-service communication through the gateway.
 * 
 * @version 3.0.0
 * @date 2025-08-19
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Port configuration based on the new architecture
const PORTS = {
  frontend: 4100,
  gateway: 4110,
  services: {
    userManagement: 4120,
    aiAssistant: 4130,
    terminal: 4140,
    workspace: 4150,
    portfolio: 4160,
    marketData: 4170
  }
};

// Test configuration
const TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

class PortRefactoringTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      services: {},
      gateway: {},
      interServiceCommunication: {},
      performance: {}
    };
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(url, options = {}) {
    const startTime = performance.now();
    try {
      const response = await axios({
        url,
        timeout: TIMEOUT,
        validateStatus: () => true, // Don't throw on non-2xx status
        ...options
      });
      const responseTime = Math.round(performance.now() - startTime);
      return { response, responseTime, error: null };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      return { response: null, responseTime, error };
    }
  }

  async testServiceHealth(serviceName, port, expectedPath = '/health') {
    const url = `http://localhost:${port}${expectedPath}`;
    console.log(`🔍 Testing ${serviceName} on port ${port}...`);

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { response, responseTime, error } = await this.makeRequest(url);
      
      if (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          console.log(`   ⏳ Retry ${attempt}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);
          await this.sleep(RETRY_DELAY);
          continue;
        }
      } else {
        const isHealthy = response.status >= 200 && response.status < 300;
        const status = isHealthy ? 'PASS' : 
                     response.status < 500 ? 'WARN' : 'FAIL';
        
        this.results.services[serviceName] = {
          port,
          status: status,
          httpStatus: response.status,
          responseTime,
          url,
          attempt,
          data: response.data
        };

        console.log(`   ${this.getStatusIcon(status)} ${serviceName}: ${response.status} (${responseTime}ms)`);
        return { success: isHealthy, status, response, responseTime };
      }
    }

    // All retries failed
    this.results.services[serviceName] = {
      port,
      status: 'FAIL',
      httpStatus: null,
      responseTime: null,
      url,
      error: lastError.message
    };
    
    console.log(`   ❌ ${serviceName}: ${lastError.message}`);
    return { success: false, status: 'FAIL', error: lastError };
  }

  async testGatewayHealth() {
    console.log('\n📊 Testing Gateway Health Aggregation...');
    
    const { response, responseTime, error } = await this.makeRequest(
      `http://localhost:${PORTS.gateway}/health/all`
    );

    if (error) {
      this.results.gateway.healthAll = {
        status: 'FAIL',
        error: error.message
      };
      console.log(`   ❌ Gateway health aggregation: ${error.message}`);
      return false;
    }

    const isSuccess = response.status === 200;
    this.results.gateway.healthAll = {
      status: isSuccess ? 'PASS' : 'FAIL',
      httpStatus: response.status,
      responseTime,
      data: response.data
    };

    console.log(`   ${this.getStatusIcon(isSuccess ? 'PASS' : 'FAIL')} Gateway health aggregation: ${response.status} (${responseTime}ms)`);
    
    if (response.data && response.data.services) {
      console.log('\n   📋 Service Status Summary:');
      Object.entries(response.data.services).forEach(([name, info]) => {
        console.log(`      ${this.getStatusIcon(info.status === 'OK' ? 'PASS' : 'FAIL')} ${name}: ${info.status}`);
      });
    }

    return isSuccess;
  }

  async testServiceDiscovery() {
    console.log('\n🔍 Testing Service Discovery...');
    
    const { response, responseTime, error } = await this.makeRequest(
      `http://localhost:${PORTS.gateway}/services`
    );

    if (error) {
      this.results.gateway.serviceDiscovery = {
        status: 'FAIL',
        error: error.message
      };
      console.log(`   ❌ Service discovery: ${error.message}`);
      return false;
    }

    const isSuccess = response.status === 200;
    this.results.gateway.serviceDiscovery = {
      status: isSuccess ? 'PASS' : 'FAIL',
      httpStatus: response.status,
      responseTime,
      data: response.data
    };

    console.log(`   ${this.getStatusIcon(isSuccess ? 'PASS' : 'FAIL')} Service discovery: ${response.status} (${responseTime}ms)`);
    
    if (response.data && response.data.data) {
      console.log('\n   📋 Discovered Services:');
      Object.entries(response.data.data).forEach(([name, info]) => {
        console.log(`      ${name}: ${info.healthy}/${info.instances} healthy instances`);
      });
    }

    return isSuccess;
  }

  async testInterServiceCommunication() {
    console.log('\n🔗 Testing Inter-Service Communication...');
    
    // Test gateway routing to each service
    const gatewayRoutes = {
      'user-management': '/api/v1/users/health',
      'ai-assistant': '/api/v1/chat/health', 
      'terminal': '/api/v1/terminal/health',
      'workspace': '/api/v1/workspace/health',
      'portfolio': '/api/v1/portfolios/health',
      'market-data': '/api/v1/market/health'
    };

    for (const [serviceName, route] of Object.entries(gatewayRoutes)) {
      const url = `http://localhost:${PORTS.gateway}${route}`;
      const { response, responseTime, error } = await this.makeRequest(url);
      
      const testResult = {
        url,
        responseTime,
        status: error ? 'FAIL' : (response.status < 300 ? 'PASS' : 'WARN'),
        httpStatus: response?.status,
        error: error?.message
      };

      this.results.interServiceCommunication[serviceName] = testResult;
      
      console.log(`   ${this.getStatusIcon(testResult.status)} ${serviceName} via gateway: ${testResult.httpStatus || 'ERROR'} (${responseTime || 0}ms)`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance Benchmarks...');
    
    const performanceTests = [
      { name: 'Gateway Health', url: `http://localhost:${PORTS.gateway}/health` },
      { name: 'Service Discovery', url: `http://localhost:${PORTS.gateway}/services` },
      { name: 'Health Aggregation', url: `http://localhost:${PORTS.gateway}/health/all` }
    ];

    for (const test of performanceTests) {
      const iterations = 5;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const { responseTime } = await this.makeRequest(test.url);
        if (responseTime) times.push(responseTime);
      }
      
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        this.results.performance[test.name] = {
          average: Math.round(avg),
          min,
          max,
          samples: iterations
        };
        
        console.log(`   📊 ${test.name}: avg ${Math.round(avg)}ms (min: ${min}ms, max: ${max}ms)`);
      }
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARN': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  calculateSummary() {
    const allTests = [
      ...Object.values(this.results.services),
      ...Object.values(this.results.gateway),
      ...Object.values(this.results.interServiceCommunication)
    ];

    this.results.summary.total = allTests.length;
    this.results.summary.passed = allTests.filter(t => t.status === 'PASS').length;
    this.results.summary.warnings = allTests.filter(t => t.status === 'WARN').length;
    this.results.summary.failed = allTests.filter(t => t.status === 'FAIL').length;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PORT REFACTORING TEST SUMMARY');
    console.log('='.repeat(60));
    
    const { summary } = this.results;
    console.log(`📈 Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`❌ Failed: ${summary.failed}`);
    
    const successRate = (summary.passed / summary.total * 100).toFixed(1);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (summary.failed === 0 && summary.warnings === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Port refactoring is successful.');
    } else if (summary.failed === 0) {
      console.log('\n⚠️  Tests completed with warnings. Review service status.');
    } else {
      console.log('\n❌ Some tests failed. Port refactoring needs attention.');
    }
    
    console.log(`\n📝 Detailed results saved to: port-refactoring-test-results.json`);
  }

  async saveResults() {
    const fs = require('fs').promises;
    await fs.writeFile(
      'port-refactoring-test-results.json',
      JSON.stringify(this.results, null, 2)
    );
  }

  async runAllTests() {
    console.log('🚀 Starting Port Refactoring Health Test Suite');
    console.log('=' .repeat(60));
    
    // Test individual services
    console.log('\n🔍 Testing Individual Service Health...');
    await this.testServiceHealth('gateway', PORTS.gateway);
    await this.testServiceHealth('user-management', PORTS.services.userManagement);
    await this.testServiceHealth('ai-assistant', PORTS.services.aiAssistant);
    await this.testServiceHealth('terminal', PORTS.services.terminal);
    await this.testServiceHealth('workspace', PORTS.services.workspace);
    await this.testServiceHealth('portfolio', PORTS.services.portfolio);
    await this.testServiceHealth('market-data', PORTS.services.marketData);
    
    // Test gateway functionality
    await this.testGatewayHealth();
    await this.testServiceDiscovery();
    
    // Test inter-service communication
    await this.testInterServiceCommunication();
    
    // Performance benchmarks
    await this.testPerformance();
    
    // Calculate and display results
    this.calculateSummary();
    this.printSummary();
    await this.saveResults();
    
    return this.results.summary.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PortRefactoringTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = PortRefactoringTester;