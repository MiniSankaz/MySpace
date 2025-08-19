/**
 * Terminal Orchestrator
 * Coordinates all terminal services in clean architecture
 * Provides unified API for terminal operations
 */

import { EventEmitter } from "events";
import {
  SessionManager,
  sessionManager,
  TerminalSession,
  SessionStatus,
  SessionMode,
} from "./core/session-manager.service";
import {
  StreamManager,
  streamManager,
  StreamConnection,
  StreamType,
} from "./core/stream-manager.service";
import {
  MetricsCollector,
  SystemMetrics,
  HealthStatus,
} from "./core/metrics-collector.service";

// Orchestrator interfaces
export interface CreateTerminalParams {
  projectId: string;
  projectPath: string;
  userId?: string;
  mode?: SessionMode;
  dimensions?: { rows: number; cols: number };
  environment?: Record<string, string>;
}

export interface TerminalInfo {
  session: TerminalSession;
  stream?: StreamConnection;
  buffer?: string[];
}

export interface OrchestratorStatus {
  ready: boolean;
  health: HealthStatus;
  statistics: {
    sessions: number;
    streams: number;
    projects: number;
  };
}

/**
 * TerminalOrchestrator - Main facade for terminal operations
 * Coordinates between SessionManager, StreamManager, and MetricsCollector
 */
export class TerminalOrchestrator extends EventEmitter {
  private sessionManager: SessionManager;
  private streamManager: StreamManager;
  private metricsCollector: MetricsCollector;
  private ready: boolean = false;

  constructor() {
    super();

    // Initialize services
    this.sessionManager = sessionManager;
    this.streamManager = streamManager;
    this.metricsCollector = new MetricsCollector(
      this.sessionManager,
      this.streamManager,
    );

    this.setupEventHandlers();
    this.ready = true;

    console.log("[TerminalOrchestrator] Initialized with clean architecture");
  }

  /**
   * Create a new terminal
   */
  public async createTerminal(
    params: CreateTerminalParams,
  ): Promise<TerminalInfo> {
    if (!this.ready) {
      throw new Error("Orchestrator not ready");
    }

    try {
      // Step 1: Create session
      const session = this.sessionManager.createSession({
        projectId: params.projectId,
        userId: params.userId,
        mode: params.mode,
        workingDirectory: params.projectPath,
      });

      // Step 2: Create stream based on mode
      let stream: StreamConnection | undefined;

      if (params.mode === SessionMode.CLAUDE) {
        // Create WebSocket stream for Claude
        stream = await this.streamManager.createWebSocketStream({
          sessionId: session.id,
          type: StreamType.CLAUDE,
        });
      } else {
        // Create terminal process stream
        stream = this.streamManager.createTerminalStream({
          sessionId: session.id,
          workingDirectory: params.projectPath,
          dimensions: params.dimensions,
          environment: params.environment,
        });
      }

      // Step 3: Update session status
      this.sessionManager.updateSessionStatus(session.id, SessionStatus.ACTIVE);

      // Step 4: Emit creation event
      this.emit("terminal:created", { session, stream });

      return {
        session,
        stream,
        buffer: [],
      };
    } catch (error) {
      console.error("[TerminalOrchestrator] Failed to create terminal:", error);
      throw error;
    }
  }

  /**
   * Get terminal information
   */
  public getTerminal(sessionId: string): TerminalInfo | null {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return null;

    const stream = this.streamManager["streams"].get(sessionId);
    const buffer = this.streamManager.readBuffer(sessionId);

    return {
      session,
      stream,
      buffer,
    };
  }

  /**
   * List terminals for a project
   */
  public listProjectTerminals(projectId: string): TerminalInfo[] {
    const sessions = this.sessionManager.listProjectSessions(projectId);

    return sessions.map((session) => ({
      session,
      stream: this.streamManager["streams"].get(session.id),
      buffer: this.streamManager.readBuffer(session.id),
    }));
  }

  /**
   * Write to terminal
   */
  public writeToTerminal(sessionId: string, data: string): void {
    // Update activity
    this.sessionManager.updateSessionMetrics(sessionId, {
      lastActivity: new Date(),
    });

    // Write to stream
    this.streamManager.write(sessionId, data);
  }

  /**
   * Resize terminal
   */
  public resizeTerminal(
    sessionId: string,
    dimensions: { rows: number; cols: number },
  ): void {
    // Update metadata
    this.sessionManager.updateSessionMetadata(sessionId, { dimensions });

    // Resize stream
    this.streamManager.resize(sessionId, dimensions);
  }

