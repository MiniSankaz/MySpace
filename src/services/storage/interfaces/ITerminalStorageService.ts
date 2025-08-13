/**
 * Terminal Storage Service Interface
 * Provides abstraction for different storage implementations
 */

export type StorageMode = 'LOCAL' | 'DATABASE' | 'HYBRID';
export type TerminalStatus = 'active' | 'inactive' | 'error' | 'connecting' | 'closed' | 'suspended';
export type TerminalMode = 'normal' | 'claude';
export type TerminalType = 'terminal';

export interface TerminalSession {
  id: string;
  projectId: string;
  userId?: string;
  type: TerminalType;
  mode: TerminalMode;
  tabName: string;
  status: TerminalStatus;
  active: boolean;
  isFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentPath: string;
  wsConnected: boolean;
  metadata?: SessionMetadata;
  
  // Extended fields for storage
  output?: OutputLine[];
  commands?: CommandHistory[];
  environment?: Record<string, string>;
  suspensionState?: SuspensionState;
}

export interface SessionMetadata {
  pid?: number;
  shell?: string;
  dimensions?: { rows: number; cols: number };
  encoding?: string;
  theme?: string;
  customData?: Record<string, any>;
}

export interface OutputLine {
  id: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'system';
  content: string;
}

export interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  exitCode?: number;
  duration?: number;
  output?: string;
}

export interface SuspensionState {
  suspendedAt: Date;
  bufferedOutput: OutputLine[];
  cursorPosition?: { row: number; col: number };
  workingDirectory?: string;
  environmentSnapshot?: Record<string, string>;
}

export interface SessionCreateParams {
  projectId: string;
  projectPath: string;
  userId?: string;
  mode: TerminalMode;
  metadata?: Record<string, any>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'tabName';
  orderDirection?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface SessionQuery {
  projectId?: string;
  userId?: string;
  status?: TerminalStatus | TerminalStatus[];
  mode?: TerminalMode;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface SessionUpdate {
  sessionId: string;
  data: Partial<TerminalSession>;
  timestamp?: Date;
}

export interface ResumeResult {
  success: boolean;
  session?: TerminalSession;
  bufferedOutput?: string[];
  error?: string;
}

export interface StorageInfo {
  mode: StorageMode;
  sessionCount: number;
  memoryUsage: number;
  diskUsage?: number;
  lastSync?: Date;
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    cacheHitRate?: number;
  };
}

export interface HealthStatus {
  healthy: boolean;
  mode: StorageMode;
  issues?: string[];
  lastCheck: Date;
}

/**
 * Main Storage Service Interface
 * All storage implementations must implement this interface
 */
export interface ITerminalStorageService {
  // Session Management
  createSession(params: SessionCreateParams): Promise<TerminalSession>;
  getSession(sessionId: string): Promise<TerminalSession | null>;
  updateSession(sessionId: string, data: Partial<TerminalSession>): Promise<void>;
  deleteSession(sessionId: string): Promise<boolean>;
  listSessions(projectId: string, options?: ListOptions): Promise<TerminalSession[]>;
  
  // Bulk Operations
  bulkUpdate(updates: SessionUpdate[]): Promise<void>;
  bulkDelete(sessionIds: string[]): Promise<number>;
  
  // Focus Management
  setSessionFocus(sessionId: string, focused: boolean): Promise<void>;
  getFocusedSessions(projectId: string): Promise<string[]>;
  
  // State Management
  suspendSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<ResumeResult>;
  
  // Query Operations
  findSessions(query: SessionQuery): Promise<TerminalSession[]>;
  countSessions(query?: SessionQuery): Promise<number>;
  
  // Storage-Specific Operations
  sync(): Promise<void>;
  flush(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Health & Monitoring
  getStorageInfo(): Promise<StorageInfo>;
  healthCheck(): Promise<HealthStatus>;
}

/**
 * Storage Configuration Interface
 */
export interface StorageConfig {
  mode: StorageMode;
  local?: LocalStorageConfig;
  database?: DatabaseStorageConfig;
  hybrid?: HybridStorageConfig;
}

export interface LocalStorageConfig {
  basePath?: string;
  compression?: boolean;
  maxSessions?: number;
  flushInterval?: number;
  persistToDisk?: boolean;
}

export interface DatabaseStorageConfig {
  connectionString?: string;
  poolSize?: number;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface HybridStorageConfig {
  syncStrategy?: 'immediate' | 'eventual' | 'manual';
  syncInterval?: number;
  conflictResolution?: 'local-wins' | 'database-wins' | 'latest-wins';
  maxSyncBatch?: number;
}

/**
 * Storage Events
 */
export interface StorageEvents {
  'session:created': (session: TerminalSession) => void;
  'session:updated': (sessionId: string, changes: Partial<TerminalSession>) => void;
  'session:deleted': (sessionId: string) => void;
  'session:suspended': (sessionId: string) => void;
  'session:resumed': (sessionId: string) => void;
  'storage:mode-changed': (from: StorageMode, to: StorageMode) => void;
  'storage:sync-complete': (synced: number, conflicts: number) => void;
  'storage:error': (error: Error) => void;
}