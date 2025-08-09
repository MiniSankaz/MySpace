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
      
      // Use a safer method - write to stdin instead of echo
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const claude = spawn('claude', [], {
          timeout: this.config.timeout,
          shell: false
        });
        
        let stdout = '';
        let stderr = '';
        
        claude.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        
        claude.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
        
        claude.on('close', (code: number) => {
          if (stderr && !stderr.includes('warning')) {
            console.error('[Claude] stderr:', stderr);
          }
          
          const response = stdout.trim();
          console.log('[Claude] Response length:', response.length);
          
          if (code !== 0 && !response) {
            resolve({
              content: `Claude CLI error (code ${code}): ${stderr || 'Unknown error'}`,
              model: 'error',
              error: stderr || `Exit code ${code}`
            });
          } else {
            resolve({
              content: response || 'No response from Claude',
              model: 'claude-cli'
            });
          }
        });
        
        claude.on('error', (error: Error) => {
          console.error('[Claude] Process error:', error);
          resolve({
            content: `Failed to run Claude CLI: ${error.message}. Please ensure Claude CLI is installed and accessible.`,
            model: 'error',
            error: error.message
          });
        });
        
        // Write message to stdin
        claude.stdin.write(fullMessage);
        claude.stdin.end();
      });
      
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