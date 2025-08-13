/**
 * Terminal System Configuration
 * Centralized configuration for hybrid terminal architecture
 */

export interface TerminalConfig {
  mode: 'memory' | 'database' | 'hybrid';
  memory: MemoryConfig;
  database: DatabaseConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
  resilience: ResilienceConfig;
}

export interface MemoryConfig {
  maxSessions: number;
  maxSessionsPerProject: number;
  bufferSize: number;
  sessionTimeout: number;
  poolSize: number;
  gcThreshold: number;
}

export interface DatabaseConfig {
  enabled: boolean;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  fallbackToMemory: boolean;
  persistenceInterval: number;
}

export interface PerformanceConfig {
  maxConcurrentSessions: number;
  maxBufferSize: number;
  compressionEnabled: boolean;
  streamingChunkSize: number;
  debounceDelay: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  alertThresholds: {
    memory: number;
    cpu: number;
    sessions: number;
    errorRate: number;
  };
}

export interface ResilienceConfig {
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  gracefulShutdown: {
    enabled: boolean;
    timeout: number;
  };
}

// Environment-specific configurations
const development: TerminalConfig = {
  mode: 'memory',
  memory: {
    maxSessions: 20,
    maxSessionsPerProject: 5,
    bufferSize: 1000,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    poolSize: 20,
    gcThreshold: 500 * 1024 * 1024 // 500MB
  },
  database: {
    enabled: false,
    connectionTimeout: 5000,
    retryAttempts: 1,
    retryDelay: 1000,
    fallbackToMemory: true,
    persistenceInterval: 60000
  },
  performance: {
    maxConcurrentSessions: 10,
    maxBufferSize: 1000,
    compressionEnabled: false,
    streamingChunkSize: 1024,
    debounceDelay: 100
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    healthCheckInterval: 30000,
    alertThresholds: {
      memory: 1024, // 1GB
      cpu: 80,
      sessions: 50,
      errorRate: 5
    }
  },
  resilience: {
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      timeout: 60000,
      resetTimeout: 30000
    },
    rateLimit: {
      enabled: false,
      maxRequests: 100,
      windowMs: 60000
    },
    gracefulShutdown: {
      enabled: true,
      timeout: 10000
    }
  }
};

const production: TerminalConfig = {
  mode: 'hybrid',
  memory: {
    maxSessions: 100,
    maxSessionsPerProject: 10,
    bufferSize: 500,
    sessionTimeout: 15 * 60 * 1000, // 15 minutes
    poolSize: 50,
    gcThreshold: 2 * 1024 * 1024 * 1024 // 2GB
  },
  database: {
    enabled: true,
    connectionTimeout: 3000,
    retryAttempts: 3,
    retryDelay: 2000,
    fallbackToMemory: true,
    persistenceInterval: 30000
  },
  performance: {
    maxConcurrentSessions: 50,
    maxBufferSize: 500,
    compressionEnabled: true,
    streamingChunkSize: 512,
    debounceDelay: 200
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000,
    healthCheckInterval: 15000,
    alertThresholds: {
      memory: 3072, // 3GB
      cpu: 90,
      sessions: 80,
      errorRate: 2
    }
  },
  resilience: {
    circuitBreaker: {
      enabled: true,
      threshold: 10,
      timeout: 30000,
      resetTimeout: 60000
    },
    rateLimit: {
      enabled: true,
      maxRequests: 1000,
      windowMs: 60000
    },
    gracefulShutdown: {
      enabled: true,
      timeout: 30000
    }
  }
};

// Get configuration based on environment
export function getTerminalConfig(): TerminalConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? production : development;
}

// Configuration validator
export function validateConfig(config: TerminalConfig): boolean {
  // Basic validation rules
  if (config.memory.maxSessions < 1) return false;
  if (config.memory.bufferSize < 100) return false;
  if (config.database.connectionTimeout < 1000) return false;
  if (config.performance.maxConcurrentSessions < 1) return false;
  
  return true;
}

// Dynamic configuration updater
export class ConfigManager {
  private static instance: ConfigManager;
  private config: TerminalConfig;
  
  private constructor() {
    this.config = getTerminalConfig();
  }
  
  public static getInstance(): ConfigManager {
    if (!this.instance) {
      this.instance = new ConfigManager();
    }
    return this.instance;
  }
  
  public getConfig(): TerminalConfig {
    return this.config;
  }
  
  public updateConfig(updates: Partial<TerminalConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[ConfigManager] Configuration updated:', updates);
  }
  
  public getMemoryConfig(): MemoryConfig {
    return this.config.memory;
  }
  
  public getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }
  
  public isHybridMode(): boolean {
    return this.config.mode === 'hybrid';
  }
  
  public isDatabaseEnabled(): boolean {
    return this.config.database.enabled && this.config.mode !== 'memory';
  }
}

export const configManager = ConfigManager.getInstance();