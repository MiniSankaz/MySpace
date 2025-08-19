/**
 * MetricsCollector Service
 * Passive observer for metrics and monitoring
 * Clean Architecture - Monitoring Service
 */

import { EventEmitter } from "events";
import {
  SessionManager,
  TerminalSession,
  SessionStatus,
} from "./session-manager.service";
import {
  StreamManager,
  StreamConnection,
  StreamStatus as StreamConnectionStatus,
} from "./stream-manager.service";

// Metrics interfaces
export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  sessions: SessionMetrics;
  streams: StreamMetrics;
  errors: ErrorMetrics;
}

export interface CPUMetrics {
  usage: number;
  loadAverage: number[];
  cores: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

export interface SessionMetrics {
  total: number;
  active: number;
  suspended: number;
  error: number;
  byProject: Map<string, number>;
  averageLifetime: number;
  creationRate: number;
}

export interface StreamMetrics {
  total: number;
  connected: number;
  disconnected: number;
  totalBytesIn: number;
  totalBytesOut: number;
  averageLatency: number;
}

export interface ErrorMetrics {
  total: number;
  byType: Map<string, number>;
  rate: number;
  lastError?: {
    timestamp: Date;
    type: string;
    message: string;
  };
}

export interface HealthStatus {
  healthy: boolean;
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message?: string;
  value?: any;
  threshold?: any;
}

/**
 * MetricsCollector - Observes and collects metrics
 * Does not modify state, only observes and reports
 */
export class MetricsCollector extends EventEmitter {
  private sessionManager: SessionManager;
  private streamManager: StreamManager;

  // Metrics storage
  private metricsHistory: SystemMetrics[] = [];
  private errorLog: Array<{ timestamp: Date; type: string; message: string }> =
    [];
  private sessionCreationTimes: number[] = [];

  // Configuration
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly METRICS_INTERVAL = 10000; // 10 seconds
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  // Thresholds
  private readonly CPU_THRESHOLD = 80;
  private readonly MEMORY_THRESHOLD = 2048; // MB
  private readonly ERROR_RATE_THRESHOLD = 10; // per minute
  private readonly LATENCY_THRESHOLD = 100; // ms

  constructor(sessionManager: SessionManager, streamManager: StreamManager) {
    super();
    this.sessionManager = sessionManager;
    this.streamManager = streamManager;

    this.setupEventListeners();
    this.startMetricsCollection();
    this.startHealthChecks();
  }

  /**
   * Get current metrics snapshot
   */
  public getCurrentMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      cpu: this.collectCPUMetrics(cpuUsage),
      memory: this.collectMemoryMetrics(memUsage),
      sessions: this.collectSessionMetrics(),
      streams: this.collectStreamMetrics(),
      errors: this.collectErrorMetrics(),
    };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(duration?: number): SystemMetrics[] {
    if (!duration) return this.metricsHistory;

    const cutoff = Date.now() - duration;
    return this.metricsHistory.filter((m) => m.timestamp.getTime() > cutoff);
  }

