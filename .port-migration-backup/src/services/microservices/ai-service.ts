import { BaseServiceClient, ServiceResponse } from "./base-service-client";

// AI Service Types
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  context?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
  timestamp: string;
}

export interface CreateSessionDto {
  userId: string;
  title?: string;
  context?: {
    portfolioId?: string;
    symbols?: string[];
    type?: "general" | "portfolio" | "market" | "trading";
  };
}

export interface SendMessageDto {
  message: string;
  context?: any;
  stream?: boolean;
}

export interface MarketAnalysis {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  keyPoints: string[];
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

export interface StockAnalysis {
  symbol: string;
  analysis: string;
  recommendation: "buy" | "hold" | "sell";
  targetPrice?: number;
  riskLevel: "low" | "medium" | "high";
  keyFactors: string[];
  technicalIndicators?: any;
  fundamentals?: any;
  timestamp: string;
}

export interface PortfolioAdvice {
  portfolioId: string;
  overallHealth: "excellent" | "good" | "fair" | "poor";
  recommendations: {
    action: "buy" | "sell" | "hold" | "rebalance";
    symbol?: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }[];
  riskAssessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
  diversificationScore: number;
  suggestions: string[];
}

export class AIAssistantService extends BaseServiceClient {
  constructor() {
    super({
      name: "ai-assistant",
      baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000",
      timeout: 60000, // Longer timeout for AI operations
    });
  }

  // Chat session management
  async createSession(
    data: CreateSessionDto,
  ): Promise<ServiceResponse<ChatSession>> {
    return this.post<ChatSession>("/api/ai/sessions", data);
  }

  async getSession(sessionId: string): Promise<ServiceResponse<ChatSession>> {
    return this.get<ChatSession>(`/api/ai/sessions/${sessionId}`);
  }

  async getUserSessions(
    userId: string,
  ): Promise<ServiceResponse<ChatSession[]>> {
    return this.get<ChatSession[]>(`/api/ai/sessions/user/${userId}`);
  }

  async deleteSession(sessionId: string): Promise<ServiceResponse<void>> {
    return this.delete<void>(`/api/ai/sessions/${sessionId}`);
  }

  // Chat interactions
  async sendMessage(
    sessionId: string,
    data: SendMessageDto,
  ): Promise<ServiceResponse<ChatMessage>> {
    if (data.stream) {
      // For streaming, return a special response that includes the stream setup
      return this.streamMessage(sessionId, data);
    }
    return this.post<ChatMessage>(
      `/api/ai/sessions/${sessionId}/messages`,
      data,
    );
  }

  private async streamMessage(
    sessionId: string,
    data: SendMessageDto,
  ): Promise<ServiceResponse<ChatMessage>> {
    // This would typically return a readable stream or SSE connection
    // For now, we'll use regular POST and indicate streaming is available
    const response = await this.post<ChatMessage>(
      `/api/ai/sessions/${sessionId}/messages/stream`,
      data,
    );
    return response;
  }

  async getSessionHistory(
    sessionId: string,
    limit?: number,
    offset?: number,
  ): Promise<ServiceResponse<ChatMessage[]>> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    return this.get<ChatMessage[]>(
      `/api/ai/sessions/${sessionId}/messages?${params}`,
    );
  }

  // Market analysis
  async getMarketAnalysis(
    timeframe?: "1D" | "1W" | "1M",
  ): Promise<ServiceResponse<MarketAnalysis>> {
    const params = timeframe ? `?timeframe=${timeframe}` : "";
    return this.get<MarketAnalysis>(`/api/ai/analysis/market${params}`);
  }

  async analyzeStock(symbol: string): Promise<ServiceResponse<StockAnalysis>> {
    return this.get<StockAnalysis>(`/api/ai/analysis/stock/${symbol}`);
  }

  async compareStocks(symbols: string[]): Promise<ServiceResponse<any>> {
    return this.post<any>("/api/ai/analysis/compare", { symbols });
  }

  // Portfolio analysis
  async analyzePortfolio(
    portfolioId: string,
  ): Promise<ServiceResponse<PortfolioAdvice>> {
    return this.get<PortfolioAdvice>(
      `/api/ai/analysis/portfolio/${portfolioId}`,
    );
  }

  async getPortfolioRecommendations(
    portfolioId: string,
  ): Promise<ServiceResponse<any>> {
    return this.get<any>(`/api/ai/recommendations/portfolio/${portfolioId}`);
  }

  async optimizePortfolio(
    portfolioId: string,
    constraints?: any,
  ): Promise<ServiceResponse<any>> {
    return this.post<any>(`/api/ai/optimize/portfolio/${portfolioId}`, {
      constraints,
    });
  }

  // Trading assistance
  async getTradingSignals(symbol: string): Promise<ServiceResponse<any>> {
    return this.get<any>(`/api/ai/trading/signals/${symbol}`);
  }

  async analyzeTradeIdea(trade: {
    symbol: string;
    type: "buy" | "sell";
    quantity: number;
  }): Promise<ServiceResponse<any>> {
    return this.post<any>("/api/ai/trading/analyze", trade);
  }

  // Quick queries (no session required)
  async quickQuery(
    query: string,
    context?: any,
  ): Promise<ServiceResponse<string>> {
    return this.post<string>("/api/ai/query", { query, context });
  }

  // Model management
  async getAvailableModels(): Promise<ServiceResponse<string[]>> {
    return this.get<string[]>("/api/ai/models");
  }

  async setPreferredModel(
    userId: string,
    model: string,
  ): Promise<ServiceResponse<void>> {
    return this.post<void>("/api/ai/preferences", { userId, model });
  }

  // Real-time streaming via Server-Sent Events
  streamChat(
    sessionId: string,
    message: string,
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
  ): () => void {
    const eventSource = new EventSource(
      `${this.config.baseURL}/api/ai/sessions/${sessionId}/stream?message=${encodeURIComponent(message)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      if (onError) onError(error);
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  // WebSocket for real-time AI interactions
  connectWebSocket(
    sessionId: string,
    handlers: {
      onMessage?: (data: any) => void;
      onTyping?: (isTyping: boolean) => void;
      onError?: (error: any) => void;
      onConnect?: () => void;
      onDisconnect?: () => void;
    },
  ): () => void {
    const ws = new WebSocket(
      `${this.config.baseURL.replace("http", "ws")}/ws/ai/${sessionId}`,
    );

    ws.onopen = () => {
      if (handlers.onConnect) handlers.onConnect();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            if (handlers.onMessage) handlers.onMessage(data.payload);
            break;
          case "typing":
            if (handlers.onTyping) handlers.onTyping(data.payload.isTyping);
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (handlers.onError) handlers.onError(error);
    };

    ws.onclose = () => {
      if (handlers.onDisconnect) handlers.onDisconnect();
    };

    // Return cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }
}

// Singleton instance
export const aiAssistantService = new AIAssistantService();
