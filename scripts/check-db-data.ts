import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseData() {
  console.log('=== Database Contents ===\n');

  // Check Users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      createdAt: true,
      lastLoginAt: true
    }
  });
  
  console.log(`📦 Users (${users.length}):`);
  users.forEach(user => {
    console.log(`  - ${user.username} (${user.email})`);
    console.log(`    Created: ${user.createdAt.toLocaleString()}`);
    if (user.lastLoginAt) {
      console.log(`    Last login: ${user.lastLoginAt.toLocaleString()}`);
    }
  });

  // Check Assistant Conversations
  const conversations = await prisma.assistantConversation.count();
  console.log(`\n💬 Assistant Conversations: ${conversations}`);

  // Check Projects
  const projects = await prisma.project.count();
  console.log(`📁 Projects: ${projects}`);

  // Check Terminal Sessions
  const terminalSessions = await prisma.terminalSession.count();
  console.log(`🖥️  Terminal Sessions: ${terminalSessions}`);

  // Check Login History
  const loginHistory = await prisma.loginHistory.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      success: true,
      createdAt: true,
      User: {
        select: { username: true }
      }
    }
  });
  
  console.log(`\n🔐 Recent Login History:`);
  loginHistory.forEach(login => {
    const status = login.success ? '✅' : '❌';
    console.log(`  ${status} ${login.User.username} - ${login.createdAt.toLocaleString()}`);
  });

  // Check Pages
  const pages = await prisma.page.count();
  console.log(`\n📄 Pages: ${pages}`);

  // Check Posts
  const posts = await prisma.post.count();
  console.log(`📝 Posts: ${posts}`);

  // Check Media
  const media = await prisma.media.count();
  console.log(`🖼️  Media files: ${media}`);

  // Check Forms
  const forms = await prisma.form.count();
  console.log(`📋 Forms: ${forms}`);

  console.log('\n======================');
}

checkDatabaseData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());