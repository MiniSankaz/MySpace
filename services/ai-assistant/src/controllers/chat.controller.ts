import { Request, Response } from "express";
import { ClaudeService } from "../services/claude.service";
import { MockClaudeService } from "../services/mock-claude.service";
import { claudeCLIService } from "../services/claude-cli.service";
import { ConversationService } from "../services/conversation.service";
import { logger, logError, createTimer } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "../types";

export class ChatController {
  private claudeService: any;
  private conversationService: ConversationService;
  private useCLI: boolean;

  constructor() {
    // Check if we should use CLI mode (default: true)
    this.useCLI = process.env.USE_CLAUDE_CLI !== "false";

    if (this.useCLI) {
      logger.info("Using Claude CLI Service as primary");
      // Initialize CLI service
      claudeCLIService.initialize().catch((err) => {
        logger.error("Failed to initialize Claude CLI Service:", err);
      });
    } else if (
      !process.env.CLAUDE_API_KEY ||
      process.env.CLAUDE_API_KEY === "sk-ant-api03-placeholder-key-for-testing"
    ) {
      logger.warn("Using MockClaudeService for testing");
      this.claudeService = new MockClaudeService();
    } else {
      logger.info("Using Claude API Service");
      this.claudeService = new ClaudeService();
    }
    this.conversationService = new ConversationService();
  }

  /**
   * Create a new chat session
   */
  createSession = async (req: Request, res: Response) => {
    const timer = createTimer("create-session");

    try {
      const { userId, title, folderId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          error: "title is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const session = await this.conversationService.createSession(
        userId,
        title,
        folderId,
      );

      timer.end();

      res.status(201).json({
        success: true,
        data: session,
        message: "Chat session created successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "POST /chat/sessions", body: req.body });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Get chat session
   */
  getSession = async (req: Request, res: Response) => {
    const timer = createTimer("get-session");

    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const session = await this.conversationService.getSession(
        sessionId,
        userId as string,
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      timer.end();

      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "GET /chat/sessions/:sessionId",
        params: req.params,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Get user's chat sessions
   */
  getUserSessions = async (req: Request, res: Response) => {
    const timer = createTimer("get-user-sessions");

    try {
      const { userId, folderId, page = 1, limit = 20 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const sessions = await this.conversationService.getUserSessions(
        userId as string,
        folderId as string | undefined,
        parseInt(page as string, 10),
        parseInt(limit as string, 10),
      );

      timer.end();

      res.json({
        success: true,
        data: sessions.data,
        pagination: sessions.pagination,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "GET /chat/sessions", query: req.query });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Send a chat message
   */
  sendMessage = async (req: Request, res: Response) => {
    const timer = createTimer("send-message");

    try {
      const { sessionId, userId, message, systemPrompt, model } = req.body;

      if (!sessionId || !userId || !message) {
        return res.status(400).json({
          success: false,
          error: "sessionId, userId, and message are required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      // Get session to verify access
      const session = await this.conversationService.getSession(
        sessionId,
        userId,
      );
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found or access denied",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      // Add user message to conversation
      const userMessage = await this.conversationService.addMessage(
        sessionId,
        userId,
        {
          sessionId,
          role: "user",
          content: message,
          timestamp: new Date(),
        },
      );

      // Get conversation history
      const messages = [...session.messages, userMessage];

      let claudeResponse: any;
      let claudeResponseTime: number;

      if (this.useCLI) {
        // Use Claude CLI Service
        const claudeTimer = createTimer("claude-cli-call");

        // Create CLI session if needed
        const cliSession = await claudeCLIService.createSession(userId);

        // Send message via CLI and collect full response
        let fullContent = "";
        const responseGenerator = await claudeCLIService.sendMessage(
          cliSession.id,
          message,
        );

        for await (const chunk of responseGenerator) {
          if (chunk.content) {
            fullContent += chunk.content;
          }
          if (chunk.error) {
            throw new Error(chunk.error);
          }
        }

        claudeResponseTime = claudeTimer.end();

        // Format response to match API structure
        claudeResponse = {
          content: fullContent,
          model: "claude-cli",
          usage: {
            input_tokens: 0, // CLI doesn't provide token counts
            output_tokens: 0,
          },
          timestamp: new Date(),
        };

        // Clean up CLI session
        await claudeCLIService.closeSession(cliSession.id);
      } else {
        // Use Claude API Service
        const claudeTimer = createTimer("claude-api-call");
        claudeResponse = await this.claudeService.chat(messages, systemPrompt);
        claudeResponseTime = claudeTimer.end();
      }

      // Add Claude's response to conversation
      const assistantMessage = await this.conversationService.addMessage(
        sessionId,
        userId,
        {
          sessionId,
          role: "assistant",
          content: claudeResponse.content,
          timestamp: claudeResponse.timestamp,
          metadata: {
            model: claudeResponse.model,
            tokens:
              claudeResponse.usage.input_tokens +
              claudeResponse.usage.output_tokens,
            processingTime: claudeResponseTime,
            inputTokens: claudeResponse.usage.input_tokens,
            outputTokens: claudeResponse.usage.output_tokens,
          },
        },
      );

      timer.end();

      res.json({
        success: true,
        data: {
          userMessage,
          assistantMessage,
          usage: claudeResponse.usage,
          model: claudeResponse.model,
        },
        message: "Message sent successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "POST /chat/message", body: req.body });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Update session title
   */
  updateSessionTitle = async (req: Request, res: Response) => {
    const timer = createTimer("update-session-title");

    try {
      const { sessionId } = req.params;
      const { userId, title } = req.body;

      if (!userId || !title) {
        return res.status(400).json({
          success: false,
          error: "userId and title are required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const session = await this.conversationService.updateSessionTitle(
        sessionId,
        userId,
        title,
      );

      timer.end();

      res.json({
        success: true,
        data: session,
        message: "Session title updated successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "PUT /chat/sessions/:sessionId/title",
        params: req.params,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Delete session
   */
  deleteSession = async (req: Request, res: Response) => {
    const timer = createTimer("delete-session");

    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      await this.conversationService.deleteSession(sessionId, userId as string);

      timer.end();

      res.json({
        success: true,
        message: "Session deleted successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "DELETE /chat/sessions/:sessionId",
        params: req.params,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Search messages
   */
  searchMessages = async (req: Request, res: Response) => {
    const timer = createTimer("search-messages");

    try {
      const { userId, query, sessionId, limit = 50 } = req.query;

      if (!userId || !query) {
        return res.status(400).json({
          success: false,
          error: "userId and query parameters are required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const messages = await this.conversationService.searchMessages(
        userId as string,
        query as string,
        sessionId as string | undefined,
        parseInt(limit as string, 10),
      );

      timer.end();

      res.json({
        success: true,
        data: messages,
        message: `Found ${messages.length} messages`,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "GET /chat/search", query: req.query });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Get session statistics
   */
  getSessionStats = async (req: Request, res: Response) => {
    const timer = createTimer("get-session-stats");

    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const stats = await this.conversationService.getSessionStats(
        sessionId,
        userId as string,
      );

      timer.end();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "GET /chat/sessions/:sessionId/stats",
        params: req.params,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Get Claude models and configuration
   */
  getModelsAndConfig = async (req: Request, res: Response) => {
    const timer = createTimer("get-models-config");

    try {
      const models = this.claudeService.getAvailableModels();
      const config = this.claudeService.getConfig();

      timer.end();

      res.json({
        success: true,
        data: {
          availableModels: models,
          currentConfig: config,
        },
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "GET /chat/models" });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };
}
