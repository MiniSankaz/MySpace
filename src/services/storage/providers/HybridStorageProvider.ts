/**
 * Hybrid Storage Provider
 * รวมข้อดีของ Local (ความเร็ว) และ Database (persistence)
 * ใช้ Local เป็นหลัก และ sync ไป Database แบบ async
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { DatabaseStorageProvider } from './DatabaseStorageProvider';
import {
  TerminalSession,
  SessionCreateParams,
  ListOptions,
  SessionQuery,
  SessionUpdate,
  ResumeResult,
  StorageInfo,
  HealthStatus,
  LocalStorageConfig,
  DatabaseStorageConfig,
  HybridStorageConfig
} from '../interfaces/ITerminalStorageService';

/**
 * Sync Queue Item
 */
interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  sessionId: string;
  data?: any;
  timestamp: Date;
  retries: number;
}

/**
 * Hybrid Storage Provider Implementation
 * Local-first พร้อม async sync ไป Database
 */
export class HybridStorageProvider extends BaseStorageProvider {
  private localProvider: LocalStorageProvider;
  private dbProvider: DatabaseStorageProvider;
  private readonly config: HybridStorageConfig;
  
  // Sync queue และ state
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private syncInProgress = false;
  private syncTimer?: NodeJS.Timeout;
  private lastSyncTime = new Date();
  
  // Conflict tracking
  private conflicts: Map<string, { local: any; remote: any; timestamp: Date }> = new Map();
  
  // Loop detection
  private creationTimestamps = new Map<string, number>();
  private readonly MAX_CREATIONS_PER_MINUTE = 10;
  
  constructor(
    localConfig?: LocalStorageConfig,
    dbConfig?: DatabaseStorageConfig,
    hybridConfig?: HybridStorageConfig
  ) {
    super('HYBRID');
    
    this.config = {
      syncStrategy: hybridConfig?.syncStrategy || 'eventual',
      syncInterval: hybridConfig?.syncInterval || 30000, // 30 วินาที
      conflictResolution: hybridConfig?.conflictResolution || 'latest-wins',
      maxSyncBatch: hybridConfig?.maxSyncBatch || 10
    };
    
    // สร้าง providers
    this.localProvider = new LocalStorageProvider(localConfig);
    this.dbProvider = new DatabaseStorageProvider(dbConfig!);
    
    this.initialize();
  }
  
  /**
   * Initialize hybrid provider
   */
  private async initialize(): Promise<void> {
    this.log('info', 'กำลังเริ่มต้น HybridStorageProvider', this.config);
    
    // เริ่ม sync ตาม strategy
    if (this.config.syncStrategy !== 'manual') {
      this.startSyncTimer();
    }
    
    // โหลด sessions จาก database ครั้งแรก
    await this.initialSync();
  }
  
  /**
   * Initial sync จาก database
   */
  private async initialSync(): Promise<void> {
    try {
      this.log('info', 'กำลังทำ initial sync จาก database...');
      
      // ดึง sessions ทั้งหมดจาก database
      const dbSessions = await this.dbProvider.findSessions({});
      
      // CRITICAL FIX: Limit initial sync to prevent memory issues
      const MAX_INITIAL_SYNC = 50;
      const sessionsToSync = dbSessions.slice(0, MAX_INITIAL_SYNC);
      
      if (dbSessions.length > MAX_INITIAL_SYNC) {
        this.log('warn', `Limiting initial sync to ${MAX_INITIAL_SYNC} out of ${dbSessions.length} sessions`);
      }
      
      // โหลดเข้า local storage
      for (const session of sessionsToSync) {
        const localSession = await this.localProvider.getSession(session.id);
        
        if (!localSession) {
          // Check if this is a duplicate/migrated session
          if (session.metadata?.legacyId || session.metadata?.migratedFrom) {
            this.log('info', `Skipping migrated session ${session.id}`);
            continue;
          }
          
          // ไม่มีใน local, เพิ่มเข้าไป
          await this.localProvider.createSession({
            projectId: session.projectId,
            projectPath: session.currentPath,
            userId: session.userId,
            mode: session.mode,
            metadata: {
              ...session.metadata,
              syncedFromDb: true // Mark as synced to prevent loops
            }
          });
        } else {
          // มีอยู่แล้ว, ตรวจสอบ conflict
          this.checkConflict(localSession, session);
        }
      }
      
      this.log('info', `Initial sync สำเร็จ: โหลด ${sessionsToSync.length} sessions`);
    } catch (error) {
      this.log('error', 'Initial sync ล้มเหลว', error);
    }
  }
  
