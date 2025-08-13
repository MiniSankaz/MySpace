import { NextRequest, NextResponse } from 'next/server';
import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';
import prisma from '@/core/database/prisma';
import { authHandler } from '@/utils/api-handler';
import { cacheManager, CacheManager } from '@/core/database/cache-manager';

export const GET = authHandler(async (request: NextRequest, user: any) => {
  try {
    const userId = user.id;
    
    // Check cache first
    const cacheKey = CacheManager.generateKey('sessions', userId);
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log('[Sessions] Returning cached data');
      return NextResponse.json({
        success: true,
        sessions: cached,
        fromCache: true
      });
    }
    
    // Try to get from database with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), terminalConfig.websocket.timeout)
    );
    
    const queryPromise = prisma.assistantChatSession.findMany({
      where: { userId },
      select: {
        id: true,
        sessionName: true,
        startedAt: true,
        endedAt: true,
        metadata: true
      },
      orderBy: { startedAt: 'desc' },
      take: 20
    });
    
    try {
      const sessions = await Promise.race([queryPromise, timeoutPromise]) as any[];
      
      // Cache the result
      cacheManager.set(cacheKey, sessions, 120000); // Cache for 2 minutes
      
      return NextResponse.json({
        success: true,
        sessions
      });
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      
      // Return empty array with warning
      return NextResponse.json({
        success: true,
        sessions: [],
        warning: 'Database temporarily unavailable, showing cached or empty data'
      });
    }
  } catch (error) {
    console.error('Get sessions error:', error);
    
    // Return graceful fallback
    return NextResponse.json({
      success: true,
      sessions: [],
      error: 'Unable to load sessions at this time'
    });
  }
}, 'assistant');