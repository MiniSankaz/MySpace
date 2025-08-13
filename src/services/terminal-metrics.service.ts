/**
 * Terminal Performance Monitoring Service
 * Real-time metrics collection and reporting
 */

import { EventEmitter } from 'events';
import { configManager } from '@/config/terminal.config';

export interface PerformanceMetrics {
  timestamp: Date;
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  sessions: SessionMetrics;
  network: NetworkMetrics;
  errors: ErrorMetrics;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  percentUsed: number;
}

export interface CPUMetrics {
  user: number;
  system: number;
  percent: number;
  loadAverage: number[];
}

export interface SessionMetrics {
  total: number;
  active: number;
  suspended: number;
  avgResponseTime: number;
  throughput: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  messagesIn: number;
  messagesOut: number;
  avgLatency: number;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  types: Record<string, number>;
  lastError: Date | null;
}

export class TerminalMetricsService extends EventEmitter {
  private static instance: TerminalMetricsService;
  
  private metrics: PerformanceMetrics;
  private history: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 100;
  
  // Counters
  private networkCounters = {
    bytesIn: 0,
    bytesOut: 0,
    messagesIn: 0,
    messagesOut: 0,
    latencySum: 0,
    latencyCount: 0
  };
  
  private errorCounters = {
    total: 0,
    window: [] as Date[],
    types: {} as Record<string, number>,
    maxWindowSize: 1000, // Limit error window size
    maxTypes: 50 // Limit error types tracked
  };
  
  private sessionCounters = {
    responseTimeSum: 0,
    responseTimeCount: 0,
    throughput: 0
  };
  
  // Monitoring intervals
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.metrics = this.createEmptyMetrics();
    this.startMonitoring();
  }
  
  public static getInstance(): TerminalMetricsService {
    if (!this.instance) {
      this.instance = new TerminalMetricsService();
    }
    return this.instance;
  }
  
  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      timestamp: new Date(),
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        percentUsed: 0
      },
      cpu: {
        user: 0,
        system: 0,
        percent: 0,
        loadAverage: [0, 0, 0]
      },
      sessions: {
        total: 0,
        active: 0,
        suspended: 0,
        avgResponseTime: 0,
        throughput: 0
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        messagesIn: 0,
        messagesOut: 0,
        avgLatency: 0
      },
      errors: {
        total: 0,
        rate: 0,
        types: {},
        lastError: null
      }
    };
  }
  
  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    const config = configManager.getConfig().monitoring;
    
    if (!config.enabled) {
      console.log('[Metrics] Monitoring disabled');
      return;
    }
    
    // Main metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, config.metricsInterval);
    
    // Alert checking
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, config.healthCheckInterval);
    
    console.log('[Metrics] Monitoring started');
  }
  
  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const metrics = this.createEmptyMetrics();
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0,
      percentUsed: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };
    
    // CPU metrics
    const cpuUsage = process.cpuUsage();
    metrics.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system,
      percent: this.calculateCPUPercent(cpuUsage),
      loadAverage: process.platform === 'darwin' || process.platform === 'linux' 
        ? (require('os').loadavg() as number[])
        : [0, 0, 0]
    };
    
    // Session metrics
    metrics.sessions = {
      total: this.sessionCounters.throughput,
      active: 0, // Should be updated from lifecycle service
      suspended: 0, // Should be updated from lifecycle service
      avgResponseTime: this.sessionCounters.responseTimeCount > 0
        ? this.sessionCounters.responseTimeSum / this.sessionCounters.responseTimeCount
        : 0,
      throughput: this.sessionCounters.throughput
    };
    
    // Network metrics
    metrics.network = {
      bytesIn: this.networkCounters.bytesIn,
      bytesOut: this.networkCounters.bytesOut,
      messagesIn: this.networkCounters.messagesIn,
      messagesOut: this.networkCounters.messagesOut,
      avgLatency: this.networkCounters.latencyCount > 0
        ? this.networkCounters.latencySum / this.networkCounters.latencyCount
        : 0
    };
    
    // Error metrics
    const errorWindow = Date.now() - 60000; // Last minute
    this.errorCounters.window = this.errorCounters.window.filter(
      d => d.getTime() > errorWindow
    );
    
    metrics.errors = {
      total: this.errorCounters.total,
      rate: this.errorCounters.window.length,
      types: { ...this.errorCounters.types },
      lastError: this.errorCounters.window.length > 0
        ? this.errorCounters.window[this.errorCounters.window.length - 1]
        : null
    };
    
    // Store metrics
    this.metrics = metrics;
    this.addToHistory(metrics);
    
    // Emit metrics event
    this.emit('metrics:collected', metrics);
  }
  
  /**
   * Calculate CPU percentage
   */
  private calculateCPUPercent(usage: NodeJS.CpuUsage): number {
    const totalTime = usage.user + usage.system;
    const timeDiff = process.uptime() * 1000000; // Convert to microseconds
    return Math.min(100, (totalTime / timeDiff) * 100);
  }
  
  /**
   * Add metrics to history
   */
  private addToHistory(metrics: PerformanceMetrics): void {
    this.history.push(metrics);
    
    // Keep only recent history
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(-this.MAX_HISTORY);
    }
  }
  
  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const config = configManager.getConfig().monitoring.alertThresholds;
    const alerts: string[] = [];
    
    // Memory alert
    const memoryMB = Math.round(this.metrics.memory.heapUsed / 1024 / 1024);
    if (memoryMB > config.memory) {
      alerts.push(`Memory usage high: ${memoryMB}MB > ${config.memory}MB`);
    }
    
    // CPU alert
    if (this.metrics.cpu.percent > config.cpu) {
      alerts.push(`CPU usage high: ${this.metrics.cpu.percent.toFixed(1)}% > ${config.cpu}%`);
    }
    
    // Session alert
    if (this.metrics.sessions.total > config.sessions) {
      alerts.push(`Session count high: ${this.metrics.sessions.total} > ${config.sessions}`);
    }
    
    // Error rate alert
    if (this.metrics.errors.rate > config.errorRate) {
      alerts.push(`Error rate high: ${this.metrics.errors.rate}/min > ${config.errorRate}/min`);
    }
    
    // Emit alerts
    if (alerts.length > 0) {
      console.warn('[Metrics] Alerts triggered:', alerts);
      this.emit('alerts:triggered', alerts);
    }
  }
  
  /**
   * Record network activity
   */
  public recordNetwork(
    direction: 'in' | 'out',
    bytes: number,
    latency?: number
  ): void {
    if (direction === 'in') {
      this.networkCounters.bytesIn += bytes;
      this.networkCounters.messagesIn++;
    } else {
      this.networkCounters.bytesOut += bytes;
      this.networkCounters.messagesOut++;
    }
    
    if (latency !== undefined) {
      this.networkCounters.latencySum += latency;
      this.networkCounters.latencyCount++;
    }
  }
  
  /**
   * Record error with size limits
   */
  public recordError(type: string, error?: Error): void {
    this.errorCounters.total++;
    
    // Limit window size
    this.errorCounters.window.push(new Date());
    if (this.errorCounters.window.length > this.errorCounters.maxWindowSize) {
      this.errorCounters.window = this.errorCounters.window.slice(-this.errorCounters.maxWindowSize);
    }
    
    // Limit error types tracked
    if (Object.keys(this.errorCounters.types).length >= this.errorCounters.maxTypes) {
      // Remove oldest type with lowest count
      const sortedTypes = Object.entries(this.errorCounters.types)
        .sort(([,a], [,b]) => a - b);
      if (sortedTypes.length > 0) {
        delete this.errorCounters.types[sortedTypes[0][0]];
      }
    }
    
    if (!this.errorCounters.types[type]) {
      this.errorCounters.types[type] = 0;
    }
    this.errorCounters.types[type]++;
    
    if (error) {
      console.error(`[Metrics] Error recorded: ${type}`, error.message);
    }
  }
  
  /**
   * Record session response time
   */
  public recordResponseTime(ms: number): void {
    this.sessionCounters.responseTimeSum += ms;
    this.sessionCounters.responseTimeCount++;
  }
  
  /**
   * Update session counts
   */
  public updateSessionCounts(total: number, active: number, suspended: number): void {
    this.metrics.sessions.total = total;
    this.metrics.sessions.active = active;
    this.metrics.sessions.suspended = suspended;
    this.sessionCounters.throughput = total;
  }
  
  /**
   * Get current metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return this.metrics;
  }
  
  /**
   * Get metrics history
   */
  public getHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return this.history;
  }
  
  /**
   * Get summary statistics
   */
  public getSummary(): any {
    if (this.history.length === 0) {
      return null;
    }
    
    const recent = this.history.slice(-10);
    
    return {
      current: this.metrics,
      averages: {
        memory: recent.reduce((sum, m) => sum + m.memory.heapUsed, 0) / recent.length,
        cpu: recent.reduce((sum, m) => sum + m.cpu.percent, 0) / recent.length,
        responseTime: recent.reduce((sum, m) => sum + m.sessions.avgResponseTime, 0) / recent.length,
        errorRate: recent.reduce((sum, m) => sum + m.errors.rate, 0) / recent.length
      },
      peaks: {
        memory: Math.max(...recent.map(m => m.memory.heapUsed)),
        cpu: Math.max(...recent.map(m => m.cpu.percent)),
        sessions: Math.max(...recent.map(m => m.sessions.total)),
        errors: Math.max(...recent.map(m => m.errors.rate))
      }
    };
  }
  
  /**
   * Export metrics for analysis
   */
  public exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date(),
      current: this.metrics,
      history: this.history,
      summary: this.getSummary()
    }, null, 2);
  }
  
  /**
   * Reset all counters
   */
  public reset(): void {
    this.networkCounters = {
      bytesIn: 0,
      bytesOut: 0,
      messagesIn: 0,
      messagesOut: 0,
      latencySum: 0,
      latencyCount: 0
    };
    
    this.errorCounters = {
      total: 0,
      window: [],
      types: {}
    };
    
    this.sessionCounters = {
      responseTimeSum: 0,
      responseTimeCount: 0,
      throughput: 0
    };
    
    this.history = [];
    console.log('[Metrics] All counters reset');
  }
  
  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    
    console.log('[Metrics] Monitoring stopped');
  }
}

// Export singleton instance
export const terminalMetricsService = TerminalMetricsService.getInstance();