import { PrismaClient } from "@prisma/client";
import { prisma } from "@/core/database/prisma";

export interface TerminalSession {
  id: string;
  tabId: string;
  tabName: string;
  type: string;
  active: boolean;
  currentPath?: string;
  projectId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  _count?: {
    commands: number;
    logs: number;
  };
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  workingDir?: string;
  exitCode?: number;
  duration?: number;
  timestamp: Date;
}

export interface TerminalLog {
  id: string;
  sessionId: string;
  type: "stdout" | "stderr" | "info";
  content: string;
  timestamp: Date;
}

export interface TerminalStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  errorRate: number;
  avgExecutionTime: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  totalSessions?: number;
  activeSessions?: number;
}

class WorkspaceTerminalLoggingService {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  // Create or update terminal session
  async createSession(data: {
    tabId: string;
    tabName: string;
    type?: string;
    projectId: string;
    userId: string;
    currentPath?: string;
  }): Promise<TerminalSession> {
    try {
      // Ensure project exists before creating session
      await this.ensureProjectExists(
        data.projectId,
        data.currentPath || process.cwd(),
      );

      const session = await this.db.terminalSession.create({
        data: {
          id: data.tabId, // Use tabId as the session ID
          tabName: data.tabName,
          type: data.type || "system",
          active: true,
          currentPath: data.currentPath || process.cwd(),
          projectId: data.projectId || "default",
          userId: data.userId || null,
          startedAt: new Date(),
          metadata: {},
        },
        include: {
          _count: {
            select: {
              commands: true,
              logs: true,
            },
          },
        },
      });

      return this.mapPrismaSessionToTerminalSession(session);
    } catch (error) {
      console.error("Error creating terminal session:", error);

      // Fallback: return in-memory session if database fails
      return {
        id: data.tabId,
        tabId: data.tabId,
        tabName: data.tabName,
        type: data.type || "system",
        active: true,
        currentPath: data.currentPath || process.cwd(),
        projectId: data.projectId,
        userId: data.userId,
        startedAt: new Date(),
        _count: { commands: 0, logs: 0 },
      };
    }
  }

  // Ensure project exists in database, create if not found
  private async ensureProjectExists(
    projectId: string,
    projectPath: string,
  ): Promise<void> {
    try {
      // Check if project exists
      const existingProject = await this.db.project.findUnique({
        where: { id: projectId },
      });

      if (!existingProject) {
        // Create project with fallback data
        await this.db.project.create({
          data: {
            id: projectId,
            name: `Project ${projectId}`,
            description: `Auto-created project for terminal logging`,
            path: projectPath,
            structure: {},
            envVariables: {},
            scripts: [],
            settings: {
              autoCreated: true,
              createdBy: "workspace-terminal-logging",
              createdAt: new Date().toISOString(),
            },
          },
        });
        console.log(
          `Created project ${projectId} for workspace terminal logging`,
        );
      }
    } catch (error) {
      console.error(`Failed to ensure project ${projectId} exists:`, error);
      // Continue with graceful degradation
    }
  }

