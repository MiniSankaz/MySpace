import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSessionMessages(sessionId: string) {
  try {
    console.log(`\nChecking messages for session: ${sessionId}\n`);
    
    // Method 1: Direct query
    const conversation = await prisma.assistantConversation.findFirst({
      where: {
        sessionId: sessionId
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (conversation) {
      console.log('✅ Found conversation:');
      console.log('  ID:', conversation.id);
      console.log('  User:', conversation.userId);
      console.log('  Title:', conversation.title);
      console.log('  Messages:', conversation.messages.length);
      
      if (conversation.messages.length > 0) {
        console.log('\nMessages:');
        conversation.messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.type}]: ${msg.content.substring(0, 60)}...`);
        });
      }
    } else {
      console.log('❌ No conversation found for this sessionId');
      
      // Try to find by unique constraint
      const allConversations = await prisma.assistantConversation.findMany({
        where: {
          sessionId: { contains: sessionId.split('-')[0] }
        },
        select: {
          id: true,
          sessionId: true,
          userId: true,
          _count: { select: { messages: true } }
        }
      });
      
      console.log('\nSimilar sessions found:', allConversations.length);
      allConversations.forEach(conv => {
        console.log(`  - ${conv.sessionId} (${conv._count.messages} messages)`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get session ID from command line or use default
const sessionId = process.argv[2] || 'Test-session-list';
checkSessionMessages(sessionId);