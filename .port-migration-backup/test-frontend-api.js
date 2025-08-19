#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:4000';

async function testFrontendAPI() {
  console.log('🧪 Testing Frontend-Backend API Integration\n');
  
  const tests = [
    {
      name: 'Gateway Health',
      method: 'GET',
      url: `${API_URL}/health`,
    },
    {
      name: 'Portfolio List',
      method: 'GET',
      url: `${API_URL}/api/v1/portfolios`,
    },
    {
      name: 'User Login',
      method: 'POST',
      url: `${API_URL}/api/v1/auth/login`,
      data: {
        email: 'admin@personalai.com',
        password: 'Admin@2025'
      }
    },
    {
      name: 'User Profile',
      method: 'GET',
      url: `${API_URL}/api/v1/auth/profile`,
      requiresAuth: true,
    },
  ];

  let token = null;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        data: test.data,
        headers: {}
      };
      
      if (test.requiresAuth && token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios(config);
      
      console.log(`✅ ${test.name}: ${response.status}`);
      
      // Extract token from login
      if (test.name === 'User Login' && response.data.token) {
        token = response.data.token;
        console.log('   Token received:', token.substring(0, 20) + '...');
      }
      
      if (response.data) {
        console.log('   Response:', JSON.stringify(response.data).substring(0, 100));
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log('   Error:', error.response.data.message || error.response.data);
      }
    }
    console.log('');
  }
}

testFrontendAPI().catch(console.error);