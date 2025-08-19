import { EventEmitter } from "events";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

export interface ClaudeMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ClaudeSession {
  id: string;
  userId: string;
  terminalSessionId?: string;
  messages: ClaudeMessage[];
  status: "initializing" | "ready" | "processing" | "error" | "closed";
  createdAt: Date;
  lastActivity: Date;
}

export interface ClaudeResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

export class ClaudeCLIService extends EventEmitter {
  private socket: Socket | null = null;
  private sessions: Map<string, ClaudeSession> = new Map();
  private readonly terminalServiceUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  constructor(terminalServiceUrl: string = "http://localhost:4300") {
    super();
    this.terminalServiceUrl = terminalServiceUrl;
    // Don't auto-connect on initialization
  }

  /**
   * Initialize connection to Terminal Service
   */
  public async initialize(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Connect to Terminal Service WebSocket
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.terminalServiceUrl, {
          path: "/ws/terminal-v2/",
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

        this.setupEventHandlers(resolve, reject);
        logger.info("Connecting to Terminal Service for Claude CLI access");
      } catch (error) {
        logger.error("Failed to connect to Terminal Service:", error);
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(resolve?: Function, reject?: Function): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      logger.info("Connected to Terminal Service");
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.emit("connected");
      if (resolve) resolve();
    });

    this.socket.on("disconnect", (reason) => {
      logger.warn(`Disconnected from Terminal Service: ${reason}`);
      this.isConnected = false;
      this.emit("disconnected", reason);
    });

    this.socket.on("error", (error) => {
      logger.error("Terminal Service WebSocket error:", error);
      this.emit("error", error);
    });

    // Handle terminal output
    this.socket.on(
      "terminal:output",
      (data: { sessionId: string; content: string }) => {
        this.handleTerminalOutput(data.sessionId, data.content);
      },
    );

    // Handle terminal session events
    this.socket.on(
      "terminal:session:created",
      (data: { sessionId: string }) => {
        logger.info(`Terminal session created: ${data.sessionId}`);
      },
    );

