// Terminal Service Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  service?: string;
}

export interface ServiceHealth {
  service: string;
  status: "OK" | "WARNING" | "ERROR" | "UNKNOWN";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  terminals?: {
    active: number;
    total: number;
  };
}

// Terminal Session Types
export interface TerminalSession {
  id: string;
  projectId: string;
  userId?: string;
  name: string;
  mode: SessionMode;
  status: SessionStatus;
  workingDirectory: string;
  shell: string;
  pid?: number;
  dimensions: {
    rows: number;
    cols: number;
  };
  environment: Record<string, string>;
  metadata: {
    created: Date;
    lastActivity?: Date;
    focused: boolean;
    [key: string]: any;
  };
  metrics: {
    commandCount: number;
    dataTransferred: number;
    errors: number;
  };
}

export enum SessionMode {
  TERMINAL = "terminal",
  CLAUDE = "claude",
  INTERACTIVE = "interactive",
}

export enum SessionStatus {
  INITIALIZING = "initializing",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSED = "closed",
  ERROR = "error",
}

// Stream Types
export interface StreamConnection {
  id: string;
  sessionId: string;
  type: StreamType;
  protocol: "ws" | "pty";
  status: "connected" | "disconnected" | "error";
  metadata: {
    created: Date;
    lastData?: Date;
    dataCount: number;
  };
}

export enum StreamType {
  TERMINAL = "terminal",
  CLAUDE = "claude",
  FILE = "file",
  COMMAND = "command",
}

// Request/Response Types
export interface CreateTerminalRequest {
  projectId: string;
  projectPath: string;
  userId?: string;
  name?: string;
  mode?: SessionMode;
  shell?: string;
  dimensions?: {
    rows: number;
    cols: number;
  };
  environment?: Record<string, string>;
}

export interface CreateTerminalResponse {
  session: TerminalSession;
  wsUrl: string;
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  output?: string;
  exitCode?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface TerminalMetrics {
  sessionId: string;
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
  totalCommands: number;
  averageResponseTime: number;
  timestamp: Date;
}

// WebSocket Message Types
export interface WebSocketMessage<T = any> {
  type: "data" | "resize" | "ping" | "pong" | "error" | "close";
  sessionId: string;
  data?: T;
  timestamp: Date;
}

export interface TerminalData {
  content: string;
  encoding?: string;
}

export interface ResizeData {
  rows: number;
  cols: number;
}
