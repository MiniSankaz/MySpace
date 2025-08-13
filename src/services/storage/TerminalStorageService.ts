/**
 * Terminal Storage Integration Service
 * เชื่อมต่อระบบ Storage ใหม่กับ Terminal System ที่มีอยู่
 * ทำหน้าที่เป็น Bridge ระหว่าง InMemoryTerminalService และ Storage Providers
 */

import { StorageFactory } from './StorageFactory';
import { 
  ITerminalStorageService,
  TerminalSession as StorageSession,
  SessionCreateParams,
  TerminalMode,
  TerminalStatus
} from './interfaces/ITerminalStorageService';
import { InMemoryTerminalService, TerminalSession as LegacySession } from '../terminal-memory.service';
import { EventEmitter } from 'events';

/**
 * Terminal Storage Service
 * Adapter pattern สำหรับเชื่อมต่อระบบเก่ากับใหม่
 */
export class TerminalStorageService extends EventEmitter {
  private static instance: TerminalStorageService;
  private storageProvider: ITerminalStorageService;
  private legacyService: InMemoryTerminalService;
  private isMigrating = false;
  private syncInProgress = new Set<string>();
  private sessionIdMap = new Map<string, string>(); // legacyId -> storageId
  private migratedSessions = new Set<string>(); // Track already migrated sessions
  private migrationAttempts = new Map<string, number>(); // Track migration attempts per session
  
  // Compatibility mode
  private compatibilityMode: 'legacy' | 'storage' | 'hybrid';
  
