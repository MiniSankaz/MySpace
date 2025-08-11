/**
 * API Route: DELETE /api/terminal/close/[sessionId]
 * Close a terminal session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/core/database/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // Update session in database
    await prisma.terminalSession.update({
      where: {
        id: sessionId
      },
      data: {
        active: false,
        status: 'closed',
        endedAt: new Date()
      }
    });

    console.log(`Terminal session closed: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Terminal session closed successfully'
    });

  } catch (error) {
    console.error('Failed to close terminal session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close terminal session'
      },
      { status: 500 }
    );
  }
}