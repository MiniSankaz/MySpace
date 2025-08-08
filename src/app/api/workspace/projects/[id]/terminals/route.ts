import { NextRequest, NextResponse } from 'next/server';
import { terminalService } from '@/modules/workspace/services/terminal.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessions = await terminalService.getProjectSessions(id);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to fetch terminal sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terminal sessions' },
      { status: 500 }
    );
  }
}