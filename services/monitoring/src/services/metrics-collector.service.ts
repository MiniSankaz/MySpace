import { EventEmitter } from "events";
import * as promClient from "prom-client";
import { logger } from "../utils/logger";

export interface PerformanceMetrics {
  // API Metrics
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  requestRate: number;
  errorRate: number;

  // AI Task Metrics
  taskExecutionTime: {
    byType: Map<string, number>;
    average: number;
    total: number;
  };
  taskCompletionRate: number;
  taskQueueLength: number;

  // Resource Metrics
  memoryUsage: {
    heap: number;
    external: number;
    rss: number;
  };
  cpuUsage: number;
  activeConnections: number;

  // WebSocket Metrics
  wsLatency: number;
  wsMessageRate: number;
  wsConnectionCount: number;
}

export class MetricsCollectorService extends EventEmitter {
  private registry: promClient.Registry;
  private metrics: Map<string, any>;
  private collectInterval: NodeJS.Timer | null = null;

  // Prometheus metrics
  private httpRequestDuration: promClient.Histogram<string>;
  private httpRequestTotal: promClient.Counter<string>;
  private httpErrorTotal: promClient.Counter<string>;
  private taskExecutionDuration: promClient.Histogram<string>;
  private taskQueueSize: promClient.Gauge<string>;
  private wsConnectionsActive: promClient.Gauge<string>;
  private wsMessageTotal: promClient.Counter<string>;
  private memoryUsageGauge: promClient.Gauge<string>;
  private cpuUsageGauge: promClient.Gauge<string>;

  constructor() {
    super();
    this.registry = new promClient.Registry();
    this.metrics = new Map();
    this.initializeMetrics();
    this.startCollecting();
  }

