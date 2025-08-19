#!/usr/bin/env node

/**
 * Portfolio Management System - Corrected System Testing Script
 * ทดสอบระบบ Portfolio Management System ทั้งหมด (แก้ไข API paths)
 */

const http = require('http');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class CorrectedPortfolioSystemTester {
    constructor() {
        this.baseUrl = 'http://localhost:4000';
        this.frontendUrl = 'http://localhost:3000';
        this.userServiceUrl = 'http://localhost:4100';
        this.results = {
            services: {},
            authentication: {},
            portfolio: {},
            websocket: {},
            performance: {},
            errors: []
        };
        // Using credentials from CLAUDE.md
        this.testAccounts = [
            { email: 'sankaz@example.com', password: 'Sankaz#3E25167B@2025' },
            { email: 'test@personalai.com', password: 'Test@123' }
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

            const req = http.request(url, requestOptions, (res) => {
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

            // Test Individual Services (direct connection)
            const services = [
                { name: 'user-management', port: 4100 },
                { name: 'portfolio', port: 4500 },
                { name: 'terminal', port: 4300 },
                { name: 'workspace', port: 4400 }
            ];
            
            for (const service of services) {
                try {
                    const serviceHealth = await this.makeRequest(`http://localhost:${service.port}/health`);
                    this.results.services[service.name] = {
                        status: serviceHealth.status === 200 ? 'OK' : 'ERROR',
                        responseTime: serviceHealth.responseTime,
                        port: service.port
                    };
                    
                    this.log(`${service.name} (Port ${service.port}): ${serviceHealth.status === 200 ? 'OK' : 'ERROR'}`, 
                        serviceHealth.status === 200 ? 'success' : 'error');
                } catch (error) {
                    this.results.services[service.name] = {
                        status: 'ERROR',
                        error: error.error || error.message
                    };
                    this.log(`${service.name}: ERROR - ${error.error || error.message}`, 'error');
                }
            }

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
                
                // Test direct login to user service (correct path)
                const loginResponse = await this.makeRequest(`${this.userServiceUrl}/auth/login`, {
                    method: 'POST',
                    body: {
                        email: account.email,
                        password: account.password
                    }
                });

                if (loginResponse.status === 200 && loginResponse.data.success && loginResponse.data.data.token) {
                    this.authTokens[account.email] = loginResponse.data.data.token;
                    this.results.authentication[account.email] = {
                        status: 'SUCCESS',
                        responseTime: loginResponse.responseTime,
                        token: !!loginResponse.data.data.token,
                        user: loginResponse.data.data.user || null
                    };
                    this.log(`Login สำเร็จ: ${account.email}`, 'success');
                    
                    // Test API Gateway routing for auth
                    try {
                        const gatewayAuthResponse = await this.makeRequest(`${this.baseUrl}/api/v1/auth/validate`, {
                            method: 'POST',
                            body: { token: loginResponse.data.data.token }
                        });

                        this.results.authentication[account.email].gatewayRouting = gatewayAuthResponse.status === 200;
                        this.log(`Gateway Auth Routing: ${gatewayAuthResponse.status === 200 ? 'OK' : 'FAILED'}`, 
                            gatewayAuthResponse.status === 200 ? 'success' : 'warning');
                    } catch (e) {
                        this.results.authentication[account.email].gatewayRouting = false;
                        this.log(`Gateway Auth Routing: ERROR`, 'warning');
                    }

                } else {
                    this.results.authentication[account.email] = {
                        status: 'FAILED',
                        responseTime: loginResponse.responseTime,
                        statusCode: loginResponse.status,
                        message: loginResponse.data.error || 'Unknown error'
                    };
                    this.log(`Login ล้มเหลว: ${account.email} - ${loginResponse.data.error}`, 'error');
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
        
        // Get first successful login token
        let token = null;
        let testEmail = null;
        
        for (const email in this.authTokens) {
            if (this.authTokens[email]) {
                token = this.authTokens[email];
                testEmail = email;
                break;
            }
        }
        
        if (!token) {
            this.log('ไม่มี Token สำหรับทดสอบ Portfolio', 'error');
            return;
        }

        const authHeaders = { 'Authorization': `Bearer ${token}` };

        try {
            // Test Portfolio APIs through API Gateway
            const portfolioTests = [
                { name: 'getPortfolios', endpoint: '/api/v1/portfolios', method: 'GET' },
                { name: 'getStocks', endpoint: '/api/v1/stocks', method: 'GET' },
                { name: 'getTrades', endpoint: '/api/v1/trades', method: 'GET' }
            ];

            for (const test of portfolioTests) {
                try {
                    this.log(`ทดสอบ ${test.method} ${test.endpoint}`, 'info');
                    const response = await this.makeRequest(`${this.baseUrl}${test.endpoint}`, {
                        method: test.method,
                        headers: authHeaders
                    });
                    
                    this.results.portfolio[test.name] = {
                        status: response.status === 200 ? 'SUCCESS' : 'FAILED',
                        responseTime: response.responseTime,
                        statusCode: response.status,
                        dataCount: Array.isArray(response.data) ? response.data.length : 
                                 (response.data && response.data.data && Array.isArray(response.data.data)) ? response.data.data.length : 0
                    };

                    this.log(`${test.name}: ${response.status === 200 ? 'SUCCESS' : 'FAILED'} (${response.status})`, 
                        response.status === 200 ? 'success' : 'warning');

                } catch (error) {
                    this.results.portfolio[test.name] = {
                        status: 'ERROR',
                        error: error.error || error.message
                    };
                    this.log(`${test.name}: ERROR - ${error.error || error.message}`, 'error');
                }
            }

            this.log('Portfolio Features Testing สำเร็จ', 'success');

        } catch (error) {
            this.log(`Portfolio Features Error: ${error.error || error.message}`, 'error');
            this.results.errors.push(`Portfolio Features: ${error.error || error.message}`);
        }
    }

    async testApiGatewayRouting() {
        this.log('🔄 ทดสอบ API Gateway Routing...', 'info');
        
        const routingTests = [
            { name: 'User Service Routing', endpoint: '/api/v1/users', expectedService: 'user-management' },
            { name: 'Portfolio Service Routing', endpoint: '/api/v1/portfolios', expectedService: 'portfolio' },
            { name: 'Terminal Service Routing', endpoint: '/api/v1/terminal', expectedService: 'terminal' },
            { name: 'Workspace Service Routing', endpoint: '/api/v1/workspace', expectedService: 'workspace' }
        ];

        for (const test of routingTests) {
            try {
                const response = await this.makeRequest(`${this.baseUrl}${test.endpoint}`, {
                    headers: { 'Authorization': `Bearer ${Object.values(this.authTokens)[0] || 'test'}` }
                });
                
                this.results.services[`routing_${test.name.toLowerCase().replace(' ', '_')}`] = {
                    status: response.status < 500 ? 'OK' : 'ERROR', // 404 or 401 is OK for routing test
                    responseTime: response.responseTime,
                    statusCode: response.status
                };

                this.log(`${test.name}: ${response.status < 500 ? 'ROUTED' : 'ERROR'} (${response.status})`, 
                    response.status < 500 ? 'success' : 'warning');

            } catch (error) {
                this.results.services[`routing_${test.name.toLowerCase().replace(' ', '_')}`] = {
                    status: 'ERROR',
                    error: error.error || error.message
                };
                this.log(`${test.name}: ERROR - ${error.error || error.message}`, 'error');
            }
        }
    }

    async testWebSocketConnections() {
        this.log('🔌 ทดสอบ WebSocket Connections...', 'info');
        
        const wsEndpoints = [
            { name: 'terminal', url: 'ws://localhost:4300/ws' }, // Direct connection
            { name: 'portfolio', url: 'ws://localhost:4500/ws' }  // Direct connection
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
            let ws;
            let connected = false;

            try {
                ws = new WebSocket(url);
            } catch (error) {
                reject(new Error(`Failed to create WebSocket: ${error.message}`));
                return;
            }

            const timeout = setTimeout(() => {
                if (!connected && ws) {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 3000);

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
                
                setTimeout(() => {
                    ws.close();
                    resolve();
                }, 500);
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.results.websocket[name] = {
                    status: 'ERROR',
                    error: error.message
                };
                this.log(`WebSocket ${name} Error: ${error.message}`, 'error');
                resolve(); // Don't reject, just log the error
            });

            ws.on('close', (code, reason) => {
                clearTimeout(timeout);
                if (!connected) {
                    this.results.websocket[name] = {
                        status: 'ERROR',
                        error: `Connection closed: ${code} ${reason}`
                    };
                }
                resolve();
            });
        });
    }

    async measurePerformance() {
        this.log('⚡ วัด Performance Metrics...', 'info');
        
        const performanceTests = [
            { name: 'Health Check', url: `${this.baseUrl}/health/all` },
            { name: 'Service Discovery', url: `${this.baseUrl}/services` },
            { name: 'User Service Direct', url: `${this.userServiceUrl}/health` },
            { name: 'Portfolio Service Direct', url: `http://localhost:4500/health` }
        ];

        for (const test of performanceTests) {
            const iterations = 3;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                try {
                    const response = await this.makeRequest(test.url);
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
            recommendations: [],
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

        // Generate recommendations
        if (report.testSummary.errorTests > 0) {
            report.recommendations.push("ตรวจสอบ services ที่มีข้อผิดพลาดและแก้ไข configuration");
        }
        if (report.testSummary.failedTests > 0) {
            report.recommendations.push("ปรับปรุง API endpoints และ error handling");
        }
        if (Object.keys(this.authTokens).length === 0) {
            report.recommendations.push("สร้าง test users และแก้ไขปัญหา authentication");
        }

        return report;
    }

    async runAllTests() {
        this.log('🚀 เริ่มต้นการทดสอบระบบ Portfolio Management System (Corrected)', 'info');
        this.log('==================================================', 'info');
        
        try {
            await this.testServicesHealth();
            await this.testAuthentication();
            await this.testApiGatewayRouting();
            await this.testPortfolioFeatures();
            await this.testWebSocketConnections();
            await this.measurePerformance();
            
            const report = this.generateReport();
            
            this.log('==================================================', 'info');
            this.log('📊 สรุปผลการทดสอบ', 'info');
            this.log(`✅ ผ่าน: ${report.testSummary.passedTests}`, 'success');
            this.log(`❌ ล้มเหลว: ${report.testSummary.failedTests}`, 'error');
            this.log(`🚨 ข้อผิดพลาด: ${report.testSummary.errorTests}`, 'warning');
            this.log(`📋 รวม: ${report.testSummary.totalTests} การทดสอบ`, 'info');
            
            if (report.recommendations.length > 0) {
                this.log('💡 คำแนะนำ:', 'info');
                for (const rec of report.recommendations) {
                    this.log(`  - ${rec}`, 'info');
                }
            }
            
            return report;
            
        } catch (error) {
            this.log(`ข้อผิดพลาดในการทดสอบ: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export for use as module
module.exports = CorrectedPortfolioSystemTester;

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            const tester = new CorrectedPortfolioSystemTester();
            const report = await tester.runAllTests();
            
            // Save report to file
            const fs = require('fs');
            const reportPath = '/Users/sem4pro/Stock/port/TEST_REPORT_CORRECTED_' + new Date().toISOString().split('T')[0] + '.json';
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`\n📄 รายงานถูกบันทึกที่: ${reportPath}`);
            process.exit(0);
        } catch (error) {
            console.error('❌ การทดสอบล้มเหลว:', error.message);
            process.exit(1);
        }
    })();
}