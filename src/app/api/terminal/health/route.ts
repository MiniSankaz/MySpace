/**
 * API Route: GET /api/terminal/health
 * Check terminal system health (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
// Import the compiled JavaScript version to use the same instance as WebSocket servers
let inMemoryTerminalService;
try {
  // Try to use the compiled version first (same as WebSocket servers)
  const memoryModule = require('../../../../../dist/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
} catch (error) {
  // Fallback to TypeScript version if not compiled
  const tsModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = tsModule.inMemoryTerminalService || tsModule.InMemoryTerminalService.getInstance();
}

export async function GET(request: NextRequest) {
  try {
    // No auth required for health check
    
    // Get all active sessions
    const allSessions = inMemoryTerminalService.getAllSessions();
    
    // Count by type
    const systemCount = allSessions.filter(s => s.type === 'system' && s.status === 'active').length;
    const claudeCount = allSessions.filter(s => s.type === 'claude' && s.status === 'active').length;
    const totalCount = allSessions.length;
    
    // Check WebSocket servers
    const wsStatus = {
      system: systemCount > 0 ? 'connected' : 'ready',
      claude: claudeCount > 0 ? 'connected' : 'ready'
    };
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessions: {
        total: totalCount,
        system: systemCount,
        claude: claudeCount
      },
      websockets: wsStatus,
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024
      }
    };

    return NextResponse.json(health);

  } catch (error) {
    console.error('[Terminal API] Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}