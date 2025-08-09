import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { terminalLoggingService } from '@/services/terminal-logging.service';

export async function GET(req: NextRequest) {
  try {
    // Get session for authentication
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (sessionId) {
      // Get logs for specific session
      const logs = await terminalLoggingService.getSessionLogs(sessionId, limit);
      return NextResponse.json({ logs });
    } else if (userId) {
      // Get user analytics
      const days = parseInt(searchParams.get('days') || '30');
      const analytics = await terminalLoggingService.getUserAnalytics(userId, days);
      return NextResponse.json({ analytics });
    } else {
      return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to get terminal logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    );
  }
}