#!/usr/bin/env tsx

/**
 * Fix Terminal Storage Issues
 * แก้ไขปัญหา session duplication และ infinite loop
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const FIXES = [
  {
    file: 'src/services/storage/providers/BaseStorageProvider.ts',
    description: 'ปรับปรุง session ID generation ให้รองรับ custom ID',
    fixes: [
      {
        find: `protected createDefaultSession(params: SessionCreateParams): TerminalSession {
    const now = new Date();
    const sessionId = this.generateSessionId();`,
        replace: `protected createDefaultSession(params: SessionCreateParams): TerminalSession {
    const now = new Date();
    // Allow custom sessionId for migration/sync
    const sessionId = params.metadata?.sessionId || this.generateSessionId();`
      }
    ]
  },
  {
    file: 'src/services/storage/providers/LocalStorageProvider.ts',
    description: 'แก้ไข eviction logic และ prevent deletion of active sessions',
    fixes: [
      {
        find: `      // Auto-focus if under limit
      const projectFocused = this.focusedSessions.get(params.projectId) || new Set();
      if (projectFocused.size < this.maxFocusedPerProject) {
        await this.setSessionFocus(session.id, true);
      }`,
        replace: `      // Auto-focus if under limit and requested
      const projectFocused = this.focusedSessions.get(params.projectId) || new Set();
      const autoFocus = params.metadata?.autoFocus !== false;
      if (autoFocus && projectFocused.size < this.maxFocusedPerProject) {
        await this.setSessionFocus(session.id, true);
      }`
      },
      {
        find: `    return this.trackOperation('delete', async () => {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return false;
      }`,
        replace: `    return this.trackOperation('delete', async () => {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return false;
      }
      
      // Don't delete active or focused sessions
      if (session.status === 'active' || session.status === 'connecting' || session.isFocused) {
        this.log('warn', \`Cannot delete active/focused session \${sessionId}\`);
        return false;
      }`
      }
    ]
  },
  {
    file: 'src/services/storage/interfaces/ITerminalStorageService.ts',
    description: 'เพิ่ม sessionId field ใน metadata สำหรับ migration',
    fixes: [
      {
        find: `export interface SessionCreateParams {
  projectId: string;
  projectPath: string;
  userId?: string;
  mode?: TerminalMode;
  metadata?: Record<string, any>;
}`,
        replace: `export interface SessionCreateParams {
  projectId: string;
  projectPath: string;
  userId?: string;
  mode?: TerminalMode;
  metadata?: {
    sessionId?: string;       // Custom session ID for migration
    legacyId?: string;        // Original legacy session ID
    autoFocus?: boolean;      // Auto-focus on creation
    migratedAt?: Date;        // Migration timestamp
    [key: string]: any;       // Additional metadata
  };
}`
      }
    ]
  }
];

async function applyFixes() {
  console.log('🔧 กำลังแก้ไขปัญหา Terminal Storage System...\n');

  for (const fileConfig of FIXES) {
    const filePath = join(process.cwd(), fileConfig.file);
    console.log(`📝 แก้ไข: ${fileConfig.file}`);
    console.log(`   ${fileConfig.description}`);
    
    try {
      let content = await readFile(filePath, 'utf-8');
      let modified = false;
      
      for (const fix of fileConfig.fixes) {
        if (content.includes(fix.find)) {
          content = content.replace(fix.find, fix.replace);
          modified = true;
          console.log('   ✅ Applied fix');
        } else {
          console.log('   ⚠️  Pattern not found or already fixed');
        }
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf-8');
        console.log(`   ✅ บันทึกไฟล์สำเร็จ\n`);
      } else {
        console.log(`   ℹ️  ไม่มีการเปลี่ยนแปลง\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  console.log('\n✅ แก้ไขเสร็จสิ้น!');
  console.log('\n🎯 ขั้นตอนต่อไป:');
  console.log('1. Rebuild: npm run build');
  console.log('2. Restart: ./quick-restart.sh');
  console.log('3. Test: เปิด terminal ใหม่และตรวจสอบว่าไม่มีการสร้าง session ซ้ำ');
}

// Run fixes
applyFixes().catch(console.error);