  private initializeMetrics(): void {
    // Default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: "stock_portfolio_",
    });

    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status", "service"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status", "service"],
      registers: [this.registry],
    });

    this.httpErrorTotal = new promClient.Counter({
      name: "http_errors_total",
      help: "Total number of HTTP errors",
      labelNames: ["method", "route", "status", "service"],
      registers: [this.registry],
    });

    // AI Task metrics
    this.taskExecutionDuration = new promClient.Histogram({
      name: "ai_task_execution_duration_seconds",
      help: "Duration of AI task execution in seconds",
      labelNames: ["task_type", "status"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [this.registry],
    });

    this.taskQueueSize = new promClient.Gauge({
      name: "ai_task_queue_size",
      help: "Current size of AI task queue",
      labelNames: ["priority"],
      registers: [this.registry],
    });

    // WebSocket metrics
    this.wsConnectionsActive = new promClient.Gauge({
      name: "websocket_connections_active",
      help: "Number of active WebSocket connections",
      labelNames: ["service"],
      registers: [this.registry],
    });

    this.wsMessageTotal = new promClient.Counter({
      name: "websocket_messages_total",
      help: "Total number of WebSocket messages",
      labelNames: ["direction", "service"],
      registers: [this.registry],
    });

    // Resource metrics
    this.memoryUsageGauge = new promClient.Gauge({
      name: "memory_usage_bytes",
      help: "Memory usage in bytes",
      labelNames: ["type", "service"],
      registers: [this.registry],
    });

    this.cpuUsageGauge = new promClient.Gauge({
      name: "cpu_usage_percentage",
      help: "CPU usage percentage",
      labelNames: ["service"],
      registers: [this.registry],
    });

    logger.info("Metrics initialized");
  }

  private startCollecting(): void {
    // Collect metrics every 10 seconds
    this.collectInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    logger.info("Started metrics collection");
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.memoryUsageGauge.set(
      { type: "heap", service: process.env.SERVICE_NAME || "monitoring" },
      memUsage.heapUsed,
    );

    this.memoryUsageGauge.set(
      { type: "external", service: process.env.SERVICE_NAME || "monitoring" },
      memUsage.external,
    );

    this.memoryUsageGauge.set(
      { type: "rss", service: process.env.SERVICE_NAME || "monitoring" },
      memUsage.rss,
    );

    // CPU usage (approximate)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    const uptime = process.uptime();
    const cpuPercentage = (totalCpu / uptime) * 100;

    this.cpuUsageGauge.set(
      { service: process.env.SERVICE_NAME || "monitoring" },
      cpuPercentage,
    );
  }

  // Record HTTP request
  public recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
    service: string = "gateway",
  ): void {
    const labels = { method, route, status: status.toString(), service };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestTotal.inc(labels);

    if (status >= 400) {
      this.httpErrorTotal.inc(labels);
    }
  }

  // Record AI task execution
  public recordTaskExecution(
    taskType: string,
    status: "success" | "failure",
    duration: number,
  ): void {
    this.taskExecutionDuration.observe(
      { task_type: taskType, status },
      duration / 1000,
    );
  }

  // Update task queue size
  public updateTaskQueueSize(priority: string, size: number): void {
    this.taskQueueSize.set({ priority }, size);
  }

  // Record WebSocket activity
  public recordWebSocketConnection(service: string, delta: number): void {
    this.wsConnectionsActive.inc({ service }, delta);
  }

  public recordWebSocketMessage(
    direction: "inbound" | "outbound",
    service: string,
  ): void {
    this.wsMessageTotal.inc({ direction, service });
  }

  // Calculate percentiles from histogram
  private calculatePercentiles(values: number[]): {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  } {
    if (values.length === 0) {
      return { p50: 0, p95: 0, p99: 0, max: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      max: sorted[sorted.length - 1] || 0,
    };
  }

  // Get current metrics snapshot
  public async getMetricsSnapshot(): Promise<PerformanceMetrics> {
    const metrics = await this.registry.getMetricsAsJSON();

    // Process and structure metrics
    const responseTimeValues: number[] = [];
    let requestCount = 0;
    let errorCount = 0;
    const taskTimes = new Map<string, number>();
    let taskQueueLength = 0;
    let wsConnections = 0;
    let wsMessages = 0;

    for (const metric of metrics) {
      switch (metric.name) {
        case "http_request_duration_seconds":
          // Extract response time values from histogram
          if (metric.type === "histogram" && metric.values) {
            for (const value of metric.values) {
              if (value.metricName === "http_request_duration_seconds_sum") {
                responseTimeValues.push((value.value || 0) * 1000); // Convert to ms
              }
            }
          }
          break;

        case "http_requests_total":
          if (metric.values) {
            requestCount = metric.values.reduce(
              (sum, v) => sum + (v.value || 0),
              0,
            );
          }
          break;

        case "http_errors_total":
          if (metric.values) {
            errorCount = metric.values.reduce(
              (sum, v) => sum + (v.value || 0),
              0,
            );
          }
          break;

        case "ai_task_queue_size":
          if (metric.values) {
            taskQueueLength = metric.values.reduce(
              (sum, v) => sum + (v.value || 0),
              0,
            );
          }
          break;

        case "websocket_connections_active":
          if (metric.values) {
            wsConnections = metric.values.reduce(
              (sum, v) => sum + (v.value || 0),
              0,
            );
          }
          break;

        case "websocket_messages_total":
          if (metric.values) {
            wsMessages = metric.values.reduce(
              (sum, v) => sum + (v.value || 0),
              0,
            );
          }
          break;
      }
    }

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      responseTime: this.calculatePercentiles(responseTimeValues),
      requestRate: requestCount / uptime,
      errorRate: requestCount > 0 ? errorCount / requestCount : 0,
      taskExecutionTime: {
        byType: taskTimes,
        average:
          taskTimes.size > 0
            ? Array.from(taskTimes.values()).reduce((a, b) => a + b, 0) /
              taskTimes.size
            : 0,
        total: Array.from(taskTimes.values()).reduce((a, b) => a + b, 0),
      },
      taskCompletionRate: 0.95, // TODO: Calculate from actual data
      taskQueueLength,
      memoryUsage: {
        heap: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpuUsage: ((cpuUsage.user + cpuUsage.system) / 1000000 / uptime) * 100,
      activeConnections: wsConnections,
      wsLatency: 0, // TODO: Calculate from actual data
      wsMessageRate: wsMessages / uptime,
      wsConnectionCount: wsConnections,
    };
  }

  // Get Prometheus metrics
  public async getPrometheusMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Clean up
  public stop(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }

    this.registry.clear();
    logger.info("Metrics collector stopped");
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollectorService();
