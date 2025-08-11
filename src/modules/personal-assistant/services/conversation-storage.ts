import { prisma } from '@/core/database/prisma';
import { Message } from '../types';
import { cacheManager } from '@/core/database/cache-manager';

// Cache TTL constants
const CONVERSATION_CACHE_TTL = 1 * 60 * 1000; // 1 minute
const DB_TIMEOUT = 5000; // 5 seconds

export class ConversationStorage {
  private prisma = prisma;

  constructor() {
    // Use singleton prisma instance from core
  }

  // DEPRECATED: Use assistant-logging.service.ts instead
  async saveConversation(
    userId: string,
    sessionId: string,
    messages: Message[]
  ): Promise<void> {
    console.log('[ConversationStorage] DEPRECATED - Use assistant-logging.service.ts instead');
    return; // Skip saving - handled by assistant-logging.service.ts
    /*
    console.log('[ConversationStorage] Saving:', { userId, sessionId, messageCount: messages.length });
    try {
      // Find or create conversation
      let conversation = await this.prisma.assistantConversation.findUnique({
        where: {
          userId_sessionId: {
            userId,
            sessionId
          }
        }
      });

      if (!conversation) {
        // Ensure user exists
        const user = await this.prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!user) {
          console.log('[ConversationStorage] User not found, creating guest user:', userId);
          await this.prisma.user.create({
            data: {
              id: userId,
              email: `${userId}@guest.local`,
              username: userId,
              passwordHash: 'GUEST_USER',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        
        conversation = await this.prisma.assistantConversation.create({
          data: {
            id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            sessionId,
            title: messages[0]?.content.substring(0, 50) || 'New Conversation'
          }
        });
        console.log('[ConversationStorage] Created new conversation:', conversation.id);
      }

      // Get existing message IDs to avoid duplicates
      const existingMessages = await this.prisma.assistantMessage.findMany({
        where: { conversationId: conversation.id },
        select: { id: true }
      });
      const existingIds = new Set(existingMessages.map(m => m.id));
      
      // Save only new messages
      const newMessages = messages.filter(msg => !existingIds.has(msg.id));
      
      if (newMessages.length > 0) {
        await this.prisma.assistantMessage.createMany({
          data: newMessages.map(msg => ({
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversationId: conversation.id,
            content: msg.content,
            type: msg.type,
            metadata: msg.metadata || {},
            createdAt: msg.timestamp
          })),
          skipDuplicates: true
        });
      }
    } catch (error) {
      console.error('Failed to save conversation to database:', error);
      // Fallback to file storage if database fails
      await this.saveToFile(userId, sessionId, messages);
    }
    */
  }

