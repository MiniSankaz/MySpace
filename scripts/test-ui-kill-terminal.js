#!/usr/bin/env node

/**
 * Test UI Terminal Kill Button Integration
 * ทดสอบการทำงานของปุ่ม Kill terminal ผ่าน UI flow จริง
 */

const WebSocket = require('ws');

// Configuration
const SYSTEM_WS_URL = 'ws://localhost:4001';
const CLAUDE_WS_URL = 'ws://localhost:4002';
const TEST_PROJECT_ID = 'ui_test_project';

console.log('🧪 Testing UI Terminal Kill Button Integration');
console.log('=' .repeat(50));
console.log('This test simulates the actual UI flow:\n');
console.log('1. Create terminal session');
console.log('2. Send commands');  
console.log('3. Close with code 1000 (UI Kill button)');
console.log('4. Verify process is killed');
console.log('=' .repeat(50) + '\n');

let testResults = {
  systemTerminal: false,
  claudeTerminal: false
};

async function testSystemTerminal() {
  return new Promise((resolve) => {
    console.log('\n📦 Testing SYSTEM Terminal:');
    console.log('-'.repeat(30));
    
    const sessionId = `ui_system_test_${Date.now()}`;
    const ws = new WebSocket(`${SYSTEM_WS_URL}?sessionId=${sessionId}&projectId=${TEST_PROJECT_ID}`);
    
    ws.on('open', () => {
      console.log('✅ Connected to System Terminal');
      
      // Send test command
      setTimeout(() => {
        console.log('📝 Sending test command...');
        ws.send(JSON.stringify({
          type: 'input',
          data: 'echo "System Terminal Active"\r'
        }));
      }, 500);
      
      // Simulate UI Kill button (close with code 1000)
      setTimeout(() => {
        console.log('🔴 Simulating UI Kill button click...');
        ws.close(1000, 'Session closed by user');
      }, 1500);
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'stream' && msg.data.includes('System Terminal Active')) {
        console.log('✅ Command executed successfully');
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`📴 WebSocket closed: code=${code}, reason="${reason}"`);
      
      // Try to reconnect to verify session was killed
      setTimeout(() => {
        const ws2 = new WebSocket(`${SYSTEM_WS_URL}?sessionId=${sessionId}&projectId=${TEST_PROJECT_ID}`);
        
        ws2.on('open', () => {
          console.log('🔄 Reconnection attempt...');
        });
        
        ws2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            console.log('✅ NEW session created (old process was killed)');
            testResults.systemTerminal = true;
          } else if (msg.type === 'reconnected') {
            console.log('❌ RECONNECTED to old session (process NOT killed)');
            testResults.systemTerminal = false;
          }
          ws2.close();
          resolve();
        });
        
        ws2.on('error', () => {
          console.log('❌ Failed to reconnect');
          resolve();
        });
      }, 1000);
    });
    
    ws.on('error', (err) => {
      console.error('❌ Error:', err.message);
      resolve();
    });
  });
}

async function testClaudeTerminal() {
  return new Promise((resolve) => {
    console.log('\n🤖 Testing CLAUDE Terminal:');
    console.log('-'.repeat(30));
    
    const sessionId = `ui_claude_test_${Date.now()}`;
    const ws = new WebSocket(`${CLAUDE_WS_URL}?sessionId=${sessionId}&projectId=${TEST_PROJECT_ID}`);
    
    ws.on('open', () => {
      console.log('✅ Connected to Claude Terminal');
      
      // Send test command
      setTimeout(() => {
        console.log('📝 Sending test command...');
        ws.send(JSON.stringify({
          type: 'input',
          data: 'echo "Claude Terminal Active"\r'
        }));
      }, 500);
      
      // Simulate UI Kill button (close with code 1000)
      setTimeout(() => {
        console.log('🔴 Simulating UI Kill button click...');
        ws.close(1000, 'Session closed by user');
      }, 1500);
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'stream' && msg.data.includes('Claude Terminal Active')) {
        console.log('✅ Command executed successfully');
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`📴 WebSocket closed: code=${code}, reason="${reason}"`);
      
      // Try to reconnect to verify session was killed
      setTimeout(() => {
        const ws2 = new WebSocket(`${CLAUDE_WS_URL}?sessionId=${sessionId}&projectId=${TEST_PROJECT_ID}`);
        
        ws2.on('open', () => {
          console.log('🔄 Reconnection attempt...');
        });
        
        ws2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            console.log('✅ NEW session created (old process was killed)');
            testResults.claudeTerminal = true;
          } else if (msg.type === 'reconnected') {
            console.log('❌ RECONNECTED to old session (process NOT killed)');
            testResults.claudeTerminal = false;
          }
          ws2.close();
          resolve();
        });
        
        ws2.on('error', () => {
          console.log('❌ Failed to reconnect');
          resolve();
        });
      }, 1000);
    });
    
    ws.on('error', (err) => {
      console.error('❌ Error:', err.message);
      resolve();
    });
  });
}

async function runTests() {
  console.log('🚀 Starting UI Integration Tests...\n');
  
  // Test both terminals
  await testSystemTerminal();
  await testClaudeTerminal();
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(50));
  
  console.log(`System Terminal Kill: ${testResults.systemTerminal ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Claude Terminal Kill: ${testResults.claudeTerminal ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = testResults.systemTerminal && testResults.claudeTerminal;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('The Kill button is working correctly for both terminals.');
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('The Kill button may not be working properly.');
    console.log('\nDebug tips:');
    console.log('1. Check if multiplexer is initialized in TerminalContainer');
    console.log('2. Verify handleCloseSession calls multiplexer.closeSession()');
    console.log('3. Check browser console for errors');
    console.log('4. Check server logs for close codes received');
  }
  console.log('='.repeat(50));
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(console.error);