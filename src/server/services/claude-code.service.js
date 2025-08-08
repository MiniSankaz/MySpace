const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ClaudeCodeService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Execute Claude Code command through CLI
   */
  async executeCommand(command, context = {}) {
    const { projectPath, sessionId } = context;
    
    return new Promise((resolve, reject) => {
      // Build the claude command with --print flag for non-interactive output
      // Use echo to pipe the command to claude
      const claudeCmd = `echo "${command.replace(/"/g, '\\"')}" | claude --print`;
      
      console.log('Executing Claude Code:', claudeCmd);
      
      exec(claudeCmd, {
        cwd: projectPath || process.cwd(),
        env: {
          ...process.env,
          // Claude Code respects these environment variables
          CLAUDE_MODEL: 'claude-3-sonnet',
          CLAUDE_MAX_TOKENS: '4096',
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Claude Code error:', error);
          reject(new Error(`Claude Code error: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.warn('Claude Code stderr:', stderr);
        }
        
        resolve(stdout);
      });
    });
  }

  /**
   * Create a streaming session with Claude Code
   */
  createStreamingSession(sessionId, projectPath) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    // Start Claude in interactive mode (no flags needed)
    const claudeProcess = spawn('claude', [], {
      cwd: projectPath || process.cwd(),
      env: {
        ...process.env,
        CLAUDE_MODEL: 'claude-3-sonnet',
        CLAUDE_MAX_TOKENS: '4096',
        TERM: 'dumb', // Disable color output
      },
    });

    const session = {
      process: claudeProcess,
      output: [],
      listeners: new Set(),
    };

    // Handle stdout
    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      session.output.push(output);
      
      // Notify all listeners
      session.listeners.forEach(listener => {
        listener({ type: 'output', data: output });
      });
    });

    // Handle stderr
    claudeProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Claude Code stderr:', error);
      
      session.listeners.forEach(listener => {
        listener({ type: 'error', data: error });
      });
    });

    // Handle process exit
    claudeProcess.on('close', (code) => {
      console.log(`Claude Code process exited with code ${code}`);
      
      session.listeners.forEach(listener => {
        listener({ type: 'exit', code });
      });
      
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Send input to a streaming session
   */
  sendToSession(sessionId, input) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.process.stdin.write(input + '\n');
  }

  /**
   * Add listener to a session
   */
  addSessionListener(sessionId, listener) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      session.listeners.delete(listener);
    };
  }

  /**
   * Close a session
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.kill();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Close all sessions
   */
  closeAllSessions() {
    this.sessions.forEach((session, id) => {
      session.process.kill();
    });
    this.sessions.clear();
  }

  /**
   * Parse Claude Code commands for better integration
   */
  parseCommand(input) {
    const lowerInput = input.toLowerCase().trim();
    
    // Map common commands to Claude Code format
    if (lowerInput.startsWith('create ') || lowerInput.startsWith('generate ')) {
      return {
        type: 'code',
        prompt: `Please create ${input.replace(/^(create|generate)\s+/i, '')}`,
      };
    }
    
    if (lowerInput.startsWith('explain ')) {
      return {
        type: 'explain',
        prompt: `Please explain ${input.replace(/^explain\s+/i, '')}`,
      };
    }
    
    if (lowerInput.startsWith('fix ') || lowerInput.startsWith('debug ')) {
      return {
        type: 'fix',
        prompt: `Please help me fix ${input.replace(/^(fix|debug)\s+/i, '')}`,
      };
    }
    
    if (lowerInput.startsWith('refactor ') || lowerInput.startsWith('improve ')) {
      return {
        type: 'refactor',
        prompt: `Please refactor ${input.replace(/^(refactor|improve)\s+/i, '')}`,
      };
    }
    
    if (lowerInput.startsWith('test ')) {
      return {
        type: 'test',
        prompt: `Please write tests for ${input.replace(/^test\s+/i, '')}`,
      };
    }
    
    if (lowerInput.startsWith('document ')) {
      return {
        type: 'document',
        prompt: `Please add documentation for ${input.replace(/^document\s+/i, '')}`,
      };
    }
    
    // Direct command - pass through as is
    return {
      type: 'direct',
      prompt: input,
    };
  }

  /**
   * Get command suggestions
   */
  getSuggestions(partialInput) {
    const suggestions = [
      'create a React component',
      'generate API endpoint',
      'explain this code',
      'fix the error',
      'refactor for performance',
      'test this function',
      'document this module',
      'how to implement authentication',
      'what is the best way to handle state',
      'optimize database queries',
      'add error handling',
      'implement caching',
      'create TypeScript types',
      'setup testing environment',
    ];
    
    return suggestions
      .filter(s => s.toLowerCase().includes(partialInput.toLowerCase()))
      .slice(0, 5);
  }
}

module.exports = { ClaudeCodeService };