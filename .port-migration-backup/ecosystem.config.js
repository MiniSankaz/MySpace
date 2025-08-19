/**
 * PM2 Ecosystem Configuration for Stock Portfolio v3.0 Microservices
 * This configuration manages 6 microservices without Docker
 */

module.exports = {
  apps: [
    // 1. API Gateway Service - Main entry point
    {
      name: "gateway",
      script: "dist/index.js",
      cwd: "./services/gateway",
      instances: 1, // Reduced for memory optimization
      exec_mode: "fork", // Changed to fork for better memory control
      node_args: "--max-old-space-size=256 --expose-gc --optimize-for-size",
      port: 4000,
      env: {
        NODE_ENV: "development",
        PORT: 4000,
        SERVICE_NAME: "gateway",
        LOG_LEVEL: "debug",
        // Service URLs for routing
        USER_SERVICE_URL: "http://localhost:4100",
        AI_SERVICE_URL: "http://localhost:4200",
        TERMINAL_SERVICE_URL: "http://localhost:4300",
        WORKSPACE_SERVICE_URL: "http://localhost:4400",
        PORTFOLIO_SERVICE_URL: "http://localhost:4500",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        LOG_LEVEL: "info",
        instances: 4,
      },
      error_file: "./logs/gateway-error.log",
      out_file: "./logs/gateway-out.log",
      log_file: "./logs/gateway-combined.log",
      time: true,
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // 2. User Management Service - Authentication & Authorization
    {
      name: "user-service",
      script: "dist/index.js",
      cwd: "./services/user-management",
      instances: 2,
      exec_mode: "cluster",
      port: 4100,
      env: {
        NODE_ENV: "development",
        PORT: 4100,
        SERVICE_NAME: "user-management",
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key",
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
        REDIS_URL: "redis://localhost:6379/0",
        LOG_LEVEL: "debug",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4100,
        LOG_LEVEL: "info",
        instances: 2,
      },
      error_file: "./logs/user-service-error.log",
      out_file: "./logs/user-service-out.log",
      log_file: "./logs/user-service-combined.log",
      time: true,
      max_memory_restart: "400M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // 3. AI Assistant Service - Claude Integration
    {
      name: "ai-service",
      script: "dist/index.js",
      cwd: "./services/ai-assistant",
      instances: 1, // Single instance for WebSocket
      exec_mode: "fork",
      port: 4200,
      env: {
        NODE_ENV: "development",
        PORT: 4200,
        SERVICE_NAME: "ai-assistant",
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: "redis://localhost:6379/1",
        MAX_TOKENS: 4096,
        MODEL: "claude-3-opus-20240229",
        LOG_LEVEL: "debug",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4200,
        LOG_LEVEL: "info",
      },
      error_file: "./logs/ai-service-error.log",
      out_file: "./logs/ai-service-out.log",
      log_file: "./logs/ai-service-combined.log",
      time: true,
      max_memory_restart: "600M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // 4. Terminal Service - Terminal V2 Operations
    {
      name: "terminal-service",
      script: "dist/index.js",
      cwd: "./services/terminal",
      instances: 1, // Single instance for PTY management
      exec_mode: "fork",
      port: 4300,
      env: {
        NODE_ENV: "development",
        PORT: 4300,
        SERVICE_NAME: "terminal",
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: "redis://localhost:6379/2",
        MAX_SESSIONS: 100,
        SESSION_TIMEOUT: 3600000, // 1 hour
        MEMORY_LIMIT: 512, // MB per session
        LOG_LEVEL: "debug",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4300,
        LOG_LEVEL: "info",
        MAX_SESSIONS: 500,
      },
      error_file: "./logs/terminal-service-error.log",
      out_file: "./logs/terminal-service-out.log",
      log_file: "./logs/terminal-service-combined.log",
      time: true,
      max_memory_restart: "800M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // 5. Workspace Service - File & Git Management
    {
      name: "workspace-service",
      script: "dist/index.js",
      cwd: "./services/workspace",
      instances: 2,
      exec_mode: "cluster",
      port: 4400,
      env: {
        NODE_ENV: "development",
        PORT: 4400,
        SERVICE_NAME: "workspace",
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: "redis://localhost:6379/3",
        WORKSPACE_ROOT: "./workspaces",
        MAX_FILE_SIZE: 10485760, // 10MB
        ALLOWED_EXTENSIONS:
          ".js,.ts,.jsx,.tsx,.json,.md,.txt,.py,.java,.cpp,.c,.h,.css,.html,.yml,.yaml",
        LOG_LEVEL: "debug",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4400,
        LOG_LEVEL: "info",
        instances: 3,
      },
      error_file: "./logs/workspace-service-error.log",
      out_file: "./logs/workspace-service-out.log",
      log_file: "./logs/workspace-service-combined.log",
      time: true,
      max_memory_restart: "500M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // 6. Portfolio Service - Stock Trading Features
    {
      name: "portfolio-service",
      script: "dist/index.js",
      cwd: "./services/portfolio",
      instances: 2,
      exec_mode: "cluster",
      port: 4500,
      env: {
        NODE_ENV: "development",
        PORT: 4500,
        SERVICE_NAME: "portfolio",
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: "redis://localhost:6379/4",
        ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
        MARKET_DATA_CACHE_TTL: 300, // 5 minutes
        PORTFOLIO_CALC_INTERVAL: 60000, // 1 minute
        LOG_LEVEL: "debug",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4500,
        LOG_LEVEL: "info",
        instances: 3,
      },
      error_file: "./logs/portfolio-service-error.log",
      out_file: "./logs/portfolio-service-out.log",
      log_file: "./logs/portfolio-service-combined.log",
      time: true,
      max_memory_restart: "400M",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: "deploy",
      host: "production-server",
      ref: "origin/main",
      repo: "git@github.com:user/stock-portfolio.git",
      path: "/var/www/stock-portfolio",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
    },
    staging: {
      user: "deploy",
      host: "staging-server",
      ref: "origin/develop",
      repo: "git@github.com:user/stock-portfolio.git",
      path: "/var/www/stock-portfolio-staging",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env staging",
    },
  },
};

/**
 * PM2 Commands Reference:
 *
 * Start all services:
 *   pm2 start ecosystem.config.js
 *
 * Start specific service:
 *   pm2 start ecosystem.config.js --only gateway
 *
 * Stop all services:
 *   pm2 stop all
 *
 * Restart all services:
 *   pm2 restart all
 *
 * View logs:
 *   pm2 logs
 *   pm2 logs gateway
 *
 * Monitor services:
 *   pm2 monit
 *
 * Service status:
 *   pm2 status
 *
 * Save current process list:
 *   pm2 save
 *
 * Resurrect saved process list:
 *   pm2 resurrect
 *
 * Setup startup script:
 *   pm2 startup
 *
 * Delete all services:
 *   pm2 delete all
 *
 * Reload with zero-downtime:
 *   pm2 reload all
 */
