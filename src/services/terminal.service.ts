/**
 * Unified Terminal Service - Clean Architecture Implementation
 * This service manages all terminal sessions with a single source of truth
 * Part of Terminal Management System Redesign - Phase 1
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/utils/logger';
import { prisma } from '@/core/database/prisma';
import { buildWebSocketUrl, getWebSocketConfig } from '@/utils/websocket';
import { config } from '@/config/app.config';

// Terminal session types
export type TerminalType = 'system' | 'claude';
export type TerminalStatus = 'active' | 'inactive' | 'error' | 'connecting';
export type FocusMode = 'active' | 'background';

// Terminal session interface
export interface TerminalSession {
  id: string;
  projectId: string;
  type: TerminalType;
  tabName: string;
  status: TerminalStatus;
  focused: boolean;
  createdAt: Date;
  lastActivity: Date;
  currentPath: string;
  pid: number | null;
  wsUrl: string;
}

// Session metadata for monitoring
export interface SessionMetadata {
  commandCount: number;
  errorCount: number;
  outputLines: number;
  memoryUsage: number;
  cpuTime: number;
}

// WebSocket connection tracking
interface WebSocketConnection {
  sessionId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: Date;
  reconnectAttempts: number;
}

// Create terminal request
export interface CreateTerminalRequest {
  projectId: string;
  type: TerminalType;
  tabName?: string;
  projectPath: string;
}

// Create terminal response
export interface CreateTerminalResponse {
  sessionId: string;
  projectId: string;
  type: TerminalType;
  tabName: string;
  status: 'created' | 'error';
  wsUrl: string;
}

// Focus terminal request
export interface FocusTerminalRequest {
  sessionId: string;
  projectId: string;
  type: TerminalType;
}

// Focus terminal response
export interface FocusTerminalResponse {
  sessionId: string;
  previousFocus: string | null;
  bufferedOutput?: string[];
}

/**
 * Unified Terminal Service - Single source of truth for all terminal operations
 */
export class TerminalService extends EventEmitter {
  private static instance: TerminalService;
  
  // Project-based session organization
  private sessions: Map<string, Map<string, TerminalSession>> = new Map();
  
  // Focus tracking per project
  private focusedSessions: Map<string, { system: string | null; claude: string | null }> = new Map();
  
  // WebSocket connection tracking
  private connections: Map<string, WebSocketConnection> = new Map();
  
  // Output buffers for unfocused sessions
  private buffers: Map<string, string[]> = new Map();
  
  // Session metadata
  private metadata: Map<string, SessionMetadata> = new Map();
  
  // Configuration
  private readonly MAX_BUFFER_SIZE = 500; // lines
  private readonly MAX_SESSIONS_PER_PROJECT = 10;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  
  private constructor() {
    super();
    this.initializeService();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }
  
  /**
   * Initialize service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load existing sessions from database
      await this.loadSessionsFromDatabase();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start cleanup scheduler
      this.startCleanupScheduler();
      
      logger.info('TerminalService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TerminalService:', error);
    }
  }
  
  /**
   * Load sessions from database on startup
   */
  private async loadSessionsFromDatabase(): Promise<void> {
    try {
      const dbSessions = await prisma.terminalSession.findMany({
        where: {
          status: 'active'
        }
      });
      
      for (const dbSession of dbSessions) {
        const session: TerminalSession = {
          id: dbSession.id,
          projectId: dbSession.projectId,
          type: dbSession.type as TerminalType,
          tabName: dbSession.tabName,
          status: 'inactive', // Mark as inactive until reconnected
          focused: false,
          createdAt: dbSession.createdAt,
          lastActivity: dbSession.updatedAt,
          currentPath: dbSession.currentPath || '',
          pid: null,
          wsUrl: this.getWebSocketUrl(dbSession.type as TerminalType)
        };
        
        this.addSessionToMaps(session);
      }
      
      logger.info(`Loaded ${dbSessions.length} sessions from database`);
    } catch (error) {
      logger.error('Failed to load sessions from database:', error);
    }
  }
  
