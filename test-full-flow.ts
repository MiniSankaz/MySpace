import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFullFlow() {
  try {
    const userId = 'user-123'; // This user was created in seed
    const sessionId = `flow-test-${Date.now()}`;
    
    console.log('Testing full flow with existing user...\n');
    
    // 1. Send message via API
    console.log('1. Sending message to API...');
    const response = await fetch('http://localhost:4000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'สวัสดีครับ นี่คือการทดสอบ database',
        sessionId: sessionId,
        directMode: false
      })
    });
    
    const data = await response.json();
    console.log('✅ API Response:', {
      success: data.success,
      sessionId: data.sessionId,
      hasResponse: !!data.response
    });
    
    // 2. Wait for async save
    console.log('\n2. Waiting for database save...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Check database directly
    console.log('\n3. Checking database directly...');
    const conversation = await prisma.assistantConversation.findFirst({
      where: {
        sessionId: sessionId
      },
      include: {
        messages: true
      }
    });
    
    if (conversation) {
      console.log('✅ Found conversation in database!');
      console.log('  - Messages:', conversation.messages.length);
      conversation.messages.forEach((msg, i) => {
        console.log(`    ${i + 1}. [${msg.type}]: ${msg.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Conversation not found in database');
      
      // Debug: Show what's in the database
      console.log('\n📊 Database state:');
      const allConversations = await prisma.assistantConversation.count();
      const allMessages = await prisma.assistantMessage.count();
      console.log(`  - Total conversations: ${allConversations}`);
      console.log(`  - Total messages: ${allMessages}`);
    }
    
    // 4. Load via API
    console.log('\n4. Loading history via API...');
    const historyResponse = await fetch(`http://localhost:4000/api/assistant/chat?sessionId=${sessionId}`);
    const historyData = await historyResponse.json();
    
    console.log('✅ API History:', {
      success: historyData.success,
      messageCount: historyData.messages?.length
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Wait for server to be ready
setTimeout(() => {
  testFullFlow();
}, 2000);