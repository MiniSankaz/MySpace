import { MockAIService } from './mock-ai.service';

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
  private mockService: MockAIService;

  constructor(config: ClaudeConfig = {}) {
    this.config = {
      timeout: config.timeout || 1800000 // 30 minutes default
    };
    this.mockService = new MockAIService();
  }

  async initialize(): Promise<void> {
    console.log('Claude AI Service initialized (using Mock Service)');
    await this.mockService.initialize();
    return Promise.resolve();
  }

  async sendMessage(message: string, context?: ClaudeMessage[]): Promise<ClaudeResponse> {
    try {
      console.log('[Claude] Using Mock Service for:', message);
      console.log('[Claude] Context messages:', context?.length || 0);
      
      // Use mock service directly
      return await this.mockService.sendMessage(message, context);
      
    } catch (error: any) {
      console.error('[Claude] Error:', error);
      return {
        content: `Error: ${error.message}`,
        model: 'error',
        error: error.message
      };
    }
  }

  // Delegate to mock service
  async analyzeCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.mockService.analyzeCode(code, language);
  }

  async generateCode(requirements: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.mockService.generateCode(requirements, language);
  }

  async explainCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.mockService.explainCode(code, language);
  }

  async debugCode(code: string, error: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return this.mockService.debugCode(code, error, language);
  }

  terminate(): void {
    this.mockService.terminate();
    console.log('Claude AI Service terminated');
  }
}