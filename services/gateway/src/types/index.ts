// Gateway Service Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  service?: string;
}

export interface ServiceHealth {
  service: string;
  status: "OK" | "WARNING" | "ERROR" | "UNKNOWN";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  dependencies?: ServiceDependencyHealth[];
  metrics?: ServiceMetrics;
}

export interface ServiceDependencyHealth {
  name: string;
  status: "OK" | "ERROR" | "UNKNOWN";
  url?: string;
  responseTime?: number;
  lastChecked: Date;
}

export interface ServiceMetrics {
  requestsPerMinute?: number;
  averageResponseTime?: number;
  errorRate?: number;
  activeConnections?: number;
  responseTime?: number;
  lastChecked?: Date;
  errorMessage?: string;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}
