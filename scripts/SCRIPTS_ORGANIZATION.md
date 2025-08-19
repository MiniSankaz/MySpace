# Scripts Organization Plan

## Current State: 70 scripts in /scripts directory

## Categories & Proposed Locations:

### 1. Database Scripts (18 files) → Keep in /scripts/database

- cleanup-and-setup-sankaz.ts ✅
- seed-\*.ts (multiple) ✅
- clear-\*.ts ✅
- backup.sh, restore.sh, reset-db.sh ✅
- table-rename scripts ✅
- execute-table-rename.ts ✅
- simple-rename-tables.ts ✅

### 2. Service-Specific Scripts

#### Terminal Service (8 files) → Move to /services/terminal/scripts

- check-terminal-logs.ts
- cleanup-terminal-sessions.ts
- deploy-terminal-storage.sh
- fix-terminal-storage-issues.ts
- load-test-terminal.ts
- test-multi-terminal.sh
- test-realtime-terminals.js
- test-storage-fix.sh

#### AI Assistant (3 files) → Move to /services/ai-assistant/scripts

- cleanup-sessions.ts
- test-claude-cli.sh
- start-with-claude.sh

#### User Management (5 files) → Move to /services/user-management/scripts

- check-users.ts
- create-admin.ts
- create-db-user.ts
- create-local-user.ts
- update-sankaz-password.ts

#### Gateway (2 files) → Move to /services/gateway/scripts

- test-gateway.sh
- monitor-gateway.js

### 3. DevOps Scripts (15 files) → Keep in /scripts/devops

- automated-deployment.sh
- check-staging-ports.sh
- deployment-metrics.json
- monitor-deployment.js
- pre-deployment-check.sh
- smoke-test-deployment.js
- staging-setup.sh
- v3-migration.sh
- monitor-memory.js
- cleanup-memory.sh
- cleanup-ports.sh

### 4. Development Tools (10 files) → Keep in /scripts/dev

- dev-watch.sh
- fix-hardcoded-values.js
- fix-typescript-errors.sh
- create-api-services.sh
- optimize-for-claude.sh
- enforce-claudemd-standards.sh
- analyze-redundant-code.ts
- cleanup-redundant-code.sh

### 5. Service Management (8 files) → Move to /services/scripts

- start-all-services.sh
- stop-all-services.sh
- start-all-v3.sh
- stop-all-v3.sh
- start-v3.sh
- stop-v3.sh
- test-all-services.sh
- test-gateway-routing.sh

### 6. Documentation (3 files) → Remove (old/unused)

- create-remaining-docs.js
- generate-docs.js
- validate-docs.js

### 7. Other/Temporary (remaining) → Review & Remove

- Various test-\*.js files
- One-time migration scripts
- Temporary fix scripts

## Action Plan:

1. Create directory structure
2. Move scripts to appropriate locations
3. Update package.json scripts
4. Remove unused/old scripts
5. Create index in each script directory
