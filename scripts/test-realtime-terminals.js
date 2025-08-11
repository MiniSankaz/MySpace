#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔍 Testing Real-time Terminal Streaming with Multiple Terminals');
console.log('=' .repeat(80));

// Test configuration
const TEST_CONFIG = {
  terminalServerPort: 4001,
  claudeServerPort: 4002,
  numTerminals: 3,
  testDuration: 10000, // 10 seconds
  commandInterval: 2000, // Send command every 2 seconds
};

// Global state
let activeSockets = [];
let testResults = {
  totalConnections: 0,
  successfulConnections: 0,
  messagesReceived: 0,
  realTimeResponses: 0,
  backgroundActivity: 0,
};

// Test commands that produce output
const TEST_COMMANDS = [
  'echo "Terminal $(date +%T): Hello from terminal!"',
  'ls -la',
  'pwd',
  'echo "Current time: $(date)"',
  'echo "Process ID: $$"',
];

// Create a terminal WebSocket connection
function createTerminalConnection(sessionId, projectId, type = 'system') {
  const port = type === 'system' ? TEST_CONFIG.terminalServerPort : TEST_CONFIG.claudeServerPort;
  const params = new URLSearchParams({
    projectId,
    sessionId,
    path: process.cwd(),
    token: 'test-token',
  });

  const wsUrl = `ws://127.0.0.1:${port}/?${params.toString()}`;
  console.log(`🔌 Connecting ${type} terminal: ${sessionId} to ${wsUrl}`);

  const ws = new WebSocket(wsUrl);
  const terminal = {
    id: sessionId,
    type,
    ws,
    connected: false,
    messagesReceived: 0,
    lastMessageTime: null,
    isActive: false,
  };

  testResults.totalConnections++;

  ws.on('open', () => {
    console.log(`✅ ${type.toUpperCase()} Terminal ${sessionId} connected`);
    terminal.connected = true;
    testResults.successfulConnections++;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      terminal.messagesReceived++;
      terminal.lastMessageTime = Date.now();
      testResults.messagesReceived++;

      switch (message.type) {
        case 'connected':
        case 'reconnected':
          console.log(`🟢 ${terminal.id}: Session established`);
          break;
        case 'stream':
          console.log(`📨 ${terminal.id}: Output received (${message.data.length} chars)`);
          testResults.realTimeResponses++;
          
          // Check if this is background activity (terminal not currently "active")
          if (!terminal.isActive) {
            testResults.backgroundActivity++;
            console.log(`🔄 ${terminal.id}: Background activity detected`);
          }
          break;
        case 'error':
          console.error(`❌ ${terminal.id}: Error - ${message.message}`);
          break;
        case 'exit':
          console.log(`🚪 ${terminal.id}: Process exited with code ${message.code}`);
          break;
      }
    } catch (error) {
      console.error(`❌ ${terminal.id}: Failed to parse message:`, error.message);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ ${terminal.id}: WebSocket error:`, error.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 ${terminal.id}: Connection closed (${code}): ${reason}`);
    terminal.connected = false;
  });

  return terminal;
}

// Send command to terminal
function sendCommand(terminal, command) {
  if (!terminal.connected || terminal.ws.readyState !== WebSocket.OPEN) {
    console.warn(`⚠️ ${terminal.id}: Cannot send command - not connected`);
    return false;
  }

  console.log(`⌨️ ${terminal.id}: Sending command: ${command}`);
  terminal.ws.send(JSON.stringify({
    type: 'input',
    data: command + '\r'
  }));
  return true;
}

// Simulate switching active terminal (for background activity testing)
function switchActiveTerminal(terminals) {
  // Mark all as inactive
  terminals.forEach(t => t.isActive = false);
  
  // Pick a random terminal to be active
  const activeIndex = Math.floor(Math.random() * terminals.length);
  terminals[activeIndex].isActive = true;
  
  console.log(`🎯 Active terminal switched to: ${terminals[activeIndex].id}`);
}

