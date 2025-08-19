import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../utils/logger";

interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}

class WebSocketService {
  private clients: Map<string, WSClient> = new Map();
  private wss: WebSocketServer | null = null;

  initialize(wss: WebSocketServer) {
    this.wss = wss;

    wss.on("connection", (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: WSClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: "connected",
        data: {
          clientId,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle messages
      ws.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          logger.error("Error parsing WebSocket message:", error);
          this.sendToClient(clientId, {
            type: "error",
            data: { message: "Invalid message format" },
          });
        }
      });

      // Handle disconnect
      ws.on("close", () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on("error", (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case "subscribe":
        this.handleSubscribe(clientId, message.data);
        break;
      case "unsubscribe":
        this.handleUnsubscribe(clientId, message.data);
        break;
      case "authenticate":
        this.handleAuthenticate(clientId, message.data);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel, portfolioId, symbol } = data;

    if (channel === "portfolio" && portfolioId) {
      client.subscriptions.add(`portfolio:${portfolioId}`);
      this.sendToClient(clientId, {
        type: "subscribed",
        data: { channel: `portfolio:${portfolioId}` },
      });
    } else if (channel === "stock" && symbol) {
      client.subscriptions.add(`stock:${symbol}`);
      this.sendToClient(clientId, {
        type: "subscribed",
        data: { channel: `stock:${symbol}` },
      });
    } else if (channel === "prices") {
      client.subscriptions.add("prices");
      this.sendToClient(clientId, {
        type: "subscribed",
        data: { channel: "prices" },
      });
    }
  }

  private handleUnsubscribe(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel } = data;
    client.subscriptions.delete(channel);
    this.sendToClient(clientId, {
      type: "unsubscribed",
      data: { channel },
    });
  }

  private handleAuthenticate(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // TODO: Validate auth token
    client.userId = data.userId;
    this.sendToClient(clientId, {
      type: "authenticated",
      data: { userId: data.userId },
    });
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(channel: string, data: any) {
    const message = {
      type: "update",
      channel,
      data,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client) => {
      if (
        client.subscriptions.has(channel) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastPortfolioUpdate(portfolioId: string, data: any) {
    this.broadcast(`portfolio:${portfolioId}`, data);
  }

  broadcastStockUpdate(symbol: string, data: any) {
    this.broadcast(`stock:${symbol}`, data);
  }

  broadcastPriceUpdate(data: any) {
    this.broadcast("prices", data);
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const wsService = new WebSocketService();

export function initializeWebSocket(wss: WebSocketServer) {
  wsService.initialize(wss);
}
