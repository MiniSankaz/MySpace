import { NextRequest, NextResponse } from 'next/server';
import { ClaudeCodeService } from '@/server/services/claude-code.service';

const claudeCodeService = new ClaudeCodeService();

export async function POST(request: NextRequest) {
  try {
    const { command, context } = await request.json();
    
    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Parse and execute command through Claude Code CLI
    const parsedCommand = claudeCodeService.parseCommand(command);
    const response = await claudeCodeService.executeCommand(parsedCommand.prompt, context);
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Claude terminal error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute Claude command',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'history':
        // For now, return empty history since we're using CLI
        return NextResponse.json({ history: [] });
        
      case 'suggestions':
        const input = searchParams.get('input') || '';
        const suggestions = claudeCodeService.getSuggestions(input);
        return NextResponse.json({ suggestions });
        
      default:
        return NextResponse.json({
          status: 'ready',
          availableCommands: [
            'create/generate - Generate code',
            'explain - Explain code or concepts',
            'fix/debug - Fix issues in code',
            'refactor/improve - Refactor code',
            'test - Generate tests',
            'document - Add documentation',
          ]
        });
    }
  } catch (error) {
    console.error('Claude terminal GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Claude terminal data' },
      { status: 500 }
    );
  }
}