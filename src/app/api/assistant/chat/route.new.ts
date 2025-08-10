import { NextRequest, NextResponse } from 'next/server';
import { AssistantService } from '@/services/assistant.service';
import { verifyAuth } from '@/middleware/auth';
import { withRateLimit } from '@/middleware/rate-limit';
import { z } from 'zod';

// Request validation schema
const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  folderId: z.string().optional(),
});

/**
 * POST /api/assistant/chat
 * ส่งข้อความไปยัง AI Assistant
 */
export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const validation = chatSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ข้อมูลไม่ถูกต้อง',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }
    
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        },
        { status: 401 }
      );
    }
    
    // Get assistant service
    const assistant = AssistantService.getInstance();
    
    // Process message
    const response = await assistant.processMessage(
      validation.data.message,
      {
        userId: user.id,
        sessionId: validation.data.sessionId,
        projectId: validation.data.projectId,
        folderId: validation.data.folderId
      }
    );
    
    // Return response
    return NextResponse.json({
      success: !response.error,
      sessionId: response.sessionId,
      messageId: response.messageId,
      response: response.message,
      duration: response.duration,
      error: response.error
    });
    
  } catch (error: any) {
    console.error('[API] Chat error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'เกิดข้อผิดพลาดในระบบ',
        details: error.message
      },
      { status: 500 }
    );
  }
}, 'assistant');

/**
 * GET /api/assistant/chat
 * ดึงประวัติการสนทนา
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');
    
    const assistant = AssistantService.getInstance();
    
    // Handle different actions
    switch (action) {
      case 'sessions':
        // Get user sessions
        const sessions = await assistant.getUserSessions(user.id, 20);
        return NextResponse.json({
          success: true,
          sessions
        });
        
      case 'search':
        // Search sessions
        const keyword = searchParams.get('keyword') || '';
        const searchResults = await assistant.searchSessions(user.id, keyword, 20);
        return NextResponse.json({
          success: true,
          results: searchResults
        });
        
      case 'stats':
        // Get user statistics
        const stats = await assistant.getUserStatistics(user.id);
        return NextResponse.json({
          success: true,
          statistics: stats
        });
        
      case 'health':
        // Check service health
        const health = await assistant.checkHealth();
        return NextResponse.json({
          success: health.overall,
          health
        });
        
      default:
        // Get session history
        if (!sessionId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'กรุณาระบุ Session ID' 
            },
            { status: 400 }
          );
        }
        
        const history = await assistant.getSessionHistory(sessionId);
        return NextResponse.json({
          success: true,
          sessionId,
          messages: history
        });
    }
    
  } catch (error: any) {
    console.error('[API] Get chat error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'เกิดข้อผิดพลาดในระบบ',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assistant/chat
 * ลบ session
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        },
        { status: 401 }
      );
    }
    
    // Get session ID from body
    const body = await request.json();
    const sessionId = body.sessionId;
    
    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'กรุณาระบุ Session ID' 
        },
        { status: 400 }
      );
    }
    
    // Delete session
    const assistant = AssistantService.getInstance();
    const success = await assistant.deleteSession(sessionId);
    
    return NextResponse.json({
      success,
      message: success ? 'ลบ session สำเร็จ' : 'ไม่สามารถลบ session ได้'
    });
    
  } catch (error: any) {
    console.error('[API] Delete chat error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'เกิดข้อผิดพลาดในระบบ',
        details: error.message
      },
      { status: 500 }
    );
  }
}