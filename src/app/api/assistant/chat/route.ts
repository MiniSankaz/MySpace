import { NextRequest, NextResponse } from 'next/server';
import { getAssistantInstance } from '@/modules/personal-assistant';
import { verifyAuth } from '@/middleware/auth';
import { withRateLimit } from '@/middleware/rate-limit';
import { z } from 'zod';
import { assistantLogger } from '@/services/assistant-logging.service';

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  directMode: z.boolean().optional(),
  projectId: z.string().optional(),
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
    const projectId = validation.data.projectId;
    
    // Create or get logging session
    let loggingSessionId = sessionId;
    try {
      // Check if session exists in database
      const existingSession = await assistantLogger.getSession(sessionId);
      
      if (!existingSession) {
        // Create new session if it doesn't exist
        const loggingSession = await assistantLogger.createSession({
          userId,
          projectId,
          sessionName: `Chat Session - ${new Date().toLocaleString()}`,
          model: directMode ? 'claude-direct' : 'claude-assistant',
        });
        loggingSessionId = loggingSession.id;
      }
    } catch (error) {
      console.error('Failed to create/get logging session:', error);
      // Create a fallback session to prevent errors
      try {
        const fallbackSession = await assistantLogger.createSession({
          userId,
          projectId,
          sessionName: `Fallback Session - ${new Date().toLocaleString()}`,
          model: directMode ? 'claude-direct' : 'claude-assistant',
        });
        loggingSessionId = fallbackSession.id;
      } catch (fallbackError) {
        console.error('Failed to create fallback session:', fallbackError);
      }
    }
    
    // Log user message
    const startTime = Date.now();
    await assistantLogger.logMessage({
      sessionId: loggingSessionId,
      userId,
      projectId,
      role: 'user',
      content: validation.data.message,
    });
    
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
    
    // Calculate response time and estimate tokens
    const latency = Date.now() - startTime;
    const estimatedTokens = Math.ceil((validation.data.message.length + response.length) / 4);
    const estimatedCost = estimatedTokens * 0.00002; // Rough estimate
    
    // Log assistant response
    await assistantLogger.logMessage({
      sessionId: loggingSessionId,
      userId,
      projectId,
      role: 'assistant',
      content: response,
      model: directMode ? 'claude-direct' : 'claude-assistant',
      tokensUsed: estimatedTokens,
      cost: estimatedCost,
      latency,
    });
    
    // Update daily analytics
    await assistantLogger.updateDailyAnalytics(userId, projectId);
    
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