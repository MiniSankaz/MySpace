/**
 * API Route: POST /api/terminal/resume
 * Resume suspended terminal sessions for a project
 */

import { NextRequest, NextResponse } from 'next/server';

// Import the singleton terminal service
let inMemoryTerminalService: any;
try {
  const memoryModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
} catch (error) {
  console.error('[Terminal Resume API] Failed to load terminal service:', error);
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
    
    // Resume all sessions for the project
    const result = inMemoryTerminalService.resumeProjectSessions(projectId);
    
    console.log(`[Terminal Resume API] Resumed ${result.sessions.length} sessions for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      resumed: result.resumed,
      sessions: result.sessions.map((s: any) => ({
        id: s.id,
        projectId: s.projectId,
        tabName: s.tabName,
        status: s.status,
        isFocused: s.isFocused,
        mode: s.mode || 'normal',
        suspendedAt: s.suspendedAt,
        bufferedOutput: s.bufferedOutput,
        workingDirectory: s.workingDirectory
      })),
      uiState: result.uiState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Terminal Resume API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume sessions'
      },
      { status: 500 }
    );
  }
}