  /**
   * Create new terminal session
   */
  public async createSession(request: CreateTerminalRequest): Promise<CreateTerminalResponse> {
    try {
      // Validate project exists
      const project = await prisma.project.findUnique({
        where: { id: request.projectId }
      });
      
      if (!project) {
        throw new Error(`Project ${request.projectId} not found`);
      }
      
      // Check session limit
      const projectSessions = this.sessions.get(request.projectId);
      if (projectSessions && projectSessions.size >= this.MAX_SESSIONS_PER_PROJECT) {
        throw new Error(`Maximum sessions (${this.MAX_SESSIONS_PER_PROJECT}) reached for project`);
      }
      
      // Generate session ID
      const sessionId = this.generateSessionId();
      const tabName = request.tabName || `${request.type}-${Date.now()}`;
      const wsUrl = this.getWebSocketUrl(request.type);
      
      // Create session object
      const session: TerminalSession = {
        id: sessionId,
        projectId: request.projectId,
        type: request.type,
        tabName,
        status: 'connecting',
        focused: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        currentPath: request.projectPath,
        pid: null,
        wsUrl
      };
      
      // Add to maps
      this.addSessionToMaps(session);
      
      // Initialize metadata
      this.metadata.set(sessionId, {
        commandCount: 0,
        errorCount: 0,
        outputLines: 0,
        memoryUsage: 0,
        cpuTime: 0
      });
      
      // Persist to database
      await this.persistSessionToDatabase(session);
      
      // Emit session created event
      this.emit('sessionCreated', session);
      
      logger.info(`Created terminal session ${sessionId} for project ${request.projectId}`);
      
      return {
        sessionId,
        projectId: request.projectId,
        type: request.type,
        tabName,
        status: 'created',
        wsUrl
      };
    } catch (error) {
      logger.error('Failed to create terminal session:', error);
      throw error;
    }
  }
  
  /**
   * List sessions for a project
   */
  public async listSessions(projectId: string): Promise<{
    sessions: TerminalSession[];
    focused: { system: string | null; claude: string | null };
  }> {
    const projectSessions = this.sessions.get(projectId);
    const sessions = projectSessions ? Array.from(projectSessions.values()) : [];
    const focused = this.focusedSessions.get(projectId) || { system: null, claude: null };
    
    return { sessions, focused };
  }
  
  /**
   * Set focused terminal for a project
   */
  public async setFocusedSession(request: FocusTerminalRequest): Promise<FocusTerminalResponse> {
    const { sessionId, projectId, type } = request;
    
    // Get current focus state
    const currentFocus = this.focusedSessions.get(projectId) || { system: null, claude: null };
    const previousFocus = currentFocus[type];
    
    // Update focus
    currentFocus[type] = sessionId;
    this.focusedSessions.set(projectId, currentFocus);
    
    // Update session objects
    if (previousFocus) {
      const prevSession = this.getSession(projectId, previousFocus);
      if (prevSession) {
        prevSession.focused = false;
        this.emit('sessionBlurred', prevSession);
      }
    }
    
    const newSession = this.getSession(projectId, sessionId);
    if (newSession) {
      newSession.focused = true;
      newSession.lastActivity = new Date();
      this.emit('sessionFocused', newSession);
    }
    
    // Get buffered output for the newly focused session
    const bufferedOutput = this.flushBuffer(sessionId);
    
    logger.info(`Focus changed for project ${projectId}: ${type} = ${sessionId}`);
    
    return {
      sessionId,
      previousFocus,
      bufferedOutput: bufferedOutput.length > 0 ? bufferedOutput : undefined
    };
  }
  
