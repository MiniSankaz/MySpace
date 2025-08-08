import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Create a conversation
    const conversation = await prisma.assistantConversation.create({
      data: {
        id: `test_${Date.now()}`,
        userId: 'user-123',
        sessionId: `session-test-${Date.now()}`,
        title: 'Test Conversation'
      }
    });
    console.log('✅ Created conversation:', conversation.id);
    
    // Test 2: Add messages
    const message1 = await prisma.assistantMessage.create({
      data: {
        id: `msg_test_1_${Date.now()}`,
        conversationId: conversation.id,
        content: 'สวัสดีครับ ทดสอบระบบ',
        type: 'user'
      }
    });
    console.log('✅ Created user message');
    
    const message2 = await prisma.assistantMessage.create({
      data: {
        id: `msg_test_2_${Date.now()}`,
        conversationId: conversation.id,
        content: 'สวัสดีครับ! ระบบทำงานปกติ',
        type: 'assistant'
      }
    });
    console.log('✅ Created assistant message');
    
    // Test 3: Load conversation with messages
    const loadedConversation = await prisma.assistantConversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    console.log('✅ Loaded conversation with', loadedConversation?.messages.length, 'messages');
    
    // Test 4: List all sessions for user
    const sessions = await prisma.assistantConversation.findMany({
      where: { userId: 'user-123' },
      select: { sessionId: true, title: true }
    });
    console.log('✅ Found', sessions.length, 'sessions for user-123');
    
    console.log('\n✨ All database tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();