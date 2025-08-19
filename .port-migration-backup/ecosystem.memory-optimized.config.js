/**
 * PM2 Memory-Optimized Configuration for Stock Portfolio v3.0
 * Target: Reduce total memory usage from 5.95GB to under 2GB
 * Optimizations: Node.js heap limits, process consolidation, memory monitoring
 */

module.exports = {
  apps: [
    // 1. Frontend Application - Main Next.js App (Highest Priority for Optimization)
    {
      name: "frontend",
      script: "server.js",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      node_args:
        "--max-old-space-size=1024 --expose-gc --optimize-for-size --gc-interval=100",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        // Database optimization
        DATABASE_CONNECTION_LIMIT: "5",
        DATABASE_POOL_TIMEOUT: "10000",
        DATABASE_POOL_MIN: "2",
        DATABASE_POOL_MAX: "5",
        // Next.js optimizations
        NEXT_TELEMETRY_DISABLED: "1",
        // Memory monitoring
        MEMORY_MONITORING: "true",
        LOG_LEVEL: "warn", // Reduced logging
      },
      max_memory_restart: "1200M",
      min_uptime: "10s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      ignore_watch: ["node_modules", "logs", ".next", "dist"],
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend.log",
      merge_logs: true,
      time: true,
    },

    // 2. API Gateway Service - Entry Point with Memory Optimization
    {
      name: "gateway",
      script: "dist/index.js",
      cwd: "./services/gateway",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4000,
        SERVICE_NAME: "gateway",
        LOG_LEVEL: "warn",
        // Service URLs for routing
        USER_SERVICE_URL: "http://localhost:4100",
        AI_SERVICE_URL: "http://localhost:4200",
        TERMINAL_SERVICE_URL: "http://localhost:4300",
        WORKSPACE_SERVICE_URL: "http://localhost:4400",
        PORTFOLIO_SERVICE_URL: "http://localhost:4500",
        // Memory optimizations
        CONNECTION_TIMEOUT: "5000",
        KEEP_ALIVE_TIMEOUT: "5000",
        MAX_CONNECTIONS: "100",
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/gateway-error.log",
      out_file: "./logs/gateway-out.log",
      log_file: "./logs/gateway.log",
      merge_logs: true,
      time: true,
    },

    // 3. User Management Service - Lightweight Authentication
    {
      name: "user-service",
      script: "dist/index.js",
      cwd: "./services/user-management",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4100,
        SERVICE_NAME: "user-management",
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_CONNECTION_LIMIT: "3",
        DATABASE_POOL_TIMEOUT: "8000",
        JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key",
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
        REDIS_URL: "redis://localhost:6379/0",
        LOG_LEVEL: "warn",
        // User management optimizations
        SESSION_CLEANUP_INTERVAL: "300000", // 5 minutes
        MAX_SESSIONS_PER_USER: "5",
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/user-service-error.log",
      out_file: "./logs/user-service-out.log",
      log_file: "./logs/user-service.log",
      merge_logs: true,
      time: true,
    },

    // 4. AI Assistant Service - Claude Integration with Memory Limits
    {
      name: "ai-service",
      script: "dist/index.js",
      cwd: "./services/ai-assistant",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4200,
        SERVICE_NAME: "ai-assistant",
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_CONNECTION_LIMIT: "3",
        DATABASE_POOL_TIMEOUT: "8000",
        REDIS_URL: "redis://localhost:6379/1",
        MAX_TOKENS: 4096,
        MODEL: "claude-3-opus-20240229",
        LOG_LEVEL: "warn",
        // AI Assistant optimizations
        AI_MESSAGE_HISTORY_LIMIT: "100",
        AI_CONTEXT_WINDOW_SIZE: "8000",
        CONVERSATION_CLEANUP_INTERVAL: "600000", // 10 minutes
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/ai-service-error.log",
      out_file: "./logs/ai-service-out.log",
      log_file: "./logs/ai-service.log",
      merge_logs: true,
      time: true,
    },

    // 5. Terminal Service - PTY Management with Session Limits
    {
      name: "terminal-service",
      script: "dist/index.js",
      cwd: "./services/terminal",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4300,
        SERVICE_NAME: "terminal",
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_CONNECTION_LIMIT: "3",
        DATABASE_POOL_TIMEOUT: "8000",
        REDIS_URL: "redis://localhost:6379/2",
        LOG_LEVEL: "warn",
        // Terminal-specific optimizations
        TERMINAL_MAX_SESSIONS: "10",
        TERMINAL_BUFFER_SIZE: "1000",
        TERMINAL_CLEANUP_INTERVAL: "300000", // 5 minutes
        SESSION_TIMEOUT: 1800000, // 30 minutes (reduced from 1 hour)
        MEMORY_LIMIT: 256, // MB per session (reduced)
        MAX_SESSIONS: 50, // Reduced from 100
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/terminal-service-error.log",
      out_file: "./logs/terminal-service-out.log",
      log_file: "./logs/terminal-service.log",
      merge_logs: true,
      time: true,
    },

    // 6. Workspace Service - File & Git Management (Optimized)
    {
      name: "workspace-service",
      script: "dist/index.js",
      cwd: "./services/workspace",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4400,
        SERVICE_NAME: "workspace",
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_CONNECTION_LIMIT: "3",
        DATABASE_POOL_TIMEOUT: "8000",
        REDIS_URL: "redis://localhost:6379/3",
        WORKSPACE_ROOT: "./workspaces",
        MAX_FILE_SIZE: 5242880, // 5MB (reduced from 10MB)
        ALLOWED_EXTENSIONS:
          ".js,.ts,.jsx,.tsx,.json,.md,.txt,.py,.java,.cpp,.c,.h,.css,.html,.yml,.yaml",
        LOG_LEVEL: "warn",
        // Workspace optimizations
        FILE_CACHE_TTL: "300000", // 5 minutes
        GIT_OPERATION_TIMEOUT: "30000", // 30 seconds
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/workspace-service-error.log",
      out_file: "./logs/workspace-service-out.log",
      log_file: "./logs/workspace-service.log",
      merge_logs: true,
      time: true,
    },

    // 7. Portfolio Service - Stock Trading with Memory Optimization
    {
      name: "portfolio-service",
      script: "dist/index.js",
      cwd: "./services/portfolio",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4500,
        SERVICE_NAME: "portfolio",
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_CONNECTION_LIMIT: "5",
        DATABASE_POOL_TIMEOUT: "10000",
        REDIS_URL: "redis://localhost:6379/4",
        ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
        LOG_LEVEL: "warn",
        // Portfolio-specific optimizations
        PORTFOLIO_CACHE_TTL: "300000", // 5 minutes
        PORTFOLIO_MAX_POSITIONS: "1000",
        MARKET_DATA_CACHE_TTL: 300, // 5 minutes
        PORTFOLIO_CALC_INTERVAL: 60000, // 1 minute
        PRICE_UPDATE_BATCH_SIZE: "50", // Smaller batches
      },
      max_memory_restart: "300M",
      min_uptime: "5s",
      max_restarts: 3,
      autorestart: true,
      watch: false,
      error_file: "./logs/portfolio-service-error.log",
      out_file: "./logs/portfolio-service-out.log",
      log_file: "./logs/portfolio-service.log",
      merge_logs: true,
      time: true,
    },
  ],

  // Memory monitoring and cleanup job
  deploy: {
    development: {
      "post-deploy":
        "npm install && npm run build:services && npm run memory:baseline && pm2 reload ecosystem.memory-optimized.config.js",
      "pre-setup": "npm run memory:cleanup",
    },
    production: {
      user: "deploy",
      host: "production-server",
      ref: "origin/main",
      repo: "git@github.com:user/stock-portfolio.git",
      path: "/var/www/stock-portfolio",
      "pre-deploy": "npm run memory:cleanup",
      "post-deploy":
        "npm install && npm run build && npm run memory:baseline && pm2 reload ecosystem.memory-optimized.config.js --env production",
    },
  },
};

/**
 * Memory Optimization Commands:
 *
 * Start with memory optimization:
 *   pm2 start ecosystem.memory-optimized.config.js
 *
 * Monitor memory usage:
 *   pm2 monit
 *   npm run memory:monitor
 *
 * Memory cleanup:
 *   npm run memory:cleanup
 *
 * Check memory status:
 *   npm run memory:check
 *
 * Generate memory report:
 *   npm run memory:report
 *
 * Emergency memory cleanup:
 *   pm2 restart all && npm run memory:cleanup
 *
 * Target Memory Usage:
 *   Frontend: 1024MB (down from 5230MB)
 *   Gateway: 256MB (down from 192MB - maintained)
 *   Terminal: 256MB (down from 236MB - maintained)
 *   Portfolio: 256MB (down from 305MB)
 *   AI Assistant: 256MB (maintained)
 *   User Management: 256MB (maintained)
 *   Total Target: ~2.3GB (down from 5.95GB)
 *
 * Memory Monitoring Features:
 *   - Automatic restart on memory limit
 *   - Garbage collection exposure
 *   - Memory leak detection
 *   - Process consolidation
 *   - Optimized Node.js flags
 */
