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
  private isConnected = false;

  constructor(terminalServiceUrl: string = "http://localhost:4300") {
    super();
    this.terminalServiceUrl = terminalServiceUrl;
  }

  /**
   * Create a new Claude session (mock implementation for testing)
   */
  public async createSession(userId: string): Promise<ClaudeSession> {
    const sessionId = uuidv4();

    const session: ClaudeSession = {
      id: sessionId,
      userId,
      messages: [],
      status: "ready", // Mock: immediately ready
      createdAt: new Date(),
      lastActivity: new Date(),
      terminalSessionId: `mock-terminal-${sessionId}`,
    };

    this.sessions.set(sessionId, session);
    logger.info(`Created mock Claude session: ${sessionId}`);

    return session;
  }

  /**
   * Send message to Claude (mock implementation)
   */
  public async *sendMessage(
    sessionId: string,
    message: string,
  ): AsyncGenerator<ClaudeResponse> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    // Update session
    session.messages.push({ role: "user", content: message });
    session.status = "processing";
    session.lastActivity = new Date();

    // Mock response
    const mockResponse = `Mock response to: "${message}". This is a test implementation of Claude CLI integration.`;

    // Simulate streaming
    const words = mockResponse.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      yield {
        content: words[i] + " ",
        isComplete: i === words.length - 1,
      };
    }

    // Update session with response
    session.messages.push({
      role: "assistant",
      content: mockResponse,
    });
    session.status = "ready";
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
   * Close session
   */
  public async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.status = "closed";
      this.sessions.delete(sessionId);
      logger.info(`Closed Claude session: ${sessionId}`);
    }
  }
}

// Export singleton instance
export const claudeCLIService = new ClaudeCLIService(
  process.env.TERMINAL_SERVICE_URL || "http://localhost:4300",
);
