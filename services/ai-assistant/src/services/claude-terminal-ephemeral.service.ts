/**
 * Claude Terminal Ephemeral Service
 * Uses Terminal Service for CLI interaction (Fair Use Compliant)
 */

import { io, Socket } from "socket.io-client";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort, getServicePort } from '@shared/config/ports.config';
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { prisma } from "../lib/prisma";

export interface EphemeralSession {
  id: string;
  userId: string;
  terminalSessionId?: string;
  startTime: Date;
  endTime?: Date;
  status: "initializing" | "active" | "completed" | "error";
}

export interface ContextWindow {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  maxMessages: number;
  maxTokens: number;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  sessionId: string;
  timestamp: Date;
}

export class ClaudeTerminalEphemeralService {
  private socket: Socket | null = null;
  private readonly terminalServiceUrl: string =
    process.env.TERMINAL_SERVICE_URL || `http://localhost:${getServicePort('terminal')}`;
  private readonly maxContextMessages: number = 5;
  private readonly maxContextTokens: number = 2000;
  private readonly sessionTimeout: number = 30000; // 30 seconds
  private readonly cooldownMs: number = 2000; // 2 seconds between requests
  private lastRequestTime: Map<string, number> = new Map();
  private responseCache: Map<
    string,
    { response: ClaudeResponse; timestamp: number }
  > = new Map();
  private readonly cacheExpiry: number = 300000; // 5 minutes
  private isConnected: boolean = false;
  private activeRequests: Map<string, (response: ClaudeResponse) => void> =
    new Map();

  constructor() {
    logger.info(
      "Claude Terminal Ephemeral Service initialized with Fair Use Policy compliance",
    );
    this.connect();
    this.startCacheCleanup();
  }

  /**
   * Connect to Terminal Service
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.terminalServiceUrl, {
          path: "/ws/terminal-v2/",
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

        this.setupEventHandlers();

        this.socket.on("connect", () => {
          logger.info("Connected to Terminal Service for Claude CLI");
          this.isConnected = true;
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          logger.error("Failed to connect to Terminal Service:", error);
          this.isConnected = false;
          reject(error);
        });
      } catch (error) {
        logger.error("Error creating socket connection:", error);
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason) => {
      logger.warn(`Disconnected from Terminal Service: ${reason}`);
      this.isConnected = false;
    });

    this.socket.on(
      "terminal:output",
      (data: { sessionId: string; content: string }) => {
        this.handleTerminalOutput(data.sessionId, data.content);
      },
    );

    this.socket.on(
      "terminal:session:created",
      (data: { sessionId: string }) => {
        logger.debug(`Terminal session created: ${data.sessionId}`);
      },
    );

    this.socket.on("terminal:session:closed", (data: { sessionId: string }) => {
      logger.debug(`Terminal session closed: ${data.sessionId}`);
    });
  }

  /**
   * Handle terminal output from Claude
   */
  private handleTerminalOutput(sessionId: string, content: string): void {
    const resolver = this.activeRequests.get(sessionId);
    if (resolver) {
      // Parse Claude response from terminal output
      const response: ClaudeResponse = {
        content: this.parseClaudeResponse(content),
        usage: {
          inputTokens: this.estimateTokens(content),
          outputTokens: this.estimateTokens(content),
        },
        sessionId,
        timestamp: new Date(),
      };

      resolver(response);
      this.activeRequests.delete(sessionId);
    }
  }

  /**
   * Process a single question with ephemeral session
   */
  async processQuestion(
    userId: string,
    question: string,
    systemPrompt?: string,
  ): Promise<ClaudeResponse> {
    // Rate limiting check
    await this.enforceRateLimit(userId);

    // Check cache first
    const cachedResponse = this.getCachedResponse(userId, question);
    if (cachedResponse) {
      logger.info(`Cache hit for user ${userId}`);
      return cachedResponse;
    }

    // Ensure connected
    if (!this.isConnected) {
      await this.connect();
    }

    // Create ephemeral session
    const session: EphemeralSession = {
      id: uuidv4(),
      userId,
      startTime: new Date(),
      status: "initializing",
    };

    try {
      // Get limited context
      const context = await this.getMinimalContext(userId);

      // Build messages with context window
      const messages = this.buildMessagesWithContext(context, question);

      // Send to Terminal Service
      const response = await this.sendToTerminal(
        session,
        messages,
        systemPrompt,
      );

      // Store in cache
      this.cacheResponse(userId, question, response);

      // Update user context
      await this.updateUserContext(userId, question, response.content);

      // Mark session as completed
      session.status = "completed";
      session.endTime = new Date();

      // Log usage for monitoring
      await this.logUsage(userId, session, response);

      return response;
    } catch (error) {
      session.status = "error";
      session.endTime = new Date();
      logger.error(`Error in ephemeral session ${session.id}:`, error);

      // Return fallback response
      return {
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        usage: { inputTokens: 0, outputTokens: 0 },
        sessionId: session.id,
        timestamp: new Date(),
      };
    } finally {
      // Always cleanup session
      this.cleanupSession(session);
    }
  }

