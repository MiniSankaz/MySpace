import { Request, Response } from "express";
import { claudeCLIService } from "../services/claude-cli.service.simple";
import { logger } from "../utils/logger";

export class ChatCLIController {
  /**
   * Create a new chat session
   */
  createSession = async (req: Request, res: Response) => {
    try {
      const userId =
        (req.headers["x-user-id"] as string) || req.body.userId || "anonymous";

      const session = await claudeCLIService.createSession(userId);

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          status: session.status,
          createdAt: session.createdAt,
        },
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create chat session:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create session",
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Send message and stream response
   */
  sendMessage = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: "Message is required",
          service: "ai-assistant",
          timestamp: new Date().toISOString(),
        });
      }

      const session = claudeCLIService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
          service: "ai-assistant",
          timestamp: new Date().toISOString(),
        });
      }

      // Set up SSE for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Send initial event
      res.write(`event: start\ndata: ${JSON.stringify({ sessionId })}\n\n`);

      try {
        const responseGenerator = await claudeCLIService.sendMessage(
          sessionId,
          message,
        );

        let fullResponse = "";
        for await (const chunk of responseGenerator) {
          if (chunk.error) {
            res.write(
              `event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`,
            );
            break;
          }

          fullResponse += chunk.content;
          res.write(
            `event: message\ndata: ${JSON.stringify({
              content: chunk.content,
              isComplete: chunk.isComplete,
            })}\n\n`,
          );

          if (chunk.isComplete) {
            res.write(
              `event: complete\ndata: ${JSON.stringify({
                sessionId,
                fullResponse,
              })}\n\n`,
            );
            break;
          }
        }
      } catch (error: any) {
        logger.error("Error during message streaming:", error);
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
        );
      }

      res.end();
    } catch (error: any) {
      logger.error("Failed to send message:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message || "Failed to send message",
          service: "ai-assistant",
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  /**
   * Get session info
   */
  getSession = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = claudeCLIService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        userId: session.userId,
        status: session.status,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      },
      service: "ai-assistant",
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Get session messages
   */
  getMessages = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = claudeCLIService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        messages: session.messages,
        total: session.messages.length,
      },
      service: "ai-assistant",
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Close session
   */
  closeSession = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await claudeCLIService.closeSession(sessionId);

      res.json({
        success: true,
        message: "Session closed successfully",
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to close session:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to close session",
        service: "ai-assistant",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * List active sessions
   */
  listSessions = async (req: Request, res: Response) => {
    const sessions = claudeCLIService.getActiveSessions();

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          userId: s.userId,
          status: s.status,
          messageCount: s.messages.length,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
        })),
        total: sessions.length,
      },
      service: "ai-assistant",
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Health check for Claude CLI
   */
  healthCheck = async (req: Request, res: Response) => {
    const activeSessions = claudeCLIService.getActiveSessions();

    res.json({
      success: true,
      data: {
        status: "operational",
        backend: "claude-cli",
        activeSessions: activeSessions.length,
        terminalServiceUrl:
          process.env.TERMINAL_SERVICE_URL || "http://localhost:4300",
        maxSessions: 50,
      },
      service: "ai-assistant",
      timestamp: new Date().toISOString(),
    });
  };
}