  /**
   * Focus/unfocus terminal
   */
  public setTerminalFocus(sessionId: string, focused: boolean): void {
    this.sessionManager.setSessionFocus(sessionId, focused);
  }

  /**
   * Close terminal
   */
  public closeTerminal(sessionId: string): void {
    // Close stream first
    this.streamManager.closeStream(sessionId);

    // Then close session
    this.sessionManager.closeSession(sessionId);

    this.emit("terminal:closed", { sessionId });
  }

  /**
   * Suspend project terminals
   */
  public async suspendProject(projectId: string): Promise<number> {
    // Get all streams for project
    const sessions = this.sessionManager.listProjectSessions(projectId);

    // Close streams but keep sessions
    for (const session of sessions) {
      this.streamManager.closeStream(session.id);
    }

    // Suspend sessions
    const count = this.sessionManager.suspendProjectSessions(projectId);

    this.emit("project:suspended", { projectId, count });

    return count;
  }

  /**
   * Resume project terminals
   */
  public async resumeProject(projectId: string): Promise<TerminalInfo[]> {
    // Resume sessions
    const sessions = this.sessionManager.resumeProjectSessions(projectId);

    // Recreate streams
    const terminals: TerminalInfo[] = [];

    for (const session of sessions) {
      try {
        let stream: StreamConnection | undefined;

        if (session.mode === SessionMode.CLAUDE) {
          stream = await this.streamManager.createWebSocketStream({
            sessionId: session.id,
            type: StreamType.CLAUDE,
          });
        } else {
          stream = this.streamManager.createTerminalStream({
            sessionId: session.id,
            workingDirectory: session.metadata.workingDirectory,
            dimensions: session.metadata.dimensions,
            environment: session.metadata.environment,
          });
        }

        terminals.push({
          session,
          stream,
          buffer: [],
        });
      } catch (error) {
        console.error(
          `[TerminalOrchestrator] Failed to recreate stream for session ${session.id}:`,
          error,
        );
      }
    }

    this.emit("project:resumed", { projectId, count: terminals.length });

    return terminals;
  }

  /**
   * Get orchestrator status
   */
  public getStatus(): OrchestratorStatus {
    const stats = this.sessionManager.getStatistics();
    const health = this.metricsCollector.getHealthStatus();

    return {
      ready: this.ready,
      health,
      statistics: {
        sessions: stats.totalSessions,
        streams: this.streamManager.getActiveStreams().length,
        projects: stats.projectCount,
      },
    };
  }

  /**
   * Get system metrics
   */
  public getMetrics(): SystemMetrics {
    return this.metricsCollector.getCurrentMetrics();
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): any {
    return this.metricsCollector.getPerformanceReport();
  }

  /**
   * Export metrics for monitoring
   */
  public exportMetrics(format: "json" | "prometheus" = "json"): string {
    if (format === "prometheus") {
      return this.metricsCollector.exportPrometheusMetrics();
    }

    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Cleanup all resources
   */
  public async cleanup(): Promise<void> {
    // Close all streams
    const streams = this.streamManager.getActiveStreams();
    for (const stream of streams) {
      this.streamManager.closeStream(stream.sessionId);
    }

    // Close all sessions
    const stats = this.sessionManager.getStatistics();
    const sessions = this.sessionManager["sessions"];
    for (const [sessionId] of sessions) {
      this.sessionManager.closeSession(sessionId);
    }

    this.ready = false;
    this.emit("orchestrator:cleanup");
  }

  // Private methods

  private setupEventHandlers(): void {
    // Forward session events
    this.sessionManager.on("session:created", (session) => {
      this.emit("session:created", session);
    });

    this.sessionManager.on("session:closed", (session) => {
      this.emit("session:closed", session);
    });

    this.sessionManager.on("session:status-changed", (data) => {
      this.emit("session:status-changed", data);
    });

    // Forward stream events
    this.streamManager.on("stream:data", (data) => {
      this.emit("stream:data", data);
    });

    this.streamManager.on("stream:error", (data) => {
      this.emit("stream:error", data);
    });

    // Forward metrics events
    this.metricsCollector.on("health:unhealthy", (health) => {
      this.emit("health:warning", health);
    });

    this.metricsCollector.on("error:recorded", (error) => {
      this.emit("error:recorded", error);
    });
  }
}

// Export singleton instance
let orchestratorInstance: TerminalOrchestrator | null = null;

export function getTerminalOrchestrator(): TerminalOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new TerminalOrchestrator();
  }
  return orchestratorInstance;
}

export default getTerminalOrchestrator();
