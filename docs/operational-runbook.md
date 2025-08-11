# Operational Runbook
## Stock Portfolio Management System v1.0

### Table of Contents
1. [System Overview](#system-overview)
2. [Quick Actions](#quick-actions)
3. [Monitoring & Health Checks](#monitoring--health-checks)
4. [Common Operations](#common-operations)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Emergency Procedures](#emergency-procedures)
7. [Performance Tuning](#performance-tuning)
8. [Security Operations](#security-operations)
9. [Backup & Recovery](#backup--recovery)
10. [Contact Information](#contact-information)

---

## System Overview

### Architecture Components
```
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                         │
│                  (Port 3000/443)                        │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│             Next.js Application Servers                 │
│         • Main App (Port 3000)                         │
│         • API Routes (/api/*)                          │
│         • Static Assets (/_next/*)                     │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│              WebSocket Services                         │
│         • Terminal WS (Port 4001)                      │
│         • Claude WS (Port 4002)                        │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│           PostgreSQL Database                           │
│         (DigitalOcean, Port 25060)                     │
└──────────────────────────────────────────────────────────┘
```

### Key Metrics
- **Target Response Time:** <100ms
- **Achieved Response Time:** 2.59ms (39x better)
- **Uptime Target:** 99.9%
- **Max Concurrent Users:** 100+
- **Memory Limit:** 500MB per instance
- **CPU Threshold:** 80%

---

## Quick Actions

### Start Production System
```bash
# Full production start
./scripts/production-deployment.sh

# Quick restart
./quick-restart.sh

# Start with specific environment
NODE_ENV=production npm start
```

### Stop Production System
```bash
# Graceful shutdown
kill -TERM $(cat .production.pid)

# Emergency stop
kill -9 $(cat .production.pid)

# Stop all services
./scripts/stop-all-services.sh
```

### Check System Status
```bash
# Health check
curl http://localhost:3000/api/health

# Detailed status
./scripts/check-system-status.sh

# Monitor logs
tail -f logs/production*.log
```

---

## Monitoring & Health Checks

### Primary Health Endpoints

| Endpoint | Purpose | Expected Response | Alert Threshold |
|----------|---------|-------------------|-----------------|
| `/api/health` | System health | `{"status":"ok"}` | 3 failures |
| `/api/dashboard/metrics` | Performance metrics | JSON metrics | 5 failures |
| `/api/ums/auth/session` | Auth service | Session data | 3 failures |

### Monitoring Commands

```bash
# Real-time monitoring
node scripts/monitor-deployment.js

# Performance metrics
curl http://localhost:3000/api/dashboard/metrics | jq '.'

# Database health
psql $DATABASE_URL -c "SELECT 1;"

# WebSocket health
nc -zv localhost 4001 && echo "Terminal WS: OK"
nc -zv localhost 4002 && echo "Claude WS: OK"
```

### Key Performance Indicators (KPIs)

1. **Response Time**
   - Green: <10ms
   - Yellow: 10-50ms
   - Red: >100ms

2. **Error Rate**
   - Green: <1%
   - Yellow: 1-5%
   - Red: >5%

3. **Memory Usage**
   - Green: <300MB
   - Yellow: 300-450MB
   - Red: >450MB

4. **CPU Usage**
   - Green: <50%
   - Yellow: 50-80%
   - Red: >80%

---

## Common Operations

### User Management

```bash
# Create admin user
tsx scripts/create-admin.ts

# Reset user password
tsx scripts/database/reset-user-password.ts

# List all users
tsx scripts/check-users.ts

# Create test user
tsx scripts/create-local-user.ts
```

### Database Operations

```bash
# Run migrations
npx prisma migrate deploy

# Database backup
./scripts/database/backup.sh

# Database restore
./scripts/database/restore.sh backup_file.sql

# Clear logs
tsx scripts/database/clear-logs.ts

# Seed data
tsx scripts/database/seed-full.ts
```

### Cache Management

```bash
# Clear all cache
redis-cli FLUSHALL

# Check cache status
redis-cli INFO stats

# Monitor cache operations
redis-cli MONITOR
```

### Session Management

```bash
# Clear all sessions
tsx scripts/clear-sessions.ts

# View active sessions
tsx scripts/check-active-sessions.ts

# Kill specific session
tsx scripts/kill-session.ts SESSION_ID
```

---

## Troubleshooting Guide

### Issue: High Response Times

**Symptoms:**
- Response times >100ms
- User complaints about slowness
- Monitoring alerts

**Diagnosis:**
```bash
# Check database query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Node.js event loop
node --inspect scripts/check-event-loop.js

# Check memory usage
free -m
ps aux | grep node
```

**Resolution:**
1. Restart application: `./quick-restart.sh`
2. Clear cache: `redis-cli FLUSHALL`
3. Check database indexes: `npx prisma db push`
4. Scale horizontally if needed

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- P2002/P2003 Prisma errors

**Diagnosis:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
netstat -an | grep 25060

# View database logs
tail -f logs/database*.log
```

**Resolution:**
1. Check environment variables: `grep DATABASE .env.production`
2. Restart database connection: `npx prisma generate`
3. Use offline mode fallback: System auto-switches to cache
4. Contact database provider if persistent

### Issue: WebSocket Disconnections

**Symptoms:**
- Terminal sessions dropping
- "Connection lost" messages
- Reconnection loops

**Diagnosis:**
```bash
# Check WebSocket services
lsof -i :4001
lsof -i :4002

# Monitor WebSocket logs
tail -f logs/websocket*.log

# Test WebSocket connection
wscat -c ws://localhost:4001
```

**Resolution:**
1. Restart WebSocket services:
   ```bash
   kill $(cat .terminal-ws.pid)
   node src/server/websocket/terminal-ws-standalone.js &
   ```
2. Check circuit breaker status
3. Clear session manager: `tsx scripts/clear-terminal-sessions.ts`

### Issue: Authentication Failures

**Symptoms:**
- Login failures
- "Invalid token" errors
- Session expiration issues

**Diagnosis:**
```bash
# Check JWT secret
grep JWT_SECRET .env.production

# Verify auth service
curl -X POST http://localhost:3000/api/ums/auth/session

# Check token expiration
tsx scripts/check-token-expiry.ts
```

**Resolution:**
1. Refresh JWT secret if compromised
2. Clear auth cache
3. Restart auth service
4. Check clock synchronization

---

## Emergency Procedures

### Complete System Failure

1. **Immediate Actions:**
   ```bash
   # Stop all services
   ./scripts/emergency-stop.sh
   
   # Switch to maintenance mode
   cp public/maintenance.html public/index.html
   
   # Notify stakeholders
   ./scripts/send-emergency-notification.sh
   ```

2. **Recovery Steps:**
   ```bash
   # Restore from backup
   ./scripts/database/restore.sh latest
   
   # Start in safe mode
   NODE_ENV=recovery npm start
   
   # Gradual service restoration
   ./scripts/phased-recovery.sh
   ```

### Security Breach

1. **Containment:**
   ```bash
   # Disable external access
   iptables -A INPUT -j DROP
   
   # Rotate all secrets
   ./scripts/rotate-secrets.sh
   
   # Enable audit logging
   export AUDIT_MODE=true
   ```

2. **Investigation:**
   ```bash
   # Check access logs
   grep -E "401|403|500" logs/access*.log
   
   # Review authentication attempts
   tsx scripts/audit-auth-attempts.ts
   
   # Export audit trail
   ./scripts/export-audit-trail.sh
   ```

### Data Corruption

1. **Assessment:**
   ```bash
   # Check data integrity
   tsx scripts/check-data-integrity.ts
   
   # Identify affected records
   psql $DATABASE_URL -c "SELECT * FROM audit_log WHERE status='corrupt';"
   ```

2. **Recovery:**
   ```bash
   # Restore specific tables
   ./scripts/database/restore-table.sh users
   
   # Rebuild indexes
   npx prisma db push --force-reset
   
   # Validate recovery
   tsx scripts/validate-data-recovery.ts
   ```

---

## Performance Tuning

### Application Optimization

```bash
# Analyze bundle size
npm run analyze

# Profile Node.js performance
node --prof npm start
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --expose-gc --trace-gc npm start
```

### Database Optimization

```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Update statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE your_database;

-- Vacuum database
VACUUM FULL;
```

### Caching Strategy

```javascript
// Cache configuration
const cacheConfig = {
  ttl: 900,        // 15 minutes
  maxSize: 1000,   // Max entries
  strategy: 'LRU'  // Least Recently Used
};

// Monitor cache hit ratio
const hitRatio = cache.hits / (cache.hits + cache.misses);
console.log(`Cache hit ratio: ${(hitRatio * 100).toFixed(2)}%`);
```

---

## Security Operations

### Regular Security Tasks

**Daily:**
- Review authentication logs
- Check failed login attempts
- Monitor rate limiting

**Weekly:**
- Security patch updates
- SSL certificate check
- Permission audit

**Monthly:**
- Full security scan
- Penetration testing
- Secret rotation

### Security Commands

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# SSL certificate check
openssl s_client -connect localhost:443 -servername localhost

# Check file permissions
find . -type f -perm 777 -ls

# Review open ports
netstat -tuln
```

---

## Backup & Recovery

### Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database | Every 4 hours | 7 days | `/backups/db/` |
| Code | Daily | 30 days | `/backups/code/` |
| Config | On change | 90 days | `/backups/config/` |
| Logs | Weekly | 30 days | `/backups/logs/` |

### Backup Commands

```bash
# Manual full backup
./scripts/backup-full.sh

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  src prisma scripts

# Verify backup
./scripts/verify-backup.sh backup_file
```

### Recovery Procedures

```bash
# Full system recovery
./scripts/recovery/full-recovery.sh

# Point-in-time recovery
./scripts/recovery/pitr-recovery.sh "2025-08-11 10:00:00"

# Selective recovery
./scripts/recovery/selective-recovery.sh --tables users,sessions
```

---

## Contact Information

### Escalation Matrix

| Level | Contact | Response Time | When to Contact |
|-------|---------|---------------|-----------------|
| L1 | On-call Engineer | 15 min | Any production issue |
| L2 | Team Lead | 30 min | Major outage, data loss |
| L3 | CTO | 1 hour | Security breach, complete failure |

### Support Channels

- **Slack:** #production-support
- **Email:** support@stockportfolio.com
- **PagerDuty:** stock-portfolio-prod
- **Status Page:** status.stockportfolio.com

### External Vendors

| Service | Provider | Support | Account |
|---------|----------|---------|---------|
| Database | DigitalOcean | 24/7 | #123456 |
| CDN | Cloudflare | 24/7 | enterprise@company |
| Monitoring | Datadog | Business hours | #789012 |

---

## Appendix

### Environment Variables

```bash
# Critical production variables
NODE_ENV=production
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://stockportfolio.com
```

### Useful Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `quick-restart.sh` | Fast restart | `./quick-restart.sh` |
| `check-health.sh` | Health check | `./scripts/check-health.sh` |
| `monitor-live.sh` | Live monitoring | `./scripts/monitor-live.sh` |
| `export-metrics.sh` | Export metrics | `./scripts/export-metrics.sh` |

### System Requirements

- **Node.js:** v18.17+ or v20+
- **npm:** v10+
- **PostgreSQL:** v15+
- **Redis:** v7+ (optional)
- **Memory:** 4GB minimum
- **CPU:** 2 cores minimum
- **Disk:** 20GB available

---

*Last Updated: 2025-08-11*
*Version: 1.0.0*
*Maintained by: DevOps Team*