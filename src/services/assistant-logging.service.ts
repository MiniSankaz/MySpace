import { PrismaClient } from "@prisma/client";
import { prisma } from "@/core/database/prisma";

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
  type: "user" | "assistant" | "system";
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

  // Create or update session (optimized)
  async createSession(data: {
    sessionId: string;
    userId: string;
    projectId?: string | null;
    sessionName?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AssistantSession> {
    try {
      // Check if session exists first to avoid unnecessary upsert
      const existingSession = await this.db.assistantChatSession.findUnique({
        where: { id: data.sessionId },
        select: {
          id: true,
          sessionName: true,
          userId: true,
          startedAt: true,
          endedAt: true,
          metadata: true,
        },
      });

      if (existingSession) {
        // Just update lastActiveAt if session exists
        await this.db.assistantChatSession.update({
          where: { id: data.sessionId },
          data: { lastActiveAt: new Date(), endedAt: null },
        });

        return {
          id: existingSession.id,
          sessionId: existingSession.id,
          title: existingSession.sessionName || "Unnamed Session",
          userId: existingSession.userId,
          isActive: true,
          startedAt: existingSession.startedAt,
          endedAt: existingSession.endedAt,
          metadata: existingSession.metadata,
          _count: { messages: 0 }, // Skip count for performance
        };
      }

      // Ensure user exists first
      try {
        const existingUser = await this.db.user.findUnique({
          where: { id: data.userId },
          select: { id: true },
        });

        if (!existingUser) {
          await this.db.user.create({
            data: {
              id: data.userId,
              email: `${data.userId}@assistant.local`,
              username: data.userId.replace(/[^a-zA-Z0-9]/g, "_"),
              passwordHash: "ASSISTANT_USER",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      } catch (userError: any) {
        // User might already exist from another request
        if (userError.code !== "P2002") {
          console.warn("Failed to ensure user exists:", userError);
        }
      }

      // Create new session only if doesn't exist
      const session = await this.db.assistantChatSession.create({
        data: {
          id: data.sessionId,
          sessionName:
            data.sessionName || `Session ${new Date().toISOString()}`,
          userId: data.userId,
          projectId: data.projectId || null,
          model: data.model || "claude-direct",
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 4096,
          totalTokensUsed: 0,
          totalCost: 0,
          metadata: { source: "assistant-api" },
          startedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      return {
        id: session.id,
        sessionId: session.id,
        title: session.sessionName || "Unnamed Session",
        userId: session.userId,
        isActive: true,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        metadata: session.metadata,
        _count: {
          messages: 0, // New session has no messages yet
        },
      };
    } catch (error) {
      console.error("Error creating assistant session:", error);
      throw error;
    }
  }

  // Log message with guaranteed session-first creation
  async logMessage(data: {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    tokens?: number;
    cost?: number;
    userId?: string;
    projectId?: string;
  }): Promise<void> {
    try {
      // Ensure we have required data
      if (!data.userId) {
        console.warn("Cannot log message without userId");
        return;
      }

      const contentString =
        typeof data.content === "string"
          ? data.content
          : JSON.stringify(data.content);

      // Use separate transaction with proper error handling
      await this.db.$transaction(async (tx) => {
        // ALWAYS ensure session exists first
        let sessionExists = false;
        try {
          const existingSession = await tx.assistantChatSession.findUnique({
            where: { id: data.sessionId },
            select: { id: true },
          });
          sessionExists = !!existingSession;
        } catch (checkError) {
          // If we can't check, assume it doesn't exist
          sessionExists = false;
        }

        // Create session if it doesn't exist
        if (!sessionExists) {
          try {
            // First ensure the user exists
            let userExists = false;
            try {
              const existingUser = await tx.user.findUnique({
                where: { id: data.userId },
                select: { id: true },
              });
              userExists = !!existingUser;
            } catch (userCheckError) {
              userExists = false;
            }

            // Create user if doesn't exist (for API/guest users)
            if (!userExists) {
              try {
                await tx.user.create({
                  data: {
                    id: data.userId,
                    email: `${data.userId}@assistant.local`,
                    username: data.userId.replace(/[^a-zA-Z0-9]/g, "_"),
                    passwordHash: "ASSISTANT_USER",
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
              } catch (userCreateError: any) {
                // User might have been created by another request
                if (userCreateError.code !== "P2002") {
                  console.warn(
                    "Failed to create user for assistant session:",
                    userCreateError,
                  );
                }
              }
            }

            // Now create the session
            await tx.assistantChatSession.create({
              data: {
                id: data.sessionId,
                sessionName: `Session ${new Date().toISOString()}`,
                userId: data.userId,
                projectId: data.projectId || null,
                model: "claude-direct",
                temperature: 0.7,
                maxTokens: 4096,
                totalTokensUsed: data.tokens || 0,
                totalCost: data.cost || 0,
                metadata: { source: "assistant-api" },
                startedAt: new Date(),
                lastActiveAt: new Date(),
              },
            });
          } catch (createError: any) {
            // Session might have been created by another request - that's ok
            if (createError.code !== "P2002") {
              // Not a unique constraint error
              console.warn("Failed to create assistant session:", createError);
              // Don't throw - we'll continue with message creation attempt
            }
          }
        }

        // Now create the message (session definitely exists)
        await tx.assistantChatMessage.create({
          data: {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: data.sessionId,
            userId: data.userId,
            projectId: data.projectId || null,
            role: data.role,
            content: contentString,
            model: "claude-direct",
            tokensUsed: data.tokens || null,
            cost: data.cost || null,
            timestamp: new Date(),
          },
        });

        // Update session stats if we have tokens/cost
        if (data.tokens || data.cost) {
          await tx.assistantChatSession.updateMany({
            where: { id: data.sessionId },
            data: {
              totalTokensUsed: { increment: data.tokens || 0 },
              totalCost: { increment: data.cost || 0 },
              lastActiveAt: new Date(),
            },
          });
        }
      });
    } catch (error) {
      console.error("Error logging assistant message:", error);
      // Don't throw to avoid breaking the main flow
    }
  }

  // Get user sessions
  async getUserSessions(
    userId: string,
    projectId?: string,
  ): Promise<AssistantSession[]> {
    try {
      const sessions = await this.db.assistantChatSession.findMany({
        where: {
          userId,
          ...(projectId && { projectId }),
        },
        orderBy: { startedAt: "desc" },
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
        take: 100,
      });

      return sessions.map((s) => ({
        id: s.id,
        sessionId: s.id, // Use same ID for consistency
        title: s.sessionName,
        userId: s.userId,
        folderId: null, // Not used in new schema
        isActive: !s.endedAt,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        metadata: s.metadata,
        _count: s._count,
      }));
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      return [];
    }
  }

  // Get session history
  async getSessionHistory(sessionId: string): Promise<AssistantMessage[]> {
    try {
      // Use NEW AssistantChatMessage table directly
      const messages = await this.db.assistantChatMessage.findMany({
        where: { sessionId: sessionId },
        orderBy: { timestamp: "asc" },
      });

      return messages.map((m) => ({
        id: m.id,
        conversationId: m.sessionId, // Use sessionId as conversationId for compatibility
        type: m.role as "user" | "assistant" | "system",
        content: m.content,
        metadata: m.metadata,
        createdAt: m.timestamp,
      }));
    } catch (error) {
      console.error("Error fetching session history:", error);
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
        },
      });

      const stats: AssistantStats = {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        avgTokensPerMessage: 0,
        modelUsage: {},
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => {
          const metadata = (s.metadata as any) || {};
          return metadata.projectId === projectId && s.isActive;
        }).length,
      };

      sessions.forEach((session) => {
        const metadata = (session.metadata as any) || {};

        // Only count sessions for this projectId
        if (metadata.projectId !== projectId) {
          return;
        }

        stats.totalTokens += metadata.totalTokensUsed || 0;
        stats.totalCost += metadata.totalCost || 0;
        stats.totalMessages += session.messages?.length || 0;

        // Count model usage
        if (metadata.model) {
          stats.modelUsage[metadata.model] =
            (stats.modelUsage[metadata.model] || 0) + 1;
        }
      });

      stats.avgTokensPerMessage =
        stats.totalMessages > 0 ? stats.totalTokens / stats.totalMessages : 0;

      return stats;
    } catch (error) {
      console.error("Error calculating project stats:", error);
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
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );

      const result = await this.db.assistantConversation.deleteMany({
        where: {
          endedAt: {
            lt: cutoffDate,
          },
          isActive: false,
        },
      });

      return result.count;
    } catch (error) {
      console.error("Error clearing old sessions:", error);
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
