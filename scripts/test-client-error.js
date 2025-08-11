#!/usr/bin/env node

/**
 * Test client-side error and terminal functionality
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:4000';

async function testLogin() {
  try {
    console.log('Testing login...');
    const response = await axios.post(`${BASE_URL}/api/ums/auth/login`, {
      emailOrUsername: 'sankaz',
      password: 'Sankaz#F752B911@2025'
    });
    
    if (response.data.accessToken) {
      console.log('✅ Login successful');
      return response.data.accessToken;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    
    // Try fallback credentials
    try {
      const response2 = await axios.post(`${BASE_URL}/api/ums/auth/login`, {
        emailOrUsername: 'admin@example.com',
        password: 'Admin@123'
      });
      
      if (response2.data.accessToken) {
        console.log('✅ Login successful with fallback credentials');
        return response2.data.accessToken;
      }
    } catch (error2) {
      console.error('❌ Fallback login also failed:', error2.message);
    }
  }
  return null;
}

async function testWorkspacePage(token) {
  try {
    console.log('Testing workspace page...');
    const response = await axios.get(`${BASE_URL}/api/workspace/files`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        depth: 1,
        projectPath: '/Users/sem4pro/Stock/port'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Workspace API accessible');
      return true;
    }
  } catch (error) {
    console.error('❌ Workspace API error:', error.message);
    return false;
  }
}

async function testTerminalAPI(token) {
  try {
    console.log('Testing terminal API...');
    const projectId = `test-${Date.now()}`;
    
    const response = await axios.post(
      `${BASE_URL}/api/workspace/projects/${projectId}/terminals`,
      {
        type: 'system',
        tabName: 'Test Terminal',
        projectPath: process.cwd()
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.id) {
      console.log('✅ Terminal session created:', response.data.id);
      return true;
    }
  } catch (error) {
    console.error('❌ Terminal API error:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Client-Side Error Testing');
  console.log('='.repeat(60));
  
  // Test login
  const token = await testLogin();
  if (!token) {
    console.error('Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Test workspace
  await testWorkspacePage(token);
  
  // Test terminal
  await testTerminalAPI(token);
  
  console.log('='.repeat(60));
  console.log('Testing complete. Check browser console for client-side errors.');
  console.log('Visit: http://127.0.0.1:4000/workspace');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});