  /**
   * สร้าง session ใหม่
   */
  public async createSession(params: SessionCreateParams): Promise<TerminalSession> {
    // CRITICAL FIX: Loop detection
    const projectKey = `project_${params.projectId}`;
    const now = Date.now();
    const recentCreations = Array.from(this.creationTimestamps.entries())
      .filter(([key, time]) => key.startsWith(projectKey) && (now - time) < 60000);
    
    if (recentCreations.length >= this.MAX_CREATIONS_PER_MINUTE) {
      console.error(`[HybridStorageProvider] LOOP DETECTED: ${recentCreations.length} sessions created in last minute for project ${params.projectId}`);
      throw new Error('Too many sessions created. Possible infinite loop detected.');
    }
    
    // Track this creation
    const creationKey = `${projectKey}_${now}`;
    this.creationTimestamps.set(creationKey, now);
    
    // Clean old timestamps
    for (const [key, time] of this.creationTimestamps.entries()) {
      if (now - time > 60000) {
        this.creationTimestamps.delete(key);
      }
    }
    
    // สร้างใน local ก่อน (เร็ว)
    const session = await this.localProvider.createSession(params);
    
    // เพิ่มใน sync queue
    this.addToSyncQueue('create', session.id, session);
    
    // Sync ทันทีถ้าเป็น immediate strategy
    if (this.config.syncStrategy === 'immediate') {
      await this.syncSession(session.id, 'create', session);
    }
    
    return session;
  }
  
  /**
   * ดึงข้อมูล session
   */
  public async getSession(sessionId: string): Promise<TerminalSession | null> {
    // อ่านจาก local ก่อน (เร็ว)
    const localSession = await this.localProvider.getSession(sessionId);
    
    if (localSession) {
      return localSession;
    }
    
    // ถ้าไม่มีใน local, ลองดึงจาก database
    const dbSession = await this.dbProvider.getSession(sessionId);
    
    if (dbSession) {
      // Cache ไว้ใน local
      await this.localProvider.createSession({
        projectId: dbSession.projectId,
        projectPath: dbSession.currentPath,
        userId: dbSession.userId,
        mode: dbSession.mode,
        metadata: dbSession.metadata
      });
      
      return dbSession;
    }
    
    return null;
  }
  
  /**
   * อัพเดท session
   */
  public async updateSession(sessionId: string, data: Partial<TerminalSession>): Promise<void> {
    // อัพเดทใน local ก่อน
    await this.localProvider.updateSession(sessionId, data);
    
    // เพิ่มใน sync queue
    this.addToSyncQueue('update', sessionId, data);
    
    // Sync ทันทีถ้าเป็น immediate
    if (this.config.syncStrategy === 'immediate') {
      await this.syncSession(sessionId, 'update', data);
    }
  }
  
  /**
   * ลบ session
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    // ลบจาก local ก่อน
    const deleted = await this.localProvider.deleteSession(sessionId);
    
    if (deleted) {
      // เพิ่มใน sync queue
      this.addToSyncQueue('delete', sessionId);
      
      // Sync ทันทีถ้าเป็น immediate
      if (this.config.syncStrategy === 'immediate') {
        await this.syncSession(sessionId, 'delete');
      }
    }
    
    return deleted;
  }
  
  /**
   * แสดงรายการ sessions
   */
  public async listSessions(projectId: string, options?: ListOptions): Promise<TerminalSession[]> {
    // ใช้ local เป็นหลัก
    return this.localProvider.listSessions(projectId, options);
  }
  
  /**
   * Bulk update
   */
  public async bulkUpdate(updates: SessionUpdate[]): Promise<void> {
    // อัพเดทใน local
    await this.localProvider.bulkUpdate(updates);
    
    // เพิ่มทั้งหมดใน sync queue
    for (const update of updates) {
      this.addToSyncQueue('update', update.sessionId, update.data);
    }
    
    // Trigger sync ถ้าเป็น immediate
    if (this.config.syncStrategy === 'immediate') {
      await this.performSync();
    }
  }
  
  /**
   * Bulk delete
   */
  public async bulkDelete(sessionIds: string[]): Promise<number> {
    const deleted = await this.localProvider.bulkDelete(sessionIds);
    
    // เพิ่มใน sync queue
    for (const sessionId of sessionIds) {
      this.addToSyncQueue('delete', sessionId);
    }
    
    // Trigger sync ถ้าเป็น immediate
    if (this.config.syncStrategy === 'immediate') {
      await this.performSync();
    }
    
    return deleted;
  }
  
