import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { assistantLogger } from '@/services/assistant-logging.service';
import { z } from 'zod';

const querySchema = z.object({
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
});

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = {
      sessionId: searchParams.get('sessionId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      limit: searchParams.get('limit') || '100',
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, projectId, limit } = validation.data;

    // Get logs based on parameters
    if (sessionId) {
      // Get specific session history
      const messages = await assistantLogger.getSessionHistory(sessionId);
      return NextResponse.json({
        success: true,
        type: 'session_history',
        sessionId,
        messages,
      });
    } else if (projectId) {
      // Get project statistics
      const stats = await assistantLogger.getProjectStats(projectId);
      const sessions = await assistantLogger.getUserSessions(user.id, projectId);
      
      return NextResponse.json({
        success: true,
        type: 'project_logs',
        projectId,
        stats,
        sessions,
      });
    } else {
      // Get user's sessions
      const sessions = await assistantLogger.getUserSessions(user.id);
      
      return NextResponse.json({
        success: true,
        type: 'user_sessions',
        userId: user.id,
        sessions,
      });
    }
  } catch (error) {
    console.error('Get assistant logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}