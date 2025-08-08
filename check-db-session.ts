import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSession(sessionId: string) {
  try {
    console.log(`\nChecking session: ${sessionId}\n`);
    
    // Find conversation
    const conversation = await prisma.assistantConversation.findFirst({
      where: {
        sessionId: sessionId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (conversation) {
      console.log('✅ Found conversation in database!');
      console.log('  - ID:', conversation.id);
      console.log('  - User:', conversation.userId);
      console.log('  - Started:', conversation.startedAt);
      console.log('  - Messages:', conversation.messages.length);
      
      if (conversation.messages.length > 0) {
        console.log('\nMessages:');
        conversation.messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.type}]: ${msg.content.substring(0, 60)}...`);
        });
      }
    } else {
      console.log('❌ No conversation found for this session');
    }
    
    // Show all recent conversations
    console.log('\n📋 Recent conversations:');
    const recent = await prisma.assistantConversation.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      include: {
        messages: true
      }
    });
    
    recent.forEach((conv) => {
      console.log(`  - ${conv.sessionId}: ${conv.messages.length} messages`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get session ID from command line or use default
const sessionId = process.argv[2] || 'db-test-1754564447';
checkSession(sessionId);