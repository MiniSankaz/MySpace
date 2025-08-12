const WebSocket = require('ws');

// Test multiple terminal spawns
async function testTerminalSpawns() {
  const terminals = [];
  const numTerminals = 5;
  
  console.log(`Testing ${numTerminals} terminal connections...`);
  
  // Create multiple terminals quickly
  for (let i = 0; i < numTerminals; i++) {
    const sessionId = `test_session_${Date.now()}_${i}`;
    const wsUrl = `ws://localhost:4001?sessionId=${sessionId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log(`✅ Terminal ${i+1} connected (${sessionId})`);
      
      // Send a test command
      ws.send(JSON.stringify({
        type: 'input',
        data: 'echo "Terminal test ' + i + '"\r\n'
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'error') {
        console.error(`❌ Terminal ${i+1} error:`, msg.message);
      } else if (msg.type === 'connected') {
        console.log(`✅ Terminal ${i+1} ready`);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`❌ Terminal ${i+1} WebSocket error:`, error.message);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`Terminal ${i+1} closed: code=${code}, reason=${reason}`);
    });
    
    terminals.push(ws);
    
    // Small delay between connections
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Keep connections open for 5 seconds
  setTimeout(() => {
    console.log('\nClosing all terminals...');
    terminals.forEach((ws, i) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000); // Normal close
      }
    });
    
    // Test page refresh scenario
    setTimeout(() => {
      console.log('\nTesting page refresh scenario...');
      const refreshWs = new WebSocket(`ws://localhost:4001?sessionId=refresh_test_${Date.now()}`);
      
      refreshWs.on('open', () => {
        console.log('✅ Refresh test terminal connected');
        
        // Simulate page refresh after 1 second
        setTimeout(() => {
          console.log('Simulating page refresh (code 1001)...');
          refreshWs.close(1001); // Going away
        }, 1000);
      });
      
      refreshWs.on('close', (code) => {
        console.log(`Refresh test closed with code ${code}`);
        
        // Try to reconnect with same session
        setTimeout(() => {
          console.log('Attempting reconnection...');
          const reconnectWs = new WebSocket(`ws://localhost:4001?sessionId=refresh_test_${Date.now()}`);
          
          reconnectWs.on('open', () => {
            console.log('✅ Reconnection successful!');
            reconnectWs.close(1000);
          });
          
          reconnectWs.on('error', (error) => {
            console.error('❌ Reconnection failed:', error.message);
          });
        }, 500);
      });
    }, 2000);
    
  }, 5000);
}

// Run test
testTerminalSpawns().catch(console.error);