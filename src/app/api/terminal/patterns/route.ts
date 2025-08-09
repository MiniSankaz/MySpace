import { NextRequest, NextResponse } from 'next/server';
import { terminalLoggingService } from '@/services/terminal-logging.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minFrequency = parseInt(searchParams.get('minFrequency') || '10');
    const userId = searchParams.get('userId');

    if (userId) {
      // Get workflow patterns for specific user
      const patterns = await terminalLoggingService.detectWorkflowPatterns(userId);
      return NextResponse.json({ patterns });
    } else {
      // Get global command patterns
      const patterns = await terminalLoggingService.getCommandPatterns(minFrequency);
      return NextResponse.json({ patterns });
    }
  } catch (error) {
    console.error('Failed to get patterns:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve patterns' },
      { status: 500 }
    );
  }
}