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
    
    // Health status
    const isHealthy = memoryUsageMB.heapUsed < 500 && allSessions.length < 100;
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: {
        totalSessions: allSessions.length,
        suspendedSessions: suspendedCount,
        activeSessions: sessionsByStatus.get('active') || 0,
        projectsWithSessions: sessionsByProject.size,
        memoryUsageMB,
        uptime: Math.round(process.uptime()),
      },
      sessionsByStatus: Object.fromEntries(sessionsByStatus),
      limits: {
        maxSessions: 100,
        maxMemoryMB: 500,
        maxSessionsPerProject: 10
      },
      warnings: [
        ...(allSessions.length > 80 ? ['High session count (>80)'] : []),
        ...(memoryUsageMB.heapUsed > 400 ? ['High memory usage (>400MB)'] : []),
        ...(suspendedCount > 20 ? ['Many suspended sessions (>20)'] : [])
      ],
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