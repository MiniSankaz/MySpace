#!/usr/bin/env node

/**
 * Basic WebSocket Terminal Testing (No Authentication Required)
 * Tests direct WebSocket connections to System and Claude terminals
 */

const WebSocket = require('ws');

// Test Configuration
const CONFIG = {
  SYSTEM_TERMINAL_PORT: 4001,
  CLAUDE_TERMINAL_PORT: 4002,
  TEST_PROJECT_ID: 'test-project-12345',
  TEST_USER_ID: 'test-user',
  TIMEOUT: 30000,
};

// Test Results
const RESULTS = {
  systemTerminal: [],
  claudeTerminal: [],
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomId() {
  return Math.random().toString(36).substr(2, 9);
}

function createWebSocket(port, sessionId = null, projectId = CONFIG.TEST_PROJECT_ID) {
  const wsUrl = `ws://127.0.0.1:${port}/?projectId=${projectId}&sessionId=${sessionId || `session_${Date.now()}_${randomId()}`}&userId=${CONFIG.TEST_USER_ID}`;
  console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
  return new WebSocket(wsUrl);
}

// Test System Terminal
async function testSystemTerminal() {
  return new Promise((resolve, reject) => {
    console.log('\n🖥️  Testing System Terminal...');
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('System terminal test timeout'));
    }, CONFIG.TIMEOUT);
    
    const ws = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT);
    let connected = false;
    let commandSent = false;
    let outputReceived = false;
    
    ws.on('open', () => {
      console.log('✅ System terminal WebSocket opened');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 System terminal message:', message.type);
        
        if (message.type === 'connected') {
          connected = true;
          console.log('✅ System terminal connected successfully');
          
          // Send a test command
          setTimeout(() => {
            console.log('📤 Sending test command: pwd');
            ws.send(JSON.stringify({ type: 'input', data: 'pwd\r' }));
            commandSent = true;
          }, 1000);
        } else if (message.type === 'stream' && commandSent) {
          outputReceived = true;
          console.log('📥 Command output received:', message.data.substring(0, 100));
          
          // Test passed
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            RESULTS.systemTerminal.push({
              test: 'Connection and Command Execution',
              status: 'PASS',
              details: { connected, commandSent, outputReceived }
            });
            resolve(true);
          }, 2000);
        }
      } catch (error) {
        console.error('Error parsing system terminal message:', error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ System terminal error:', error.message);
      RESULTS.systemTerminal.push({
        test: 'Connection and Command Execution',
        status: 'FAIL',
        error: error.message
      });
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`📊 System terminal closed: ${code} ${reason?.toString()}`);
    });
  });
}

// Test Claude Terminal
async function testClaudeTerminal() {
  return new Promise((resolve, reject) => {
    console.log('\n🤖 Testing Claude Terminal...');
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Claude terminal test timeout'));
    }, CONFIG.TIMEOUT);
    
    const ws = createWebSocket(CONFIG.CLAUDE_TERMINAL_PORT);
    let connected = false;
    let claudeStarted = false;
    
    ws.on('open', () => {
      console.log('✅ Claude terminal WebSocket opened');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 Claude terminal message:', message.type);
        
        if (message.type === 'connected') {
          connected = true;
          console.log('✅ Claude terminal connected successfully');
          console.log('⏳ Waiting for Claude CLI to start...');
        } else if (message.type === 'stream') {
          console.log('📥 Claude output:', message.data.substring(0, 100));
          
          if (message.data.includes('Claude>') || message.data.includes('Starting Claude')) {
            claudeStarted = true;
            console.log('🤖 Claude CLI detected!');
            
            // Test passed
            setTimeout(() => {
              clearTimeout(timeout);
              ws.close();
              RESULTS.claudeTerminal.push({
                test: 'Connection and Claude CLI Startup',
                status: 'PASS',
                details: { connected, claudeStarted }
              });
              resolve(true);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error parsing Claude terminal message:', error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Claude terminal error:', error.message);
      RESULTS.claudeTerminal.push({
        test: 'Connection and Claude CLI Startup',
        status: 'FAIL',
        error: error.message
      });
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`📊 Claude terminal closed: ${code} ${reason?.toString()}`);
    });
  });
}

