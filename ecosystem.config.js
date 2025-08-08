module.exports = {
  apps: [
    {
      name: 'personal-assistant',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/personal-assistant.git',
      path: '/var/www/personal-assistant',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};