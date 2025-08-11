import { NextRequest, NextResponse } from 'next/server';
import { terminalIntegration } from '@/modules/workspace/services/terminal-integration.service';
import { authClient } from '@/core/auth/auth-client';

// GET /api/workspace/terminals/[sessionId] - Get terminal session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = terminalIntegration.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to fetch terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terminal session' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspace/terminals/[sessionId] - Close terminal session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = terminalIntegration.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await terminalIntegration.closeSession(sessionId);

    return NextResponse.json({ 
      message: 'Terminal session closed',
      sessionId 
    });
  } catch (error) {
    console.error('Failed to close terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to close terminal session' },
      { status: 500 }
    );
  }
}