// Main test function
async function runRealtimeStreamingTest() {
  console.log('🚀 Starting real-time streaming test...\n');

  // Create multiple terminals
  const terminals = [];
  
  // Create system terminals
  for (let i = 1; i <= TEST_CONFIG.numTerminals; i++) {
    const terminal = createTerminalConnection(
      `test_system_${i}_${Date.now()}`,
      'test-project-1',
      'system'
    );
    terminals.push(terminal);
  }

  // Create Claude terminals
  for (let i = 1; i <= TEST_CONFIG.numTerminals; i++) {
    const terminal = createTerminalConnection(
      `test_claude_${i}_${Date.now()}`,
      'test-project-1',
      'claude'
    );
    terminals.push(terminal);
  }

  activeSockets = terminals;

  // Wait for connections
  console.log('\n⏳ Waiting for connections to establish...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start the test
  console.log('\n🧪 Starting parallel command execution test...');
  
  const testInterval = setInterval(() => {
    // Switch active terminal randomly
    switchActiveTerminal(terminals);
    
    // Send commands to all terminals simultaneously
    terminals.forEach((terminal, index) => {
      const command = TEST_COMMANDS[index % TEST_COMMANDS.length];
      sendCommand(terminal, command);
    });
  }, TEST_CONFIG.commandInterval);

  // Run test for specified duration
  setTimeout(() => {
    console.log('\n⏹️ Stopping test...');
    clearInterval(testInterval);
    
    // Close all connections
    terminals.forEach(terminal => {
      if (terminal.ws.readyState === WebSocket.OPEN) {
        terminal.ws.close();
      }
    });

    // Print results
    setTimeout(() => {
      printTestResults();
      process.exit(0);
    }, 1000);
  }, TEST_CONFIG.testDuration);
}

// Print test results
function printTestResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 REAL-TIME STREAMING TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`🔌 Total Connections Attempted: ${testResults.totalConnections}`);
  console.log(`✅ Successful Connections: ${testResults.successfulConnections}`);
  console.log(`📨 Total Messages Received: ${testResults.messagesReceived}`);
  console.log(`⚡ Real-time Responses: ${testResults.realTimeResponses}`);
  console.log(`🔄 Background Activity Events: ${testResults.backgroundActivity}`);
  
  const connectionRate = (testResults.successfulConnections / testResults.totalConnections) * 100;
  console.log(`📈 Connection Success Rate: ${connectionRate.toFixed(1)}%`);
  
  // Per-terminal stats
  console.log('\n📋 Per-Terminal Statistics:');
  activeSockets.forEach(terminal => {
    console.log(`  ${terminal.id}: ${terminal.messagesReceived} messages received, ` +
                `Last: ${terminal.lastMessageTime ? new Date(terminal.lastMessageTime).toLocaleTimeString() : 'None'}`);
  });

  // Success criteria
  console.log('\n🎯 SUCCESS CRITERIA:');
  const criteria = [
    { name: 'All terminals connect successfully', 
      passed: testResults.successfulConnections === testResults.totalConnections,
      result: `${testResults.successfulConnections}/${testResults.totalConnections}` },
    { name: 'Real-time responses received', 
      passed: testResults.realTimeResponses > 0,
      result: testResults.realTimeResponses },
    { name: 'Background activity detected', 
      passed: testResults.backgroundActivity > 0,
      result: testResults.backgroundActivity },
    { name: 'Multiple terminals responsive', 
      passed: activeSockets.filter(t => t.messagesReceived > 0).length >= TEST_CONFIG.numTerminals,
      result: `${activeSockets.filter(t => t.messagesReceived > 0).length}/${TEST_CONFIG.numTerminals * 2}` },
  ];

  criteria.forEach(criterion => {
    const status = criterion.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${criterion.name}: ${criterion.result}`);
  });

  const allPassed = criteria.every(c => c.passed);
  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? 
    '🎉 ALL TESTS PASSED - Real-time streaming is working correctly!' :
    '❌ SOME TESTS FAILED - Real-time streaming needs attention'
  );
  console.log('='.repeat(80));
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  activeSockets.forEach(terminal => {
    if (terminal.ws.readyState === WebSocket.OPEN) {
      terminal.ws.close();
    }
  });
  printTestResults();
  process.exit(0);
});

// Run the test
runRealtimeStreamingTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});