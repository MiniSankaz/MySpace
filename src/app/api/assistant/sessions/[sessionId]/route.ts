import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Verify authentication
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

    const { sessionId } = await params;

    // First check if the session belongs to the user
    const session = await prisma.assistantChatSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id
      }
    });

    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Session not found or access denied' 
        },
        { status: 404 }
      );
    }

    // Delete the session and all related messages (cascade delete)
    await prisma.assistantChatSession.delete({
      where: {
        id: session.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete session' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Verify authentication
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

    const { sessionId } = await params;

    // Get the session with messages
    const session = await prisma.assistantChatSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Session not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionId: session.id,
        title: session.sessionName,
        startedAt: session.startedAt,
        messageCount: session.messages.length,
        messages: session.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get session' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}