# Database Migration Mismatch Resolution Plan

**Date**: 2025-08-17  
**Priority**: P0 CRITICAL  
**Environment**: Production Database on DigitalOcean  
**Risk Level**: HIGH

## 🔍 Current Situation Analysis

### Migration Status

| Location | Migration                   | Status          | Risk   | Impact                               |
| -------- | --------------------------- | --------------- | ------ | ------------------------------------ |
| Local    | 20250113_project_sidebar    | Not Applied     | MEDIUM | Project sidebar features unavailable |
| Remote   | 20250817_add_usage_tracking | Missing Locally | HIGH   | AI Assistant rate limiting broken    |

### System Dependencies

- **Database**: PostgreSQL on DigitalOcean (Port 25060)
- **ORM**: Prisma 5.x
- **Services Affected**:
  - AI Assistant Service (4130) - Critical
  - Frontend Dashboard (4100) - Minor
  - User Management (4100) - None

## 🎯 Resolution Strategy

### Phase 1: Backup & Preparation (30 mins)

**Risk Level**: LOW  
**Rollback Time**: N/A

#### Pre-Flight Checklist

- [ ] Database backup completed
- [ ] Current schema exported
- [ ] Migration files backed up
- [ ] Team notification sent
- [ ] Maintenance window scheduled

#### Backup Commands

```bash
# 1. Export current database schema
pg_dump --schema-only \
  -h db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d personalAI \
  > backup/schema_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Export critical data
pg_dump --data-only \
  --table=User \
  --table=UserSession \
  --table=ApiToken \
  -h db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d personalAI \
  > backup/critical_data_$(date +%Y%m%d_%H%M%S).sql

# 3. Backup local migration files
cp -r prisma/migrations backup/migrations_$(date +%Y%m%d_%H%M%S)

# 4. Create restore point in database
psql -h db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d personalAI \
  -c "SELECT pg_create_restore_point('before_migration_sync_$(date +%Y%m%d_%H%M%S)');"
```

### Phase 2: Fetch Remote Migration (15 mins)

**Risk Level**: LOW  
**Rollback**: Delete fetched files

#### Steps

```bash
# 1. Create missing migration locally
mkdir -p prisma/migrations/20250817_add_usage_tracking

# 2. Create migration.sql from remote schema
cat > prisma/migrations/20250817_add_usage_tracking/migration.sql << 'EOF'
-- CreateTable for usage tracking (AI Assistant Fair Use)
CREATE TABLE IF NOT EXISTS "usage_tracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable for user context
CREATE TABLE IF NOT EXISTS "user_context" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable for rate limits
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyCount" INTEGER NOT NULL DEFAULT 0,
    "hourlyCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "usage_tracking_userId_idx" ON "usage_tracking"("userId");
CREATE INDEX IF NOT EXISTS "usage_tracking_timestamp_idx" ON "usage_tracking"("timestamp");
CREATE INDEX IF NOT EXISTS "user_context_userId_idx" ON "user_context"("userId");
CREATE INDEX IF NOT EXISTS "rate_limits_userId_idx" ON "rate_limits"("userId");

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_context" ADD CONSTRAINT "user_context_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EOF

# 3. Verify migration file
ls -la prisma/migrations/20250817_add_usage_tracking/
```

### Phase 3: Sync Prisma Schema (20 mins)

**Risk Level**: MEDIUM  
**Rollback**: Restore from backup

#### Update Prisma Schema

```prisma
// Add to prisma/schema.prisma

model UsageTracking {
  id           String   @id @default(cuid())
  userId       String
  endpoint     String
  tokens       Int      @default(0)
  timestamp    DateTime @default(now())
  responseTime Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([timestamp])
  @@map("usage_tracking")
}

model UserContext {
  id          String   @id @default(cuid())
  userId      String   @unique
  messages    Json
  tokenCount  Int      @default(0)
  lastUpdated DateTime @default(now()) @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_context")
}

model RateLimits {
  id           String   @id @default(cuid())
  userId       String   @unique
  requestCount Int      @default(0)
  windowStart  DateTime @default(now())
  dailyCount   Int      @default(0)
  hourlyCount  Int      @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("rate_limits")
}
```

### Phase 4: Execute Migration Sync (30 mins)

**Risk Level**: HIGH  
**Rollback**: Restore database from backup

#### Execution Steps

```bash
# 1. Pull current database state
npx prisma db pull

# 2. Validate schema matches
npx prisma validate

# 3. Generate Prisma Client
npx prisma generate

# 4. Mark migrations as applied (without running them)
npx prisma migrate resolve --applied "20250817_add_usage_tracking"

# 5. Apply pending local migration
npx prisma migrate deploy

# 6. Verify migration status
npx prisma migrate status

# 7. Test database connection
npx prisma db execute --sql "SELECT COUNT(*) FROM usage_tracking;"
```