  /**
   * Get health status
   */
  public getHealthStatus(): HealthStatus {
    const checks: HealthCheck[] = [];
    const metrics = this.getCurrentMetrics();

    // CPU check
    checks.push({
      name: "CPU Usage",
      status: metrics.cpu.usage > this.CPU_THRESHOLD ? "warn" : "pass",
      value: `${metrics.cpu.usage.toFixed(1)}%`,
      threshold: `${this.CPU_THRESHOLD}%`,
    });

    // Memory check
    const memoryMB = metrics.memory.rss / 1024 / 1024;
    checks.push({
      name: "Memory Usage",
      status: memoryMB > this.MEMORY_THRESHOLD ? "warn" : "pass",
      value: `${memoryMB.toFixed(0)}MB`,
      threshold: `${this.MEMORY_THRESHOLD}MB`,
    });

    // Session check
    checks.push({
      name: "Active Sessions",
      status: metrics.sessions.active > 100 ? "warn" : "pass",
      value: metrics.sessions.active,
      threshold: 100,
    });

    // Stream health
    const disconnectedRatio =
      metrics.streams.disconnected / Math.max(1, metrics.streams.total);
    checks.push({
      name: "Stream Connectivity",
      status:
        disconnectedRatio > 0.5
          ? "fail"
          : disconnectedRatio > 0.2
            ? "warn"
            : "pass",
      value: `${(100 - disconnectedRatio * 100).toFixed(0)}% connected`,
    });

    // Error rate check
    checks.push({
      name: "Error Rate",
      status: metrics.errors.rate > this.ERROR_RATE_THRESHOLD ? "fail" : "pass",
      value: `${metrics.errors.rate.toFixed(1)}/min`,
      threshold: `${this.ERROR_RATE_THRESHOLD}/min`,
    });

    // Latency check
    checks.push({
      name: "Average Latency",
      status:
        metrics.streams.averageLatency > this.LATENCY_THRESHOLD
          ? "warn"
          : "pass",
      value: `${metrics.streams.averageLatency.toFixed(0)}ms`,
      threshold: `${this.LATENCY_THRESHOLD}ms`,
    });

    const healthy = !checks.some((c) => c.status === "fail");

    return {
      healthy,
      checks,
      timestamp: new Date(),
    };
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    summary: string;
    recommendations: string[];
    metrics: any;
  } {
    const metrics = this.getCurrentMetrics();
    const health = this.getHealthStatus();

    const recommendations: string[] = [];

    // Memory recommendations
    const memoryMB = metrics.memory.rss / 1024 / 1024;
    if (memoryMB > this.MEMORY_THRESHOLD) {
      recommendations.push(
        "High memory usage detected. Consider closing inactive sessions.",
      );
    }

    // CPU recommendations
    if (metrics.cpu.usage > this.CPU_THRESHOLD) {
      recommendations.push(
        "High CPU usage. Review active processes and consider load distribution.",
      );
    }

    // Session recommendations
    if (metrics.sessions.active > 50) {
      recommendations.push(
        "Many active sessions. Monitor for performance degradation.",
      );
    }

    // Error recommendations
    if (metrics.errors.rate > 5) {
      recommendations.push(
        "Elevated error rate. Check logs for recurring issues.",
      );
    }

    // Stream recommendations
    if (metrics.streams.averageLatency > 50) {
      recommendations.push("High stream latency. Check network conditions.");
    }

    const summary = health.healthy
      ? "System is healthy and performing within normal parameters."
      : "System has issues that require attention.";

    return {
      summary,
      recommendations,
      metrics: {
        cpu: `${metrics.cpu.usage.toFixed(1)}%`,
        memory: `${memoryMB.toFixed(0)}MB`,
        sessions: metrics.sessions.active,
        streams: metrics.streams.connected,
        errors: metrics.errors.rate,
        latency: `${metrics.streams.averageLatency.toFixed(0)}ms`,
      },
    };
  }

  /**
   * Export metrics for external monitoring
   */
  public exportPrometheusMetrics(): string {
    const metrics = this.getCurrentMetrics();
    const lines: string[] = [];

    // CPU metrics
    lines.push(`# HELP terminal_cpu_usage CPU usage percentage`);
    lines.push(`# TYPE terminal_cpu_usage gauge`);
    lines.push(`terminal_cpu_usage ${metrics.cpu.usage}`);

    // Memory metrics
    lines.push(`# HELP terminal_memory_usage Memory usage in bytes`);
    lines.push(`# TYPE terminal_memory_usage gauge`);
    lines.push(`terminal_memory_usage{type="heap"} ${metrics.memory.heapUsed}`);
    lines.push(`terminal_memory_usage{type="rss"} ${metrics.memory.rss}`);

    // Session metrics
    lines.push(`# HELP terminal_sessions_total Total number of sessions`);
    lines.push(`# TYPE terminal_sessions_total gauge`);
    lines.push(`terminal_sessions_total ${metrics.sessions.total}`);
    lines.push(`terminal_sessions_active ${metrics.sessions.active}`);

    // Stream metrics
    lines.push(`# HELP terminal_streams_total Total number of streams`);
    lines.push(`# TYPE terminal_streams_total gauge`);
    lines.push(`terminal_streams_total ${metrics.streams.total}`);
    lines.push(`terminal_streams_connected ${metrics.streams.connected}`);

    // Error metrics
    lines.push(`# HELP terminal_errors_total Total number of errors`);
    lines.push(`# TYPE terminal_errors_total counter`);
    lines.push(`terminal_errors_total ${metrics.errors.total}`);

    // Latency metrics
    lines.push(`# HELP terminal_latency_ms Average latency in milliseconds`);
    lines.push(`# TYPE terminal_latency_ms gauge`);
    lines.push(`terminal_latency_ms ${metrics.streams.averageLatency}`);

    return lines.join("\n");
  }

  // Private methods

  private collectCPUMetrics(cpuUsage: NodeJS.CpuUsage): CPUMetrics {
    const totalTime = cpuUsage.user + cpuUsage.system;
    const usage = (totalTime / 1000000) * 100; // Convert to percentage

    return {
      usage: Math.min(100, usage),
      loadAverage: require("os").loadavg(),
      cores: require("os").cpus().length,
    };
  }

