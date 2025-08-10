import { ClaudeDirectService } from '@/services/claude-direct.service';

export interface ClaudeConfig {
  timeout?: number;
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
  private config: ClaudeConfig;
  private claudeService: ClaudeDirectService | null = null;
  private isInitialized = false;

  constructor(config: ClaudeConfig = {}) {
    this.config = {
      timeout: config.timeout || 1800000 // 30 minutes default
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try to use Claude Direct Service
      this.claudeService = ClaudeDirectService.getInstance();
      await this.claudeService.initialize();
      console.log('Claude AI Service initialized (using Claude Direct)');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Claude Direct:', error);
      this.isInitialized = true; // Mark as initialized even if failed
    }
  }

  async sendMessage(message: string, context?: ClaudeMessage[]): Promise<ClaudeResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[Claude] Processing message:', message.substring(0, 100));
      console.log('[Claude] Context messages:', context?.length || 0);
      
      // Try Claude Direct Service
      if (this.claudeService) {
        console.log('[Claude] Using Claude Direct Service...');
        const response = await this.claudeService.sendMessage(message, context);
        
        // Check if response indicates API key error
        if (response.error && (response.error.includes('API key') || response.error.includes('not configured'))) {
          console.log('[Claude] API key error detected');
          
          // Return error message instead of mock
          return {
            content: 'ระบบไม่พร้อมใช้งาน: Claude CLI ยังไม่ได้ตั้งค่า API key\nกรุณาติดต่อผู้ดูแลระบบ',
            model: 'error',
            error: 'Claude CLI not configured'
          };
        }
        
        return {
          content: response.content,
          model: 'claude-direct',
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