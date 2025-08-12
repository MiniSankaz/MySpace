/**
 * In-Memory Terminal Service
 * Manages terminal sessions without database persistence
 * Solves sync issues and provides reliable session management
 */

import { EventEmitter } from 'events';

// Terminal session types
export type TerminalType = 'terminal'; // Single terminal type
export type TerminalStatus = 'active' | 'inactive' | 'error' | 'connecting' | 'closed';
export type TerminalMode = 'normal' | 'claude'; // Mode for Claude CLI within terminal

// Terminal session interface
export interface TerminalSession {
  id: string;
  projectId: string;
  userId?: string;
  type: TerminalType;
  mode: TerminalMode; // Current mode (normal or claude)
  tabName: string;
  status: TerminalStatus;
  active: boolean;
  isFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentPath: string;
  wsConnected: boolean;
  metadata?: any;
}

// WebSocket connection info
interface WebSocketInfo {
  sessionId: string;
  ws?: WebSocket;
  connected: boolean;
  lastPing: Date;
}

// Use global to ensure singleton across all module instances
declare global {
  var _inMemoryTerminalServiceInstance: InMemoryTerminalService | undefined;
}

/**
 * In-Memory Terminal Service
 * Single source of truth for all terminal sessions
 */
export class InMemoryTerminalService extends EventEmitter {
  private static instance: InMemoryTerminalService;
  
  // In-memory storage - no database dependency
  // Made public for WebSocket servers to manipulate directly when needed
  public sessions: Map<string, TerminalSession> = new Map();
  public projectSessions: Map<string, Set<string>> = new Map();
  private wsConnections: Map<string, WebSocketInfo> = new Map();
  
  // Multi-focus support: Track multiple focused sessions per project
  private focusedSessions: Map<string, Set<string>> = new Map();
  private readonly MAX_FOCUSED_PER_PROJECT = 4;
  private sessionActivity: Map<string, Date> = new Map();
  
  // WebSocket readiness tracking
  private wsReadiness: Map<string, boolean> = new Map();
  private wsReadyPromises: Map<string, Promise<boolean>> = new Map();
  
  // Session counter for tab naming
  private sessionCounters: Map<string, number> = new Map();
  
  private constructor() {
    super();
    console.log('[InMemoryTerminalService] Initialized');
    
    // Cleanup inactive sessions every 10 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 10 * 60 * 1000);
  }
  
  /**
   * Get singleton instance
   * Uses global to ensure singleton across all module instances in Next.js
   */
  public static getInstance(): InMemoryTerminalService {
    // Use global variable to ensure true singleton across module boundaries
    if (!global._inMemoryTerminalServiceInstance) {
      console.log('[InMemoryTerminalService] Creating new global instance');
      global._inMemoryTerminalServiceInstance = new InMemoryTerminalService();
    } else {
      console.log('[InMemoryTerminalService] Using existing global instance');
    }
    return global._inMemoryTerminalServiceInstance;
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  /**
   * Get WebSocket URL for terminal
   */
  private getWebSocketUrl(): string {
    // All terminals use the same WebSocket server now
    return `ws://localhost:4001`;
  }
  
  /**
   * Get next tab name for project
   */
  private getNextTabName(projectId: string): string {
    const count = (this.sessionCounters.get(projectId) || 0) + 1;
    this.sessionCounters.set(projectId, count);
    return `Terminal ${count}`;
  }
  
  /**
   * Create new terminal session
   */
  public createSession(
    projectId: string,
    projectPath: string,
    userId?: string,
    mode: TerminalMode = 'normal'
  ): TerminalSession {
    const sessionId = this.generateSessionId();
    const tabName = this.getNextTabName(projectId);
    
    const session: TerminalSession = {
      id: sessionId,
      projectId,
      userId,
      type: 'terminal',
      mode,
      tabName,
      status: 'connecting',
      active: true,
      isFocused: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentPath: projectPath || process.cwd(),
      wsConnected: false,
      metadata: {}
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    
    // Track project sessions
    if (!this.projectSessions.has(projectId)) {
      this.projectSessions.set(projectId, new Set());
    }
    this.projectSessions.get(projectId)!.add(sessionId);
    
    // Initialize WebSocket info
    this.wsConnections.set(sessionId, {
      sessionId,
      connected: false,
      lastPing: new Date()
    });
    
    // Auto-focus new session if under the limit
    const projectFocused = this.focusedSessions.get(projectId) || new Set();
    if (projectFocused.size < this.MAX_FOCUSED_PER_PROJECT) {
      this.setSessionFocus(sessionId, true);
    }
    
    console.log(`[InMemoryTerminalService] Created session ${sessionId} for project ${projectId}`);
    this.emit('sessionCreated', session);
    
    return session;
  }
  
  /**
   * List sessions for a project
   */
  public listSessions(projectId: string): TerminalSession[] {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds) {
      return [];
    }
    
    const sessions: TerminalSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.status !== 'closed') {
        sessions.push(session);
      }
    }
    
