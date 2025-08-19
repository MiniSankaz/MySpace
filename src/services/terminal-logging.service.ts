import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

interface LogEntry {
  sessionId: string;
  userId?: string;
  type: "command" | "output" | "error" | "system";
  direction?: "input" | "output";
  content: string;
  rawContent?: string;
  metadata?: any;
}

interface SessionMetadata {
  userId?: string;
  projectId: string;
  type: "system" | "claude";
  tabName: string;
  currentPath: string;
  metadata?: any;
}

export class TerminalLoggingService {
  private sequenceMap = new Map<string, number>();
  private batchQueue = new Map<string, LogEntry[]>();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL = 1000; // 1 second

  constructor() {
    this.startBatchProcessor();
  }

  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushBatches();
    }, this.BATCH_INTERVAL);
  }

  async createSession(metadata: SessionMetadata) {
    try {
      // Ensure project exists before creating session
      await this.ensureProjectExists(metadata.projectId, metadata.currentPath);

      const session = await prisma.terminalSession.create({
        data: {
          id: uuidv4(),
          projectId: metadata.projectId,
          userId: metadata.userId,
          type: metadata.type,
          tabName: metadata.tabName,
          currentPath: metadata.currentPath,
          metadata: metadata.metadata || {},
          active: true,
          startedAt: new Date(),
        },
      });

      this.sequenceMap.set(session.id, 0);
      this.batchQueue.set(session.id, []);

      return session;
    } catch (error) {
      console.error("Failed to create terminal session:", error);

      // Fallback: return in-memory session
      const sessionId = uuidv4();
      this.sequenceMap.set(sessionId, 0);
      this.batchQueue.set(sessionId, []);

      return {
        id: sessionId,
        projectId: metadata.projectId,
        userId: metadata.userId,
        type: metadata.type,
        tabName: metadata.tabName,
        currentPath: metadata.currentPath,
        metadata: metadata.metadata || {},
        active: true,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        output: [],
        pid: null,
        endedAt: null,
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
      const existingProject = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!existingProject) {
        // Create project with fallback data
        await prisma.project.create({
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
              createdBy: "terminal-logging-service",
              createdAt: new Date().toISOString(),
            },
          },
        });
        console.log(`Created project ${projectId} for terminal logging`);
      }
    } catch (error) {
      console.error(`Failed to ensure project ${projectId} exists:`, error);
      // Continue with graceful degradation
    }
  }

  async endSession(sessionId: string) {
    try {
      // Flush any remaining logs
      await this.flushSessionLogs(sessionId);

      // Update session
      await prisma.terminalSession.update({
        where: { id: sessionId },
        data: {
          active: false,
          endedAt: new Date(),
        },
      });

      // Clean up
      this.sequenceMap.delete(sessionId);
      this.batchQueue.delete(sessionId);

      // Trigger analytics update
      await this.updateAnalytics(sessionId);
    } catch (error) {
      console.error("Failed to end terminal session:", error);
    }
  }

  async logEntry(entry: LogEntry) {
    try {
      // Add to batch queue
      const queue = this.batchQueue.get(entry.sessionId) || [];
      queue.push(entry);
      this.batchQueue.set(entry.sessionId, queue);

      // Flush if batch size reached
      if (queue.length >= this.BATCH_SIZE) {
        await this.flushSessionLogs(entry.sessionId);
      }
    } catch (error) {
      console.error("Failed to log entry:", error);
    }
  }

  async logCommand(
    sessionId: string,
    userId: string | undefined,
    command: string,
    metadata?: any,
  ) {
    await this.logEntry({
      sessionId,
      userId,
      type: "command",
      direction: "input",
      content: command,
      metadata,
    });

    // Track command pattern
    await this.trackCommandPattern(command);
  }

  async logOutput(
    sessionId: string,
    userId: string | undefined,
    output: string,
    rawOutput?: string,
  ) {
    await this.logEntry({
      sessionId,
      userId,
      type: "output",
      direction: "output",
      content: output,
      rawContent: rawOutput,
    });
  }

  async logError(
    sessionId: string,
    userId: string | undefined,
    error: string,
    metadata?: any,
  ) {
    await this.logEntry({
      sessionId,
      userId,
      type: "error",
      direction: "output",
      content: error,
      metadata,
    });
  }

  async logSystem(sessionId: string, message: string, metadata?: any) {
    await this.logEntry({
      sessionId,
      type: "system",
      content: message,
      metadata,
    });
  }

  private async flushSessionLogs(sessionId: string) {
    const queue = this.batchQueue.get(sessionId);
    if (!queue || queue.length === 0) return;

    try {
      const currentSequence = this.sequenceMap.get(sessionId) || 0;

      // Prepare batch data
      const logs = queue.map((entry, index) => ({
        id: uuidv4(),
        sessionId: entry.sessionId,
        userId: entry.userId,
        type: entry.type,
        direction: entry.direction,
        content: entry.content,
        rawContent: entry.rawContent,
        sequence: currentSequence + index + 1,
        metadata: entry.metadata || {},
        timestamp: new Date(),
      }));

      // Batch insert
      await prisma.terminalLog.createMany({
        data: logs,
      });

      // Update sequence counter
      this.sequenceMap.set(sessionId, currentSequence + logs.length);

      // Clear queue
      this.batchQueue.set(sessionId, []);
    } catch (error) {
      console.error("Failed to flush logs for session:", sessionId, error);
    }
  }

  private async flushBatches() {
    const sessions = Array.from(this.batchQueue.keys());
    for (const sessionId of sessions) {
      await this.flushSessionLogs(sessionId);
    }
  }

  private async trackCommandPattern(command: string) {
    try {
      // Extract base command
      const baseCommand = command.trim().split(" ")[0];
      const category = this.categorizeCommand(baseCommand);

      // Check if pattern exists
      const existing = await prisma.terminalCommandPattern.findFirst({
        where: { pattern: baseCommand },
      });

      if (existing) {
        // Update frequency
        await prisma.terminalCommandPattern.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + 1,
          },
        });
      } else {
        // Create new pattern
        await prisma.terminalCommandPattern.create({
          data: {
            id: uuidv4(),
            pattern: baseCommand,
            name: baseCommand,
            category,
            frequency: 1,
          },
        });
      }
    } catch (error) {
      console.error("Failed to track command pattern:", error);
    }
  }

  private categorizeCommand(command: string): string {
    const categories: Record<string, string[]> = {
      navigation: ["cd", "ls", "pwd", "find", "locate"],
      git: ["git", "gh", "gitmoji"],
      npm: ["npm", "npx", "yarn", "pnpm", "bun"],
      docker: ["docker", "docker-compose", "kubectl"],
      file: ["cat", "less", "more", "head", "tail", "grep", "sed", "awk"],
      system: ["ps", "top", "kill", "df", "du", "free"],
      network: ["curl", "wget", "ping", "netstat", "ss"],
      database: ["psql", "mysql", "mongo", "redis-cli"],
      build: ["make", "gradle", "mvn", "cargo"],
      python: ["python", "pip", "poetry", "pipenv"],
      node: ["node", "ts-node", "tsx", "nodemon"],
    };

    for (const [category, commands] of Object.entries(categories)) {
      if (commands.includes(command)) {
        return category;
      }
    }

    return "other";
  }

  private async updateAnalytics(sessionId: string) {
    try {
      const session = await prisma.terminalSession.findUnique({
        where: { id: sessionId },
        include: {
          logs: true,
        },
      });

      if (!session || !session.userId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get or create analytics for today
      const analytics = await prisma.terminalAnalytics.upsert({
        where: {
          userId_date: {
            userId: session.userId,
            date: today,
          },
        },
        create: {
          id: uuidv4(),
          userId: session.userId,
          date: today,
          commandCount: 0,
          errorCount: 0,
          sessionCount: 0,
          totalDuration: 0,
          uniqueCommands: [],
          commonPatterns: {},
          errorPatterns: {},
          workflowPatterns: {},
        },
        update: {},
      });

      // Calculate session metrics
      const commandCount = session.logs.filter(
        (l) => l.type === "command",
      ).length;
      const errorCount = session.logs.filter((l) => l.type === "error").length;
      const duration =
        session.endedAt && session.startedAt
          ? Math.floor(
              (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
            )
          : 0;

      // Extract unique commands
      const commands = session.logs
        .filter((l) => l.type === "command")
        .map((l) => l.content.trim().split(" ")[0]);

      const uniqueCommands = Array.from(
        new Set([...(analytics.uniqueCommands as string[]), ...commands]),
      );

      // Update analytics
      await prisma.terminalAnalytics.update({
        where: { id: analytics.id },
        data: {
          commandCount: analytics.commandCount + commandCount,
          errorCount: analytics.errorCount + errorCount,
          sessionCount: analytics.sessionCount + 1,
          totalDuration: analytics.totalDuration + duration,
          uniqueCommands,
        },
      });
    } catch (error) {
      console.error("Failed to update analytics:", error);
    }
  }

  async getSessionLogs(sessionId: string, limit = 1000) {
    return prisma.terminalLog.findMany({
      where: { sessionId },
      orderBy: { sequence: "asc" },
      take: limit,
    });
  }

  async getUserAnalytics(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.terminalAnalytics.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: "desc" },
    });
  }

  async getCommandPatterns(minFrequency = 10) {
    return prisma.terminalCommandPattern.findMany({
      where: {
        frequency: {
          gte: minFrequency,
        },
      },
      orderBy: { frequency: "desc" },
    });
  }

  async createShortcut(
    userId: string,
    alias: string,
    command: string,
    description?: string,
  ) {
    return prisma.terminalShortcut.create({
      data: {
        id: uuidv4(),
        userId,
        alias,
        command,
        description,
      },
    });
  }

  async getUserShortcuts(userId: string) {
    return prisma.terminalShortcut.findMany({
      where: {
        OR: [{ userId }, { isGlobal: true }],
      },
      orderBy: { usageCount: "desc" },
    });
  }

  async createSOP(data: {
    title: string;
    description?: string;
    workflow: any[];
    triggers: any;
    category: string;
    tags: string[];
    createdBy?: string;
  }) {
    return prisma.terminalSOP.create({
      data: {
        id: uuidv4(),
        ...data,
      },
    });
  }

  async getActiveSOPs() {
    return prisma.terminalSOP.findMany({
      where: { isActive: true },
      orderBy: { usageCount: "desc" },
    });
  }

  async detectWorkflowPatterns(userId: string) {
    // Analyze user's command sequences to detect patterns
    const recentSessions = await prisma.terminalSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
      },
      include: {
        logs: {
          where: { type: "command" },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });

    // Extract command sequences
    const workflows: string[][] = recentSessions.map((session) =>
      session.logs.map((log) => log.content.trim()),
    );

    // Find common patterns (simplified)
    const patternMap = new Map<string, number>();

    for (const workflow of workflows) {
      for (let i = 0; i < workflow.length - 2; i++) {
        const pattern = workflow.slice(i, i + 3).join(" -> ");
        patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
      }
    }

    // Return patterns that occur frequently
    return Array.from(patternMap.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => ({ pattern, count }));
  }

  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.flushBatches(); // Final flush
    }
  }
}

export const terminalLoggingService = new TerminalLoggingService();
