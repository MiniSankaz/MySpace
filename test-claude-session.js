const { ClaudeSessionManager } = require('./dist/services/claude-session-manager.service');

async function testClaudeSession() {
  console.log('🧪 Testing Claude Session Manager...\n');
  
  const sessionManager = ClaudeSessionManager.getInstance();
  const sessionId = 'test-session-' + Date.now();
  
  try {
    console.log('📌 Test 1: Creating new session');
    const service = await sessionManager.getOrCreateSession(sessionId);
    console.log('✅ Session created successfully\n');
    
    console.log('📌 Test 2: Sending message to session');
    const response1 = await sessionManager.sendMessageToSession(
      sessionId, 
      'สวัสดี คุณใช้ Claude session แบบ background ใช่ไหม?'
    );
    console.log('✅ Response 1:', response1.substring(0, 100) + '...\n');
    
    console.log('📌 Test 3: Sending follow-up message (same session)');
    const response2 = await sessionManager.sendMessageToSession(
      sessionId,
      'คุณจำข้อความก่อนหน้าของฉันได้ไหม?'
    );
    console.log('✅ Response 2:', response2.substring(0, 100) + '...\n');
    
    console.log('📌 Test 4: Getting session info');
    const sessionInfo = sessionManager.getSessionInfo(sessionId);
    console.log('Session Info:', {
      sessionId: sessionInfo.sessionId,
      createdAt: sessionInfo.createdAt,
      lastActivity: sessionInfo.lastActivity
    });
    console.log('✅ Active sessions count:', sessionManager.getActiveSessionCount());
    
    console.log('\n📌 Test 5: Cleaning up session');
    await sessionManager.removeSession(sessionId);
    console.log('✅ Session removed successfully');
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testClaudeSession();