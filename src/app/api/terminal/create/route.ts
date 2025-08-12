/**
 * API Route: POST /api/terminal/create
 * Create a new terminal session (in-memory storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Import the TypeScript version directly for better compatibility during development
import { inMemoryTerminalService } from '@/services/terminal-memory.service';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('accessToken')?.value ||
                        cookieStore.get('next-auth.session-token')?.value;
    
    let userId = 'system';
    if (!sessionToken) {
      console.log('[Terminal API] No auth token found, using system user');
      // Allow request even without auth for development
    }

    // Get request body
    const body = await request.json();
    const { projectId, projectPath, mode = 'normal' } = body;
    console.log(`[Terminal API] 📨 Create request - project: ${projectId}, mode: ${mode}, path: ${projectPath}`);

    if (!projectId) {
      console.log('[Terminal API] ❌ Missing project ID in request');
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Create session in memory (no database)
    console.log(`[Terminal API] 🏗️ Creating session for user: ${userId || 'system'}`);
    const session = inMemoryTerminalService.createSession(
      projectId,
      projectPath || process.cwd(),
      userId,
      mode
    );

    console.log(`[Terminal API] ✅ Created session ${session.id} for project ${projectId}, waiting for WebSocket readiness...`);

    // Wait for WebSocket readiness before returning
    const wsReady = await inMemoryTerminalService.waitForWebSocketReady(session.id, 5000);
    
    if (!wsReady) {
      console.warn(`[Terminal API] WebSocket not ready for session ${session.id}, returning with retry info`);
    }

    // Get current focus state for the project
    const focusedSessions = inMemoryTerminalService.getFocusedSessions(projectId);
    const focusState = {
      focused: focusedSessions,
      version: Date.now(), // Simple version using timestamp
      timestamp: Date.now()
    };

    // Format response
    const formattedSession = {
      id: session.id,
      projectId: session.projectId,
      type: session.type,
      mode: session.mode,
      tabName: session.tabName,
      status: session.status,
      isFocused: true, // New sessions start focused
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    return NextResponse.json({
      success: true,
      session: formattedSession,
      websocketReady: wsReady,
      retryDelay: wsReady ? undefined : 1000,
      focusState
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