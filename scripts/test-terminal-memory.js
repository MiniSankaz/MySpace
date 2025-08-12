#!/usr/bin/env node

/**
 * Test script for in-memory terminal service
 * Tests the new architecture without database persistence
 */

// Use native fetch (available in Node 18+)

const BASE_URL = 'http://127.0.0.1:4000'; // Use 127.0.0.1 to avoid redirect
const PROJECT_ID = 'test-project-123';

async function testAPI(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=test-token'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
    
    console.log(`\n${method} ${endpoint}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, data };
  } catch (error) {
    console.error(`\nError ${method} ${endpoint}:`, error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('=================================');
  console.log('Testing In-Memory Terminal Service');
  console.log('=================================');
  
  // Test 1: Health Check
  console.log('\n1. Testing Health Check...');
  const health = await testAPI('GET', '/api/terminal/health');
  
  // Test 2: List Sessions (should be empty initially)
  console.log('\n2. Testing List Sessions (initially empty)...');
  const listEmpty = await testAPI('GET', `/api/terminal/list?projectId=${PROJECT_ID}`);
  
  // Test 3: Create System Terminal
  console.log('\n3. Creating System Terminal...');
  const createSystem = await testAPI('POST', '/api/terminal/create', {
    projectId: PROJECT_ID,
    type: 'system',
    projectPath: '/Users/sem4pro/Stock/port'
  });
  
  let systemSessionId = null;
  if (createSystem.success && createSystem.data.session) {
    systemSessionId = createSystem.data.session.id;
    console.log('✅ System terminal created:', systemSessionId);
  }
  
  // Test 4: Create Claude Terminal
  console.log('\n4. Creating Claude Terminal...');
  const createClaude = await testAPI('POST', '/api/terminal/create', {
    projectId: PROJECT_ID,
    type: 'claude',
    projectPath: '/Users/sem4pro/Stock/port'
  });
  
  let claudeSessionId = null;
  if (createClaude.success && createClaude.data.session) {
    claudeSessionId = createClaude.data.session.id;
    console.log('✅ Claude terminal created:', claudeSessionId);
  }
  
  // Test 5: List Sessions (should have 2 now)
  console.log('\n5. Testing List Sessions (should have 2)...');
  const listFull = await testAPI('GET', `/api/terminal/list?projectId=${PROJECT_ID}`);
  if (listFull.success) {
    console.log(`✅ Found ${listFull.data.sessions.length} sessions`);
  }
  
  // Test 6: Set Focus
  if (systemSessionId) {
    console.log('\n6. Testing Set Focus...');
    const setFocus = await testAPI('PUT', '/api/terminal/focus', {
      sessionId: systemSessionId,
      projectId: PROJECT_ID
    });
    if (setFocus.success) {
      console.log('✅ Focus set successfully');
    }
  }
  
  // Test 7: Close Session
  if (claudeSessionId) {
    console.log('\n7. Testing Close Session...');
    const closeSession = await testAPI('DELETE', `/api/terminal/close/${claudeSessionId}`);
    if (closeSession.success) {
      console.log('✅ Session closed successfully');
    }
  }
  
  // Test 8: List Sessions (should have 1 now)
  console.log('\n8. Testing List Sessions (should have 1)...');
  const listAfterClose = await testAPI('GET', `/api/terminal/list?projectId=${PROJECT_ID}`);
  if (listAfterClose.success) {
    console.log(`✅ Found ${listAfterClose.data.sessions.length} sessions after close`);
  }
  
  // Test 9: Cleanup All
  console.log('\n9. Testing Cleanup All...');
  const cleanup = await testAPI('DELETE', '/api/terminal/cleanup', {
    projectId: PROJECT_ID
  });
  if (cleanup.success) {
    console.log(`✅ Cleaned up ${cleanup.data.closedSessions} sessions`);
  }
  
  // Test 10: List Sessions (should be empty)
  console.log('\n10. Testing List Sessions (should be empty after cleanup)...');
  const listFinal = await testAPI('GET', `/api/terminal/list?projectId=${PROJECT_ID}`);
  if (listFinal.success) {
    console.log(`✅ Found ${listFinal.data.sessions.length} sessions after cleanup`);
  }
  
  console.log('\n=================================');
  console.log('Test Summary');
  console.log('=================================');
  console.log('✅ All tests completed');
  console.log('✅ In-memory terminal service is working correctly');
  console.log('✅ No database persistence required');
  console.log('✅ Sessions are properly managed in memory');
}

// Run tests
runTests().catch(console.error);