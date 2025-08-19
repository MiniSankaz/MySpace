import { EventEmitter } from "events";
import { spawn, IPty } from "node-pty";
import { v4 as uuidv4 } from "uuid";
import * as os from "os";
import * as path from "path";
import { logger } from "../utils/logger";
import {
  TerminalSession,
  SessionMode,
  SessionStatus,
  StreamConnection,
  StreamType,
  CreateTerminalRequest,
  CreateTerminalResponse,
  TerminalCommand,
  WebSocketMessage,
  TerminalData,
  ResizeData,
} from "../types";

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private processes: Map<string, IPty> = new Map();
  private streams: Map<string, StreamConnection> = new Map();
  private commands: Map<string, TerminalCommand[]> = new Map();

  // Configuration
  private readonly MAX_SESSIONS = 50;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly DEFAULT_SHELL =
    process.env.SHELL || (os.platform() === "win32" ? "cmd.exe" : "/bin/bash");

  constructor() {
    super();
    this.setupCleanupTimer();
    logger.info("Terminal service initialized", {
      maxSessions: this.MAX_SESSIONS,
      defaultShell: this.DEFAULT_SHELL,
    });
  }

  /**
   * Create a new terminal session
   */
  public async createTerminal(
    request: CreateTerminalRequest,
  ): Promise<CreateTerminalResponse> {
    try {
      // Validate request
      this.validateCreateRequest(request);

      // Check session limits
      if (this.sessions.size >= this.MAX_SESSIONS) {
        throw new Error("Maximum number of terminal sessions reached");
      }

      const sessionId = uuidv4();
      const workingDirectory = this.resolveWorkingDirectory(
        request.projectPath,
      );

      // Create session object
      const session: TerminalSession = {
        id: sessionId,
        projectId: request.projectId,
        userId: request.userId,
        name: request.name || `Terminal ${this.sessions.size + 1}`,
        mode: request.mode || SessionMode.TERMINAL,
        status: SessionStatus.INITIALIZING,
        workingDirectory,
        shell: request.shell || this.DEFAULT_SHELL,
        dimensions: request.dimensions || { rows: 24, cols: 80 },
        environment: {
          ...process.env,
          ...request.environment,
          TERM: "xterm-256color",
        },
        metadata: {
          created: new Date(),
          focused: false,
        },
        metrics: {
          commandCount: 0,
          dataTransferred: 0,
          errors: 0,
        },
      };

      // Initialize command history
      this.commands.set(sessionId, []);

      // Create terminal process for non-Claude sessions
      if (session.mode !== SessionMode.CLAUDE) {
        await this.createTerminalProcess(session);
      }

      // Store session
      this.sessions.set(sessionId, session);

      // Create stream connection
      const stream: StreamConnection = {
        id: uuidv4(),
        sessionId,
        type:
          session.mode === SessionMode.CLAUDE
            ? StreamType.CLAUDE
            : StreamType.TERMINAL,
        protocol: "pty",
        status: "connected",
        metadata: {
          created: new Date(),
          dataCount: 0,
        },
      };

      this.streams.set(sessionId, stream);

      // Update session status
      session.status = SessionStatus.ACTIVE;
      session.metadata.lastActivity = new Date();

      logger.info("Terminal session created", {
        sessionId,
        projectId: request.projectId,
        mode: session.mode,
        workingDirectory,
      });

      this.emit("session:created", session);

      return {
        session,
        wsUrl: `/ws/terminal/${sessionId}`,
      };
    } catch (error: any) {
      logger.error("Failed to create terminal session:", {
        error: error.message,
        request,
      });
      throw error;
    }
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
    return Array.from(this.sessions.values()).filter(
      (session) => session.projectId === projectId,
    );
  }

  /**
   * List all active sessions
   */
  public listAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Write data to terminal
   */
  public writeToTerminal(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    const process = this.processes.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!process && session.mode !== SessionMode.CLAUDE) {
      throw new Error(`Terminal process for session ${sessionId} not found`);
    }

    try {
      // Write to terminal process
      if (process) {
        process.write(data);
      }

      // Update session metrics
      session.metadata.lastActivity = new Date();
      session.metrics.dataTransferred += data.length;

      // Track command if it's a command (ends with newline)
      if (data.includes("\r") || data.includes("\n")) {
        this.trackCommand(sessionId, data.trim());
      }

      logger.debug("Data written to terminal", {
        sessionId,
        dataLength: data.length,
      });

      this.emit("terminal:data", { sessionId, data, direction: "input" });
    } catch (error: any) {
      logger.error("Failed to write to terminal:", {
        sessionId,
        error: error.message,
      });

      session.metrics.errors++;
      throw error;
    }
  }

  /**
   * Resize terminal
   */
  public resizeTerminal(
    sessionId: string,
    dimensions: { rows: number; cols: number },
  ): void {
    const session = this.sessions.get(sessionId);
    const process = this.processes.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Update session dimensions
      session.dimensions = dimensions;

      // Resize terminal process
      if (process) {
        process.resize(dimensions.cols, dimensions.rows);
      }

      logger.debug("Terminal resized", {
        sessionId,
        dimensions,
      });

      this.emit("terminal:resize", { sessionId, dimensions });
    } catch (error: any) {
      logger.error("Failed to resize terminal:", {
        sessionId,
        error: error.message,
        dimensions,
      });
      throw error;
    }
  }

  /**
   * Close terminal session
   */
  public closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const process = this.processes.get(sessionId);

    if (!session) {
      return; // Already closed or doesn't exist
    }

    try {
      // Update session status
      session.status = SessionStatus.CLOSED;

      // Kill terminal process
      if (process) {
        process.kill();
        this.processes.delete(sessionId);
      }

      // Clean up data structures
      this.sessions.delete(sessionId);
      this.streams.delete(sessionId);
      this.commands.delete(sessionId);

      logger.info("Terminal session closed", {
        sessionId,
        projectId: session.projectId,
      });

      this.emit("session:closed", { sessionId, session });
    } catch (error: any) {
      logger.error("Failed to close session:", {
        sessionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get session command history
   */
  public getCommandHistory(sessionId: string): TerminalCommand[] {
    return this.commands.get(sessionId) || [];
  }

  /**
   * Get service statistics
   */
  public getStatistics() {
    const sessions = Array.from(this.sessions.values());

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === SessionStatus.ACTIVE)
        .length,
      projectCount: new Set(sessions.map((s) => s.projectId)).size,
      totalCommands: Array.from(this.commands.values()).reduce(
        (total, commands) => total + commands.length,
        0,
      ),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Handle WebSocket message
   */
  public handleWebSocketMessage(
    sessionId: string,
    message: WebSocketMessage,
  ): void {
    try {
      switch (message.type) {
        case "data":
          if (message.data?.content) {
            this.writeToTerminal(sessionId, message.data.content);
          }
          break;

        case "resize":
          if (message.data?.rows && message.data?.cols) {
            this.resizeTerminal(sessionId, {
              rows: message.data.rows,
              cols: message.data.cols,
            });
          }
          break;

        case "ping":
          this.emit("websocket:pong", { sessionId });
          break;

        case "close":
          this.closeSession(sessionId);
          break;

        default:
          logger.warn("Unknown WebSocket message type:", {
            sessionId,
            type: message.type,
          });
      }
    } catch (error: any) {
      logger.error("Failed to handle WebSocket message:", {
        sessionId,
        messageType: message.type,
        error: error.message,
      });

      this.emit("websocket:error", {
        sessionId,
        error: error.message,
      });
    }
  }

  // Private methods

  private validateCreateRequest(request: CreateTerminalRequest): void {
    if (!request.projectId) {
      throw new Error("Project ID is required");
    }

    if (!request.projectPath) {
      throw new Error("Project path is required");
    }

    if (request.dimensions) {
      if (request.dimensions.rows < 1 || request.dimensions.cols < 1) {
        throw new Error("Invalid terminal dimensions");
      }
    }
  }

  private resolveWorkingDirectory(projectPath: string): string {
    if (path.isAbsolute(projectPath)) {
      return projectPath;
    }

    // Resolve relative to user's home directory
    return path.resolve(os.homedir(), projectPath);
  }

  private async createTerminalProcess(session: TerminalSession): Promise<void> {
    try {
      const ptyProcess = spawn(session.shell, [], {
        cwd: session.workingDirectory,
        env: session.environment,
        cols: session.dimensions.cols,
        rows: session.dimensions.rows,
        name: "xterm-color",
        useConpty: os.platform() === "win32",
      });

      // Set PID
      session.pid = ptyProcess.pid;

      // Handle process output
      ptyProcess.onData((data: string) => {
        session.metadata.lastActivity = new Date();
        session.metrics.dataTransferred += data.length;

        this.emit("terminal:data", {
          sessionId: session.id,
          data,
          direction: "output",
        });
      });

      // Handle process exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        logger.info("Terminal process exited", {
          sessionId: session.id,
          exitCode,
          signal,
        });

        session.status = SessionStatus.CLOSED;
        this.emit("terminal:exit", {
          sessionId: session.id,
          exitCode,
          signal,
        });

        // Auto-cleanup
        this.closeSession(session.id);
      });

      this.processes.set(session.id, ptyProcess);

      logger.debug("Terminal process created", {
        sessionId: session.id,
        pid: ptyProcess.pid,
        shell: session.shell,
        workingDirectory: session.workingDirectory,
      });
    } catch (error: any) {
      logger.error("Failed to create terminal process:", {
        sessionId: session.id,
        error: error.message,
      });
      throw error;
    }
  }

  private trackCommand(sessionId: string, command: string): void {
    if (!command || command.length === 0) return;

    const commands = this.commands.get(sessionId) || [];
    const commandId = uuidv4();

    const terminalCommand: TerminalCommand = {
      id: commandId,
      sessionId,
      command,
      startTime: new Date(),
    };

    commands.push(terminalCommand);
    this.commands.set(sessionId, commands);

    // Update session metrics
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metrics.commandCount++;
    }

    // Keep only last 100 commands per session
    if (commands.length > 100) {
      commands.splice(0, commands.length - 100);
    }
  }

  private setupCleanupTimer(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(
      () => {
        this.cleanupInactiveSessions();
      },
      5 * 60 * 1000,
    );
  }

  private cleanupInactiveSessions(): void {
    const now = new Date().getTime();
    const sessionsToClose: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const lastActivity =
        session.metadata.lastActivity?.getTime() ||
        session.metadata.created.getTime();
      const inactive = now - lastActivity;

      if (
        inactive > this.SESSION_TIMEOUT &&
        session.status === SessionStatus.ACTIVE
      ) {
        sessionsToClose.push(sessionId);
      }
    }

    for (const sessionId of sessionsToClose) {
      logger.info("Cleaning up inactive session", { sessionId });
      this.closeSession(sessionId);
    }

    if (sessionsToClose.length > 0) {
      logger.info("Cleaned up inactive sessions", {
        count: sessionsToClose.length,
      });
    }
  }
}
