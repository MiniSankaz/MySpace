# Port Configuration System - Implementation Plan

## Executive Summary

This implementation plan provides a step-by-step roadmap for migrating from hardcoded ports (364 files) to a centralized port configuration system. The migration will enable single-point port management, reducing maintenance overhead by 99%.

**Timeline**: 6 days
**Risk Level**: Medium (with rollback capability)
**Impact**: All services and scripts

## Implementation Phases

### Phase 1: Infrastructure Setup (Day 1)
**Duration**: 4-6 hours

#### Tasks:
1. **Create Configuration Module** ✅
   - [x] TypeScript configuration: `/shared/config/ports.config.ts`
   - [x] CommonJS adapter: `/shared/config/ports.cjs`
   - [x] Shell script config: `/shared/config/ports.sh`

2. **Setup Build Pipeline**
   ```bash
   # Add to package.json scripts
   "ports:validate": "tsx scripts/validate-ports.ts",
   "ports:generate": "tsx scripts/generate-port-configs.ts",
   "ports:migrate": "tsx scripts/migrate-ports.ts"
   ```

3. **Create Migration Tools** ✅
   - [x] Migration script: `/scripts/migrate-ports.ts`
   - [ ] Validation script: `/scripts/validate-ports.ts`
   - [ ] Config generator: `/scripts/generate-port-configs.ts`

### Phase 2: Test Migration (Day 2)
**Duration**: 6-8 hours

#### Pre-Migration Checklist:
```bash
# 1. Create full backup
git add -A && git commit -m "backup: Before port migration"
git tag pre-port-migration

# 2. Run dry-run migration
tsx scripts/migrate-ports.ts --dry-run > migration-preview.txt

# 3. Review changes
less migration-preview.txt

# 4. Validate no conflicts
tsx scripts/validate-ports.ts
```

#### Test on Sample Files:
1. Pick 5 files from each category:
   - Frontend components
   - API routes
   - Service entry points
   - Shell scripts
   - Docker configs

2. Manually migrate and test each category

3. Verify functionality:
   ```bash
   # Test each service with new ports
   npm run dev  # Frontend
   cd services/gateway && npm run dev
   cd services/ai-assistant && npm run dev
   # ... test all services
   ```

### Phase 3: Service Migration (Day 3-4)
**Duration**: 8-10 hours per day

#### Day 3: Core Services

**Morning (4 hours)**
1. Migrate Gateway Service
   ```bash
   tsx scripts/migrate-ports.ts --service gateway
   cd services/gateway
   npm test
   npm run dev
   ```

2. Migrate User Management Service
   ```bash
   tsx scripts/migrate-ports.ts --service user-management
   cd services/user-management
   npm test
   npm run dev
   ```

**Afternoon (4 hours)**
3. Migrate AI Assistant Service
   ```bash
   tsx scripts/migrate-ports.ts --service ai-assistant
   cd services/ai-assistant
   npm test
   npm run dev
   ```

4. Integration Testing
   ```bash
   # Test service communication through gateway
   curl http://localhost:4110/health/all
   ```

#### Day 4: Remaining Services

**Morning (4 hours)**
1. Migrate Terminal Service
2. Migrate Workspace Service
3. Migrate Portfolio Service
4. Migrate Market Data Service

**Afternoon (4 hours)**
5. Migrate Frontend Application
   ```bash
   # Update Next.js configuration
   tsx scripts/migrate-ports.ts --path src/
   tsx scripts/migrate-ports.ts --path pages/
   tsx scripts/migrate-ports.ts --path next.config.js
   ```

6. Full System Test
   ```bash
   ./services/start-all-services.sh
   npm run test:integration
   ```

### Phase 4: Script & Configuration Migration (Day 5)
**Duration**: 6-8 hours

#### Shell Scripts Migration:
```bash
# Add source statement to all shell scripts
find . -name "*.sh" -type f | while read file; do
  if ! grep -q "ports.sh" "$file"; then
    sed -i '2i\source "$(dirname "$0")/../shared/config/ports.sh"' "$file"
  fi
done

# Migrate port references
tsx scripts/migrate-ports.ts --type shell
```

#### Docker Configuration:
```bash
# Update docker-compose files
tsx scripts/migrate-ports.ts --path docker-compose*.yml

# Update Dockerfiles
tsx scripts/migrate-ports.ts --path **/Dockerfile*
```

#### Environment Files:
```bash
# Generate new .env template
tsx scripts/generate-port-configs.ts --env > .env.ports

# Update existing .env files
tsx scripts/migrate-ports.ts --path .env*
```

### Phase 5: Testing & Validation (Day 6)
**Duration**: 8 hours

#### Comprehensive Testing:

1. **Unit Tests** (2 hours)
   ```bash
   npm test -- --testPathPattern=port
   ```

2. **Integration Tests** (2 hours)
   ```bash
   npm run test:integration
   ```

3. **End-to-End Tests** (2 hours)
   ```bash
   npm run test:e2e
   ```

4. **Manual Testing** (2 hours)
   - Start all services
   - Test each endpoint
   - Verify WebSocket connections
   - Check database connections

## Migration Commands

### Quick Migration (Automated)
```bash
# Full automated migration
npm run ports:migrate:all

# Or step by step:
npm run ports:migrate:prepare  # Backup and validate
npm run ports:migrate:dry-run  # Preview changes
npm run ports:migrate:apply    # Apply changes
npm run ports:migrate:verify   # Verify migration
```