  private collectMemoryMetrics(memUsage: NodeJS.MemoryUsage): MemoryMetrics {
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };
  }

  private collectSessionMetrics(): SessionMetrics {
    const stats = this.sessionManager.getStatistics();
    const sessions = this.sessionManager["sessions"]; // Access private for metrics

    const byProject = new Map<string, number>();
    const projectSessions = this.sessionManager["projectSessions"];
    for (const [projectId, sessionIds] of projectSessions) {
      byProject.set(projectId, sessionIds.size);
    }

    // Calculate average lifetime
    let totalLifetime = 0;
    let closedCount = 0;
    for (const session of sessions.values()) {
      if (session.status === SessionStatus.CLOSED) {
        totalLifetime +=
          session.updatedAt.getTime() - session.createdAt.getTime();
        closedCount++;
      }
    }
    const averageLifetime = closedCount > 0 ? totalLifetime / closedCount : 0;

    // Calculate creation rate (per minute)
    const now = Date.now();
    const recentCreations = this.sessionCreationTimes.filter(
      (t) => now - t < 60000,
    );
    const creationRate = recentCreations.length;

    return {
      total: stats.totalSessions,
      active: stats.activeSessions,
      suspended: stats.suspendedSessions,
      error: Array.from(sessions.values()).filter(
        (s) => s.status === SessionStatus.ERROR,
      ).length,
      byProject,
      averageLifetime,
      creationRate,
    };
  }

  private collectStreamMetrics(): StreamMetrics {
    const streams = this.streamManager.getActiveStreams();
    const allStreams = this.streamManager["streams"]; // Access private for metrics

    let totalBytesIn = 0;
    let totalBytesOut = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const stream of allStreams.values()) {
      totalBytesIn += stream.metrics.bytesIn;
      totalBytesOut += stream.metrics.bytesOut;
      if (stream.metrics.latency > 0) {
        totalLatency += stream.metrics.latency;
        latencyCount++;
      }
    }

    return {
      total: allStreams.size,
      connected: streams.length,
      disconnected: allStreams.size - streams.length,
      totalBytesIn,
      totalBytesOut,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    };
  }

  private collectErrorMetrics(): ErrorMetrics {
    const byType = new Map<string, number>();
    for (const error of this.errorLog) {
      const count = byType.get(error.type) || 0;
      byType.set(error.type, count + 1);
    }

    // Calculate error rate (per minute)
    const now = Date.now();
    const recentErrors = this.errorLog.filter(
      (e) => now - e.timestamp.getTime() < 60000,
    );
    const rate = recentErrors.length;

    return {
      total: this.errorLog.length,
      byType,
      rate,
      lastError:
        this.errorLog.length > 0
          ? this.errorLog[this.errorLog.length - 1]
          : undefined,
    };
  }

  private setupEventListeners(): void {
    // Session events
    this.sessionManager.on("session:created", (session: TerminalSession) => {
      this.sessionCreationTimes.push(Date.now());
      // Keep only recent times
      const cutoff = Date.now() - 300000; // 5 minutes
      this.sessionCreationTimes = this.sessionCreationTimes.filter(
        (t) => t > cutoff,
      );
    });

    this.sessionManager.on("session:error", (data: any) => {
      this.recordError(
        "session",
        data.error?.message || "Unknown session error",
      );
    });

    // Stream events
    this.streamManager.on("stream:error", (data: any) => {
      this.recordError("stream", data.error?.message || "Unknown stream error");
    });

    this.streamManager.on("stream:reconnect-failed", (data: any) => {
      this.recordError(
        "reconnect",
        `Failed to reconnect stream ${data.sessionId}`,
      );
    });
  }

  private recordError(type: string, message: string): void {
    this.errorLog.push({
      timestamp: new Date(),
      type,
      message,
    });

    // Keep log size limited
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }

    this.emit("error:recorded", { type, message });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const metrics = this.getCurrentMetrics();
      this.metricsHistory.push(metrics);

      // Keep history size limited
      if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
        this.metricsHistory = this.metricsHistory.slice(
          -this.MAX_HISTORY_SIZE / 2,
        );
      }

      this.emit("metrics:collected", metrics);
    }, this.METRICS_INTERVAL);
  }

  private startHealthChecks(): void {
    setInterval(() => {
      const health = this.getHealthStatus();

      if (!health.healthy) {
        this.emit("health:unhealthy", health);
      }

      this.emit("health:checked", health);
    }, this.HEALTH_CHECK_INTERVAL);
  }
}

// Note: This is not a singleton - must be instantiated with dependencies
