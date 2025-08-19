# Centralized Port Configuration System - Technical Specification

## Executive Summary

This specification defines a centralized port configuration system that enables port changes across the entire codebase from a single configuration source. The system will eliminate the current maintenance burden of 364 files with hardcoded ports and provide a scalable solution for future port management.

**Current State**: Ports hardcoded in 364 files across TypeScript, JavaScript, Shell scripts, and configuration files
**Target State**: Single source of truth for all port configurations with automatic propagation
**Impact**: 100% reduction in port change complexity, from 364 file edits to 1 configuration change

## System Architecture Overview

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENVIRONMENT VARIABLES                       │
│                        (Highest Priority)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED CONFIGURATION MODULE                   │
│                     /shared/config/ports.config                  │
│                         (TypeScript/JSON)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Frontend   │ │   Services   │ │   Scripts    │
        │   (Next.js)  │ │  (Node.js)   │ │   (Shell)    │
        └──────────────┘ └──────────────┘ └──────────────┘
```

### Port Mapping Structure

```typescript
interface PortConfiguration {
  frontend: {
    main: number;           // 4100 (was 4100)
    devServer?: number;     // Optional dev server port
  };
  gateway: {
    main: number;           // 4110 (was 4110)
    admin?: number;         // Optional admin interface
  };
  services: {
    userManagement: number; // 4120 (was 4100)
    aiAssistant: number;    // 4130 (was 4130)
    terminal: number;       // 4140 (was 4140)
    workspace: number;      // 4150 (was 4150)
    portfolio: number;      // 4160 (was 4160)
    marketData: number;     // 4170 (was 4170)
  };
  websocket: {
    system: number;         // 8001
    claude: number;         // 8002
    terminal: number;       // 8003
    portfolio: number;      // 8004
  };
  database: {
    postgres: number;       // 25060
    prismaStudio: number;   // 5555
    redis?: number;         // 6379
  };
  monitoring?: {
    prometheus?: number;    // 9090
    grafana?: number;       // 3001
  };
}
```

## Detailed Component Specifications

### 1. Core Configuration Module

**Location**: `/shared/config/ports.config.ts`

```typescript
// ports.config.ts
export class PortConfig {
  private static instance: PortConfig;
  private config: PortConfiguration;
  private envPrefix = 'PORT_';

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): PortConfig {
    if (!PortConfig.instance) {
      PortConfig.instance = new PortConfig();
    }
    return PortConfig.instance;
  }

  private loadConfiguration(): PortConfiguration {
    // Load base configuration
    const baseConfig = this.getBaseConfiguration();
    
    // Apply environment overrides
    return this.applyEnvironmentOverrides(baseConfig);
  }

  private getBaseConfiguration(): PortConfiguration {
    return {
      frontend: {
        main: this.getPort('FRONTEND_MAIN', 4100),
        devServer: this.getPort('FRONTEND_DEV', undefined)
      },
      gateway: {
        main: this.getPort('GATEWAY_MAIN', 4110),
        admin: this.getPort('GATEWAY_ADMIN', undefined)
      },
      services: {
        userManagement: this.getPort('SERVICE_USER', 4120),
        aiAssistant: this.getPort('SERVICE_AI', 4130),
        terminal: this.getPort('SERVICE_TERMINAL', 4140),
        workspace: this.getPort('SERVICE_WORKSPACE', 4150),
        portfolio: this.getPort('SERVICE_PORTFOLIO', 4160),
        marketData: this.getPort('SERVICE_MARKET', 4170)
      },
      websocket: {
        system: this.getPort('WS_SYSTEM', 8001),
        claude: this.getPort('WS_CLAUDE', 8002),
        terminal: this.getPort('WS_TERMINAL', 8003),
        portfolio: this.getPort('WS_PORTFOLIO', 8004)
      },
      database: {
        postgres: this.getPort('DB_POSTGRES', 25060),
        prismaStudio: this.getPort('DB_PRISMA_STUDIO', 5555),
        redis: this.getPort('DB_REDIS', 6379)
      },
      monitoring: {
        prometheus: this.getPort('MONITORING_PROMETHEUS', 9090),
        grafana: this.getPort('MONITORING_GRAFANA', 3001)
      }
    };
  }

  private getPort(envKey: string, defaultValue?: number): number | undefined {
    const envValue = process.env[`${this.envPrefix}${envKey}`];
    return envValue ? parseInt(envValue, 10) : defaultValue;
  }

  public getConfig(): PortConfiguration {
    return this.config;
  }

  public getFrontendPort(): number {
    return this.config.frontend.main;
  }

  public getGatewayPort(): number {
    return this.config.gateway.main;
  }

  public getServicePort(service: keyof PortConfiguration['services']): number {
    return this.config.services[service];
  }

  public getWebSocketPort(type: keyof PortConfiguration['websocket']): number {
    return this.config.websocket[type];
  }

  public getDatabasePort(db: keyof PortConfiguration['database']): number | undefined {
    return this.config.database[db];
  }

  public getServiceUrl(service: keyof PortConfiguration['services'], host = 'localhost'): string {
    return `http://${host}:${this.config.services[service]}`;
  }

  public getWebSocketUrl(type: keyof PortConfiguration['websocket'], host = 'localhost'): string {
    return `ws://${host}:${this.config.websocket[type]}`;
  }

  // Generate environment variable documentation
  public generateEnvTemplate(): string {
    return `
# Port Configuration
# Frontend
PORT_FRONTEND_MAIN=${this.config.frontend.main}
PORT_FRONTEND_DEV=${this.config.frontend.devServer || ''}

# Gateway
PORT_GATEWAY_MAIN=${this.config.gateway.main}
PORT_GATEWAY_ADMIN=${this.config.gateway.admin || ''}

# Services
PORT_SERVICE_USER=${this.config.services.userManagement}
PORT_SERVICE_AI=${this.config.services.aiAssistant}
PORT_SERVICE_TERMINAL=${this.config.services.terminal}
PORT_SERVICE_WORKSPACE=${this.config.services.workspace}
PORT_SERVICE_PORTFOLIO=${this.config.services.portfolio}
PORT_SERVICE_MARKET=${this.config.services.marketData}

# WebSocket
PORT_WS_SYSTEM=${this.config.websocket.system}
PORT_WS_CLAUDE=${this.config.websocket.claude}
PORT_WS_TERMINAL=${this.config.websocket.terminal}
PORT_WS_PORTFOLIO=${this.config.websocket.portfolio}

# Database
PORT_DB_POSTGRES=${this.config.database.postgres}
PORT_DB_PRISMA_STUDIO=${this.config.database.prismaStudio}
PORT_DB_REDIS=${this.config.database.redis || ''}

# Monitoring
PORT_MONITORING_PROMETHEUS=${this.config.monitoring?.prometheus || ''}
PORT_MONITORING_GRAFANA=${this.config.monitoring?.grafana || ''}
    `.trim();
  }
}

