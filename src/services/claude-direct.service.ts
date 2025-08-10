import { spawn, ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import { ClaudeBackgroundService } from './claude-background.service';

const execAsync = promisify(exec);

interface ClaudeResponse {
  content: string;
  error?: string;
}

export class ClaudeDirectService extends EventEmitter {
  private static instance: ClaudeDirectService;
  private backgroundService: ClaudeBackgroundService | null = null;
  private isReady = false;
  private useBackgroundMode = false; // Flag to control which mode to use

  private constructor() {
    super();
  }

  static getInstance(): ClaudeDirectService {
    if (!ClaudeDirectService.instance) {
      ClaudeDirectService.instance = new ClaudeDirectService();
    }
    return ClaudeDirectService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isReady) {
      console.log('Claude Direct Service already initialized');
      return;
    }

    try {
      // First try to check if Claude CLI works with simple command
      console.log('🔍 Checking Claude CLI availability...');
      const { stdout, stderr } = await execAsync('claude --version 2>&1', {
        timeout: 5000
      });

      if (stderr && stderr.includes('API key')) {
        console.log('⚠️ Claude CLI needs API key configuration');
        console.log('💡 Using direct exec mode (each message as new command)');
        this.useBackgroundMode = false;
      } else if (stdout && stdout.includes('Claude')) {
        console.log('✅ Claude CLI is available');
        
        // Try background service if CLI is available
        if (this.useBackgroundMode) {
          console.log('🚀 Starting Claude in background mode...');
          this.backgroundService = new ClaudeBackgroundService();
          await this.backgroundService.start();
          
          this.backgroundService.on('error', (error) => {
            console.error('Background service error:', error);
            this.useBackgroundMode = false;
          });
        }
      }
      
      this.isReady = true;
      console.log('✅ Claude Direct Service ready');
      this.emit('ready');
      
    } catch (error: any) {
      console.log('⚠️ Claude CLI not available, using fallback mode');
      console.error('Details:', error.message);
      this.isReady = true; // Still mark as ready to use fallback
      this.emit('ready');
    }
  }

  async sendMessage(message: string, context?: any[]): Promise<ClaudeResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // If background service is available and running, use it
      if (this.useBackgroundMode && this.backgroundService && this.backgroundService.isReady()) {
        console.log('[Claude Direct] Using background service...');
        const response = await this.backgroundService.sendMessage(message);
        return { content: response };
      }

      // Otherwise use direct exec mode (like the main branch version)
      console.log('[Claude Direct] Using direct exec mode...');
      
      // Build message with context if provided
      let fullMessage = message;
      if (context && context.length > 0) {
        const contextMessages = context
          .filter(m => m.role !== 'system')
          .slice(-5) // Last 5 messages for context
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');
        
        if (contextMessages) {
          fullMessage = `Previous conversation:\n${contextMessages}\n\nUser: ${message}\n\nPlease respond considering the conversation context above.`;
        }
      }

      // Escape message for shell
      const escapedMessage = fullMessage
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\\''")
        .replace(/"/g, '\\"')
        .replace(/$/g, '\\$')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n');
      
      // Send to Claude CLI using echo pipe (like main branch)
      const command = `echo -e "${escapedMessage}" | claude 2>&1`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      if (stderr && !stderr.includes('warning')) {
        console.error('[Claude Direct] stderr:', stderr);
      }

      const response = stdout.trim();
      
      // Check for API key error
      if (response.includes('Invalid API key') || response.includes('API key not configured')) {
        console.log('[Claude Direct] API key error detected, using fallback');
        return {
          content: this.getFallbackResponse(message),
          error: 'API key not configured'
        };
      }

      console.log('[Claude Direct] Response received, length:', response.length);
      return { content: response };
      
    } catch (error: any) {
      console.error('[Claude Direct] Error:', error);
      
      // Return fallback response
      return {
        content: this.getFallbackResponse(message),
        error: error.message
      };
    }
  }

  private getFallbackResponse(message: string): string {
    // Don't provide mock responses - just return error
    return 'ระบบไม่พร้อมใช้งาน';
  }

  async stop(): Promise<void> {
    if (this.backgroundService) {
      console.log('Stopping Claude background service...');
      await this.backgroundService.stop();
      this.backgroundService = null;
    }
    this.isReady = false;
  }

  isActive(): boolean {
    return this.isReady;
  }
}