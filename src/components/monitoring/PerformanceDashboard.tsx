"use client";

import React, { useState, useEffect, useCallback } from "react";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react";

interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  requestRate: number;
  errorRate: number;
  taskExecutionTime: {
    byType: Map<string, number>;
    average: number;
    total: number;
  };
  taskCompletionRate: number;
  taskQueueLength: number;
  memoryUsage: {
    heap: number;
    external: number;
    rss: number;
  };
  cpuUsage: number;
  activeConnections: number;
  wsLatency: number;
  wsMessageRate: number;
  wsConnectionCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keys: number;
}

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  errorRate: number;
  uptime: number;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("http://${getServiceUrl("marketData")}/metrics/snapshot");
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);

        // Update historical data
        setHistoricalData((prev) => {
          const newData = [
            ...prev,
            {
              timestamp: new Date().toLocaleTimeString(),
              responseTime: data.data.responseTime.p95,
              requestRate: data.data.requestRate,
              errorRate: data.data.errorRate * 100,
              cpuUsage: data.data.cpuUsage,
              memoryUsage: data.data.memoryUsage.heap / (1024 * 1024), // Convert to MB
            },
          ].slice(-30); // Keep last 30 data points
          return newData;
        });
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch cache statistics
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch("http://${getServiceUrl("marketData")}/cache/stats");
      const data = await response.json();
      if (data.success) {
        setCacheStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cache stats:", error);
    }
  }, []);

  // Fetch service health
  const fetchServiceHealth = useCallback(async () => {
    try {
      const response = await fetch("http://${getGatewayPort()}/health/all");
      const data = await response.json();

      // Transform data into service health format
      const healthData: ServiceHealth[] = Object.entries(
        data.services || {},
      ).map(([name, info]: [string, any]) => ({
        name,
        status:
          info.status === "OK"
            ? "healthy"
            : info.status === "DEGRADED"
              ? "degraded"
              : "unhealthy",
        responseTime: info.responseTime || 0,
        errorRate: info.errorRate || 0,
        uptime: info.uptime || 0,
      }));

      setServices(healthData);
    } catch (error) {
      console.error("Failed to fetch service health:", error);
    }
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    fetchMetrics();
    fetchCacheStats();
    fetchServiceHealth();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchCacheStats();
      fetchServiceHealth();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchMetrics, fetchCacheStats, fetchServiceHealth]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
          </select>
          <Button
            onClick={() => {
              fetchMetrics();
              fetchCacheStats();
              fetchServiceHealth();
            }}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Response Time (P95)
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.responseTime.p95.toFixed(2)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              P99: {metrics.responseTime.p99.toFixed(2)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.requestRate.toFixed(2)} req/s
            </div>
            <p className="text-xs text-muted-foreground">
              Error Rate: {(metrics.errorRate * 100).toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cpuUsage.toFixed(1)}%
            </div>
            <Progress value={metrics.cpuUsage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(metrics.memoryUsage.heap)}
            </div>
            <p className="text-xs text-muted-foreground">
              RSS: {formatBytes(metrics.memoryUsage.rss)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="ai-tasks">AI Tasks</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="websockets">WebSockets</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#8884d8"
                    name="Response Time (ms)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="requestRate"
                    stroke="#82ca9d"
                    name="Request Rate (req/s)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="errorRate"
                    stroke="#ff7c7c"
                    name="Error Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cpuUsage"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="CPU %"
                    />
                    <Area
                      type="monotone"
                      dataKey="memoryUsage"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      name="Memory (MB)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">P50 (Median)</span>
                    <Badge variant="secondary">
                      {metrics.responseTime.p50.toFixed(2)}ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">P95</span>
                    <Badge variant="secondary">
                      {metrics.responseTime.p95.toFixed(2)}ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">P99</span>
                    <Badge variant="secondary">
                      {metrics.responseTime.p99.toFixed(2)}ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Max</span>
                    <Badge variant="secondary">
                      {metrics.responseTime.max.toFixed(2)}ms
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Server
                        className={`h-5 w-5 ${getStatusColor(service.status)}`}
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uptime: {formatUptime(service.uptime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">Response Time</p>
                        <p className="font-medium">
                          {service.responseTime.toFixed(2)}ms
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Error Rate</p>
                        <p className="font-medium">
                          {(service.errorRate * 100).toFixed(2)}%
                        </p>
                      </div>
                      <Badge
                        variant={
                          service.status === "healthy"
                            ? "default"
                            : service.status === "degraded"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tasks Tab */}
        <TabsContent value="ai-tasks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Task Queue
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.taskQueueLength}
                </div>
                <p className="text-xs text-muted-foreground">Pending tasks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.taskCompletionRate * 100).toFixed(1)}%
                </div>
                <Progress
                  value={metrics.taskCompletionRate * 100}
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Execution Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.taskExecutionTime.average.toFixed(2)}s
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {metrics.taskExecutionTime.total.toFixed(2)}s
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          {cacheStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Hit Rate
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(cacheStats.hitRate * 100).toFixed(1)}%
                    </div>
                    <Progress
                      value={cacheStats.hitRate * 100}
                      className="h-2 mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Cache Keys
                    </CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cacheStats.keys}</div>
                    <p className="text-xs text-muted-foreground">
                      Memory: {formatBytes(cacheStats.memoryUsage)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Operations
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {cacheStats.hits + cacheStats.misses}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hits: {cacheStats.hits} | Misses: {cacheStats.misses}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Evictions
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {cacheStats.evictions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total evicted entries
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* WebSockets Tab */}
        <TabsContent value="websockets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Connections
                </CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.wsConnectionCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  WebSocket connections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Message Rate
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.wsMessageRate.toFixed(2)} msg/s
                </div>
                <p className="text-xs text-muted-foreground">
                  Messages per second
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latency</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.wsLatency.toFixed(2)}ms
                </div>
                <p className="text-xs text-muted-foreground">Average latency</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alerts Section */}
      {metrics.errorRate > 0.05 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            High error rate detected: {(metrics.errorRate * 100).toFixed(2)}% -
            Investigation recommended
          </AlertDescription>
        </Alert>
      )}

      {metrics.responseTime.p95 > 200 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Response time exceeds target: P95 ={" "}
            {metrics.responseTime.p95.toFixed(2)}ms (Target: 200ms)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PerformanceDashboard;