  /**
   * Send request to Terminal Service
   */
  private async sendToTerminal(
    session: EphemeralSession,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): Promise<ClaudeResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeRequests.delete(session.id);
        reject(new Error("Terminal request timeout"));
      }, this.sessionTimeout);

      // Store resolver for when response comes back
      this.activeRequests.set(session.id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      // Create terminal session
      this.socket?.emit("terminal:create", {
        sessionId: session.id,
        userId: session.userId,
      });

      // Build Claude interaction command
      const claudeInput = this.buildClaudeInput(messages, systemPrompt);

      // Send command to terminal
      setTimeout(() => {
        this.socket?.emit("terminal:input", {
          sessionId: session.id,
          input: claudeInput,
        });
      }, 500); // Small delay to ensure terminal is ready

      // Close terminal session after sending
      setTimeout(() => {
        this.socket?.emit("terminal:close", {
          sessionId: session.id,
        });
      }, 5000); // Give Claude time to respond
    });
  }

  /**
   * Build Claude input for terminal
   */
  private buildClaudeInput(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): string {
    // For Terminal Service, we simulate a conversation
    let input = "";

    if (systemPrompt) {
      input += `System: ${systemPrompt}\n\n`;
    }

    // Add context messages
    for (const msg of messages.slice(-this.maxContextMessages)) {
      if (msg.role === "user") {
        input += `Human: ${msg.content}\n\n`;
      } else if (msg.role === "assistant") {
        input += `Assistant: ${msg.content}\n\n`;
      }
    }

    // Add prompt for Claude to respond
    input += "Assistant: ";

    return input;
  }

  /**
   * Parse Claude response from terminal output
   */
  private parseClaudeResponse(output: string): string {
    // Remove ANSI escape codes
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

    // Extract response after "Assistant: "
    const match = cleanOutput.match(/Assistant:\s*([\s\S]*?)(?:Human:|$)/);
    if (match) {
      return match[1].trim();
    }

    // Fallback to full output
    return cleanOutput.trim();
  }

  /**
   * Get minimal context for the user
   */
  private async getMinimalContext(userId: string): Promise<ContextWindow> {
    try {
      const recentMessages = await prisma.chatMessage.findMany({
        where: {
          session: {
            userId,
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: this.maxContextMessages,
        select: {
          role: true,
          content: true,
        },
      });

      const messages = recentMessages.reverse().map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      return {
        messages,
        maxMessages: this.maxContextMessages,
        maxTokens: this.maxContextTokens,
      };
    } catch (error) {
      logger.error("Error fetching context:", error);
      return {
        messages: [],
        maxMessages: this.maxContextMessages,
        maxTokens: this.maxContextTokens,
      };
    }
  }

  /**
   * Build messages array with context window
   */
  private buildMessagesWithContext(
    context: ContextWindow,
    question: string,
  ): Array<{ role: string; content: string }> {
    const messages = [];

    // Add context messages (limited)
    for (const msg of context.messages.slice(-this.maxContextMessages)) {
      messages.push({
        role: msg.role,
        content: this.truncateContent(msg.content, 500),
      });
    }

    // Add current question
    messages.push({
      role: "user",
      content: question,
    });

    return messages;
  }

  /**
   * Update user context in database
   */
  private async updateUserContext(
    userId: string,
    question: string,
    response: string,
  ): Promise<void> {
    try {
      const session = await prisma.chatSession.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      const sessionId = session?.id || uuidv4();

      if (!session) {
        await prisma.chatSession.create({
          data: {
            id: sessionId,
            userId,
            title: question.substring(0, 100),
            timestamp: new Date(),
            isActive: true,
            metadata: {},
          },
        });
      }

      // Store messages
      await prisma.chatMessage.createMany({
        data: [
          {
            id: uuidv4(),
            sessionId,
            role: "user",
            content: question,
            timestamp: new Date(),
          },
          {
            id: uuidv4(),
            sessionId,
            role: "assistant",
            content: response,
            timestamp: new Date(),
          },
        ],
      });
    } catch (error) {
      logger.error("Error updating user context:", error);
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(userId: string): Promise<void> {
    const lastRequest = this.lastRequestTime.get(userId);
    const now = Date.now();

    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < this.cooldownMs) {
        const waitTime = this.cooldownMs - timeSinceLastRequest;
        logger.info(`Rate limiting user ${userId}, waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.lastRequestTime.set(userId, Date.now());
  }

  /**
   * Cache response
   */
  private cacheResponse(
    userId: string,
    question: string,
    response: ClaudeResponse,
  ): void {
    const cacheKey = `${userId}:${this.hashString(question)}`;
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached response
   */
  private getCachedResponse(
    userId: string,
    question: string,
  ): ClaudeResponse | null {
    const cacheKey = `${userId}:${this.hashString(question)}`;
    const cached = this.responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.response;
    }

    return null;
  }

  /**
   * Log usage for monitoring
   */
  private async logUsage(
    userId: string,
    session: EphemeralSession,
    response: ClaudeResponse,
  ): Promise<void> {
    try {
      const duration = session.endTime
        ? session.endTime.getTime() - session.startTime.getTime()
        : 0;

      logger.info("Ephemeral session completed", {
        sessionId: session.id,
        userId,
        duration,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        status: session.status,
      });
    } catch (error) {
      logger.error("Error logging usage:", error);
    }
  }

  /**
   * Cleanup session
   */
  private cleanupSession(session: EphemeralSession): void {
    logger.debug(`Cleaning up ephemeral session ${session.id}`);
    if (session.terminalSessionId && this.socket) {
      this.socket.emit("terminal:close", {
        sessionId: session.terminalSessionId,
      });
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      this.responseCache.forEach((value, key) => {
        if (now - value.timestamp > this.cacheExpiry) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach((key) => this.responseCache.delete(key));

      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Utility functions
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + "...";
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get service statistics
   */
  getStatistics(): any {
    return {
      cacheSize: this.responseCache.size,
      activeRateLimits: this.lastRequestTime.size,
      activeRequests: this.activeRequests.size,
      maxContextMessages: this.maxContextMessages,
      maxContextTokens: this.maxContextTokens,
      sessionTimeout: this.sessionTimeout,
      cooldownMs: this.cooldownMs,
      isConnected: this.isConnected,
    };
  }
}

// Export singleton instance
export const claudeTerminalEphemeralService =
  new ClaudeTerminalEphemeralService();
