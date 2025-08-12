/**
 * API Route: DELETE /api/terminal/cleanup
 * Clean up all terminal sessions for a project (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

export async function DELETE(request: NextRequest) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('accessToken')?.value ||
                        cookieStore.get('next-auth.session-token')?.value;
    
    if (!sessionToken) {
      console.log('[Terminal API] No auth token found, allowing cleanup anyway');
      // Allow request even without auth for development
    }

    // Get request body
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Clean up all sessions for the project (in-memory)
    const closedCount = inMemoryTerminalService.cleanupProjectSessions(projectId);

    console.log(`[Terminal API] Cleaned up ${closedCount} terminal sessions for project ${projectId}`);

    // Note: WebSocket cleanup will happen when the frontend disconnects
    // The WebSocket servers will detect the disconnections and clean up resources

    return NextResponse.json({
      success: true,
      projectId,
      closedSessions: closedCount,
      message: `Cleaned up ${closedCount} terminal sessions`
    });

  } catch (error) {
    console.error('[Terminal API] Failed to cleanup terminal sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup terminal sessions'
      },
      { status: 500 }
    );
  }
}