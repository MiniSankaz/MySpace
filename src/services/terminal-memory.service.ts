/**
 * In-Memory Terminal Service
 * Manages terminal sessions without database persistence
 * Solves sync issues and provides reliable session management
 */

import { EventEmitter } from 'events';

// Terminal session types
export type TerminalType = 'terminal'; // Single terminal type
export type TerminalStatus = 'active' | 'inactive' | 'error' | 'connecting' | 'closed' | 'suspended';
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
  private readonly MAX_FOCUSED_PER_PROJECT = 10; // Increased for better multi-terminal support
  
  // Memory safety limits - Increased for better performance
  private readonly MAX_TOTAL_SESSIONS = 50; // Increased to support more sessions
  private readonly MAX_SESSIONS_PER_PROJECT = 20; // Increased for multi-terminal work
  private sessionActivity: Map<string, Date> = new Map();
  
  // CRITICAL FIX: Circuit breaker protection against infinite loops
  private creationRateLimit = new Map<string, number[]>(); // projectId -> timestamps
  private readonly MAX_CREATIONS_PER_MINUTE = 10;
  private circuitBreakerTripped = new Map<string, boolean>();
  
  // Suspension timeout management
  private readonly MAX_SUSPENSION_TIME = 30 * 60 * 1000; // 30 minutes
  private suspensionCleanupTimer?: NodeJS.Timeout;
  
  // WebSocket readiness tracking
  private wsReadiness: Map<string, boolean> = new Map();
  private wsReadyPromises: Map<string, Promise<boolean>> = new Map();
  
  // Session counter for tab naming
  private sessionCounters: Map<string, number> = new Map();
  
  // Suspension state tracking
  private suspendedSessions: Map<string, {
    suspendedAt: Date;
    bufferedOutput: string[];
    lastActivity: Date;
    cursorPosition?: { row: number; col: number };
    workingDirectory?: string;
    environment?: Record<string, string>;
  }> = new Map();
  
  // Mutex locks for suspend/resume operations
  private suspendResumeLocks: Map<string, boolean> = new Map();
  private operationQueue: Array<{ type: 'suspend' | 'resume'; projectId: string; resolve: Function }> = [];
  private isProcessingQueue: boolean = false;
  
  private constructor() {
    super();
    console.log('[InMemoryTerminalService] Initialized');
    
    // Cleanup inactive sessions every 5 minutes - MORE FREQUENT
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
    
    // Cleanup expired suspended sessions every 10 minutes
    this.suspensionCleanupTimer = setInterval(() => {
      this.cleanupExpiredSuspendedSessions();
    }, 10 * 60 * 1000);
    
    // Emergency memory monitor every 2 minutes
    setInterval(() => {
      this.emergencyMemoryCheck();
    }, 2 * 60 * 1000);
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
   * Create new terminal session with memory safety checks
   */
  public createSession(
    projectId: string,
    projectPath: string,
    userId?: string,
    mode: TerminalMode = 'normal'
  ): TerminalSession {
    // CRITICAL: Circuit breaker check
    if (this.circuitBreakerTripped.get(projectId)) {
      console.error(`[InMemoryTerminalService] CIRCUIT BREAKER ACTIVE for project ${projectId}. Refusing to create session.`);
      throw new Error('Circuit breaker active: Too many session creation attempts detected');
    }
    
    // CRITICAL: Rate limiting to detect loops
    const now = Date.now();
    const projectCreations = this.creationRateLimit.get(projectId) || [];
    
    // Remove timestamps older than 1 minute
    const recentCreations = projectCreations.filter(timestamp => now - timestamp < 60000);
    
    // Check if we're creating too many sessions
    if (recentCreations.length >= this.MAX_CREATIONS_PER_MINUTE) {
      console.error(`[InMemoryTerminalService] LOOP DETECTED: ${recentCreations.length} sessions created in last minute for project ${projectId}`);
      console.error('[InMemoryTerminalService] TRIPPING CIRCUIT BREAKER');
      
      // Trip the circuit breaker
      this.circuitBreakerTripped.set(projectId, true);
      
      // Auto-reset circuit breaker after 5 minutes
      setTimeout(() => {
        console.log(`[InMemoryTerminalService] Resetting circuit breaker for project ${projectId}`);
        this.circuitBreakerTripped.delete(projectId);
        this.creationRateLimit.delete(projectId);
      }, 5 * 60 * 1000);
      
      throw new Error(`Session creation loop detected: ${recentCreations.length} sessions in 1 minute`);
    }
    
    // Track this creation
    recentCreations.push(now);
    this.creationRateLimit.set(projectId, recentCreations);
    
    // Memory safety: Check total session limit
    if (this.sessions.size >= this.MAX_TOTAL_SESSIONS) {
      console.warn(`[InMemoryTerminalService] Maximum sessions (${this.MAX_TOTAL_SESSIONS}) reached, cleaning oldest`);
      this.cleanupOldestSessions(3); // Remove 3 oldest sessions
    }
    
    // Memory safety: Check per-project limit
    const projectSessionIds = this.projectSessions.get(projectId) || new Set();
    if (projectSessionIds.size >= this.MAX_SESSIONS_PER_PROJECT) {
      console.warn(`[InMemoryTerminalService] Maximum sessions per project (${this.MAX_SESSIONS_PER_PROJECT}) reached`);
      // Remove oldest session for this project
      const oldestSessionId = Array.from(projectSessionIds)[0];
      this.closeSession(oldestSessionId);
    }
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
   * Clean up inactive sessions with memory pressure awareness
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes - REDUCED FROM 30 minutes
    
    // Check memory pressure
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const isMemoryPressure = memoryUsageMB > 4000; // 4GB threshold (with 8GB total)
    
    if (isMemoryPressure) {
      console.warn(`[InMemoryTerminalService] Memory pressure detected: ${memoryUsageMB}MB (threshold: 4GB) - Aggressive cleanup`);
    }
    
    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'closed') {
        continue;
      }
      
      const timeSinceUpdate = now - session.updatedAt.getTime();
      const aggressiveTimeout = isMemoryPressure ? 2 * 60 * 1000 : timeout; // 2 minutes if memory pressure
      
      if (timeSinceUpdate > aggressiveTimeout && !session.wsConnected) {
        console.log(`[InMemoryTerminalService] Auto-closing inactive session ${sessionId} (${Math.round(timeSinceUpdate / 60000)}min old)`);
        this.closeSession(sessionId);
      }
    }
    
    // Force garbage collection if memory is high
    if (isMemoryPressure && global.gc) {
      global.gc();
      console.log(`[InMemoryTerminalService] Forced garbage collection, memory: ${memoryUsageMB}MB`);
    }
  }
  
  /**
   * Emergency memory check - closes sessions if RSS > 6GB
   */
  private emergencyMemoryCheck(): void {
    const memoryUsage = process.memoryUsage();
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);
    
    console.log(`[InMemoryTerminalService] Memory: RSS=${rssMB}MB, Heap=${heapUsedMB}MB, External=${externalMB}MB, Sessions=${this.sessions.size}`);
    
    // CRITICAL: Emergency cleanup if RSS > 6GB (with 8GB limit)
    if (rssMB > 6144) {
      console.error(`🚨 EMERGENCY: RSS memory ${rssMB}MB > 6GB - EMERGENCY CLEANUP`);
      
      // Close ALL sessions immediately to prevent crash
      const sessionCount = this.sessions.size;
      this.clearAllSessions();
      
      // Force garbage collection multiple times
      if (global.gc) {
        global.gc();
        global.gc();
        global.gc();
      }
      
      console.error(`🚨 EMERGENCY: Closed ${sessionCount} sessions, forcing GC`);
    }
    // WARNING: High memory cleanup if RSS > 2GB  
    else if (rssMB > 2048) {
      console.warn(`⚠️ HIGH MEMORY: RSS ${rssMB}MB > 2GB - Aggressive cleanup`);
      this.cleanupOldestSessions(Math.ceil(this.sessions.size / 2)); // Close half
      
      if (global.gc) {
        global.gc();
      }
    }
  }
  
  /**
   * Clean up oldest sessions for memory safety
   */
  private cleanupOldestSessions(count: number): void {
    const sessionEntries = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.status !== 'closed')
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime()); // Oldest first
    
    for (let i = 0; i < Math.min(count, sessionEntries.length); i++) {
      const [sessionId, session] = sessionEntries[i];
      console.log(`[InMemoryTerminalService] Closing oldest session ${sessionId} (age: ${Math.round((Date.now() - session.createdAt.getTime()) / 60000)}min)`);
      this.closeSession(sessionId);
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
  
  /**
   * Cleanup expired suspended sessions
   */
  private cleanupExpiredSuspendedSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    this.suspendedSessions.forEach((state, sessionId) => {
      const suspendedTime = now - state.suspendedAt.getTime();
      if (suspendedTime > this.MAX_SUSPENSION_TIME) {
        expiredSessions.push(sessionId);
      }
    });
    
    if (expiredSessions.length > 0) {
      console.log(`[InMemoryTerminalService] Cleaning up ${expiredSessions.length} expired suspended sessions`);
      expiredSessions.forEach(sessionId => {
        // Remove from suspended sessions
        this.suspendedSessions.delete(sessionId);
        
        // Remove the actual session
        const session = this.sessions.get(sessionId);
        if (session) {
          this.closeSession(sessionId);
        }
      });
    }
  }
  
  /**
   * Process operation queue sequentially
   */
  private async processOperationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift()!;
      
      try {
        if (operation.type === 'suspend') {
          const result = await this._suspendProjectSessionsInternal(operation.projectId);
          operation.resolve(result);
        } else if (operation.type === 'resume') {
          const result = await this._resumeProjectSessionsInternal(operation.projectId);
          operation.resolve(result);
        }
        
        // Add small delay between operations to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`[InMemoryTerminalService] Error processing ${operation.type} for project ${operation.projectId}:`, error);
        operation.resolve(operation.type === 'suspend' ? 0 : { resumed: false, sessions: [] });
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  /**
   * Suspend sessions for a project (queued)
   */
  public async suspendProjectSessions(projectId: string): Promise<number> {
    return new Promise((resolve) => {
      this.operationQueue.push({ type: 'suspend', projectId, resolve });
      this.processOperationQueue();
    });
  }
  
  /**
   * Internal suspend implementation
   */
  private _suspendProjectSessionsInternal(projectId: string): number {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds || sessionIds.size === 0) {
      return 0;
    }
    
    let suspendedCount = 0;
    sessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'active') {
        // Store suspension state
        this.suspendedSessions.set(sessionId, {
          suspendedAt: new Date(),
          bufferedOutput: [],
          lastActivity: this.sessionActivity.get(sessionId) || new Date(),
          workingDirectory: session.currentPath,
          environment: {}
        });
        
        // Update session status
        session.status = 'suspended';
        this.sessions.set(sessionId, session);
        
        console.log(`[InMemoryTerminalService] Suspended session ${sessionId}`);
        
        // Emit suspension event for WebSocket server
        this.emit('sessionSuspended', { sessionId, projectId });
        suspendedCount++;
      }
    });
    
    return suspendedCount;
  }
  
  /**
   * Resume sessions for a project (queued)
   */
  public async resumeProjectSessions(projectId: string): Promise<{
    resumed: boolean;
    sessions: any[];
    uiState?: any;
  }> {
    return new Promise((resolve) => {
      this.operationQueue.push({ type: 'resume', projectId, resolve });
      this.processOperationQueue();
    });
  }
  
  /**
   * Internal resume implementation
   */
  private _resumeProjectSessionsInternal(projectId: string): {
    resumed: boolean;
    sessions: any[];
    uiState?: any;
  } {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds || sessionIds.size === 0) {
      return { resumed: false, sessions: [] };
    }
    
    // Check for expired suspended sessions first
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    sessionIds.forEach(sessionId => {
      const suspendedState = this.suspendedSessions.get(sessionId);
      if (suspendedState) {
        const suspendedTime = now - suspendedState.suspendedAt.getTime();
        if (suspendedTime > this.MAX_SUSPENSION_TIME) {
          expiredSessions.push(sessionId);
        }
      }
    });
    
    // Clean up expired sessions before resuming
    expiredSessions.forEach(sessionId => {
      console.log(`[InMemoryTerminalService] Session ${sessionId} expired, removing from suspended state`);
      this.suspendedSessions.delete(sessionId);
      this.closeSession(sessionId);
      sessionIds.delete(sessionId);
    });
    
    const resumedSessions: any[] = [];
    sessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      const suspendedState = this.suspendedSessions.get(sessionId);
      
      if (session && suspendedState) {
        // Resume session
        session.status = 'active';
        this.sessions.set(sessionId, session);
        
        // Include suspension info in response
        resumedSessions.push({
          ...session,
          suspendedAt: suspendedState.suspendedAt,
          bufferedOutput: suspendedState.bufferedOutput,
          workingDirectory: suspendedState.workingDirectory
        });
        
        // Clear suspension state
        this.suspendedSessions.delete(sessionId);
        
        console.log(`[InMemoryTerminalService] Resumed session ${sessionId}`);
      } else if (session) {
        // Session wasn't suspended, just return it
        resumedSessions.push(session);
      }
    });
    
    // Reset counter based on resumed sessions
    if (resumedSessions.length > 0) {
      let maxTerminalNumber = 0;
      resumedSessions.forEach(session => {
        if (session.tabName) {
          const match = session.tabName.match(/Terminal (\d+)/);
          if (match) {
            maxTerminalNumber = Math.max(maxTerminalNumber, parseInt(match[1]));
          }
        }
      });
      this.sessionCounters.set(projectId, maxTerminalNumber);
      console.log(`[InMemoryTerminalService] Reset counter for project ${projectId} to ${maxTerminalNumber} based on resumed sessions`);
    }
    
    return {
      resumed: resumedSessions.length > 0,
      sessions: resumedSessions,
      uiState: { 
        currentLayout: this.projectLayouts.get(projectId) || '1x1' // Get saved layout or default
      }
    };
  }
  
  /**
   * Save project layout
   */
  public saveProjectLayout(projectId: string, layout: string): void {
    this.projectLayouts.set(projectId, layout);
    console.log(`[InMemoryTerminalService] Saved layout ${layout} for project ${projectId}`);
  }
  
  /**
   * Get project layout
   */
  public getProjectLayout(projectId: string): string | null {
    return this.projectLayouts.get(projectId) || null;
  }
  
  /**
   * Buffer output for suspended sessions
   */
  public bufferOutputForSuspended(sessionId: string, output: string): void {
    const suspendedState = this.suspendedSessions.get(sessionId);
    if (suspendedState) {
      // Keep only last 1000 lines
      suspendedState.bufferedOutput.push(output);
      if (suspendedState.bufferedOutput.length > 1000) {
        suspendedState.bufferedOutput = suspendedState.bufferedOutput.slice(-1000);
      }
      this.suspendedSessions.set(sessionId, suspendedState);
    }
  }
  
  /**
   * Get suspension state for a session
   */
  public getSuspensionState(sessionId: string): any {
    return this.suspendedSessions.get(sessionId);
  }
  
  /**
   * Check if session is suspended
   */
  public isSessionSuspended(sessionId: string): boolean {
    return this.suspendedSessions.has(sessionId);
  }
}

// Export singleton instance - always use getInstance() to ensure global singleton
export const inMemoryTerminalService = InMemoryTerminalService.getInstance();