import { PrismaClient } from "@prisma/client";
import {
  ChatSession,
  ChatMessage,
  ChatFolder,
  ApiResponse,
  PaginatedResponse,
} from "../types";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

export class ConversationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
    });
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<void> {
    // Use a simple query that doesn't depend on specific tables
    await this.prisma.$queryRaw`SELECT 1 as health_check`;
  }

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    title: string,
    folderId?: string,
  ): Promise<ChatSession> {
    try {
      const session = await this.prisma.chatSession.create({
        data: {
          id: uuidv4(),
          userId,
          title,
          folderId,
          isActive: true,
          model: "claude-3-sonnet-20240229",
          lastActiveAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });

      logger.info(`Chat session created: ${session.id} for user: ${userId}`);

      return {
        ...session,
        messages: session.messages || [],
      };
    } catch (error: any) {
      logger.error("Failed to create chat session:", error);
      throw new Error(`Failed to create chat session: ${error.message}`);
    }
  }

  /**
   * Get a chat session by ID
   */
  async getSession(
    sessionId: string,
    userId: string,
  ): Promise<ChatSession | null> {
    try {
      const session = await this.prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });

      if (!session) {
        logger.warn(`Chat session not found: ${sessionId} for user: ${userId}`);
        return null;
      }

      return {
        ...session,
        messages: session.messages || [],
      };
    } catch (error: any) {
      logger.error("Failed to get chat session:", error);
      throw new Error(`Failed to get chat session: ${error.message}`);
    }
  }

  /**
   * Get user's chat sessions
   */
  async getUserSessions(
    userId: string,
    folderId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<ChatSession>> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        userId,
        isActive: true,
      };

      if (folderId) {
        where.folderId = folderId;
      }

      const [sessions, total] = await Promise.all([
        this.prisma.chatSession.findMany({
          where,
          include: {
            messages: {
              orderBy: { timestamp: "desc" },
              take: 1, // Only get the last message for preview
            },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
        }),
        this.prisma.chatSession.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: sessions.map((session: any) => ({
          ...session,
          messages: session.messages || [],
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error: any) {
      logger.error("Failed to get user sessions:", error);
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    userId: string,
    message: Omit<ChatMessage, "id">,
  ): Promise<ChatMessage> {
    try {
      // Verify session belongs to user
      const session = await this.prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      const newMessage = await this.prisma.chatMessage.create({
        data: {
          id: uuidv4(),
          sessionId,
          role: message.role,
          content: message.content,
          metadata: message.metadata ? JSON.stringify(message.metadata) : null,
          timestamp: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update session's lastMessageAt
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.debug(`Message added to session ${sessionId}:`, {
        role: message.role,
        contentLength: message.content.length,
      });

      return {
        ...newMessage,
        metadata: newMessage.metadata
          ? JSON.parse(newMessage.metadata as string)
          : undefined,
        timestamp: newMessage.timestamp,
      };
    } catch (error: any) {
      logger.error("Failed to add message:", error);
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(
    sessionId: string,
    userId: string,
    title: string,
  ): Promise<ChatSession> {
    try {
      const session = await this.prisma.chatSession.updateMany({
        where: {
          id: sessionId,
          userId,
        },
        data: {
          title,
          updatedAt: new Date(),
        },
      });

      if (session.count === 0) {
        throw new Error("Session not found or access denied");
      }

      const updatedSession = await this.getSession(sessionId, userId);
      if (!updatedSession) {
        throw new Error("Failed to retrieve updated session");
      }

      logger.info(`Session title updated: ${sessionId} to "${title}"`);
      return updatedSession;
    } catch (error: any) {
      logger.error("Failed to update session title:", error);
      throw new Error(`Failed to update session title: ${error.message}`);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      const result = await this.prisma.chatSession.updateMany({
        where: {
          id: sessionId,
          userId,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error("Session not found or access denied");
      }

      logger.info(`Session deleted: ${sessionId}`);
    } catch (error: any) {
      logger.error("Failed to delete session:", error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Create chat folder
   */
  async createFolder(
    userId: string,
    name: string,
    description?: string,
    color?: string,
  ): Promise<ChatFolder> {
    try {
      const folder = await this.prisma.chatFolder.create({
        data: {
          id: uuidv4(),
          userId,
          name,
          description,
          color,
          isDefault: false,
          sessionCount: 0,
          timestamp: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info(`Chat folder created: ${folder.id} for user: ${userId}`);
      return folder;
    } catch (error: any) {
      logger.error("Failed to create folder:", error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Get user's folders
   */
  async getUserFolders(userId: string): Promise<ChatFolder[]> {
    try {
      const folders = await this.prisma.chatFolder.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      // Update session counts
      for (const folder of folders) {
        const count = await this.prisma.chatSession.count({
          where: {
            userId,
            folderId: folder.id,
            isActive: true,
          },
        });

        if (count !== folder.sessionCount) {
          await this.prisma.chatFolder.update({
            where: { id: folder.id },
            data: { sessionCount: count },
          });
          folder.sessionCount = count;
        }
      }

      return folders;
    } catch (error: any) {
      logger.error("Failed to get folders:", error);
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  /**
   * Update folder
   */
  async updateFolder(
    folderId: string,
    userId: string,
    updates: Partial<Pick<ChatFolder, "name" | "description" | "color">>,
  ): Promise<ChatFolder> {
    try {
      const result = await this.prisma.chatFolder.updateMany({
        where: {
          id: folderId,
          userId,
        },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error("Folder not found or access denied");
      }

      const folder = await this.prisma.chatFolder.findFirst({
        where: { id: folderId, userId },
      });

      if (!folder) {
        throw new Error("Failed to retrieve updated folder");
      }

      logger.info(`Folder updated: ${folderId}`);
      return folder;
    } catch (error: any) {
      logger.error("Failed to update folder:", error);
      throw new Error(`Failed to update folder: ${error.message}`);
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(folderId: string, userId: string): Promise<void> {
    try {
      // Check if folder exists and is not default
      const folder = await this.prisma.chatFolder.findFirst({
        where: {
          id: folderId,
          userId,
        },
      });

      if (!folder) {
        throw new Error("Folder not found or access denied");
      }

      if (folder.isDefault) {
        throw new Error("Cannot delete default folder");
      }

      // Move sessions to default folder
      const defaultFolder = await this.prisma.chatFolder.findFirst({
        where: {
          userId,
          isDefault: true,
        },
      });

      if (defaultFolder) {
        await this.prisma.chatSession.updateMany({
          where: {
            folderId,
            userId,
          },
          data: {
            folderId: defaultFolder.id,
          },
        });
      } else {
        // No default folder, set to null
        await this.prisma.chatSession.updateMany({
          where: {
            folderId,
            userId,
          },
          data: {
            folderId: null,
          },
        });
      }

      // Delete the folder
      await this.prisma.chatFolder.delete({
        where: { id: folderId },
      });

      logger.info(`Folder deleted: ${folderId}`);
    } catch (error: any) {
      logger.error("Failed to delete folder:", error);
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    query: string,
    sessionId?: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    try {
      const where: any = {
        session: {
          userId,
          isActive: true,
        },
        content: {
          contains: query,
          mode: "insensitive",
        },
      };

      if (sessionId) {
        where.sessionId = sessionId;
      }

      const messages = await this.prisma.chatMessage.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return messages.map((msg: any) => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata as string) : undefined,
        timestamp: msg.timestamp,
      }));
    } catch (error: any) {
      logger.error("Failed to search messages:", error);
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    sessionId: string,
    userId: string,
  ): Promise<{
    messageCount: number;
    totalTokens: number;
    firstMessageAt?: Date;
    lastMessageAt?: Date;
  }> {
    try {
      const session = await this.prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          messages: true,
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      const messages = session.messages || [];
      let totalTokens = 0;

      messages.forEach((msg: any) => {
        if (msg.metadata) {
          try {
            const metadata = JSON.parse(msg.metadata as string);
            if (metadata.tokens) {
              totalTokens += metadata.tokens;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      });

      return {
        messageCount: messages.length,
        totalTokens,
        firstMessageAt: messages[0]?.timestamp,
        lastMessageAt: messages[messages.length - 1]?.timestamp,
      };
    } catch (error: any) {
      logger.error("Failed to get session stats:", error);
      throw new Error(`Failed to get session stats: ${error.message}`);
    }
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.chatSession.updateMany({
        where: {
          lastMessageAt: {
            lt: cutoffDate,
          },
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(
        `Cleaned up ${result.count} old sessions older than ${olderThanDays} days`,
      );
      return result.count;
    } catch (error: any) {
      logger.error("Failed to cleanup old sessions:", error);
      throw new Error(`Failed to cleanup old sessions: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
