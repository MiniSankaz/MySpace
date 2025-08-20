/**
 * Configuration for Code Marking Service
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Service configuration
  port: parseInt(process.env.PORT || '4192', 10),
  env: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/code_marking',
  
  // Redis for queues
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  
  // AI Orchestrator
  aiOrchestratorUrl: process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4191',
  
  // Project configuration
  projectRoot: process.env.PROJECT_ROOT || '/Volumes/Untitled/Progress/port',
  
  // Indexing configuration
  indexing: {
    batchSize: parseInt(process.env.INDEX_BATCH_SIZE || '50', 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10), // 1MB
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      'coverage/**',
      '*.min.js',
      '*.map',
      'package-lock.json',
      'yarn.lock',
      '.env*'
    ],
    includeExtensions: [
      '.ts', '.tsx', '.js', '.jsx',
      '.py', '.java', '.go', '.rs',
      '.c', '.cpp', '.h', '.hpp',
      '.cs', '.rb', '.php', '.swift',
      '.json', '.yaml', '.yml',
      '.md', '.sql'
    ]
  },
  
  // Agent configuration
  agents: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_AGENTS || '5', 10),
    timeout: parseInt(process.env.AGENT_TIMEOUT || '300000', 10), // 5 minutes
    retryAttempts: parseInt(process.env.AGENT_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.AGENT_RETRY_DELAY || '5000', 10)
  },
  
  // Marking configuration
  marking: {
    complexityThreshold: parseInt(process.env.COMPLEXITY_THRESHOLD || '10', 10),
    duplicateThreshold: parseFloat(process.env.DUPLICATE_THRESHOLD || '0.8'),
    minDuplicateLines: parseInt(process.env.MIN_DUPLICATE_LINES || '10', 10),
    performancePatterns: true,
    securityPatterns: true,
    architecturePatterns: true
  },
  
  // Refactoring configuration
  refactoring: {
    autoApprove: process.env.AUTO_APPROVE_REFACTORING === 'true',
    maxChangesPerFile: parseInt(process.env.MAX_CHANGES_PER_FILE || '10', 10),
    requireReview: process.env.REQUIRE_REVIEW === 'true',
    backupBeforeRefactor: true
  },
  
  // File watching
  fileWatcher: {
    enabled: process.env.ENABLE_FILE_WATCHER !== 'false',
    debounceMs: parseInt(process.env.WATCHER_DEBOUNCE || '1000', 10),
    ignoreInitial: true
  },
  
  // Queue configuration
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
    defaultPriority: parseInt(process.env.DEFAULT_PRIORITY || '5', 10),
    removeOnComplete: true,
    removeOnFail: false
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logDir: process.env.LOG_DIR || path.join(__dirname, '../logs')
  },
  
  // Performance
  performance: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    profileMemory: process.env.PROFILE_MEMORY === 'true'
  }
};

// Validate configuration
export function validateConfig() {
  const required = ['projectRoot', 'databaseUrl'];
  const missing = required.filter(key => !config[key as keyof typeof config]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Validate project root exists
  const fs = require('fs');
  if (!fs.existsSync(config.projectRoot)) {
    throw new Error(`Project root does not exist: ${config.projectRoot}`);
  }
  
  return true;
}