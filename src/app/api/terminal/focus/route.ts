/**
 * API Route: PUT /api/terminal/focus
 * Set focused terminal session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function PUT(request: NextRequest) {
  try {
    // Check auth
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('auth-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { projectId, sessionId } = body;

    if (!projectId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId, sessionId' },
        { status: 400 }
      );
    }

    // In V2, focus is managed client-side and through WebSocket
    // This endpoint just acknowledges the focus change
    console.log(`Terminal focus changed: Project ${projectId}, Session ${sessionId}`);

    return NextResponse.json({
      success: true,
      projectId,
      sessionId,
      focused: true
    });

  } catch (error) {
    console.error('Failed to set terminal focus:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set terminal focus'
      },
      { status: 500 }
    );
  }
}