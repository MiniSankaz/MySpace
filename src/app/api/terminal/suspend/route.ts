/**
 * API Route: POST /api/terminal/suspend
 * Suspend terminal sessions for a project
 */

import { NextRequest, NextResponse } from 'next/server';

// Import the singleton terminal service
let inMemoryTerminalService: any;
try {
  const memoryModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
} catch (error) {
  console.error('[Terminal Suspend API] Failed to load terminal service:', error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }
    
    if (!inMemoryTerminalService) {
      return NextResponse.json(
        { error: 'Terminal service not available' },
        { status: 503 }
      );
    }
    
    // Suspend all sessions for the project
    const suspendedCount = inMemoryTerminalService.suspendProjectSessions(projectId);
    
    console.log(`[Terminal Suspend API] Suspended ${suspendedCount} sessions for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      suspendedSessionCount: suspendedCount,
      projectId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Terminal Suspend API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend sessions'
      },
      { status: 500 }
    );
  }
}