import { spawn, ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import { ClaudeBackgroundService } from './claude-background.service';
import { ClaudeSessionManager } from './claude-session-manager.service';
import { AIAssistantConfigService } from './ai-assistant-config.service';

const execAsync = promisify(exec);

interface ClaudeResponse {
  content: string;
  error?: string;
}

export class ClaudeDirectService extends EventEmitter {
  private static instance: ClaudeDirectService;
  private backgroundService: ClaudeBackgroundService | null = null;
  private sessionManager: ClaudeSessionManager;
  private configService: AIAssistantConfigService;
  private isReady = false;
  private useBackgroundMode = false; // Disable background mode - use direct execution for better performance

  private constructor() {
    super();
    this.sessionManager = ClaudeSessionManager.getInstance();
    this.configService = AIAssistantConfigService.getInstance();
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

  async sendMessageWithSession(sessionId: string, message: string, context?: any[], userId?: string): Promise<ClaudeResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Load user settings if userId is provided
      let userConfig = null;
      if (userId) {
        try {
          userConfig = await this.configService.getUserConfig(userId);
          console.log('[Claude Direct] Loaded user config:', {
            timeout: userConfig.responseTimeout,
            maxContext: userConfig.maxContextMessages,
            temperature: userConfig.temperature
          });
        } catch (error) {
          console.log('[Claude Direct] Using default config');
        }
      }

      // Use session manager for background mode
      if (this.useBackgroundMode) {
        console.log(`[Claude Direct] Using session manager for session: ${sessionId}`);
        
        // Build message with context if provided
        let fullMessage = message;
        if (context && context.length > 0) {
          const maxContextMessages = userConfig?.maxContextMessages || 5;
          const contextMessages = context
            .filter(m => m.role !== 'system')
            .slice(-maxContextMessages) // Use user-configured context size
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');
          
          if (contextMessages) {
            fullMessage = `Previous conversation:\n${contextMessages}\n\nUser: ${message}\n\nPlease respond considering the conversation context above.`;
          }
        }
        
        const response = await this.sessionManager.sendMessageToSession(sessionId, fullMessage, userId);
        return { content: response };
      }

      // Fallback to direct exec mode with user settings
      return this.sendMessage(message, context, userId);
    } catch (error: any) {
      console.error('[Claude Direct] Error with session:', error);
      // Fallback to direct mode if session fails
      return this.sendMessage(message, context, userId);
    }
  }

  async sendMessage(message: string, context?: any[], userId?: string): Promise<ClaudeResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Load user settings if userId is provided
      let userConfig = null;
      let timeout = 60000; // Default 60 seconds
      let maxContextMessages = 5; // Default 5 messages
      
      if (userId) {
        try {
          userConfig = await this.configService.getUserConfig(userId);
          timeout = (userConfig.responseTimeout || 60) * 1000; // Convert to milliseconds
          maxContextMessages = userConfig.maxContextMessages || 5;
          console.log('[Claude Direct] Using user config:', {
            timeout: timeout / 1000,
            maxContext: maxContextMessages,
            temperature: userConfig.temperature,
            maxTokens: userConfig.maxTokens
          });
        } catch (error) {
          console.log('[Claude Direct] Using default config');
        }
      }
      // If background service is available and running, use it
      if (this.useBackgroundMode && this.backgroundService && this.backgroundService.isReady()) {
        console.log('[Claude Direct] Using background service...');
        try {
          const response = await Promise.race([
            this.backgroundService.sendMessage(message),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Background service timeout')), 90000)
            )
          ]) as string;
          return { content: response };
        } catch (bgError: any) {
          console.error('[Claude Direct] Background service failed:', bgError.message);
          // Fall through to direct mode
          this.useBackgroundMode = false;
        }
      }

      // Otherwise use direct exec mode (like the main branch version)
      console.log('[Claude Direct] Using direct exec mode...');
      
      // Build message with context if provided
      let fullMessage = message;
      if (context && context.length > 0) {
        const contextMessages = context
          .filter(m => m.role !== 'system')
          .slice(-maxContextMessages) // Use user-configured context size
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
      
      // Send to Claude CLI using echo pipe with --print flag for better performance
      // Unset ANTHROPIC_API_KEY to use logged-in session
      const command = `unset ANTHROPIC_API_KEY && echo -e "${escapedMessage}" | claude --print 2>&1`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeout, // Use user-configured timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, ANTHROPIC_API_KEY: undefined }
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
      
      // Return fallback response with specific error handling
      if (error.code === 'TIMEOUT') {
        return {
          content: 'ขออภัย ระบบตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง',
          error: 'Request timeout'
        };
      }
      
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