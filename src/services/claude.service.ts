import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  error?: string;
  duration?: number;
}

/**
 * Simplified Claude Service - Direct CLI integration without complexity
 * ระบบ Claude ใหม่ที่เรียบง่าย - เรียก CLI โดยตรงไม่ซับซ้อน
 */
export class ClaudeService {
  private static instance: ClaudeService;
  private readonly timeout = 60000; // 60 seconds - increased for complex queries
  private readonly maxContextMessages = 5; // Keep only recent context
  
  private constructor() {
    // Singleton pattern
  }
  
  static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }
  
  /**
   * Send message to Claude with optional context
   * ส่งข้อความไปยัง Claude พร้อม context (ถ้ามี)
   */
  async sendMessage(
    message: string, 
    context?: ClaudeMessage[]
  ): Promise<ClaudeResponse> {
    const startTime = Date.now();
    
    try {
      // Build context-aware message
      const fullMessage = this.buildContextMessage(message, context);
      
      // Escape message for shell
      const escapedMessage = this.escapeMessage(fullMessage);
      
      // Execute Claude CLI directly with --print flag for better performance
      const command = `echo "${escapedMessage}" | claude --print 2>&1`;
      
      console.log('[Claude] Sending message, length:', fullMessage.length);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: { 
          ...process.env, 
          ANTHROPIC_API_KEY: undefined // Use logged-in Claude CLI
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`[Claude] Response received in ${duration}ms`);
      
      // Check for errors in stderr
      if (stderr && !stderr.includes('warning')) {
        console.error('[Claude] Error output:', stderr);
      }
      
      // Clean and return response
      const response = stdout.trim();
      
      // Check for common error patterns
      if (response.includes('Invalid API key') || response.includes('not configured')) {
        return {
          content: 'ระบบ Claude ยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า Claude CLI',
          error: 'Claude CLI not configured',
          duration
        };
      }
      
      if (!response) {
        return {
          content: 'ไม่ได้รับการตอบกลับจาก Claude กรุณาลองใหม่อีกครั้ง',
          error: 'Empty response',
          duration
        };
      }
      
      return { 
        content: response,
        duration 
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[Claude] Error:', error.message);
      
      // Handle specific errors
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        return {
          content: 'การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่ด้วยข้อความที่สั้นลง',
          error: 'Request timeout',
          duration
        };
      }
      
      if (error.message?.includes('command not found')) {
        return {
          content: 'ไม่พบ Claude CLI กรุณาตรวจสอบการติดตั้ง',
          error: 'Claude CLI not found',
          duration
        };
      }
      
      // Generic error
      return {
        content: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง',
        error: error.message || 'Unknown error',
        duration
      };
    }
  }
  
  /**
   * Build message with context
   * สร้างข้อความพร้อม context การสนทนาก่อนหน้า
   */
  private buildContextMessage(message: string, context?: ClaudeMessage[]): string {
    if (!context || context.length === 0) {
      return message;
    }
    
    // Take only recent messages to avoid token limits
    const recentContext = context.slice(-this.maxContextMessages);
    
    // Format context
    const contextStr = recentContext
      .map(msg => {
        // Truncate very long messages
        const content = msg.content.length > 500 
          ? msg.content.substring(0, 500) + '...' 
          : msg.content;
        
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${content}`;
      })
      .join('\n');
    
    // Return formatted message
    return `Previous conversation:\n${contextStr}\n\nUser: ${message}`;
  }
  
  /**
   * Escape message for shell execution
   * Escape ข้อความให้ปลอดภัยสำหรับ shell
   */
  private escapeMessage(message: string): string {
    return message
      .replace(/\\/g, '\\\\')    // Escape backslashes
      .replace(/"/g, '\\"')       // Escape double quotes
      .replace(/\$/g, '\\$')      // Escape dollar signs
      .replace(/`/g, '\\`')       // Escape backticks
      .replace(/!/g, '\\!')       // Escape exclamation marks
      .replace(/\n/g, '\\n')      // Convert newlines
      .replace(/\r/g, '');        // Remove carriage returns
  }
  
  /**
   * Check if Claude CLI is available
   * ตรวจสอบว่า Claude CLI พร้อมใช้งานหรือไม่
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('claude --version', {
        timeout: 5000
      });
      
      return stdout.includes('Claude');
    } catch (error) {
      console.error('[Claude] CLI not available:', error);
      return false;
    }
  }
  
  /**
   * Get service status
   * ดูสถานะของ service
   */
  async getStatus(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    try {
      const { stdout } = await execAsync('claude --version', {
        timeout: 5000
      });
      
      return {
        available: true,
        version: stdout.trim()
      };
    } catch (error: any) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}