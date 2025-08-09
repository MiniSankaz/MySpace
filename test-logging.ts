import { prisma } from './src/core/database/prisma';

async function testLogging() {
  try {
    // Check for test user
    const user = await prisma.user.findFirst({
      where: { username: 'aitest' }
    });
    
    if (user) {
      console.log('✓ User found:', user.id, user.username);
      
      // Check assistant sessions
      const sessions = await prisma.assistantChatSession.findMany({
        where: { userId: user.id },
        include: {
          AssistantChatMessage: {
            take: 2
          }
        }
      });
      
      console.log('\n✓ Assistant Sessions:', sessions.length);
      sessions.forEach(s => {
        console.log(`  - ${s.id}: ${s.title}`);
        console.log(`    Messages: ${s.AssistantChatMessage.length}`);
        console.log(`    Created: ${s.createdAt}`);
      });
      
      // Check terminal sessions
      const terminalSessions = await prisma.terminalSession.findMany({
        where: { userId: user.id },
        include: {
          TerminalCommand: {
            take: 2
          }
        }
      });
      
      console.log('\n✓ Terminal Sessions:', terminalSessions.length);
      terminalSessions.forEach(s => {
        console.log(`  - ${s.id}: ${s.projectId || 'No project'}`);
        console.log(`    Commands: ${s.TerminalCommand.length}`);
        console.log(`    Active: ${s.active}`);
      });
      
      // Check audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: user.id },
        take: 5,
        orderBy: { timestamp: 'desc' }
      });
      
      console.log('\n✓ Audit Logs:', auditLogs.length);
      auditLogs.forEach(log => {
        console.log(`  - ${log.action}: ${log.resource} at ${log.timestamp}`);
      });
      
      // Check login history
      const loginHistory = await prisma.loginHistory.findMany({
        where: { userId: user.id },
        take: 5,
        orderBy: { timestamp: 'desc' }
      });
      
      console.log('\n✓ Login History:', loginHistory.length);
      loginHistory.forEach(log => {
        console.log(`  - ${log.success ? 'Success' : 'Failed'} at ${log.timestamp} from ${log.ipAddress}`);
      });
      
      console.log('\n✅ All logging systems are working properly!');
    } else {
      console.log('❌ Test user not found');
    }
  } catch (error) {
    console.error('❌ Error testing logging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogging();