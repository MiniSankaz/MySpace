#!/usr/bin/env tsx

/**
 * Script to clear all workspace data and terminal sessions from database
 * ใช้สำหรับเคลียร์ข้อมูล workspace และ terminal sessions ทั้งหมด
 */

import { prisma } from '@/core/database/prisma';

async function clearWorkspaceData() {
  console.log('🧹 Starting workspace and sessions cleanup...\n');

  try {
    // 1. ลบ Terminal Commands ทั้งหมด
    console.log('📝 Clearing terminal commands...');
    const deletedCommands = await prisma.terminalCommand.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCommands.count} terminal commands`);

    // 2. ลบ Terminal Sessions ทั้งหมด
    console.log('💻 Clearing terminal sessions...');
    const deletedSessions = await prisma.terminalSession.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSessions.count} terminal sessions`);

    // 3. ลบ Projects ทั้งหมด (ระวัง: จะลบข้อมูล workspace ทั้งหมด)
    console.log('📁 Clearing workspace projects...');
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`   ✅ Deleted ${deletedProjects.count} projects`);

    // 4. File model ไม่มีใน schema แล้ว - skip
    console.log('📄 File cleanup skipped (model not in schema)');

    // 5. แสดงสถิติปัจจุบัน
    console.log('\n📊 Current Database Statistics:');
    
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const sessionCount = await prisma.terminalSession.count();
    const commandCount = await prisma.terminalCommand.count();
    
    console.log(`   👤 Users: ${userCount}`);
    console.log(`   📁 Projects: ${projectCount}`);
    console.log(`   💻 Terminal Sessions: ${sessionCount}`);
    console.log(`   📝 Terminal Commands: ${commandCount}`);

    console.log('\n✨ Workspace and sessions cleanup completed successfully!');
    
    // ตรวจสอบว่ามี active sessions หลงเหลือหรือไม่
    const activeSessions = await prisma.terminalSession.findMany({
      where: { active: true }
    });
    
    if (activeSessions.length > 0) {
      console.log('\n⚠️  Warning: Found active sessions after cleanup:');
      activeSessions.forEach(session => {
        console.log(`   - Session ID: ${session.id}, Type: ${session.type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// เพิ่มคำเตือนก่อนเริ่ม
console.log('⚠️  WARNING: This will delete ALL workspace data and terminal sessions!');
console.log('   This includes:');
console.log('   - All terminal sessions (active and inactive)');
console.log('   - All terminal command history');
console.log('   - All workspace projects');
console.log('   - All orphaned files\n');

// ถามยืนยันก่อนดำเนินการ
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    await clearWorkspaceData();
  } else {
    console.log('❌ Cleanup cancelled by user');
  }
  rl.close();
  process.exit(0);
});