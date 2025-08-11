import { EventEmitter } from 'events';
import { TerminalSession, TerminalMessage } from '../types';
import prisma from '@/core/database/prisma';
import { v4 as uuidv4 } from 'uuid';

interface SessionMetadata {
  projectId: string;
  projectPath: string;
  userId?: string;
  environment?: Record<string, string>;
  lastActivity?: Date;
}

interface SessionState {
  session: TerminalSession;
  metadata: SessionMetadata;
  connectionId?: string;
  isConnected: boolean;
  buffer: string[];
  maxBufferSize: number;
}

export class TerminalSessionManager extends EventEmitter {
  private sessions: Map<string, SessionState> = new Map();
  private projectSessions: Map<string, Set<string>> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  
  constructor() {
    super();
    this.initializeFromDatabase();
  }

  /**
   * Initialize sessions from database on startup
   */
  private async initializeFromDatabase() {
    try {
      // Load active sessions from database
      const activeSessions = await prisma.terminalSession.findMany({
        where: { active: true },
        orderBy: { updatedAt: 'desc' }
      });

      for (const dbSession of activeSessions) {
        const session = this.formatSession(dbSession);
        const state: SessionState = {
          session,
          metadata: {
            projectId: session.projectId,
            projectPath: session.currentPath,
            userId: dbSession.userId || undefined,
            lastActivity: session.createdAt
          },
          isConnected: false,
          buffer: [],
          maxBufferSize: 1000
        };
        
        this.sessions.set(session.id, state);
        this.addToProjectIndex(session.projectId, session.id);
        if (dbSession.userId) {
          this.addToUserIndex(dbSession.userId, session.id);
        }
      }

      console.log(`Loaded ${activeSessions.length} active terminal sessions from database`);
    } catch (error) {
      console.error('Failed to initialize terminal sessions from database:', error);
    }
  }

  /**
   * Create or restore a terminal session
   */
  async createOrRestoreSession(
    projectId: string,
    type: 'system' | 'claude',
    tabName: string,
    projectPath: string,
    userId?: string
  ): Promise<TerminalSession> {
    // Check if we have an existing session with the same parameters
    const existingSession = await this.findExistingSession(projectId, type, tabName);
    if (existingSession) {
      // Mark as active and return
      await this.updateSessionStatus(existingSession.id, true);
      return existingSession;
    }

    // Create new session with simple ID format for WebSocket compatibility
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const dbSession = await prisma.terminalSession.create({
      data: {
        id: sessionId,
        projectId,
        userId,
        type,
        tabName,
        active: true,
        output: [],
        currentPath: projectPath,
        metadata: {
          environment: process.env,
          createdAt: new Date().toISOString()
        }
      }
    });

    const session = this.formatSession(dbSession);
    
    const state: SessionState = {
      session,
      metadata: {
        projectId,
        projectPath,
        userId,
        environment: process.env as any,
        lastActivity: new Date()
      },
      isConnected: false,
      buffer: [],
      maxBufferSize: 1000
    };

    this.sessions.set(sessionId, state);
    this.addToProjectIndex(projectId, sessionId);
    if (userId) {
      this.addToUserIndex(userId, sessionId);
    }

    this.emit('session:created', session);
    
    return session;
  }