  private constructor() {
    super();
    
    // Initialize storage provider
    this.storageProvider = StorageFactory.getProvider();
    
    // Get legacy service instance
    this.legacyService = InMemoryTerminalService.getInstance();
    
    // Determine compatibility mode from ENV
    this.compatibilityMode = this.getCompatibilityMode();
    
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TerminalStorageService {
    if (!TerminalStorageService.instance) {
      TerminalStorageService.instance = new TerminalStorageService();
    }
    return TerminalStorageService.instance;
  }
  
  /**
   * Initialize service
   */
  private async initialize(): Promise<void> {
    console.log(`[TerminalStorageService] กำลังเริ่มต้นในโหมด: ${this.compatibilityMode}`);
    
    // ตั้งค่า event forwarding
    this.setupEventForwarding();
    
    // Migrate existing sessions ถ้าจำเป็น
    if (this.compatibilityMode !== 'legacy') {
      await this.migrateExistingSessions();
    }
  }
  
  /**
   * Determine compatibility mode
   */
  private getCompatibilityMode(): 'legacy' | 'storage' | 'hybrid' {
    const mode = process.env.TERMINAL_COMPATIBILITY_MODE;
    
    if (mode === 'legacy') return 'legacy';
    if (mode === 'storage') return 'storage';
    
    // Default to hybrid for smooth transition
    return 'hybrid';
  }
  
  /**
   * Setup event forwarding between systems
   */
  private setupEventForwarding(): void {
    // Forward events from storage to legacy
    this.storageProvider.on('session:created', (session) => {
      // CRITICAL FIX: Don't forward if this is a migrated session
      const isMigrated = session.metadata?.migratedFrom === 'legacy' || 
                        this.migratedSessions.has(session.id);
      
      // Prevent forwarding if we're already syncing or if migrated
      if (!this.syncInProgress.has(session.id) && !isMigrated) {
        this.legacyService.emit('sessionCreated', this.convertToLegacy(session));
      }
    });
    
    this.storageProvider.on('session:updated', ({ sessionId, changes }) => {
      if (!this.syncInProgress.has(sessionId)) {
        this.legacyService.emit('sessionStatusChanged', { id: sessionId, ...changes });
      }
    });
    
    this.storageProvider.on('session:deleted', (sessionId) => {
      if (!this.syncInProgress.has(sessionId)) {
        this.legacyService.emit('sessionClosed', { id: sessionId });
      }
    });
    
    // Forward events from legacy to storage (only in hybrid mode)
    this.legacyService.on('sessionCreated', async (session) => {
      // CRITICAL FIX: Don't sync if already migrated or in progress
      const shouldSync = this.compatibilityMode === 'hybrid' && 
                        !this.isMigrating && 
                        !this.syncInProgress.has(session.id) &&
                        !this.migratedSessions.has(session.id) &&
                        !this.sessionIdMap.has(session.id);
      
      if (shouldSync) {
        await this.syncToStorage(session);
      }
    });
  }
  
  /**
   * สร้าง terminal session ใหม่
   */
  public async createSession(
    projectId: string,
    projectPath: string,
    userId?: string,
    mode: TerminalMode = 'normal'
  ): Promise<StorageSession> {
    switch (this.compatibilityMode) {
      case 'legacy':
        // ใช้ระบบเก่าอย่างเดียว
        const legacyOnlySession = this.legacyService.createSession(projectId, projectPath, userId, mode);
        return this.convertToStorage(legacyOnlySession);
      
      case 'storage':
        // Even in storage mode, we need legacy for WebSocket
        // Create in both to ensure WebSocket compatibility
        const storageOnlySession = await this.storageProvider.createSession({
          projectId,
          projectPath,
          userId,
          mode,
          metadata: { autoFocus: true }
        });
        
        // Also create in legacy for WebSocket compatibility
        this.syncInProgress.add(storageOnlySession.id);
        try {
          const legacyCompat = this.legacyService.createSession(projectId, projectPath, userId, mode);
          // Update legacy session ID to match storage
          this.legacyService.updateSessionId(legacyCompat.id, storageOnlySession.id);
          this.sessionIdMap.set(storageOnlySession.id, storageOnlySession.id);
        } catch (error) {
          console.warn('[TerminalStorageService] Failed to create legacy compatibility session:', error);
        } finally {
          this.syncInProgress.delete(storageOnlySession.id);
        }
        
        return storageOnlySession;
      
      case 'hybrid':
      default:
        // CRITICAL FIX: Create in Legacy FIRST for WebSocket readiness
        // Legacy service is what WebSocket server checks for session existence
        const hybridLegacySession = this.legacyService.createSession(projectId, projectPath, userId, mode);
        
        // Mark as syncing to prevent event loops
        this.syncInProgress.add(hybridLegacySession.id);
        
        try {
          // Create in storage with same ID
          const storageSession = await this.storageProvider.createSession({
            projectId,
            projectPath,
            userId,
            mode,
            metadata: {
              sessionId: hybridLegacySession.id, // Use same ID as legacy
              autoFocus: true
            }
          });
          
          // Map the IDs (should be same)
          this.sessionIdMap.set(hybridLegacySession.id, storageSession.id);
          this.sessionIdMap.set(storageSession.id, hybridLegacySession.id);
          
          // Convert to storage format but keep legacy ID
          const result = this.convertToStorage(hybridLegacySession);
          result.id = hybridLegacySession.id; // Ensure ID consistency
          
          return result;
        } finally {
          // Clear sync flag
          this.syncInProgress.delete(hybridLegacySession.id);
        }
    }
  }
  
  /**
   * ดึงข้อมูล session
   */
  public async getSession(sessionId: string): Promise<StorageSession | null> {
    switch (this.compatibilityMode) {
      case 'legacy':
        const legacySession = this.legacyService.getSession(sessionId);
        return legacySession ? this.convertToStorage(legacySession) : null;
      
      case 'storage':
        return await this.storageProvider.getSession(sessionId);
      
      case 'hybrid':
      default:
        // ลองดึงจาก storage ก่อน
        let session = await this.storageProvider.getSession(sessionId);
        
        // ถ้าไม่เจอ ลองดึงจาก legacy
        if (!session) {
          const legacySession = this.legacyService.getSession(sessionId);
          if (legacySession) {
            session = this.convertToStorage(legacySession);
            // Sync to storage
            await this.syncToStorage(legacySession);
          }
        }
        
        return session;
    }
  }
  
  /**
   * อัพเดท session status
   */
  public async updateSessionStatus(sessionId: string, status: TerminalStatus): Promise<void> {
    switch (this.compatibilityMode) {
      case 'legacy':
        this.legacyService.updateSessionStatus(sessionId, status);
        break;
      
      case 'storage':
        await this.storageProvider.updateSession(sessionId, { status });
        break;
      
      case 'hybrid':
      default:
        // Update both systems
        await Promise.all([
          this.storageProvider.updateSession(sessionId, { status }),
          Promise.resolve(this.legacyService.updateSessionStatus(sessionId, status))
        ]);
        break;
    }
  }
  
  /**
   * แสดงรายการ sessions ของ project
   */
  public async listSessions(projectId: string): Promise<StorageSession[]> {
    switch (this.compatibilityMode) {
      case 'legacy':
        const legacySessions = this.legacyService.listSessions(projectId);
        return legacySessions.map(s => this.convertToStorage(s));
      
      case 'storage':
        return await this.storageProvider.listSessions(projectId);
      
      case 'hybrid':
      default:
        // Get from storage (primary source)
        const sessions = await this.storageProvider.listSessions(projectId);
        
        // Check for any missing sessions in legacy
        const legacySessionList = this.legacyService.listSessions(projectId);
        const sessionIds = new Set(sessions.map(s => s.id));
        
        for (const legacy of legacySessionList) {
          // Check if this legacy session is mapped to a storage session
          const storageId = this.sessionIdMap.get(legacy.id);
          
          if (!storageId || !sessionIds.has(storageId)) {
            // Found unmapped session in legacy, sync it
            if (!this.syncInProgress.has(legacy.id)) {
              await this.syncToStorage(legacy);
              const convertedSession = this.convertToStorage(legacy);
              // Only add if not already in list
              if (!sessionIds.has(convertedSession.id)) {
                sessions.push(convertedSession);
                sessionIds.add(convertedSession.id);
              }
            }
          }
        }
        
        return sessions;
    }
  }
  
  /**
   * ตั้งค่า focus ของ session
   */
  public async setSessionFocus(sessionId: string, focused: boolean): Promise<void> {
    switch (this.compatibilityMode) {
      case 'legacy':
        this.legacyService.setSessionFocus(sessionId, focused);
        break;
      
      case 'storage':
        await this.storageProvider.setSessionFocus(sessionId, focused);
        break;
      
      case 'hybrid':
      default:
        await Promise.all([
          this.storageProvider.setSessionFocus(sessionId, focused),
          Promise.resolve(this.legacyService.setSessionFocus(sessionId, focused))
        ]);
        break;
    }
  }
  
  /**
   * ปิด session
   */
  public async closeSession(sessionId: string): Promise<boolean> {
    switch (this.compatibilityMode) {
      case 'legacy':
        return this.legacyService.closeSession(sessionId);
      
      case 'storage':
        return await this.storageProvider.deleteSession(sessionId);
      
      case 'hybrid':
      default:
        const [storageResult, legacyResult] = await Promise.all([
          this.storageProvider.deleteSession(sessionId),
          Promise.resolve(this.legacyService.closeSession(sessionId))
        ]);
        
        return storageResult || legacyResult;
    }
  }
  
  /**
   * Suspend sessions สำหรับ project
   */
  public async suspendProjectSessions(projectId: string): Promise<number> {
    switch (this.compatibilityMode) {
      case 'legacy':
        return this.legacyService.suspendProjectSessions(projectId);
      
      case 'storage':
        const sessions = await this.storageProvider.listSessions(projectId);
        let suspended = 0;
        
        for (const session of sessions) {
          if (session.status === 'active') {
            await this.storageProvider.suspendSession(session.id);
            suspended++;
          }
        }
        
        return suspended;
      
      case 'hybrid':
      default:
        // Suspend in both systems
        const storageSessions = await this.storageProvider.listSessions(projectId);
        const legacyCount = this.legacyService.suspendProjectSessions(projectId);
        
        let storageCount = 0;
        for (const session of storageSessions) {
          if (session.status === 'active') {
            await this.storageProvider.suspendSession(session.id);
            storageCount++;
          }
        }
        
        return Math.max(storageCount, legacyCount);
    }
  }
  
  /**
   * Resume sessions สำหรับ project
   */
  public async resumeProjectSessions(projectId: string): Promise<{
    resumed: boolean;
    sessions: any[];
    uiState?: any;
  }> {
    switch (this.compatibilityMode) {
      case 'legacy':
        return this.legacyService.resumeProjectSessions(projectId);
      
      case 'storage':
        const sessions = await this.storageProvider.listSessions(projectId);
        const resumedSessions: any[] = [];
        
        for (const session of sessions) {
          if (session.status === 'suspended') {
            const result = await this.storageProvider.resumeSession(session.id);
            if (result.success && result.session) {
              resumedSessions.push(result.session);
            }
          }
        }
        
        return {
          resumed: resumedSessions.length > 0,
          sessions: resumedSessions,
          uiState: { currentLayout: '1x1' }
        };
      
      case 'hybrid':
      default:
        // Resume in both systems
        const [storageResult, legacyResult] = await Promise.all([
          this.resumeProjectSessions(projectId),
          this.legacyService.resumeProjectSessions(projectId)
        ]);
        
        // Merge results
        const allSessions = [...storageResult.sessions, ...legacyResult.sessions];
        const uniqueSessions = Array.from(
          new Map(allSessions.map(s => [s.id, s])).values()
        );
        
        return {
          resumed: uniqueSessions.length > 0,
          sessions: uniqueSessions,
          uiState: storageResult.uiState || legacyResult.uiState
        };
    }
  }
  
  /**
   * Migrate existing sessions from legacy to storage
   */
  private async migrateExistingSessions(): Promise<void> {
    if (this.isMigrating) return;
    
    this.isMigrating = true;
    console.log('[TerminalStorageService] กำลัง migrate sessions จากระบบเก่า...');
    
    try {
      const allLegacySessions = this.legacyService.getAllSessions();
      let migrated = 0;
      let skipped = 0;
      
      // CRITICAL FIX: Limit migration to prevent memory issues
      const MAX_MIGRATIONS = 100;
      const sessionsToMigrate = allLegacySessions.slice(0, MAX_MIGRATIONS);
      
      for (const legacy of sessionsToMigrate) {
        // Skip if already migrated
        if (this.migratedSessions.has(legacy.id)) {
          skipped++;
          continue;
        }
        
        // Check if already exists in storage
        const existing = await this.storageProvider.getSession(legacy.id);
        
        if (!existing) {
          await this.syncToStorage(legacy);
          migrated++;
        } else {
          // Mark as migrated if already exists
          this.migratedSessions.add(legacy.id);
          skipped++;
        }
      }
      
      console.log(`[TerminalStorageService] Migration complete: ${migrated} migrated, ${skipped} skipped`);
      
      if (allLegacySessions.length > MAX_MIGRATIONS) {
        console.warn(`[TerminalStorageService] Limited migration to ${MAX_MIGRATIONS} sessions out of ${allLegacySessions.length}`);
      }
    } catch (error) {
      console.error('[TerminalStorageService] Migration ล้มเหลว:', error);
    } finally {
      this.isMigrating = false;
    }
  }
  
  /**
   * Sync legacy session to storage
   */
  private async syncToStorage(legacySession: LegacySession): Promise<void> {
    // CRITICAL FIX: Prevent infinite migration loops
    if (this.migratedSessions.has(legacySession.id)) {
      console.log(`[TerminalStorageService] Session ${legacySession.id} already migrated, skipping`);
      return;
    }
    
    // Check migration attempts to prevent infinite loops
    const attempts = this.migrationAttempts.get(legacySession.id) || 0;
    if (attempts >= 3) {
      console.error(`[TerminalStorageService] Max migration attempts reached for ${legacySession.id}`);
      return;
    }
    this.migrationAttempts.set(legacySession.id, attempts + 1);
    
    // Check if already mapped
    const storageId = this.sessionIdMap.get(legacySession.id);
    if (storageId) {
      // Already synced, just update
      this.syncInProgress.add(storageId);
      try {
        await this.storageProvider.updateSession(storageId, {
          status: legacySession.status,
          active: legacySession.active,
          isFocused: legacySession.isFocused,
          currentPath: legacySession.currentPath,
          wsConnected: legacySession.wsConnected
        });
      } finally {
        this.syncInProgress.delete(storageId);
      }
      return;
    }
    
    // Mark as syncing
    this.syncInProgress.add(legacySession.id);
    
    try {
      // Check if already exists by ID or legacyId in metadata
      const existing = await this.storageProvider.getSession(legacySession.id);
      
      // Also check if a session with this legacyId already exists
      const allSessions = await this.storageProvider.findSessions({});
      const duplicateSession = allSessions.find(s => 
        s.metadata?.legacyId === legacySession.id ||
        s.id === legacySession.id
      );
      
      if (!existing && !duplicateSession) {
        // Create new session in storage WITHOUT legacyId to prevent chain migration
        const newSession = await this.storageProvider.createSession({
          projectId: legacySession.projectId,
          projectPath: legacySession.currentPath,
          userId: legacySession.userId,
          mode: legacySession.mode,
          metadata: {
            ...legacySession.metadata,
            // DO NOT include legacyId to prevent migration chains
            migratedAt: new Date(),
            migratedFrom: 'legacy' // Mark source without creating chain
          }
        });
        
        // Map the IDs
        this.sessionIdMap.set(legacySession.id, newSession.id);
        this.sessionIdMap.set(newSession.id, legacySession.id);
        
        // Mark as migrated
        this.migratedSessions.add(legacySession.id);
      } else {
        // Session already exists, just map it
        const existingSession = existing || duplicateSession;
        if (existingSession) {
          this.sessionIdMap.set(legacySession.id, existingSession.id);
          this.sessionIdMap.set(existingSession.id, legacySession.id);
          this.migratedSessions.add(legacySession.id);
        }
      }
    } catch (error) {
      console.error(`[TerminalStorageService] ไม่สามารถ sync session ${legacySession.id}:`, error);
    } finally {
      this.syncInProgress.delete(legacySession.id);
    }
  }
  
  /**
   * Convert legacy session to storage format
   */
  private convertToStorage(legacy: LegacySession): StorageSession {
    return {
      id: legacy.id,
      projectId: legacy.projectId,
      userId: legacy.userId,
      type: legacy.type,
      mode: legacy.mode,
      tabName: legacy.tabName,
      status: legacy.status,
      active: legacy.active,
      isFocused: legacy.isFocused,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      currentPath: legacy.currentPath,
      wsConnected: legacy.wsConnected,
      metadata: legacy.metadata,
      output: [],
      commands: [],
      environment: {}
    };
  }
  
  /**
   * Convert storage session to legacy format
   */
  private convertToLegacy(storage: StorageSession): LegacySession {
    return {
      id: storage.id,
      projectId: storage.projectId,
      userId: storage.userId,
      type: storage.type,
      mode: storage.mode,
      tabName: storage.tabName,
      status: storage.status,
      active: storage.active,
      isFocused: storage.isFocused,
      createdAt: storage.createdAt,
      updatedAt: storage.updatedAt,
      currentPath: storage.currentPath,
      wsConnected: storage.wsConnected,
      metadata: storage.metadata
    };
  }
  
  /**
   * Sync session IDs between systems
   */
  private syncSessionIds(legacyId: string, storageId: string): void {
    // Store mapping for future reference
    const mapping = new Map<string, string>();
    mapping.set(legacyId, storageId);
    mapping.set(storageId, legacyId);
  }
  
  /**
   * Switch compatibility mode at runtime
   */
  public async switchMode(mode: 'legacy' | 'storage' | 'hybrid'): Promise<void> {
    console.log(`[TerminalStorageService] กำลังเปลี่ยนจาก ${this.compatibilityMode} ไปเป็น ${mode}`);
    
    const oldMode = this.compatibilityMode;
    this.compatibilityMode = mode;
    
    // Migrate data if switching to storage mode
    if (oldMode === 'legacy' && mode !== 'legacy') {
      await this.migrateExistingSessions();
    }
    
    console.log(`[TerminalStorageService] เปลี่ยนโหมดเป็น ${mode} สำเร็จ`);
  }
  
  /**
   * Get current mode
   */
  public getMode(): string {
    return this.compatibilityMode;
  }
  
  /**
   * Get storage info
   */
  public async getStorageInfo(): Promise<any> {
    const storageInfo = await this.storageProvider.getStorageInfo();
    
    return {
      compatibilityMode: this.compatibilityMode,
      storageMode: storageInfo.mode,
      sessionCount: storageInfo.sessionCount,
      memoryUsage: storageInfo.memoryUsage,
      performance: storageInfo.performance,
      lastSync: storageInfo.lastSync
    };
  }
  
  /**
   * Health check
   */
  public async healthCheck(): Promise<any> {
    const storageHealth = await this.storageProvider.healthCheck();
    const legacySessions = this.legacyService.getAllSessions().length;
    
    return {
      healthy: storageHealth.healthy,
      compatibilityMode: this.compatibilityMode,
      storageMode: storageHealth.mode,
      legacySessions,
      storageSessions: await this.storageProvider.countSessions(),
      issues: storageHealth.issues
    };
  }
}

// Export singleton instance for convenience
export const terminalStorageService = TerminalStorageService.getInstance();