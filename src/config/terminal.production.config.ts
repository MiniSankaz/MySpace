/**
 * Terminal Production Configuration
 * Optimized settings for production environment
 */

export const terminalProductionConfig = {
  // Mode
  mode: 'new' as const, // Use new system in production
  
  // Performance
  memory: {
    maxTotalSessions: 200,
    maxSessionsPerProject: 20,
    maxFocusedPerProject: 5,
    sessionTimeout: 1800000, // 30 minutes
    cleanupInterval: 300000, // 5 minutes
    poolSize: 50,
    gcThreshold: 4 * 1024 * 1024 * 1024, // 4GB
  },
  
  // WebSocket
  websocket: {
    timeout: 10000,
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    heartbeatInterval: 30000,
    maxMessageSize: 10 * 1024 * 1024, // 10MB
    compression: true,
  },
  
  // Monitoring
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    healthCheckInterval: 30000, // 30 seconds
    alertThresholds: {
      cpuUsage: 90,
      memoryUsage: 85,
      errorRate: 20,
      responseTime: 2000,
    },
    exportMetrics: true,
    metricsPath: '/metrics',
  },
  
  // Security
  security: {
    enableAuth: true,
    sessionExpiry: 86400000, // 24 hours
    maxFailedAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  },
  
  // Suspension
  suspension: {
    enabled: true,
    maxSuspensionTime: 3600000, // 1 hour
    bufferedOutputLimit: 5000,
    cleanupInterval: 600000, // 10 minutes
  },
  
  // Database
  database: {
    enabled: true,
    poolSize: 20,
    timeout: 10000,
    cacheEnabled: true,
    cacheTTL: 600000, // 10 minutes
  },
  
  // Resilience
  resilience: {
    circuitBreaker: {
      enabled: true,
      threshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    },
    retryPolicy: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      maxBackoff: 10000,
    },
  },
  
  // Logging
  logging: {
    level: 'warn',
    enableFileLogging: true,
    logPath: '/var/log/terminal',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
  },
};

// Export function to merge with base config
export function getProductionConfig() {
  const baseConfig = require('./terminal.config').terminalConfig;
  return {
    ...baseConfig,
    ...terminalProductionConfig,
    memory: {
      ...baseConfig.memory,
      ...terminalProductionConfig.memory,
    },
    websocket: {
      ...baseConfig.websocket,
      ...terminalProductionConfig.websocket,
    },
    monitoring: {
      ...baseConfig.monitoring,
      ...terminalProductionConfig.monitoring,
    },
  };
}