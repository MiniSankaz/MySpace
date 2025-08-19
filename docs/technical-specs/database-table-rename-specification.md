# Database Table Rename Technical Specification

## Executive Summary

This document provides a comprehensive technical specification for renaming database tables from PascalCase to snake_case naming convention to ensure compatibility with the AI Assistant microservice. The migration addresses a critical integration issue where the AI Assistant service expects snake_case table names while the existing database uses PascalCase naming.

**Critical Impact**: AI Assistant service (port 4130) cannot function without this migration.

## System Architecture Overview

### Current State

- **Database**: PostgreSQL on DigitalOcean
- **Connection**: `postgresql://doadmin:***@db-postgresql-sgp1-43887-do-user-24411302-0.m.db.ondigitalocean.com:25060/personalAI`
- **Naming Convention**: PascalCase (e.g., `User`, `AssistantChatSession`)
- **ORM**: Prisma with multiple schema files
- **Affected Service**: AI Assistant microservice (port 4130)

### Target State

- **Naming Convention**: snake_case (e.g., `users`, `chat_sessions`)
- **Compatibility**: Full compatibility with AI Assistant Prisma schema
- **Data Integrity**: 100% data preservation
- **Downtime**: Minimal (< 5 minutes for migration execution)

## Detailed Component Specifications

### 1. Tables to be Renamed

| Current Name (PascalCase) | Target Name (snake_case) | Purpose                          | Dependencies             |
| ------------------------- | ------------------------ | -------------------------------- | ------------------------ |
| `User`                    | `users`                  | User accounts and authentication | Referenced by 50+ tables |
| `AssistantFolder`         | `chat_folders`           | Chat organization folders        | User relation            |
| `AssistantChatSession`    | `chat_sessions`          | Chat session management          | User, Folder relations   |
| `AssistantChatMessage`    | `chat_messages`          | Chat message storage             | Session relation         |
| `AssistantConversation`   | `chat_sessions_temp`     | Legacy chat sessions             | To be merged             |
| `AssistantMessage`        | `chat_messages_temp`     | Legacy messages                  | To be merged             |

### 2. Migration Components

#### 2.1 Analysis Script (`analyze-table-rename.ts`)

```typescript
interface AnalysisCapabilities {
  tableDiscovery: {
    identifyPascalCaseTables(): Table[];
    identifySnakeCaseTables(): Table[];
    detectConflicts(): Conflict[];
  };
  dependencyAnalysis: {
    foreignKeyMapping(): ForeignKey[];
    indexMapping(): Index[];
    constraintMapping(): Constraint[];
  };
  dataVolumeAnalysis: {
    rowCounts(): Map<string, number>;
    estimateDowntime(): Duration;
  };
}
```

#### 2.2 Migration Script (`rename-tables-to-snake-case.sql`)

```sql
-- Core Migration Steps
1. Transaction initialization
2. Safety checks and validation
3. Foreign key constraint disabling
4. Table renaming operations
5. Index renaming
6. Constraint updates
7. Column additions for compatibility
8. Foreign key re-enabling
9. Verification and audit logging
```

#### 2.3 Rollback Script (`rollback-table-rename.sql`)

```sql
-- Rollback Capabilities
1. Restore original table names
2. Restore original constraints
3. Restore original indexes
4. Remove added columns (optional)
5. Audit trail maintenance
```

#### 2.4 Execution Controller (`execute-table-rename.ts`)

```typescript
class TableRenameMigration {
  // Core Methods
  createBackup(): Promise<string>;
  checkDatabaseState(): Promise<DatabaseState>;
  executeMigrationSQL(): Promise<void>;
  verifyMigration(): Promise<boolean>;
  testAIAssistantConnection(): Promise<boolean>;

  // Safety Features
  dryRun: boolean;
  automaticBackup: boolean;
  transactionRollback: boolean;
  conflictResolution: ConflictStrategy;
}
```

## Data Models and Schemas

