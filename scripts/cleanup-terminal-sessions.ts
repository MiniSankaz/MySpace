/**
 * Terminal Sessions Cleanup Script
 * Removes orphaned and inactive terminal sessions
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupTerminalSessions() {
  console.log('🧹 Starting Terminal Sessions Cleanup...\n');
  
  try {
    // 1. Count current state
    const totalBefore = await prisma.terminalSession.count();
    const activeBefore = await prisma.terminalSession.count({ where: { active: true } });
    
    console.log(`📊 Before cleanup:`);
    console.log(`   Total sessions: ${totalBefore}`);
    console.log(`   Active sessions: ${activeBefore}\n`);
    
    // 2. Delete inactive sessions
    const inactiveDeleted = await prisma.terminalSession.deleteMany({
      where: { active: false }
    });
    console.log(`🗑️ Deleted ${inactiveDeleted.count} inactive sessions`);
    
    // 3. Delete old sessions (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldDeleted = await prisma.terminalSession.deleteMany({
      where: {
        updatedAt: { lt: oneDayAgo },
        active: true
      }
    });
    console.log(`⏰ Deleted ${oldDeleted.count} old sessions (>24h)`);
    
    // 4. Delete sessions with malformed IDs
    const malformedDeleted = await prisma.terminalSession.deleteMany({
      where: {
        tabName: { contains: 'session_' }  // Indicates malformed session
      }
    });
    console.log(`🔧 Deleted ${malformedDeleted.count} malformed sessions`);
    
    // 5. Final count
    const totalAfter = await prisma.terminalSession.count();
    const activeAfter = await prisma.terminalSession.count({ where: { active: true } });
    
    console.log(`\n📊 After cleanup:`);
    console.log(`   Total sessions: ${totalAfter}`);
    console.log(`   Active sessions: ${activeAfter}`);
    console.log(`   Cleaned up: ${totalBefore - totalAfter} sessions\n`);
    
    // 6. Show remaining sessions
    const remainingSessions = await prisma.terminalSession.findMany({
      where: { active: true },
      select: {
        id: true,
        type: true,
        tabName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('🏁 Remaining active sessions:');
    remainingSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.tabName} (${session.type})`);
    });
    
    console.log('\n✅ Terminal sessions cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupTerminalSessions().catch(console.error);
}

export default cleanupTerminalSessions;