  /**
   * Close a terminal session
   */
  public async closeSession(sessionId: string): Promise<{
    sessionId: string;
    status: 'closed' | 'error';
    newFocus?: string;
  }> {
    try {
      // Find session across all projects
      let session: TerminalSession | null = null;
      let projectId: string | null = null;
      
      for (const [pid, projectSessions] of this.sessions) {
        if (projectSessions.has(sessionId)) {
          session = projectSessions.get(sessionId)!;
          projectId = pid;
          break;
        }
      }
      
      if (!session || !projectId) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Remove from maps
      const projectSessions = this.sessions.get(projectId)!;
      projectSessions.delete(sessionId);
      
      // Clear focus if this was the focused session
      const currentFocus = this.focusedSessions.get(projectId);
      let newFocus: string | undefined;
      
      if (currentFocus) {
        if (currentFocus.system === sessionId) {
          currentFocus.system = null;
          // Auto-focus next available system terminal
          const nextSystem = Array.from(projectSessions.values())
            .find(s => s.type === 'system');
          if (nextSystem) {
            currentFocus.system = nextSystem.id;
            newFocus = nextSystem.id;
          }
        }
        if (currentFocus.claude === sessionId) {
          currentFocus.claude = null;
          // Auto-focus next available claude terminal
          const nextClaude = Array.from(projectSessions.values())
            .find(s => s.type === 'claude');
          if (nextClaude) {
            currentFocus.claude = nextClaude.id;
            newFocus = nextClaude.id;
          }
        }
      }
      
      // Clean up resources
      this.connections.delete(sessionId);
      this.buffers.delete(sessionId);
      this.metadata.delete(sessionId);
      
      // Update database
      await prisma.terminalSession.update({
        where: { id: sessionId },
        data: { status: 'closed', updatedAt: new Date() }
      });
      
      // Emit session closed event
      this.emit('sessionClosed', session);
      
      logger.info(`Closed terminal session ${sessionId}`);
      
      return {
        sessionId,
        status: 'closed',
        newFocus
      };
    } catch (error) {
      logger.error(`Failed to close session ${sessionId}:`, error);
      return {
        sessionId,
        status: 'error'
      };
    }
  }
  
  /**
   * Clean up all sessions for a project
   */
  public async cleanupProjectSessions(projectId: string): Promise<{
    closedCount: number;
    errors: string[];
  }> {
    const projectSessions = this.sessions.get(projectId);
    if (!projectSessions) {
      return { closedCount: 0, errors: [] };
    }
    
    let closedCount = 0;
    const errors: string[] = [];
    
    for (const sessionId of projectSessions.keys()) {
      try {
        await this.closeSession(sessionId);
        closedCount++;
      } catch (error) {
        errors.push(`Failed to close session ${sessionId}: ${error}`);
      }
    }
    
    // Clear project from maps
    this.sessions.delete(projectId);
    this.focusedSessions.delete(projectId);
    
    return { closedCount, errors };
  }
  
  /**
   * Get system health status
   */
  public getHealthStatus(): {
    system: {
      status: 'connected' | 'disconnected';
      activeSessions: number;
      port: number;
    };
    claude: {
      status: 'connected' | 'disconnected';
      activeSessions: number;
      port: number;
    };
  } {
    let systemCount = 0;
    let claudeCount = 0;
    
    for (const projectSessions of this.sessions.values()) {
      for (const session of projectSessions.values()) {
        if (session.type === 'system' && session.status === 'active') {
          systemCount++;
        } else if (session.type === 'claude' && session.status === 'active') {
          claudeCount++;
        }
      }
    }
    
    const wsConfig = getWebSocketConfig();
    return {
      system: {
        status: systemCount > 0 ? 'connected' : 'disconnected',
        activeSessions: systemCount,
        port: wsConfig.system.port
      },
      claude: {
        status: claudeCount > 0 ? 'connected' : 'disconnected',
        activeSessions: claudeCount,
        port: wsConfig.claude.port
      }
    };
  }
  