    return sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  /**
   * Get session by ID
   */
  public getSession(sessionId: string): TerminalSession | null {
    if (!sessionId) {
      console.warn('[InMemoryTerminalService] getSession called with null/undefined sessionId');
      return null;
    }
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Update session status
   */
  public updateSessionStatus(sessionId: string, status: TerminalStatus): void {
    if (!sessionId) {
      console.warn('[InMemoryTerminalService] updateSessionStatus called with null/undefined sessionId');
      return;
    }
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = new Date();
      
      if (status === 'active') {
        session.wsConnected = true;
      } else if (status === 'closed' || status === 'error') {
        session.wsConnected = false;
        session.active = false;
      }
    } else {
      console.warn(`[InMemoryTerminalService] Session ${sessionId} not found for status update`);
    }
    
    console.log(`[InMemoryTerminalService] Session ${sessionId} status: ${status}`);
    this.emit('sessionStatusChanged', session);
  }
  
  /**
   * Register WebSocket connection for existing session
   */
  public registerWebSocketConnection(sessionId: string, ws: any): void {
    if (!sessionId) {
      console.warn('[InMemoryTerminalService] registerWebSocketConnection called with null/undefined sessionId');
      return;
    }
    
    // Check if session exists
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[InMemoryTerminalService] Cannot register WebSocket for non-existent session: ${sessionId}`);
      return;
    }
    
    // Update WebSocket connection info
    let wsInfo = this.wsConnections.get(sessionId);
    if (!wsInfo) {
      // Create new WebSocket info if doesn't exist
      wsInfo = {
        sessionId,
        ws,
        connected: true,
        lastPing: new Date()
      };
      this.wsConnections.set(sessionId, wsInfo);
    } else {
      // Update existing WebSocket info
      wsInfo.ws = ws;
      wsInfo.connected = true;
      wsInfo.lastPing = new Date();
    }
    
    // Update session status
    session.wsConnected = true;
    session.status = 'active';
    session.updatedAt = new Date();
    
    // Mark WebSocket as ready
    this.markWebSocketReady(sessionId);
    
    console.log(`[InMemoryTerminalService] Registered WebSocket for session ${sessionId}`);
    this.emit('sessionWebSocketConnected', { sessionId });
  }
  
  /**
   * Update session activity timestamp
   */
  public updateSessionActivity(sessionId: string): void {
    if (!sessionId) {
      return;
    }
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = new Date();
      // Update activity tracking for focus management
      this.sessionActivity.set(sessionId, new Date());
    }
    
    const wsInfo = this.wsConnections.get(sessionId);
    if (wsInfo) {
      wsInfo.lastPing = new Date();
    }
  }
  
  /**
   * Set session focus with multi-focus support
   */
  public setSessionFocus(sessionId: string, focused: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[InMemoryTerminalService] Session ${sessionId} not found for focus update`);
      return;
    }

    const projectId = session.projectId;
    
    // Initialize focused sessions set for project if not exists
    if (!this.focusedSessions.has(projectId)) {
      this.focusedSessions.set(projectId, new Set());
    }
    
    const projectFocused = this.focusedSessions.get(projectId)!;
    
    if (focused) {
      // Check if we've reached the maximum focused sessions
      if (projectFocused.size >= this.MAX_FOCUSED_PER_PROJECT && !projectFocused.has(sessionId)) {
        // Auto-unfocus the least recently active session
        const leastActive = this.getLeastActiveSession(projectId, projectFocused);
        if (leastActive) {
          this.setSessionFocus(leastActive, false);
          console.log(`[InMemoryTerminalService] Auto-unfocused least active session ${leastActive} to make room`);
        }
      }
      
      // Add to focused set
      projectFocused.add(sessionId);
      session.isFocused = true;
      
      // Update activity timestamp
      this.sessionActivity.set(sessionId, new Date());
    } else {
      // Remove from focused set
      projectFocused.delete(sessionId);
      session.isFocused = false;
    }
    
    session.updatedAt = new Date();
    console.log(`[InMemoryTerminalService] Session ${sessionId} focus: ${focused}, total focused: ${projectFocused.size}`);
    
    // Emit event with all focused sessions
    this.emit('focusChanged', {
      sessionId,
      focused,
      projectId,
      allFocused: Array.from(projectFocused)
    });
  }
  
  /**
   * Get least recently active session from focused set
   */
  private getLeastActiveSession(projectId: string, focusedSet: Set<string>): string | null {
    let oldestTime = new Date();
    let oldestSession: string | null = null;
    
    for (const sessionId of focusedSet) {
      const activity = this.sessionActivity.get(sessionId);
      if (!activity || activity < oldestTime) {
        oldestTime = activity || new Date(0);
        oldestSession = sessionId;
      }
    }
    
    return oldestSession;
  }
  
  /**
   * Get all focused sessions for a project
   */
  public getFocusedSessions(projectId: string): string[] {
    const focused = this.focusedSessions.get(projectId);
    return focused ? Array.from(focused) : [];
  }
  
  /**
   * Check if a session is focused
   */
  public isSessionFocused(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const projectFocused = this.focusedSessions.get(session.projectId);
    return projectFocused ? projectFocused.has(sessionId) : false;
  }
  
  /**
   * Close a terminal session
   */
  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Update session status
    session.status = 'closed';
    session.active = false;
    session.wsConnected = false;
    session.updatedAt = new Date();
    
    // Remove from focused sessions if focused
    const projectFocused = this.focusedSessions.get(session.projectId);
    if (projectFocused) {
      projectFocused.delete(sessionId);
    }
    
    // Remove from activity tracking
    this.sessionActivity.delete(sessionId);
    
    // Remove from project sessions
    const projectSessionIds = this.projectSessions.get(session.projectId);
    if (projectSessionIds) {
      projectSessionIds.delete(sessionId);
      if (projectSessionIds.size === 0) {
        this.projectSessions.delete(session.projectId);
      }
    }
    
    // Remove WebSocket connection info
    this.wsConnections.delete(sessionId);
    
    // Remove session from memory after a delay (for cleanup)
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 5000);
    
    console.log(`[InMemoryTerminalService] Closed session ${sessionId}`);
    this.emit('sessionClosed', session);
    
    return true;
  }
  
  /**
   * Clean up all sessions for a project
   */
  public cleanupProjectSessions(projectId: string): number {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds) {
      return 0;
    }
    
    let closedCount = 0;
    for (const sessionId of sessionIds) {
      if (this.closeSession(sessionId)) {
        closedCount++;
      }
    }
    
    // Reset counters for the project
    this.sessionCounters.delete(projectId);
    
    console.log(`[InMemoryTerminalService] Cleaned up ${closedCount} sessions for project ${projectId}`);
    return closedCount;
  }
  
  /**
   * Update WebSocket connection status
   */
  public updateWebSocketStatus(sessionId: string, connected: boolean): void {
    const wsInfo = this.wsConnections.get(sessionId);
    if (wsInfo) {
      wsInfo.connected = connected;
      wsInfo.lastPing = new Date();
    }
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.wsConnected = connected;
      session.status = connected ? 'active' : 'inactive';
      session.updatedAt = new Date();
    }
  }
  
  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'closed') {
        continue;
      }
      
      const timeSinceUpdate = now - session.updatedAt.getTime();
      if (timeSinceUpdate > timeout && !session.wsConnected) {
        console.log(`[InMemoryTerminalService] Auto-closing inactive session ${sessionId}`);
        this.closeSession(sessionId);
      }
    }
  }
  
  /**
   * Get all active sessions (for debugging)
   */
  public getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status !== 'closed');
  }
  
  /**
   * Wait for WebSocket readiness
   */
  public waitForWebSocketReady(sessionId: string, timeout: number = 5000): Promise<boolean> {
    // Check if already ready
    if (this.wsReadiness.get(sessionId)) {
      return Promise.resolve(true);
    }
    
    // Check if promise already exists
    const existingPromise = this.wsReadyPromises.get(sessionId);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Create new promise
    const promise = new Promise<boolean>((resolve) => {
      // Set up listener for ready event
      const readyListener = (readySessionId: string) => {
        if (readySessionId === sessionId) {
          this.off('wsReady', readyListener);
          this.wsReadyPromises.delete(sessionId);
          resolve(true);
        }
      };
      
      this.on('wsReady', readyListener);
      
      // Set timeout
      setTimeout(() => {
        this.off('wsReady', readyListener);
        this.wsReadyPromises.delete(sessionId);
        resolve(false);
      }, timeout);
    });
    
    this.wsReadyPromises.set(sessionId, promise);
    return promise;
  }
  
  /**
   * Mark WebSocket as ready
   */
  public markWebSocketReady(sessionId: string): void {
    this.wsReadiness.set(sessionId, true);
    this.emit('wsReady', sessionId);
    console.log(`[InMemoryTerminalService] WebSocket ready for session ${sessionId}`);
  }
  
  /**
   * Check if WebSocket is ready
   */
  public isWebSocketReady(sessionId: string): boolean {
    return this.wsReadiness.get(sessionId) || false;
  }

  /**
   * Clear all sessions (for testing)
   */
  public clearAllSessions(): void {
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }
    this.sessions.clear();
    this.projectSessions.clear();
    this.wsConnections.clear();
    this.sessionCounters.clear();
    this.wsReadiness.clear();
    this.wsReadyPromises.clear();
    console.log('[InMemoryTerminalService] All sessions cleared');
  }
}

// Export singleton instance - always use getInstance() to ensure global singleton
export const inMemoryTerminalService = InMemoryTerminalService.getInstance();