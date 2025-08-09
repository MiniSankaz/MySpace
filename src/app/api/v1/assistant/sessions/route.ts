import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, API_SCOPES } from '@/middleware/api-auth';
import { ConversationStorage } from '@/modules/personal-assistant/services/conversation-storage';

const storageService = new ConversationStorage();

/**
 * GET /api/v1/assistant/sessions
 * List all chat sessions
 */
export async function GET(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get sessions
        const sessions = await storageService.getAllSessions(context.user.id);
        
        // Paginate
        const paginatedSessions = sessions.slice(offset, offset + limit);

        return NextResponse.json({
          success: true,
          sessions: paginatedSessions.map(session => ({
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages?.length || 0,
            lastMessage: session.messages?.[session.messages.length - 1]
          })),
          pagination: {
            total: sessions.length,
            limit,
            offset,
            hasMore: offset + limit < sessions.length
          }
        });

      } catch (error: any) {
        console.error('Get sessions error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to get sessions' },
          { status: 500 }
        );
      }
    },
    [API_SCOPES.ASSISTANT_READ]
  );
}

/**
 * DELETE /api/v1/assistant/sessions
 * Delete a chat session
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID required' },
            { status: 400 }
          );
        }

        // Delete session
        await storageService.deleteSession(sessionId, context.user.id);

        return NextResponse.json({
          success: true,
          message: 'Session deleted successfully'
        });

      } catch (error: any) {
        console.error('Delete session error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to delete session' },
          { status: 500 }
        );
      }
    },
    [API_SCOPES.ASSISTANT_DELETE]
  );
}