/**
 * API Route: GET /api/terminal/health
 * Get terminal system health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { TerminalService } from '@/services/terminal.service';
import { logger } from '@/core/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Get health status (no auth required for health check)
    const terminalService = TerminalService.getInstance();
    const healthStatus = terminalService.getHealthStatus();

    return NextResponse.json(healthStatus);
  } catch (error) {
    logger.error('Failed to get terminal health status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get health status',
        system: {
          status: 'disconnected',
          activeSessions: 0,
          port: 4001
        },
        claude: {
          status: 'disconnected',
          activeSessions: 0,
          port: 4002
        }
      },
      { status: 500 }
    );
  }
}