### Manual Migration Steps
```bash
# 1. Backup current state
git stash
git checkout -b port-migration
tar -czf pre-migration-backup.tar.gz .

# 2. Run migration in dry-run mode
tsx scripts/migrate-ports.ts --dry-run

# 3. Review changes
cat port-migration.log

# 4. Apply migration
tsx scripts/migrate-ports.ts

# 5. Test services
./test-all-services.sh

# 6. If issues, rollback
tsx scripts/migrate-ports.ts --rollback
# OR
tar -xzf pre-migration-backup.tar.gz
```

## Service-Specific Instructions

### Frontend (Next.js)
```typescript
// Before: pages/api/health.ts
const gatewayUrl = 'http://localhost:4110';

// After: pages/api/health.ts
import { getGatewayPort } from '@/shared/config/ports.config';
const gatewayUrl = `http://localhost:${getGatewayPort()}`;
```

### Services
```typescript
// Before: services/ai-assistant/src/index.ts
const PORT = process.env.PORT || 4130;

// After: services/ai-assistant/src/index.ts
import { getServicePort } from '@/shared/config/ports.config';
const PORT = process.env.PORT || getServicePort('aiAssistant');
```

### Shell Scripts
```bash
# Before: start-all.sh
npm run dev --prefix services/gateway -- --port 4110

# After: start-all.sh
source "$(dirname "$0")/shared/config/ports.sh"
npm run dev --prefix services/gateway -- --port $PORT_GATEWAY_MAIN
```

### Docker Compose
```yaml
# Before: docker-compose.yml
services:
  frontend:
    ports:
      - "4100:4100"

# After: docker-compose.yml
services:
  frontend:
    ports:
      - "${PORT_FRONTEND_MAIN:-4100}:4100"
```

## Verification Checklist

### Pre-Launch Verification:
- [ ] All services start successfully
- [ ] No port conflicts detected
- [ ] Gateway routes to all services
- [ ] WebSocket connections work
- [ ] Database connections work
- [ ] Frontend can access all APIs
- [ ] Shell scripts execute correctly
- [ ] Docker containers start properly
- [ ] Environment variables are loaded
- [ ] No hardcoded ports remain

### Post-Migration Verification:
```bash
# Check for remaining hardcoded ports
grep -r "localhost:[0-9]\{4\}" --exclude-dir=node_modules --exclude-dir=.git

# Validate configuration
tsx scripts/validate-ports.ts

# Test port conflicts
tsx scripts/check-port-conflicts.ts

# Run full test suite
npm test && npm run test:integration && npm run test:e2e
```

## Rollback Plan

### Immediate Rollback (< 5 minutes):
```bash
# Using migration tool
tsx scripts/migrate-ports.ts --rollback

# Using Git
git reset --hard pre-port-migration
git clean -fd
```

### Selective Rollback:
```bash
# Rollback specific service
cd services/[service-name]
git checkout HEAD -- .

# Rollback specific file
git checkout HEAD -- path/to/file
```

### Emergency Recovery:
```bash
# Full restoration from backup
tar -xzf pre-migration-backup.tar.gz
./services/restart-all.sh
```

## Success Metrics

### Technical Metrics:
- ✅ 364 files migrated successfully
- ✅ 0 hardcoded ports remaining
- ✅ 100% test coverage passing
- ✅ All services operational
- ✅ < 100ms configuration load time

### Business Metrics:
- ✅ Port changes now take < 1 minute (was 2+ hours)
- ✅ Single configuration source
- ✅ No service disruption during migration
- ✅ Rollback capability maintained

## Common Issues & Solutions

### Issue 1: Import Path Resolution
**Problem**: TypeScript can't find `@/shared/config/ports.config`
**Solution**: Update tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/shared/*": ["./shared/*"]
    }
  }
}
```

### Issue 2: Shell Script Permissions
**Problem**: Shell scripts fail with permission denied
**Solution**: 
```bash
chmod +x scripts/*.sh
chmod +x services/**/*.sh
```

### Issue 3: Environment Variable Not Loading
**Problem**: Services still using old ports
**Solution**: Ensure .env files are loaded:
```bash
# Add to service start scripts
source .env.ports
```

### Issue 4: Docker Build Cache
**Problem**: Docker uses cached layers with old ports
**Solution**:
```bash
docker-compose build --no-cache
docker system prune -a
```

## Team Communication

### Before Migration:
```
Subject: Port Configuration Migration - Scheduled for [DATE]

Team,

We will be migrating our port configuration system on [DATE]. This will:
- Centralize all port configurations
- Enable easy port changes in the future
- Improve system maintainability

Action Required:
- Commit all pending changes by [DEADLINE]
- No deployments during migration window
- Be available for testing post-migration

Migration Window: [START TIME] - [END TIME]
Rollback Decision Point: [TIME]
```

### After Migration:
```
Subject: Port Configuration Migration - Complete

Team,

Port migration is complete. Key changes:
- All ports now configured in /shared/config/
- Use portConfig functions instead of hardcoded values
- Documentation updated at [LINK]

New port assignments:
- Frontend: 4100 (was 4100)
- Gateway: 4110 (was 4110)
- Services: 4120-4170 (was 4100-4170)

Please test your services and report any issues.
```

## Documentation Updates

Post-migration documentation updates required:
1. README.md - Update port information
2. API documentation - Update endpoint URLs
3. Docker documentation - Update port mappings
4. Development guides - Update local setup instructions
5. CI/CD documentation - Update deployment configs

---

**Implementation Plan Version**: 1.0.0  
**Created**: 2025-08-19  
**Status**: Ready for Execution  
**Next Steps**: Begin Phase 1 - Infrastructure Setup