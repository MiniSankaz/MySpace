import { spawn, ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ClaudeResponse {
  content: string;
  error?: string;
}

export class ClaudeDirectServiceOptimized extends EventEmitter {
  private static instance: ClaudeDirectServiceOptimized;
  private isReady = false;
  private isInitializing = false;
  private claudeAvailable = false;

  private constructor() {
    super();
  }

  static getInstance(): ClaudeDirectServiceOptimized {
    if (!ClaudeDirectServiceOptimized.instance) {
      ClaudeDirectServiceOptimized.instance = new ClaudeDirectServiceOptimized();
    }
    return ClaudeDirectServiceOptimized.instance;
  }

  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }
    
    // Prevent duplicate initialization
    if (this.isInitializing) {
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (this.isReady || !this.isInitializing) {
            clearInterval(checkReady);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(checkReady);
          resolve();
        }, 3000);
      });
    }

    this.isInitializing = true;

    try {
      // Quick Claude CLI availability check
      console.log('🔍 Checking Claude CLI...');
      const { stdout } = await execAsync('claude --version 2>&1', {
        timeout: 1500 // Very short timeout
      });

      this.claudeAvailable = stdout && stdout.includes('Claude');
      console.log(`✅ Claude CLI ${this.claudeAvailable ? 'available' : 'not available'}`);
      
    } catch (error) {
      this.claudeAvailable = false;
      console.log('⚠️ Claude CLI check failed');
    }

    this.isReady = true;
    this.isInitializing = false;
    this.emit('ready');
  }

  async sendMessageWithSession(sessionId: string, message: string, context?: any[], userId?: string): Promise<ClaudeResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    // Skip session manager complexity - use direct mode
    return this.sendMessage(message, context);
  }

  async sendMessage(message: string, context?: any[]): Promise<ClaudeResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.claudeAvailable) {
      return {
        content: 'Claude CLI is not available. Please check your installation.',
        error: 'Claude CLI not available'
      };
    }

    try {
      console.log('[Claude Direct] Processing message...');
      
      // Build minimal context (max 2 messages for performance)
      let fullMessage = message;
      if (context && context.length > 0) {
        const recentMessages = context
          .filter(m => m.role !== 'system')
          .slice(-2) // Only last 2 messages
          .map(m => {
            // Truncate long messages
            const content = m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content;
            return `${m.role === 'user' ? 'User' : 'Assistant'}: ${content}`;
          })
          .join('\n');
        
        if (recentMessages) {
          fullMessage = `${recentMessages}\n\nUser: ${message}`;
        }
      }

      // Minimal escaping for performance
      const escapedMessage = fullMessage
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`');
      
      // Optimized command
      const command = `echo "${escapedMessage}" | claude`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 seconds - much faster than original 90s
        maxBuffer: 2 * 1024 * 1024, // 2MB buffer
        env: { ...process.env, ANTHROPIC_API_KEY: undefined }
      });

      if (stderr && !stderr.includes('warning')) {
        console.error('[Claude Direct] Warning:', stderr);
      }

      const response = stdout.trim();
      
      if (response.includes('Invalid API key') || response.includes('not configured')) {
        return {
          content: 'Claude API key not configured properly.',
          error: 'API key error'
        };
      }

      console.log('[Claude Direct] Response received, length:', response.length);
      return { content: response };
      
    } catch (error: any) {
      console.error('[Claude Direct] Error:', error);
      
      if (error.code === 'TIMEOUT') {
        return {
          content: 'Request timeout. Please try with a shorter message.',
          error: 'Request timeout'
        };
      }
      
      return {
        content: 'Service temporarily unavailable. Please try again.',
        error: error.message
      };
    }
  }

  async stop(): Promise<void> {
    this.isReady = false;
  }

  isActive(): boolean {
    return this.isReady && this.claudeAvailable;
  }
}