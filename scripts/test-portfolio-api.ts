#!/usr/bin/env tsx
/**
 * Test script for Portfolio Service APIs
 * Tests authentication, validation, and CRUD operations
 */

import axios from 'axios';
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://${getGatewayPort()}/api/v1';
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Test user data
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  roles: ['user']
};

// Generate test JWT token
const generateToken = () => {
  return jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
};

// Test data
const testPortfolio = {
  name: 'Test Portfolio',
  description: 'Test portfolio for API testing',
  currency: 'USD',
  isDefault: true
};

const testTransaction = {
  type: 'BUY',
  symbol: 'AAPL',
  quantity: 10,
  price: 150.50,
  fees: 1.50,
  notes: 'Test transaction',
  executedAt: new Date().toISOString()
};

// Helper function to make authenticated requests
const makeRequest = async (method: string, url: string, data?: any) => {
  const token = generateToken();
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(`Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      throw error.response.data;
    }
    throw error;
  }
};

async function testPortfolioAPIs() {
  console.log('🧪 Testing Portfolio Service APIs\n');
  
  let portfolioId: string;
  let transactionId: string;
  
  try {
    // Test 1: Create Portfolio
    console.log('📊 Test 1: Create Portfolio');
    const portfolio = await makeRequest('POST', `${API_BASE}/portfolios`, testPortfolio);
    portfolioId = portfolio.data.id;
    console.log('✅ Portfolio created:', portfolio);
    console.log('');
    
    // Test 2: Get User Portfolios
    console.log('📊 Test 2: Get User Portfolios');
    const portfolios = await makeRequest('GET', `${API_BASE}/portfolios`);
    console.log('✅ Portfolios retrieved:', portfolios);
    console.log('');
    
    // Test 3: Get Single Portfolio
    console.log('📊 Test 3: Get Single Portfolio');
    const singlePortfolio = await makeRequest('GET', `${API_BASE}/portfolios/${portfolioId}`);
    console.log('✅ Portfolio retrieved:', singlePortfolio);
    console.log('');
    
    // Test 4: Update Portfolio
    console.log('📊 Test 4: Update Portfolio');
    const updatedPortfolio = await makeRequest('PUT', `${API_BASE}/portfolios/${portfolioId}`, {
      name: 'Updated Portfolio Name',
      description: 'Updated description'
    });
    console.log('✅ Portfolio updated:', updatedPortfolio);
    console.log('');
    
    // Test 5: Create Transaction
    console.log('💰 Test 5: Create Transaction');
    const transaction = await makeRequest('POST', `${API_BASE}/portfolios/${portfolioId}/transactions`, testTransaction);
    transactionId = transaction.data.id;
    console.log('✅ Transaction created:', transaction);
    console.log('');
    
    // Test 6: Get Transactions
    console.log('💰 Test 6: Get Transactions');
    const transactions = await makeRequest('GET', `${API_BASE}/portfolios/${portfolioId}/transactions`);
    console.log('✅ Transactions retrieved:', transactions);
    console.log('');
    
    // Test 7: Get Transaction Stats
    console.log('📈 Test 7: Get Transaction Stats');
    const stats = await makeRequest('GET', `${API_BASE}/portfolios/${portfolioId}/transactions/stats`);
    console.log('✅ Transaction stats:', stats);
    console.log('');
    
    // Test 8: Get Holdings
    console.log('💼 Test 8: Get Holdings');
    const holdings = await makeRequest('GET', `${API_BASE}/portfolios/${portfolioId}/holdings`);
    console.log('✅ Holdings retrieved:', holdings);
    console.log('');
    
    // Test 9: Test Validation - Invalid Transaction
    console.log('🚫 Test 9: Test Validation - Invalid Transaction');
    try {
      await makeRequest('POST', `${API_BASE}/portfolios/${portfolioId}/transactions`, {
        type: 'INVALID_TYPE',
        symbol: 'AAPL',
        quantity: -10,  // Invalid negative quantity
        price: 0  // Invalid price
      });
      console.log('❌ Validation should have failed');
    } catch (error: any) {
      console.log('✅ Validation correctly rejected invalid data:', error.error);
    }
    console.log('');
    
    // Test 10: Test Authentication - No Token
    console.log('🔐 Test 10: Test Authentication - No Token');
    try {
      await axios.get(`${API_BASE}/portfolios`);
      console.log('❌ Should have required authentication');
    } catch (error: any) {
      console.log('✅ Authentication correctly required:', error.response?.data?.error);
    }
    console.log('');
    
    // Test 11: Delete Transaction
    console.log('🗑️ Test 11: Delete Transaction');
    const deleteResult = await makeRequest('DELETE', `${API_BASE}/portfolios/${portfolioId}/transactions/${transactionId}`);
    console.log('✅ Transaction deleted:', deleteResult);
    console.log('');
    
    // Test 12: Delete Portfolio
    console.log('🗑️ Test 12: Delete Portfolio');
    const deletePortfolio = await makeRequest('DELETE', `${API_BASE}/portfolios/${portfolioId}`);
    console.log('✅ Portfolio deleted:', deletePortfolio);
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testPortfolioAPIs().catch(console.error);