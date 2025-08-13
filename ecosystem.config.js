/**
 * PM2 Ecosystem Configuration for Terminal Storage System
 */

module.exports = {
  apps: [
    {
      name: 'terminal-storage',
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        TERMINAL_STORAGE_MODE: 'LOCAL',
        TERMINAL_COMPATIBILITY_MODE: 'hybrid'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        TERMINAL_STORAGE_MODE: 'HYBRID',
        TERMINAL_COMPATIBILITY_MODE: 'storage',
        NODE_OPTIONS: '--max-old-space-size=8192'
      },
      
      // Memory management
      max_memory_restart: '7G',
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      
      // Monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto restart
      autorestart: true,
      watch: false,
      
      // Cluster mode settings
      instances: 1,
      exec_mode: 'cluster',
      
      // Additional options
      source_map_support: true,
      
      // Health check
      health_check: {
        interval: 30000,
        url: 'http://localhost:4000/api/terminal/health',
        max_failed_checks: 3
      }
    }
  ],
  
  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/terminal-storage.git',
      path: '/var/www/terminal-storage',
      'pre-deploy-local': 'npm test',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install -y nodejs npm'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-repo/terminal-storage.git',
      path: '/var/www/terminal-storage-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        TERMINAL_STORAGE_MODE: 'DATABASE'
      }
    }
  }
};