// Mock data for testing Logs Monitor UI
export const mockLogsSummary = {
  success: true,
  projectId: 'default',
  summary: {
    assistant: {
      stats: {
        totalMessages: 145,
        totalTokens: 28500,
        totalCost: 0.0285,
        avgTokensPerMessage: 196.55,
        modelUsage: {
          'gpt-4': 85,
          'gpt-3.5-turbo': 60
        }
      },
      activeSessions: 3,
      lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    },
    terminal: {
      stats: {
        totalCommands: 342,
        successfulCommands: 298,
        failedCommands: 44,
        errorRate: 12.87,
        avgExecutionTime: 1250,
        mostUsedCommands: [
          { command: 'npm run dev', count: 45 },
          { command: 'git status', count: 38 },
          { command: 'npm install', count: 25 }
        ]
      },
      activeSessions: 2,
      totalSessions: 15,
      recentCommands: [
        {
          command: 'npm run dev',
          timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          exitCode: 0,
        },
        {
          command: 'git status',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          exitCode: 0,
        },
        {
          command: 'npm install axios',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          exitCode: 0,
        }
      ],
    },
    overall: {
      totalAiTokens: 28500,
      totalAiCost: 0.0285,
      totalTerminalCommands: 342,
      errorRate: 12.87,
    },
  },
};

export const mockAssistantLogs = {
  type: 'assistant',
  sessions: [
    {
      id: 'session-001',
      sessionName: 'Development Session',
      userId: 'user-001',
      projectId: 'default',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      totalTokensUsed: 12450,
      totalCost: 0.01245,
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      _count: {
        messages: 42,
        commands: 15
      }
    },
    {
      id: 'session-002',
      sessionName: 'Bug Fixing Session',
      userId: 'user-001',
      projectId: 'default',
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 1500,
      totalTokensUsed: 8320,
      totalCost: 0.00832,
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      _count: {
        messages: 28,
        commands: 8
      }
    },
    {
      id: 'session-003',
      sessionName: 'Feature Implementation',
      userId: 'user-001',
      projectId: 'default',
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: process.env.PORT || 3000,
      totalTokensUsed: 7730,
      totalCost: 0.00773,
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      _count: {
        messages: 35,
        commands: 12
      }
    }
  ],
  messages: [],
  stats: {
    totalSessions: 3,
    totalMessages: 105,
    totalTokens: 28500,
    totalCost: 0.0285
  }
};

export const mockTerminalLogs = {
  type: 'terminal',
  sessions: [
    {
      id: 'terminal-001',
      tabId: 'tab-001',
      tabName: 'Development Server',
      type: 'standard',
      active: true,
      currentPath: '/Users/sem4pro/Stock/port',
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      _count: {
        commands: 156,
        logs: 1024
      }
    },
    {
      id: 'terminal-002',
      tabId: 'tab-002',
      tabName: 'Git Operations',
      type: 'standard',
      active: true,
      currentPath: '/Users/sem4pro/Stock/port',
      startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      _count: {
        commands: 45,
        logs: 230
      }
    },
    {
      id: 'terminal-003',
      tabId: 'tab-003',
      tabName: 'Database Console',
      type: 'database',
      active: false,
      currentPath: '/Users/sem4pro/Stock/port',
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      _count: {
        commands: 78,
        logs: 456
      }
    },
    {
      id: 'terminal-004',
      tabId: 'tab-004',
      tabName: 'Testing',
      type: 'standard',
      active: false,
      currentPath: '/Users/sem4pro/Stock/port',
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      _count: {
        commands: 63,
        logs: 892
      }
    }
  ],
  recentCommands: [
    {
      command: 'npm run dev',
      timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      exitCode: 0,
      duration: 1250,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'git add -A',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      exitCode: 0,
      duration: 85,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'git commit -m "fix: resolve UI overlap issues"',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      exitCode: 0,
      duration: 125,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'npm test',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      exitCode: 1,
      duration: 8500,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'npx prisma migrate dev',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      exitCode: 0,
      duration: 3250,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'npm install axios',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      exitCode: 0,
      duration: 5600,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'npm run build',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      exitCode: 1,
      duration: 12500,
      workingDir: '/Users/sem4pro/Stock/port'
    },
    {
      command: 'curl http://localhost:process.env.PORT || 4000/api/health',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      exitCode: 0,
      duration: 250,
      workingDir: '/Users/sem4pro/Stock/port'
    }
  ],
  stats: {
    totalSessions: 4,
    activeSessions: 2,
    totalCommands: 342,
    totalLogs: 2602
  },
  logs: []
};