  // Log command execution
  async logCommand(data: {
    sessionId: string;
    command: string;
    workingDir?: string;
    exitCode?: number;
    duration?: number;
  }): Promise<void> {
    try {
      // Get projectId from session
      const session = await this.db.terminalSession.findUnique({
        where: { id: data.sessionId },
      });

      if (!session) {
        console.error("Session not found for command logging:", data.sessionId);
        return;
      }

      await this.db.terminalCommand.create({
        data: {
          sessionId: data.sessionId,
          projectId: session.projectId,
          command: data.command,
          output: "", // Required field, can be updated later
          exitCode: data.exitCode || 0,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error logging terminal command:", error);
      // Don't throw to avoid breaking the main flow
    }
  }

  // Log terminal output
  async logOutput(data: {
    sessionId: string;
    type: "stdout" | "stderr" | "info";
    content: string;
  }): Promise<void> {
    try {
      // Get the next sequence number for this session
      const lastLog = await this.db.terminalLog.findFirst({
        where: { sessionId: data.sessionId },
        orderBy: { sequence: "desc" },
      });
      const nextSequence = (lastLog?.sequence || 0) + 1;

      await this.db.terminalLog.create({
        data: {
          sessionId: data.sessionId,
          type:
            data.type === "stdout"
              ? "output"
              : data.type === "stderr"
                ? "error"
                : "system",
          direction: "output",
          content: data.content,
          timestamp: new Date(),
          sequence: nextSequence,
          metadata: {},
        },
      });
    } catch (error) {
      console.error("Error logging terminal output:", error);
      // Don't throw to avoid breaking the main flow
    }
  }

  // Get project sessions
  async getProjectSessions(
    projectId: string,
    activeOnly?: boolean,
  ): Promise<TerminalSession[]> {
    try {
      const sessions = await this.db.terminalSession.findMany({
        where: {
          projectId,
          ...(activeOnly !== undefined && { active: activeOnly }),
        },
        orderBy: { startedAt: "desc" },
        include: {
          _count: {
            select: {
              commands: true,
              logs: true,
            },
          },
        },
        take: 100,
      });

      return sessions.map((s) => this.mapPrismaSessionToTerminalSession(s));
    } catch (error) {
      console.error("Error fetching project sessions:", error);
      return [];
    }
  }

  // Get session logs
  async getSessionLogs(
    sessionId: string,
    limit: number = 100,
  ): Promise<TerminalLog[]> {
    try {
      const logs = await this.db.terminalLog.findMany({
        where: { sessionId },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return logs.map((log) => ({
        id: log.id,
        sessionId: log.sessionId,
        type: log.type as "stdout" | "stderr" | "info",
        content: log.content,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      console.error("Error fetching session logs:", error);
      return [];
    }
  }

  // Get project commands
  async getProjectCommands(
    projectId: string,
    limit: number = 100,
  ): Promise<TerminalCommand[]> {
    try {
      // First get sessions for the project
      const sessions = await this.db.terminalSession.findMany({
        where: { projectId },
        select: { id: true },
      });

      const sessionIds = sessions.map((s) => s.id);

      const commands = await this.db.terminalCommand.findMany({
        where: {
          sessionId: { in: sessionIds },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return commands.map((cmd) => ({
        id: cmd.id,
        sessionId: cmd.sessionId,
        command: cmd.command,
        workingDir: undefined, // Field doesn't exist in schema
        exitCode: cmd.exitCode || undefined,
        duration: undefined, // Field doesn't exist in schema
        timestamp: cmd.timestamp,
      }));
    } catch (error) {
      console.error("Error fetching project commands:", error);
      return [];
    }
  }

  // Get project statistics
  async getProjectStats(projectId: string): Promise<TerminalStats> {
    try {
      const sessions = await this.db.terminalSession.findMany({
        where: { projectId },
        include: {
          commands: true,
        },
      });

      const allCommands = sessions.flatMap((s) => s.commands);

      const stats: TerminalStats = {
        totalCommands: allCommands.length,
        successfulCommands: allCommands.filter((c) => c.exitCode === 0).length,
        failedCommands: allCommands.filter(
          (c) => c.exitCode !== 0 && c.exitCode !== null,
        ).length,
        errorRate: 0,
        avgExecutionTime: 0,
        mostUsedCommands: [],
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.active).length,
      };

      // Calculate error rate
      if (stats.totalCommands > 0) {
        stats.errorRate = (stats.failedCommands / stats.totalCommands) * 100;
      }

      // Average execution time not available in current schema
      stats.avgExecutionTime = 0;

      // Get most used commands
      const commandCounts = new Map<string, number>();
      allCommands.forEach((cmd) => {
        const baseCommand = cmd.command.split(" ")[0]; // Get base command
        commandCounts.set(
          baseCommand,
          (commandCounts.get(baseCommand) || 0) + 1,
        );
      });

      stats.mostUsedCommands = Array.from(commandCounts.entries())
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error("Error calculating project stats:", error);
      return {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        errorRate: 0,
        avgExecutionTime: 0,
        mostUsedCommands: [],
        totalSessions: 0,
        activeSessions: 0,
      };
    }
  }

  // Mark session as ended
  async endSession(sessionId: string): Promise<void> {
    try {
      // First check if session exists
      const existingSession = await this.db.terminalSession.findUnique({
        where: { id: sessionId },
      });

      if (existingSession) {
        await this.db.terminalSession.update({
          where: { id: sessionId },
          data: {
            active: false,
            endedAt: new Date(),
          },
        });
      } else {
        console.warn(
          `Session ${sessionId} not found in database, skipping endSession`,
        );
      }
    } catch (error: any) {
      // Handle P2025 error (record not found) gracefully
      if (error.code === "P2025") {
        console.warn(
          `Session ${sessionId} not found when ending:`,
          error.message,
        );
      } else {
        console.error("Error ending terminal session:", error);
      }
    }
  }

  // Clear old sessions
  async clearOldSessions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );

      const result = await this.db.terminalSession.deleteMany({
        where: {
          active: false,
          endedAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error("Error clearing old sessions:", error);
      return 0;
    }
  }

  // Helper to map Prisma result to TerminalSession
  private mapPrismaSessionToTerminalSession(session: any): TerminalSession {
    return {
      id: session.id,
      tabId: session.id, // Use id as tabId since tabId field doesn't exist
      tabName: session.tabName,
      type: session.type,
      active: session.active,
      currentPath: session.currentPath,
      projectId: session.projectId,
      userId: session.userId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      _count: session._count,
    };
  }
}

// Export singleton instance
export const workspaceTerminalLogger = new WorkspaceTerminalLoggingService();
