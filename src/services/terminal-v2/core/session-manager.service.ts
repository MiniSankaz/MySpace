/**
 * SessionManager Service
 * Single source of truth for all terminal session state
 * Clean Architecture - Core Domain Service
 */

import { EventEmitter } from "events";
import { terminalConfig } from "@/config/terminal.config";

// Domain Models
export interface TerminalSession {
  id: string;
  projectId: string;
  userId?: string;
  tabName: string;
  status: SessionStatus;
  mode: SessionMode;
  createdAt: Date;
  updatedAt: Date;
  metadata: SessionMetadata;
  metrics: SessionMetrics;
}

export enum SessionStatus {
  INITIALIZING = "initializing",
  CONNECTING = "connecting",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSING = "closing",
  CLOSED = "closed",
  ERROR = "error",
}

export enum SessionMode {
  NORMAL = "normal",
  CLAUDE = "claude",
  SYSTEM = "system",
}

export interface SessionMetadata {
  workingDirectory: string;
  environment?: Record<string, string>;
  dimensions?: { rows: number; cols: number };
  focused: boolean;
  layoutPosition?: number;
}

export interface SessionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  inputBytes: number;
  outputBytes: number;
  commandCount: number;
  errorCount: number;
  lastActivity: Date;
}

interface SuspendedState {
  suspendedAt: Date;
  bufferedOutput: string[];
  metadata: SessionMetadata;
  metrics: SessionMetrics;
}

/**
 * SessionManager - Core business logic for session management
 * No external dependencies, pure domain logic
 */
