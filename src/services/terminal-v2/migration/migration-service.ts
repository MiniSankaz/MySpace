/**
 * Migration Service
 * อำนวยความสะดวกในการ migrate จากระบบเก่าไปใหม่แบบค่อยเป็นค่อยไป
 */

import { EventEmitter } from 'events';
import { LegacyAdapter } from '../adapters/legacy-adapter';
import { getTerminalOrchestrator } from '../terminal-orchestrator';
import { terminalConfig } from '@/config/terminal.config';

export enum MigrationMode {
  LEGACY = 'legacy',      // ใช้ระบบเก่าทั้งหมด
  DUAL = 'dual',         // ใช้ทั้งสองระบบ (สำหรับทดสอบ)
  NEW = 'new',           // ใช้ระบบใหม่ทั้งหมด
  PROGRESSIVE = 'progressive' // Migrate แบบค่อยเป็นค่อยไป
}

interface MigrationStats {
  mode: MigrationMode;
  sessionsMigrated: number;
  sessionsLegacy: number;
  errors: number;
  startTime: Date;
  lastMigration?: Date;
}

/**
 * MigrationService - จัดการการ migrate จากระบบเก่าไปใหม่
 */
export class MigrationService extends EventEmitter {
  private static instance: MigrationService;
  private mode: MigrationMode;
  private stats: MigrationStats;
  private featureFlags: Map<string, boolean>;
  private legacyAdapter: LegacyAdapter;
  private orchestrator: any;
  
  private constructor() {
    super();
    
    // กำหนด mode จาก environment
    this.mode = this.determineMigrationMode();
    
    // Initialize stats
    this.stats = {
      mode: this.mode,
      sessionsMigrated: 0,
      sessionsLegacy: 0,
      errors: 0,
      startTime: new Date()
    };
    
    // Feature flags สำหรับ progressive migration
    this.featureFlags = new Map([
      ['useNewSessionManager', false],
      ['useNewStreamManager', false],
      ['useNewMetrics', false],
      ['useNewWebSocket', false],
      ['useNewAPI', false]
    ]);
    
    // Initialize adapters
    this.legacyAdapter = LegacyAdapter.getInstance();
    this.orchestrator = getTerminalOrchestrator();
    
    this.initialize();
  }
  