  /**
   * Set session focus
   */
  public async setSessionFocus(sessionId: string, focused: boolean): Promise<void> {
    await this.localProvider.setSessionFocus(sessionId, focused);
    
    // Sync focus state
    this.addToSyncQueue('update', sessionId, { isFocused: focused });
  }
  
  /**
   * Get focused sessions
   */
  public async getFocusedSessions(projectId: string): Promise<string[]> {
    return this.localProvider.getFocusedSessions(projectId);
  }
  
  /**
   * Suspend session
   */
  public async suspendSession(sessionId: string): Promise<void> {
    await this.localProvider.suspendSession(sessionId);
    
    // Sync suspension state
    this.addToSyncQueue('update', sessionId, { status: 'suspended' });
  }
  
  /**
   * Resume session
   */
  public async resumeSession(sessionId: string): Promise<ResumeResult> {
    const result = await this.localProvider.resumeSession(sessionId);
    
    if (result.success) {
      // Sync resume state
      this.addToSyncQueue('update', sessionId, { status: 'active' });
    }
    
    return result;
  }
  
  /**
   * Find sessions
   */
  public async findSessions(query: SessionQuery): Promise<TerminalSession[]> {
    // ใช้ local เป็นหลัก
    return this.localProvider.findSessions(query);
  }
  
  /**
   * Count sessions
   */
  public async countSessions(query?: SessionQuery): Promise<number> {
    return this.localProvider.countSessions(query);
  }
  
