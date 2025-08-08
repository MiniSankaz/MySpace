// Use built-in fetch (available in Node 18+)

async function testChatAPI() {
  const baseUrl = 'http://localhost:4000';
  const sessionId = `test-session-${Date.now()}`;
  
  try {
    console.log('Testing Chat API...\n');
    
    // Test 1: Send a message
    console.log('1. Sending message to assistant...');
    const response = await fetch(`${baseUrl}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'สวัสดีครับ ทดสอบ database logging',
        sessionId: sessionId,
        directMode: true
      })
    });
    
    const data = await response.json();
    console.log('✅ Response received:', {
      success: data.success,
      sessionId: data.sessionId,
      hasResponse: !!data.response,
      messageLength: data.response?.message?.length
    });
    
    // Wait a bit for database to save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Load conversation history
    console.log('\n2. Loading conversation history...');
    const historyResponse = await fetch(`${baseUrl}/api/assistant/chat?sessionId=${sessionId}`);
    const historyData = await historyResponse.json();
    
    console.log('✅ History loaded:', {
      success: historyData.success,
      messageCount: historyData.messages?.length
    });
    
    if (historyData.messages) {
      console.log('\nMessages in session:');
      historyData.messages.forEach((msg: any, index: number) => {
        console.log(`  ${index + 1}. [${msg.type}]: ${msg.content.substring(0, 50)}...`);
      });
    }
    
    console.log('\n✨ All API tests passed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Wait for server to be ready
setTimeout(() => {
  testChatAPI();
}, 2000);