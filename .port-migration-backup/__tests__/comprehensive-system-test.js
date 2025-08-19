#!/usr/bin/env node

/**
 * Portfolio Management System - Comprehensive Testing Script
 * ทดสอบระบบ Portfolio Management System ทั้งหมด
 * 
 * Test Coverage:
 * 1. Services Health Check
 * 2. Authentication Flow
 * 3. Portfolio API Testing
 * 4. WebSocket Connections
 * 5. Error Handling
 * 6. Performance Metrics
 */

const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class PortfolioSystemTester {
    constructor() {
        this.baseUrl = 'http://localhost:4000';
        this.frontendUrl = 'http://localhost:3000';
        this.results = {
            services: {},
            authentication: {},
            portfolio: {},
            websocket: {},
            performance: {},
            errors: []
        };
        this.testAccounts = [
            { email: 'portfolio@user.com', password: 'Portfolio@2025' },
            { email: 'admin@portfolio.com', password: 'Admin@2025' },
            { email: 'demo@portfolio.com', password: 'Demo@2025' }
        ];
        this.authTokens = {};
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'perf': '⚡'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async makeRequest(url, options = {}) {
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            const client = url.startsWith('https') ? https : http;
            const req = client.request(url, requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const endTime = performance.now();
                    const responseTime = endTime - startTime;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: jsonData,
                            responseTime,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: data,
                            responseTime,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', (err) => {
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                reject({
                    error: err.message,
                    responseTime
                });
            });

            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async testServicesHealth() {
        this.log('🔍 ทดสอบสถานะ Services...', 'info');
        
        try {
            // Test API Gateway Health
            const gatewayHealth = await this.makeRequest(`${this.baseUrl}/health/all`);
            this.results.services.gateway = {
                status: gatewayHealth.status === 200 ? 'OK' : 'ERROR',
                responseTime: gatewayHealth.responseTime,
                data: gatewayHealth.data
            };

            // Test Individual Services
            const services = ['user-management', 'portfolio', 'terminal', 'workspace'];
            for (const service of services) {
                try {
                    const serviceMap = {
                        'user-management': 4100,
                        'portfolio': 4500,
                        'terminal': 4300,
                        'workspace': 4400
                    };
                    
                    const serviceHealth = await this.makeRequest(`http://localhost:${serviceMap[service]}/health`);
                    this.results.services[service] = {
                        status: serviceHealth.status === 200 ? 'OK' : 'ERROR',
                        responseTime: serviceHealth.responseTime,
                        port: serviceMap[service]
                    };
                    
                    this.log(`${service} (Port ${serviceMap[service]}): ${serviceHealth.status === 200 ? 'OK' : 'ERROR'}`, 
                        serviceHealth.status === 200 ? 'success' : 'error');
                } catch (error) {
                    this.results.services[service] = {
                        status: 'ERROR',
                        error: error.error || error.message
                    };
                    this.log(`${service}: ERROR - ${error.error || error.message}`, 'error');
                }
            }

            // Test Service Discovery
            const serviceDiscovery = await this.makeRequest(`${this.baseUrl}/services`);
            this.results.services.discovery = {
                status: serviceDiscovery.status === 200 ? 'OK' : 'ERROR',
                responseTime: serviceDiscovery.responseTime,
                data: serviceDiscovery.data
            };

            this.log('Services Health Check สำเร็จ', 'success');
        } catch (error) {
            this.log(`Services Health Check ล้มเหลว: ${error.message}`, 'error');
            this.results.errors.push(`Services Health: ${error.message}`);
        }
    }

    async testAuthentication() {
        this.log('🔐 ทดสอบ Authentication Flow...', 'info');
        
        for (const account of this.testAccounts) {
            try {
                this.log(`ทดสอบการ Login: ${account.email}`, 'info');
                
                const loginResponse = await this.makeRequest(`${this.baseUrl}/api/v1/auth/login`, {
                    method: 'POST',
                    body: {
                        email: account.email,
                        password: account.password
                    }
                });

                if (loginResponse.status === 200 && loginResponse.data.token) {
                    this.authTokens[account.email] = loginResponse.data.token;
                    this.results.authentication[account.email] = {
                        status: 'SUCCESS',
                        responseTime: loginResponse.responseTime,
                        token: !!loginResponse.data.token,
                        user: loginResponse.data.user || null
                    };
                    this.log(`Login สำเร็จ: ${account.email}`, 'success');
                    
                    // Test token validation
                    const profileResponse = await this.makeRequest(`${this.baseUrl}/api/v1/auth/profile`, {
                        headers: {
                            'Authorization': `Bearer ${loginResponse.data.token}`
                        }
                    });

                    this.results.authentication[account.email].profileAccess = profileResponse.status === 200;
                    this.log(`Profile Access: ${profileResponse.status === 200 ? 'OK' : 'FAILED'}`, 
                        profileResponse.status === 200 ? 'success' : 'warning');

                } else {
                    this.results.authentication[account.email] = {
                        status: 'FAILED',
                        responseTime: loginResponse.responseTime,
                        statusCode: loginResponse.status,
                        message: loginResponse.data.message || 'Unknown error'
                    };
                    this.log(`Login ล้มเหลว: ${account.email} - ${loginResponse.data.message}`, 'error');
                }
            } catch (error) {
                this.results.authentication[account.email] = {
                    status: 'ERROR',
                    error: error.error || error.message
                };
                this.log(`Login Error: ${account.email} - ${error.error || error.message}`, 'error');
            }
        }
    }

    async testPortfolioFeatures() {
        this.log('📊 ทดสอบ Portfolio Features...', 'info');
        
        const testEmail = 'portfolio@user.com';
        const token = this.authTokens[testEmail];
        
        if (!token) {
            this.log('ไม่มี Token สำหรับทดสอบ Portfolio', 'error');
            return;
        }

        const authHeaders = { 'Authorization': `Bearer ${token}` };

        try {
            // Test Get Portfolios
            this.log('ทดสอบ GET /api/v1/portfolios', 'info');
            const portfoliosResponse = await this.makeRequest(`${this.baseUrl}/api/v1/portfolios`, {
                headers: authHeaders
            });
            
            this.results.portfolio.getPortfolios = {
                status: portfoliosResponse.status === 200 ? 'SUCCESS' : 'FAILED',
                responseTime: portfoliosResponse.responseTime,
                statusCode: portfoliosResponse.status,
                dataCount: Array.isArray(portfoliosResponse.data) ? portfoliosResponse.data.length : 0
            };

            // Test Get Stocks
            this.log('ทดสอบ GET /api/v1/stocks', 'info');
            const stocksResponse = await this.makeRequest(`${this.baseUrl}/api/v1/stocks`, {
                headers: authHeaders
            });
            
            this.results.portfolio.getStocks = {
                status: stocksResponse.status === 200 ? 'SUCCESS' : 'FAILED',
                responseTime: stocksResponse.responseTime,
                statusCode: stocksResponse.status,
                dataCount: Array.isArray(stocksResponse.data) ? stocksResponse.data.length : 0
            };

            // Test Create Portfolio (if needed)
            this.log('ทดสอบ POST /api/v1/portfolios (Create)', 'info');
            const createPortfolioResponse = await this.makeRequest(`${this.baseUrl}/api/v1/portfolios`, {
                method: 'POST',
                headers: authHeaders,
                body: {
                    name: `Test Portfolio ${Date.now()}`,
                    description: 'Portfolio สำหรับทดสอบระบบ',
                    initialBalance: 100000
                }
            });
            
            this.results.portfolio.createPortfolio = {
                status: createPortfolioResponse.status === 201 ? 'SUCCESS' : 'FAILED',
                responseTime: createPortfolioResponse.responseTime,
                statusCode: createPortfolioResponse.status,
                portfolioId: createPortfolioResponse.data?.id || null
            };

            // Test Get Trades
            this.log('ทดสอบ GET /api/v1/trades', 'info');
            const tradesResponse = await this.makeRequest(`${this.baseUrl}/api/v1/trades`, {
                headers: authHeaders
            });
            
            this.results.portfolio.getTrades = {
                status: tradesResponse.status === 200 ? 'SUCCESS' : 'FAILED',
                responseTime: tradesResponse.responseTime,
                statusCode: tradesResponse.status,
                dataCount: Array.isArray(tradesResponse.data) ? tradesResponse.data.length : 0
            };

            this.log('Portfolio Features Testing สำเร็จ', 'success');

        } catch (error) {
            this.log(`Portfolio Features Error: ${error.error || error.message}`, 'error');
            this.results.errors.push(`Portfolio Features: ${error.error || error.message}`);
        }
    }

    async testWebSocketConnections() {
        this.log('🔌 ทดสอบ WebSocket Connections...', 'info');
        
        const wsEndpoints = [
            { name: 'terminal', url: 'ws://localhost:4000/ws/terminal' },
            { name: 'portfolio', url: 'ws://localhost:4000/ws/portfolio' }
        ];

        for (const endpoint of wsEndpoints) {
            try {
                await this.testWebSocketEndpoint(endpoint.name, endpoint.url);
            } catch (error) {
                this.results.websocket[endpoint.name] = {
                    status: 'ERROR',
                    error: error.message
                };
                this.log(`WebSocket ${endpoint.name} Error: ${error.message}`, 'error');
            }
        }
    }

    async testWebSocketEndpoint(name, url) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            const ws = new WebSocket(url);
            let connected = false;

            const timeout = setTimeout(() => {
                if (!connected) {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 5000);

            ws.on('open', () => {
                connected = true;
                clearTimeout(timeout);
                const responseTime = performance.now() - startTime;
                
                this.results.websocket[name] = {
                    status: 'SUCCESS',
                    responseTime,
                    connectionTime: responseTime
                };
                
                this.log(`WebSocket ${name} เชื่อมต่อสำเร็จ (${responseTime.toFixed(2)}ms)`, 'success');
                
                // Test ping/pong
                ws.ping();
                
                setTimeout(() => {
                    ws.close();
                    resolve();
                }, 1000);
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.results.websocket[name] = {
                    status: 'ERROR',
                    error: error.message
                };
                reject(error);
            });

            ws.on('pong', () => {
                this.log(`WebSocket ${name} Ping/Pong OK`, 'success');
                this.results.websocket[name].pingPong = true;
            });
        });
    }

    async testErrorHandling() {
        this.log('🚨 ทดสอบ Error Handling...', 'info');
        
        const errorTests = [
            {
                name: 'Invalid Login',
                url: `${this.baseUrl}/api/v1/auth/login`,
                method: 'POST',
                body: { email: 'invalid@email.com', password: 'wrongpassword' },
                expectedStatus: 401
            },
            {
                name: 'Unauthorized API Access',
                url: `${this.baseUrl}/api/v1/portfolios`,
                method: 'GET',
                headers: { 'Authorization': 'Bearer invalidtoken' },
                expectedStatus: 401
            },
            {
                name: 'Invalid Portfolio Creation',
                url: `${this.baseUrl}/api/v1/portfolios`,
                method: 'POST',
                body: { name: '' }, // Invalid empty name
                headers: { 'Authorization': `Bearer ${this.authTokens['portfolio@user.com'] || 'invalid'}` },
                expectedStatus: 400
            },
            {
                name: 'Non-existent Endpoint',
                url: `${this.baseUrl}/api/v1/nonexistent`,
                method: 'GET',
                expectedStatus: 404
            }
        ];

        for (const test of errorTests) {
            try {
                const response = await this.makeRequest(test.url, {
                    method: test.method,
                    headers: test.headers,
                    body: test.body
                });

                const isExpectedError = response.status === test.expectedStatus;
                this.results.errors.push({
                    test: test.name,
                    status: isExpectedError ? 'PASS' : 'FAIL',
                    expected: test.expectedStatus,
                    actual: response.status,
                    responseTime: response.responseTime
                });

                this.log(`Error Test "${test.name}": ${isExpectedError ? 'PASS' : 'FAIL'} (${response.status})`, 
                    isExpectedError ? 'success' : 'warning');

            } catch (error) {
                this.results.errors.push({
                    test: test.name,
                    status: 'ERROR',
                    error: error.error || error.message
                });
                this.log(`Error Test "${test.name}": ERROR - ${error.error || error.message}`, 'error');
            }
        }
    }

    async measurePerformance() {
        this.log('⚡ วัด Performance Metrics...', 'info');
        
        const performanceTests = [
            { name: 'Health Check', url: `${this.baseUrl}/health/all` },
            { name: 'Service Discovery', url: `${this.baseUrl}/services` },
            { name: 'Portfolio API', url: `${this.baseUrl}/api/v1/portfolios`, needsAuth: true },
            { name: 'Stocks API', url: `${this.baseUrl}/api/v1/stocks`, needsAuth: true }
        ];

        for (const test of performanceTests) {
            const iterations = 5;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                try {
                    const headers = test.needsAuth ? 
                        { 'Authorization': `Bearer ${this.authTokens['portfolio@user.com']}` } : {};
                    
                    const response = await this.makeRequest(test.url, { headers });
                    responseTimes.push(response.responseTime);
                } catch (error) {
                    this.log(`Performance test ${test.name} iteration ${i+1} failed`, 'warning');
                }
            }

            if (responseTimes.length > 0) {
                const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                const minResponseTime = Math.min(...responseTimes);
                const maxResponseTime = Math.max(...responseTimes);
                
                this.results.performance[test.name] = {
                    iterations: responseTimes.length,
                    avgResponseTime: Math.round(avgResponseTime),
                    minResponseTime: Math.round(minResponseTime),
                    maxResponseTime: Math.round(maxResponseTime),
                    responseTimes
                };

                this.log(`${test.name} Performance: Avg ${Math.round(avgResponseTime)}ms, Min ${Math.round(minResponseTime)}ms, Max ${Math.round(maxResponseTime)}ms`, 'perf');
            }
        }
    }

    generateReport() {
        this.log('📋 สร้างรายงานผลการทดสอบ...', 'info');
        
        const report = {
            timestamp: new Date().toISOString(),
            testSummary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                errorTests: 0
            },
            ...this.results
        };

        // Count test results
        const countResults = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key].status) {
                    report.testSummary.totalTests++;
                    if (obj[key].status === 'SUCCESS' || obj[key].status === 'OK') {
                        report.testSummary.passedTests++;
                    } else if (obj[key].status === 'FAILED') {
                        report.testSummary.failedTests++;
                    } else {
                        report.testSummary.errorTests++;
                    }
                }
            }
        };

        countResults(this.results.services);
        countResults(this.results.authentication);
        countResults(this.results.portfolio);
        countResults(this.results.websocket);

        return report;
    }

    async runAllTests() {
        this.log('🚀 เริ่มต้นการทดสอบระบบ Portfolio Management System', 'info');
        this.log('==================================================', 'info');
        
        try {
            await this.testServicesHealth();
            await this.testAuthentication();
            await this.testPortfolioFeatures();
            await this.testWebSocketConnections();
            await this.testErrorHandling();
            await this.measurePerformance();
            
            const report = this.generateReport();
            
            this.log('==================================================', 'info');
            this.log('📊 สรุปผลการทดสอบ', 'info');
            this.log(`✅ ผ่าน: ${report.testSummary.passedTests}`, 'success');
            this.log(`❌ ล้มเหลว: ${report.testSummary.failedTests}`, 'error');
            this.log(`🚨 ข้อผิดพลาด: ${report.testSummary.errorTests}`, 'warning');
            this.log(`📋 รวม: ${report.testSummary.totalTests} การทดสอบ`, 'info');
            
            return report;
            
        } catch (error) {
            this.log(`ข้อผิดพลาดในการทดสอบ: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export for use as module
module.exports = PortfolioSystemTester;

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            const tester = new PortfolioSystemTester();
            const report = await tester.runAllTests();
            
            // Save report to file
            const fs = require('fs');
            const reportPath = '/Users/sem4pro/Stock/port/TEST_REPORT_' + new Date().toISOString().split('T')[0] + '.json';
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`\n📄 รายงานถูกบันทึกที่: ${reportPath}`);
            process.exit(0);
        } catch (error) {
            console.error('❌ การทดสอบล้มเหลว:', error.message);
            process.exit(1);
        }
    })();
}