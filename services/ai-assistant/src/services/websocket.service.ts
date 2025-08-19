import { Server as SocketServer, Socket } from "socket.io";
import { ClaudeService, ClaudeStreamChunk } from "./claude.service";
import { claudeCLIService } from "./claude-cli.service";
import { ConversationService } from "./conversation.service";
import {
  logger,
  logError,
  logWebSocketEvent,
  createTimer,
} from "../utils/logger";
import { ChatMessage } from "../types";

export interface StreamChatRequest {
  sessionId: string;
  userId: string;
  message: string;
  systemPrompt?: string;
  model?: string;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export class WebSocketService {
  private claudeService: ClaudeService;
  private conversationService: ConversationService;
  private connectedClients: Map<
    string,
    { socket: Socket; userId?: string; sessionId?: string }
  > = new Map();
  private useCLI: boolean;

  constructor(private io: SocketServer) {
    // Check if we should use CLI mode (default: true)
    this.useCLI = process.env.USE_CLAUDE_CLI !== "false";

    if (this.useCLI) {
      logger.info("WebSocket using Claude CLI Service as primary");
      // Initialize CLI service
      claudeCLIService.initialize().catch((err) => {
        logger.error("Failed to initialize Claude CLI Service:", err);
      });
    } else {
      logger.info("WebSocket using Claude API Service");
      this.claudeService = new ClaudeService();
    }

    this.conversationService = new ConversationService();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const clientId = socket.id;
    this.connectedClients.set(clientId, { socket });

    logWebSocketEvent("connection", clientId);
    logger.info(
      `Client connected: ${clientId}. Total clients: ${this.connectedClients.size}`,
    );

    // Send welcome message
    this.sendMessage(socket, "connection", {
      message: "Connected to AI Assistant service",
      clientId,
      timestamp: new Date().toISOString(),
    });

    // Handle authentication
    socket.on("auth", (data: { userId: string; sessionId?: string }) => {
      this.handleAuth(socket, data);
    });

    // Handle streaming chat
    socket.on("stream_chat", (data: StreamChatRequest) => {
      this.handleStreamChat(socket, data);
    });

    // Handle typing indicators
    socket.on("typing_start", (data: { sessionId: string; userId: string }) => {
      this.handleTypingStart(socket, data);
    });

    socket.on("typing_stop", (data: { sessionId: string; userId: string }) => {
      this.handleTypingStop(socket, data);
    });

    // Handle join/leave session rooms
    socket.on("join_session", (data: { sessionId: string; userId: string }) => {
      this.handleJoinSession(socket, data);
    });

    socket.on("leave_session", (data: { sessionId: string }) => {
      this.handleLeaveSession(socket, data);
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    // Handle errors
    socket.on("error", (error: Error) => {
      logError(error, { clientId, event: "socket_error" });
    });

    // Handle disconnection
    socket.on("disconnect", (reason: string) => {
      this.handleDisconnection(socket, reason);
    });
  }

  private handleAuth(
    socket: Socket,
    data: { userId: string; sessionId?: string },
  ) {
    const clientId = socket.id;
    const client = this.connectedClients.get(clientId);

    if (!client) {
      return;
    }

    client.userId = data.userId;
    client.sessionId = data.sessionId;

    logWebSocketEvent("auth", clientId, {
      userId: data.userId,
      sessionId: data.sessionId,
    });

    this.sendMessage(socket, "auth_success", {
      message: "Authentication successful",
      userId: data.userId,
      sessionId: data.sessionId,
    });

    // Join user room for broadcasting
    socket.join(`user:${data.userId}`);

    if (data.sessionId) {
      socket.join(`session:${data.sessionId}`);
    }
  }

  private async handleStreamChat(socket: Socket, data: StreamChatRequest) {
    const timer = createTimer("websocket-stream-chat");
    const clientId = socket.id;

    try {
      logWebSocketEvent("stream_chat_start", clientId, {
        sessionId: data.sessionId,
        userId: data.userId,
        messageLength: data.message.length,
      });

      // Validate request
      if (!data.sessionId || !data.userId || !data.message) {
        this.sendError(socket, "Invalid request", "stream_chat_error", {
          error: "sessionId, userId, and message are required",
        });
        return;
      }

      // Get session to verify access
      const session = await this.conversationService.getSession(
        data.sessionId,
        data.userId,
      );
      if (!session) {
        this.sendError(
          socket,
          "Session not found or access denied",
          "stream_chat_error",
          {
            sessionId: data.sessionId,
          },
        );
        return;
      }

      // Add user message to conversation
      const userMessage = await this.conversationService.addMessage(
        data.sessionId,
        data.userId,
        {
          sessionId: data.sessionId,
          role: "user",
          content: data.message,
          timestamp: new Date(),
        },
      );

      // Notify user message was saved
      this.sendMessage(socket, "message_saved", {
        message: userMessage,
        type: "user",
      });

      // Broadcast typing indicator to other clients in the session
      this.broadcastToSession(
        data.sessionId,
        "assistant_typing_start",
        {
          sessionId: data.sessionId,
        },
        clientId,
      );

      // Get conversation history
      const messages = [...session.messages, userMessage];

      // Stream response from Claude
      let fullResponse = "";
      let responseId = "";
      const startTime = Date.now();

      this.sendMessage(socket, "stream_start", {
        sessionId: data.sessionId,
      });

      try {
        const stream = this.claudeService.streamChat(
          messages,
          data.systemPrompt,
        );

        for await (const chunk of stream) {
          if (chunk.type === "message_start" && chunk.message?.id) {
            responseId = chunk.message.id;
          }

          if (chunk.type === "content_block_delta" && chunk.delta?.text) {
            fullResponse += chunk.delta.text;

            // Send chunk to client
            this.sendMessage(socket, "stream_chunk", {
              sessionId: data.sessionId,
              chunk: chunk.delta.text,
              fullResponse,
            });
          }
        }

        const responseTime = Date.now() - startTime;

        // Save Claude's response to conversation
        const assistantMessage = await this.conversationService.addMessage(
          data.sessionId,
          data.userId,
          {
            sessionId: data.sessionId,
            role: "assistant",
            content: fullResponse,
            timestamp: new Date(),
            metadata: {
              model: data.model || this.claudeService.getConfig().model,
              processingTime: responseTime,
              responseId,
            },
          },
        );

        // Send completion event
        this.sendMessage(socket, "stream_complete", {
          sessionId: data.sessionId,
          message: assistantMessage,
          fullResponse,
          responseTime,
        });

        // Stop typing indicator
        this.broadcastToSession(
          data.sessionId,
          "assistant_typing_stop",
          {
            sessionId: data.sessionId,
          },
          clientId,
        );

        logWebSocketEvent("stream_chat_complete", clientId, {
          sessionId: data.sessionId,
          responseTime,
          responseLength: fullResponse.length,
        });
      } catch (streamError: any) {
        // Stop typing indicator on error
        this.broadcastToSession(
          data.sessionId,
          "assistant_typing_stop",
          {
            sessionId: data.sessionId,
          },
          clientId,
        );

        throw streamError;
      }

      timer.end();
    } catch (error: any) {
      timer.end();
      logError(error, {
        clientId,
        event: "stream_chat",
        sessionId: data.sessionId,
      });

      this.sendError(
        socket,
        "Failed to process chat stream",
        "stream_chat_error",
        {
          error: error.message,
          sessionId: data.sessionId,
        },
      );
    }
  }

  private handleTypingStart(
    socket: Socket,
    data: { sessionId: string; userId: string },
  ) {
    const clientId = socket.id;

    logWebSocketEvent("typing_start", clientId, data);

    // Broadcast to other clients in the session
    this.broadcastToSession(
      data.sessionId,
      "user_typing_start",
      {
        sessionId: data.sessionId,
        userId: data.userId,
      },
      clientId,
    );
  }

  private handleTypingStop(
    socket: Socket,
    data: { sessionId: string; userId: string },
  ) {
    const clientId = socket.id;

    logWebSocketEvent("typing_stop", clientId, data);

    // Broadcast to other clients in the session
    this.broadcastToSession(
      data.sessionId,
      "user_typing_stop",
      {
        sessionId: data.sessionId,
        userId: data.userId,
      },
      clientId,
    );
  }

  private handleJoinSession(
    socket: Socket,
    data: { sessionId: string; userId: string },
  ) {
    const clientId = socket.id;
    const client = this.connectedClients.get(clientId);

    if (!client) {
      return;
    }

    socket.join(`session:${data.sessionId}`);
    client.sessionId = data.sessionId;

    logWebSocketEvent("join_session", clientId, data);

    this.sendMessage(socket, "session_joined", {
      sessionId: data.sessionId,
      message: "Successfully joined session",
    });
  }

  private handleLeaveSession(socket: Socket, data: { sessionId: string }) {
    const clientId = socket.id;

    socket.leave(`session:${data.sessionId}`);

    logWebSocketEvent("leave_session", clientId, data);

    this.sendMessage(socket, "session_left", {
      sessionId: data.sessionId,
      message: "Successfully left session",
    });
  }

  private handleDisconnection(socket: Socket, reason: string) {
    const clientId = socket.id;
    this.connectedClients.delete(clientId);

    logWebSocketEvent("disconnect", clientId, { reason });
    logger.info(
      `Client disconnected: ${clientId}. Reason: ${reason}. Remaining clients: ${this.connectedClients.size}`,
    );
  }

  private sendMessage(socket: Socket, type: string, data: any) {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date(),
      ...(data.sessionId && { sessionId: data.sessionId }),
      ...(data.userId && { userId: data.userId }),
    };

    socket.emit("message", message);
  }

  private sendError(
    socket: Socket,
    message: string,
    type: string = "error",
    context?: any,
  ) {
    const errorMessage: WebSocketMessage = {
      type,
      data: {
        error: message,
        ...context,
      },
      timestamp: new Date(),
    };

    socket.emit("error", errorMessage);
  }

  private broadcastToSession(
    sessionId: string,
    type: string,
    data: any,
    excludeClientId?: string,
  ) {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date(),
      sessionId,
    };

    if (excludeClientId) {
      this.io
        .to(`session:${sessionId}`)
        .except(excludeClientId)
        .emit("message", message);
    } else {
      this.io.to(`session:${sessionId}`).emit("message", message);
    }
  }

  private broadcastToUser(
    userId: string,
    type: string,
    data: any,
    excludeClientId?: string,
  ) {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date(),
      userId,
    };

    if (excludeClientId) {
      this.io
        .to(`user:${userId}`)
        .except(excludeClientId)
        .emit("message", message);
    } else {
      this.io.to(`user:${userId}`).emit("message", message);
    }
  }

  // Public methods for external use
  public getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  public getConnectedClients(): Array<{
    clientId: string;
    userId?: string;
    sessionId?: string;
  }> {
    return Array.from(this.connectedClients.entries()).map(
      ([clientId, client]) => ({
        clientId,
        userId: client.userId,
        sessionId: client.sessionId,
      }),
    );
  }

  public async broadcastSystemMessage(
    message: string,
    userId?: string,
    sessionId?: string,
  ) {
    const systemMessage: WebSocketMessage = {
      type: "system_message",
      data: {
        message,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };

    if (userId) {
      this.io.to(`user:${userId}`).emit("message", systemMessage);
    } else if (sessionId) {
      this.io.to(`session:${sessionId}`).emit("message", systemMessage);
    } else {
      this.io.emit("message", systemMessage);
    }

    logger.info("System message broadcasted", {
      message,
      userId,
      sessionId,
      recipients: userId
        ? `user:${userId}`
        : sessionId
          ? `session:${sessionId}`
          : "all",
    });
  }
}
