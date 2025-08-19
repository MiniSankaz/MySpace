import { EventEmitter } from "events";
import { terminalConfig, getWebSocketUrl } from "@/config/terminal.config";
import { terminalSessionManager } from "./terminal-session-manager";
import {
  createTerminalMultiplexer,
  TerminalWebSocketMultiplexer,
} from "./terminal-websocket-multiplexer";
import { terminalService } from "./terminal.service";
import { TerminalSession } from "../types";

/**
 * Terminal Integration Service
 * Coordinates between session manager, terminal service, and WebSocket multiplexer
 */
export class TerminalIntegrationService extends EventEmitter {
  private multiplexer: TerminalWebSocketMultiplexer | null = null;
  private initialized = false;
  private wsUrl: string;

  constructor() {
    super();
    // Use the standalone WebSocket server on port terminalConfig.websocket.port for system terminals
    this.wsUrl =
      process.env.TERMINAL_WS_URL ||
      "ws://127.0.0.1:terminalConfig.websocket.port";
    // Initialize will be called when needed, not immediately
    // this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Initialize WebSocket multiplexer for client connections
      this.multiplexer = createTerminalMultiplexer({
        url: this.wsUrl,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Set up event listeners for multiplexer
      this.setupMultiplexerListeners();

      // Set up event listeners for session manager
      this.setupSessionManagerListeners();

      // Set up event listeners for terminal service
      this.setupTerminalServiceListeners();

      this.initialized = true;
      console.log("Terminal integration service initialized");
    } catch (error) {
      console.error(
        "Failed to initialize terminal integration service:",
        error,
      );
      throw error;
    }
  }

  private setupMultiplexerListeners() {
    if (!this.multiplexer) return;

    // Handle session connections
    this.multiplexer.on("session:connected", ({ sessionId }) => {
      terminalSessionManager.markConnected(sessionId, sessionId);
    });

    this.multiplexer.on("session:disconnected", ({ sessionId }) => {
      terminalSessionManager.markDisconnected(sessionId);
    });

    // Handle session data
    this.multiplexer.on("session:data", ({ sessionId, data }) => {
      terminalSessionManager.addOutput(sessionId, data);
    });

    // Handle session errors
    this.multiplexer.on("session:error", ({ sessionId, error }) => {
      console.error(`Session ${sessionId} error:`, error);
      this.emit("session:error", { sessionId, error });
    });
  }

  private setupSessionManagerListeners() {
    // Handle session creation
    terminalSessionManager.on("session:created", (session: TerminalSession) => {
      console.log("Session created:", session.id);
      // Auto-connect if multiplexer is available
      if (this.multiplexer) {
        this.connectSession(session.id, session.projectId, session.type);
      }
    });

    // Handle session updates
    terminalSessionManager.on("session:updated", (session: TerminalSession) => {
      this.emit("session:updated", session);
    });

    // Handle session closure
    terminalSessionManager.on("session:closed", ({ sessionId }) => {
      if (this.multiplexer) {
        this.multiplexer.disconnectSession(sessionId);
      }
      // Also close in terminal service
      terminalService.closeSession(sessionId).catch(console.error);
    });

    // Handle output from session manager
    terminalSessionManager.on("session:output", ({ sessionId, data }) => {
      // Forward to connected clients
      this.emit("output", { sessionId, data });
    });
  }

  private setupTerminalServiceListeners() {
    // Handle terminal output
    terminalService.on("output", (message) => {
      const { sessionId, data } = message;
      // Add to session manager
      terminalSessionManager.addOutput(sessionId, data);
      // Forward to clients
      this.emit("output", { sessionId, data });
    });

    // Handle terminal exit
    terminalService.on("exit", async ({ sessionId, exitCode }) => {
      console.log(`Terminal ${sessionId} exited with code ${exitCode}`);
      await terminalSessionManager.updateSessionStatus(sessionId, false);
      this.emit("session:exit", { sessionId, exitCode });
    });
  }

  /**
   * Create a new terminal session
   */
  async createSession(
    projectId: string,
    type: "system" | "claude",
    tabName: string,
    projectPath: string,
    userId?: string,
  ): Promise<TerminalSession> {
    try {
      // Create or restore session in session manager
      const session = await terminalSessionManager.createOrRestoreSession(
        projectId,
        type,
        tabName,
        projectPath,
        userId,
      );

      // NOTE: WebSocket connection will be handled directly by frontend
      // The standalone WebSocket servers are independent and don't need multiplexer
      console.log(
        `Created terminal session ${session.id} for ${type} terminal`,
      );

      return session;
    } catch (error) {
      console.error("Failed to create terminal session:", error);
      throw error;
    }
  }

  /**
   * Connect to an existing session via WebSocket
   * NOTE: This is handled directly by frontend connecting to standalone WebSocket servers
   */
  async connectSession(
    sessionId: string,
    projectId: string,
    type: "system" | "claude",
  ) {
    // No-op - connection is handled by standalone WebSocket servers
    console.log(
      `Session ${sessionId} connection will be handled by standalone ${type === "claude" ? "Claude" : "System"} WebSocket server`,
    );
  }

  /**
   * Send input to a terminal session
   * NOTE: Input is sent directly via WebSocket from frontend
   */
  sendInput(sessionId: string, data: string) {
    // Input is sent directly via WebSocket connection from frontend
    // This is mainly for programmatic access if needed
    terminalService.executeCommand(sessionId, data).catch(console.error);
  }

  /**
   * Send command to a terminal session
   * NOTE: Commands are sent directly via WebSocket from frontend
   */
  sendCommand(sessionId: string, command: string) {
    // Commands are sent directly via WebSocket connection from frontend
    // This is mainly for programmatic access if needed
    terminalService.executeCommand(sessionId, command).catch(console.error);
  }

  /**
   * Resize terminal session
   * NOTE: Resize is handled directly via WebSocket from frontend
   */
  resizeSession(sessionId: string, cols: number, rows: number) {
    // Resize is handled directly via WebSocket connection from frontend
    // This is mainly for programmatic access if needed
    terminalService.resizeTerminal(sessionId, cols, rows).catch(console.error);
  }

  /**
   * Clear terminal session
   * NOTE: Clear is handled directly via WebSocket from frontend
   */
  clearSession(sessionId: string) {
    // Clear is handled directly via WebSocket connection from frontend
    // This is mainly for programmatic access if needed
    terminalService.clearTerminal(sessionId).catch(console.error);
  }

  /**
   * Close terminal session
   */
  async closeSession(sessionId: string) {
    try {
      // Close in session manager (this will handle cleanup)
      await terminalSessionManager.closeSession(sessionId);
      console.log(`Closed terminal session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to close session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession | null {
    return terminalSessionManager.getSession(sessionId);
  }

  /**
   * Get all sessions for a project
   */
  getProjectSessions(projectId: string): TerminalSession[] {
    return terminalSessionManager.getProjectSessions(projectId);
  }

  /**
   * Get sessions by type for a project
   */
  getProjectSessionsByType(
    projectId: string,
    type: "system" | "claude",
  ): TerminalSession[] {
    return terminalSessionManager.getProjectSessionsByType(projectId, type);
  }

  /**
   * Rename a session
   */
  async renameSession(sessionId: string, newName: string) {
    await terminalSessionManager.renameSession(sessionId, newName);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const managerStats = terminalSessionManager.getStatistics();
    const terminalStats = {
      activeTerminals: terminalService.getActiveTerminals().length,
    };

    return {
      sessionManager: managerStats,
      terminals: terminalStats,
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log("Shutting down terminal integration service...");

    // Destroy multiplexer
    if (this.multiplexer) {
      this.multiplexer.destroy();
      this.multiplexer = null;
    }

    // Cleanup terminal service
    await terminalService.cleanup();

    // Shutdown session manager
    await terminalSessionManager.shutdown();

    this.removeAllListeners();
    this.initialized = false;
  }
}

// Export singleton instance
export const terminalIntegration = new TerminalIntegrationService();

// Cleanup on process exit
process.on("beforeExit", () => {
  terminalIntegration.shutdown();
});

process.on("SIGINT", () => {
  terminalIntegration.shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  terminalIntegration.shutdown().then(() => process.exit(0));
});
