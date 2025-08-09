import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ============================================
// WORKSPACE TERMINAL LOGGING SERVICE
// ============================================

interface TerminalSessionData {
  projectId: string;  // Required for workspace terminals
  workspaceId?: string;
  userId: string;
  type: 'bash' | 'zsh' | 'powershell' | 'cmd' | 'sh';
  tabName: string;
  currentPath: string;
  environment?: Record<string, string>;
  pid?: number;
  metadata?: any;
}

interface TerminalCommandData {
  sessionId: string;
  projectId: string;
  userId: string;
  command: string;
  workingDir: string;
  output?: string;
  errorOutput?: string;
  exitCode?: number;
  duration?: number;
}

interface TerminalLogData {
  sessionId: string;
  projectId: string;
  userId: string;
  type: 'stdin' | 'stdout' | 'stderr' | 'system';
  content: string;
  rawContent?: string;
}

export class WorkspaceTerminalLoggingService {
  private static instance: WorkspaceTerminalLoggingService;
  private sequenceMap = new Map<string, number>();
  private logQueue = new Map<string, TerminalLogData[]>();
  private commandStartTime = new Map<string, number>();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 1000; // 1 second

  private constructor() {
    this.startBatchProcessor();
  }

  static getInstance(): WorkspaceTerminalLoggingService {
    if (!WorkspaceTerminalLoggingService.instance) {
      WorkspaceTerminalLoggingService.instance = new WorkspaceTerminalLoggingService();
    }
    return WorkspaceTerminalLoggingService.instance;
  }

  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushLogBatches();
    }, this.BATCH_INTERVAL);
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  async createSession(data: TerminalSessionData) {
    try {
      const session = await prisma.workspaceTerminalSession.create({
        data: {
          id: uuidv4(),
          projectId: data.projectId,
          workspaceId: data.workspaceId,
          userId: data.userId,
          type: data.type,
          tabName: data.tabName,
          currentPath: data.currentPath,
          environment: data.environment || {},
          pid: data.pid,
          metadata: data.metadata || {},
          active: true,
          startedAt: new Date(),
        },
      });

      // Initialize sequence counter and log queue
      this.sequenceMap.set(session.id, 0);
      this.logQueue.set(session.id, []);
      
      console.log(`[WorkspaceTerminal] Created session: ${session.id} for project: ${data.projectId}, user: ${data.userId}`);
      
      // Log session creation
      await this.logEntry({
        sessionId: session.id,
        projectId: data.projectId,
        userId: data.userId,
        type: 'system',
        content: `Terminal session started in ${data.currentPath}`,
      });

      return session;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to create session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string) {
    try {
      // Get session info for final log
      const session = await prisma.workspaceTerminalSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        console.warn(`[WorkspaceTerminal] Session not found: ${sessionId}`);
        return;
      }

      // Log session end
      await this.logEntry({
        sessionId,
        projectId: session.projectId,
        userId: session.userId,
        type: 'system',
        content: 'Terminal session ended',
      });

      // Flush any remaining logs
      await this.flushSessionLogs(sessionId);
      
      // Update session
      await prisma.workspaceTerminalSession.update({
        where: { id: sessionId },
        data: {
          active: false,
          endedAt: new Date(),
        },
      });

      // Clean up
      this.sequenceMap.delete(sessionId);
      this.logQueue.delete(sessionId);
      this.commandStartTime.delete(sessionId);
      
      console.log(`[WorkspaceTerminal] Ended session: ${sessionId}`);
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to end session:', error);
      throw error;
    }
  }

  async updateSessionPath(sessionId: string, newPath: string) {
    try {
      await prisma.workspaceTerminalSession.update({
        where: { id: sessionId },
        data: { currentPath: newPath },
      });
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to update session path:', error);
    }
  }

  // ============================================
  // COMMAND LOGGING
  // ============================================

  async startCommand(sessionId: string, command: string) {
    // Store start time for duration calculation
    this.commandStartTime.set(`${sessionId}:${command}`, Date.now());
  }

  async logCommand(data: TerminalCommandData) {
    try {
      // Calculate duration if start time is available
      const startTimeKey = `${data.sessionId}:${data.command}`;
      const startTime = this.commandStartTime.get(startTimeKey);
      const duration = startTime ? Date.now() - startTime : undefined;
      
      const command = await prisma.workspaceTerminalCommand.create({
        data: {
          id: uuidv4(),
          ...data,
          duration,
          timestamp: new Date(),
        },
      });

      // Clean up start time
      this.commandStartTime.delete(startTimeKey);

      console.log(`[WorkspaceTerminal] Logged command: "${data.command}" for project: ${data.projectId}`);
      
      // Also log to detailed logs
      await this.logEntry({
        sessionId: data.sessionId,
        projectId: data.projectId,
        userId: data.userId,
        type: 'stdin',
        content: data.command,
      });

      if (data.output) {
        await this.logEntry({
          sessionId: data.sessionId,
          projectId: data.projectId,
          userId: data.userId,
          type: 'stdout',
          content: data.output,
        });
      }

      if (data.errorOutput) {
        await this.logEntry({
          sessionId: data.sessionId,
          projectId: data.projectId,
          userId: data.userId,
          type: 'stderr',
          content: data.errorOutput,
        });
      }

      return command;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to log command:', error);
      throw error;
    }
  }

  // ============================================
  // DETAILED LOGGING
  // ============================================

  async logEntry(data: TerminalLogData) {
    // Get and increment sequence number
    const sequence = this.sequenceMap.get(data.sessionId) || 0;
    this.sequenceMap.set(data.sessionId, sequence + 1);

    // Add to queue with sequence number
    const queue = this.logQueue.get(data.sessionId) || [];
    queue.push({ ...data, sequence } as any);
    this.logQueue.set(data.sessionId, queue);

    // Flush if queue is full
    if (queue.length >= this.BATCH_SIZE) {
      await this.flushSessionLogs(data.sessionId);
    }
  }

  private async flushSessionLogs(sessionId: string) {
    const logs = this.logQueue.get(sessionId);
    if (!logs || logs.length === 0) return;

    try {
      await prisma.workspaceTerminalLog.createMany({
        data: logs.map((log, index) => ({
          id: uuidv4(),
          ...log,
          sequence: (this.sequenceMap.get(sessionId) || 0) - logs.length + index,
          timestamp: new Date(),
        })),
      });

      console.log(`[WorkspaceTerminal] Flushed ${logs.length} logs for session: ${sessionId}`);
      
      // Clear queue
      this.logQueue.set(sessionId, []);
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to flush logs:', error);
    }
  }

  private async flushLogBatches() {
    for (const [sessionId, logs] of this.logQueue) {
      if (logs.length > 0) {
        await this.flushSessionLogs(sessionId);
      }
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getSessionLogs(sessionId: string, limit?: number) {
    try {
      const logs = await prisma.workspaceTerminalLog.findMany({
        where: { sessionId },
        orderBy: { sequence: 'asc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to get session logs:', error);
      throw error;
    }
  }

  async getProjectSessions(projectId: string, active?: boolean) {
    try {
      const sessions = await prisma.workspaceTerminalSession.findMany({
        where: {
          projectId,
          ...(active !== undefined ? { active } : {}),
        },
        orderBy: { startedAt: 'desc' },
        include: {
          _count: {
            select: {
              commands: true,
              logs: true,
            },
          },
        },
      });

      return sessions;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to get project sessions:', error);
      throw error;
    }
  }

  async getProjectCommands(projectId: string, limit?: number) {
    try {
      const commands = await prisma.workspaceTerminalCommand.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        take: limit || 100,
        select: {
          command: true,
          workingDir: true,
          exitCode: true,
          duration: true,
          timestamp: true,
          User: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      return commands;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to get project commands:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string) {
    try {
      const sessionCount = await prisma.workspaceTerminalSession.count({
        where: { projectId },
      });

      const commandCount = await prisma.workspaceTerminalCommand.count({
        where: { projectId },
      });

      const activeSessionCount = await prisma.workspaceTerminalSession.count({
        where: { projectId, active: true },
      });

      const errorCommands = await prisma.workspaceTerminalCommand.count({
        where: {
          projectId,
          exitCode: { not: 0 },
        },
      });

      return {
        totalSessions: sessionCount,
        activeSessions: activeSessionCount,
        totalCommands: commandCount,
        errorCommands,
        errorRate: commandCount > 0 ? (errorCommands / commandCount) * 100 : 0,
      };
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to get project stats:', error);
      throw error;
    }
  }

  // ============================================
  // REAL-TIME STREAMING
  // ============================================

  async streamOutput(sessionId: string, projectId: string, userId: string, content: string, type: 'stdout' | 'stderr' = 'stdout') {
    // For real-time output, we might want to batch less aggressively
    await this.logEntry({
      sessionId,
      projectId,
      userId,
      type,
      content,
      rawContent: content, // Preserve ANSI codes
    });
  }

  // ============================================
  // CLEANUP
  // ============================================

  async cleanup() {
    // Flush all remaining logs
    await this.flushLogBatches();
    
    // Stop batch processor
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  async cleanupOldSessions(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await prisma.workspaceTerminalSession.deleteMany({
        where: {
          active: false,
          endedAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`[WorkspaceTerminal] Cleaned up ${result.count} old sessions`);
      return result.count;
    } catch (error) {
      console.error('[WorkspaceTerminal] Failed to cleanup old sessions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const workspaceTerminalLogger = WorkspaceTerminalLoggingService.getInstance();