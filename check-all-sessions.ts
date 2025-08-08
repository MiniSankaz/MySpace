import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllSessions() {
  try {
    console.log('\n📋 Checking all sessions in database...\n');
    
    const conversations = await prisma.assistantConversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${conversations.length} conversations:\n`);
    
    conversations.forEach((conv, i) => {
      console.log(`${i + 1}. Session: ${conv.sessionId}`);
      console.log(`   User: ${conv.userId}`);
      console.log(`   Title: ${conv.title || 'Untitled'}`);
      console.log(`   Messages: ${conv._count.messages}`);
      console.log(`   Last message: ${conv.messages[0]?.content?.substring(0, 50) || 'No messages'}...`);
      console.log(`   Created: ${conv.startedAt.toISOString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSessions();