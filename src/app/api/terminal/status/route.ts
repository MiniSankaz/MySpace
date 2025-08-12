import { NextRequest, NextResponse } from 'next/server';

// Try to load the singleton instance
let inMemoryTerminalService: any;
try {
  // Try to import the built version first
  const memoryModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
  console.log('[Terminal Status API] Using compiled terminal-memory service');
} catch (error) {
  // Fallback to TypeScript version
  console.log('[Terminal Status API] Falling back to TypeScript terminal-memory service');
  const tsModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = tsModule.inMemoryTerminalService || tsModule.InMemoryTerminalService.getInstance();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }
    
    // Get session from memory service
    console.log(`[Terminal Status API] Looking for session ${sessionId}`);
    const session = inMemoryTerminalService.getSession(sessionId);
    
    if (!session) {
      console.log(`[Terminal Status API] Session ${sessionId} not found`);
      // Log all available sessions for debugging
      const allSessions = inMemoryTerminalService.getAllSessions();
      console.log(`[Terminal Status API] Available sessions: ${allSessions.map((s: any) => s.id).join(', ')}`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    console.log(`[Terminal Status API] Found session ${sessionId}, status: ${session.status}`);
    
    // Check WebSocket readiness
    const wsReady = inMemoryTerminalService.isWebSocketReady(sessionId);
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        active: session.active,
        isFocused: session.isFocused,
        wsConnected: session.wsConnected,
      },
      websocketReady: wsReady,
    });
  } catch (error) {
    console.error('[Terminal Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}