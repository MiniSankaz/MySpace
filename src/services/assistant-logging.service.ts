import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ============================================
// AI ASSISTANT LOGGING SERVICE
// ============================================

interface AssistantSessionData {
  userId: string;
  projectId?: string;
  sessionName?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: any;
}

interface AssistantMessageData {
  sessionId: string;
  userId?: string;
  projectId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokensUsed?: number;
  cost?: number;
  latency?: number;
  metadata?: any;
}

interface AssistantCommandData {
  sessionId: string;
  messageId?: string;
  projectId?: string;
  command: string;
  type: 'terminal' | 'file_edit' | 'file_create' | 'file_delete' | 'other';
  status?: 'pending' | 'executed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  metadata?: any;
}

interface AssistantFileData {
  sessionId: string;
  projectId?: string;
  filePath: string;
  action: 'created' | 'modified' | 'deleted' | 'read';
  content?: string;
  diff?: string;
  metadata?: any;
}

export class AssistantLoggingService {
  private static instance: AssistantLoggingService;
  private messageQueue: Map<string, AssistantMessageData[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 20;
  private readonly BATCH_INTERVAL = 2000; // 2 seconds

  private constructor() {
    this.startBatchProcessor();
  }

  static getInstance(): AssistantLoggingService {
    if (!AssistantLoggingService.instance) {
      AssistantLoggingService.instance = new AssistantLoggingService();
    }
    return AssistantLoggingService.instance;
  }

  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushMessageBatches();
    }, this.BATCH_INTERVAL);
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  async getSession(sessionId: string) {
    try {
      const session = await prisma.assistantChatSession.findUnique({
        where: { id: sessionId }
      });
      return session;
    } catch (error) {
      console.error('[AssistantLog] Failed to get session:', error);
      return null;
    }
  }

  async createSession(data: AssistantSessionData) {
    try {
      const session = await prisma.assistantChatSession.create({
        data: {
          id: uuidv4(),
          userId: data.userId,
          projectId: data.projectId,
          sessionName: data.sessionName,
          model: data.model || 'claude-3-opus',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 4096,
          metadata: data.metadata || {},
        },
      });

      // Initialize message queue for this session
      this.messageQueue.set(session.id, []);
      
      console.log(`[AssistantLog] Created session: ${session.id} for user: ${data.userId}, project: ${data.projectId || 'none'}`);
      return session;
    } catch (error) {
      console.error('[AssistantLog] Failed to create session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string) {
    try {
      // Flush any remaining messages
      await this.flushSessionMessages(sessionId);
      
      // Update session
      const session = await prisma.assistantChatSession.update({
        where: { id: sessionId },
        data: {
          endedAt: new Date(),
        },
      });

      // Clean up queue
      this.messageQueue.delete(sessionId);
      
      console.log(`[AssistantLog] Ended session: ${sessionId}`);
      return session;
    } catch (error) {
      console.error('[AssistantLog] Failed to end session:', error);
      throw error;
    }
  }

  async updateSessionStats(sessionId: string, tokensUsed: number, cost: number) {
    try {
      await prisma.assistantChatSession.update({
        where: { id: sessionId },
        data: {
          totalTokensUsed: { increment: tokensUsed },
          totalCost: { increment: cost },
        },
      });
    } catch (error) {
      console.error('[AssistantLog] Failed to update session stats:', error);
    }
  }

  // ============================================
  // MESSAGE LOGGING
  // ============================================

  async logMessage(data: AssistantMessageData) {
    // Add to queue for batch processing
    const queue = this.messageQueue.get(data.sessionId) || [];
    queue.push(data);
    this.messageQueue.set(data.sessionId, queue);

    // Flush if queue is full
    if (queue.length >= this.BATCH_SIZE) {
      await this.flushSessionMessages(data.sessionId);
    }

    // Update session stats if assistant message
    if (data.role === 'assistant' && data.tokensUsed && data.cost) {
      await this.updateSessionStats(data.sessionId, data.tokensUsed, data.cost);
    }
  }

  private async flushSessionMessages(sessionId: string) {
    const messages = this.messageQueue.get(sessionId);
    if (!messages || messages.length === 0) return;

    try {
      // Check if session exists before flushing
      const sessionExists = await prisma.assistantChatSession.findUnique({
        where: { id: sessionId }
      });

      if (!sessionExists) {
        console.warn(`[AssistantLog] Session ${sessionId} not found, creating new session before flushing messages`);
        
        // Extract userId from first message or use default
        const firstMessage = messages[0];
        const userId = firstMessage.userId || 'system';
        
        // Create a new session
        await prisma.assistantChatSession.create({
          data: {
            id: sessionId,
            userId: userId,
            model: 'claude-3-sonnet',
            temperature: 0.7,
            maxTokens: 4096,
            totalTokensUsed: 0,
            totalCost: 0,
            createdAt: new Date(),
          }
        });
      }

      await prisma.assistantChatMessage.createMany({
        data: messages.map(msg => ({
          id: uuidv4(),
          ...msg,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date(),
        })),
      });

      console.log(`[AssistantLog] Flushed ${messages.length} messages for session: ${sessionId}`);
      
      // Clear queue
      this.messageQueue.set(sessionId, []);
    } catch (error) {
      console.error('[AssistantLog] Failed to flush messages:', error);
      // Clear problematic messages to prevent repeated errors
      this.messageQueue.set(sessionId, []);
    }
  }

  private async flushMessageBatches() {
    for (const [sessionId, messages] of this.messageQueue) {
      if (messages.length > 0) {
        await this.flushSessionMessages(sessionId);
      }
    }
  }

  // ============================================
  // COMMAND LOGGING
  // ============================================

  async logCommand(data: AssistantCommandData) {
    try {
      const command = await prisma.assistantCommand.create({
        data: {
          id: uuidv4(),
          ...data,
          status: data.status || 'pending',
          createdAt: new Date(),
        },
      });

      console.log(`[AssistantLog] Logged command: ${data.type} for session: ${data.sessionId}`);
      return command;
    } catch (error) {
      console.error('[AssistantLog] Failed to log command:', error);
      throw error;
    }
  }

  async updateCommandStatus(
    commandId: string,
    status: 'executed' | 'failed' | 'skipped',
    output?: string,
    error?: string
  ) {
    try {
      await prisma.assistantCommand.update({
        where: { id: commandId },
        data: {
          status,
          output,
          error,
          executedAt: status === 'executed' ? new Date() : undefined,
        },
      });

      console.log(`[AssistantLog] Updated command ${commandId} status to: ${status}`);
    } catch (error) {
      console.error('[AssistantLog] Failed to update command status:', error);
    }
  }

  // ============================================
  // FILE LOGGING
  // ============================================

  async logFileOperation(data: AssistantFileData) {
    try {
      const file = await prisma.assistantFile.create({
        data: {
          id: uuidv4(),
          ...data,
          timestamp: new Date(),
        },
      });

      console.log(`[AssistantLog] Logged file operation: ${data.action} on ${data.filePath}`);
      return file;
    } catch (error) {
      console.error('[AssistantLog] Failed to log file operation:', error);
      throw error;
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async updateDailyAnalytics(userId: string, projectId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const existing = await prisma.assistantAnalytics.findUnique({
        where: {
          userId_projectId_date: {
            userId,
            projectId: projectId || '',
            date: today,
          },
        },
      });

      if (existing) {
        // Update existing record
        await prisma.assistantAnalytics.update({
          where: { id: existing.id },
          data: {
            messagesCount: { increment: 1 },
            // Other stats will be updated by triggers or separate processes
          },
        });
      } else {
        // Create new record
        await prisma.assistantAnalytics.create({
          data: {
            id: uuidv4(),
            userId,
            projectId,
            date: today,
            messagesCount: 1,
          },
        });
      }
    } catch (error) {
      console.error('[AssistantLog] Failed to update analytics:', error);
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getSessionHistory(sessionId: string) {
    try {
      const messages = await prisma.assistantChatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });

      return messages;
    } catch (error) {
      console.error('[AssistantLog] Failed to get session history:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string, projectId?: string) {
    try {
      const sessions = await prisma.assistantChatSession.findMany({
        where: {
          userId,
          projectId,
          endedAt: null, // Only active sessions
        },
        orderBy: { lastActiveAt: 'desc' },
        include: {
          _count: {
            select: {
              messages: true,
              commands: true,
            },
          },
        },
      });

      return sessions;
    } catch (error) {
      console.error('[AssistantLog] Failed to get user sessions:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string) {
    try {
      const stats = await prisma.assistantChatSession.aggregate({
        where: { projectId },
        _sum: {
          totalTokensUsed: true,
          totalCost: true,
        },
        _count: {
          id: true,
        },
      });

      const commandStats = await prisma.assistantCommand.groupBy({
        by: ['status'],
        where: { projectId },
        _count: {
          id: true,
        },
      });

      return {
        sessions: stats._count.id,
        totalTokens: stats._sum.totalTokensUsed || 0,
        totalCost: stats._sum.totalCost || 0,
        commands: commandStats,
      };
    } catch (error) {
      console.error('[AssistantLog] Failed to get project stats:', error);
      throw error;
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  async cleanup() {
    // Flush all remaining messages
    await this.flushMessageBatches();
    
    // Stop batch processor
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// Export singleton instance
export const assistantLogger = AssistantLoggingService.getInstance();