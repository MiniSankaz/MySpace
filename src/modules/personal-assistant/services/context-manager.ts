import { AssistantContext, UserData, Message } from "../types";
import { ConversationStorage } from "./conversation-storage";

export class ContextManager {
  private contexts: Map<string, AssistantContext> = new Map();
  private userDataCache: Map<string, UserData> = new Map();
  private storage: ConversationStorage;

  constructor() {
    this.storage = new ConversationStorage();
  }

  async getContext(
    userId: string,
    sessionId: string,
  ): Promise<AssistantContext> {
    const key = `${userId}-${sessionId}`;

    if (this.contexts.has(key)) {
      return this.contexts.get(key)!;
    }

    // Try to load from storage first
    const savedMessages = await this.storage.loadConversation(
      userId,
      sessionId,
    );

    const userData = await this.getUserData(userId);
    const context: AssistantContext = {
      userId,
      sessionId,
      conversation: savedMessages,
      userData,
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
      },
    };

    this.contexts.set(key, context);
    return context;
  }

  async saveContext(context: AssistantContext): Promise<void> {
    const key = `${context.userId}-${context.sessionId}`;
    context.metadata = {
      ...context.metadata,
      lastActivity: new Date(),
    };
    this.contexts.set(key, context);

    // Persist to storage
    await this.storage.saveConversation(
      context.userId,
      context.sessionId,
      context.conversation,
    );
  }

  async getUserData(userId: string): Promise<UserData> {
    if (this.userDataCache.has(userId)) {
      return this.userDataCache.get(userId)!;
    }

    // In production, this would fetch from database
    // For now, return default user data
    const userData: UserData = {
      preferences: {
        language: "en",
        timezone: "UTC",
        theme: "auto",
        notifications: true,
      },
      history: [],
      tasks: [],
      reminders: [],
      notes: [],
    };

    this.userDataCache.set(userId, userData);
    return userData;
  }

  async updateUserData(userId: string, data: Partial<UserData>): Promise<void> {
    const currentData = await this.getUserData(userId);
    const updatedData = { ...currentData, ...data };
    this.userDataCache.set(userId, updatedData);

    // In production, this would persist to database
  }

  clearSession(userId: string, sessionId: string): void {
    const key = `${userId}-${sessionId}`;
    this.contexts.delete(key);
  }

  getAllSessions(userId: string): AssistantContext[] {
    const sessions: AssistantContext[] = [];
    this.contexts.forEach((context, key) => {
      if (key.startsWith(`${userId}-`)) {
        sessions.push(context);
      }
    });
    return sessions;
  }

  async getConversationBySessionId(sessionId: string): Promise<Message[]> {
    // Load messages directly from storage by sessionId only
    return await this.storage.loadConversationBySessionId(sessionId);
  }
}