// Export singleton instance
export const portConfig = PortConfig.getInstance();

// Export convenience functions
export const getPorts = () => portConfig.getConfig();
export const getFrontendPort = () => portConfig.getFrontendPort();
export const getGatewayPort = () => portConfig.getGatewayPort();
export const getServicePort = (service: keyof PortConfiguration['services']) => 
  portConfig.getServicePort(service);
export const getServiceUrl = (service: keyof PortConfiguration['services'], host?: string) => 
  portConfig.getServiceUrl(service, host);
```

### 2. JSON Configuration File

**Location**: `/shared/config/ports.json`

```json
{
  "version": "3.0.0",
  "description": "Centralized port configuration for all services",
  "lastUpdated": "2025-08-19",
  "ports": {
    "frontend": {
      "main": 4100,
      "devServer": null
    },
    "gateway": {
      "main": 4110,
      "admin": null
    },
    "services": {
      "userManagement": 4120,
      "aiAssistant": 4130,
      "terminal": 4140,
      "workspace": 4150,
      "portfolio": 4160,
      "marketData": 4170
    },
    "websocket": {
      "system": 8001,
      "claude": 8002,
      "terminal": 8003,
      "portfolio": 8004
    },
    "database": {
      "postgres": 25060,
      "prismaStudio": 5555,
      "redis": 6379
    },
    "monitoring": {
      "prometheus": 9090,
      "grafana": 3001
    }
  },
  "environments": {
    "development": {
      "host": "localhost",
      "protocol": "http"
    },
    "staging": {
      "host": "staging.example.com",
      "protocol": "https"
    },
    "production": {
      "host": "api.example.com",
      "protocol": "https"
    }
  }
}
```

### 3. Shell Script Adapter

**Location**: `/shared/config/ports.sh`

```bash
#!/bin/bash
# Port configuration for shell scripts
# Auto-generated from ports.json - DO NOT EDIT MANUALLY

