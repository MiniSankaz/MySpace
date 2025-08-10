import { ClaudeBackgroundService } from './claude-background.service';
import { EventEmitter } from 'events';

interface ClaudeSession {
  sessionId: string;
  service: ClaudeBackgroundService;
  createdAt: Date;
  lastActivity: Date;
  userId?: string;
}

export class ClaudeSessionManager extends EventEmitter {
  private static instance: ClaudeSessionManager;
  private sessions: Map<string, ClaudeSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    super();
    // Clean up inactive sessions every 5 minutes
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  static getInstance(): ClaudeSessionManager {
    if (!ClaudeSessionManager.instance) {
      ClaudeSessionManager.instance = new ClaudeSessionManager();
    }
    return ClaudeSessionManager.instance;
  }

  async getOrCreateSession(sessionId: string, userId?: string): Promise<ClaudeBackgroundService> {
    console.log(`[Claude Session Manager] Getting or creating session: ${sessionId}`);
    
    // Check if session exists
    const existingSession = this.sessions.get(sessionId);
    if (existingSession) {
      console.log(`[Claude Session Manager] Found existing session: ${sessionId}`);
      existingSession.lastActivity = new Date();
      return existingSession.service;
    }

    // Create new session
    console.log(`[Claude Session Manager] Creating new session: ${sessionId}`);
    const service = new ClaudeBackgroundService();
    
    try {
      await service.start();
      
      const session: ClaudeSession = {
        sessionId,
        service,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId
      };
      
      this.sessions.set(sessionId, session);
      console.log(`[Claude Session Manager] Session created successfully: ${sessionId}`);
      this.emit('sessionCreated', sessionId);
      
      // Handle service events
      service.on('error', (error) => {
        console.error(`[Claude Session Manager] Session ${sessionId} error:`, error);
        this.handleSessionError(sessionId, error);
      });
      
      service.on('exit', () => {
        console.log(`[Claude Session Manager] Session ${sessionId} exited`);
        this.removeSession(sessionId);
      });
      
      return service;
    } catch (error) {
      console.error(`[Claude Session Manager] Failed to create session ${sessionId}:`, error);
      throw error;
    }
  }

  async sendMessageToSession(sessionId: string, message: string, userId?: string): Promise<string> {
    console.log(`[Claude Session Manager] Sending message to session: ${sessionId}`);
    
    const service = await this.getOrCreateSession(sessionId, userId);
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.lastActivity = new Date();
    }
    
    try {
      const response = await service.sendMessage(message);
      console.log(`[Claude Session Manager] Received response for session: ${sessionId}`);
      return response;
    } catch (error) {
      console.error(`[Claude Session Manager] Error sending message to session ${sessionId}:`, error);
      throw error;
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`[Claude Session Manager] Removing session: ${sessionId}`);
      try {
        await session.service.stop();
      } catch (error) {
        console.error(`[Claude Session Manager] Error stopping session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
      this.emit('sessionRemoved', sessionId);
    }
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToRemove: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > this.sessionTimeout) {
        sessionsToRemove.push(sessionId);
      }
    }
    
    for (const sessionId of sessionsToRemove) {
      console.log(`[Claude Session Manager] Cleaning up inactive session: ${sessionId}`);
      await this.removeSession(sessionId);
    }
    
    if (sessionsToRemove.length > 0) {
      console.log(`[Claude Session Manager] Cleaned up ${sessionsToRemove.length} inactive sessions`);
    }
  }

  private handleSessionError(sessionId: string, error: any): void {
    console.error(`[Claude Session Manager] Session ${sessionId} encountered error:`, error);
    
    // If API key error, don't remove session immediately
    if (error.message && error.message.includes('API key')) {
      console.log(`[Claude Session Manager] API key error for session ${sessionId}, keeping session`);
      return;
    }
    
    // For other errors, remove the session
    this.removeSession(sessionId);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(sessionId: string): ClaudeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): Map<string, ClaudeSession> {
    return new Map(this.sessions);
  }
}