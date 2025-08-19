import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../utils/logger";
import { TerminalService } from "./terminal.service";
import { WebSocketMessage } from "../types";

export class WebSocketService {
  private io: SocketIOServer;
  private terminalService: TerminalService;
  private connections: Map<string, Set<string>> = new Map(); // sessionId -> socket IDs

  constructor(server: HttpServer, terminalService: TerminalService) {
    this.terminalService = terminalService;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
      path: "/ws/terminal-v2/",
    });

    this.setupEventHandlers();
    this.setupTerminalEventHandlers();

    logger.info("WebSocket service initialized");
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      logger.debug("WebSocket client connected", { socketId: socket.id });

      // Handle terminal session join
      socket.on("join", (data: { sessionId: string }) => {
        const { sessionId } = data;

        if (!sessionId) {
          socket.emit("error", { message: "Session ID is required" });
          return;
        }

        const session = this.terminalService.getSession(sessionId);
        if (!session) {
          socket.emit("error", { message: `Session ${sessionId} not found` });
          return;
        }

        // Join room for this session
        socket.join(sessionId);

        // Track connection
        if (!this.connections.has(sessionId)) {
          this.connections.set(sessionId, new Set());
        }
        this.connections.get(sessionId)!.add(socket.id);

        socket.emit("joined", { sessionId, session });

        logger.debug("Client joined terminal session", {
          socketId: socket.id,
          sessionId,
        });
      });

      // Handle terminal data
      socket.on("data", (data: { sessionId: string; content: string }) => {
        const { sessionId, content } = data;

        try {
          this.terminalService.writeToTerminal(sessionId, content);
        } catch (error: any) {
          socket.emit("error", {
            sessionId,
            message: error.message,
          });
        }
      });

      // Handle terminal resize
      socket.on(
        "resize",
        (data: { sessionId: string; rows: number; cols: number }) => {
          const { sessionId, rows, cols } = data;

          try {
            this.terminalService.resizeTerminal(sessionId, { rows, cols });
          } catch (error: any) {
            socket.emit("error", {
              sessionId,
              message: error.message,
            });
          }
        },
      );

      // Handle ping/pong for keep-alive
      socket.on("ping", (data: { sessionId: string }) => {
        socket.emit("pong", data);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        // Remove from all session connections
        for (const [sessionId, socketIds] of this.connections) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            if (socketIds.size === 0) {
              this.connections.delete(sessionId);
            }
            break;
          }
        }

        logger.debug("WebSocket client disconnected", { socketId: socket.id });
      });

      // Handle errors
      socket.on("error", (error) => {
        logger.error("WebSocket error:", {
          socketId: socket.id,
          error: error.message || error,
        });
      });
    });
  }

  private setupTerminalEventHandlers(): void {
    // Forward terminal data to connected clients
    this.terminalService.on(
      "terminal:data",
      (data: {
        sessionId: string;
        data: string;
        direction: "input" | "output";
      }) => {
        if (data.direction === "output") {
          this.io.to(data.sessionId).emit("data", {
            sessionId: data.sessionId,
            content: data.data,
            timestamp: new Date(),
          });
        }
      },
    );

    // Notify clients when terminal exits
    this.terminalService.on(
      "terminal:exit",
      (data: { sessionId: string; exitCode?: number; signal?: number }) => {
        this.io.to(data.sessionId).emit("exit", data);

        // Clean up connections
        this.connections.delete(data.sessionId);
      },
    );

    // Notify clients when session is closed
    this.terminalService.on("session:closed", (data: { sessionId: string }) => {
      this.io.to(data.sessionId).emit("closed", data);

      // Clean up connections
      this.connections.delete(data.sessionId);
    });

    // Handle terminal resize events
    this.terminalService.on(
      "terminal:resize",
      (data: {
        sessionId: string;
        dimensions: { rows: number; cols: number };
      }) => {
        this.io.to(data.sessionId).emit("resize", data);
      },
    );

    // Handle WebSocket responses from terminal service
    this.terminalService.on("websocket:pong", (data: { sessionId: string }) => {
      this.io.to(data.sessionId).emit("pong", data);
    });

    this.terminalService.on(
      "websocket:error",
      (data: { sessionId: string; error: string }) => {
        this.io.to(data.sessionId).emit("error", data);
      },
    );
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    const totalConnections = Array.from(this.connections.values()).reduce(
      (total, connections) => total + connections.size,
      0,
    );

    return {
      totalConnections,
      activeSessions: this.connections.size,
      connectionsPerSession: Array.from(this.connections.entries()).map(
        ([sessionId, connections]) => ({
          sessionId,
          connections: connections.size,
        }),
      ),
    };
  }

  /**
   * Broadcast message to all connections
   */
  public broadcast(message: any): void {
    this.io.emit("broadcast", message);
  }

  /**
   * Send message to specific session
   */
  public sendToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Close all connections for a session
   */
  public closeSessionConnections(sessionId: string): void {
    this.io.to(sessionId).emit("force-close", {
      sessionId,
      reason: "Session terminated",
    });

    // Disconnect all sockets in this session
    const socketIds = this.connections.get(sessionId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
      this.connections.delete(sessionId);
    }
  }

  /**
   * Get server instance for additional configuration
   */
  public getServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Shutdown WebSocket service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down WebSocket service");

    // Close all connections
    this.io.close();

    // Clear connection tracking
    this.connections.clear();

    logger.info("WebSocket service shut down");
  }
}