### 3.1 AI Assistant Expected Schema (Target)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String?   @unique
  firstName     String?
  lastName      String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  chatSessions  ChatSession[]
  chatFolders   ChatFolder[]
  @@map("users")
}

model ChatFolder {
  id           String    @id @default(cuid())
  userId       String
  name         String
  description  String?
  color        String?
  isDefault    Boolean   @default(false)
  sessionCount Int       @default(0)
  user         User      @relation(fields: [userId], references: [id])
  sessions     ChatSession[]
  @@map("chat_folders")
}

model ChatSession {
  id            String      @id @default(cuid())
  userId        String
  folderId      String?
  title         String
  isActive      Boolean     @default(true)
  lastMessageAt DateTime?
  user          User        @relation(fields: [userId], references: [id])
  folder        ChatFolder? @relation(fields: [folderId], references: [id])
  messages      ChatMessage[]
  @@map("chat_sessions")
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String
  content   String
  metadata  Json?
  session   ChatSession @relation(fields: [sessionId], references: [id])
  @@map("chat_messages")
}
```

### 3.2 Data Migration Mappings

```typescript
interface DataMigrationMap {
  // User table mappings (most fields compatible)
  User: {
    preservedFields: ["id", "email", "username", "firstName", "lastName"];
    addedFields: ["role: UserRole"];
    transformations: [];
  };

  // AssistantFolder -> chat_folders
  AssistantFolder: {
    preservedFields: ["id", "userId", "name"];
    addedFields: ["description", "color", "isDefault", "sessionCount"];
    transformations: [];
  };

  // AssistantChatSession -> chat_sessions
  AssistantChatSession: {
    preservedFields: ["id", "userId"];
    addedFields: ["title", "folderId", "isActive"];
    transformations: ["sessionName -> title", "lastActiveAt -> lastMessageAt"];
  };

  // AssistantChatMessage -> chat_messages
  AssistantChatMessage: {
    preservedFields: ["id", "sessionId", "role", "content", "metadata"];
    transformations: [];
  };
}
```

## API Specifications

### 4.1 Database Connection Configuration

```typescript
interface DatabaseConfig {
  provider: "postgresql";
  url: string;
  schema: "public";
  ssl: {
    rejectUnauthorized: false;
    mode: "require";
  };
  connectionPool: {
    min: 2;
    max: 10;
    idleTimeoutMillis: 30000;
  };
}
```

### 4.2 Migration Execution API

```typescript
interface MigrationAPI {
  // Pre-migration validation
  validateDatabase(): Promise<ValidationResult>;
  checkDependencies(): Promise<DependencyCheck>;
  estimateImpact(): Promise<ImpactAnalysis>;

  // Migration execution
  executeMigration(options: MigrationOptions): Promise<MigrationResult>;
  monitorProgress(): AsyncIterator<ProgressUpdate>;

  // Post-migration verification
  verifyIntegrity(): Promise<IntegrityCheck>;
  testConnections(): Promise<ConnectionTest[]>;
  generateReport(): Promise<MigrationReport>;

  // Rollback capabilities
  canRollback(): Promise<boolean>;
  executeRollback(): Promise<RollbackResult>;
}
```

## Integration Requirements

### 5.1 Service Dependencies

```yaml
affected_services:
  ai-assistant:
    port: 4130
    impact: CRITICAL
    requires_restart: true
    prisma_regeneration: true

  user-management:
    port: 4100
    impact: HIGH
    requires_update: true
    affected_queries: ["raw SQL queries"]

  gateway:
    port: 4110
    impact: LOW
    requires_restart: false

  frontend:
    port: 4100
    impact: NONE
    notes: "Uses API endpoints, not direct DB access"