  async loadConversation(
    userId: string,
    sessionId: string
  ): Promise<Message[]> {
    const cacheKey = `conversation:${userId}:${sessionId}`;
    
    try {
      // Use cache with timeout handling
      return await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(`[ConversationStorage] Loading messages from database for session ${sessionId}`);
          
          // Load messages directly from AssistantChatMessage table
          const messages = await this.prisma.assistantChatMessage.findMany({
            where: {
              sessionId: sessionId,  // Direct sessionId match (e.g., "session-1754819725323")
              userId: userId
            },
            orderBy: {
              timestamp: 'asc'
            }
          });

          const convertedMessages = messages.map(msg => ({
            id: msg.id,
            userId: msg.userId || userId,
            content: msg.content,
            type: msg.role as 'user' | 'assistant' | 'system',
            timestamp: msg.timestamp,
            metadata: msg.metadata as any
          }));

          console.log(`[ConversationStorage] Loaded ${convertedMessages.length} messages from AssistantChatMessage for session ${sessionId}`);
          return convertedMessages;
        },
        {
          ttl: CONVERSATION_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: [] // Return empty messages if timeout
        }
      );
    } catch (error) {
      console.error('Failed to load conversation from database:', error);
      
      // Try file storage fallback
      try {
        return await this.loadFromFile(userId, sessionId);
      } catch (fileError) {
        console.error('File storage fallback also failed:', fileError);
        return [];
      }
    }
  }

  async listSessions(userId: string): Promise<string[]> {
    const cacheKey = `sessions:list:${userId}`;
    
    try {
      // Use cache with timeout handling
      return await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(`[ConversationStorage] Loading session list for user ${userId}`);
          
          // Use AssistantChatSession instead
          const sessions = await this.prisma.assistantChatSession.findMany({
            where: {
              userId
            },
            select: {
              id: true
            },
            orderBy: {
              startedAt: 'desc'
            }
          });

          return sessions.map(session => session.id);
        },
        {
          ttl: CONVERSATION_CACHE_TTL * 2, // Sessions list cache for 2 minutes
          timeout: DB_TIMEOUT,
          fallbackValue: []
        }
      );
    } catch (error) {
      console.error('Failed to list sessions from database:', error);
      return [];
    }
  }

  async deleteConversation(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      await this.prisma.assistantConversation.updateMany({
        where: {
          userId,
          sessionId
        },
        data: {
          isActive: false,
          endedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to delete conversation from database:', error);
    }
  }

  // Fallback file storage methods
  private async saveToFile(
    userId: string,
    sessionId: string,
    messages: Message[]
  ): Promise<void> {
    // This is a fallback method - implement if needed
    console.log('Fallback: Would save to file system');
  }

  private async loadFromFile(
    userId: string,
    sessionId: string
  ): Promise<Message[]> {
    // This is a fallback method - implement if needed
    console.log('Fallback: Would load from file system');
    return [];
  }

  // Load conversation by sessionId only (any user)
  async loadConversationBySessionId(sessionId: string): Promise<Message[]> {
    try {
      // Get ALL conversations with this sessionId (might have different userIds)
      const conversations = await this.prisma.assistantConversation.findMany({
        where: {
          sessionId: sessionId
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!conversations || conversations.length === 0) {
        console.log('[ConversationStorage] No conversation found for sessionId:', sessionId);
        return [];
      }

      // Combine messages from all conversations with this sessionId
      const allMessages: Message[] = [];
      for (const conv of conversations) {
        const messages = conv.messages.map(msg => ({
          id: msg.id,
          userId: conv.userId,
          content: msg.content,
          type: msg.type as 'user' | 'assistant' | 'system',
          timestamp: msg.createdAt,
          metadata: msg.metadata as any
        }));
        allMessages.push(...messages);
      }

      // Sort by timestamp
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log('[ConversationStorage] Found', conversations.length, 'conversations with total', allMessages.length, 'messages');
      
      return allMessages;
    } catch (error) {
      console.error('Failed to load conversation by sessionId:', error);
      return [];
    }
  }

  // Cleanup method moved to end of class

  // API methods for external usage
  async getSession(sessionId: string, userId: string): Promise<any> {
    const cacheKey = `session:detail:${userId}:${sessionId}`;
    
    try {
      // Use cache with timeout handling
      return await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(`[ConversationStorage] Loading session detail for ${sessionId}`);
          
          const conversation = await this.prisma.assistantConversation.findUnique({
            where: {
              userId_sessionId: {
                userId,
                sessionId
              }
            },
            include: {
              messages: {
                orderBy: {
                  createdAt: 'asc'
                }
              }
            }
          });

          if (!conversation) {
            return null;
          }

          return {
            id: conversation.id,
            sessionId: conversation.sessionId,
            title: conversation.title,
            createdAt: conversation.startedAt,
            updatedAt: conversation.endedAt || conversation.startedAt,
            messages: conversation.messages.map(msg => ({
              role: msg.type,
              content: msg.content,
              timestamp: msg.createdAt
            }))
          };
        },
        {
          ttl: CONVERSATION_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: null
        }
      );
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async saveMessage(sessionId: string, userId: string, role: string, content: string): Promise<void> {
    try {
      // Use timeout for save operations
      await cacheManager.withCacheAndTimeout(
        `save:message:${Date.now()}`,
        async () => {
          let conversation = await this.prisma.assistantConversation.findUnique({
            where: {
              userId_sessionId: {
                userId,
                sessionId
              }
            }
          });

          if (!conversation) {
            // Ensure user exists
            const user = await this.prisma.user.findUnique({
              where: { id: userId }
            });
            
            if (!user) {
              await this.prisma.user.create({
                data: {
                  id: userId,
                  email: `${userId}@api.local`,
                  username: userId,
                  passwordHash: 'API_USER',
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
            }

            conversation = await this.prisma.assistantConversation.create({
              data: {
                id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                sessionId,
                title: content.substring(0, 50)
              }
            });
          }

          await this.prisma.assistantMessage.create({
            data: {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              conversationId: conversation.id,
              content,
              type: role,
              metadata: {},
              createdAt: new Date()
            }
          });

          return true;
        },
        {
          timeout: DB_TIMEOUT,
          skipCache: true // Don't cache save operations
        }
      );

      // Clear related caches after successful save
      this.clearUserCaches(userId, sessionId);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  async getAllSessions(userId: string): Promise<any[]> {
    const cacheKey = `sessions:all:${userId}`;
    
    try {
      // Use cache with timeout handling
      return await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(`[ConversationStorage] Loading all sessions for user ${userId}`);
          
          const conversations = await this.prisma.assistantConversation.findMany({
            where: {
              userId,
              isActive: true
            },
            include: {
              messages: {
                orderBy: {
                  createdAt: 'desc'
                },
                take: 1
              }
            },
            orderBy: {
              startedAt: 'desc'
            }
          });

          return conversations.map(conv => ({
            id: conv.id,
            sessionId: conv.sessionId,
            title: conv.title,
            createdAt: conv.startedAt,
            updatedAt: conv.endedAt || conv.startedAt,
            messages: conv.messages.map(msg => ({
              role: msg.type,
              content: msg.content,
              timestamp: msg.createdAt
            }))
          }));
        },
        {
          ttl: CONVERSATION_CACHE_TTL * 2, // All sessions cache for 2 minutes
          timeout: DB_TIMEOUT,
          fallbackValue: []
        }
      );
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      await this.deleteConversation(userId, sessionId);
      
      // Clear related caches after successful delete
      this.clearUserCaches(userId, sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  // Cache management methods
  private clearUserCaches(userId: string, sessionId?: string): void {
    try {
      // Clear conversation-specific caches
      if (sessionId) {
        cacheManager.clearByPattern(`conversation:${userId}:${sessionId}`);
        cacheManager.clearByPattern(`session:detail:${userId}:${sessionId}`);
        cacheManager.clearByPattern(`chat:.*:${userId}:${sessionId}`);
      }

      // Clear user-level caches
      cacheManager.clearByPattern(`sessions:.*:${userId}`);
      cacheManager.clearByPattern(`dashboard:.*:${userId}`);
      
      console.log(`[ConversationStorage] Cleared caches for user ${userId}${sessionId ? ` session ${sessionId}` : ''}`);
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  // Enhanced disconnect method with cache cleanup
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('[ConversationStorage] Disconnected from database');
    } catch (error) {
      console.error('[ConversationStorage] Error disconnecting from database:', error);
    }
  }

  // Health check method for monitoring
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    const start = Date.now();
    
    try {
      await cacheManager.withCacheAndTimeout(
        'health:check',
        async () => {
          await this.prisma.$queryRaw`SELECT 1`;
          return true;
        },
        {
          timeout: 2000, // 2 second timeout for health check
          skipCache: true
        }
      );

      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}