import { ClaudeService, ClaudeMessage, ClaudeResponse } from './claude.service';
import { StorageService } from './storage.service';

export interface AssistantResponse {
  message: string;
  sessionId: string;
  messageId?: string;
  duration?: number;
  error?: string;
}

export interface AssistantConfig {
  userId: string;
  sessionId?: string;
  projectId?: string;
  folderId?: string;
}

/**
 * Main Assistant Service
 * Service หลักสำหรับจัดการ AI Assistant
 */
export class AssistantService {
  private static instance: AssistantService;
  private claudeService: ClaudeService;
  private storageService: StorageService;
  
  private constructor() {
    this.claudeService = ClaudeService.getInstance();
    this.storageService = StorageService.getInstance();
  }
  
  static getInstance(): AssistantService {
    if (!AssistantService.instance) {
      AssistantService.instance = new AssistantService();
    }
    return AssistantService.instance;
  }
  
  /**
   * Process user message
   * ประมวลผลข้อความจากผู้ใช้
   */
  async processMessage(
    message: string,
    config: AssistantConfig
  ): Promise<AssistantResponse> {
    const startTime = Date.now();
    const sessionId = config.sessionId || `session-${Date.now()}`;
    
    try {
      console.log(`[Assistant] Processing message for user ${config.userId}, session ${sessionId}`);
      
      // 1. Create or get session
      const session = await this.storageService.getOrCreateSession(sessionId, {
        userId: config.userId,
        projectId: config.projectId,
        folderId: config.folderId,
        title: this.generateTitle(message)
      });
      
      // 2. Save user message
      const userMessage = await this.storageService.saveMessage({
        sessionId: session.id,
        role: 'user',
        content: message
      });
      
      // 3. Get conversation context
      const context = await this.storageService.getRecentContext(session.id, 10);
      const claudeContext: ClaudeMessage[] = context.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      // 4. Send to Claude
      console.log(`[Assistant] Sending to Claude with ${context.length} context messages`);
      const claudeResponse = await this.claudeService.sendMessage(message, claudeContext);
      
      // 5. Handle Claude response
      if (claudeResponse.error) {
        console.error('[Assistant] Claude error:', claudeResponse.error);
        
        // Save error response for tracking
        await this.storageService.saveMessage({
          sessionId: session.id,
          role: 'assistant',
          content: claudeResponse.content,
          metadata: { error: claudeResponse.error }
        });
        
        return {
          message: claudeResponse.content,
          sessionId: session.id,
          error: claudeResponse.error,
          duration: Date.now() - startTime
        };
      }
      
      // 6. Save assistant response
      const assistantMessage = await this.storageService.saveMessage({
        sessionId: session.id,
        role: 'assistant',
        content: claudeResponse.content
      });
      
      // 7. Update session title if first message
      if (context.length === 0) {
        const title = await this.generateSessionTitle(message, claudeResponse.content);
        await this.storageService.updateSessionTitle(session.id, title);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Assistant] Completed in ${duration}ms`);
      
      return {
        message: claudeResponse.content,
        sessionId: session.id,
        messageId: assistantMessage.id,
        duration
      };
      
    } catch (error: any) {
      console.error('[Assistant] Error processing message:', error);
      
      const duration = Date.now() - startTime;
      return {
        message: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง',
        sessionId,
        error: error.message,
        duration
      };
    }
  }
  
  /**
   * Get session history
   * ดึงประวัติการสนทนา
   */
  async getSessionHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<Array<{ role: string; content: string; timestamp: Date }>> {
    try {
      const messages = await this.storageService.getSessionMessages(sessionId, limit);
      return messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
    } catch (error: any) {
      console.error('[Assistant] Error getting history:', error);
      return [];
    }
  }
  
  /**
   * Get user sessions
   * ดึงรายการ session ของผู้ใช้
   */
  async getUserSessions(
    userId: string,
    limit: number = 20
  ): Promise<Array<{
    id: string;
    title: string | null;
    startedAt: Date;
    messageCount?: number;
  }>> {
    try {
      const sessions = await this.storageService.getUserSessions(userId, limit);
      
      // Get message counts for each session
      const sessionsWithCounts = await Promise.all(
        sessions.map(async (session) => {
          const messages = await this.storageService.getSessionMessages(session.id, 1000);
          return {
            id: session.id,
            title: session.title,
            startedAt: session.startedAt,
            messageCount: messages.length
          };
        })
      );
      
      return sessionsWithCounts;
    } catch (error: any) {
      console.error('[Assistant] Error getting user sessions:', error);
      return [];
    }
  }
  
  /**
   * Search sessions
   * ค้นหา session ด้วยคำค้น
   */
  async searchSessions(
    userId: string,
    keyword: string,
    limit: number = 20
  ): Promise<Array<{
    id: string;
    title: string | null;
    startedAt: Date;
    snippet?: string;
  }>> {
    try {
      const sessions = await this.storageService.searchSessions(userId, keyword, limit);
      
      // Get snippet from each session
      const sessionsWithSnippets = await Promise.all(
        sessions.map(async (session) => {
          const messages = await this.storageService.getSessionMessages(session.id, 10);
          const snippet = messages
            .find(m => m.content.toLowerCase().includes(keyword.toLowerCase()))
            ?.content.substring(0, 100) + '...';
          
          return {
            id: session.id,
            title: session.title,
            startedAt: session.startedAt,
            snippet
          };
        })
      );
      
      return sessionsWithSnippets;
    } catch (error: any) {
      console.error('[Assistant] Error searching sessions:', error);
      return [];
    }
  }
  
  /**
   * Delete session
   * ลบ session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.storageService.deleteSession(sessionId);
      return true;
    } catch (error: any) {
      console.error('[Assistant] Error deleting session:', error);
      return false;
    }
  }
  
  /**
   * Get user statistics
   * ดึงสถิติการใช้งาน
   */
  async getUserStatistics(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    lastActiveDate?: Date;
  }> {
    try {
      const stats = await this.storageService.getStatistics(userId);
      const recentSessions = await this.storageService.getUserSessions(userId, 1);
      
      return {
        ...stats,
        lastActiveDate: recentSessions[0]?.startedAt
      };
    } catch (error: any) {
      console.error('[Assistant] Error getting statistics:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0
      };
    }
  }
  
  /**
   * Clean up old sessions
   * ลบ session เก่า
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    try {
      return await this.storageService.cleanupOldSessions(daysOld);
    } catch (error: any) {
      console.error('[Assistant] Error cleaning up:', error);
      return 0;
    }
  }
  
  /**
   * Check service health
   * ตรวจสอบสถานะ service
   */
  async checkHealth(): Promise<{
    claude: boolean;
    database: boolean;
    overall: boolean;
  }> {
    try {
      // Check Claude
      const claudeStatus = await this.claudeService.checkAvailability();
      
      // Check database
      let dbStatus = false;
      try {
        await this.storageService.getStatistics('health-check');
        dbStatus = true;
      } catch {
        dbStatus = false;
      }
      
      return {
        claude: claudeStatus,
        database: dbStatus,
        overall: claudeStatus && dbStatus
      };
    } catch (error: any) {
      console.error('[Assistant] Health check error:', error);
      return {
        claude: false,
        database: false,
        overall: false
      };
    }
  }
  
  // Helper methods
  
  /**
   * Generate title from message
   * สร้างหัวข้อจากข้อความ
   */
  private generateTitle(message: string): string {
    // Take first 50 chars or until first punctuation
    const truncated = message.substring(0, 50);
    const firstPunctuation = truncated.search(/[.!?]/);
    
    if (firstPunctuation > 0) {
      return truncated.substring(0, firstPunctuation);
    }
    
    return truncated + (message.length > 50 ? '...' : '');
  }
  
  /**
   * Generate better session title using Claude
   * สร้างหัวข้อที่ดีกว่าโดยใช้ Claude
   */
  private async generateSessionTitle(
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    try {
      // For now, use simple title generation
      // In future, could ask Claude to generate a title
      return this.generateTitle(userMessage);
    } catch {
      return this.generateTitle(userMessage);
    }
  }
}