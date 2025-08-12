const WebSocket = require('ws');

// Test Git WebSocket connection
async function testGitWebSocket() {
  console.log('Testing Git WebSocket connection...');
  
  // Test project ID (you may need to adjust this)
  const projectId = 'test-project-123';
  const wsUrl = `ws://localhost:4001/git/${projectId}`;
  
  console.log(`Connecting to: ${wsUrl}`);
  
  const ws = new WebSocket(wsUrl);
  let messageCount = 0;
  let connectionAttempts = 0;
  
  ws.on('open', () => {
    connectionAttempts++;
    console.log(`✅ WebSocket connected (attempt ${connectionAttempts})`);
    
    // Send subscribe message
    ws.send(JSON.stringify({
      type: 'subscribe',
      projectId: projectId,
      projectPath: '/Users/sem4pro/Stock/port'
    }));
    
    // Close after 10 seconds to test cleanup
    setTimeout(() => {
      console.log('Closing connection...');
      ws.close();
    }, 10000);
  });
  
  ws.on('message', (data) => {
    messageCount++;
    const message = JSON.parse(data.toString());
    console.log(`📨 Message ${messageCount}:`, message.type);
    
    if (messageCount > 10) {
      console.warn('⚠️ Too many messages - possible loop detected!');
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', (code, reason) => {
    console.log(`WebSocket closed: code=${code}, reason=${reason}`);
    console.log(`Total messages received: ${messageCount}`);
    console.log(`Total connection attempts: ${connectionAttempts}`);
    
    if (connectionAttempts > 3) {
      console.error('❌ FAIL: Too many connection attempts - loop detected!');
    } else {
      console.log('✅ PASS: No connection loop detected');
    }
  });
}

// Run test
testGitWebSocket().catch(console.error);