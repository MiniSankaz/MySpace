import path from 'path';
import os from 'os';

interface AppConfig {
  app: {
    port: number;
    host: string;
    baseUrl: string;
  };
  websocket: {
    systemPort: number;
    claudePort: number;
    host: string;
  };
  storage: {
    basePath: string;
    tempPath: string;
    logsPath: string;
    cachePath: string;
  };
  database: {
    url: string;
    timeout: number;
    poolSize: number;
    maxConnections: number;
  };
  terminal: {
    maxSessions: number;
    sessionTimeout: number;
    cleanupInterval: number;
  };
}

export const getConfig = (): AppConfig => {
  const host = process.env.HOST || '127.0.0.1';
  const port = parseInt(process.env.PORT || '4000');
  
  return {
    app: {
      port,
      host,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || `http://${host}:${port}`,
    },
    websocket: {
      systemPort: parseInt(process.env.WS_SYSTEM_PORT || '4001'),
      claudePort: parseInt(process.env.WS_CLAUDE_PORT || '4002'),
      host: process.env.WS_HOST || host,
    },
    storage: {
      basePath: process.env.TERMINAL_STORAGE_PATH || path.join(process.cwd(), 'storage', 'terminal-sessions'),
      tempPath: process.env.TEMP_PATH || path.join(os.tmpdir(), 'terminal-sessions'),
      logsPath: process.env.LOGS_PATH || path.join(process.cwd(), 'logs'),
      cachePath: process.env.CACHE_PATH || path.join(process.cwd(), '.cache'),
    },
    database: {
      url: process.env.DATABASE_URL || '',
      timeout: parseInt(process.env.DATABASE_TIMEOUT || '5000'),
      poolSize: parseInt(process.env.DATABASE_CONNECTION_POOL_SIZE || '10'),
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '50'),
    },
    terminal: {
      maxSessions: parseInt(process.env.MAX_TERMINAL_SESSIONS || '50'),
      sessionTimeout: parseInt(process.env.TERMINAL_SESSION_TIMEOUT || '1800000'), // 30 minutes
      cleanupInterval: parseInt(process.env.TERMINAL_CLEANUP_INTERVAL || '300000'), // 5 minutes
    },
  };
};

// Singleton instance
let configInstance: AppConfig | null = null;

export const config = (): AppConfig => {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
};

// Helper to check if running in production
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

// Helper to check if running in development
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

// Helper to check if running in test
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};