# Source this file in your scripts: source /shared/config/ports.sh

# Frontend
export PORT_FRONTEND_MAIN=4100
export PORT_FRONTEND_DEV=""

# Gateway
export PORT_GATEWAY_MAIN=4110
export PORT_GATEWAY_ADMIN=""

# Services
export PORT_SERVICE_USER=4120
export PORT_SERVICE_AI=4130
export PORT_SERVICE_TERMINAL=4140
export PORT_SERVICE_WORKSPACE=4150
export PORT_SERVICE_PORTFOLIO=4160
export PORT_SERVICE_MARKET=4170

# WebSocket
export PORT_WS_SYSTEM=8001
export PORT_WS_CLAUDE=8002
export PORT_WS_TERMINAL=8003
export PORT_WS_PORTFOLIO=8004

# Database
export PORT_DB_POSTGRES=25060
export PORT_DB_PRISMA_STUDIO=5555
export PORT_DB_REDIS=6379

# Monitoring
export PORT_MONITORING_PROMETHEUS=9090
export PORT_MONITORING_GRAFANA=3001

# Helper functions
get_service_url() {
    local service=$1
    local host=${2:-localhost}
    local port_var="PORT_SERVICE_${service^^}"
    echo "http://${host}:${!port_var}"
}

get_websocket_url() {
    local type=$1
    local host=${2:-localhost}
    local port_var="PORT_WS_${type^^}"
    echo "ws://${host}:${!port_var}"
}

# Validation function
validate_ports() {
    local errors=0
    for var in ${!PORT_*}; do
        if [ -z "${!var}" ] && [[ ! "$var" =~ (DEV|ADMIN|REDIS|PROMETHEUS|GRAFANA) ]]; then
            echo "Error: $var is not set"
            ((errors++))
        fi
    done
    return $errors
}
```

### 4. Node.js CommonJS Adapter

**Location**: `/shared/config/ports.cjs`

```javascript
// CommonJS adapter for Node.js scripts that can't use ES modules
const fs = require('fs');
const path = require('path');

class PortConfigCJS {
  constructor() {
    this.configPath = path.join(__dirname, 'ports.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const parsed = JSON.parse(configData);
      return this.applyEnvOverrides(parsed.ports);
    } catch (error) {
      console.error('Failed to load port configuration:', error);
      return this.getDefaultConfig();
    }
  }

  applyEnvOverrides(config) {
    // Apply environment variable overrides
    if (process.env.PORT_FRONTEND_MAIN) {
      config.frontend.main = parseInt(process.env.PORT_FRONTEND_MAIN);
    }
    if (process.env.PORT_GATEWAY_MAIN) {
      config.gateway.main = parseInt(process.env.PORT_GATEWAY_MAIN);
    }
    // ... apply other overrides
    return config;
  }

  getDefaultConfig() {
    return {
      frontend: { main: 4100 },
      gateway: { main: 4110 },
      services: {
        userManagement: 4120,
        aiAssistant: 4130,
        terminal: 4140,
        workspace: 4150,
        portfolio: 4160,
        marketData: 4170
      },
      websocket: {
        system: 8001,
        claude: 8002,
        terminal: 8003,
        portfolio: 8004
      },
      database: {
        postgres: 25060,
        prismaStudio: 5555,
        redis: 6379
      }
    };
  }

  getFrontendPort() {
    return this.config.frontend.main;
  }

  getGatewayPort() {
    return this.config.gateway.main;
  }

  getServicePort(service) {
    return this.config.services[service];
  }

  getServiceUrl(service, host = 'localhost') {
    const port = this.config.services[service];
    return `http://${host}:${port}`;
  }

