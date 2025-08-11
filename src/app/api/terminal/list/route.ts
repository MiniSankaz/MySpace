/**
 * API Route: GET /api/terminal/list
 * List terminal sessions for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/core/database/prisma';

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

    // Get current user from session cookie (simplified auth check)
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('auth-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get sessions for project from database
    const sessions = await prisma.terminalSession.findMany({
      where: {
        projectId: projectId,
        active: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Format response for V2 frontend
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      projectId: session.projectId,
      type: session.type as 'system' | 'claude',
      tabName: session.tabName,
      status: session.status || 'active',
      isFocused: false,
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error('Failed to list terminal sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list terminal sessions'
      },
      { status: 500 }
    );
  }
}