// Test Multiple Connections
async function testMultipleConnections() {
  console.log('\n🔄 Testing Multiple Simultaneous Connections...');
  
  const promises = [];
  
  // Create 2 system terminals
  for (let i = 0; i < 2; i++) {
    promises.push(new Promise((resolve) => {
      const ws = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT, `multi_system_${i}`);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'connected') {
            console.log(`✅ System terminal ${i} connected`);
            ws.close();
            resolve(`system_${i}`);
          }
        } catch (error) {
          console.error(`Error in system ${i}:`, error);
        }
      });
      
      ws.on('error', (error) => {
        console.error(`❌ System terminal ${i} failed:`, error.message);
        resolve(null);
      });
    }));
  }
  
  // Create 2 Claude terminals
  for (let i = 0; i < 2; i++) {
    promises.push(new Promise((resolve) => {
      const ws = createWebSocket(CONFIG.CLAUDE_TERMINAL_PORT, `multi_claude_${i}`);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'connected') {
            console.log(`✅ Claude terminal ${i} connected`);
            ws.close();
            resolve(`claude_${i}`);
          }
        } catch (error) {
          console.error(`Error in Claude ${i}:`, error);
        }
      });
      
      ws.on('error', (error) => {
        console.error(`❌ Claude terminal ${i} failed:`, error.message);
        resolve(null);
      });
    }));
  }
  
  try {
    const results = await Promise.all(promises);
    const successful = results.filter(r => r !== null);
    
    console.log(`📊 Multiple connections result: ${successful.length}/4 successful`);
    
    RESULTS.systemTerminal.push({
      test: 'Multiple Simultaneous Connections',
      status: successful.length >= 3 ? 'PASS' : 'FAIL',
      details: { successful: successful.length, total: 4, connections: successful }
    });
    
    return successful.length >= 3;
  } catch (error) {
    console.error('❌ Multiple connections test failed:', error);
    return false;
  }
}

// Generate Report
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 WEBSOCKET TERMINAL TEST REPORT');
  console.log('='.repeat(60));
  
  const allTests = [...RESULTS.systemTerminal, ...RESULTS.claudeTerminal];
  const passedTests = allTests.filter(t => t.status === 'PASS');
  const failedTests = allTests.filter(t => t.status === 'FAIL');
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${allTests.length}`);
  console.log(`   ✅ Passed: ${passedTests.length}`);
  console.log(`   ❌ Failed: ${failedTests.length}`);
  console.log(`   📈 Success Rate: ${((passedTests.length / allTests.length) * 100).toFixed(1)}%`);
  
  console.log(`\n🖥️  SYSTEM TERMINAL RESULTS:`);
  RESULTS.systemTerminal.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`      Details: ${JSON.stringify(result.details)}`);
    }
  });
  
  console.log(`\n🤖 CLAUDE TERMINAL RESULTS:`);
  RESULTS.claudeTerminal.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`      Details: ${JSON.stringify(result.details)}`);
    }
  });
  
  return {
    totalTests: allTests.length,
    passed: passedTests.length,
    failed: failedTests.length,
    details: RESULTS
  };
}

// Main execution
async function runTests() {
  console.log('🚀 Starting WebSocket Terminal Tests');
  console.log('⏰ Start Time:', new Date().toISOString());
  
  try {
    // Test System Terminal
    await testSystemTerminal();
    await delay(2000);
    
    // Test Claude Terminal
    await testClaudeTerminal();
    await delay(2000);
    
    // Test Multiple Connections
    await testMultipleConnections();
    
  } catch (error) {
    console.error('💥 Test execution error:', error.message);
  } finally {
    console.log('\n⏰ End Time:', new Date().toISOString());
    const report = generateReport();
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/sem4pro/Stock/port/scripts/websocket-test-report.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ...report
      }, null, 2)
    );
    
    console.log('\n📄 Report saved to: scripts/websocket-test-report.json');
    process.exit(report.failed > 0 ? 1 : 0);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests, RESULTS };