/**
 * API Route: GET /api/terminal-v2/list
 * List terminal sessions ผ่าน migration service
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrationService } from '@/services/terminal-v2/migration/migration-service';

export async function GET(request: NextRequest) {
  try {
    // ดึง projectId จาก query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[Terminal V2 API] Listing sessions for project: ${projectId}`);
    
    // ดึง sessions ผ่าน migration service
    const sessions = migrationService.listSessions(projectId);
    
    // ดึง migration status
    const migrationStatus = migrationService.getStatus();
    
    console.log(`[Terminal V2 API] Found ${sessions.length} sessions`);
    
    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        projectId: session.projectId,
        type: session.type || 'terminal',
        mode: session.mode || 'normal',
        tabName: session.tabName || 'Terminal',
        status: session.status || 'active',
        isFocused: session.isFocused || false,
        active: session.active !== undefined ? session.active : true,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      })),
      migrationInfo: {
        mode: migrationStatus.mode,
        usingNewSystem: migrationStatus.featureFlags.useNewSessionManager
      }
    });
    
  } catch (error) {
    console.error('[Terminal V2 API] Failed to list sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sessions'
      },
      { status: 500 }
    );
  }
}