```

### 5.2 Migration Sequence

```mermaid
sequenceDiagram
    participant Admin
    participant Migration Script
    participant PostgreSQL
    participant Backup System
    participant AI Assistant

    Admin->>Migration Script: Initiate migration
    Migration Script->>PostgreSQL: Check current state
    PostgreSQL-->>Migration Script: Return table info
    Migration Script->>Backup System: Create backup
    Backup System-->>Migration Script: Backup complete
    Migration Script->>PostgreSQL: BEGIN TRANSACTION
    Migration Script->>PostgreSQL: Disable FK constraints
    Migration Script->>PostgreSQL: Rename tables
    Migration Script->>PostgreSQL: Update indexes
    Migration Script->>PostgreSQL: Re-enable FK constraints
    Migration Script->>PostgreSQL: COMMIT
    Migration Script->>PostgreSQL: Verify changes
    PostgreSQL-->>Migration Script: Verification result
    Migration Script->>AI Assistant: Test connection
    AI Assistant-->>Migration Script: Connection successful
    Migration Script-->>Admin: Migration complete
```

## Security Specifications

### 6.1 Access Control

```typescript
interface SecurityMeasures {
  authentication: {
    method: "PostgreSQL native";
    credentials: "environment variables";
    sslMode: "require";
  };

  authorization: {
    migrationRole: "database owner";
    minimumPrivileges: ["ALTER", "CREATE", "DROP"];
  };

  auditLogging: {
    enabled: true;
    tableName: "AuditLog";
    capturedEvents: ["migration_start", "migration_complete", "rollback"];
  };

  dataProtection: {
    backupEncryption: false; // Handled by DigitalOcean
    transmissionEncryption: true; // SSL/TLS
    atRestEncryption: true; // Managed by provider
  };
}
```

### 6.2 Risk Mitigation

```typescript
interface RiskMitigation {
  preChecks: [
    "Verify database connection",
    "Check available disk space",
    "Validate user permissions",
    "Detect naming conflicts",
    "Analyze foreign key dependencies",
  ];

  safeguards: [
    "Automatic backup creation",
    "Transaction-based execution",
    "Rollback capability",
    "Dry-run mode",
    "Progressive verification",
  ];

  fallbackStrategies: [
    "Automated rollback on failure",
    "Manual rollback script",
    "Backup restoration",
    "Point-in-time recovery",
  ];
}
```

## Performance Requirements

### 7.1 Migration Performance Targets

```typescript
interface PerformanceTargets {
  migrationDuration: {
    small_tables: "< 1 second"; // < 10K rows
    medium_tables: "< 10 seconds"; // < 100K rows
    large_tables: "< 60 seconds"; // < 1M rows
  };

  downtime: {
    maximum: "5 minutes";
    typical: "2-3 minutes";
    criticalPath: "Table rename operations";
  };

  resourceUsage: {
    cpu: "< 50%";
    memory: "< 1GB";
    diskIO: "Moderate";
    networkBandwidth: "Minimal";
  };
}
```

### 7.2 Optimization Strategies

```sql
-- Optimization techniques used
1. Disable constraint checking during rename
2. Batch index updates
3. Use session-level settings
4. Minimize lock duration
5. Parallel processing where possible
```

## Implementation Guidelines

### 8.1 Pre-Migration Checklist

```markdown
- [ ] Review current database schema
- [ ] Identify all dependent services
- [ ] Create comprehensive backup
- [ ] Notify stakeholders
- [ ] Schedule maintenance window
- [ ] Prepare rollback plan
- [ ] Test in staging environment
- [ ] Document current state
```

### 8.2 Step-by-Step Execution

```bash
# 1. Analyze current state
ts-node scripts/database/analyze-table-rename.ts

# 2. Dry run to verify plan
ts-node scripts/database/execute-table-rename.ts --dry-run

# 3. Create manual backup (optional, script does this)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# 4. Execute migration
ts-node scripts/database/execute-table-rename.ts

# 5. Verify migration
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('users', 'chat_folders', 'chat_sessions', 'chat_messages');"

# 6. Update Prisma schemas
cd services/ai-assistant
npx prisma generate

# 7. Restart AI Assistant service
pm2 restart ai-assistant

