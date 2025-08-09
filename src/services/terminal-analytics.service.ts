import { PrismaClient } from '@prisma/client';
import { terminalLoggingService } from './terminal-logging.service';

const prisma = new PrismaClient();

export interface CommandAnalysis {
  command: string;
  frequency: number;
  avgExecutionTime: number;
  successRate: number;
  commonErrors: string[];
  suggestedOptimizations: string[];
}

export interface WorkflowAnalysis {
  pattern: string[];
  frequency: number;
  avgDuration: number;
  suggestedSOP?: {
    title: string;
    steps: string[];
    triggers: string[];
  };
}

export interface UserBehaviorAnalysis {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalCommands: number;
    uniqueCommands: number;
    errorRate: number;
    avgSessionDuration: number;
    peakHours: number[];
    mostUsedCommands: CommandAnalysis[];
    workflowPatterns: WorkflowAnalysis[];
  };
  recommendations: {
    shortcuts: Array<{ alias: string; command: string; reason: string }>;
    sops: Array<{ title: string; workflow: string[]; benefit: string }>;
    learningPaths: Array<{ topic: string; resources: string[] }>;
  };
}

export class TerminalAnalyticsService {
  async analyzeUserBehavior(userId: string, days = 30): Promise<UserBehaviorAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all sessions for the user in the period
    const sessions = await prisma.terminalSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        logs: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    // Analyze commands
    const commandMap = new Map<string, CommandAnalysis>();
    const errorPatterns = new Map<string, string[]>();
    let totalCommands = 0;
    let totalErrors = 0;

