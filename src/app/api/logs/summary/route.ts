import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { assistantLogger } from '@/services/assistant-logging.service';
import { workspaceTerminalLogger } from '@/services/workspace-terminal-logging.service';
import { z } from 'zod';
import { mockLogsSummary } from '../mock-data';

const querySchema = z.object({
  projectId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    // Configuration - can be set via environment variable
    const useMockData = process.env.USE_MOCK_LOGS === 'true' || false; // Use real data by default
    
    // Return mock data immediately if enabled (bypass auth for testing)
    if (useMockData) {
      console.log('[Logs API - Summary] Using mock data (auth bypassed)');
      return NextResponse.json(mockLogsSummary);
    }
    
    // Verify authentication for real data
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get both assistant and terminal statistics
    const [assistantStats, terminalStats, assistantSessions, terminalSessions] = await Promise.all([
      assistantLogger.getProjectStats(projectId),
      workspaceTerminalLogger.getProjectStats(projectId),
      assistantLogger.getUserSessions(user.id, projectId),
      workspaceTerminalLogger.getProjectSessions(projectId),
    ]);

    // Get recent commands from terminal
    const recentCommands = await workspaceTerminalLogger.getProjectCommands(projectId, 10);

    return NextResponse.json({
      success: true,
      projectId,
      summary: {
        assistant: {
          stats: assistantStats,
          activeSessions: assistantSessions.length,
          lastActivity: assistantSessions[0]?.lastActiveAt || null,
        },
        terminal: {
          stats: terminalStats,
          activeSessions: terminalSessions.filter(s => s.active).length,
          totalSessions: terminalSessions.length,
          recentCommands: recentCommands.map(cmd => ({
            command: cmd.command,
            timestamp: cmd.timestamp,
            exitCode: cmd.exitCode,
          })),
        },
        overall: {
          totalAiTokens: assistantStats.totalTokens,
          totalAiCost: assistantStats.totalCost,
          totalTerminalCommands: terminalStats.totalCommands,
          errorRate: terminalStats.errorRate,
        },
      },
    });
  } catch (error) {
    console.error('Get logs summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}