  /**
   * Find existing session matching criteria
   */
  private async findExistingSession(
    projectId: string,
    type: 'system' | 'claude',
    tabName: string
  ): Promise<TerminalSession | null> {
    const projectSessionIds = this.projectSessions.get(projectId);
    if (!projectSessionIds) return null;

    for (const sessionId of projectSessionIds) {
      const state = this.sessions.get(sessionId);
      if (state && 
          state.session.type === type && 
          state.session.tabName === tabName &&
          !state.session.active) {
        return state.session;
      }
    }

    // Check database for inactive sessions
    const dbSession = await prisma.terminalSession.findFirst({
      where: {
        projectId,
        type,
        tabName,
        active: false
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (dbSession) {
      return this.formatSession(dbSession);
    }

    return null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession | null {
    const state = this.sessions.get(sessionId);
    return state ? state.session : null;
  }

  /**
   * Get all sessions for a project
   */
  getProjectSessions(projectId: string): TerminalSession[] {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds) return [];

    const sessions: TerminalSession[] = [];
    for (const sessionId of sessionIds) {
      const state = this.sessions.get(sessionId);
      if (state && state.session.active) {
        sessions.push(state.session);
      }
    }

    return sessions.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get sessions by type for a project
   */
  getProjectSessionsByType(projectId: string, type: 'system' | 'claude'): TerminalSession[] {
    return this.getProjectSessions(projectId).filter(s => s.type === type);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, active: boolean): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    state.session.active = active;
    state.metadata.lastActivity = new Date();

    await prisma.terminalSession.update({
      where: { id: sessionId },
      data: { 
        active,
        updatedAt: new Date()
      }
    });

    this.emit('session:updated', state.session);
  }

  /**
   * Mark session as connected with WebSocket
   */
  markConnected(sessionId: string, connectionId: string): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    state.isConnected = true;
    state.connectionId = connectionId;
    state.metadata.lastActivity = new Date();

    // Flush buffered output if any
    if (state.buffer.length > 0) {
      // Send buffered output as a batch for better performance
      this.emit('session:buffered-output', { 
        sessionId, 
        data: state.buffer.join(''),
        bufferSize: state.buffer.length 
      });
      
      // Keep buffer for other reconnections but mark as sent
      // Don't clear buffer completely in case of multiple concurrent connections
    }

    this.emit('session:connected', state.session);
  }

  /**
   * Mark session as disconnected (but keep session alive for background processing)
   */
  markDisconnected(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    state.isConnected = false;
    state.connectionId = undefined;
    
    // DON'T mark session as inactive - keep it running in background
    // Only update the connection status, session remains active
    this.emit('session:disconnected', state.session);
  }

  /**
   * Add output to session (always buffer for background processing)
   */
  addOutput(sessionId: string, data: string): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    // Update last activity
    state.metadata.lastActivity = new Date();

    // Add to session output
    const output = state.session.output as string[];
    output.push(data);
    
    // Limit output buffer size
    if (output.length > state.maxBufferSize) {
      output.splice(0, output.length - state.maxBufferSize);
    }

    // Always buffer output for background processing
    state.buffer.push(data);
    if (state.buffer.length > 500) { // Increased buffer size for background sessions
      state.buffer.splice(0, state.buffer.length - 500);
    }

    // If connected, emit immediately
    if (state.isConnected) {
      this.emit('session:output', { sessionId, data });
    }

    // Periodically persist to database (debounced)
    this.schedulePersistence(sessionId);
  }

  /**
   * Update session path
   */
  async updateSessionPath(sessionId: string, path: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    state.session.currentPath = path;
    state.metadata.lastActivity = new Date();

    await prisma.terminalSession.update({
      where: { id: sessionId },
      data: { 
        currentPath: path,
        updatedAt: new Date()
      }
    });

    this.emit('session:path-changed', { sessionId, path });
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    // Mark as inactive in database
    await prisma.terminalSession.update({
      where: { id: sessionId },
      data: { 
        active: false,
        updatedAt: new Date()
      }
    });

    // Remove from indexes
    this.removeFromProjectIndex(state.session.projectId, sessionId);
    if (state.metadata.userId) {
      this.removeFromUserIndex(state.metadata.userId, sessionId);
    }

    // Remove from memory
    this.sessions.delete(sessionId);

    this.emit('session:closed', { sessionId });
  }

  /**
   * Rename session
   */
  async renameSession(sessionId: string, newName: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    state.session.tabName = newName;
    state.metadata.lastActivity = new Date();

    await prisma.terminalSession.update({
      where: { id: sessionId },
      data: { 
        tabName: newName,
        updatedAt: new Date()
      }
    });

    this.emit('session:renamed', { sessionId, name: newName });
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    connectedSessions: number;
    backgroundSessions: number;
    projectCount: number;
    userCount: number;
  } {
    let activeSessions = 0;
    let connectedSessions = 0;
    let backgroundSessions = 0;

    for (const state of this.sessions.values()) {
      if (state.session.active) activeSessions++;
      if (state.isConnected) connectedSessions++;
      if (state.session.active && !state.isConnected) backgroundSessions++;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      connectedSessions,
      backgroundSessions,
      projectCount: this.projectSessions.size,
      userCount: this.userSessions.size
    };
  }

  /**
   * Get buffered output for a session (for reconnection)
   */
  getBufferedOutput(sessionId: string): string[] {
    const state = this.sessions.get(sessionId);
    return state ? [...state.buffer] : [];
  }

  /**
   * Check if session is running in background
   */
  isBackgroundSession(sessionId: string): boolean {
    const state = this.sessions.get(sessionId);
    return state ? (state.session.active && !state.isConnected) : false;
  }

  /**
   * Get all background sessions
   */
  getBackgroundSessions(): TerminalSession[] {
    const backgroundSessions: TerminalSession[] = [];
    
    for (const state of this.sessions.values()) {
      if (state.session.active && !state.isConnected) {
        backgroundSessions.push(state.session);
      }
    }
    
    return backgroundSessions;
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAge);
    const sessionsToRemove: string[] = [];

    for (const [sessionId, state] of this.sessions) {
      if (!state.session.active && 
          state.metadata.lastActivity && 
          state.metadata.lastActivity < cutoffTime) {
        sessionsToRemove.push(sessionId);
      }
    }

    for (const sessionId of sessionsToRemove) {
      await this.closeSession(sessionId);
    }

    console.log(`Cleaned up ${sessionsToRemove.length} inactive sessions`);
  }

