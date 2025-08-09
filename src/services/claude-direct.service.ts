import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { MockAIService } from '@/modules/personal-assistant/services/mock-ai.service';

interface ClaudeResponse {
  content: string;
  error?: string;
}

export class ClaudeDirectService extends EventEmitter {
  private static instance: ClaudeDirectService;
  private claudeProcess: ChildProcess | null = null;
  private isReady = false;
  private currentCallback: ((response: string) => void) | null = null;
  private responseBuffer = '';
  private responseTimeout: NodeJS.Timeout | null = null;
  private mockService: MockAIService | null = null;
  private useMockService = false;

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
    if (this.isReady && (this.claudeProcess || this.mockService)) {
      console.log('Claude Direct Service already initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('🚀 Starting Claude in direct mode...');
        
        // Try to start Claude CLI first
        this.claudeProcess = spawn('claude', [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env,
          shell: true
        });

        if (!this.claudeProcess.stdout || !this.claudeProcess.stdin) {
          throw new Error('Failed to create Claude process streams');
        }

        // Handle Claude output
        this.claudeProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log('[Claude Output]:', output);
          this.handleOutput(output);
        });

        // Handle errors
        this.claudeProcess.stderr.on('data', (data: Buffer) => {
          console.error('[Claude Error]:', data.toString());
        });

        // Handle process exit
        this.claudeProcess.on('exit', (code) => {
          console.log(`Claude process exited with code ${code}`);
          this.isReady = false;
          this.claudeProcess = null;
          this.emit('exit', code);
        });

        // Handle process errors - fallback to mock service
        this.claudeProcess.on('error', async (error) => {
          console.error('❌ Claude process error:', error);
          console.log('🔄 Switching to Mock AI Service...');
          
          // Initialize mock service as fallback
          this.mockService = new MockAIService();
          await this.mockService.initialize();
          this.useMockService = true;
          this.isReady = true;
          
          console.log('✅ Mock AI Service ready');
          this.emit('ready');
          resolve();
        });

        // Wait a bit for Claude to initialize
        setTimeout(() => {
          if (!this.useMockService) {
            this.isReady = true;
            console.log('✅ Claude Direct Service ready');
            this.emit('ready');
            resolve();
          }
        }, 2000);

      } catch (error) {
        console.error('Failed to start Claude, using mock service:', error);
        
        // Fallback to mock service
        this.mockService = new MockAIService();
        await this.mockService.initialize();
        this.useMockService = true;
        this.isReady = true;
        
        console.log('✅ Mock AI Service ready (fallback)');
        this.emit('ready');
        resolve();
      }
    });
  }

  private handleOutput(output: string) {
    // Accumulate response
    this.responseBuffer += output;

    // Clear existing timeout
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
    }

    // Set new timeout to detect end of response
    this.responseTimeout = setTimeout(() => {
      if (this.currentCallback && this.responseBuffer.trim()) {
        // Clean the response
        const cleanedResponse = this.cleanResponse(this.responseBuffer);
        this.currentCallback(cleanedResponse);
        this.currentCallback = null;
        this.responseBuffer = '';
      }
    }, 1000); // Wait 1 second of silence before considering response complete
  }

  private cleanResponse(response: string): string {
    // Remove ANSI codes and clean up the response
    let cleaned = response
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/Human:.*$/gm, '') // Remove Human: prompts
      .replace(/Assistant:.*$/gm, '') // Remove Assistant: labels
      .trim();

    // If response is too short or looks like a prompt, return a better message
    if (cleaned.length < 10 || cleaned.includes('│') || cleaned.includes('───')) {
      return 'กำลังประมวลผล... กรุณาลองใหม่อีกครั้ง';
    }

    return cleaned;
  }

  async sendMessage(message: string): Promise<string> {
    // Use mock service if available
    if (this.useMockService && this.mockService) {
      const response = await this.mockService.sendMessage(message);
      return response.content;
    }

    if (!this.isReady || !this.claudeProcess || !this.claudeProcess.stdin) {
      console.error('Claude not ready, initializing...');
      await this.initialize();
      
      // After initialization, check if we're using mock service
      if (this.useMockService && this.mockService) {
        const response = await this.mockService.sendMessage(message);
        return response.content;
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.currentCallback = null;
        this.responseBuffer = '';
        resolve(this.getFallbackResponse(message));
      }, 10000); // 10 second timeout

      this.currentCallback = (response: string) => {
        clearTimeout(timeout);
        resolve(response);
      };

      // Clear buffer before sending
      this.responseBuffer = '';

      // Send message to Claude
      try {
        this.claudeProcess!.stdin!.write(message + '\n');
      } catch (error) {
        console.error('Error sending to Claude:', error);
        clearTimeout(timeout);
        resolve(this.getFallbackResponse(message));
      }
    });
  }

  private getFallbackResponse(message: string): string {
    // Thai language fallback responses
    if (message.includes('สวัสดี')) {
      return 'สวัสดีครับ! ยินดีที่ได้รู้จัก มีอะไรให้ช่วยไหมครับ?';
    }
    if (message.includes('อากาศ')) {
      return 'ขออภัยครับ ผมไม่สามารถเข้าถึงข้อมูลอากาศแบบ real-time ได้ แนะนำให้เช็คจาก Google Weather หรือแอพพยากรณ์อากาศครับ';
    }
    if (message.includes('ชื่อ') || message.includes('คุณคือ')) {
      return 'ผมคือ Claude AI Assistant ครับ พร้อมช่วยเหลือคุณในทุกเรื่อง!';
    }
    return `ได้รับข้อความของคุณแล้วครับ: "${message}" \n\nมีอะไรให้ช่วยเพิ่มเติมไหมครับ?`;
  }

  async stop(): Promise<void> {
    if (this.claudeProcess) {
      console.log('Stopping Claude Direct Service...');
      this.claudeProcess.kill('SIGTERM');
      this.claudeProcess = null;
      this.isReady = false;
    }
  }

  isActive(): boolean {
    return this.isReady && this.claudeProcess !== null;
  }

  terminate(): void {
    if (this.mockService) {
      this.mockService.terminate();
      this.mockService = null;
    }
    
    if (this.claudeProcess) {
      console.log('Terminating Claude process...');
      this.claudeProcess.kill();
      this.claudeProcess = null;
    }
    
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }
    
    this.isReady = false;
    this.useMockService = false;
    this.currentCallback = null;
    this.responseBuffer = '';
  }
}