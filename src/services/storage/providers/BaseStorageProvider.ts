/**
 * Base Storage Provider
 * Abstract base class for all storage implementations
 */

import { EventEmitter } from "events";
import {
  ITerminalStorageService,
  TerminalSession,
  SessionCreateParams,
  ListOptions,
  SessionQuery,
  SessionUpdate,
  ResumeResult,
  StorageInfo,
  HealthStatus,
  StorageMode,
  OutputLine,
  CommandHistory,
} from "../interfaces/ITerminalStorageService";

/**
 * Abstract base class for storage providers
 */
export abstract class BaseStorageProvider
  extends EventEmitter
  implements ITerminalStorageService
{
  protected readonly mode: StorageMode;
  protected sessionCounter = 0;
  protected startTime = Date.now();

  // Metrics tracking
  protected metrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    totalReadTime: 0,
    totalWriteTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(mode: StorageMode) {
    super();
    this.mode = mode;
  }

  /**
   * Generate unique session ID
   */
  protected generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    const counter = (++this.sessionCounter).toString().padStart(4, "0");
    return `session_${timestamp}_${counter}_${random}`;
  }

  /**
   * Generate tab name for session
   */
  protected generateTabName(projectId: string, existingCount: number): string {
    return `Terminal ${existingCount + 1}`;
  }

  /**
   * Track operation time for metrics
   */
  protected async trackOperation<T>(
    type: "read" | "write" | "delete",
    operation: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      switch (type) {
        case "read":
          this.metrics.reads++;
          this.metrics.totalReadTime += duration;
          break;
        case "write":
          this.metrics.writes++;
          this.metrics.totalWriteTime += duration;
          break;
        case "delete":
          this.metrics.deletes++;
          break;
      }

      return result;
    } catch (error) {
      console.error(`[${this.constructor.name}] Operation failed:`, error);
      throw error;
    }
  }

  /**
   * Validate session parameters
   */
  protected validateSessionParams(params: SessionCreateParams): void {
    if (!params.projectId) {
      throw new Error("projectId is required");
    }
    if (!params.projectPath) {
      throw new Error("projectPath is required");
    }
    if (!params.mode) {
      throw new Error("mode is required");
    }
    if (params.mode !== "normal" && params.mode !== "claude") {
      throw new Error('mode must be "normal" or "claude"');
    }
  }

  /**
   * Create default session object
   */
  protected createDefaultSession(params: SessionCreateParams): TerminalSession {
    const now = new Date();
    // Allow custom sessionId for migration/sync
    const sessionId = params.metadata?.sessionId || this.generateSessionId();

    return {
      id: sessionId,
      projectId: params.projectId,
      userId: params.userId,
      type: "terminal",
      mode: params.mode,
      tabName: "", // Will be set by implementation
      status: "connecting",
      active: true,
      isFocused: false,
      createdAt: now,
      updatedAt: now,
      currentPath: params.projectPath,
      wsConnected: false,
      metadata: params.metadata || {},
      output: [],
      commands: [],
      environment: {},
    };
  }

  /**
   * Apply query filters to sessions
   */
  protected applyQueryFilters(
    sessions: TerminalSession[],
    query: SessionQuery,
  ): TerminalSession[] {
    let filtered = [...sessions];

    if (query.projectId) {
      filtered = filtered.filter((s) => s.projectId === query.projectId);
    }

    if (query.userId) {
      filtered = filtered.filter((s) => s.userId === query.userId);
    }

    if (query.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      filtered = filtered.filter((s) => statuses.includes(s.status));
    }

    if (query.mode) {
      filtered = filtered.filter((s) => s.mode === query.mode);
    }

    if (query.createdAfter) {
      filtered = filtered.filter((s) => s.createdAt >= query.createdAfter);
    }

    if (query.createdBefore) {
      filtered = filtered.filter((s) => s.createdAt <= query.createdBefore);
    }

    return filtered;
  }

  /**
   * Apply list options to sessions
   */
  protected applyListOptions(
    sessions: TerminalSession[],
    options?: ListOptions,
  ): TerminalSession[] {
    let result = [...sessions];

    // Filter inactive if needed
    if (!options?.includeInactive) {
      result = result.filter(
        (s) => s.status !== "closed" && s.status !== "error",
      );
    }

    // Sort
    const orderBy = options?.orderBy || "createdAt";
    const orderDirection = options?.orderDirection || "asc";

    result.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (orderBy) {
        case "updatedAt":
          aVal = a.updatedAt.getTime();
          bVal = b.updatedAt.getTime();
          break;
        case "tabName":
          aVal = a.tabName;
          bVal = b.tabName;
          break;
        case "createdAt":
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
      }

      if (orderDirection === "desc") {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || result.length;

    return result.slice(offset, offset + limit);
  }

  /**
   * Log operation for debugging
   */
  protected log(
    level: "info" | "warn" | "error",
    message: string,
    data?: any,
  ): void {
    const prefix = `[${this.constructor.name}]`;

    switch (level) {
      case "info":
        console.log(prefix, message, data || "");
        break;
      case "warn":
        console.warn(prefix, message, data || "");
        break;
      case "error":
        console.error(prefix, message, data || "");
        break;
    }
  }

  /**
   * Emit storage event
   */
  protected emitStorageEvent(event: string, data: any): void {
    this.emit(event, data);
    this.log("info", `Event: ${event}`, data);
  }

  /**
   * Calculate storage metrics
   */
  protected calculateMetrics(
    sessionCount: number,
    memoryUsage?: number,
  ): {
    avgReadTime: number;
    avgWriteTime: number;
    cacheHitRate?: number;
  } {
    const avgReadTime =
      this.metrics.reads > 0
        ? this.metrics.totalReadTime / this.metrics.reads
        : 0;

    const avgWriteTime =
      this.metrics.writes > 0
        ? this.metrics.totalWriteTime / this.metrics.writes
        : 0;

    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate =
      totalCacheOps > 0
        ? (this.metrics.cacheHits / totalCacheOps) * 100
        : undefined;

    return {
      avgReadTime,
      avgWriteTime,
      cacheHitRate,
    };
  }

  /**
   * Default storage info implementation
   */
  public async getStorageInfo(): Promise<StorageInfo> {
    const sessionCount = await this.countSessions();
    const memoryUsage = process.memoryUsage().heapUsed;
    const performance = this.calculateMetrics(sessionCount, memoryUsage);

    return {
      mode: this.mode,
      sessionCount,
      memoryUsage,
      performance,
    };
  }

  /**
   * Default health check implementation
   */
  public async healthCheck(): Promise<HealthStatus> {
    const issues: string[] = [];

    try {
      // Try to perform a basic operation
      await this.countSessions();

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

      if (memoryUsageMB > process.env.PORT || 4000) {
        issues.push(`High memory usage: ${Math.round(memoryUsageMB)}MB`);
      }

      return {
        healthy: issues.length === 0,
        mode: this.mode,
        issues: issues.length > 0 ? issues : undefined,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        mode: this.mode,
        issues: [`Storage provider error: ${error}`],
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Default sync implementation (no-op for non-syncing providers)
   */
  public async sync(): Promise<void> {
    this.log("info", "Sync called (no-op for this provider)");
  }

  /**
   * Default flush implementation
   */
  public async flush(): Promise<void> {
    this.log("info", "Flushing storage provider");
  }

  /**
   * Default cleanup implementation
   */
  public async cleanup(): Promise<void> {
    this.log("info", "Cleaning up storage provider");
    this.removeAllListeners();
  }

  // Abstract methods that must be implemented by subclasses
  public abstract createSession(
    params: SessionCreateParams,
  ): Promise<TerminalSession>;
  public abstract getSession(
    sessionId: string,
  ): Promise<TerminalSession | null>;
  public abstract updateSession(
    sessionId: string,
    data: Partial<TerminalSession>,
  ): Promise<void>;
  public abstract deleteSession(sessionId: string): Promise<boolean>;
  public abstract listSessions(
    projectId: string,
    options?: ListOptions,
  ): Promise<TerminalSession[]>;
  public abstract bulkUpdate(updates: SessionUpdate[]): Promise<void>;
  public abstract bulkDelete(sessionIds: string[]): Promise<number>;
  public abstract setSessionFocus(
    sessionId: string,
    focused: boolean,
  ): Promise<void>;
  public abstract getFocusedSessions(projectId: string): Promise<string[]>;
  public abstract suspendSession(sessionId: string): Promise<void>;
  public abstract resumeSession(sessionId: string): Promise<ResumeResult>;
  public abstract findSessions(query: SessionQuery): Promise<TerminalSession[]>;
  public abstract countSessions(query?: SessionQuery): Promise<number>;
}