  /**
   * เพิ่มรายการใน sync queue
   */
  private addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    sessionId: string,
    data?: any
  ): void {
    const queueId = `${type}_${sessionId}_${Date.now()}`;
    
    this.syncQueue.set(queueId, {
      id: queueId,
      type,
      sessionId,
      data,
      timestamp: new Date(),
      retries: 0
    });
    
    this.log('info', `เพิ่มใน sync queue: ${type} ${sessionId}`);
  }
  
  /**
   * Sync session เดียว
   */
  private async syncSession(
    sessionId: string,
    type: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    try {
      switch (type) {
        case 'create':
          await this.dbProvider.createSession(data);
          break;
        
        case 'update':
          await this.dbProvider.updateSession(sessionId, data);
          break;
        
        case 'delete':
          await this.dbProvider.deleteSession(sessionId);
          break;
      }
      
      this.log('info', `Sync สำเร็จ: ${type} ${sessionId}`);
    } catch (error) {
      this.log('error', `Sync ล้มเหลว: ${type} ${sessionId}`, error);
      throw error;
    }
  }
  
  /**
   * ทำ sync จาก queue
   */
  private async performSync(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.size === 0) {
      return;
    }
    
    this.syncInProgress = true;
    this.log('info', `เริ่ม sync ${this.syncQueue.size} รายการ...`);
    
    const batch: SyncQueueItem[] = [];
    let count = 0;
    
    // เลือก batch ตามขนาดที่กำหนด
    for (const item of this.syncQueue.values()) {
      if (count >= (this.config.maxSyncBatch || 10)) break;
      batch.push(item);
      count++;
    }
    
    // Process batch
    let synced = 0;
    let failed = 0;
    
    for (const item of batch) {
      try {
        await this.syncSession(item.sessionId, item.type, item.data);
        this.syncQueue.delete(item.id);
        synced++;
      } catch (error) {
        item.retries++;
        
        if (item.retries >= 3) {
          // Max retries reached, log and remove
          this.log('error', `Sync failed permanently for ${item.sessionId}`, error);
          this.syncQueue.delete(item.id);
          
          // Track conflict if update
          if (item.type === 'update') {
            await this.handleSyncConflict(item.sessionId);
          }
        }
        
        failed++;
      }
    }
    
    this.lastSyncTime = new Date();
    this.syncInProgress = false;
    
    // Emit sync complete event
    this.emitStorageEvent('storage:sync-complete', { synced, conflicts: failed });
    
    this.log('info', `Sync เสร็จสิ้น: สำเร็จ ${synced}, ล้มเหลว ${failed}`);
  }
  
  /**
   * ตรวจสอบ conflict
   */
  private async checkConflict(local: TerminalSession, remote: TerminalSession): void {
    if (local.updatedAt.getTime() !== remote.updatedAt.getTime()) {
      this.conflicts.set(local.id, {
        local,
        remote,
        timestamp: new Date()
      });
      
      // แก้ไข conflict ตาม strategy
      await this.resolveConflict(local.id);
    }
  }
  
  /**
   * แก้ไข conflict
   */
  private async resolveConflict(sessionId: string): Promise<void> {
    const conflict = this.conflicts.get(sessionId);
    if (!conflict) return;
    
    let winner: TerminalSession;
    
    switch (this.config.conflictResolution) {
      case 'local-wins':
        winner = conflict.local;
        await this.dbProvider.updateSession(sessionId, winner);
        break;
      
      case 'database-wins':
        winner = conflict.remote;
        await this.localProvider.updateSession(sessionId, winner);
        break;
      
      case 'latest-wins':
      default:
        winner = conflict.local.updatedAt > conflict.remote.updatedAt
          ? conflict.local
          : conflict.remote;
        
        if (winner === conflict.local) {
          await this.dbProvider.updateSession(sessionId, winner);
        } else {
          await this.localProvider.updateSession(sessionId, winner);
        }
        break;
    }
    
    this.conflicts.delete(sessionId);
    this.log('info', `แก้ไข conflict สำหรับ ${sessionId} ด้วย ${this.config.conflictResolution}`);
  }
  
  /**
   * จัดการ sync conflict
   */
  private async handleSyncConflict(sessionId: string): Promise<void> {
    try {
      const local = await this.localProvider.getSession(sessionId);
      const remote = await this.dbProvider.getSession(sessionId);
      
      if (local && remote) {
        await this.checkConflict(local, remote);
      }
    } catch (error) {
      this.log('error', `ไม่สามารถจัดการ conflict สำหรับ ${sessionId}`, error);
    }
  }
  
  /**
   * เริ่ม sync timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(async () => {
      await this.performSync();
    }, this.config.syncInterval);
    
    this.log('info', `เริ่ม sync timer ทุก ${this.config.syncInterval}ms`);
  }
  
  /**
   * Force sync ด้วยตนเอง
   */
  public async sync(): Promise<void> {
    await this.performSync();
  }
  
  /**
   * Flush pending changes
   */
  public async flush(): Promise<void> {
    // Flush local provider
    await this.localProvider.flush();
    
    // Force sync ที่ค้างอยู่
    await this.performSync();
  }
  
  /**
   * Get storage info
   */
  public async getStorageInfo(): Promise<StorageInfo> {
    const localInfo = await this.localProvider.getStorageInfo();
    const dbInfo = await this.dbProvider.getStorageInfo();
    
    return {
      mode: 'HYBRID',
      sessionCount: localInfo.sessionCount,
      memoryUsage: localInfo.memoryUsage,
      diskUsage: dbInfo.diskUsage,
      lastSync: this.lastSyncTime,
      performance: {
        avgReadTime: localInfo.performance.avgReadTime, // ใช้ local read time
        avgWriteTime: (localInfo.performance.avgWriteTime + dbInfo.performance.avgWriteTime) / 2,
        cacheHitRate: localInfo.performance.cacheHitRate
      }
    };
  }
  
  /**
   * Health check
   */
  public async healthCheck(): Promise<HealthStatus> {
    const localHealth = await this.localProvider.healthCheck();
    const dbHealth = await this.dbProvider.healthCheck();
    
    const issues: string[] = [];
    
    if (!localHealth.healthy) {
      issues.push(...(localHealth.issues || []));
    }
    
    if (!dbHealth.healthy) {
      issues.push(...(dbHealth.issues || []));
    }
    
    if (this.syncQueue.size > 100) {
      issues.push(`Sync queue มีขนาดใหญ่: ${this.syncQueue.size} รายการ`);
    }
    
    if (this.conflicts.size > 0) {
      issues.push(`มี conflicts ที่ยังไม่ได้แก้ไข: ${this.conflicts.size} รายการ`);
    }
    
    return {
      healthy: issues.length === 0,
      mode: 'HYBRID',
      issues: issues.length > 0 ? issues : undefined,
      lastCheck: new Date()
    };
  }
  
  /**
   * Cleanup provider
   */
  public async cleanup(): Promise<void> {
    // หยุด sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    // Sync ครั้งสุดท้าย
    await this.performSync();
    
    // Cleanup providers
    await this.localProvider.cleanup();
    await this.dbProvider.cleanup();
    
    // Clear queues
    this.syncQueue.clear();
    this.conflicts.clear();
    
    await super.cleanup();
    
    this.log('info', 'ปิด HybridStorageProvider สำเร็จ');
  }
}