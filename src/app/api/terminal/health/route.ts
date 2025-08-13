/**
 * API Route: GET /api/terminal/health
 * Terminal system health check
 */

import { NextRequest, NextResponse } from 'next/server';

// Import the singleton terminal service
let inMemoryTerminalService: any;
try {
  const memoryModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
} catch (error) {
  console.error('[Terminal Health API] Failed to load terminal service:', error);
}

export async function GET(request: NextRequest) {
  try {
    if (!inMemoryTerminalService) {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Terminal service not available',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
    // Get all sessions
    const allSessions = inMemoryTerminalService.getAllSessions();
    const sessionsByProject = new Map<string, number>();
    const sessionsByStatus = new Map<string, number>();
    let suspendedCount = 0;
    
    // Analyze sessions
    allSessions.forEach((session: any) => {
      // Count by project
      const count = sessionsByProject.get(session.projectId) || 0;
      sessionsByProject.set(session.projectId, count + 1);
      
      // Count by status
      const statusCount = sessionsByStatus.get(session.status) || 0;
      sessionsByStatus.set(session.status, statusCount + 1);
      
      // Count suspended
      if (inMemoryTerminalService.isSessionSuspended(session.id)) {
        suspendedCount++;
      }
    });
    
    // Calculate memory usage (approximate)
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    // CRITICAL: Detect infinite loops
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check for excessive sessions per project
    for (const [projectId, count] of sessionsByProject.entries()) {
      if (count > 100) {
        issues.push(`Project ${projectId} has ${count} sessions (LOOP DETECTED)`);
      } else if (count > 50) {
        warnings.push(`Project ${projectId} has ${count} sessions`);
      }
    }
    
    // Check total session count
    if (allSessions.length > 500) {
      issues.push(`Total sessions: ${allSessions.length} (CRITICAL LOOP)`);
    } else if (allSessions.length > 200) {
      warnings.push(`Total sessions: ${allSessions.length} (possible loop)`);
    }
    
    // Health status - enhanced with loop detection
    const hasLoops = issues.length > 0;
    const isHealthy = !hasLoops && memoryUsageMB.heapUsed < 4096 && allSessions.length < 100;
    
    return NextResponse.json({
      status: hasLoops ? 'critical' : (isHealthy ? 'healthy' : 'degraded'),
      metrics: {
        totalSessions: allSessions.length,
        suspendedSessions: suspendedCount,
        activeSessions: sessionsByStatus.get('active') || 0,
        projectsWithSessions: sessionsByProject.size,
        memoryUsageMB,
        uptime: Math.round(process.uptime()),
      },
      sessionsByStatus: Object.fromEntries(sessionsByStatus),
      sessionsByProject: Object.fromEntries(sessionsByProject),
      limits: {
        maxSessions: 100,
        maxMemoryMB: 4096,
        maxSessionsPerProject: 50,
        criticalSessionsPerProject: 100
      },
      issues,
      warnings: [
        ...warnings,
        ...(allSessions.length > 80 ? ['High session count (>80)'] : []),
        ...(memoryUsageMB.heapUsed > 3000 ? ['High memory usage (>3GB)'] : []),
        ...(suspendedCount > 20 ? ['Many suspended sessions (>20)'] : [])
      ],
      recommendations: hasLoops ? [
        '🚨 INFINITE LOOP DETECTED - Take immediate action:',
        '1. Run: node scripts/cleanup-sessions.ts --force',
        '2. Restart the application immediately',
        '3. Check logs for LOOP DETECTED or CIRCUIT BREAKER messages',
        '4. Monitor this endpoint for recovery'
      ] : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Terminal Health API] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}