  getWebSocketUrl(type, host = 'localhost') {
    const port = this.config.websocket[type];
    return `ws://${host}:${port}`;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getPortConfig: () => {
    if (!instance) {
      instance = new PortConfigCJS();
    }
    return instance;
  },
  
  // Direct exports for convenience
  getPorts: () => {
    const config = module.exports.getPortConfig();
    return config.config;
  },
  
  getFrontendPort: () => {
    const config = module.exports.getPortConfig();
    return config.getFrontendPort();
  },
  
  getGatewayPort: () => {
    const config = module.exports.getPortConfig();
    return config.getGatewayPort();
  },
  
  getServicePort: (service) => {
    const config = module.exports.getPortConfig();
    return config.getServicePort(service);
  },
  
  getServiceUrl: (service, host) => {
    const config = module.exports.getPortConfig();
    return config.getServiceUrl(service, host);
  }
};
```

### 5. Docker Compose Integration

**Location**: `/shared/config/docker-ports.env`

```env
# Docker Compose Port Configuration
# Auto-generated from ports.json

# Frontend
FRONTEND_PORT=4100
FRONTEND_DEV_PORT=

# Gateway
GATEWAY_PORT=4110
GATEWAY_ADMIN_PORT=

# Services
USER_SERVICE_PORT=4120
AI_SERVICE_PORT=4130
TERMINAL_SERVICE_PORT=4140
WORKSPACE_SERVICE_PORT=4150
PORTFOLIO_SERVICE_PORT=4160
MARKET_SERVICE_PORT=4170

# WebSocket
WS_SYSTEM_PORT=8001
WS_CLAUDE_PORT=8002
WS_TERMINAL_PORT=8003
WS_PORTFOLIO_PORT=8004

# Database
POSTGRES_PORT=25060
PRISMA_STUDIO_PORT=5555
REDIS_PORT=6379

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
```

## Data Models and Schemas

### Port Registry Schema (Prisma)

```prisma
model PortConfiguration {
  id            String   @id @default(cuid())
  serviceName   String   @unique
  port          Int
  protocol      String   @default("tcp")
  description   String?
  environment   String   @default("development")
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([serviceName, environment])
  @@index([port])
}

model PortHistory {
  id            String   @id @default(cuid())
  serviceName   String
  oldPort       Int
  newPort       Int
  changedBy     String
  reason        String?
  changedAt     DateTime @default(now())
  
  @@index([serviceName])
  @@index([changedAt])
}
```

## API Specifications

### Port Configuration API

```typescript
// GET /api/config/ports
interface GetPortsResponse {
  ports: PortConfiguration;
  version: string;
  environment: string;
}

// POST /api/config/ports/validate
interface ValidatePortsRequest {
  ports: Partial<PortConfiguration>;
}

interface ValidatePortsResponse {
  valid: boolean;
  conflicts: Array<{
    port: number;
    services: string[];
  }>;
  suggestions: Array<{
    service: string;
    suggestedPort: number;
  }>;
}

// POST /api/config/ports/update
interface UpdatePortsRequest {
  updates: Partial<PortConfiguration>;
  reason: string;
  updatedBy: string;
}

interface UpdatePortsResponse {
  success: boolean;
  oldConfig: PortConfiguration;
  newConfig: PortConfiguration;
  restartRequired: string[]; // List of services that need restart
}

// GET /api/config/ports/history
interface GetPortHistoryResponse {
  history: Array<{
    serviceName: string;
    oldPort: number;
    newPort: number;
    changedBy: string;
    reason: string;
    changedAt: string;
  }>;
  totalChanges: number;
}

// GET /api/config/ports/check
interface PortCheckResponse {
  available: Array<{
    port: number;
    status: 'available' | 'in_use' | 'reserved';
    service?: string;
  }>;
  recommendations: Array<{
    range: string;
    purpose: string;
  }>;
}
```

## Integration Requirements

### 1. Next.js Integration

```typescript
// next.config.js
const { getPortConfig } = require('./shared/config/ports.cjs');

const ports = getPortConfig();

module.exports = {
  serverRuntimeConfig: {
    port: ports.getFrontendPort(),
    gatewayUrl: ports.getServiceUrl('gateway')
  },
  publicRuntimeConfig: {
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://api.example.com' 
      : ports.getServiceUrl('gateway')
  },
  // ... rest of config
};
```

### 2. Service Integration

```typescript
// services/[service-name]/src/index.ts
import { portConfig } from '@shared/config/ports.config';

const serviceName = 'aiAssistant'; // or other service
const port = portConfig.getServicePort(serviceName);

app.listen(port, () => {
  console.log(`${serviceName} service running on port ${port}`);
});
```

### 3. Gateway Integration

```typescript
// services/gateway/src/services/service-registry.ts
import { portConfig } from '@shared/config/ports.config';

export class ServiceRegistry {
  private services = new Map();

