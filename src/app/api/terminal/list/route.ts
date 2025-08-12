/**
 * API Route: GET /api/terminal/list
 * List terminal sessions for a project (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Import the compiled JavaScript version to use the same instance as WebSocket servers
let inMemoryTerminalService;
try {
  // Try to use the compiled version first (same as WebSocket servers)
  const memoryModule = require('../../../../../dist/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
  console.log('[Terminal List API] Using compiled terminal-memory service');
} catch (error) {
  // Fallback to TypeScript version if not compiled
  console.log('[Terminal List API] Falling back to TypeScript terminal-memory service');
  const tsModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = tsModule.inMemoryTerminalService || tsModule.InMemoryTerminalService.getInstance();
}

export async function GET(request: NextRequest) {
  try {
    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('accessToken')?.value ||
                        cookieStore.get('next-auth.session-token')?.value;
    
    if (!sessionToken) {
      console.log('[Terminal API] No auth token found, allowing request anyway');
      // Allow request even without auth for development
    }

    // Get sessions from in-memory service
    const sessions = inMemoryTerminalService.listSessions(projectId);
    
    console.log(`[Terminal API] Found ${sessions.length} sessions for project ${projectId}`);

    // Format response for V2 frontend
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      projectId: session.projectId,
      type: session.type,
      tabName: session.tabName,
      status: session.status,
      isFocused: session.isFocused,
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error('[Terminal API] Failed to list terminal sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list terminal sessions'
      },
      { status: 500 }
    );
  }
}