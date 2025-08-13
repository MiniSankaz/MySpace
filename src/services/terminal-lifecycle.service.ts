/**
 * Terminal Session Lifecycle Management Service
 * Manages complete lifecycle of terminal sessions with state transitions
 */

import { EventEmitter } from 'events';
import { terminalMemoryPool } from './terminal-memory-pool.service';
import { terminalConfig } from '@/config/terminal.config';
import { circuitBreakerManager } from '@/utils/circuit-breaker';

export enum SessionState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

export interface SessionLifecycle {
  id: string;
  state: SessionState;
  createdAt: Date;
  lastActivity: Date;
  transitions: StateTransition[];
  metadata: Record<string, any>;
  metrics: SessionMetrics;
}

export interface StateTransition {
  from: SessionState;
  to: SessionState;
  timestamp: Date;
  reason?: string;
}

export interface SessionMetrics {
  totalUptime: number;
  activeTime: number;
  suspendedTime: number;
  outputBytes: number;
  inputCommands: number;
  errorCount: number;
}

export class TerminalLifecycleService extends EventEmitter {
  private static instance: TerminalLifecycleService;
  private sessions: Map<string, SessionLifecycle> = new Map();
  private stateHandlers: Map<SessionState, Set<Function>> = new Map();
  private metrics: GlobalMetrics;
  
  private constructor() {
    super();
    this.initializeStateHandlers();
    this.startLifecycleMonitor();
    this.metrics = {
      totalSessions: 0,
      activeSessions: 0,
      suspendedSessions: 0,
      errorSessions: 0,
      averageLifetime: 0
    };
  }
  
  public static getInstance(): TerminalLifecycleService {
    if (!this.instance) {
      this.instance = new TerminalLifecycleService();
    }
    return this.instance;
  }
  
  /**
   * Initialize state transition handlers
   */
  private initializeStateHandlers(): void {
    // Initialize empty handler sets for each state
    Object.values(SessionState).forEach(state => {
      this.stateHandlers.set(state as SessionState, new Set());
    });
    
    // Register default handlers
    this.registerStateHandler(SessionState.INITIALIZING, this.handleInitializing.bind(this));
    this.registerStateHandler(SessionState.READY, this.handleReady.bind(this));
    this.registerStateHandler(SessionState.ACTIVE, this.handleActive.bind(this));
    this.registerStateHandler(SessionState.SUSPENDED, this.handleSuspended.bind(this));
    this.registerStateHandler(SessionState.CLOSING, this.handleClosing.bind(this));
    this.registerStateHandler(SessionState.CLOSED, this.handleClosed.bind(this));
    this.registerStateHandler(SessionState.ERROR, this.handleError.bind(this));
  }
  
  /**
   * Create new session with lifecycle tracking
   */
  public createSession(id: string, metadata: Record<string, any> = {}): SessionLifecycle {
    const lifecycle: SessionLifecycle = {
      id,
      state: SessionState.INITIALIZING,
      createdAt: new Date(),
      lastActivity: new Date(),
      transitions: [],
      metadata,
      metrics: {
        totalUptime: 0,
        activeTime: 0,
        suspendedTime: 0,
        outputBytes: 0,
        inputCommands: 0,
        errorCount: 0
      }
    };
    
    this.sessions.set(id, lifecycle);
    this.metrics.totalSessions++;
    
    // Allocate from memory pool
    const pooledSession = terminalMemoryPool.allocateSession(id, metadata);
    lifecycle.metadata.pooled = pooledSession !== null;
    
    // Transition to ready
    this.transitionTo(id, SessionState.READY);
    
    console.log(`[Lifecycle] Session ${id} created`);
    this.emit('session:created', lifecycle);
    
    return lifecycle;
  }
  