  // Helper methods
  private addToProjectIndex(projectId: string, sessionId: string): void {
    if (!this.projectSessions.has(projectId)) {
      this.projectSessions.set(projectId, new Set());
    }
    this.projectSessions.get(projectId)!.add(sessionId);
  }

  private removeFromProjectIndex(projectId: string, sessionId: string): void {
    const sessions = this.projectSessions.get(projectId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.projectSessions.delete(projectId);
      }
    }
  }

  private addToUserIndex(userId: string, sessionId: string): void {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);
  }

  private removeFromUserIndex(userId: string, sessionId: string): void {
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.userSessions.delete(userId);
      }
    }
  }

  private formatSession(dbSession: any): TerminalSession {
    return {
      id: dbSession.id,
      projectId: dbSession.projectId,
      type: dbSession.type as 'system' | 'claude',
      tabName: dbSession.tabName,
      active: dbSession.active,
      output: dbSession.output || [],
      currentPath: dbSession.currentPath,
      pid: dbSession.pid,
      createdAt: new Date(dbSession.createdAt)
    };
  }

  private persistenceTimers = new Map<string, NodeJS.Timeout>();
  
  private schedulePersistence(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.persistenceTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new persistence in 5 seconds
    const timer = setTimeout(async () => {
      const state = this.sessions.get(sessionId);
      if (state) {
        try {
          await prisma.terminalSession.update({
            where: { id: sessionId },
            data: {
              output: state.session.output,
              updatedAt: new Date()
            }
          });
        } catch (error) {
          console.error(`Failed to persist session ${sessionId}:`, error);
        }
      }
      this.persistenceTimers.delete(sessionId);
    }, 5000);

    this.persistenceTimers.set(sessionId, timer);
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    // Clear all persistence timers
    for (const timer of this.persistenceTimers.values()) {
      clearTimeout(timer);
    }
    this.persistenceTimers.clear();

    // Mark all sessions as inactive
    for (const sessionId of this.sessions.keys()) {
      await this.updateSessionStatus(sessionId, false);
    }

    console.log('Terminal session manager shutdown complete');
  }
}

// Export singleton instance
export const terminalSessionManager = new TerminalSessionManager();

// Cleanup on process exit
process.on('beforeExit', () => {
  terminalSessionManager.shutdown();
});