  /**
   * Handle terminal output (for streaming optimization)
   */
  public handleTerminalOutput(sessionId: string, data: string): void {
    // Find session
    let session: TerminalSession | null = null;
    
    for (const projectSessions of this.sessions.values()) {
      if (projectSessions.has(sessionId)) {
        session = projectSessions.get(sessionId)!;
        break;
      }
    }
    
    if (!session) {
      logger.warn(`Session ${sessionId} not found for output handling`);
      return;
    }
    
    // Update metadata
    const meta = this.metadata.get(sessionId);
    if (meta) {
      meta.outputLines++;
    }
    
    // Check if session is focused
    if (session.focused) {
      // Emit output immediately for focused session
      this.emit('terminalOutput', { sessionId, data, mode: 'realtime' });
    } else {
      // Buffer output for unfocused session
      this.addToBuffer(sessionId, data);
    }
    
    // Update last activity
    session.lastActivity = new Date();
  }
  
  /**
   * Update connection status
   */
  public updateConnectionStatus(sessionId: string, status: 'connected' | 'disconnected' | 'error'): void {
    const connection = this.connections.get(sessionId) || {
      sessionId,
      status,
      lastPing: new Date(),
      reconnectAttempts: 0
    };
    
    connection.status = status;
    connection.lastPing = new Date();
    
    if (status === 'error') {
      connection.reconnectAttempts++;
    } else if (status === 'connected') {
      connection.reconnectAttempts = 0;
    }
    
    this.connections.set(sessionId, connection);
    
    // Update session status
    for (const projectSessions of this.sessions.values()) {
      if (projectSessions.has(sessionId)) {
        const session = projectSessions.get(sessionId)!;
        session.status = status === 'connected' ? 'active' : 
                        status === 'error' ? 'error' : 'inactive';
        break;
      }
    }
  }
  
  // ========== Private Helper Methods ==========
  
  private generateSessionId(): string {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getWebSocketUrl(type: TerminalType): string {
    return buildWebSocketUrl(type);
  }
  
  private addSessionToMaps(session: TerminalSession): void {
    if (!this.sessions.has(session.projectId)) {
      this.sessions.set(session.projectId, new Map());
    }
    this.sessions.get(session.projectId)!.set(session.id, session);
  }
  
  private getSession(projectId: string, sessionId: string): TerminalSession | null {
    const projectSessions = this.sessions.get(projectId);
    return projectSessions ? projectSessions.get(sessionId) || null : null;
  }
  
  private async persistSessionToDatabase(session: TerminalSession): Promise<void> {
    try {
      await prisma.terminalSession.create({
        data: {
          id: session.id,
          projectId: session.projectId,
          type: session.type,
          tabName: session.tabName,
          status: 'active',
          currentPath: session.currentPath
        }
      });
    } catch (error) {
      logger.error('Failed to persist session to database:', error);
      // Continue operation even if persistence fails
    }
  }
  
  private addToBuffer(sessionId: string, data: string): void {
    const buffer = this.buffers.get(sessionId) || [];
    buffer.push(data);
    
    // Trim buffer if it exceeds max size
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.splice(0, buffer.length - this.MAX_BUFFER_SIZE);
    }
    
    this.buffers.set(sessionId, buffer);
  }
  
  private flushBuffer(sessionId: string): string[] {
    const buffer = this.buffers.get(sessionId) || [];
    this.buffers.delete(sessionId);
    return buffer;
  }
  
  private startHealthMonitoring(): void {
    setInterval(() => {
      // Check connection health
      for (const [sessionId, connection] of this.connections) {
        const timeSinceLastPing = Date.now() - connection.lastPing.getTime();
        if (timeSinceLastPing > 60000 && connection.status === 'connected') {
          // Mark as disconnected if no ping for 60 seconds
          this.updateConnectionStatus(sessionId, 'disconnected');
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  private startCleanupScheduler(): void {
    setInterval(() => {
      // Clean up inactive sessions
      const now = Date.now();
      
      for (const projectSessions of this.sessions.values()) {
        for (const session of projectSessions.values()) {
          const timeSinceActivity = now - session.lastActivity.getTime();
          if (timeSinceActivity > this.SESSION_TIMEOUT_MS && session.status === 'inactive') {
            // Auto-close inactive sessions after timeout
            this.closeSession(session.id).catch(error => {
              logger.error(`Failed to auto-close session ${session.id}:`, error);
            });
          }
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
}

// Export singleton instance
export const terminalService = TerminalService.getInstance();