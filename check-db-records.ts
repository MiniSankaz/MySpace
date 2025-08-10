import { prisma } from './src/core/database/prisma';

async function checkDatabaseRecords() {
  console.log('🔍 Checking Database Records...\n');
  
  try {
    // Check AssistantChatSession records
    console.log('📊 Assistant Chat Sessions:');
    const sessions = await prisma.assistantChatSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });
    
    if (sessions.length === 0) {
      console.log('   No sessions found');
    } else {
      sessions.forEach(session => {
        console.log(`   - Session: ${session.id}`);
        console.log(`     Name: ${session.sessionName || 'Unnamed'}`);
        console.log(`     Messages: ${session._count.messages}`);
        console.log(`     Created: ${session.createdAt}`);
        console.log(`     Model: ${session.model}`);
        console.log('');
      });
    }
    
    // Check recent messages
    console.log('📝 Recent Assistant Chat Messages:');
    const messages = await prisma.assistantChatMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        sessionId: true,
        role: true,
        content: true,
        timestamp: true,
        tokensUsed: true
      }
    });
    
    if (messages.length === 0) {
      console.log('   No messages found');
    } else {
      messages.forEach(msg => {
        const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`   - [${msg.role}] ${preview}...`);
        console.log(`     Session: ${msg.sessionId}`);
        console.log(`     Time: ${msg.timestamp}`);
        console.log(`     Tokens: ${msg.tokensUsed || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check Terminal sessions
    console.log('🖥️  Terminal Sessions:');
    const terminalSessions = await prisma.terminalSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { commands: true }
        }
      }
    });
    
    if (terminalSessions.length === 0) {
      console.log('   No terminal sessions found');
    } else {
      terminalSessions.forEach(session => {
        console.log(`   - Project: ${session.projectId}`);
        console.log(`     Commands: ${session._count.commands}`);
        console.log(`     Created: ${session.createdAt}`);
        console.log('');
      });
    }
    
    // Check Login History
    console.log('🔐 Recent Login History:');
    const logins = await prisma.loginHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        userId: true,
        ipAddress: true,
        success: true,
        createdAt: true,
        failureReason: true
      }
    });
    
    if (logins.length === 0) {
      console.log('   No login history found');
    } else {
      logins.forEach(login => {
        const status = login.success ? '✅' : '❌';
        console.log(`   ${status} User: ${login.userId || 'Unknown'}`);
        console.log(`     IP: ${login.ipAddress}`);
        console.log(`     Time: ${login.createdAt}`);
        if (!login.success && login.failureReason) {
          console.log(`     Reason: ${login.failureReason}`);
        }
        console.log('');
      });
    }
    
    // Summary statistics
    console.log('📈 Summary Statistics:');
    const totalSessions = await prisma.assistantChatSession.count();
    const totalMessages = await prisma.assistantChatMessage.count();
    const totalTerminalCommands = await prisma.terminalCommand.count();
    const totalUsers = await prisma.user.count();
    
    console.log(`   Total Chat Sessions: ${totalSessions}`);
    console.log(`   Total Chat Messages: ${totalMessages}`);
    console.log(`   Total Terminal Commands: ${totalTerminalCommands}`);
    console.log(`   Total Users: ${totalUsers}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseRecords();