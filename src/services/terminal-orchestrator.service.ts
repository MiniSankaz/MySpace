/**
 * Terminal Orchestrator Service
 * Integrates all terminal services into cohesive system
 */

import { EventEmitter } from 'events';
import { InMemoryTerminalService } from './terminal-memory.service';
import { TerminalMemoryPool } from './terminal-memory-pool.service';
import { TerminalLifecycleService, SessionState } from './terminal-lifecycle.service';
import { TerminalMetricsService } from './terminal-metrics.service';
import { CircuitBreakerManager } from '@/utils/circuit-breaker';
import { ConfigManager } from '@/config/terminal.config';

export interface OrchestratedSession {
  id: string;
  projectId: string;
  lifecycle: any;
  pooled: boolean;
  metrics: any;
  circuitState: string;
}

export class TerminalOrchestratorService extends EventEmitter {
  private static instance: TerminalOrchestratorService;
  
  // Service references
  private memoryService!: InMemoryTerminalService;
  private memoryPool!: TerminalMemoryPool;
  private lifecycleService!: TerminalLifecycleService;
  private metricsService!: TerminalMetricsService;
  private circuitManager!: CircuitBreakerManager;
  private configManager!: ConfigManager;
  
  // Orchestration state
  private sessions: Map<string, OrchestratedSession> = new Map();
  private initialized: boolean = false;
  
  private constructor() {
    super();
    this.initializeServices();
  }
  
  public static getInstance(): TerminalOrchestratorService {
    if (!this.instance) {
      this.instance = new TerminalOrchestratorService();
    }
    return this.instance;
  }
  
  /**
   * Initialize all services
   */
  private initializeServices(): void {
    try {
      // Get service instances
      this.memoryService = InMemoryTerminalService.getInstance();
      this.memoryPool = TerminalMemoryPool.getInstance();
      this.lifecycleService = TerminalLifecycleService.getInstance();
      this.metricsService = TerminalMetricsService.getInstance();
      this.circuitManager = CircuitBreakerManager.getInstance();
      this.configManager = ConfigManager.getInstance();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize database circuit breaker
      this.setupDatabaseCircuit();
      
      this.initialized = true;
      console.log('[Orchestrator] All services initialized successfully');
    } catch (error) {
      console.error('[Orchestrator] Failed to initialize services:', error);
      throw error;
    }
  }
  
  /**
   * Setup event listeners for service coordination
   */
  private setupEventListeners(): void {
    // Memory service events
    this.memoryService.on('sessionCreated', (session) => {
      this.handleSessionCreated(session);
    });
    
    this.memoryService.on('sessionClosed', (session) => {
      this.handleSessionClosed(session);
    });
    
    this.memoryService.on('focusChanged', (data) => {
      this.handleFocusChanged(data);
    });
    
    // Lifecycle service events
    this.lifecycleService.on('state:changed', (data) => {
      this.handleLifecycleStateChange(data);
    });
    
    // Metrics service events
    this.metricsService.on('alerts:triggered', (alerts) => {
      this.handleMetricAlerts(alerts);
    });
  }
  
  /**
   * Setup database circuit breaker
   */
  private setupDatabaseCircuit(): void {
    const config = this.configManager.getConfig();
    
    this.circuitManager.getCircuit('database', {
      threshold: config.resilience.circuitBreaker.threshold,
      timeout: config.resilience.circuitBreaker.timeout,
      resetTimeout: config.resilience.circuitBreaker.resetTimeout,
      monitoringPeriod: 60000,
      onStateChange: (state) => {
        console.log(`[Orchestrator] Database circuit state: ${state}`);
        
        if (state === 'open') {
          // Switch to memory-only mode
          this.configManager.updateConfig({ mode: 'memory' });
        } else if (state === 'closed') {
          // Restore hybrid mode
          const env = process.env.NODE_ENV || 'development';
          if (env === 'production') {
            this.configManager.updateConfig({ mode: 'hybrid' });
          }
        }
      }
    });
  }
  
  /**
   * Create orchestrated terminal session
   */
  public async createSession(
    projectId: string,
    projectPath: string,
    userId?: string
  ): Promise<OrchestratedSession> {
    const startTime = Date.now();
    
    try {
      // Create session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      // 1. Create lifecycle
      const lifecycle = this.lifecycleService.createSession(sessionId, {
        projectId,
        projectPath,
        userId
      });
      
      // 2. Create in-memory session
      const memorySession = this.memoryService.createSession(
        projectId,
        projectPath,
        userId
      );
      
      // 3. Skip database persistence for now (no prisma import)
      if (this.configManager.isDatabaseEnabled()) {
        const dbCircuit = this.circuitManager.getCircuit('database');
        
        await dbCircuit.executeWithFallback(
          async () => {
            // Database operation would go here
            console.log('[Orchestrator] Database persistence skipped (not implemented)');
          },
          () => {
            // Fallback - just log
            console.log('[Orchestrator] Database unavailable, using memory-only');
          }
        );
      }
      
      // 4. Transition to active state
      this.lifecycleService.transitionTo(sessionId, SessionState.ACTIVE);
      
      // 5. Record metrics
      const responseTime = Date.now() - startTime;
      this.metricsService.recordResponseTime(responseTime);
      
      // 6. Create orchestrated session
      const orchestrated: OrchestratedSession = {
        id: sessionId,
        projectId,
        lifecycle: lifecycle,
        pooled: true,
        metrics: {
          createdAt: new Date(),
          responseTime
        },
        circuitState: this.circuitManager.getCircuit('database').getState()
      };
      
      this.sessions.set(sessionId, orchestrated);
      
      // Update session counts
      this.updateSessionCounts();
      
      console.log(`[Orchestrator] Created session ${sessionId} in ${responseTime}ms`);
      this.emit('session:created', orchestrated);
      
      return orchestrated;
    } catch (error) {
      // Record error
      this.metricsService.recordError('session_creation', error as Error);
      
      // Note: lifecycle variable may not be defined here
      // Just log the error for now
      console.error('[Orchestrator] Session creation failed:', error);
      
      throw error;
    }
  }
  
  /**
   * Close orchestrated session
   */
  public async closeSession(sessionId: string): Promise<boolean> {
    try {
      const orchestrated = this.sessions.get(sessionId);
      if (!orchestrated) {
        return false;
      }
      
      // 1. Transition lifecycle
      this.lifecycleService.transitionTo(sessionId, SessionState.CLOSING);
      
      // 2. Close in-memory session
      this.memoryService.closeSession(sessionId);
      
      // 3. Skip database update for now (no prisma import)
      if (this.configManager.isDatabaseEnabled()) {
        const dbCircuit = this.circuitManager.getCircuit('database');
        
        await dbCircuit.executeWithFallback(
          async () => {
            // Database operation would go here
            console.log('[Orchestrator] Database session close skipped (not implemented)');
          },
          () => {
            console.log('[Orchestrator] Database unavailable for session close');
          }
        );
      }
      
      // 4. Complete lifecycle
      this.lifecycleService.transitionTo(sessionId, SessionState.CLOSED);
      
      // 5. Remove from orchestrated sessions
      this.sessions.delete(sessionId);
      
      // Update session counts
      this.updateSessionCounts();
      
      console.log(`[Orchestrator] Closed session ${sessionId}`);
      this.emit('session:closed', sessionId);
      
      return true;
    } catch (error) {
      this.metricsService.recordError('session_close', error as Error);
      return false;
    }
  }
  
  /**
   * Suspend project sessions
   */
  public async suspendProject(projectId: string): Promise<number> {
    let suspendedCount = 0;
    
    for (const [sessionId, orchestrated] of this.sessions) {
      if (orchestrated.projectId === projectId) {
        // Transition to suspended
        const transitioned = this.lifecycleService.transitionTo(
          sessionId,
          SessionState.SUSPENDED,
          'Project switch'
        );
        
        if (transitioned) {
          suspendedCount++;
        }
      }
    }
    
    // Use memory service suspension
    this.memoryService.suspendProjectSessions(projectId);
    
    console.log(`[Orchestrator] Suspended ${suspendedCount} sessions for project ${projectId}`);
    return suspendedCount;
  }
  
  /**
   * Resume project sessions
   */
  public async resumeProject(projectId: string): Promise<any> {
    const resumedSessions = [];
    
    for (const [sessionId, orchestrated] of this.sessions) {
      if (orchestrated.projectId === projectId) {
        const lifecycle = this.lifecycleService.getSession(sessionId);
        
        if (lifecycle?.state === SessionState.SUSPENDED) {
          // Transition to active
          const transitioned = this.lifecycleService.transitionTo(
            sessionId,
            SessionState.ACTIVE,
            'Project resumed'
          );
          
          if (transitioned) {
            resumedSessions.push(orchestrated);
          }
        }
      }
    }
    
    // Use memory service resumption
    const memoryResult = this.memoryService.resumeProjectSessions(projectId);
    
    return {
      resumed: resumedSessions.length > 0,
      sessions: resumedSessions,
      memoryResult
    };
  }
  
  /**
   * Handle session created event
   */
  private handleSessionCreated(session: any): void {
    // Update metrics
    this.updateSessionCounts();
  }
  
  /**
   * Handle session closed event
   */
  private handleSessionClosed(session: any): void {
    // Update metrics
    this.updateSessionCounts();
  }
  
  /**
   * Handle focus changed event
   */
  private handleFocusChanged(data: any): void {
    // Record activity
    if (data.focused) {
      this.metricsService.recordNetwork('in', 100);
    }
  }
  
  /**
   * Handle lifecycle state change
   */
  private handleLifecycleStateChange(data: any): void {
    // Update session counts based on state change
    this.updateSessionCounts();
    
    // Log significant transitions
    if (data.to === SessionState.ERROR) {
      this.metricsService.recordError('lifecycle_error');
    }
  }
  
  /**
   * Handle metric alerts
   */
  private handleMetricAlerts(alerts: string[]): void {
    console.warn('[Orchestrator] Metric alerts:', alerts);
    
    // Take action based on alerts
    for (const alert of alerts) {
      if (alert.includes('Memory usage high')) {
        // Trigger memory cleanup
        this.performMemoryCleanup();
      } else if (alert.includes('Error rate high')) {
        // Open database circuit breaker if errors are database related
        const dbCircuit = this.circuitManager.getCircuit('database');
        if (dbCircuit.getState() === 'closed') {
          console.warn('[Orchestrator] High error rate, opening database circuit');
          dbCircuit.forceOpen();
        }
      }
    }
  }
  
  /**
   * Update session counts in metrics
   */
  private updateSessionCounts(): void {
    const lifecycleStats = this.lifecycleService.getStats();
    
    this.metricsService.updateSessionCounts(
      lifecycleStats.sessions,
      lifecycleStats.states.active,
      lifecycleStats.states.suspended
    );
  }
  
  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    console.log('[Orchestrator] Performing memory cleanup');
    
    // 1. Force memory pool cleanup
    this.memoryPool.forceCleanup();
    
    // 2. Emergency lifecycle cleanup
    this.lifecycleService.emergencyCleanup();
    
    // 3. Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // 4. Clear metrics history
    this.metricsService.reset();
  }
  
  /**
   * Get orchestrator status
   */
  public getStatus(): any {
    return {
      initialized: this.initialized,
      sessions: this.sessions.size,
      config: {
        mode: this.configManager.getConfig().mode,
        databaseEnabled: this.configManager.isDatabaseEnabled()
      },
      services: {
        memory: this.memoryService.getAllSessions().length,
        pool: this.memoryPool.getStats(),
        lifecycle: this.lifecycleService.getStats(),
        metrics: this.metricsService.getSummary(),
        circuits: this.circuitManager.getAllStates()
      }
    };
  }
  
  /**
   * Health check
   */
  public async healthCheck(): Promise<any> {
    const checks = {
      memory: true,
      database: false,
      metrics: true,
      circuits: true
    };
    
    // Check memory
    const memUsage = process.memoryUsage();
    checks.memory = memUsage.heapUsed < 3 * 1024 * 1024 * 1024; // 3GB limit
    
    // Check database
    if (this.configManager.isDatabaseEnabled()) {
      const dbCircuit = this.circuitManager.getCircuit('database');
      
      try {
        await dbCircuit.execute(async () => {
          // Database check would go here
          console.log('[Orchestrator] Database health check skipped');
        });
        checks.database = false; // Mark as false since we're not actually checking
      } catch {
        checks.database = false;
      }
    }
    
    // Check circuits
    const circuits = this.circuitManager.getAllStates();
    checks.circuits = !Object.values(circuits).some(
      (c: any) => c.state === 'open'
    );
    
    const healthy = Object.values(checks).every(v => v !== false);
    
    return {
      healthy,
      checks,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const terminalOrchestrator = TerminalOrchestratorService.getInstance();