export class SessionManager extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private projectSessions: Map<string, Set<string>> = new Map();
  private suspendedSessions: Map<string, SuspendedState> = new Map();
  private sessionCounters: Map<string, number> = new Map();

  // Domain constraints
  private readonly MAX_SESSIONS_TOTAL = terminalConfig.memory.maxTotalSessions;
  private readonly MAX_SESSIONS_PER_PROJECT =
    terminalConfig.memory.maxSessionsPerProject;
  private readonly MAX_FOCUSED_PER_PROJECT =
    terminalConfig.memory.maxFocusedPerProject;
  private readonly SESSION_TIMEOUT = terminalConfig.memory.sessionTimeout;
  private readonly SUSPENSION_TIMEOUT =
    terminalConfig.suspension.maxSuspensionTime;

  constructor() {
    super();
    this.setupCleanupTimers();
  }

  /**
   * Create a new session
   */
  public createSession(params: {
    projectId: string;
    userId?: string;
    mode?: SessionMode;
    workingDirectory?: string;
  }): TerminalSession {
    // Validate constraints
    this.validateSessionCreation(params.projectId);

    const sessionId = this.generateSessionId();
    const tabName = this.getNextTabName(params.projectId);

    const session: TerminalSession = {
      id: sessionId,
      projectId: params.projectId,
      userId: params.userId,
      tabName,
      status: SessionStatus.INITIALIZING,
      mode: params.mode || SessionMode.NORMAL,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        workingDirectory: params.workingDirectory || process.cwd(),
        focused: false,
        dimensions: { rows: 24, cols: 80 },
      },
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        inputBytes: 0,
        outputBytes: 0,
        commandCount: 0,
        errorCount: 0,
        lastActivity: new Date(),
      },
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track by project
    if (!this.projectSessions.has(params.projectId)) {
      this.projectSessions.set(params.projectId, new Set());
    }
    this.projectSessions.get(params.projectId)!.add(sessionId);

    // Auto-focus if under limit
    this.autoFocusSession(session);

    // Emit event
    this.emit("session:created", session);

    return session;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): TerminalSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * List sessions for a project
   */
  public listProjectSessions(projectId: string): TerminalSession[] {
    const sessionIds = this.projectSessions.get(projectId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter(Boolean) as TerminalSession[];
  }

  /**
   * Update session status
   */
  public updateSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const oldStatus = session.status;
    session.status = status;
    session.updatedAt = new Date();

    // Handle state transitions
    this.handleStatusTransition(session, oldStatus, status);

    this.emit("session:status-changed", {
      session,
      oldStatus,
      newStatus: status,
    });
  }

  /**
   * Update session metadata
   */
  public updateSessionMetadata(
    sessionId: string,
    metadata: Partial<SessionMetadata>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.updatedAt = new Date();

    this.emit("session:metadata-updated", session);
  }

  /**
   * Update session metrics
   */
  public updateSessionMetrics(
    sessionId: string,
    metrics: Partial<SessionMetrics>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return; // Silent fail for metrics

    session.metrics = { ...session.metrics, ...metrics };
    session.metrics.lastActivity = new Date();
    session.updatedAt = new Date();
  }

  /**
   * Focus/unfocus session
   */
  public setSessionFocus(sessionId: string, focused: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (focused) {
      // Check focus limit
      const focusedCount = this.getFocusedSessionCount(session.projectId);
      if (focusedCount >= this.MAX_FOCUSED_PER_PROJECT) {
        // Unfocus oldest
        this.unfocusOldestSession(session.projectId);
      }
    }

    session.metadata.focused = focused;
    session.updatedAt = new Date();

    this.emit("session:focus-changed", { session, focused });
  }

  /**
   * Suspend sessions for a project
   */
  public suspendProjectSessions(projectId: string): number {
    const sessions = this.listProjectSessions(projectId);
    let suspendedCount = 0;

    for (const session of sessions) {
      if (session.status === SessionStatus.ACTIVE) {
        // Store suspended state
        this.suspendedSessions.set(session.id, {
          suspendedAt: new Date(),
          bufferedOutput: [],
          metadata: { ...session.metadata },
          metrics: { ...session.metrics },
        });

        // Update status
        session.status = SessionStatus.SUSPENDED;
        session.updatedAt = new Date();

        suspendedCount++;
        this.emit("session:suspended", session);
      }
    }

    return suspendedCount;
  }

  /**
   * Resume sessions for a project
   */
  public resumeProjectSessions(projectId: string): TerminalSession[] {
    const sessions = this.listProjectSessions(projectId);
    const resumedSessions: TerminalSession[] = [];

    for (const session of sessions) {
      const suspendedState = this.suspendedSessions.get(session.id);
      if (suspendedState) {
        // Check if expired
        const suspendedTime = Date.now() - suspendedState.suspendedAt.getTime();
        if (suspendedTime > this.SUSPENSION_TIMEOUT) {
          // Expired - close session
          this.closeSession(session.id);
          continue;
        }

        // Restore state
        session.status = SessionStatus.ACTIVE;
        session.metadata = suspendedState.metadata;
        session.metrics = suspendedState.metrics;
        session.updatedAt = new Date();

        // Clear suspended state
        this.suspendedSessions.delete(session.id);

        resumedSessions.push(session);
        this.emit("session:resumed", session);
      }
    }

    return resumedSessions;
  }

  /**
   * Close a session
   */
  public closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update status
    session.status = SessionStatus.CLOSED;
    session.updatedAt = new Date();

    // Remove from project tracking
    const projectSessions = this.projectSessions.get(session.projectId);
    if (projectSessions) {
      projectSessions.delete(sessionId);
      if (projectSessions.size === 0) {
        this.projectSessions.delete(session.projectId);
      }
    }

    // Remove suspended state if exists
    this.suspendedSessions.delete(sessionId);

    // Emit event
    this.emit("session:closed", session);

    // Remove from memory after delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 5000);
  }

  /**
   * Close all sessions for a project
   */
  public closeProjectSessions(projectId: string): number {
    const sessions = this.listProjectSessions(projectId);
    let closedCount = 0;

    for (const session of sessions) {
      this.closeSession(session.id);
      closedCount++;
    }

    // Reset counter
    this.sessionCounters.delete(projectId);

    return closedCount;
  }

  /**
   * Get session statistics
   */
  public getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    suspendedSessions: number;
    projectCount: number;
    memoryUsage: number;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      suspendedSessions: this.suspendedSessions.size,
      projectCount: this.projectSessions.size,
      memoryUsage: 0,
    };

    for (const session of this.sessions.values()) {
      if (session.status === SessionStatus.ACTIVE) {
        stats.activeSessions++;
      }
      stats.memoryUsage += session.metrics.memoryUsage;
    }

    return stats;
  }

  // Private methods

  private validateSessionCreation(projectId: string): void {
    // Check total limit
    if (this.sessions.size >= this.MAX_SESSIONS_TOTAL) {
      throw new Error(
        `Maximum total sessions (${this.MAX_SESSIONS_TOTAL}) reached`,
      );
    }

    // Check project limit
    const projectSessions = this.projectSessions.get(projectId);
    if (
      projectSessions &&
      projectSessions.size >= this.MAX_SESSIONS_PER_PROJECT
    ) {
      throw new Error(
        `Maximum sessions per project (${this.MAX_SESSIONS_PER_PROJECT}) reached`,
      );
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private getNextTabName(projectId: string): string {
    const sessions = this.listProjectSessions(projectId);
    let maxNumber = 0;

    for (const session of sessions) {
      const match = session.tabName.match(/Terminal (\d+)/);
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1]));
      }
    }

    return `Terminal ${maxNumber + 1}`;
  }

  private autoFocusSession(session: TerminalSession): void {
    const focusedCount = this.getFocusedSessionCount(session.projectId);
    if (focusedCount < this.MAX_FOCUSED_PER_PROJECT) {
      session.metadata.focused = true;
    }
  }

  private getFocusedSessionCount(projectId: string): number {
    const sessions = this.listProjectSessions(projectId);
    return sessions.filter((s) => s.metadata.focused).length;
  }

  private unfocusOldestSession(projectId: string): void {
    const sessions = this.listProjectSessions(projectId)
      .filter((s) => s.metadata.focused)
      .sort(
        (a, b) =>
          a.metrics.lastActivity.getTime() - b.metrics.lastActivity.getTime(),
      );

    if (sessions.length > 0) {
      sessions[0].metadata.focused = false;
    }
  }

  private handleStatusTransition(
    session: TerminalSession,
    oldStatus: SessionStatus,
    newStatus: SessionStatus,
  ): void {
    // Handle state-specific logic
    if (
      newStatus === SessionStatus.ACTIVE &&
      oldStatus !== SessionStatus.ACTIVE
    ) {
      session.metrics.lastActivity = new Date();
    }

    if (newStatus === SessionStatus.ERROR) {
      session.metrics.errorCount++;
    }
  }

  private setupCleanupTimers(): void {
    // Cleanup inactive sessions
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, terminalConfig.memory.cleanupInterval);

    // Cleanup expired suspended sessions
    setInterval(() => {
      this.cleanupExpiredSuspensions();
    }, terminalConfig.suspension.cleanupInterval);
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeout = this.SESSION_TIMEOUT;

    for (const session of this.sessions.values()) {
      if (session.status === SessionStatus.CLOSED) continue;

      const inactiveTime = now - session.metrics.lastActivity.getTime();
      if (inactiveTime > timeout && session.status !== SessionStatus.ACTIVE) {
        this.closeSession(session.id);
      }
    }
  }

  private cleanupExpiredSuspensions(): void {
    const now = Date.now();

    for (const [sessionId, state] of this.suspendedSessions) {
      const suspendedTime = now - state.suspendedAt.getTime();
      if (suspendedTime > this.SUSPENSION_TIMEOUT) {
        this.suspendedSessions.delete(sessionId);
        this.closeSession(sessionId);
      }
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
