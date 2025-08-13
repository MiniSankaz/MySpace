#!/usr/bin/env node

/**
 * Emergency Session Cleanup Script
 * Cleans up sessions stuck in infinite loops
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function cleanupDatabaseSessions() {
  console.log('🧹 Starting database session cleanup...');
  
  try {
    // Find sessions with migration metadata
    const migratedSessions = await prisma.terminalSession.findMany({
      where: {
        OR: [
          { metadata: { path: ['legacyId'], not: null } },
          { metadata: { path: ['migratedAt'], not: null } },
          { metadata: { path: ['migratedFrom'], not: null } }
        ]
      }
    });
    
    console.log(`Found ${migratedSessions.length} migrated sessions`);
    
    // Group sessions by project to find duplicates
    const projectSessions = new Map<string, any[]>();
    const allSessions = await prisma.terminalSession.findMany();
    
    for (const session of allSessions) {
      const projectId = session.projectId;
      if (!projectSessions.has(projectId)) {
        projectSessions.set(projectId, []);
      }
      projectSessions.get(projectId)!.push(session);
    }
    
    // Find projects with excessive sessions
    const problematicProjects: string[] = [];
    for (const [projectId, sessions] of projectSessions.entries()) {
      if (sessions.length > 100) {
        console.log(`⚠️  Project ${projectId} has ${sessions.length} sessions!`);
        problematicProjects.push(projectId);
      }
    }
    
    // Clean up excessive sessions
    for (const projectId of problematicProjects) {
      const sessions = projectSessions.get(projectId)!;
      
      // Sort by creation date
      sessions.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Keep only the 10 most recent sessions
      const sessionsToDelete = sessions.slice(0, -10);
      
      console.log(`Deleting ${sessionsToDelete.length} old sessions for project ${projectId}`);
      
      for (const session of sessionsToDelete) {
        await prisma.terminalSession.delete({
          where: { id: session.id }
        }).catch(err => {
          console.error(`Failed to delete session ${session.id}:`, err.message);
        });
      }
    }
    
    // Clean up orphaned sessions (older than 1 day with no activity)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphanedSessions = await prisma.terminalSession.deleteMany({
      where: {
        AND: [
          { updatedAt: { lt: oneDayAgo } },
          { status: { in: ['closed', 'error', 'inactive'] } }
        ]
      }
    });
    
    console.log(`Deleted ${orphanedSessions.count} orphaned sessions`);
    
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupLocalStorage() {
  console.log('🧹 Starting local storage cleanup...');
  
  const storagePath = path.join('/tmp', 'terminal-sessions', 'sessions.json');
  
  try {
    const exists = await fs.access(storagePath).then(() => true).catch(() => false);
    
    if (exists) {
      const data = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
      
      console.log(`Found ${data.sessions?.length || 0} sessions in local storage`);
      
      // Filter out migrated sessions
      if (data.sessions) {
        const filteredSessions = data.sessions.filter(([id, session]: [string, any]) => {
          const metadata = session.metadata || {};
          return !metadata.legacyId && !metadata.migratedAt && !metadata.migratedFrom;
        });
        
        console.log(`Keeping ${filteredSessions.length} non-migrated sessions`);
        
        data.sessions = filteredSessions;
        
        // Clean up project sessions
        if (data.projectSessions) {
          for (const [projectId, sessionIds] of data.projectSessions) {
            if (Array.isArray(sessionIds) && sessionIds.length > 20) {
              console.log(`Trimming project ${projectId} from ${sessionIds.length} to 20 sessions`);
              data.projectSessions[projectId] = sessionIds.slice(-20);
            }
          }
        }
        
        // Write back cleaned data
        await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('✅ Local storage cleaned');
      }
    } else {
      console.log('No local storage file found');
    }
  } catch (error) {
    console.error('Local storage cleanup failed:', error);
  }
}

async function main() {
  console.log('🚨 Emergency Session Cleanup Tool');
  console.log('=================================');
  
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  
  if (!force) {
    console.log('⚠️  This will delete excessive terminal sessions.');
    console.log('Use --force flag to confirm.');
    process.exit(1);
  }
  
  await cleanupDatabaseSessions();
  await cleanupLocalStorage();
  
  console.log('✅ Cleanup complete!');
  console.log('\n📝 Recommendations:');
  console.log('1. Restart the application');
  console.log('2. Monitor for new session creation loops');
  console.log('3. Check logs for "LOOP DETECTED" or "CIRCUIT BREAKER" messages');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { cleanupDatabaseSessions, cleanupLocalStorage };