  public static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }
  
  /**
   * กำหนด migration mode จาก environment
   */
  private determineMigrationMode(): MigrationMode {
    const mode = process.env.TERMINAL_MIGRATION_MODE;
    
    switch (mode) {
      case 'legacy':
        return MigrationMode.LEGACY;
      case 'dual':
        return MigrationMode.DUAL;
      case 'new':
        return MigrationMode.NEW;
      case 'progressive':
      default:
        return MigrationMode.PROGRESSIVE;
    }
  }
  
  /**
   * Initialize migration service
   */
  private initialize(): void {
    console.log(`[MigrationService] เริ่มต้นในโหมด: ${this.mode}`);
    
    // Setup feature flags based on mode
    this.setupFeatureFlags();
    
    // Setup monitoring
    this.setupMonitoring();
    
    // Log initial state
    console.log('[MigrationService] Feature flags:', Object.fromEntries(this.featureFlags));
  }
  
  /**
   * Setup feature flags ตาม mode
   */
  private setupFeatureFlags(): void {
    switch (this.mode) {
      case MigrationMode.LEGACY:
        // ใช้ระบบเก่าทั้งหมด
        this.setAllFlags(false);
        break;
        
      case MigrationMode.NEW:
        // ใช้ระบบใหม่ทั้งหมด
        this.setAllFlags(true);
        break;
        
      case MigrationMode.DUAL:
        // ใช้ทั้งสองระบบ (mirror operations)
        this.setAllFlags(false); // Default to legacy แต่จะ mirror operations
        break;
        
      case MigrationMode.PROGRESSIVE:
        // เปิด feature ทีละตัว
        this.enableProgressiveFeatures();
        break;
    }
  }
  
  /**
   * Enable features แบบค่อยเป็นค่อยไป
   */
  private enableProgressiveFeatures(): void {
    // Phase 1: เริ่มจาก metrics (low risk)
    this.featureFlags.set('useNewMetrics', true);
    
    // Phase 2: Session management (medium risk)
    // จะเปิดหลังจากทดสอบ metrics แล้ว
    const phase2Date = new Date('2025-01-15');
    if (new Date() > phase2Date) {
      this.featureFlags.set('useNewSessionManager', true);
    }
    
    // Phase 3: Stream management (high risk)
    const phase3Date = new Date('2025-01-20');
    if (new Date() > phase3Date) {
      this.featureFlags.set('useNewStreamManager', true);
      this.featureFlags.set('useNewWebSocket', true);
    }
    
    // Phase 4: Full migration
    const phase4Date = new Date('2025-01-25');
    if (new Date() > phase4Date) {
      this.setAllFlags(true);
    }
  }
  
  /**
   * Set all feature flags
   */
  private setAllFlags(enabled: boolean): void {
    for (const key of this.featureFlags.keys()) {
      this.featureFlags.set(key, enabled);
    }
  }
  
  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: string): boolean {
    return this.featureFlags.get(feature) || false;
  }
  
  /**
   * Create session ผ่าน migration layer
   */
  public async createSession(params: {
    projectId: string;
    projectPath: string;
    userId?: string;
    mode?: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      let session: any;
      
      if (this.mode === MigrationMode.LEGACY) {
        // ใช้ระบบเก่าผ่าน legacy adapter
        session = this.legacyAdapter.createSession(
          params.projectId,
          params.projectPath,
          params.userId,
          params.mode
        );
      } else if (this.mode === MigrationMode.NEW) {
        // ใช้ระบบใหม่โดยตรง
        const result = await this.orchestrator.createTerminal({
          projectId: params.projectId,
          projectPath: params.projectPath,
          userId: params.userId,
          mode: params.mode
        });
        session = this.convertToLegacyFormat(result.session);
      } else if (this.mode === MigrationMode.DUAL) {
        // สร้างทั้งสองระบบ (สำหรับเปรียบเทียบ)
        session = this.legacyAdapter.createSession(
          params.projectId,
          params.projectPath,
          params.userId,
          params.mode
        );
        
        // สร้างในระบบใหม่ด้วย (async, ไม่รอ)
        this.orchestrator.createTerminal({
          projectId: params.projectId,
          projectPath: params.projectPath,
          userId: params.userId,
          mode: params.mode
        }).then(() => {
          console.log('[MigrationService] Dual mode: created in new system');
        }).catch(error => {
          console.error('[MigrationService] Dual mode error:', error);
          this.stats.errors++;
        });
      } else {
        // PROGRESSIVE mode - ใช้ feature flags
        if (this.isFeatureEnabled('useNewSessionManager')) {
          const result = await this.orchestrator.createTerminal({
            projectId: params.projectId,
            projectPath: params.projectPath,
            userId: params.userId,
            mode: params.mode
          });
          session = this.convertToLegacyFormat(result.session);
          this.stats.sessionsMigrated++;
        } else {
          session = this.legacyAdapter.createSession(
            params.projectId,
            params.projectPath,
            params.userId,
            params.mode
          );
          this.stats.sessionsLegacy++;
        }
      }
      
      // Record metrics
      const duration = Date.now() - startTime;
      this.emit('session:created', {
        mode: this.mode,
        duration,
        sessionId: session.id,
        usedNewSystem: this.mode === MigrationMode.NEW || 
                       (this.mode === MigrationMode.PROGRESSIVE && 
                        this.isFeatureEnabled('useNewSessionManager'))
      });
      
      return session;
    } catch (error) {
      this.stats.errors++;
      console.error('[MigrationService] Failed to create session:', error);
      throw error;
    }
  }
  
  /**
   * List sessions
   */
  public listSessions(projectId: string): any[] {
    if (this.mode === MigrationMode.NEW || 
        (this.mode === MigrationMode.PROGRESSIVE && 
         this.isFeatureEnabled('useNewSessionManager'))) {
      const terminals = this.orchestrator.listProjectTerminals(projectId);
      return terminals.map(t => this.convertToLegacyFormat(t.session));
    }
    
    return this.legacyAdapter.listSessions(projectId);
  }
  
  /**
   * Close session
   */
  public closeSession(sessionId: string): boolean {
    if (this.mode === MigrationMode.NEW ||
        (this.mode === MigrationMode.PROGRESSIVE && 
         this.isFeatureEnabled('useNewSessionManager'))) {
      this.orchestrator.closeTerminal(sessionId);
      return true;
    }
    
    return this.legacyAdapter.closeSession(sessionId);
  }
  
  /**
   * Get migration status
   */
  public getStatus(): MigrationStats & { featureFlags: Record<string, boolean> } {
    return {
      ...this.stats,
      featureFlags: Object.fromEntries(this.featureFlags)
    };
  }
  
  /**
   * Convert new format to legacy format
   */
  private convertToLegacyFormat(session: any): any {
    return {
      id: session.id,
      projectId: session.projectId,
      userId: session.userId,
      type: 'terminal',
      mode: session.mode?.toLowerCase() || 'normal',
      tabName: session.tabName,
      status: session.status?.toLowerCase() || 'active',
      active: session.status === 'ACTIVE',
      isFocused: session.metadata?.focused || false,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      currentPath: session.metadata?.workingDirectory || process.cwd(),
      wsConnected: session.status === 'ACTIVE',
      metadata: session.metadata
    };
  }
  
  /**
   * Setup monitoring
   */
  private setupMonitoring(): void {
    // Log stats every minute
    setInterval(() => {
      console.log('[MigrationService] Stats:', this.stats);
    }, 60000);
    
    // Check for mode changes
    setInterval(() => {
      const newMode = this.determineMigrationMode();
      if (newMode !== this.mode) {
        console.log(`[MigrationService] Mode changed from ${this.mode} to ${newMode}`);
        this.mode = newMode;
        this.setupFeatureFlags();
      }
    }, 10000);
  }
}

// Export singleton
export const migrationService = MigrationService.getInstance();