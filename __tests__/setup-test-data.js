#!/usr/bin/env node

/**
 * Setup Test Data Script
 * สร้าง database tables และ test users สำหรับการทดสอบ
 */

const { execSync } = require('child_process');
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();
const http = require('http');

class TestDataSetup {
    constructor() {
        this.baseUrl = 'http://${getServiceUrl("userManagement")}';
        this.testUsers = [
            {
                email: 'portfolio@user.com',
                password: 'Portfolio@2025',
                firstName: 'Portfolio',
                lastName: 'User'
            },
            {
                email: 'admin@portfolio.com',
                password: 'Admin@2025',
                firstName: 'Admin',
                lastName: 'User'
            },
            {
                email: 'demo@portfolio.com',
                password: 'Demo@2025',
                firstName: 'Demo',
                lastName: 'User'
            }
        ];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async makeRequest(url, options = {}) {
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
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: data
                        });
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async runDatabaseMigration() {
        this.log('🗄️ รัน Database Migration...', 'info');
        
        try {
            // Run Prisma migration for user-management service
            this.log('รัน Prisma migration สำหรับ User Management service', 'info');
            execSync('cd services/user-management && npx prisma db push', { stdio: 'inherit' });
            
            this.log('Database migration สำเร็จ', 'success');
            return true;
        } catch (error) {
            this.log(`Database migration ล้มเหลว: ${error.message}`, 'error');
            return false;
        }
    }

    async createTestUsers() {
        this.log('👥 สร้าง Test Users...', 'info');
        
        for (const user of this.testUsers) {
            try {
                this.log(`สร้างผู้ใช้: ${user.email}`, 'info');
                
                const response = await this.makeRequest(`${this.baseUrl}/auth/register`, {
                    method: 'POST',
                    body: user
                });

                if (response.status === 201) {
                    this.log(`✅ สร้างผู้ใช้ ${user.email} สำเร็จ`, 'success');
                } else if (response.status === 400 && response.data.error && response.data.error.includes('already exists')) {
                    this.log(`⚠️ ผู้ใช้ ${user.email} มีอยู่แล้ว`, 'warning');
                } else {
                    this.log(`❌ สร้างผู้ใช้ ${user.email} ล้มเหลว: ${response.data.error || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                this.log(`❌ สร้างผู้ใช้ ${user.email} ล้มเหลว: ${error.message}`, 'error');
            }
        }
    }

    async testUserLogin() {
        this.log('🔐 ทดสอบการ Login ของ Test Users...', 'info');
        
        for (const user of this.testUsers) {
            try {
                const response = await this.makeRequest(`${this.baseUrl}/auth/login`, {
                    method: 'POST',
                    body: {
                        email: user.email,
                        password: user.password
                    }
                });

                if (response.status === 200 && response.data.data && response.data.data.token) {
                    this.log(`✅ Login ${user.email} สำเร็จ`, 'success');
                } else {
                    this.log(`❌ Login ${user.email} ล้มเหลว: ${response.data.error || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                this.log(`❌ Login ${user.email} ล้มเหลว: ${error.message}`, 'error');
            }
        }
    }

    async createPortfolioTestData() {
        this.log('📊 สร้าง Portfolio Test Data...', 'info');
        
        try {
            // First login to get a token
            const loginResponse = await this.makeRequest(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                body: {
                    email: 'portfolio@user.com',
                    password: 'Portfolio@2025'
                }
            });

            if (loginResponse.status !== 200 || !loginResponse.data.data.token) {
                this.log('ไม่สามารถ Login เพื่อสร้าง Portfolio data ได้', 'error');
                return;
            }

            const token = loginResponse.data.data.token;
            
            // Create sample portfolio via API Gateway
            const portfolioResponse = await this.makeRequest('http://${getGatewayPort()}/api/v1/portfolios', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: {
                    name: 'Test Portfolio',
                    description: 'Portfolio สำหรับทดสอบระบบ',
                    initialBalance: 100000
                }
            });

            if (portfolioResponse.status === 201) {
                this.log('✅ สร้าง Portfolio test data สำเร็จ', 'success');
            } else {
                this.log(`Portfolio creation ล้มเหลว: ${portfolioResponse.data.error || 'Unknown error'}`, 'warning');
            }

        } catch (error) {
            this.log(`สร้าง Portfolio test data ล้มเหลว: ${error.message}`, 'error');
        }
    }

    async setupAll() {
        this.log('🚀 เริ่มต้น Setup Test Data', 'info');
        this.log('===============================================', 'info');
        
        try {
            // 1. Run database migration
            const migrationSuccess = await this.runDatabaseMigration();
            if (!migrationSuccess) {
                this.log('หยุดการ setup เนื่องจาก migration ล้มเหลว', 'error');
                return false;
            }

            // Wait a bit for database to be ready
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 2. Create test users
            await this.createTestUsers();

            // Wait a bit between operations
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Test user login
            await this.testUserLogin();

            // 4. Create portfolio test data
            await this.createPortfolioTestData();

            this.log('===============================================', 'info');
            this.log('✅ Setup Test Data สำเร็จ!', 'success');
            this.log('', 'info');
            this.log('Test Accounts ที่พร้อมใช้งาน:', 'info');
            for (const user of this.testUsers) {
                this.log(`📧 ${user.email} / 🔑 ${user.password}`, 'info');
            }
            this.log('', 'info');
            this.log('ตอนนี้สามารถรัน comprehensive test ได้แล้ว:', 'info');
            this.log('node __tests__/comprehensive-system-test.js', 'info');

            return true;

        } catch (error) {
            this.log(`Setup ล้มเหลว: ${error.message}`, 'error');
            return false;
        }
    }
}

// Export for use as module
module.exports = TestDataSetup;

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            const setup = new TestDataSetup();
            const success = await setup.setupAll();
            process.exit(success ? 0 : 1);
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    })();
}