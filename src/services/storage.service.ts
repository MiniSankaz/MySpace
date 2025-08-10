import { PrismaClient } from '@prisma/client';
import type { AssistantChatSession, AssistantChatMessage } from '@prisma/client';

export interface SessionData {
  id: string;
  userId: string;
  title?: string | null;
  folderId?: string | null;
  projectId?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  metadata?: any;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface CreateSessionInput {
  userId: string;
  title?: string;
  folderId?: string;
  projectId?: string;
  metadata?: any;
}

export interface CreateMessageInput {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

/**
 * Storage Service for AI Assistant
 * จัดการการบันทึกและดึงข้อมูลการสนทนาจาก database
 */
export class StorageService {
  private static instance: StorageService;
  private prisma: PrismaClient;
  
  private constructor() {
    this.prisma = new PrismaClient();
  }
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }
  
  /**
   * Create or get session
   * สร้างหรือดึง session ที่มีอยู่
   */
  async getOrCreateSession(
    sessionId: string,
    input: CreateSessionInput
  ): Promise<SessionData> {
    try {
      // Try to find existing session
      const existing = await this.prisma.assistantChatSession.findUnique({
        where: { id: sessionId }
      });
      
      if (existing) {
        return this.mapSession(existing);
      }
      
      // Create new session
      const session = await this.prisma.assistantChatSession.create({
        data: {
          id: sessionId,
          userId: input.userId,
          sessionName: input.title || 'New Chat',
          model: 'claude-3', // Required field
          projectId: input.projectId || null, // Use null instead of 'default'
          metadata: input.metadata || {}
        }
      });
      
      console.log(`[Storage] Created new session: ${sessionId}`);
      return this.mapSession(session);
      
    } catch (error: any) {
      console.error('[Storage] Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }
  
  /**
   * Get session by ID
   * ดึงข้อมูล session ตาม ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.prisma.assistantChatSession.findUnique({
        where: { id: sessionId }
      });
      
      return session ? this.mapSession(session) : null;
    } catch (error: any) {
      console.error('[Storage] Error getting session:', error);
      return null;
    }
  }
  
  /**
   * Get user sessions
   * ดึงรายการ session ทั้งหมดของ user
   */
  async getUserSessions(
    userId: string,
    limit: number = 20
  ): Promise<SessionData[]> {
    try {
      const sessions = await this.prisma.assistantChatSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: limit
      });
      
      return sessions.map(s => this.mapSession(s));
    } catch (error: any) {
      console.error('[Storage] Error getting user sessions:', error);
      return [];
    }
  }
  
  /**
   * Save message to session
   * บันทึกข้อความลง session
   */
  async saveMessage(input: CreateMessageInput): Promise<MessageData> {
    try {
      const message = await this.prisma.assistantChatMessage.create({
        data: {
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          projectId: null, // Always use null for projectId
          metadata: input.metadata || {}
        }
      });
      
      console.log(`[Storage] Saved ${input.role} message to session ${input.sessionId}`);
      return this.mapMessage(message);
      
    } catch (error: any) {
      console.error('[Storage] Error saving message:', error);
      throw new Error(`Failed to save message: ${error.message}`);
    }
  }
  
  /**
   * Get session messages
   * ดึงข้อความทั้งหมดใน session
   */
  async getSessionMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<MessageData[]> {
    try {
      const messages = await this.prisma.assistantChatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        take: limit
      });
      
      return messages.map(m => this.mapMessage(m));
    } catch (error: any) {
      console.error('[Storage] Error getting messages:', error);
      return [];
    }
  }
  
  /**
   * Get recent context for session
   * ดึง context ล่าสุดสำหรับการสนทนา
   */
  async getRecentContext(
    sessionId: string,
    limit: number = 10
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const messages = await this.prisma.assistantChatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          role: true,
          content: true
        }
      });
      
      // Reverse to get chronological order
      return messages.reverse();
    } catch (error: any) {
      console.error('[Storage] Error getting context:', error);
      return [];
    }
  }
  
  /**
   * Update session title
   * อัพเดทหัวข้อของ session
   */
  async updateSessionTitle(
    sessionId: string,
    title: string
  ): Promise<void> {
    try {
      await this.prisma.assistantChatSession.update({
        where: { id: sessionId },
        data: { sessionName: title } // Changed from 'title' to 'sessionName'
      });
      
      console.log(`[Storage] Updated session title: ${sessionId}`);
    } catch (error: any) {
      console.error('[Storage] Error updating title:', error);
    }
  }
  
  /**
   * Delete session and all messages
   * ลบ session และข้อความทั้งหมด
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete all messages first
      await this.prisma.assistantChatMessage.deleteMany({
        where: { sessionId }
      });
      
      // Then delete session
      await this.prisma.assistantChatSession.delete({
        where: { id: sessionId }
      });
      
      console.log(`[Storage] Deleted session: ${sessionId}`);
    } catch (error: any) {
      console.error('[Storage] Error deleting session:', error);
    }
  }
  
  /**
   * Search sessions by keyword
   * ค้นหา session ด้วยคำค้น
   */
  async searchSessions(
    userId: string,
    keyword: string,
    limit: number = 20
  ): Promise<SessionData[]> {
    try {
      const sessions = await this.prisma.assistantChatSession.findMany({
        where: {
          userId,
          OR: [
            { sessionName: { contains: keyword, mode: 'insensitive' } }, // Changed from 'title' to 'sessionName'
            {
              messages: {
                some: {
                  content: { contains: keyword, mode: 'insensitive' }
                }
              }
            }
          ]
        },
        orderBy: { startedAt: 'desc' },
        take: limit
      });
      
      return sessions.map(s => this.mapSession(s));
    } catch (error: any) {
      console.error('[Storage] Error searching sessions:', error);
      return [];
    }
  }
  
  /**
   * Get statistics
   * ดึงสถิติการใช้งาน
   */
  async getStatistics(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
  }> {
    try {
      const [sessionCount, messageCount] = await Promise.all([
        this.prisma.assistantChatSession.count({
          where: { userId }
        }),
        this.prisma.assistantChatMessage.count({
          where: {
            session: { userId }
          }
        })
      ]);
      
      return {
        totalSessions: sessionCount,
        totalMessages: messageCount,
        avgMessagesPerSession: sessionCount > 0 ? Math.round(messageCount / sessionCount) : 0
      };
    } catch (error: any) {
      console.error('[Storage] Error getting statistics:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0
      };
    }
  }
  
  /**
   * Clean up old sessions
   * ลบ session เก่าที่ไม่ได้ใช้งาน
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.prisma.assistantChatSession.deleteMany({
        where: {
          startedAt: { lt: cutoffDate },
          messages: { none: {} } // Only delete if no messages
        }
      });
      
      console.log(`[Storage] Cleaned up ${result.count} old sessions`);
      return result.count;
    } catch (error: any) {
      console.error('[Storage] Error cleaning up:', error);
      return 0;
    }
  }
  
  // Helper methods
  private mapSession(session: AssistantChatSession): SessionData {
    return {
      id: session.id,
      userId: session.userId,
      title: session.sessionName, // Changed from 'title' to 'sessionName'
      folderId: null, // Not in current schema
      projectId: session.projectId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      metadata: session.metadata
    };
  }
  
  private mapMessage(message: AssistantChatMessage): MessageData {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata
    };
  }
  
  /**
   * Disconnect Prisma client
   * ปิดการเชื่อมต่อ database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}