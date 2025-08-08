import { NextRequest, NextResponse } from 'next/server';
import { getAssistantInstance } from '@/modules/personal-assistant';
import { verifyAuth } from '@/middleware/auth';
import { withRateLimit } from '@/middleware/rate-limit';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  directMode: z.boolean().optional(),
});

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Get request body
    const body = await request.json();
    const validation = chatSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verify authentication - required for assistant
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Always use authenticated user's ID for security
    const userId = user.id;
    const sessionId = validation.data.sessionId || `session-${Date.now()}`;
    const directMode = validation.data.directMode ?? false;
    
    const assistant = getAssistantInstance();
    
    // If direct mode, send straight to Claude
    let response;
    if (directMode) {
      response = await assistant.sendDirectToClaude(
        userId,
        sessionId,
        validation.data.message
      );
    } else {
      response = await assistant.processMessage(
        userId,
        sessionId,
        validation.data.message
      );
    }
    
    // Generate a message ID for the response
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      sessionId,
      messageId,
      response,
      user: user ? { id: user.id, username: user.username } : null
    });
  } catch (error) {
    console.error('Assistant chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'assistant');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - required for viewing history
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Load conversation history for authenticated user only
    const assistant = getAssistantInstance();
    // Verify session belongs to user before loading
    const history = await assistant.getConversationHistory(user.id, sessionId);
    
    return NextResponse.json({
      success: true,
      sessionId,
      messages: history
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}