### Phase 5: Verification & Testing (20 mins)

**Risk Level**: LOW  
**Rollback**: N/A

#### Verification Checklist

- [ ] All migrations show as applied
- [ ] No pending migrations
- [ ] Schema matches between local and remote
- [ ] AI Assistant service connects successfully
- [ ] Rate limiting tables accessible
- [ ] Project sidebar migration applied

#### Test Commands

```bash
# 1. Test AI Assistant connection
curl -X GET http://localhost:4130/health

# 2. Test database queries
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const tables = await prisma.\$queryRaw\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  \`;
  console.log('Tables:', tables);
  await prisma.\$disconnect();
}
test();
"

# 3. Run integration tests
npm run test:integration

# 4. Check service logs
pm2 logs ai-assistant --lines 100
```

## 🚨 Rollback Plan

### Immediate Rollback (< 5 mins)

```bash
# 1. Stop all services
pm2 stop all

# 2. Restore database schema
psql -h db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d personalAI \
  < backup/schema_backup_[TIMESTAMP].sql

# 3. Restore migration files
rm -rf prisma/migrations
cp -r backup/migrations_[TIMESTAMP] prisma/migrations

# 4. Reset Prisma
npx prisma generate

# 5. Restart services
pm2 restart all
```

### Recovery from Critical Failure

```bash
# 1. Restore full database backup (DigitalOcean)
doctl databases backups restore [BACKUP_ID] --restore-to-time [TIMESTAMP]

# 2. Reset local environment
git checkout prisma/
npx prisma generate

# 3. Notify team
# Send alert to team about rollback
```

## 🛡️ Prevention Strategy for Future

### 1. Migration Workflow Standards

```yaml
development:
  - Always pull remote schema before creating migrations
  - Use feature branches for schema changes
  - Test migrations on staging first

staging:
  - Apply migrations in staging for 24 hours minimum
  - Run full integration test suite
  - Monitor for errors

production:
  - Schedule maintenance window
  - Backup before migration
  - Apply during low-traffic periods
```

### 2. CI/CD Pipeline Improvements

```yaml
pre-deploy:
  - Check migration status
  - Compare local vs remote schemas
  - Block deployment if mismatch detected

post-deploy:
  - Verify migration applied
  - Run health checks
  - Monitor error rates
```

### 3. Team Communication

- Use migration naming convention: `YYYYMMDD_HHMMSS_description`
- Document all schema changes in CHANGELOG
- Notify team before production migrations
- Create migration tickets in project management

### 4. Monitoring & Alerts

```javascript
// Add to monitoring service
const checkMigrationSync = async () => {
  const localMigrations = await getLocalMigrations();
  const remoteMigrations = await getRemoteMigrations();

  const mismatch = findMismatch(localMigrations, remoteMigrations);
  if (mismatch.length > 0) {
    await sendAlert({
      severity: "HIGH",
      message: "Migration mismatch detected",
      details: mismatch,
    });
  }
};

// Run every hour
setInterval(checkMigrationSync, 3600000);
```

## 📋 Complete Resolution Checklist

### Pre-Execution

- [ ] Team notified of maintenance
- [ ] Backup scripts prepared
- [ ] Rollback plan reviewed
- [ ] Test environment ready
- [ ] Monitoring dashboard open

### During Execution

- [ ] Phase 1: Backup completed
- [ ] Phase 2: Remote migration fetched
- [ ] Phase 3: Schema updated
- [ ] Phase 4: Migration synced
- [ ] Phase 5: Verification passed

### Post-Execution

- [ ] All services running
- [ ] No errors in logs
- [ ] AI Assistant rate limiting working
- [ ] Project sidebar functional
- [ ] Documentation updated
- [ ] Team notified of completion

### Follow-Up (Next 24 hours)

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Document lessons learned
- [ ] Update SOPs if needed

## 🎯 Success Criteria

### Technical

- ✅ All migrations applied successfully
- ✅ No data loss or corruption
- ✅ Services operating normally
- ✅ < 30 minutes downtime

### Business

- ✅ AI Assistant rate limiting functional
- ✅ No user complaints
- ✅ System performance maintained
- ✅ Compliance requirements met

## 📞 Emergency Contacts

- **Database Admin**: DBA Team
- **DevOps Lead**: DevOps Team
- **Product Owner**: Product Team
- **On-Call Engineer**: Rotation Schedule

## 📝 Notes

- Always test on staging first
- Keep backup retention for 7 days minimum
- Document any deviations from plan
- Update this document with lessons learned

---

_Document Version: 1.0_  
_Last Updated: 2025-08-17_  
_Next Review: After migration completion_
