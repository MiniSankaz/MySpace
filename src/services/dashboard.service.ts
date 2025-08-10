import { PrismaClient } from '@prisma/client';
import { prisma } from '@/core/database/prisma';

export interface DashboardStats {
  user: {
    totalSessions: number;
    todayActivity: number;
    lastLogin: Date | null;
    activeProjects: number;
  };
  aiAssistant: {
    totalConversations: number;
    activeConversations: number;
    tokensUsed: number;
    totalCost: number;
    averageResponseTime: number;
    popularCommands: Array<{command: string; count: number}>;
  };
  terminal: {
    totalSessions: number;
    commandsExecuted: number;
    errorRate: number;
    averageExecutionTime: number;
  };
  system: {
    uptime: number;
    databaseHealth: 'healthy' | 'warning' | 'critical';
    memoryUsage: number;
    activeConnections: number;
    lastBackup: Date | null;
  };
  recentActivity: Array<{
    id: string;
    type: 'ai_chat' | 'terminal' | 'file_change' | 'git_commit' | 'system';
    description: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
    metadata?: any;
  }>;
}

class DashboardService {
  private db: PrismaClient;
  private static instance: DashboardService;
  private healthCheckCache: { 
    status: 'healthy' | 'warning' | 'critical'; 
    timestamp: number;
  } | null = null;
  private readonly HEALTH_CHECK_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.db = prisma;
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Fetch all data in parallel for better performance
      const [
        userStats,
        aiStats,
        terminalStats,
        systemStats,
        recentActivity
      ] = await Promise.all([
        this.getUserStats(userId),
        this.getAIAssistantStats(userId),
        this.getTerminalStats(userId),
        this.getSystemStats(),
        this.getRecentActivity(userId, 20)
      ]);

