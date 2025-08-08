# Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Redis (optional but recommended)
- SSL certificate for HTTPS
- Domain name configured

## Environment Setup

### 1. Generate Production Environment

Run the setup script to generate secure secrets and configure environment:

```bash
./scripts/setup-production-env.sh
```

This will:

- Generate secure secrets for authentication
- Create `.env.production` file
- Set proper file permissions
- Add to `.gitignore`

### 2. Database Setup

Ensure your PostgreSQL database is ready:

```bash
# Set production environment
export NODE_ENV=production

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### 3. Build Application

```bash
# Install dependencies
npm ci --production

# Build Next.js application
npm run build
```

## Deployment Options

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "cms-production",
      script: "node_modules/.bin/next",
      args: "start",
      env_production: {
        NODE_ENV: "production",
        PORT: 3100,
      },
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
```

### Option 2: Systemd Service

Create `/etc/systemd/system/cms.service`:

```ini
[Unit]
Description=CMS Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/cms
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3100

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable cms
sudo systemctl start cms
```

### Option 3: Docker

```bash
# Build Docker image
docker build -t cms-app .

# Run container
docker run -d \
  --name cms \
  -p 3100:3100 \
  --env-file .env.production \
  cms-app
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Security Checklist

- [ ] SSL/TLS certificate installed
- [ ] Environment variables secured (chmod 600)
- [ ] Database connection uses SSL
- [ ] Firewall configured (only expose necessary ports)
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Content Security Policy headers set
- [ ] Regular security updates scheduled

## Monitoring

### 1. Application Logs

```bash
# PM2 logs
pm2 logs cms-production

# Systemd logs
sudo journalctl -u cms -f
```

### 2. Health Checks

Set up monitoring for:

- `/api/health` endpoint
- Database connectivity
- Memory usage
- CPU usage
- Response times

### 3. Error Tracking

Configure Sentry by setting `SENTRY_DSN` in production environment.

## Backup Strategy

### Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-cms-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/cms"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > "$BACKUP_DIR/cms_$DATE.sql"
# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-cms-db.sh

# Add to crontab
0 2 * * * /usr/local/bin/backup-cms-db.sh
```

### File Uploads

Ensure uploaded files are backed up or stored in object storage (S3, etc).

## Performance Optimization

1. **Enable Caching**
   - Redis for session storage
   - CDN for static assets
   - API response caching

2. **Database Optimization**
   - Connection pooling
   - Query optimization
   - Proper indexing

3. **Next.js Optimization**
   - Image optimization
   - Code splitting
   - Static generation where possible

## Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```bash
   lsof -i :3100
   kill -9 <PID>
   ```

2. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check PostgreSQL logs

3. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Use PM2 memory limit
   - Check for memory leaks

### Debug Mode

For troubleshooting, temporarily enable debug logging:

```bash
DEBUG=* npm start
```

## Maintenance

### Updates

1. Test updates in staging environment
2. Create database backup
3. Deploy during low-traffic period
4. Monitor logs after deployment

### Health Monitoring Script

```bash
#!/bin/bash
# health-check.sh
HEALTH_URL="https://your-domain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed: $RESPONSE"
    # Send alert (email, Slack, etc)
fi
```

## Support

For production issues:

1. Check application logs
2. Review error tracking (Sentry)
3. Check system resources
4. Review recent deployments
