import { NextRequest, NextResponse } from 'next/server';
import { terminalIntegration } from '@/modules/workspace/services/terminal-integration.service';
import { authClient } from '@/core/auth/auth-client';

// PUT /api/workspace/terminals/[sessionId]/rename - Rename terminal session
export async function PUT(
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

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const session = terminalIntegration.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await terminalIntegration.renameSession(sessionId, name);

    // Get updated session
    const updatedSession = terminalIntegration.getSession(sessionId);

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Failed to rename terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to rename terminal session' },
      { status: 500 }
    );
  }
}