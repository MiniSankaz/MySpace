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
    
    // Get recent conversations for authenticated user only
    const conversations = await prisma.assistantConversation.findMany({
      where: {
        userId: user.id,  // Filter by authenticated user
        isActive: true,
        folderId: null  // Only get conversations not in folders
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
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
        startedAt: 'desc'
      },
      take: limit * 2 // Get more to filter duplicates
    });
    
    // Remove duplicate sessions (keep only the latest one for each sessionId)
    const uniqueSessions = new Map();
    conversations.forEach(conv => {
      if (!uniqueSessions.has(conv.sessionId) || 
          conv.startedAt > uniqueSessions.get(conv.sessionId).startedAt) {
        uniqueSessions.set(conv.sessionId, conv);
      }
    });
    
    const filteredConversations = Array.from(uniqueSessions.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
    
    // Format sessions for response (remove userId from response for security)
    const sessions = filteredConversations.map(conv => ({
      sessionId: conv.sessionId,
      title: conv.title || conv.messages[0]?.content?.substring(0, 50) || 'New Chat',
      lastMessage: conv.messages[0]?.content || '',
      messageCount: conv._count.messages,
      createdAt: conv.startedAt,
      folderId: conv.folderId
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