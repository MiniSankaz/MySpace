/**
 * API Route: DELETE /api/terminal-v2/close/[sessionId]
 * ปิด terminal session ผ่าน migration service
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrationService } from '@/services/terminal-v2/migration/migration-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }
    
    console.log(`[Terminal V2 API] Closing session: ${sessionId}`);
    
    // ปิด session ผ่าน migration service
    const success = migrationService.closeSession(sessionId);
    
    if (success) {
      console.log(`[Terminal V2 API] ✅ Closed session ${sessionId}`);
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} closed successfully`
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to close session'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Terminal V2 API] Failed to close session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close session'
      },
      { status: 500 }
    );
  }
}