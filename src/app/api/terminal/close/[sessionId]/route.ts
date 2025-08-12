/**
 * API Route: DELETE /api/terminal/close/[sessionId]
 * Close a terminal session (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Import the compiled JavaScript version to use the same instance as WebSocket servers
let inMemoryTerminalService;
try {
  // Try to use the compiled version first (same as WebSocket servers)
  const memoryModule = require('../../../../../../dist/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
} catch (error) {
  // Fallback to TypeScript version if not compiled
  const tsModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = tsModule.inMemoryTerminalService || tsModule.InMemoryTerminalService.getInstance();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('accessToken')?.value ||
                        cookieStore.get('next-auth.session-token')?.value;
    
    if (!sessionToken) {
      console.log('[Terminal API] No auth token found, allowing close anyway');
      // Allow request even without auth for development
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // Close session in memory (no database)
    const success = inMemoryTerminalService.closeSession(sessionId);
    
    if (!success) {
      console.warn(`[Terminal API] Session ${sessionId} not found or already closed`);
    }

    console.log(`[Terminal API] Terminal session closed: ${sessionId}`);

    // Note: WebSocket cleanup will happen when the frontend disconnects
    // The WebSocket server will detect the disconnection and clean up resources

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Terminal session closed successfully'
    });

  } catch (error) {
    console.error('[Terminal API] Failed to close terminal session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close terminal session'
      },
      { status: 500 }
    );
  }
}