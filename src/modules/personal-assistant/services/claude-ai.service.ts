import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  constructor(config: ClaudeConfig = {}) {
    this.config = {
      timeout: config.timeout || 1800000 // 30 minutes default
    };
  }

  async initialize(): Promise<void> {
    console.log('Claude AI Service initialized');
    return Promise.resolve();
  }

  async sendMessage(message: string, context?: ClaudeMessage[]): Promise<ClaudeResponse> {
    try {
      console.log('[Claude] Sending:', message);
      console.log('[Claude] Context messages:', context?.length || 0);
      
      // Build full conversation including context
      let fullMessage = message;
      
      if (context && context.length > 0) {
        // Format context as conversation history
        const conversationParts: string[] = [];
        
        // Add system message if present
        const systemMsg = context.find(m => m.role === 'system');
        if (systemMsg) {
          conversationParts.push(`[Context: ${systemMsg.content}]\n`);
        }
        
        // Add conversation history
        const history = context.filter(m => m.role !== 'system');
        if (history.length > 0) {
          conversationParts.push('Previous conversation:');
          history.forEach(msg => {
            const prefix = msg.role === 'user' ? 'User' : 'Assistant';
            conversationParts.push(`${prefix}: ${msg.content}`);
          });
          conversationParts.push('\nCurrent message:');
        }
        
        conversationParts.push(`User: ${message}`);
        conversationParts.push('\nPlease respond considering the conversation context above.');
        
        fullMessage = conversationParts.join('\n');
      }
      
      // Escape message for shell
      const escapedMessage = fullMessage
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\\''")
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\\\n'); // Keep newlines for context
      
      // Send to Claude CLI
      const command = `echo -e "${escapedMessage}" | claude 2>&1`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.timeout,
        maxBuffer: 100 * 1024 * 1024 // 100MB
      });

      if (stderr && !stderr.includes('warning')) {
        console.error('[Claude] stderr:', stderr);
      }

      const response = stdout.trim();
      console.log('[Claude] Response length:', response.length);
      
      return {
        content: response,
        model: 'claude-cli'
      };
      
    } catch (error: any) {
      console.error('[Claude] Error:', error);
      return {
        content: `Error: ${error.message}`,
        model: 'error',
        error: error.message
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