    this.socket.on("terminal:session:closed", (data: { sessionId: string }) => {
      logger.info(`Terminal session closed: ${data.sessionId}`);
      this.cleanupSession(data.sessionId);
    });
  }

  /**
   * Create a new Claude session
   */
  public async createSession(userId: string): Promise<ClaudeSession> {
    // Ensure we're connected
    if (!this.isConnected) {
      await this.initialize();
    }

    const sessionId = uuidv4();

    const session: ClaudeSession = {
      id: sessionId,
      userId,
      messages: [],
      status: "initializing",
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Create terminal session for Claude CLI
    try {
      const terminalSessionId = await this.createTerminalSession(sessionId);
      session.terminalSessionId = terminalSessionId;
      session.status = "ready";
    } catch (error) {
      logger.error("Failed to create terminal session:", error);
      session.status = "error";
      throw error;
    }

    return session;
  }

  /**
   * Create terminal session for Claude CLI execution
   */
  private async createTerminalSession(sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Terminal session creation timeout"));
      }, 10000);

      if (!this.socket) {
        clearTimeout(timeout);
        reject(new Error("Not connected to Terminal Service"));
        return;
      }

      // Request terminal session creation
      this.socket.emit(
        "terminal:create",
        {
          projectId: `claude-session-${sessionId}`,
          mode: "claude",
          shell: "/bin/bash",
          workingDirectory: "/tmp",
        },
        (response: any) => {
          clearTimeout(timeout);

          if (response.success && response.data?.sessionId) {
            resolve(response.data.sessionId);
          } else {
            reject(
              new Error(response.error || "Failed to create terminal session"),
            );
          }
        },
      );
    });
  }

  /**
   * Send message to Claude via CLI
   */
  public async sendMessage(
    sessionId: string,
    message: string,
  ): Promise<AsyncGenerator<ClaudeResponse>> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "ready") {
      throw new Error(`Session not ready: ${session.status}`);
    }

    if (!this.socket || !session.terminalSessionId) {
      throw new Error("Terminal connection not available");
    }

    // Update session
    session.messages.push({ role: "user", content: message });
    session.status = "processing";
    session.lastActivity = new Date();

    // Prepare Claude CLI command
    const escapedMessage = this.escapeShellCommand(message);
    const command = `claude chat "${escapedMessage}"`;

    // Create async generator for streaming response
    const responseGenerator = this.createResponseGenerator(
      sessionId,
      session.terminalSessionId,
    );

    // Execute command in terminal
    this.socket.emit("terminal:execute", {
      sessionId: session.terminalSessionId,
      command,
    });

    return responseGenerator;
  }

  /**
   * Create async generator for streaming Claude response
   */
  private async *createResponseGenerator(
    sessionId: string,
    terminalSessionId: string,
  ): AsyncGenerator<ClaudeResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let buffer = "";
    let isComplete = false;
    let responseStarted = false;

    // Setup output listener
    const outputHandler = (content: string) => {
      // Detect Claude response start/end patterns
      if (!responseStarted && content.includes("Assistant:")) {
        responseStarted = true;
        content = content.split("Assistant:")[1] || "";
      }

      if (responseStarted) {
        buffer += content;
      }

      // Check for completion
      if (
        content.includes("[End of response]") ||
        content.includes("> ") ||
        content.includes("$")
      ) {
        isComplete = true;
      }
    };

    // Listen for terminal output
    this.on(`terminal:output:${terminalSessionId}`, outputHandler);

    try {
      const timeout = 60000; // 60 seconds timeout
      const startTime = Date.now();

      while (!isComplete && Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (buffer.length > 0) {
          const chunk = buffer;
          buffer = "";

          yield {
            content: chunk,
            isComplete: false,
          };
        }
      }

      // Final response
      if (buffer.length > 0) {
        yield {
          content: buffer,
          isComplete: true,
        };
      }

      // Update session
      session.messages.push({
        role: "assistant",
        content: buffer,
      });
      session.status = "ready";
    } catch (error: any) {
      logger.error("Error in response generator:", error);
      session.status = "error";

      yield {
        content: "",
        isComplete: true,
        error: error.message,
      };
    } finally {
      // Cleanup listener
      this.off(`terminal:output:${terminalSessionId}`, outputHandler);
    }
  }

  /**
   * Handle terminal output
   */
  private handleTerminalOutput(
    terminalSessionId: string,
    content: string,
  ): void {
    // Emit output for specific terminal session
    this.emit(`terminal:output:${terminalSessionId}`, content);
  }

  /**
   * Escape shell command to prevent injection
   */
  private escapeShellCommand(command: string): string {
    // Escape special characters for shell
    return command
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`")
      .replace(/\n/g, "\\n");
  }

  /**
   * Handle connection errors
   */
  private async handleConnectionError(): Promise<void> {
    this.reconnectAttempts++;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      logger.info(`Reconnecting to Terminal Service in ${delay}ms...`);

      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          logger.error("Reconnection failed:", error);
          this.handleConnectionError();
        }
      }, delay);
    } else {
      logger.error(
        "Max reconnection attempts reached. Please check Terminal Service.",
      );
      this.emit("connection:failed");
    }
  }

  /**
   * Cleanup session
   */
  private cleanupSession(terminalSessionId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.terminalSessionId === terminalSessionId) {
        session.status = "closed";
        this.sessions.delete(sessionId);
        logger.info(`Cleaned up Claude session: ${sessionId}`);
        break;
      }
    }
  }

  /**
   * Close session
   */
  public async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    if (session.terminalSessionId && this.socket) {
      this.socket.emit("terminal:close", {
        sessionId: session.terminalSessionId,
      });
    }

    this.sessions.delete(sessionId);
    logger.info(`Closed Claude session: ${sessionId}`);
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): ClaudeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): ClaudeSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status !== "closed",
    );
  }

  /**
   * Cleanup old sessions
   */
  public cleanupOldSessions(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.closeSession(sessionId);
      }
    }
  }

  /**
   * Disconnect from Terminal Service
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    logger.info("Disconnected from Terminal Service");
  }
}

// Export singleton instance (lazy initialization)
let _claudeCLIService: ClaudeCLIService | null = null;

export const claudeCLIService = {
  getInstance(): ClaudeCLIService {
    if (!_claudeCLIService) {
      _claudeCLIService = new ClaudeCLIService(
        process.env.TERMINAL_SERVICE_URL || "http://localhost:4300",
      );
    }
    return _claudeCLIService;
  },

  // Proxy methods for backward compatibility
  async createSession(userId: string) {
    return this.getInstance().createSession(userId);
  },

  async sendMessage(sessionId: string, message: string) {
    return this.getInstance().sendMessage(sessionId, message);
  },

  getSession(sessionId: string) {
    return this.getInstance().getSession(sessionId);
  },

  getActiveSessions() {
    return this.getInstance().getActiveSessions();
  },

  async closeSession(sessionId: string) {
    return this.getInstance().closeSession(sessionId);
  },

  async initialize() {
    return this.getInstance().initialize();
  },
};
