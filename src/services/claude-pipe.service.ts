import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ClaudePipeService {
  private static instance: ClaudePipeService;
  
  private constructor() {}

  static getInstance(): ClaudePipeService {
    if (!ClaudePipeService.instance) {
      ClaudePipeService.instance = new ClaudePipeService();
    }
    return ClaudePipeService.instance;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Convert Thai message to English if needed (Claude works better with English)
      const processedMessage = this.preprocessMessage(message);
      
      // Escape the message for shell - handle special characters
      const escapedMessage = processedMessage
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\\''")
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`');
      
      // Send to Claude via pipe with longer timeout
      const command = `echo '${escapedMessage}' | claude 2>&1`;
      
      console.log('Sending to Claude:', processedMessage);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });

      if (stderr) {
        console.error('Claude stderr:', stderr);
      }

      const response = stdout.trim();
      console.log('Claude response:', response.substring(0, 100) + '...');
      
      return this.cleanResponse(response);
    } catch (error: any) {
      console.error('Error calling Claude:', error);
      
      // Return fallback response
      return this.getFallbackResponse(message);
    }
  }

  private cleanResponse(response: string): string {
    // Remove any system messages or formatting
    let cleaned = response
      .replace(/^.*Code,.*$/gm, '') // Remove intro lines
      .replace(/^What would you like.*$/gm, '') // Remove prompt questions
      .trim();

    // If response is too short, return the original
    if (cleaned.length < 20) {
      cleaned = response;
    }

    return cleaned || 'ขออภัยครับ ไม่สามารถประมวลผลได้ในขณะนี้';
  }

  private preprocessMessage(message: string): string {
    // Simple Thai to English translation for common phrases
    const translations: { [key: string]: string } = {
      'สวัสดี': 'Hello',
      'คุณทำอะไรได้บ้าง': 'What can you do?',
      'ช่วยอะไรได้บ้าง': 'How can you help?',
      'คุณชื่ออะไร': 'What is your name?',
      'คุณคือใคร': 'Who are you?',
      'ให้ทำยังไง': 'How to do it?',
      'อธิบาย': 'explain',
      'เขียนโค้ด': 'write code',
      'ช่วย': 'help',
      'ทำไม': 'why',
      'อย่างไร': 'how',
      'อะไร': 'what',
      'ที่ไหน': 'where',
      'เมื่อไหร่': 'when'
    };

    // Check for exact matches first
    for (const [thai, english] of Object.entries(translations)) {
      if (message.includes(thai)) {
        message = message.replace(thai, english);
      }
    }

    // If message is mostly Thai, provide English equivalent
    if (/[\u0E00-\u0E7F]/.test(message)) {
      // Has Thai characters - add English context
      return `[Thai message: ${message}] Please respond in both Thai and English if possible.`;
    }

    return message;
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (message.includes('สวัสดี') || lowerMessage.includes('hello')) {
      return 'สวัสดีครับ! ผมคือ AI Assistant ยินดีที่ได้รู้จักครับ มีอะไรให้ช่วยไหม?';
    }
    
    if (message.includes('อากาศ') || lowerMessage.includes('weather')) {
      return 'ขออภัยครับ ผมไม่สามารถเข้าถึงข้อมูลอากาศแบบ real-time ได้ แต่คุณสามารถเช็คได้จาก Google Weather หรือแอพพยากรณ์อากาศครับ';
    }
    
    if (message.includes('ชื่อ') || message.includes('คุณคือ') || lowerMessage.includes('who are you')) {
      return 'ผมคือ Claude AI Assistant ครับ ผมถูกสร้างโดย Anthropic เพื่อช่วยเหลือคุณในด้านต่างๆ';
    }
    
    if (lowerMessage.includes('code') || message.includes('โค้ด')) {
      return 'ผมสามารถช่วยเขียนโค้ดได้ครับ! บอกรายละเอียดที่ต้องการ เช่น ภาษา, function ที่ต้องการ, หรือปัญหาที่เจอ';
    }
    
    return `ได้รับข้อความของคุณแล้วครับ: "${message}"\n\nผมพร้อมช่วยเหลือคุณ ลองถามคำถามหรือขอความช่วยเหลือได้เลยครับ`;
  }
}