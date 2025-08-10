import { PrismaClient } from '@prisma/client';
import { prisma } from '@/core/database/prisma';

export interface AssistantSession {
  id: string;
  sessionId: string;
  title?: string;
  userId: string;
  folderId?: string;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
  metadata?: any;
  messages?: AssistantMessage[];
  _count?: {
    messages: number;
  };
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface AssistantCommand {
  id: string;
  sessionId: string;
  command: string;
  result?: string;
  exitCode?: number;
  timestamp: Date;
}

export interface AssistantStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  avgTokensPerMessage: number;
  modelUsage: Record<string, number>;
  totalSessions?: number;
  activeSessions?: number;
}

class AssistantLoggingService {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  // Create or update session
  async createSession(data: {
    sessionId: string;
    userId: string;
    projectId: string;
    sessionName?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AssistantSession> {
    try {
      const session = await this.db.assistantConversation.upsert({
        where: { 
          userId_sessionId: {
            userId: data.userId,
            sessionId: data.sessionId
          }
        },
        update: {
          endedAt: null,
          isActive: true,
        },
        create: {
          sessionId: data.sessionId,
          title: data.sessionName || `Session ${new Date().toISOString()}`,
          userId: data.userId,
          folderId: null,
          isActive: true,
          startedAt: new Date(),
          metadata: {
            model: data.model || 'gpt-3.5-turbo',
            temperature: data.temperature || 0.7,
            maxTokens: data.maxTokens || 2000,
            projectId: data.projectId || 'default'
          },
        },
        include: {
          _count: {
            select: {
              messages: true,
            }
          }
        }
      });

      return this.mapPrismaSessionToAssistantSession(session);
    } catch (error) {
      console.error('Error creating assistant session:', error);
      throw error;
    }
  }

  // Log message
  async logMessage(data: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens?: number;
    cost?: number;
  }): Promise<void> {
    try {
      // First find the conversation
      const conversation = await this.db.assistantConversation.findFirst({
        where: { sessionId: data.sessionId }
      });
      
      if (!conversation) {
        console.error('Conversation not found for sessionId:', data.sessionId);
        return;
      }

      // Store message - ensure content is a string
      const contentString = typeof data.content === 'string' 
        ? data.content 
        : JSON.stringify(data.content);
      
      await this.db.assistantMessage.create({
        data: {
          conversationId: conversation.id,
          type: data.role,
          content: contentString,
          metadata: {
            tokens: data.tokens || 0,
            cost: data.cost || 0,
          },
          createdAt: new Date(),
        }
      });

      // Update session metadata if needed
      if (data.tokens || data.cost) {
        const currentMetadata = conversation.metadata as any || {};
        await this.db.assistantConversation.update({
          where: { id: conversation.id },
          data: {
            metadata: {
              ...currentMetadata,
              totalTokensUsed: (currentMetadata.totalTokensUsed || 0) + (data.tokens || 0),
              totalCost: (currentMetadata.totalCost || 0) + (data.cost || 0),
              lastActiveAt: new Date(),
            }
          }
        });
      }
    } catch (error) {
      console.error('Error logging assistant message:', error);
      // Don't throw to avoid breaking the main flow
    }
  }

  // Get user sessions
  async getUserSessions(userId: string, projectId?: string): Promise<AssistantSession[]> {
    try {
      const sessions = await this.db.assistantConversation.findMany({
        where: {
          userId,
        },
        orderBy: { startedAt: 'desc' },
        include: {
          _count: {
            select: {
              messages: true,
            }
          }
        },
        take: 100,
      });

      return sessions.map(s => this.mapPrismaSessionToAssistantSession(s));
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  // Get session history
  async getSessionHistory(sessionId: string): Promise<AssistantMessage[]> {
    try {
      // First find the conversation
      const conversation = await this.db.assistantConversation.findFirst({
        where: { sessionId }
      });
      
      if (!conversation) {
        return [];
      }

      const messages = await this.db.assistantMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
      });

      return messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        type: m.type as 'user' | 'assistant' | 'system',
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }

  // Get project statistics
  async getProjectStats(projectId: string): Promise<AssistantStats> {
    try {
      // Filter by projectId in metadata
      const sessions = await this.db.assistantConversation.findMany({
        where: {},
        include: {
          messages: true,
        }
      });

      const stats: AssistantStats = {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        avgTokensPerMessage: 0,
        modelUsage: {},
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => {
          const metadata = s.metadata as any || {};
          return metadata.projectId === projectId && s.isActive;
        }).length,
      };

      sessions.forEach(session => {
        const metadata = session.metadata as any || {};
        
        // Only count sessions for this projectId
        if (metadata.projectId !== projectId) {
          return;
        }
        
        stats.totalTokens += metadata.totalTokensUsed || 0;
        stats.totalCost += metadata.totalCost || 0;
        stats.totalMessages += session.messages?.length || 0;
        
        // Count model usage
        if (metadata.model) {
          stats.modelUsage[metadata.model] = (stats.modelUsage[metadata.model] || 0) + 1;
        }
      });

      stats.avgTokensPerMessage = stats.totalMessages > 0 
        ? stats.totalTokens / stats.totalMessages 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error calculating project stats:', error);
      return {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        avgTokensPerMessage: 0,
        modelUsage: {},
        totalSessions: 0,
        activeSessions: 0,
      };
    }
  }

  // Clear old sessions
  async clearOldSessions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await this.db.assistantConversation.deleteMany({
        where: {
          endedAt: {
            lt: cutoffDate
          },
          isActive: false
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error clearing old sessions:', error);
      return 0;
    }
  }

  // Helper to map Prisma result to AssistantSession
  private mapPrismaSessionToAssistantSession(session: any): AssistantSession {
    return {
      id: session.id,
      sessionId: session.sessionId,
      title: session.title,
      userId: session.userId,
      folderId: session.folderId,
      isActive: session.isActive,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      metadata: session.metadata,
      _count: session._count,
    };
  }
}

// Export singleton instance
export const assistantLogger = new AssistantLoggingService();