  /**
   * Transition session to new state
   */
  public transitionTo(
    sessionId: string, 
    newState: SessionState, 
    reason?: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[Lifecycle] Session ${sessionId} not found`);
      return false;
    }
    
    const oldState = session.state;
    
    // Validate transition
    if (!this.isValidTransition(oldState, newState)) {
      console.warn(`[Lifecycle] Invalid transition: ${oldState} → ${newState}`);
      return false;
    }
    
    // Record transition
    const transition: StateTransition = {
      from: oldState,
      to: newState,
      timestamp: new Date(),
      reason
    };
    
    session.transitions.push(transition);
    session.state = newState;
    session.lastActivity = new Date();
    
    // Update metrics
    this.updateMetrics(oldState, newState);
    
    // Execute state handlers
    const handlers = this.stateHandlers.get(newState);
    if (handlers) {
      handlers.forEach(handler => handler(session));
    }
    
    console.log(`[Lifecycle] Session ${sessionId}: ${oldState} → ${newState}`);
    this.emit('state:changed', { sessionId, from: oldState, to: newState, reason });
    
    return true;
  }
  
  /**
   * Validate state transition
   */
  private isValidTransition(from: SessionState, to: SessionState): boolean {
    const validTransitions: Record<SessionState, SessionState[]> = {
      [SessionState.INITIALIZING]: [SessionState.READY, SessionState.ERROR],
      [SessionState.READY]: [SessionState.ACTIVE, SessionState.SUSPENDED, SessionState.CLOSING],
      [SessionState.ACTIVE]: [SessionState.SUSPENDED, SessionState.CLOSING, SessionState.ERROR],
      [SessionState.SUSPENDED]: [SessionState.ACTIVE, SessionState.CLOSING],
      [SessionState.CLOSING]: [SessionState.CLOSED],
      [SessionState.CLOSED]: [],
      [SessionState.ERROR]: [SessionState.CLOSING, SessionState.CLOSED]
    };
    
    return validTransitions[from]?.includes(to) ?? false;
  }
  
  /**
   * Register custom state handler
   */
  public registerStateHandler(state: SessionState, handler: Function): void {
    const handlers = this.stateHandlers.get(state);
    if (handlers) {
      handlers.add(handler);
    }
  }
  
  /**
   * Default state handlers
   */
  private handleInitializing(session: SessionLifecycle): void {
    // Initialize terminal process, allocate resources
    console.log(`[Lifecycle] Initializing session ${session.id}`);
  }
  
  private handleReady(session: SessionLifecycle): void {
    // Session ready for use
    console.log(`[Lifecycle] Session ${session.id} ready`);
  }
  
  private handleActive(session: SessionLifecycle): void {
    // Session actively being used
    this.metrics.activeSessions++;
    console.log(`[Lifecycle] Session ${session.id} active`);
  }
  
  private handleSuspended(session: SessionLifecycle): void {
    // Session suspended, preserve state
    this.metrics.activeSessions--;
    this.metrics.suspendedSessions++;
    console.log(`[Lifecycle] Session ${session.id} suspended`);
  }
  
  private handleClosing(session: SessionLifecycle): void {
    // Cleanup resources, save state if needed
    console.log(`[Lifecycle] Closing session ${session.id}`);
    
    // Deallocate from memory pool
    terminalMemoryPool.deallocateSession(session.id);
  }
  
  private handleClosed(session: SessionLifecycle): void {
    // Final cleanup
    this.metrics.activeSessions--;
    this.metrics.suspendedSessions--;
    
    // Calculate final metrics
    const lifetime = Date.now() - session.createdAt.getTime();
    session.metrics.totalUptime = lifetime;
    
    console.log(`[Lifecycle] Session ${session.id} closed. Lifetime: ${Math.round(lifetime / 1000)}s`);
    
    // Remove from tracking after delay
    setTimeout(() => {
      this.sessions.delete(session.id);
    }, 5000);
  }
  
  private handleError(session: SessionLifecycle): void {
    // Handle error state
    this.metrics.errorSessions++;
    session.metrics.errorCount++;
    console.error(`[Lifecycle] Session ${session.id} entered error state`);
  }
  
  /**
   * Update global metrics
   */
  private updateMetrics(from: SessionState, to: SessionState): void {
    if (from === SessionState.ACTIVE) this.metrics.activeSessions--;
    if (from === SessionState.SUSPENDED) this.metrics.suspendedSessions--;
    if (from === SessionState.ERROR) this.metrics.errorSessions--;
    
    if (to === SessionState.ACTIVE) this.metrics.activeSessions++;
    if (to === SessionState.SUSPENDED) this.metrics.suspendedSessions++;
    if (to === SessionState.ERROR) this.metrics.errorSessions++;
  }
  
  /**
   * Get session lifecycle
   */
  public getSession(id: string): SessionLifecycle | null {
    return this.sessions.get(id) || null;
  }
  
  /**
   * Get all sessions in specific state
   */
  public getSessionsByState(state: SessionState): SessionLifecycle[] {
    return Array.from(this.sessions.values()).filter(s => s.state === state);
  }
  
  /**
   * Update session activity
   */
  public updateActivity(sessionId: string, bytes?: number, command?: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.lastActivity = new Date();
    
    if (bytes) session.metrics.outputBytes += bytes;
    if (command) session.metrics.inputCommands++;
  }
  
  /**
   * Lifecycle monitoring task
   */
  private startLifecycleMonitor(): void {
    setInterval(() => {
      const now = Date.now();
      const config = configManager.getMemoryConfig();
      
      for (const session of this.sessions.values()) {
        const idleTime = now - session.lastActivity.getTime();
        
        // Auto-suspend idle active sessions
        if (session.state === SessionState.ACTIVE && idleTime > config.sessionTimeout) {
          this.transitionTo(session.id, SessionState.SUSPENDED, 'Idle timeout');
        }
        
        // Auto-close long-suspended sessions
        if (session.state === SessionState.SUSPENDED && idleTime > config.sessionTimeout * 2) {
          this.transitionTo(session.id, SessionState.CLOSING, 'Extended suspension');
          this.transitionTo(session.id, SessionState.CLOSED);
        }
        
        // Update metrics
        if (session.state === SessionState.ACTIVE) {
          session.metrics.activeTime += 30000; // 30 seconds
        } else if (session.state === SessionState.SUSPENDED) {
          session.metrics.suspendedTime += 30000;
        }
      }
      
      this.reportMetrics();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Report lifecycle metrics
   */
  private reportMetrics(): void {
    const activeSessions = this.getSessionsByState(SessionState.ACTIVE);
    const avgLifetime = activeSessions.reduce((sum, s) => 
      sum + (Date.now() - s.createdAt.getTime()), 0
    ) / (activeSessions.length || 1);
    
    this.metrics.averageLifetime = avgLifetime;
    
    console.log('[Lifecycle] Metrics:', {
      total: this.sessions.size,
      active: this.metrics.activeSessions,
      suspended: this.metrics.suspendedSessions,
      error: this.metrics.errorSessions,
      avgLifetimeMin: Math.round(avgLifetime / 60000)
    });
  }
  
  /**
   * Get lifecycle statistics
   */
  public getStats(): any {
    return {
      sessions: this.sessions.size,
      metrics: this.metrics,
      states: {
        initializing: this.getSessionsByState(SessionState.INITIALIZING).length,
        ready: this.getSessionsByState(SessionState.READY).length,
        active: this.getSessionsByState(SessionState.ACTIVE).length,
        suspended: this.getSessionsByState(SessionState.SUSPENDED).length,
        closing: this.getSessionsByState(SessionState.CLOSING).length,
        closed: this.getSessionsByState(SessionState.CLOSED).length,
        error: this.getSessionsByState(SessionState.ERROR).length
      }
    };
  }
  
  /**
   * Emergency cleanup
   */
  public emergencyCleanup(): void {
    console.warn('[Lifecycle] Emergency cleanup initiated');
    
    // Close all active sessions
    for (const session of this.sessions.values()) {
      if (session.state === SessionState.ACTIVE || session.state === SessionState.SUSPENDED) {
        this.transitionTo(session.id, SessionState.CLOSING, 'Emergency cleanup');
        this.transitionTo(session.id, SessionState.CLOSED);
      }
    }
    
    // Force memory pool cleanup
    terminalMemoryPool.forceCleanup();
  }
}

interface GlobalMetrics {
  totalSessions: number;
  activeSessions: number;
  suspendedSessions: number;
  errorSessions: number;
  averageLifetime: number;
}

// Export singleton instance
export const terminalLifecycleService = TerminalLifecycleService.getInstance();