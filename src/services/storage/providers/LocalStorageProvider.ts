/**
 * Local Storage Provider
 * High-performance in-memory storage with optional disk persistence
 * Achieves sub-500ms project switching performance
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import {
  TerminalSession,
  SessionCreateParams,
  ListOptions,
  SessionQuery,
  SessionUpdate,
  ResumeResult,
  LocalStorageConfig,
  SuspensionState,
  OutputLine
} from '../interfaces/ITerminalStorageService';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Local Storage Provider Implementation
 * Uses in-memory Map for ultra-fast access with optional disk persistence
 */
export class LocalStorageProvider extends BaseStorageProvider {
  // Primary storage - in-memory for speed
  private sessions: Map<string, TerminalSession> = new Map();
  private projectSessions: Map<string, Set<string>> = new Map();
  private focusedSessions: Map<string, Set<string>> = new Map();
  private sessionActivity: Map<string, Date> = new Map();
  private suspendedStates: Map<string, SuspensionState> = new Map();
  
  // Configuration
  private readonly config: LocalStorageConfig;
  private readonly maxFocusedPerProject = 10;
  
  // Session counters per project for tab naming
  private sessionCounters: Map<string, number> = new Map();
  
  // Persistence
  private persistenceTimer?: NodeJS.Timeout;
  private isDirty = false;
  
  constructor(config?: LocalStorageConfig) {
    super('LOCAL');
    
    this.config = {
      basePath: config?.basePath || '/tmp/terminal-sessions',
      compression: config?.compression || false,
      maxSessions: config?.maxSessions || 50,
      flushInterval: config?.flushInterval || 5000,
      persistToDisk: config?.persistToDisk || false
    };
    
    this.initialize();
  }
  
  /**
   * Initialize the provider
   */
  private async initialize(): Promise<void> {
    this.log('info', 'Initializing LocalStorageProvider', this.config);
    
    // Load persisted sessions if enabled
    if (this.config.persistToDisk) {
      await this.loadFromDisk();
      
      // Set up auto-persistence
      this.persistenceTimer = setInterval(() => {
        if (this.isDirty) {
          this.saveToDisk().catch(err => 
            this.log('error', 'Failed to persist sessions', err)
          );
        }
      }, this.config.flushInterval);
    }
    
    // Set up memory management
    setInterval(() => this.performMemoryCleanup(), 60000); // Every minute
  }
  
  /**
   * Create a new session
   */
  public async createSession(params: SessionCreateParams): Promise<TerminalSession> {
    return this.trackOperation('write', async () => {
      this.validateSessionParams(params);
      
      // CRITICAL FIX: Prevent infinite loop - check if we're already at max focused sessions
      const projectFocused = this.focusedSessions.get(params.projectId) || new Set();
      if (projectFocused.size >= this.maxFocusedPerProject) {
        console.log(`[LocalStorageProvider] Max focused sessions (${this.maxFocusedPerProject}) reached for project ${params.projectId}`);
        // Don't create new session if we've hit the focus limit
        const existingSession = Array.from(this.sessions.values())
          .find(s => s.projectId === params.projectId && !s.isFocused);
        if (existingSession) {
          console.log(`[LocalStorageProvider] Reusing existing unfocused session ${existingSession.id}`);
          return existingSession;
        }
      }
      
      // Check session limits and evict if needed
      if (this.sessions.size >= (this.config.maxSessions || 50)) {
        const evicted = await this.evictOldestSession();
        if (!evicted) {
          console.error('[LocalStorageProvider] Unable to evict sessions, at maximum capacity');
          throw new Error('Maximum session capacity reached');
        }
      }
      
      // Get tab name
      const projectCount = this.projectSessions.get(params.projectId)?.size || 0;
      const counter = (this.sessionCounters.get(params.projectId) || 0) + 1;
      this.sessionCounters.set(params.projectId, counter);
      
      // Create session
      const session = this.createDefaultSession(params);
      session.tabName = `Terminal ${counter}`;
      
      // Store in memory
      this.sessions.set(session.id, session);
      
      // Update project mapping
      if (!this.projectSessions.has(params.projectId)) {
        this.projectSessions.set(params.projectId, new Set());
      }
      this.projectSessions.get(params.projectId)!.add(session.id);
      
      // Auto-focus if under limit and requested
      const autoFocus = params.metadata?.autoFocus !== false;
      if (autoFocus && projectFocused.size < this.maxFocusedPerProject) {
        await this.setSessionFocus(session.id, true);
      }
      
      // Mark as dirty for persistence
      this.isDirty = true;
      
      // Emit event
      this.emitStorageEvent('session:created', session);
      
      this.log('info', `Created session ${session.id} for project ${params.projectId}`);
      
      // CRITICAL FIX: Log session count to detect loops
      const projectSessionCount = this.projectSessions.get(params.projectId)?.size || 0;
      if (projectSessionCount > 100) {
        console.error(`[LocalStorageProvider] WARNING: Project ${params.projectId} has ${projectSessionCount} sessions!`);
      }
      
      return session;
    });
  }
  
