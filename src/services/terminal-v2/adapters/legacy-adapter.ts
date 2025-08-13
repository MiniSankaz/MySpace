/**
 * Legacy Adapter
 * Provides backward compatibility with existing code
 * Maps old API to new clean architecture
 */

import { getTerminalOrchestrator, TerminalOrchestrator } from '../terminal-orchestrator';
import { SessionMode, SessionStatus } from '../core/session-manager.service';

// Legacy interfaces (matching old system)
export interface LegacyTerminalSession {
  id: string;
  projectId: string;
  userId?: string;
  type: string;
  mode: string;
  tabName: string;
  status: string;
  active: boolean;
  isFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentPath: string;
  wsConnected: boolean;
  metadata: any;
}

/**
 * LegacyAdapter - Backward compatibility layer
 * Allows existing code to work with new architecture
 */
export class LegacyAdapter {
  private orchestrator: TerminalOrchestrator;
  
  constructor() {
    this.orchestrator = getTerminalOrchestrator();
    console.log('[LegacyAdapter] Initialized for backward compatibility');
  }

  /**
   * Create session (old API)
   */
  public createSession(
    projectId: string,
    projectPath: string,
    userId?: string,
    mode: string = 'normal'
  ): LegacyTerminalSession {
    // Map old mode to new
    const sessionMode = this.mapMode(mode);
    
    // Create terminal through orchestrator
    const result = this.orchestrator.createTerminal({
      projectId,
      projectPath,
      userId,
      mode: sessionMode
    });
    
    // Return legacy format synchronously (even though creation is async)
    // This maintains backward compatibility
    result.then(info => {
      // Session is created, stream might still be connecting
    }).catch(error => {
      console.error('[LegacyAdapter] Async terminal creation failed:', error);
    });
    
    // Return immediately with expected format
    return this.toLegacyFormat({
      id: `temp_${Date.now()}`, // Temporary ID until real one is available
      projectId,
      userId,
      tabName: 'Terminal',
      status: SessionStatus.INITIALIZING,
      mode: sessionMode,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        workingDirectory: projectPath,
        focused: false,
        dimensions: { rows: 24, cols: 80 }
      },
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        inputBytes: 0,
        outputBytes: 0,
        commandCount: 0,
        errorCount: 0,
        lastActivity: new Date()
      }
    });
  }

  /**
   * List sessions (old API)
   */
  public listSessions(projectId: string): LegacyTerminalSession[] {
    const terminals = this.orchestrator.listProjectTerminals(projectId);
    return terminals.map(t => this.toLegacyFormat(t.session));
  }

  /**
   * Get session (old API)
   */
  public getSession(sessionId: string): LegacyTerminalSession | null {
    const terminal = this.orchestrator.getTerminal(sessionId);
    return terminal ? this.toLegacyFormat(terminal.session) : null;
  }

  /**
   * Update session status (old API)
   */
  public updateSessionStatus(sessionId: string, status: string): void {
    const sessionStatus = this.mapStatus(status);
    const terminal = this.orchestrator.getTerminal(sessionId);
    
    if (terminal) {
      this.orchestrator['sessionManager'].updateSessionStatus(sessionId, sessionStatus);
    }
  }

  /**
   * Set session focus (old API)
   */
  public setSessionFocus(sessionId: string, focused: boolean): void {
    this.orchestrator.setTerminalFocus(sessionId, focused);
  }

  /**
   * Close session (old API)
   */
  public closeSession(sessionId: string): boolean {
    try {
      this.orchestrator.closeTerminal(sessionId);
      return true;
    } catch (error) {
      console.error('[LegacyAdapter] Failed to close session:', error);
      return false;
    }
  }

  /**
   * Clean up project sessions (old API)
   */
  public cleanupProjectSessions(projectId: string): number {
    const terminals = this.orchestrator.listProjectTerminals(projectId);
    let count = 0;
    
    for (const terminal of terminals) {
      this.orchestrator.closeTerminal(terminal.session.id);
      count++;
    }
    
    return count;
  }

  /**
   * Register WebSocket connection (old API)
   */
  public registerWebSocketConnection(sessionId: string, ws: any): void {
    // In new architecture, WebSocket is managed internally
    // This is now a no-op for compatibility
    console.log(`[LegacyAdapter] WebSocket registration for ${sessionId} (handled internally)`);
  }

  /**
   * Update session activity (old API)
   */
  public updateSessionActivity(sessionId: string): void {
    const terminal = this.orchestrator.getTerminal(sessionId);
    if (terminal) {
      this.orchestrator['sessionManager'].updateSessionMetrics(sessionId, {
        lastActivity: new Date()
      });
    }
  }

  /**
   * Get all sessions (old API)
   */
  public getAllSessions(): LegacyTerminalSession[] {
    const stats = this.orchestrator['sessionManager'].getStatistics();
    const sessions = this.orchestrator['sessionManager']['sessions'];
    const result: LegacyTerminalSession[] = [];
    
    for (const [_, session] of sessions) {
      result.push(this.toLegacyFormat(session));
    }
    
    return result;
  }

  /**
   * Get focused sessions (old API)
   */
  public getFocusedSessions(projectId: string): string[] {
    const terminals = this.orchestrator.listProjectTerminals(projectId);
    return terminals
      .filter(t => t.session.metadata.focused)
      .map(t => t.session.id);
  }

  /**
   * Is session focused (old API)
   */
  public isSessionFocused(sessionId: string): boolean {
    const terminal = this.orchestrator.getTerminal(sessionId);
    return terminal ? terminal.session.metadata.focused : false;
  }

  /**
   * Suspend project sessions (old API)
   */
  public async suspendProjectSessions(projectId: string): Promise<number> {
    return this.orchestrator.suspendProject(projectId);
  }

  /**
   * Resume project sessions (old API)
   */
  public async resumeProjectSessions(projectId: string): Promise<any> {
    const terminals = await this.orchestrator.resumeProject(projectId);
    
    return {
      resumed: terminals.length > 0,
      sessions: terminals.map(t => this.toLegacyFormat(t.session))
    };
  }

  /**
   * Clear all sessions (old API)
   */
  public clearAllSessions(): void {
    this.orchestrator.cleanup();
  }

  // Singleton pattern for compatibility
  private static instance: LegacyAdapter;
  
  public static getInstance(): LegacyAdapter {
    if (!LegacyAdapter.instance) {
      LegacyAdapter.instance = new LegacyAdapter();
    }
    return LegacyAdapter.instance;
  }

  // Private conversion methods

  private toLegacyFormat(session: any): LegacyTerminalSession {
    return {
      id: session.id,
      projectId: session.projectId,
      userId: session.userId,
      type: 'terminal',
      mode: session.mode.toLowerCase(),
      tabName: session.tabName,
      status: session.status.toLowerCase(),
      active: session.status === SessionStatus.ACTIVE,
      isFocused: session.metadata.focused,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      currentPath: session.metadata.workingDirectory,
      wsConnected: session.status === SessionStatus.ACTIVE,
      metadata: session.metadata
    };
  }

  private mapMode(oldMode: string): SessionMode {
    switch (oldMode.toLowerCase()) {
      case 'claude':
        return SessionMode.CLAUDE;
      case 'system':
        return SessionMode.SYSTEM;
      default:
        return SessionMode.NORMAL;
    }
  }

  private mapStatus(oldStatus: string): SessionStatus {
    switch (oldStatus.toLowerCase()) {
      case 'connecting':
        return SessionStatus.CONNECTING;
      case 'active':
        return SessionStatus.ACTIVE;
      case 'suspended':
        return SessionStatus.SUSPENDED;
      case 'closed':
        return SessionStatus.CLOSED;
      case 'error':
        return SessionStatus.ERROR;
      default:
        return SessionStatus.INITIALIZING;
    }
  }
}

// Export as InMemoryTerminalService for drop-in replacement
export const InMemoryTerminalService = LegacyAdapter;
export const inMemoryTerminalService = LegacyAdapter.getInstance();

// For compatibility with imports looking for these
export default LegacyAdapter.getInstance();