      return {
        user: userStats,
        aiAssistant: aiStats,
        terminal: terminalStats,
        system: systemStats,
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return default data on error
      return this.getDefaultStats();
    }
  }

  private async getUserStats(userId: string) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          lastLoginAt: true
        }
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Count AI chat messages as today's activity
      const todayActivity = await this.db.assistantChatMessage.count({
        where: {
          userId,
          timestamp: {
            gte: todayStart
          }
        }
      });

      // Count assistant sessions as total sessions
      const totalSessions = await this.db.assistantChatSession.count({ 
        where: { userId } 
      });

      // Count active projects (using Project model)
      const activeProjects = await this.db.project.count();

      return {
        totalSessions,
        todayActivity,
        lastLogin: user?.lastLoginAt || null,
        activeProjects
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        totalSessions: 0,
        todayActivity: 0,
        lastLogin: null,
        activeProjects: 0
      };
    }
  }

  private async getAIAssistantStats(userId: string) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get conversation stats
      const [totalConversations, activeConversations] = await Promise.all([
        this.db.assistantChatSession.count({
          where: { userId }
        }),
        this.db.assistantChatSession.count({
          where: {
            userId,
            endedAt: null
          }
        })
      ]);

      // Get token usage and costs
      const tokenStats = await this.db.assistantChatSession.aggregate({
        where: { userId },
        _sum: {
          totalTokensUsed: true,
          totalCost: true
        }
      });

      // Get popular commands from messages
      const recentMessages = await this.db.assistantChatMessage.findMany({
        where: {
          userId,
          role: 'user',
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          content: true
        },
        take: 100
      });

      // Extract command patterns
      const commandCounts = new Map<string, number>();
      recentMessages.forEach(msg => {
        const content = msg.content.toLowerCase();
        if (content.startsWith('/') || content.includes('help')) {
          const command = content.split(' ')[0];
          commandCounts.set(command, (commandCounts.get(command) || 0) + 1);
        }
      });

      const popularCommands = Array.from(commandCounts.entries())
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate average response time
      const responseTimes = await this.db.assistantChatMessage.findMany({
        where: {
          userId,
          role: 'assistant',
          latency: { not: null }
        },
        select: {
          latency: true
        },
        take: 50,
        orderBy: {
          timestamp: 'desc'
        }
      });

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, r) => sum + (r.latency || 0), 0) / responseTimes.length
        : 0;

      return {
        totalConversations,
        activeConversations,
        tokensUsed: tokenStats._sum.totalTokensUsed || 0,
        totalCost: tokenStats._sum.totalCost || 0,
        averageResponseTime: Math.round(avgResponseTime),
        popularCommands
      };
    } catch (error) {
      console.error('Error in getAIAssistantStats:', error);
      return {
        totalConversations: 0,
        activeConversations: 0,
        tokensUsed: 0,
        totalCost: 0,
        averageResponseTime: 0,
        popularCommands: []
      };
    }
  }

  private async getTerminalStats(userId: string) {
    try {
      const terminalSessions = await this.db.terminalSession.findMany({
        where: { userId },
        include: {
          logs: {
            select: {
              type: true,
              content: true
            }
          }
        }
      });

      const totalCommands = terminalSessions.reduce(
        (sum, session) => sum + session.logs.length, 
        0
      );

      const errorLogs = terminalSessions.reduce(
        (sum, session) => sum + session.logs.filter(log => 
          log.type === 'error' || log.content.includes('error')
        ).length,
        0
      );

      const errorRate = totalCommands > 0 ? (errorLogs / totalCommands) * 100 : 0;

      // Calculate average execution time (mock for now)
      const averageExecutionTime = 250; // milliseconds

      return {
        totalSessions: terminalSessions.length,
        commandsExecuted: totalCommands,
        errorRate: Math.round(errorRate * 100) / 100,
        averageExecutionTime
      };
    } catch (error) {
      console.error('Error in getTerminalStats:', error);
      return {
        totalSessions: 0,
        commandsExecuted: 0,
        errorRate: 0,
        averageExecutionTime: 0
      };
    }
  }

  private async getSystemStats() {
    try {
      // Get system uptime (time since server started)
      const uptime = process.uptime();

      // Check database health with caching
      let databaseHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      // Check if we have a valid cached health check
      const now = Date.now();
      if (this.healthCheckCache && 
          (now - this.healthCheckCache.timestamp) < this.HEALTH_CHECK_CACHE_TTL) {
        databaseHealth = this.healthCheckCache.status;
      } else {
        // Perform actual health check
        try {
          if (!this.db) {
            databaseHealth = 'critical';
          } else {
            await this.db.$queryRaw`SELECT 1`;
            databaseHealth = 'healthy';
          }
        } catch (error) {
          console.error('Database health check failed:', error);
          databaseHealth = 'critical';
        }
        
        // Update cache
        this.healthCheckCache = {
          status: databaseHealth,
          timestamp: now
        };
      }

      // Get memory usage
      const memUsage = process.memoryUsage();
      const memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      // Count active assistant sessions as active connections
      const activeConnections = this.db ? await this.db.assistantChatSession.count({
        where: {
          endedAt: null
        }
      }) : 0;

      // Get last backup info
      const lastBackup = this.db ? await this.db.backupExport.findFirst({
        where: {
          type: 'backup'
        },
        orderBy: {
          createdAt: 'desc'
        }
      }) : null;

      return {
        uptime: Math.round(uptime),
        databaseHealth,
        memoryUsage,
        activeConnections,
        lastBackup: lastBackup?.createdAt || null
      };
    } catch (error) {
      console.error('Error in getSystemStats:', error);
      return {
        uptime: 0,
        databaseHealth: 'healthy' as const,
        memoryUsage: 0,
        activeConnections: 0,
        lastBackup: null
      };
    }
  }

  private async getRecentActivity(userId: string, limit: number = 20) {
    const activities: DashboardStats['recentActivity'] = [];

    try {
      // Get recent AI chat messages
      const recentChats = await this.db.assistantChatMessage.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: Math.floor(limit / 2)
      });

      recentChats.forEach(chat => {
        activities.push({
          id: chat.id,
          type: 'ai_chat',
          description: chat.role === 'user' 
            ? 'ส่งข้อความถึง AI Assistant' 
            : 'ได้รับคำตอบจาก AI Assistant',
          timestamp: chat.timestamp,
          status: 'success',
          metadata: { sessionId: chat.sessionId }
        });
      });

      // Get recent terminal sessions
      const recentTerminal = await this.db.terminalSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: Math.floor(limit / 2),
        include: {
          logs: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      recentTerminal.forEach(session => {
        activities.push({
          id: session.id,
          type: 'terminal',
          description: `Terminal: ${session.logs[0]?.content || 'เริ่ม session ใหม่'}`,
          timestamp: session.startedAt,
          status: session.logs[0]?.type === 'error' ? 'error' : 'success'
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      return [];
    }
  }

  private getDefaultStats(): DashboardStats {
    return {
      user: {
        totalSessions: 0,
        todayActivity: 0,
        lastLogin: null,
        activeProjects: 0
      },
      aiAssistant: {
        totalConversations: 0,
        activeConversations: 0,
        tokensUsed: 0,
        totalCost: 0,
        averageResponseTime: 0,
        popularCommands: []
      },
      terminal: {
        totalSessions: 0,
        commandsExecuted: 0,
        errorRate: 0,
        averageExecutionTime: 0
      },
      system: {
        uptime: 0,
        databaseHealth: 'healthy',
        memoryUsage: 0,
        activeConnections: 0,
        lastBackup: null
      },
      recentActivity: []
    };
  }

  async getQuickStats(userId: string) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalConversations,
        todayMessages,
        activeProjects,
        terminalSessions
      ] = await Promise.all([
        this.db.assistantChatSession.count({ where: { userId } }),
        this.db.assistantChatMessage.count({
          where: {
            userId,
            timestamp: { gte: todayStart }
          }
        }),
        this.db.project.count(),
        this.db.terminalSession.count({
          where: {
            userId,
            startedAt: { gte: todayStart }
          }
        })
      ]);

      return {
        totalConversations,
        todayMessages,
        activeProjects,
        terminalSessions
      };
    } catch (error) {
      console.error('Error in getQuickStats:', error);
      return {
        totalConversations: 0,
        todayMessages: 0,
        activeProjects: 0,
        terminalSessions: 0
      };
    }
  }
}

export const dashboardService = DashboardService.getInstance();