  /**
   * Get a session by ID
   */
  public async getSession(sessionId: string): Promise<TerminalSession | null> {
    return this.trackOperation('read', async () => {
      const session = this.sessions.get(sessionId);
      
      if (session) {
        this.metrics.cacheHits++;
        // Update activity
        this.sessionActivity.set(sessionId, new Date());
      } else {
        this.metrics.cacheMisses++;
      }
      
      return session || null;
    });
  }
  
  /**
   * Update a session
   */
  public async updateSession(sessionId: string, data: Partial<TerminalSession>): Promise<void> {
    return this.trackOperation('write', async () => {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Update session
      Object.assign(session, data, {
        updatedAt: new Date()
      });
      
      // Update activity
      this.sessionActivity.set(sessionId, new Date());
      
      // Mark as dirty
      this.isDirty = true;
      
      // Emit event
      this.emitStorageEvent('session:updated', { sessionId, changes: data });
    });
  }
  
  /**
   * Delete a session
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    return this.trackOperation('delete', async () => {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return false;
      }
      
      // Don't delete active or focused sessions
      if (session.status === 'active' || session.status === 'connecting' || session.isFocused) {
        this.log('warn', `Cannot delete active/focused session ${sessionId}`);
        return false;
      }
      
      // Remove from all maps
      this.sessions.delete(sessionId);
      this.sessionActivity.delete(sessionId);
      this.suspendedStates.delete(sessionId);
      
      // Remove from project mapping
      const projectSessions = this.projectSessions.get(session.projectId);
      if (projectSessions) {
        projectSessions.delete(sessionId);
        if (projectSessions.size === 0) {
          this.projectSessions.delete(session.projectId);
          this.sessionCounters.delete(session.projectId);
        }
      }
      
      // Remove from focused sessions
      const projectFocused = this.focusedSessions.get(session.projectId);
      if (projectFocused) {
        projectFocused.delete(sessionId);
      }
      
      // Mark as dirty
      this.isDirty = true;
      
      // Emit event
      this.emitStorageEvent('session:deleted', sessionId);
      
      this.log('info', `Deleted session ${sessionId}`);
      return true;
    });
  }
  
  /**
   * List sessions for a project
   */
  public async listSessions(projectId: string, options?: ListOptions): Promise<TerminalSession[]> {
    return this.trackOperation('read', async () => {
      const sessionIds = this.projectSessions.get(projectId);
      
      if (!sessionIds || sessionIds.size === 0) {
        return [];
      }
      
      const sessions: TerminalSession[] = [];
      for (const sessionId of sessionIds) {
        const session = this.sessions.get(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
      
      return this.applyListOptions(sessions, options);
    });
  }
  
  /**
   * Bulk update sessions
   */
  public async bulkUpdate(updates: SessionUpdate[]): Promise<void> {
    return this.trackOperation('write', async () => {
      for (const update of updates) {
        await this.updateSession(update.sessionId, update.data);
      }
    });
  }
  
  /**
   * Bulk delete sessions
   */
  public async bulkDelete(sessionIds: string[]): Promise<number> {
    return this.trackOperation('delete', async () => {
      let deleted = 0;
      
      for (const sessionId of sessionIds) {
        if (await this.deleteSession(sessionId)) {
          deleted++;
        }
      }
      
      return deleted;
    });
  }
  
  /**
   * Set session focus
   */
  public async setSessionFocus(sessionId: string, focused: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const projectId = session.projectId;
    
    // Initialize focused set if needed
    if (!this.focusedSessions.has(projectId)) {
      this.focusedSessions.set(projectId, new Set());
    }
    
    const projectFocused = this.focusedSessions.get(projectId)!;
    
    if (focused) {
      // Check limit and evict if needed
      if (projectFocused.size >= this.maxFocusedPerProject && !projectFocused.has(sessionId)) {
        const leastActive = this.getLeastActiveSession(projectFocused);
        if (leastActive) {
          await this.setSessionFocus(leastActive, false);
        }
      }
      
      projectFocused.add(sessionId);
      session.isFocused = true;
    } else {
      projectFocused.delete(sessionId);
      session.isFocused = false;
    }
    
    // Update activity
    this.sessionActivity.set(sessionId, new Date());
    session.updatedAt = new Date();
    
    // Mark as dirty
    this.isDirty = true;
    
    this.log('info', `Session ${sessionId} focus: ${focused}`);
  }
  
  /**
   * Get focused sessions for a project
   */
  public async getFocusedSessions(projectId: string): Promise<string[]> {
    const focused = this.focusedSessions.get(projectId);
    return focused ? Array.from(focused) : [];
  }
  
  /**
   * Suspend a session
   */
  public async suspendSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Create suspension state
    const suspensionState: SuspensionState = {
      suspendedAt: new Date(),
      bufferedOutput: session.output || [],
      cursorPosition: { row: 0, col: 0 },
      workingDirectory: session.currentPath,
      environmentSnapshot: session.environment || {}
    };
    
    // Store suspension state
    this.suspendedStates.set(sessionId, suspensionState);
    
    // Update session status
    session.status = 'suspended';
    session.updatedAt = new Date();
    
    // Mark as dirty
    this.isDirty = true;
    
    // Emit event
    this.emitStorageEvent('session:suspended', sessionId);
    
    this.log('info', `Suspended session ${sessionId}`);
  }
  
  /**
   * Resume a session
   */
  public async resumeSession(sessionId: string): Promise<ResumeResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`
      };
    }
    
    const suspensionState = this.suspendedStates.get(sessionId);
    
    if (!suspensionState) {
      return {
        success: false,
        error: `Session ${sessionId} was not suspended`
      };
    }
    
    // Resume session
    session.status = 'active';
    session.updatedAt = new Date();
    
    // Clear suspension state
    this.suspendedStates.delete(sessionId);
    
    // Mark as dirty
    this.isDirty = true;
    
    // Emit event
    this.emitStorageEvent('session:resumed', sessionId);
    
    this.log('info', `Resumed session ${sessionId}`);
    
    return {
      success: true,
      session,
      bufferedOutput: suspensionState.bufferedOutput.map(o => o.content)
    };
  }
  
  /**
   * Find sessions matching query
   */
  public async findSessions(query: SessionQuery): Promise<TerminalSession[]> {
    return this.trackOperation('read', async () => {
      const allSessions = Array.from(this.sessions.values());
      return this.applyQueryFilters(allSessions, query);
    });
  }
  
  /**
   * Count sessions matching query
   */
  public async countSessions(query?: SessionQuery): Promise<number> {
    if (!query) {
      return this.sessions.size;
    }
    
    const sessions = await this.findSessions(query);
    return sessions.length;
  }
  
  /**
   * Get least active session from a set
   */
  private getLeastActiveSession(sessionIds: Set<string>): string | null {
    let oldestTime = new Date();
    let oldestSession: string | null = null;
    
    for (const sessionId of sessionIds) {
      const activity = this.sessionActivity.get(sessionId);
      if (!activity || activity < oldestTime) {
        oldestTime = activity || new Date(0);
        oldestSession = sessionId;
      }
    }
    
    return oldestSession;
  }
  
  /**
   * Evict oldest session when limit reached
   */
  private async evictOldestSession(): Promise<boolean> {
    // CRITICAL FIX: Improved eviction logic
    // 1. First try to evict closed/error sessions
    let sessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'closed' || s.status === 'error')
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    
    if (sessions.length === 0) {
      // 2. Then try inactive sessions that are not focused
      sessions = Array.from(this.sessions.values())
        .filter(s => s.status === 'inactive' && !s.isFocused)
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    }
    
    if (sessions.length === 0) {
      // 3. Then try suspended sessions
      sessions = Array.from(this.sessions.values())
        .filter(s => s.status === 'suspended')
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    }
    
    if (sessions.length === 0) {
      // 4. Last resort: unfocused active sessions (but not recommended)
      sessions = Array.from(this.sessions.values())
        .filter(s => !s.isFocused && s.status !== 'connecting')
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    }
    
    if (sessions.length > 0) {
      const sessionToEvict = sessions[0];
      const deleted = await this.deleteSession(sessionToEvict.id);
      if (deleted) {
        this.log('info', `Evicted session ${sessionToEvict.id} (status: ${sessionToEvict.status}, focused: ${sessionToEvict.isFocused})`);
        return true;
      } else {
        this.log('warn', `Failed to evict session ${sessionToEvict.id}`);
        return false;
      }
    }
    
    this.log('warn', 'No sessions available for eviction');
    return false;
  }
  
  /**
   * Perform memory cleanup
   */
  private async performMemoryCleanup(): Promise<void> {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'closed' || session.status === 'error') {
        const age = now - session.updatedAt.getTime();
        if (age > timeout) {
          await this.deleteSession(sessionId);
        }
      }
    }
  }
  
  /**
   * Save sessions to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.config.persistToDisk) return;
    
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        projectSessions: Array.from(this.projectSessions.entries()).map(([k, v]) => [k, Array.from(v)]),
        focusedSessions: Array.from(this.focusedSessions.entries()).map(([k, v]) => [k, Array.from(v)]),
        sessionCounters: Array.from(this.sessionCounters.entries()),
        suspendedStates: Array.from(this.suspendedStates.entries())
      };
      
      const json = JSON.stringify(data, null, 2);
      const filePath = path.join(this.config.basePath!, 'sessions.json');
      
      await fs.mkdir(this.config.basePath!, { recursive: true });
      await fs.writeFile(filePath, json, 'utf-8');
      
      this.isDirty = false;
      this.log('info', `Saved ${this.sessions.size} sessions to disk`);
    } catch (error) {
      this.log('error', 'Failed to save sessions to disk', error);
    }
  }
  
  /**
   * Load sessions from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.config.persistToDisk) return;
    
    try {
      const filePath = path.join(this.config.basePath!, 'sessions.json');
      const json = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(json);
      
      // Restore sessions with Date parsing
      this.sessions = new Map(data.sessions.map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }
      ]));
      
      // Restore other maps
      this.projectSessions = new Map(data.projectSessions.map(([k, v]: [string, string[]]) => [k, new Set(v)]));
      this.focusedSessions = new Map(data.focusedSessions.map(([k, v]: [string, string[]]) => [k, new Set(v)]));
      this.sessionCounters = new Map(data.sessionCounters);
      this.suspendedStates = new Map(data.suspendedStates.map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          suspendedAt: new Date(v.suspendedAt)
        }
      ]));
      
      this.log('info', `Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      // File doesn't exist yet, that's okay
      if ((error as any).code !== 'ENOENT') {
        this.log('error', 'Failed to load sessions from disk', error);
      }
    }
  }
  
  /**
   * Flush any pending changes
   */
  public async flush(): Promise<void> {
    if (this.isDirty) {
      await this.saveToDisk();
    }
  }
  
  /**
   * Cleanup provider
   */
  public async cleanup(): Promise<void> {
    // Save final state
    await this.flush();
    
    // Clear timers
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    
    // Clear memory
    this.sessions.clear();
    this.projectSessions.clear();
    this.focusedSessions.clear();
    this.sessionActivity.clear();
    this.suspendedStates.clear();
    
    await super.cleanup();
  }
}