    for (const session of sessions) {
      const commands = session.logs.filter(l => l.type === 'command');
      const outputs = session.logs.filter(l => l.type === 'output');
      const errors = session.logs.filter(l => l.type === 'error');

      totalCommands += commands.length;
      totalErrors += errors.length;

      // Analyze each command
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const baseCommand = cmd.content.trim().split(' ')[0];
        
        if (!commandMap.has(baseCommand)) {
          commandMap.set(baseCommand, {
            command: baseCommand,
            frequency: 0,
            avgExecutionTime: 0,
            successRate: 0,
            commonErrors: [],
            suggestedOptimizations: [],
          });
        }

        const analysis = commandMap.get(baseCommand)!;
        analysis.frequency++;

        // Check for errors after this command
        const nextError = errors.find(e => e.sequence > cmd.sequence);
        if (nextError && nextError.sequence < (commands[i + 1]?.sequence || Infinity)) {
          // Command resulted in error
          if (!errorPatterns.has(baseCommand)) {
            errorPatterns.set(baseCommand, []);
          }
          errorPatterns.get(baseCommand)!.push(nextError.content);
        }
      }
    }

    // Calculate success rates
    for (const [command, analysis] of commandMap) {
      const errorCount = errorPatterns.get(command)?.length || 0;
      analysis.successRate = ((analysis.frequency - errorCount) / analysis.frequency) * 100;
      analysis.commonErrors = this.extractCommonErrors(errorPatterns.get(command) || []);
      analysis.suggestedOptimizations = this.suggestOptimizations(command, analysis);
    }

    // Detect workflow patterns
    const workflowPatterns = await this.detectWorkflowPatterns(sessions);

    // Calculate peak hours
    const hourCounts = new Array(24).fill(0);
    for (const session of sessions) {
      const hour = new Date(session.startedAt).getHours();
      hourCounts[hour]++;
    }
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      Array.from(commandMap.values()),
      workflowPatterns
    );

    return {
      userId,
      period: { start: startDate, end: endDate },
      metrics: {
        totalCommands,
        uniqueCommands: commandMap.size,
        errorRate: totalErrors / totalCommands,
        avgSessionDuration: this.calculateAvgSessionDuration(sessions),
        peakHours,
        mostUsedCommands: Array.from(commandMap.values())
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10),
        workflowPatterns,
      },
      recommendations,
    };
  }

  private async detectWorkflowPatterns(sessions: any[]): Promise<WorkflowAnalysis[]> {
    const patternMap = new Map<string, WorkflowAnalysis>();

    for (const session of sessions) {
      const commands = session.logs
        .filter((l: any) => l.type === 'command')
        .map((l: any) => l.content.trim());

      // Look for sequences of 2-5 commands
      for (let length = 2; length <= Math.min(5, commands.length); length++) {
        for (let i = 0; i <= commands.length - length; i++) {
          const pattern = commands.slice(i, i + length);
          const key = pattern.join(' -> ');

          if (!patternMap.has(key)) {
            patternMap.set(key, {
              pattern,
              frequency: 0,
              avgDuration: 0,
            });
          }

          patternMap.get(key)!.frequency++;
        }
      }
    }

    // Filter patterns that occur at least 3 times
    const significantPatterns = Array.from(patternMap.values())
      .filter(p => p.frequency >= 3)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Generate SOPs for common patterns
    for (const pattern of significantPatterns) {
      pattern.suggestedSOP = this.generateSOP(pattern);
    }

    return significantPatterns;
  }

  private extractCommonErrors(errors: string[]): string[] {
    const errorTypes = new Map<string, number>();

    for (const error of errors) {
      // Extract error type
      let errorType = 'Unknown error';
      if (error.includes('command not found')) {
        errorType = 'Command not found';
      } else if (error.includes('permission denied')) {
        errorType = 'Permission denied';
      } else if (error.includes('No such file or directory')) {
        errorType = 'File or directory not found';
      } else if (error.includes('syntax error')) {
        errorType = 'Syntax error';
      } else if (error.includes('Connection refused')) {
        errorType = 'Connection refused';
      }

      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    }

    return Array.from(errorTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private suggestOptimizations(command: string, analysis: CommandAnalysis): string[] {
    const suggestions: string[] = [];

    // Command-specific suggestions
    if (command === 'ls' && analysis.frequency > 20) {
      suggestions.push('Consider using `ll` alias for `ls -la`');
    }

    if (command === 'cd' && analysis.frequency > 30) {
      suggestions.push('Use `z` or `autojump` for faster navigation');
    }

    if (command === 'git' && analysis.successRate < 80) {
      suggestions.push('Configure git aliases for common operations');
    }

    if (command === 'npm' && analysis.frequency > 15) {
      suggestions.push('Use `ni` for faster npm install');
      suggestions.push('Consider pnpm for better performance');
    }

    if (command === 'docker' && analysis.frequency > 10) {
      suggestions.push('Create docker-compose for common container setups');
    }

    // Error-based suggestions
    if (analysis.commonErrors.includes('Command not found')) {
      suggestions.push(`Install ${command} or check PATH configuration`);
    }

    if (analysis.commonErrors.includes('Permission denied')) {
      suggestions.push('Check file permissions or use sudo when necessary');
    }

    return suggestions;
  }

  private generateSOP(pattern: WorkflowAnalysis): any {
    const commands = pattern.pattern;
    const firstCommand = commands[0].split(' ')[0];

    // Detect common workflow types
    if (commands.some(c => c.startsWith('git'))) {
      return {
        title: 'Git Workflow',
        steps: commands.map((c, i) => `Step ${i + 1}: ${c}`),
        triggers: ['git operations', 'version control'],
      };
    }

    if (commands.some(c => c.startsWith('npm') || c.startsWith('yarn'))) {
      return {
        title: 'Node.js Development Workflow',
        steps: commands.map((c, i) => `Step ${i + 1}: ${c}`),
        triggers: ['node development', 'package management'],
      };
    }

    if (commands.some(c => c.startsWith('docker'))) {
      return {
        title: 'Docker Container Workflow',
        steps: commands.map((c, i) => `Step ${i + 1}: ${c}`),
        triggers: ['containerization', 'docker operations'],
      };
    }

    return {
      title: `Custom Workflow: ${firstCommand}`,
      steps: commands.map((c, i) => `Step ${i + 1}: ${c}`),
      triggers: [`${firstCommand} operations`],
    };
  }

  private generateRecommendations(
    commands: CommandAnalysis[],
    patterns: WorkflowAnalysis[]
  ): UserBehaviorAnalysis['recommendations'] {
    const shortcuts: any[] = [];
    const sops: any[] = [];
    const learningPaths: any[] = [];

    // Recommend shortcuts for frequently used commands
    for (const cmd of commands.filter(c => c.frequency > 10)) {
      if (cmd.command.length > 3) {
        shortcuts.push({
          alias: cmd.command.substring(0, 2),
          command: cmd.command,
          reason: `Used ${cmd.frequency} times in the last 30 days`,
        });
      }
    }

    // Recommend SOPs for frequent patterns
    for (const pattern of patterns.filter(p => p.frequency > 5)) {
      if (pattern.suggestedSOP) {
        sops.push({
          title: pattern.suggestedSOP.title,
          workflow: pattern.pattern,
          benefit: `Save time by automating ${pattern.frequency} repetitions`,
        });
      }
    }

    // Recommend learning paths based on errors
    const errorCommands = commands.filter(c => c.successRate < 70);
    if (errorCommands.some(c => c.command.startsWith('git'))) {
      learningPaths.push({
        topic: 'Git Best Practices',
        resources: [
          'Pro Git Book: https://git-scm.com/book',
          'Interactive Git Tutorial: https://learngitbranching.js.org',
        ],
      });
    }

    if (errorCommands.some(c => c.command === 'docker')) {
      learningPaths.push({
        topic: 'Docker Fundamentals',
        resources: [
          'Docker Official Docs: https://docs.docker.com',
          'Docker Best Practices: https://docs.docker.com/develop/dev-best-practices',
        ],
      });
    }

    return { shortcuts, sops, learningPaths };
  }

  private calculateAvgSessionDuration(sessions: any[]): number {
    const durations = sessions
      .filter(s => s.endedAt)
      .map(s => {
        const start = new Date(s.startedAt).getTime();
        const end = new Date(s.endedAt).getTime();
        return (end - start) / 1000; // in seconds
      });

    if (durations.length === 0) return 0;

    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  async generateAIPromptOptimizations(userId: string): Promise<string[]> {
    const analysis = await this.analyzeUserBehavior(userId);
    const prompts: string[] = [];

    // Generate prompts based on error patterns
    if (analysis.metrics.errorRate > 0.1) {
      prompts.push(
        `When user runs commands, provide more detailed explanations and check for common errors like: ${analysis.metrics.mostUsedCommands
          .flatMap(c => c.commonErrors)
          .join(', ')}`
      );
    }

    // Generate prompts based on workflow patterns
    if (analysis.metrics.workflowPatterns.length > 0) {
      prompts.push(
        `User frequently performs these workflows: ${analysis.metrics.workflowPatterns
          .slice(0, 3)
          .map(p => p.pattern.join(' -> '))
          .join('; ')}. Suggest automating these with scripts or aliases.`
      );
    }

    // Generate prompts based on command frequency
    const topCommands = analysis.metrics.mostUsedCommands.slice(0, 5).map(c => c.command);
    prompts.push(
      `User's most common commands are: ${topCommands.join(', ')}. Provide shortcuts and optimizations for these.`
    );

    return prompts;
  }
}

export const terminalAnalyticsService = new TerminalAnalyticsService();