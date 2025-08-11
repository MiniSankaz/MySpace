/**
 * API Route: DELETE /api/terminal/cleanup
 * Clean up all terminal sessions for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/core/database/prisma';

export async function DELETE(request: NextRequest) {
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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Update all active sessions for the project
    const result = await prisma.terminalSession.updateMany({
      where: {
        projectId: projectId,
        active: true
      },
      data: {
        active: false,
        status: 'closed',
        endedAt: new Date()
      }
    });

    console.log(`Cleaned up ${result.count} terminal sessions for project ${projectId}`);

    return NextResponse.json({
      success: true,
      projectId,
      closedSessions: result.count,
      message: `Cleaned up ${result.count} terminal sessions`
    });

  } catch (error) {
    console.error('Failed to cleanup terminal sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup terminal sessions'
      },
      { status: 500 }
    );
  }
}