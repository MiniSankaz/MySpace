import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface ClaudeMessage {
  id: string;
  query: string;
  response?: string;
  error?: string;
  timestamp: number;
}

export class ClaudeBackgroundService extends EventEmitter {
  private claudeProcess: ChildProcess | null = null;
  private isRunning = false;
  private messageQueue: Map<string, ClaudeMessage> = new Map();
  private rl: readline.Interface | null = null;
  private responseBuffer = '';
  private currentMessageId: string | null = null;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Claude background service already running');
      return;
    }

    try {
      console.log('🚀 Starting Claude background service...');
      
      // Start Claude CLI in interactive mode (using logged-in session)
      // Remove any API key from environment to use logged-in session
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;
      
      // Use claude without --continue for interactive mode
      this.claudeProcess = spawn('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        shell: true
      });

      if (!this.claudeProcess.stdin || !this.claudeProcess.stdout) {
        throw new Error('Failed to create Claude process streams');
      }

      // Create readline interface for better control
      this.rl = readline.createInterface({
        input: this.claudeProcess.stdout,
        output: process.stdout,
        terminal: false
      });

      // Handle Claude output
      this.rl.on('line', (line: string) => {
        console.log('[Claude Output]:', line);
        this.handleClaudeOutput(line);
      });

      // Handle process errors
      this.claudeProcess.on('error', (error) => {
        console.error('❌ Claude process error:', error);
        this.emit('error', error);
      });

      // Handle process exit
      this.claudeProcess.on('exit', (code) => {
        console.log(`Claude process exited with code ${code}`);
        this.isRunning = false;
        this.emit('exit', code);
      });

      this.isRunning = true;
      console.log('✅ Claude background service started');
      this.emit('ready');

    } catch (error) {
      console.error('Failed to start Claude background service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.claudeProcess) {
      return;
    }

    console.log('Stopping Claude background service...');
    
    if (this.rl) {
      this.rl.close();
    }

    this.claudeProcess.kill('SIGTERM');
    this.isRunning = false;
    this.claudeProcess = null;
    
    console.log('Claude background service stopped');
    this.emit('stopped');
  }

  async sendMessage(query: string): Promise<string> {
    if (!this.isRunning || !this.claudeProcess || !this.claudeProcess.stdin) {
      throw new Error('Claude background service is not running');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: ClaudeMessage = {
      id: messageId,
      query,
      timestamp: Date.now()
    };

    this.messageQueue.set(messageId, message);
    this.currentMessageId = messageId;
    this.responseBuffer = '';

    // Send query to Claude
    this.claudeProcess.stdin.write(`${query}\n`);

    // Wait for response with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error('Claude response timeout - try shorter messages or check system status'));
      }, 120000); // 120 second timeout (2 minutes)

      const checkResponse = setInterval(() => {
        const msg = this.messageQueue.get(messageId);
        if (msg && msg.response) {
          clearInterval(checkResponse);
          clearTimeout(timeout);
          this.messageQueue.delete(messageId);
          resolve(msg.response);
        } else if (msg && msg.error) {
          clearInterval(checkResponse);
          clearTimeout(timeout);
          this.messageQueue.delete(messageId);
          reject(new Error(msg.error));
        }
      }, 100);
    });
  }

  private handleClaudeOutput(line: string) {
    // Skip empty lines and prompts
    if (!line.trim() || line.includes('Human:') || line.includes('Assistant:')) {
      return;
    }

    // Accumulate response
    this.responseBuffer += line + '\n';

    // Detect end of response (Claude usually has clear response boundaries)
    if (this.isCompleteResponse(line)) {
      if (this.currentMessageId) {
        const message = this.messageQueue.get(this.currentMessageId);
        if (message) {
          message.response = this.responseBuffer.trim();
          this.emit('response', {
            id: this.currentMessageId,
            query: message.query,
            response: message.response
          });
        }
        this.currentMessageId = null;
        this.responseBuffer = '';
      }
    }
  }

  private isCompleteResponse(line: string): boolean {
    // Detect response completion patterns
    // This may need adjustment based on Claude's actual output format
    return (
      line.includes('---') ||
      line.includes('═══') ||
      (this.responseBuffer.length > 100 && line.trim() === '') ||
      this.responseBuffer.split('\n').length > 10
    );
  }

  isReady(): boolean {
    return this.isRunning;
  }
}