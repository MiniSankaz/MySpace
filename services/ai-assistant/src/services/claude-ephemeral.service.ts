/**
 * Claude Ephemeral Session Service
 * Complies with Fair Use Policy by using short-lived sessions
 */

import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { prisma } from "../lib/prisma";

const execAsync = promisify(exec);

export interface EphemeralSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "error";
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

export class ClaudeEphemeralService {
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

  constructor() {
    logger.info(
      "Claude Ephemeral Service initialized with Fair Use Policy compliance",
    );
    this.startCacheCleanup();
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

    // Create ephemeral session
    const session: EphemeralSession = {
      id: uuidv4(),
      userId,
      startTime: new Date(),
      status: "active",
    };

    try {
      // Get limited context
      const context = await this.getMinimalContext(userId);

      // Build messages with context window
      const messages = this.buildMessagesWithContext(context, question);

      // Call Claude CLI
      const response = await this.callClaudeCLI(
        session.id,
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
      throw error;
    } finally {
      // Always cleanup session
      this.cleanupSession(session);
    }
  }

  /**
   * Get minimal context for the user
   */
  private async getMinimalContext(userId: string): Promise<ContextWindow> {
    try {
      // Fetch recent messages from database
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

      // Reverse to get chronological order
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
        content: this.truncateContent(msg.content, 500), // Limit each message
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
   * Call Claude CLI with ephemeral session
   */
  private async callClaudeCLI(
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): Promise<ClaudeResponse> {
    const startTime = Date.now();

    try {
      // Build Claude CLI command
      const messagesJson = JSON.stringify(messages);
      const systemFlag = systemPrompt
        ? `--system "${systemPrompt.replace(/"/g, '\\"')}"`
        : "";

      const command = `claude --api messages create \
        --model claude-3-sonnet-20240229 \
        --max-tokens 4096 \
        ${systemFlag} \
        --messages '${messagesJson.replace(/'/g, "\\'")}'`;

      logger.debug(`Executing Claude CLI for session ${sessionId}`);

      // Execute command with timeout
      const { stdout, stderr } = await Promise.race([
        execAsync(command, {
          timeout: this.sessionTimeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Claude CLI timeout")),
            this.sessionTimeout,
          ),
        ),
      ]);

      if (stderr) {
        logger.warn(`Claude CLI stderr: ${stderr}`);
      }

      // Parse response
      const response = JSON.parse(stdout);

      return {
        content: response.content[0].text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        sessionId,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Claude CLI error for session ${sessionId}:`, error);

      // Fallback response for error cases
      return {
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
        },
        sessionId,
        timestamp: new Date(),
      };
    }
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
      // Create or get current session
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
        // Create new session if needed
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
      // Don't throw - this is not critical for the response
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

      // Could also store in database for analytics
    } catch (error) {
      logger.error("Error logging usage:", error);
    }
  }

  /**
   * Cleanup session
   */
  private cleanupSession(session: EphemeralSession): void {
    logger.debug(`Cleaning up ephemeral session ${session.id}`);
    // Add any cleanup logic here if needed
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

  /**
   * Get service statistics
   */
  getStatistics(): any {
    return {
      cacheSize: this.responseCache.size,
      activeRateLimits: this.lastRequestTime.size,
      maxContextMessages: this.maxContextMessages,
      maxContextTokens: this.maxContextTokens,
      sessionTimeout: this.sessionTimeout,
      cooldownMs: this.cooldownMs,
    };
  }
}

// Export singleton instance
export const claudeEphemeralService = new ClaudeEphemeralService();