  constructor() {
    this.registerServices();
  }

  private registerServices() {
    const config = portConfig.getConfig();
    
    Object.entries(config.services).forEach(([name, port]) => {
      this.services.set(name, {
        url: `http://localhost:${port}`,
        healthCheck: `http://localhost:${port}/health`,
        port
      });
    });
  }

  getServiceUrl(serviceName: string): string {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service.url;
  }
}
```

### 4. Shell Script Integration

```bash
#!/bin/bash
# Example service startup script

# Source the port configuration
source /shared/config/ports.sh

# Validate ports are loaded
if ! validate_ports; then
    echo "Port configuration validation failed"
    exit 1
fi

# Start services using configured ports
echo "Starting Frontend on port $PORT_FRONTEND_MAIN"
npm run dev --prefix /app -- --port $PORT_FRONTEND_MAIN &

echo "Starting Gateway on port $PORT_GATEWAY_MAIN"
node /services/gateway/dist/index.js --port $PORT_GATEWAY_MAIN &

# Start all services
for service in USER AI TERMINAL WORKSPACE PORTFOLIO MARKET; do
    port_var="PORT_SERVICE_${service}"
    echo "Starting ${service} service on port ${!port_var}"
    node /services/${service,,}/dist/index.js --port ${!port_var} &
done

wait
```

## Implementation Guidelines

### Phase 1: Core Infrastructure (Day 1-2)

1. **Create Shared Configuration Module**
   - Implement `/shared/config/ports.config.ts`
   - Create `/shared/config/ports.json`
   - Generate `/shared/config/ports.sh`
   - Create `/shared/config/ports.cjs`

2. **Setup Build Process**
   - Add script to generate shell/env files from JSON
   - Create validation script
   - Setup automated sync between formats

3. **Create Migration Utilities**
   - Port scanner utility to find hardcoded ports
   - Automatic replacement script
   - Rollback mechanism

### Phase 2: Service Migration (Day 3-4)

1. **Migrate Core Services**
   - Update each service's index.ts
   - Replace hardcoded ports with config imports
   - Update service startup scripts

2. **Update Gateway**
   - Integrate with port configuration
   - Update service registry
   - Modify routing logic

3. **Update Frontend**
   - Integrate with Next.js config
   - Update API client configurations
   - Replace hardcoded URLs

### Phase 3: Script Migration (Day 5)

1. **Update Shell Scripts**
   - Source ports.sh in all scripts
   - Replace hardcoded values
   - Test all scripts

2. **Update Docker Configurations**
   - Update docker-compose files
   - Use port environment variables
   - Test container networking

3. **Update Development Tools**
   - Update test scripts
   - Modify development utilities
   - Update documentation generators

### Phase 4: Testing & Validation (Day 6)

1. **Comprehensive Testing**
   - Unit tests for configuration module
   - Integration tests for services
   - End-to-end tests for full system

2. **Performance Testing**
   - Verify no performance degradation
   - Test configuration loading time
   - Validate memory usage

3. **Documentation Update**
   - Update all documentation
   - Create migration guide
   - Update README files

## Implementation Guidelines

### Migration Script

```typescript
// scripts/migrate-ports.ts
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationRule {
  pattern: RegExp;
  replacement: string;
  fileTypes: string[];
}

class PortMigrator {
  private rules: MigrationRule[] = [
    {
      pattern: /localhost:4100/g,
      replacement: '${getFrontendUrl()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx']
    },
    {
      pattern: /localhost:4110/g,
      replacement: '${getGatewayUrl()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx']
    },
    {
      pattern: /PORT=4100/g,
      replacement: 'PORT=${PORT_FRONTEND_MAIN}',
      fileTypes: ['sh', 'bash']
    },
    // ... more rules
  ];

  async migrate(dryRun = true) {
    const files = await this.findFiles();
    const results = [];

    for (const file of files) {
      const result = await this.migrateFile(file, dryRun);
      if (result.changed) {
        results.push(result);
      }
    }

    return results;
  }

  private async findFiles(): Promise<string[]> {
    const patterns = [
      '**/*.{ts,tsx,js,jsx}',
      '**/*.{sh,bash}',
      '**/*.json',
      '**/*.env*',
      '**/Dockerfile*',
      '**/docker-compose*.yml'
    ];

    const ignorePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**'
    ];

    const files = [];
    for (const pattern of patterns) {
      const matched = await glob(pattern, { 
        ignore: ignorePatterns,
        absolute: true 
      });
      files.push(...matched);
    }

    return files;
  }

  private async migrateFile(filePath: string, dryRun: boolean) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).slice(1);
    let newContent = content;
    let changed = false;

    for (const rule of this.rules) {
      if (rule.fileTypes.includes(ext)) {
        const matches = content.match(rule.pattern);
        if (matches) {
          newContent = newContent.replace(rule.pattern, rule.replacement);
          changed = true;
        }
      }
    }

    if (changed && !dryRun) {
      // Backup original
      fs.copyFileSync(filePath, `${filePath}.backup`);
      // Write new content
      fs.writeFileSync(filePath, newContent);
    }

    return {
      file: filePath,
      changed,
      changes: changed ? this.getChanges(content, newContent) : []
    };
  }

  private getChanges(original: string, modified: string) {
    // Calculate diff for reporting
    // Implementation details...
    return [];
  }
}

