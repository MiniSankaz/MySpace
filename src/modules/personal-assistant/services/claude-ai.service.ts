import { ClaudeDirectService } from '@/services/claude-direct.service';
import { AIAssistantConfigService } from '@/services/ai-assistant-config.service';
// import { ClaudeDirectServiceOptimized } from '@/services/claude-direct.service.optimized';

export interface ClaudeConfig {
  timeout?: number;
  maxContextMessages?: number;
  temperature?: number;
  maxTokens?: number;
  debugMode?: boolean;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  model?: string;
  error?: string;
}

export class ClaudeAIService {
  private static instance: ClaudeAIService | null = null;
  private config: ClaudeConfig;
  private configService: AIAssistantConfigService;
  private claudeService: ClaudeDirectService | null = null;
  // private optimizedService: ClaudeDirectServiceOptimized | null = null;
  private isInitialized = false;
  private useOptimized = false; // Disable optimized service - has issues

  private constructor(config: ClaudeConfig = {}) {
    this.configService = AIAssistantConfigService.getInstance();
    this.config = {
      timeout: config.timeout || 60000, // Default fallback
      maxContextMessages: config.maxContextMessages || 10,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      debugMode: config.debugMode || false
    };
  }

  public static getInstance(config: ClaudeConfig = {}): ClaudeAIService {
    if (!ClaudeAIService.instance) {
      ClaudeAIService.instance = new ClaudeAIService(config);
    }
    return ClaudeAIService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Always use original service (optimized version has issues)
      this.claudeService = ClaudeDirectService.getInstance();
      await this.claudeService.initialize();
      console.log('Claude AI Service initialized (using Claude Direct)')
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Claude services:', error);
      this.isInitialized = true;
    }
  }

  async sendMessageWithSession(message: string, sessionId: string, context?: ClaudeMessage[], userId?: string): Promise<ClaudeResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get user-specific configuration
      let userConfig = this.config;
      if (userId) {
        try {
          const claudeConfig = await this.configService.getClaudeConfig(userId);
          userConfig = { ...this.config, ...claudeConfig };
          console.log('[Claude] Using user config:', { 
            timeout: userConfig.timeout,
            maxContextMessages: userConfig.maxContextMessages,
            debugMode: userConfig.debugMode 
          });
        } catch (error) {
          console.warn('[Claude] Failed to load user config, using defaults:', error);
        }
      }

      if (userConfig.debugMode) {
        console.log('[Claude] Debug - Processing message with session:', sessionId);
        console.log('[Claude] Debug - Message:', message.substring(0, 100));
        console.log('[Claude] Debug - Context messages:', context?.length || 0);
        console.log('[Claude] Debug - User config:', userConfig);
      }

      // Limit context messages based on user preference
      let limitedContext = context;
      if (context && context.length > userConfig.maxContextMessages!) {
        limitedContext = context.slice(-userConfig.maxContextMessages!);
        if (userConfig.debugMode) {
          console.log(`[Claude] Debug - Limited context from ${context.length} to ${limitedContext.length} messages`);
        }
      }
      
      // Use Claude Direct Service
      if (this.claudeService) {
        if (userConfig.debugMode) {
          console.log('[Claude] Debug - Using Original Claude Service...');
        }
        
        // Apply timeout from user config
        const response = await Promise.race([
          this.claudeService.sendMessageWithSession(sessionId, message, limitedContext, userId),
          new Promise<ClaudeResponse>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), userConfig.timeout)
          )
        ]);
        
        if (response.error && (response.error.includes('API key') || response.error.includes('not configured'))) {
          return {
            content: 'ระบบไม่พร้อมใช้งาน: Claude CLI ยังไม่ได้ตั้งค่า API key\nกรุณาติดต่อผู้ดูแลระบบ',
            model: 'error',
            error: 'Claude CLI not configured'
          };
        }
        
        return {
          content: response.content,
          model: `claude-direct-session${userConfig.debugMode ? '-debug' : ''}`,
          error: response.error
        };
      }
      
      // No service available - fallback to normal sendMessage
      return this.sendMessage(message, limitedContext, userId);
    } catch (error: any) {
      console.error('[Claude] Session message error:', error);
      // Fallback to normal sendMessage
      return this.sendMessage(message, context, userId);
    }
  }

  async sendMessage(message: string, context?: ClaudeMessage[], userId?: string): Promise<ClaudeResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get user-specific configuration
      let userConfig = this.config;
      if (userId) {
        try {
          const claudeConfig = await this.configService.getClaudeConfig(userId);
          userConfig = { ...this.config, ...claudeConfig };
        } catch (error) {
          console.warn('[Claude] Failed to load user config, using defaults:', error);
        }
      }

      if (userConfig.debugMode) {
        console.log('[Claude] Debug - Processing message:', message.substring(0, 100));
        console.log('[Claude] Debug - Context messages:', context?.length || 0);
        console.log('[Claude] Debug - User config:', userConfig);
      }

      // Limit context messages based on user preference
      let limitedContext = context;
      if (context && context.length > userConfig.maxContextMessages!) {
        limitedContext = context.slice(-userConfig.maxContextMessages!);
        if (userConfig.debugMode) {
          console.log(`[Claude] Debug - Limited context from ${context.length} to ${limitedContext.length} messages`);
        }
      }
      
      // Try optimized service first
      if (this.useOptimized && this.optimizedService) {
        if (userConfig.debugMode) {
          console.log('[Claude] Debug - Using Optimized Claude Service...');
        }
        const response = await this.optimizedService.sendMessage(message, limitedContext);
        
        if (response.error && response.error.includes('API key')) {
          return {
            content: 'ระบบไม่พร้อมใช้งาน: Claude CLI ยังไม่ได้ตั้งค่า API key\nกรุณาติดต่อผู้ดูแลระบบ',
            model: 'error',
            error: 'Claude CLI not configured'
          };
        }
        
        return {
          content: response.content,
          model: `claude-optimized${userConfig.debugMode ? '-debug' : ''}`,
          error: response.error
        };
      }
      
      // Fallback to original service
      if (this.claudeService) {
        if (userConfig.debugMode) {
          console.log('[Claude] Debug - Using Original Claude Service...');
        }
        
        // Apply timeout from user config
        const response = await Promise.race([
          this.claudeService.sendMessage(message, limitedContext),
          new Promise<ClaudeResponse>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), userConfig.timeout)
          )
        ]);
        
        if (response.error && (response.error.includes('API key') || response.error.includes('not configured'))) {
          return {
            content: 'ระบบไม่พร้อมใช้งาน: Claude CLI ยังไม่ได้ตั้งค่า API key\nกรุณาติดต่อผู้ดูแลระบบ',
            model: 'error',
            error: 'Claude CLI not configured'
          };
        }
        
        return {
          content: response.content,
          model: `claude-direct${userConfig.debugMode ? '-debug' : ''}`,
          error: response.error
        };
      }
      
      // No service available
      return {
        content: 'ระบบไม่พร้อมใช้งาน: ไม่สามารถเชื่อมต่อกับ Claude AI ได้\nกรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ',
        model: 'error',
        error: 'Service unavailable'
      };
      
    } catch (error: any) {
      console.error('[Claude] Error:', error);
      
      // Return error message
      return {
        content: 'เกิดข้อผิดพลาด: ไม่สามารถประมวลผลได้\nกรุณาลองใหม่อีกครั้ง',
        model: 'error', 
        error: error.message || 'Unknown error'
      };
    }
  }

  // Empty methods for compatibility
  async analyzeCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.sendMessage(`Analyze this ${language} code: ${code}`);
  }

  async generateCode(requirements: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.sendMessage(`Generate ${language} code: ${requirements}`);
  }

  async explainCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.sendMessage(`Explain this ${language} code: ${code}`);
  }

  async debugCode(code: string, error: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.sendMessage(`Debug this ${language} code with error "${error}": ${code}`);
  }

  terminate(): void {
    console.log('Claude AI Service terminated');
  }
}