# 8. Test functionality
curl http://localhost:4130/health
```

### 8.3 Post-Migration Tasks

```typescript
interface PostMigrationTasks {
  immediate: [
    "Verify table names",
    "Check data integrity",
    "Test AI Assistant connection",
    "Monitor error logs",
    "Update documentation",
  ];

  shortTerm: [
    // Within 24 hours
    "Update all Prisma schemas",
    "Regenerate Prisma clients",
    "Update raw SQL queries",
    "Test all endpoints",
    "Performance monitoring",
  ];

  longTerm: [
    // Within 1 week
    "Update development environments",
    "Update staging databases",
    "Train team on new schema",
    "Update backup procedures",
    "Archive migration logs",
  ];
}
```

## Testing Requirements

### 9.1 Test Scenarios

```typescript
interface TestPlan {
  unitTests: {
    tableName: "Verify all tables renamed correctly";
    indexes: "Verify all indexes updated";
    constraints: "Verify all constraints intact";
    data: "Verify no data loss";
  };

  integrationTests: {
    aiAssistant: "Test chat creation and retrieval";
    userAuth: "Test user authentication";
    sessionManagement: "Test session operations";
    messageStorage: "Test message CRUD operations";
  };

  performanceTests: {
    querySpeed: "Compare query performance";
    connectionPool: "Test connection stability";
    concurrency: "Test concurrent operations";
  };

  rollbackTests: {
    fullRollback: "Test complete rollback";
    partialFailure: "Test partial migration failure";
    dataConsistency: "Verify data after rollback";
  };
}
```

### 9.2 Acceptance Criteria

```yaml
acceptance_criteria:
  functional:
    - All tables renamed successfully
    - No data loss or corruption
    - All foreign keys maintained
    - All indexes functional
    - AI Assistant service operational

  performance:
    - Migration completes in < 5 minutes
    - No query performance degradation
    - Service downtime < 5 minutes

  operational:
    - Rollback tested and functional
    - Backup verified and restorable
    - Documentation updated
    - Team notified and trained
```

## Deployment Considerations

### 10.1 Environment-Specific Configuration

```typescript
interface EnvironmentConfig {
  development: {
    autoBackup: false;
    dryRunDefault: true;
    verboseLogging: true;
  };

  staging: {
    autoBackup: true;
    dryRunDefault: false;
    verboseLogging: true;
    notifySlack: true;
  };

  production: {
    autoBackup: true;
    dryRunDefault: false;
    verboseLogging: false;
    notifySlack: true;
    requireApproval: true;
    maintenanceMode: true;
  };
}
```

### 10.2 Rollout Strategy

```mermaid
graph LR
    A[Development] -->|Test & Verify| B[Staging]
    B -->|Validate| C[Production Backup]
    C -->|Execute| D[Production Migration]
    D -->|Monitor| E[Verification]
    E -->|Success| F[Complete]
    E -->|Failure| G[Rollback]
    G --> C
```

## Appendices

### A. Glossary

| Term        | Definition                                                                |
| ----------- | ------------------------------------------------------------------------- |
| PascalCase  | Naming convention where each word starts with capital (e.g., UserProfile) |
| snake_case  | Naming convention using underscores between words (e.g., user_profile)    |
| Foreign Key | Database constraint linking tables                                        |
| Prisma      | Modern ORM for Node.js and TypeScript                                     |
| Migration   | Process of changing database schema                                       |
| Rollback    | Process of reverting changes                                              |

### B. References

1. PostgreSQL ALTER TABLE documentation
2. Prisma Schema documentation
3. DigitalOcean PostgreSQL management guide
4. Database migration best practices

### C. Migration Logs Location

```
/scripts/database/migration-log-[timestamp].txt
/scripts/database/backup-[timestamp].sql
```

### D. Support Contacts

- Database Team: DBA responsibilities
- DevOps Team: Service restart and monitoring
- Development Team: Application updates
- On-Call: Emergency rollback procedures

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-08-16  
**Author**: Technical Architect Agent  
**Status**: Ready for Implementation
