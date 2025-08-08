/**
 * Claude Realtime Service
 * Manages real-time communication with Claude running in background
 */

import { ClaudeBackgroundService } from '@/services/claude-background.service';
import { EventEmitter } from 'events';

interface ClaudeSession {
  id: string;
  userId: string;
  startTime: Date;
  messageCount: number;
}

export class ClaudeRealtimeService extends EventEmitter {
  private static instance: ClaudeRealtimeService;
  private claudeBackground: ClaudeBackgroundService;
  private sessions: Map<string, ClaudeSession> = new Map();
  private isInitialized = false;

  private constructor() {
    super();
    this.claudeBackground = new ClaudeBackgroundService();
  }

  static getInstance(): ClaudeRealtimeService {
    if (!ClaudeRealtimeService.instance) {
      ClaudeRealtimeService.instance = new ClaudeRealtimeService();
    }
    return ClaudeRealtimeService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Claude Realtime Service already initialized');
      return;
    }

    try {
      // Start Claude background service
      await this.claudeBackground.start();

      // Setup event listeners
      this.claudeBackground.on('ready', () => {
        console.log('✅ Claude Realtime Service ready');
        this.isInitialized = true;
        this.emit('ready');
      });

      this.claudeBackground.on('response', (data) => {
        this.emit('claude-response', data);
      });

      this.claudeBackground.on('error', (error) => {
        console.error('Claude background error:', error);
        this.emit('error', error);
      });

      this.claudeBackground.on('exit', (code) => {
        console.log(`Claude background exited with code ${code}`);
        this.isInitialized = false;
        
        // Auto-restart if unexpected exit
        if (code !== 0) {
          console.log('Attempting to restart Claude background service...');
          setTimeout(() => this.initialize(), 5000);
        }
      });

    } catch (error) {
      console.error('Failed to initialize Claude Realtime Service:', error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Claude Realtime Service not initialized');
    }

    // Track session
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        userId: sessionId.split('-')[0] || 'anonymous',
        startTime: new Date(),
        messageCount: 0
      });
    }

    const session = this.sessions.get(sessionId)!;
    session.messageCount++;

    try {
      // Send message to Claude background
      const response = await this.claudeBackground.sendMessage(message);
      
      // Emit analytics event
      this.emit('message-processed', {
        sessionId,
        messageCount: session.messageCount,
        processingTime: Date.now() - session.startTime.getTime()
      });

      return response;
    } catch (error) {
      console.error('Error sending message to Claude:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.claudeBackground) {
      await this.claudeBackground.stop();
    }
    this.isInitialized = false;
    this.sessions.clear();
  }

  isReady(): boolean {
    return this.isInitialized && this.claudeBackground.isReady();
  }

  getSessionInfo(sessionId: string): ClaudeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ClaudeSession[] {
    return Array.from(this.sessions.values());
  }
}