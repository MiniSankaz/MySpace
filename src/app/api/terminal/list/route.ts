/**
 * API Route: GET /api/terminal/list
 * List terminal sessions for a project using Storage Service
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { terminalStorageService } from '@/services/storage/TerminalStorageService';

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

    // Get sessions from storage service (which handles both storage and memory)
    const sessions = await terminalStorageService.listSessions(projectId);
    
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