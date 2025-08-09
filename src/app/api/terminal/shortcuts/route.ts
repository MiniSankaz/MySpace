import { NextRequest, NextResponse } from 'next/server';
import { terminalLoggingService } from '@/services/terminal-logging.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const shortcuts = await terminalLoggingService.getUserShortcuts(userId);
    return NextResponse.json({ shortcuts });
  } catch (error) {
    console.error('Failed to get shortcuts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shortcuts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, alias, command, description } = body;

    if (!userId || !alias || !command) {
      return NextResponse.json(
        { error: 'userId, alias, and command are required' },
        { status: 400 }
      );
    }

    const shortcut = await terminalLoggingService.createShortcut(
      userId,
      alias,
      command,
      description
    );

    return NextResponse.json({ shortcut });
  } catch (error) {
    console.error('Failed to create shortcut:', error);
    return NextResponse.json(
      { error: 'Failed to create shortcut' },
      { status: 500 }
    );
  }
}