// Run migration
const migrator = new PortMigrator();
const dryRun = process.argv.includes('--dry-run');

migrator.migrate(dryRun).then(results => {
  console.log(`Migration ${dryRun ? 'Preview' : 'Complete'}`);
  console.log(`Files ${dryRun ? 'to be modified' : 'modified'}: ${results.length}`);
  
  results.forEach(result => {
    console.log(`  - ${result.file}`);
  });

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log('\nBackup files created with .backup extension');
  }
});
```

## Security Specifications

### Port Security Considerations

1. **Port Range Validation**
   - Enforce valid port ranges (1024-65535 for non-root)
   - Prevent use of well-known ports
   - Validate against reserved ranges

2. **Access Control**
   - Restrict port configuration changes to admin users
   - Audit all port configuration changes
   - Implement change approval workflow for production

3. **Network Security**
   - Use internal network for service communication
   - Expose only gateway port externally
   - Implement firewall rules based on configuration

4. **Configuration Security**
   - Encrypt sensitive port information
   - Use secure environment variable storage
   - Implement configuration versioning

## Performance Requirements

### Configuration Loading

- **Initial Load**: < 10ms
- **Cache Hit**: < 1ms
- **Environment Override Processing**: < 5ms
- **Validation**: < 20ms for full configuration

### Runtime Performance

- **Port Lookup**: O(1) constant time
- **URL Generation**: < 1ms
- **Configuration Update**: < 100ms with service notification
- **Memory Usage**: < 1MB for configuration module

### Scalability

- Support for 100+ services
- Handle 10,000+ requests/second for port lookups
- Zero-downtime configuration updates
- Horizontal scaling compatible

## Testing Requirements

### Unit Tests

```typescript
describe('PortConfig', () => {
  it('should load default configuration', () => {
    const config = new PortConfig();
    expect(config.getFrontendPort()).toBe(4100);
  });

  it('should apply environment overrides', () => {
    process.env.PORT_FRONTEND_MAIN = '5000';
    const config = new PortConfig();
    expect(config.getFrontendPort()).toBe(5000);
  });

  it('should generate correct service URLs', () => {
    const config = new PortConfig();
    expect(config.getServiceUrl('aiAssistant')).toBe('http://localhost:4130');
  });

  it('should validate port conflicts', () => {
    const config = new PortConfig();
    const conflicts = config.validatePorts();
    expect(conflicts).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
describe('Port Configuration Integration', () => {
  it('should work across all services', async () => {
    const services = ['userManagement', 'aiAssistant', 'terminal', 
                     'workspace', 'portfolio', 'marketData'];
    
    for (const service of services) {
      const url = getServiceUrl(service);
      const response = await fetch(`${url}/health`);
      expect(response.status).toBe(200);
    }
  });

  it('should handle configuration updates', async () => {
    // Update configuration
    await updatePortConfiguration({
      services: { aiAssistant: 4131 }
    });

    // Verify service restarts with new port
    await waitForServiceRestart('aiAssistant');
    
    const url = getServiceUrl('aiAssistant');
    expect(url).toContain('4131');
  });
});
```

### End-to-End Tests

```typescript
describe('Full System Port Configuration', () => {
  it('should route requests through gateway to services', async () => {
    const gatewayUrl = `http://localhost:${getGatewayPort()}`;
    
    // Test each service through gateway
    const endpoints = [
      '/api/v1/users/health',
      '/api/v1/chat/health',
      '/api/v1/terminal/health',
      '/api/v1/workspace/health',
      '/api/v1/portfolios/health',
      '/api/v1/market/health'
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${gatewayUrl}${endpoint}`);
      expect(response.status).toBe(200);
    }
  });
});
```

## Deployment Considerations

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    ports:
      - "${PORT_FRONTEND_MAIN:-4100}:4100"
    env_file:
      - ./shared/config/docker-ports.env

  gateway:
    ports:
      - "${PORT_GATEWAY_MAIN:-4110}:4110"
    env_file:
      - ./shared/config/docker-ports.env
    depends_on:
      - user-service
      - ai-service
      # ... other services

  user-service:
    ports:
      - "${PORT_SERVICE_USER:-4120}:4120"
    env_file:
      - ./shared/config/docker-ports.env
  
  # ... other services
```

### Production Environment

```yaml
# kubernetes/deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: port-config
data:
  ports.json: |
    {
      "frontend": { "main": 4100 },
      "gateway": { "main": 4110 },
      "services": {
        "userManagement": 4120,
        # ... rest of configuration
      }
    }

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  template:
    spec:
      containers:
      - name: gateway
        env:
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: port-config
              key: gateway.port
        volumeMounts:
        - name: config
          mountPath: /app/config
      volumes:
      - name: config
        configMap:
          name: port-config
```

### CI/CD Integration

```yaml
# .github/workflows/validate-ports.yml
name: Validate Port Configuration

on:
  pull_request:
    paths:
      - 'shared/config/ports.*'
      - '**/package.json'
      - '**/*.sh'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Validate Port Configuration
        run: |
          npm run validate:ports
          
      - name: Check for Port Conflicts
        run: |
          node scripts/check-port-conflicts.js
          
      - name: Test Configuration Loading
        run: |
          npm test -- --testPathPattern=port-config
          
      - name: Verify Service Integration
        run: |
          docker-compose -f docker-compose.test.yml up -d
          npm run test:integration:ports
```

## Appendices

### Appendix A: Port Ranges and Conventions

| Range | Purpose | Examples |
|-------|---------|----------|
| 4100-4199 | Frontend & Gateway | 4100 (Frontend), 4110 (Gateway) |
| 4100-4199 | Core Services | 4120-4170 (Microservices) |
| 8000-8099 | WebSocket Services | 8001-8004 (WS endpoints) |
| 9000-9099 | Monitoring | 9090 (Prometheus) |
| 5000-5999 | Development Tools | 5555 (Prisma Studio) |

### Appendix B: Migration Checklist

- [ ] Create shared configuration module
- [ ] Generate configuration files for all formats
- [ ] Create migration scripts
- [ ] Backup all files before migration
- [ ] Run migration in dry-run mode
- [ ] Review migration report
- [ ] Execute actual migration
- [ ] Update all services to use new configuration
- [ ] Test each service individually
- [ ] Test full system integration
- [ ] Update documentation
- [ ] Update CI/CD pipelines
- [ ] Deploy to staging environment
- [ ] Validate staging deployment
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Remove backup files after stability confirmed

### Appendix C: Rollback Procedure

1. **Immediate Rollback** (< 5 minutes)
   ```bash
   # Restore from backups
   ./scripts/rollback-ports.sh --restore-backups
   
   # Restart all services
   ./services/restart-all.sh
   ```

2. **Configuration Rollback**
   ```bash
   # Revert to previous configuration
   git revert HEAD
   
   # Rebuild and deploy
   npm run build
   ./services/deploy-all.sh
   ```

3. **Database Rollback** (if configuration was persisted)
   ```sql
   -- Restore from port history
   UPDATE port_configuration 
   SET port = (
     SELECT old_port 
     FROM port_history 
     WHERE service_name = port_configuration.service_name
     ORDER BY changed_at DESC 
     LIMIT 1
   );
   ```

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-08-19  
**Author**: Technical Architecture Team  
**Status**: Ready for Implementation