/**
 * Database Storage Provider
 * ใช้ Prisma ORM สำหรับจัดเก็บ session ใน PostgreSQL
 * รองรับการ persist ข้อมูลระยะยาวและ scalability สูง
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import {
  TerminalSession,
  SessionCreateParams,
  ListOptions,
  SessionQuery,
  SessionUpdate,
  ResumeResult,
  DatabaseStorageConfig,
  SuspensionState,
  TerminalStatus,
  TerminalMode
} from '../interfaces/ITerminalStorageService';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Database Storage Provider Implementation
 * ใช้ PostgreSQL ผ่าน Prisma ORM พร้อม connection pooling และ caching
 */
export class DatabaseStorageProvider extends BaseStorageProvider {
  private prisma: PrismaClient;
  private readonly config: DatabaseStorageConfig;
  
  // Cache layer สำหรับเพิ่มประสิทธิภาพ
  private cache: Map<string, { session: TerminalSession; timestamp: number }> = new Map();
  private focusedCache: Map<string, Set<string>> = new Map();
  
  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 วินาที
  
  constructor(config: DatabaseStorageConfig) {
    super('DATABASE');
    
    this.config = {
      connectionString: config.connectionString,
      poolSize: config.poolSize || 10,
      timeout: config.timeout || 5000,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 300000 // 5 นาที
    };
    
    // Initialize Prisma client ด้วย connection pooling
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.connectionString
        }
      },
      log: ['error', 'warn']
    });
    
    this.initialize();
  }
  
  /**
   * Initialize database provider
   */
  private async initialize(): Promise<void> {
    this.log('info', 'กำลังเริ่มต้น DatabaseStorageProvider', {
      poolSize: this.config.poolSize,
      cacheEnabled: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL
    });
    
    // ทดสอบการเชื่อมต่อ
    try {
      await this.prisma.$connect();
      this.log('info', 'เชื่อมต่อ database สำเร็จ');
      
      // ตั้งค่า cache cleanup
      if (this.config.cacheEnabled) {
        setInterval(() => this.cleanupCache(), 60000); // ทุก 1 นาที
      }
    } catch (error) {
      this.log('error', 'ไม่สามารถเชื่อมต่อ database', error);
      throw error;
    }
  }
  
  /**
   * สร้าง session ใหม่
   */
  public async createSession(params: SessionCreateParams): Promise<TerminalSession> {
    return this.trackOperation('write', async () => {
      this.validateSessionParams(params);
      
      const session = this.createDefaultSession(params);
      
      // บันทึกลง database พร้อม retry logic
      const dbSession = await this.retryOperation(async () => {
        return await this.prisma.terminalSession.create({
          data: {
            id: session.id,
            projectId: session.projectId,
            userId: session.userId,
            type: session.type,
            mode: session.mode,
            tabName: session.tabName,
            status: session.status,
            active: session.active,
            isFocused: session.isFocused,
            currentPath: session.currentPath,
            wsConnected: session.wsConnected,
            metadata: session.metadata as any,
            environment: session.environment as any
          }
        });
      });
      
      // แปลงเป็น TerminalSession type
      const result = this.mapDbToSession(dbSession);
      
      // เพิ่มใน cache
      if (this.config.cacheEnabled) {
        this.addToCache(result.id, result);
      }
      
      // Emit event
      this.emitStorageEvent('session:created', result);
      
      this.log('info', `สร้าง session ${result.id} สำหรับ project ${params.projectId}`);
      return result;
    });
  }
  
  /**
   * ดึงข้อมูล session ตาม ID
   */
  public async getSession(sessionId: string): Promise<TerminalSession | null> {
    return this.trackOperation('read', async () => {
      // ตรวจสอบ cache ก่อน
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(sessionId);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
        this.metrics.cacheMisses++;
      }
      
      // Query จาก database
      const dbSession = await this.retryOperation(async () => {
        return await this.prisma.terminalSession.findUnique({
          where: { id: sessionId },
          include: {
            output: {
              orderBy: { timestamp: 'asc' },
              take: 100 // จำกัดจำนวน output
            },
            commands: {
              orderBy: { timestamp: 'desc' },
              take: 50 // จำกัดจำนวน commands
            }
          }
        });
      });
      
      if (!dbSession) {
        return null;
      }
      
      const session = this.mapDbToSession(dbSession);
      
      // เพิ่มใน cache
      if (this.config.cacheEnabled) {
        this.addToCache(sessionId, session);
      }
      
      return session;
    });
  }
  
  /**
   * อัพเดท session
   */
  public async updateSession(sessionId: string, data: Partial<TerminalSession>): Promise<void> {
    return this.trackOperation('write', async () => {
      // อัพเดทใน database
      await this.retryOperation(async () => {
        return await this.prisma.terminalSession.update({
          where: { id: sessionId },
          data: {
            ...this.mapSessionToDb(data),
            updatedAt: new Date()
          }
        });
      });
      
      // ล้าง cache
      if (this.config.cacheEnabled) {
        this.cache.delete(sessionId);
      }
      
      // Emit event
      this.emitStorageEvent('session:updated', { sessionId, changes: data });
    });
  }
  
  /**
   * ลบ session
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    return this.trackOperation('delete', async () => {
      try {
        // ลบ related data ก่อน
        await this.prisma.$transaction([
          this.prisma.terminalOutput.deleteMany({ where: { sessionId } }),
          this.prisma.terminalCommand.deleteMany({ where: { sessionId } }),
          this.prisma.terminalSession.delete({ where: { id: sessionId } })
        ]);
        
        // ล้าง cache
        if (this.config.cacheEnabled) {
          this.cache.delete(sessionId);
        }
        
        // Emit event
        this.emitStorageEvent('session:deleted', sessionId);
        
        this.log('info', `ลบ session ${sessionId} สำเร็จ`);
        return true;
      } catch (error) {
        if ((error as any).code === 'P2025') {
          // Record not found
          return false;
        }
        throw error;
      }
    });
  }
  
  /**
   * แสดงรายการ sessions ของ project
   */
  public async listSessions(projectId: string, options?: ListOptions): Promise<TerminalSession[]> {
    return this.trackOperation('read', async () => {
      const where: Prisma.TerminalSessionWhereInput = {
        projectId,
        status: options?.includeInactive ? undefined : {
          notIn: ['closed', 'error'] as TerminalStatus[]
        }
      };
      
      const orderBy: Prisma.TerminalSessionOrderByWithRelationInput = {};
      const field = options?.orderBy || 'createdAt';
      orderBy[field] = options?.orderDirection || 'asc';
      
      const dbSessions = await this.retryOperation(async () => {
        return await this.prisma.terminalSession.findMany({
          where,
          orderBy,
          skip: options?.offset,
          take: options?.limit
        });
      });
      
      return dbSessions.map(s => this.mapDbToSession(s));
    });
  }
  
  /**
   * Bulk update sessions
   */
  public async bulkUpdate(updates: SessionUpdate[]): Promise<void> {
    return this.trackOperation('write', async () => {
      // ใช้ transaction สำหรับ consistency
      await this.prisma.$transaction(
        updates.map(update => 
          this.prisma.terminalSession.update({
            where: { id: update.sessionId },
            data: {
              ...this.mapSessionToDb(update.data),
              updatedAt: update.timestamp || new Date()
            }
          })
        )
      );
      
      // ล้าง cache ของ sessions ที่อัพเดท
      if (this.config.cacheEnabled) {
        updates.forEach(u => this.cache.delete(u.sessionId));
      }
    });
  }
  
  /**
   * Bulk delete sessions
   */
  public async bulkDelete(sessionIds: string[]): Promise<number> {
    return this.trackOperation('delete', async () => {
      const result = await this.prisma.terminalSession.deleteMany({
        where: { id: { in: sessionIds } }
      });
      
      // ล้าง cache
      if (this.config.cacheEnabled) {
        sessionIds.forEach(id => this.cache.delete(id));
      }
      
      return result.count;
    });
  }
  
  /**
   * ตั้งค่า focus ของ session
   */
  public async setSessionFocus(sessionId: string, focused: boolean): Promise<void> {
    await this.updateSession(sessionId, { isFocused: focused });
    
    // อัพเดท focus cache
    if (focused) {
      const session = await this.getSession(sessionId);
      if (session) {
        if (!this.focusedCache.has(session.projectId)) {
          this.focusedCache.set(session.projectId, new Set());
        }
        this.focusedCache.get(session.projectId)!.add(sessionId);
      }
    } else {
      // ลบจาก focus cache
      for (const [projectId, focused] of this.focusedCache) {
        focused.delete(sessionId);
      }
    }
  }
  
  /**
   * ดึง focused sessions ของ project
   */
  public async getFocusedSessions(projectId: string): Promise<string[]> {
    const sessions = await this.prisma.terminalSession.findMany({
      where: { projectId, isFocused: true },
      select: { id: true }
    });
    
    return sessions.map(s => s.id);
  }
  
  /**
   * Suspend session
   */
  public async suspendSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} ไม่พบ`);
    }
    
    // บันทึก suspension state
    await this.prisma.terminalSuspension.create({
      data: {
        sessionId,
        bufferedOutput: JSON.stringify(session.output || []),
        cursorRow: 0,
        cursorCol: 0,
        workingDirectory: session.currentPath,
        environment: session.environment as any
      }
    });
    
    // อัพเดท status
    await this.updateSession(sessionId, { status: 'suspended' });
    
    // Emit event
    this.emitStorageEvent('session:suspended', sessionId);
  }
  
  /**
   * Resume session
   */
  public async resumeSession(sessionId: string): Promise<ResumeResult> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} ไม่พบ`
      };
    }
    
    // ดึง suspension state
    const suspension = await this.prisma.terminalSuspension.findFirst({
      where: { sessionId },
      orderBy: { suspendedAt: 'desc' }
    });
    
    if (!suspension) {
      return {
        success: false,
        error: `Session ${sessionId} ไม่ได้ถูก suspend`
      };
    }
    
    // อัพเดท status
    await this.updateSession(sessionId, { status: 'active' });
    
    // ลบ suspension record
    await this.prisma.terminalSuspension.delete({
      where: { id: suspension.id }
    });
    
    // Emit event
    this.emitStorageEvent('session:resumed', sessionId);
    
    const bufferedOutput = JSON.parse(suspension.bufferedOutput as string) as any[];
    
    return {
      success: true,
      session,
      bufferedOutput: bufferedOutput.map(o => o.content)
    };
  }
  
  /**
   * ค้นหา sessions ตามเงื่อนไข
   */
  public async findSessions(query: SessionQuery): Promise<TerminalSession[]> {
    return this.trackOperation('read', async () => {
      const where: Prisma.TerminalSessionWhereInput = {};
      
      if (query.projectId) where.projectId = query.projectId;
      if (query.userId) where.userId = query.userId;
      if (query.mode) where.mode = query.mode;
      
      if (query.status) {
        where.status = Array.isArray(query.status) 
          ? { in: query.status }
          : query.status;
      }
      
      if (query.createdAfter) {
        where.createdAt = { gte: query.createdAfter };
      }
      
      if (query.createdBefore) {
        where.createdAt = { ...where.createdAt as any, lte: query.createdBefore };
      }
      
      const dbSessions = await this.retryOperation(async () => {
        return await this.prisma.terminalSession.findMany({ where });
      });
      
      return dbSessions.map(s => this.mapDbToSession(s));
    });
  }
  
  /**
   * นับจำนวน sessions
   */
  public async countSessions(query?: SessionQuery): Promise<number> {
    if (!query) {
      return await this.prisma.terminalSession.count();
    }
    
    const sessions = await this.findSessions(query);
    return sessions.length;
  }
  
  /**
   * Map database model to TerminalSession
   */
  private mapDbToSession(dbSession: any): TerminalSession {
    return {
      id: dbSession.id,
      projectId: dbSession.projectId,
      userId: dbSession.userId,
      type: dbSession.type as 'terminal',
      mode: dbSession.mode as TerminalMode,
      tabName: dbSession.tabName,
      status: dbSession.status as TerminalStatus,
      active: dbSession.active,
      isFocused: dbSession.isFocused,
      createdAt: dbSession.createdAt,
      updatedAt: dbSession.updatedAt,
      currentPath: dbSession.currentPath,
      wsConnected: dbSession.wsConnected,
      metadata: dbSession.metadata,
      output: dbSession.output?.map((o: any) => ({
        id: o.id,
        timestamp: o.timestamp,
        type: o.type,
        content: o.content
      })),
      commands: dbSession.commands?.map((c: any) => ({
        id: c.id,
        command: c.command,
        timestamp: c.timestamp,
        exitCode: c.exitCode,
        duration: c.duration,
        output: c.output
      })),
      environment: dbSession.environment
    };
  }
  
  /**
   * Map TerminalSession to database format
   */
  private mapSessionToDb(session: Partial<TerminalSession>): any {
    const dbData: any = {};
    
    if (session.status !== undefined) dbData.status = session.status;
    if (session.active !== undefined) dbData.active = session.active;
    if (session.isFocused !== undefined) dbData.isFocused = session.isFocused;
    if (session.currentPath !== undefined) dbData.currentPath = session.currentPath;
    if (session.wsConnected !== undefined) dbData.wsConnected = session.wsConnected;
    if (session.metadata !== undefined) dbData.metadata = session.metadata;
    if (session.environment !== undefined) dbData.environment = session.environment;
    if (session.tabName !== undefined) dbData.tabName = session.tabName;
    if (session.mode !== undefined) dbData.mode = session.mode;
    
    return dbData;
  }
  
  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      this.log('warn', `Operation failed, retrying... (${retries} retries left)`, error);
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      return this.retryOperation(operation, retries - 1);
    }
  }
  
  /**
   * เพิ่มข้อมูลใน cache
   */
  private addToCache(sessionId: string, session: TerminalSession): void {
    if (!this.config.cacheEnabled) return;
    
    this.cache.set(sessionId, {
      session,
      timestamp: Date.now()
    });
  }
  
  /**
   * ดึงข้อมูลจาก cache
   */
  private getFromCache(sessionId: string): TerminalSession | null {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(sessionId);
    if (!cached) return null;
    
    // ตรวจสอบ TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL!) {
      this.cache.delete(sessionId);
      return null;
    }
    
    return cached.session;
  }
  
  /**
   * ล้าง cache ที่หมดอายุ
   */
  private cleanupCache(): void {
    if (!this.config.cacheEnabled) return;
    
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [sessionId, cached] of this.cache) {
      if (now - cached.timestamp > this.config.cacheTTL!) {
        expired.push(sessionId);
      }
    }
    
    expired.forEach(id => this.cache.delete(id));
    
    if (expired.length > 0) {
      this.log('info', `ล้าง cache ${expired.length} sessions ที่หมดอายุ`);
    }
  }
  
  /**
   * Cleanup provider
   */
  public async cleanup(): Promise<void> {
    // ปิดการเชื่อมต่อ database
    await this.prisma.$disconnect();
    
    // ล้าง cache
    this.cache.clear();
    this.focusedCache.clear();
    
    await super.cleanup();
    
    this.log('info', 'ปิด DatabaseStorageProvider สำเร็จ');
  }
}