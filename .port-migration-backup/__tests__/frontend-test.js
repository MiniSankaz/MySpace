#!/usr/bin/env node

/**
 * Frontend Testing Script
 * ทดสอบ Frontend (Next.js) และการเชื่อมต่อกับ Backend
 */

const http = require('http');
const { performance } = require('perf_hooks');

class FrontendTester {
    constructor() {
        this.frontendUrl = 'http://localhost:3000';
        this.backendUrl = 'http://localhost:4000';
        this.results = {
            frontend: {},
            api_integration: {},
            pages: {},
            performance: {},
            errors: []
        };
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
                    'User-Agent': 'Frontend-Tester/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
                    
                    resolve({
                        status: res.statusCode,
                        data: data,
                        responseTime,
                        headers: res.headers,
                        contentType: res.headers['content-type'] || '',
                        contentLength: data.length
                    });
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

    async testFrontendHealth() {
        this.log('🌐 ทดสอบ Frontend Health...', 'info');
        
        try {
            // Test Next.js health endpoint
            const healthResponse = await this.makeRequest(`${this.frontendUrl}/api/health`);
            
            this.results.frontend.health = {
                status: healthResponse.status === 200 ? 'OK' : 'ERROR',
                responseTime: healthResponse.responseTime,
                statusCode: healthResponse.status
            };

            this.log(`Frontend Health: ${healthResponse.status === 200 ? 'OK' : 'ERROR'} (${healthResponse.status})`, 
                healthResponse.status === 200 ? 'success' : 'error');

        } catch (error) {
            this.results.frontend.health = {
                status: 'ERROR',
                error: error.error || error.message
            };
            this.log(`Frontend Health Error: ${error.error || error.message}`, 'error');
        }
    }

    async testMainPages() {
        this.log('📄 ทดสอบ Main Pages...', 'info');
        
        const pages = [
            { name: 'Homepage', path: '/' },
            { name: 'Login Page', path: '/login' },
            { name: 'Dashboard', path: '/dashboard' },
            { name: 'Portfolio', path: '/portfolio' }
        ];

        for (const page of pages) {
            try {
                this.log(`ทดสอบ ${page.name} (${page.path})`, 'info');
                
                const pageResponse = await this.makeRequest(`${this.frontendUrl}${page.path}`);
                
                const isHtml = pageResponse.contentType.includes('text/html');
                const hasReactContent = pageResponse.data.includes('__NEXT_DATA__') || 
                                      pageResponse.data.includes('react') ||
                                      pageResponse.data.includes('next/script');
                
                this.results.pages[page.name.toLowerCase().replace(' ', '_')] = {
                    status: pageResponse.status === 200 ? 'ACCESSIBLE' : 'ERROR',
                    responseTime: pageResponse.responseTime,
                    statusCode: pageResponse.status,
                    isHtml: isHtml,
                    hasReactContent: hasReactContent,
                    contentLength: pageResponse.contentLength
                };

                let statusText = 'ERROR';
                if (pageResponse.status === 200) {
                    statusText = hasReactContent ? 'ACCESSIBLE' : 'STATIC';
                } else if (pageResponse.status === 302 || pageResponse.status === 307) {
                    statusText = 'REDIRECT';
                }

                this.log(`${page.name}: ${statusText} (${pageResponse.status}, ${pageResponse.contentLength} bytes)`, 
                    pageResponse.status === 200 ? 'success' : 'warning');

            } catch (error) {
                this.results.pages[page.name.toLowerCase().replace(' ', '_')] = {
                    status: 'ERROR',
                    error: error.error || error.message
                };
                this.log(`${page.name} Error: ${error.error || error.message}`, 'error');
            }
        }
    }

    async testAPIIntegration() {
        this.log('🔗 ทดสอบ API Integration...', 'info');
        
        const apiTests = [
            {
                name: 'Frontend to Gateway Connection',
                method: 'GET',
                endpoint: '/api/v1/health',
                description: 'ทดสอบการเชื่อมต่อ Frontend กับ API Gateway'
            },
            {
                name: 'Client-side API Call',
                method: 'GET', 
                endpoint: '/api/v1/portfolios',
                description: 'ทดสอบ API call จาก client-side',
                needsAuth: true
            },
            {
                name: 'CORS Configuration',
                method: 'OPTIONS',
                endpoint: '/api/v1/health',
                description: 'ทดสอบ CORS configuration'
            }
        ];

        for (const test of apiTests) {
            try {
                this.log(`${test.description}`, 'info');
                
                const headers = {
                    'Origin': this.frontendUrl,
                    'Access-Control-Request-Method': test.method,
                    'Access-Control-Request-Headers': 'Content-Type,Authorization'
                };

                if (test.needsAuth) {
                    headers['Authorization'] = 'Bearer test-token';
                }

                const response = await this.makeRequest(`${this.backendUrl}${test.endpoint}`, {
                    method: test.method,
                    headers: headers
                });

                this.results.api_integration[test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')] = {
                    status: response.status < 500 ? 'OK' : 'ERROR',
                    responseTime: response.responseTime,
                    statusCode: response.status,
                    corsHeaders: {
                        accessControlAllowOrigin: response.headers['access-control-allow-origin'],
                        accessControlAllowMethods: response.headers['access-control-allow-methods'],
                        accessControlAllowHeaders: response.headers['access-control-allow-headers']
                    }
                };

                this.log(`${test.name}: ${response.status < 500 ? 'OK' : 'ERROR'} (${response.status})`, 
                    response.status < 500 ? 'success' : 'error');

            } catch (error) {
                this.results.api_integration[test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')] = {
                    status: 'ERROR',
                    error: error.error || error.message
                };
                this.log(`${test.name} Error: ${error.error || error.message}`, 'error');
            }
        }
    }

    async testStaticAssets() {
        this.log('📦 ทดสอบ Static Assets...', 'info');
        
        const assets = [
            { name: 'favicon', path: '/favicon.ico' },
            { name: 'next.js bundle', path: '/_next/static/chunks/main.js' },
            { name: 'css styles', path: '/_next/static/css/' }
        ];

        for (const asset of assets) {
            try {
                const assetResponse = await this.makeRequest(`${this.frontendUrl}${asset.path}`);
                
                this.results.frontend[`static_${asset.name.replace(/[^a-z0-9]/g, '_')}`] = {
                    status: assetResponse.status === 200 ? 'AVAILABLE' : 'MISSING',
                    responseTime: assetResponse.responseTime,
                    statusCode: assetResponse.status,
                    contentLength: assetResponse.contentLength
                };

                this.log(`${asset.name}: ${assetResponse.status === 200 ? 'AVAILABLE' : 'MISSING'} (${assetResponse.status})`, 
                    assetResponse.status === 200 ? 'success' : 'warning');

            } catch (error) {
                this.results.frontend[`static_${asset.name.replace(/[^a-z0-9]/g, '_')}`] = {
                    status: 'ERROR',
                    error: error.error || error.message
                };
                this.log(`${asset.name} Error: ${error.error || error.message}`, 'warning');
            }
        }
    }

    async measureFrontendPerformance() {
        this.log('⚡ วัด Frontend Performance...', 'info');
        
        const performanceTests = [
            { name: 'Homepage Load Time', path: '/' },
            { name: 'Dashboard Load Time', path: '/dashboard' },
            { name: 'API Health Check', path: '/api/health' }
        ];

        for (const test of performanceTests) {
            const iterations = 3;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                try {
                    const response = await this.makeRequest(`${this.frontendUrl}${test.path}`);
                    responseTimes.push(response.responseTime);
                } catch (error) {
                    this.log(`Performance test ${test.name} iteration ${i+1} failed`, 'warning');
                }
            }

            if (responseTimes.length > 0) {
                const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                const minResponseTime = Math.min(...responseTimes);
                const maxResponseTime = Math.max(...responseTimes);
                
                this.results.performance[test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')] = {
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
        this.log('📋 สร้างรายงานผล Frontend Testing...', 'info');
        
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
                    if (obj[key].status === 'OK' || obj[key].status === 'ACCESSIBLE' || obj[key].status === 'AVAILABLE') {
                        report.testSummary.passedTests++;
                    } else if (obj[key].status === 'MISSING' || obj[key].status === 'STATIC') {
                        report.testSummary.failedTests++;
                    } else {
                        report.testSummary.errorTests++;
                    }
                }
            }
        };

        countResults(this.results.frontend);
        countResults(this.results.pages);
        countResults(this.results.api_integration);

        // Generate recommendations
        if (report.testSummary.errorTests > 0) {
            report.recommendations.push("แก้ไข Frontend errors และ configuration issues");
        }
        if (report.testSummary.failedTests > 0) {
            report.recommendations.push("ตรวจสอบ static assets และ page routing");
        }
        
        // Check performance issues
        for (const key in this.results.performance) {
            const perf = this.results.performance[key];
            if (perf.avgResponseTime > 1000) {
                report.recommendations.push(`ปรับปรุง performance สำหรับ ${key} (${perf.avgResponseTime}ms)`);
            }
        }

        return report;
    }

    async runAllTests() {
        this.log('🚀 เริ่มต้นการทดสอบ Frontend System', 'info');
        this.log('==================================================', 'info');
        
        try {
            await this.testFrontendHealth();
            await this.testMainPages();
            await this.testAPIIntegration();
            await this.testStaticAssets();
            await this.measureFrontendPerformance();
            
            const report = this.generateReport();
            
            this.log('==================================================', 'info');
            this.log('📊 สรุปผลการทดสอบ Frontend', 'info');
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
module.exports = FrontendTester;

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            const tester = new FrontendTester();
            const report = await tester.runAllTests();
            
            // Save report to file
            const fs = require('fs');
            const reportPath = '/Users/sem4pro/Stock/port/FRONTEND_TEST_REPORT_' + new Date().toISOString().split('T')[0] + '.json';
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`\n📄 รายงานถูกบันทึกที่: ${reportPath}`);
            process.exit(0);
        } catch (error) {
            console.error('❌ การทดสอบ Frontend ล้มเหลว:', error.message);
            process.exit(1);
        }
    })();
}