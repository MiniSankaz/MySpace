/**
 * AI Assistant Service
 */
import apiClient from "./gateway.client";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

class AIService {
  async createSession(model: string = "claude-3-sonnet"): Promise<ChatSession> {
    const response = await apiClient.post<ChatSession>("/chat/sessions", {
      model,
    });
    return response.data!;
  }

  async getSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get<ChatSession[]>("/chat/sessions");
    return response.data || [];
  }

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>("/chat/message", {
      sessionId,
      content,
    });
    return response.data!;
  }

  async getModels(): Promise<string[]> {
    const response = await apiClient.get<string[]>("/chat/models");
    return response.data || [];
  }
}

export default new AIService();
