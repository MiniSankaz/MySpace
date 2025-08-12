/**
 * API Route: POST /api/terminal/create
 * Create a new terminal session (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Import the compiled JavaScript version to use the same instance as WebSocket servers
let inMemoryTerminalService;
try {
  // Try to use the compiled version first (same as WebSocket servers)
  const memoryModule = require('../../../../../dist/services/terminal-memory.service');
  inMemoryTerminalService = memoryModule.inMemoryTerminalService || memoryModule.InMemoryTerminalService.getInstance();
  console.log('[Terminal Create API] Using compiled terminal-memory service');
} catch (error) {
  // Fallback to TypeScript version if not compiled
  console.log('[Terminal Create API] Falling back to TypeScript terminal-memory service');
  const tsModule = require('@/services/terminal-memory.service');
  inMemoryTerminalService = tsModule.inMemoryTerminalService || tsModule.InMemoryTerminalService.getInstance();
}

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('auth-token')?.value ||
                        cookieStore.get('next-auth.session-token')?.value;
    
    let userId = 'system';
    if (!sessionToken) {
      console.log('[Terminal API] No auth token found, using system user');
      // Allow request even without auth for development
    }

    // Get request body
    const body = await request.json();
    const { projectId, type, projectPath } = body;

    if (!projectId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId, type' },
        { status: 400 }
      );
    }

    // Create session in memory (no database)
    const session = inMemoryTerminalService.createSession(
      projectId,
      type,
      projectPath || process.cwd(),
      userId
    );

    console.log(`[Terminal API] Created session ${session.id} for project ${projectId}`);

    // Format response
    const formattedSession = {
      id: session.id,
      projectId: session.projectId,
      type: session.type,
      tabName: session.tabName,
      status: session.status,
      isFocused: true, // New sessions start focused
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    return NextResponse.json({
      success: true,
      session: formattedSession
    });

  } catch (error) {
    console.error('[Terminal API] Failed to create terminal session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create terminal session'
      },
      { status: 500 }
    );
  }
}