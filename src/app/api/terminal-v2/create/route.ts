/**
 * API Route: POST /api/terminal-v2/create
 * สร้าง terminal session ผ่าน migration service
 * รองรับการ migrate แบบค่อยเป็นค่อยไป
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { migrationService } from '@/services/terminal-v2/migration/migration-service';

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ auth
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('next-auth.session-token')?.value;
    
    let userId = 'system';
    if (!sessionToken) {
      console.log('[Terminal V2 API] No auth token, using system user');
    }

    // รับ request body
    const body = await request.json();
    const { projectId, projectPath, mode = 'normal' } = body;
    
    console.log(`[Terminal V2 API] 📨 Create request - project: ${projectId}, mode: ${mode}`);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // ตรวจสอบ path
    const validatedPath = projectPath || process.cwd();
    console.log(`[Terminal V2 API] Using path: ${validatedPath}`);

    // สร้าง session ผ่าน migration service
    const session = await migrationService.createSession({
      projectId,
      projectPath: validatedPath,
      userId,
      mode
    });

    console.log(`[Terminal V2 API] ✅ Created session ${session.id}`);

    // ดึง migration status
    const migrationStatus = migrationService.getStatus();
    
    // Format response ให้เข้ากับ frontend
    const response = {
      success: true,
      session: {
        id: session.id,
        projectId: session.projectId,
        type: session.type || 'terminal',
        mode: session.mode || mode,
        tabName: session.tabName || 'Terminal',
        status: session.status || 'active',
        isFocused: session.isFocused !== undefined ? session.isFocused : true,
        active: session.active !== undefined ? session.active : true,
        createdAt: session.createdAt || new Date(),
        updatedAt: session.updatedAt || new Date()
      },
      websocketReady: true,
      migrationInfo: {
        mode: migrationStatus.mode,
        usingNewSystem: migrationStatus.featureFlags.useNewSessionManager,
        stats: {
          migrated: migrationStatus.sessionsMigrated,
          legacy: migrationStatus.sessionsLegacy,
          errors: migrationStatus.errors
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Terminal V2 API] Failed to create session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      },
      { status: 500 }
    );
  }
}