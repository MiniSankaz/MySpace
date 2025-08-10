import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - required for assistant sessions
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Get recent chat sessions for authenticated user only
    const conversations = await prisma.assistantChatSession.findMany({
      where: {
        userId: user.id  // Filter by authenticated user
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        lastActiveAt: 'desc'
      },
      take: limit
    });
    
    // Format sessions for response (remove userId from response for security)
    const sessions = conversations.map(session => ({
      sessionId: session.id, // Use the session UUID as sessionId for frontend
      title: session.sessionName || session.messages[0]?.content?.substring(0, 50) || 'New Chat',
      lastMessage: session.messages[0]?.content || '',
      messageCount: session._count.messages,
      createdAt: session.startedAt,
      folderId: null // Assistant chat sessions don't have folders yet
    }));
    
    return NextResponse.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load sessions' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}