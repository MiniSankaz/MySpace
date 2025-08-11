/**
 * API Route: POST /api/terminal/create
 * Create a new terminal session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/core/database/prisma';
import { v4 as uuidv4 } from 'uuid';
import { jwtVerify } from 'jose';

export async function POST(request: NextRequest) {
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
    const { projectId, type, projectPath } = body;

    if (!projectId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId, type' },
        { status: 400 }
      );
    }

    // Decode JWT to get user info
    let userId = 'system';
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-secret-key'
      );
      const { payload } = await jwtVerify(sessionToken, secret);
      userId = payload.userId as string || 'system';
    } catch (error) {
      console.log('Could not decode JWT, using system user');
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    // Determine tab name
    const existingSessions = await prisma.terminalSession.count({
      where: {
        projectId,
        type,
        active: true
      }
    });
    
    const tabName = type === 'claude' 
      ? `Claude ${existingSessions + 1}`
      : `Terminal ${existingSessions + 1}`;

    // Create session in database
    const newSession = await prisma.terminalSession.create({
      data: {
        id: sessionId,
        projectId,
        userId,
        type,
        tabName,
        status: 'active',
        active: true,
        currentPath: projectPath || process.cwd(),
        metadata: {},
        startedAt: new Date()
      }
    });

    // Format response
    const formattedSession = {
      id: newSession.id,
      projectId: newSession.projectId,
      type: newSession.type as 'system' | 'claude',
      tabName: newSession.tabName,
      status: newSession.status || 'active',
      isFocused: true,
      active: newSession.active,
      createdAt: newSession.createdAt,
      updatedAt: newSession.updatedAt
    };

    return NextResponse.json({
      success: true,
      session: formattedSession
    });

  } catch (error) {
    console.error('Failed to create terminal session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create terminal session'
      },
      { status: 500 }
    );
  }
}