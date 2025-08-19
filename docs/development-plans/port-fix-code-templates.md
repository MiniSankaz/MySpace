# Code Templates สำหรับแก้ไขปัญหาพอร์ต

## 1. Centralized Port Configuration Module

### 1.1 TypeScript Configuration (`/shared/config/ports.config.ts`)

```typescript
// ports.config.ts - ระบบจัดการพอร์ตแบบรวมศูนย์
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ServicePorts {
  main: number;
  websocket?: number;
  admin?: number;
}

export interface PortConfiguration {
  frontend: ServicePorts;
  gateway: ServicePorts;
  services: {
    userManagement: ServicePorts;
    aiAssistant: ServicePorts;
    terminal: ServicePorts;
    workspace: ServicePorts;
    portfolio: ServicePorts;
    marketData: ServicePorts;
  };
  websocket: {
    system: number;
    claude: number;
    terminal: number;
    portfolio: number;
  };
  database: {
    postgres: number;
    prismaStudio: number;
    redis?: number;
  };
}

export class PortConfig {
  private static instance: PortConfig;
  private config: PortConfiguration;
  private envPrefix = 'PORT_';

  private constructor() {
    this.config = this.loadConfiguration();
    this.validatePorts();
  }

  public static getInstance(): PortConfig {
    if (!PortConfig.instance) {
      PortConfig.instance = new PortConfig();
    }
    return PortConfig.instance;
  }

  private loadConfiguration(): PortConfiguration {
    return {
      frontend: {
        main: this.getPort('FRONTEND_MAIN', 4100),
        websocket: this.getPort('FRONTEND_WS', undefined)
      },
      gateway: {
        main: this.getPort('GATEWAY_MAIN', 4110),
        admin: this.getPort('GATEWAY_ADMIN', 4111)
      },
      services: {
        userManagement: {
          main: this.getPort('SERVICE_USER', 4120),
          websocket: this.getPort('SERVICE_USER_WS', 4121)
        },
        aiAssistant: {
          main: this.getPort('SERVICE_AI', 4130),
          websocket: this.getPort('SERVICE_AI_WS', 4131)
        },
        terminal: {
          main: this.getPort('SERVICE_TERMINAL', 4140),
          websocket: this.getPort('SERVICE_TERMINAL_WS', 4141)
        },
        workspace: {
          main: this.getPort('SERVICE_WORKSPACE', 4150),
          websocket: this.getPort('SERVICE_WORKSPACE_WS', 4151)
        },
        portfolio: {
          main: this.getPort('SERVICE_PORTFOLIO', 4160),
          websocket: this.getPort('SERVICE_PORTFOLIO_WS', 4161)
        },
        marketData: {
          main: this.getPort('SERVICE_MARKET', 4170),
          websocket: this.getPort('SERVICE_MARKET_WS', 4171)
        }
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
      }
    };
  }

  private getPort(envKey: string, defaultValue?: number): number | undefined {
    const envValue = process.env[`${this.envPrefix}${envKey}`];
    if (envValue) {
      const port = parseInt(envValue, 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
      console.warn(`Invalid port value for ${this.envPrefix}${envKey}: ${envValue}`);
    }
    return defaultValue;
  }

  private validatePorts(): void {
    const usedPorts = new Set<number>();
    const checkPort = (port: number | undefined, name: string) => {
      if (port !== undefined) {
        if (usedPorts.has(port)) {
          throw new Error(`Port conflict: ${port} is already assigned (${name})`);
        }
        usedPorts.add(port);
      }
    };

    // Validate all ports
    checkPort(this.config.frontend.main, 'frontend.main');
    checkPort(this.config.gateway.main, 'gateway.main');
    
    Object.entries(this.config.services).forEach(([service, ports]) => {
      checkPort(ports.main, `services.${service}.main`);
      checkPort(ports.websocket, `services.${service}.websocket`);
    });

    Object.entries(this.config.websocket).forEach(([name, port]) => {
      checkPort(port, `websocket.${name}`);
    });
  }

  // Public methods
  public getConfig(): PortConfiguration {
    return this.config;
  }

  public getServicePort(serviceName: string): number {
    const serviceMap: Record<string, number> = {
      'frontend': this.config.frontend.main,
      'gateway': this.config.gateway.main,
      'user': this.config.services.userManagement.main,
      'ai': this.config.services.aiAssistant.main,
      'terminal': this.config.services.terminal.main,
      'workspace': this.config.services.workspace.main,
      'portfolio': this.config.services.portfolio.main,
      'market': this.config.services.marketData.main
    };
    
    const port = serviceMap[serviceName];
    if (!port) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    return port;
  }

  public getServiceUrl(serviceName: string, protocol: 'http' | 'ws' = 'http'): string {
    const port = this.getServicePort(serviceName);
    const host = process.env.SERVICE_HOST || 'localhost';
    return `${protocol}://${host}:${port}`;
  }

  public getGatewayRoute(serviceName: string): string {
    const routeMap: Record<string, string> = {
      'user': '/api/v1/auth',
      'ai': '/api/v1/assistant',
      'terminal': '/api/v1/terminal',
      'workspace': '/api/v1/workspace',
      'portfolio': '/api/v1/portfolios',
      'market': '/api/v1/market'
    };
    
    return routeMap[serviceName] || `/api/v1/${serviceName}`;
  }

  // Export configuration for debugging
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Check if port is available
  public async isPortAvailable(port: number): Promise<boolean> {
    const net = await import('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }
}

// Singleton instance export
export const portConfig = PortConfig.getInstance();

// Helper functions
export function getServicePort(service: string): number {
  return portConfig.getServicePort(service);
}

export function getServiceUrl(service: string, protocol?: 'http' | 'ws'): string {
  return portConfig.getServiceUrl(service, protocol);
}

export function getGatewayRoute(service: string): string {
  return portConfig.getGatewayRoute(service);
}
```

### 1.2 CommonJS Adapter (`/shared/config/ports.cjs`)

```javascript
// ports.cjs - CommonJS adapter for legacy code
const { config } = require('dotenv');
config();

class PortConfigCJS {
  constructor() {
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    return {
      frontend: {
        main: this.getPort('FRONTEND_MAIN', 4100)
      },
      gateway: {
        main: this.getPort('GATEWAY_MAIN', 4110)
      },
      services: {
        userManagement: { main: this.getPort('SERVICE_USER', 4120) },
        aiAssistant: { main: this.getPort('SERVICE_AI', 4130) },
        terminal: { main: this.getPort('SERVICE_TERMINAL', 4140) },
        workspace: { main: this.getPort('SERVICE_WORKSPACE', 4150) },
        portfolio: { main: this.getPort('SERVICE_PORTFOLIO', 4160) },
        marketData: { main: this.getPort('SERVICE_MARKET', 4170) }
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
      }
    };
  }

  getPort(envKey, defaultValue) {
    const envValue = process.env[`PORT_${envKey}`];
    if (envValue) {
      const port = parseInt(envValue, 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
    return defaultValue;
  }

  getServicePort(serviceName) {
    const serviceMap = {
      'frontend': this.config.frontend.main,
      'gateway': this.config.gateway.main,
      'user': this.config.services.userManagement.main,
      'ai': this.config.services.aiAssistant.main,
      'terminal': this.config.services.terminal.main,
      'workspace': this.config.services.workspace.main,
      'portfolio': this.config.services.portfolio.main,
      'market': this.config.services.marketData.main
    };
    
    return serviceMap[serviceName] || null;
  }

  getServiceUrl(serviceName, protocol = 'http') {
    const port = this.getServicePort(serviceName);
    if (!port) return null;
    const host = process.env.SERVICE_HOST || 'localhost';
    return `${protocol}://${host}:${port}`;
  }
}

const portConfig = new PortConfigCJS();

module.exports = {
  portConfig,
  getServicePort: (service) => portConfig.getServicePort(service),
  getServiceUrl: (service, protocol) => portConfig.getServiceUrl(service, protocol),
  getConfig: () => portConfig.config
};
```

### 1.3 Shell Script Configuration (`/shared/config/ports.sh`)

```bash
#!/bin/bash
# ports.sh - Shell script port configuration

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default port configuration
export PORT_FRONTEND_MAIN=${PORT_FRONTEND_MAIN:-4100}
export PORT_GATEWAY_MAIN=${PORT_GATEWAY_MAIN:-4110}
export PORT_SERVICE_USER=${PORT_SERVICE_USER:-4120}
export PORT_SERVICE_AI=${PORT_SERVICE_AI:-4130}
export PORT_SERVICE_TERMINAL=${PORT_SERVICE_TERMINAL:-4140}
export PORT_SERVICE_WORKSPACE=${PORT_SERVICE_WORKSPACE:-4150}
export PORT_SERVICE_PORTFOLIO=${PORT_SERVICE_PORTFOLIO:-4160}
export PORT_SERVICE_MARKET=${PORT_SERVICE_MARKET:-4170}

# WebSocket ports
export PORT_WS_SYSTEM=${PORT_WS_SYSTEM:-8001}
export PORT_WS_CLAUDE=${PORT_WS_CLAUDE:-8002}
export PORT_WS_TERMINAL=${PORT_WS_TERMINAL:-8003}
export PORT_WS_PORTFOLIO=${PORT_WS_PORTFOLIO:-8004}

# Database ports
export PORT_DB_POSTGRES=${PORT_DB_POSTGRES:-25060}
export PORT_DB_PRISMA_STUDIO=${PORT_DB_PRISMA_STUDIO:-5555}
export PORT_DB_REDIS=${PORT_DB_REDIS:-6379}

# Helper functions
get_service_port() {
  local service=$1
  case $service in
    frontend) echo $PORT_FRONTEND_MAIN ;;
    gateway) echo $PORT_GATEWAY_MAIN ;;
    user) echo $PORT_SERVICE_USER ;;
    ai) echo $PORT_SERVICE_AI ;;
    terminal) echo $PORT_SERVICE_TERMINAL ;;
    workspace) echo $PORT_SERVICE_WORKSPACE ;;
    portfolio) echo $PORT_SERVICE_PORTFOLIO ;;
    market) echo $PORT_SERVICE_MARKET ;;
    *) echo "Unknown service: $service" >&2; return 1 ;;
  esac
}

get_service_url() {
  local service=$1
  local protocol=${2:-http}
  local port=$(get_service_port $service)
  local host=${SERVICE_HOST:-localhost}
  
  if [ -n "$port" ]; then
    echo "${protocol}://${host}:${port}"
  fi
}

# Check if port is available
is_port_available() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -i :$port >/dev/null 2>&1
  else
    ! netstat -an | grep -q ":$port "
  fi
}

# Validate all ports
validate_ports() {
  local ports=(
    $PORT_FRONTEND_MAIN
    $PORT_GATEWAY_MAIN
    $PORT_SERVICE_USER
    $PORT_SERVICE_AI
    $PORT_SERVICE_TERMINAL
    $PORT_SERVICE_WORKSPACE
    $PORT_SERVICE_PORTFOLIO
    $PORT_SERVICE_MARKET
  )
  
  for port in "${ports[@]}"; do
    if ! is_port_available $port; then
      echo "Warning: Port $port is already in use" >&2
    fi
  done
}

# Export all functions
export -f get_service_port
export -f get_service_url
export -f is_port_available
export -f validate_ports
```

## 2. AI Assistant Service Fix Templates

### 2.1 Fixed AI Assistant Startup (`/services/ai-assistant/src/index.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { portConfig } from '../../../shared/config/ports.config';
import { claudeRouter } from './routes/claude.routes';
import { chatRouter } from './routes/chat.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();
const PORT = portConfig.getServicePort('ai');
const server = createServer(app);

// Socket.IO configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      portConfig.getServiceUrl('frontend'),
      portConfig.getServiceUrl('gateway')
    ],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: [
    portConfig.getServiceUrl('frontend'),
    portConfig.getServiceUrl('gateway')
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-assistant',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/claude', claudeRouter);
app.use('/api/v1/chat', chatRouter);

// WebSocket handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('chat:message', async (data) => {
    try {
      // Handle chat message
      socket.emit('chat:response', {
        message: 'Response from AI',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Chat error:', error);
      socket.emit('chat:error', { error: 'Failed to process message' });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`AI Assistant service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});
```

### 2.2 Package.json Fix (`/services/ai-assistant/package.json`)

```json
{
  "name": "@portfolio/ai-assistant",
  "version": "1.0.0",
  "description": "AI Assistant Service",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node -r tsconfig-paths/register src/index.ts",
    "build": "tsc",
    "start": "node -r tsconfig-paths/register dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "express": "^4.18.2",
    "socket.io": "^4.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "winston": "^3.8.2",
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.5.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "nodemon": "^3.0.1",
    "eslint": "^8.45.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "jest": "^29.5.0",
    "@types/jest": "^29.5.0"
  }
}
```

## 3. Market Data Service Templates

### 3.1 Market Data Startup (`/services/market-data/src/index.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { portConfig } from '../../../shared/config/ports.config';
import { marketRouter } from './routes/market.routes';
import { quoteRouter } from './routes/quote.routes';
import { streamRouter } from './routes/stream.routes';
import { PolygonService } from './services/polygon.service';
import { MockPolygonService } from './services/mock-polygon.service';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();
const PORT = portConfig.getServicePort('market');
const server = createServer(app);

// Initialize Polygon service (use mock if no API key)
const polygonService = process.env.POLYGON_API_KEY 
  ? new PolygonService(process.env.POLYGON_API_KEY)
  : new MockPolygonService();

// Socket.IO for real-time data
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      portConfig.getServiceUrl('frontend'),
      portConfig.getServiceUrl('gateway')
    ],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    portConfig.getServiceUrl('frontend'),
    portConfig.getServiceUrl('gateway')
  ],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'market-data',
    port: PORT,
    apiKey: !!process.env.POLYGON_API_KEY,
    mode: process.env.POLYGON_API_KEY ? 'live' : 'mock',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/quotes', quoteRouter);
app.use('/api/v1/stream', streamRouter);

// WebSocket for real-time quotes
io.on('connection', (socket) => {
  logger.info(`Market data client connected: ${socket.id}`);
  
  socket.on('subscribe:quote', async (symbols: string[]) => {
    try {
      // Start streaming quotes for symbols
      const interval = setInterval(async () => {
        for (const symbol of symbols) {
          const quote = await polygonService.getQuote(symbol);
          socket.emit('quote:update', { symbol, quote });
        }
      }, 5000); // Update every 5 seconds
      
      socket.on('disconnect', () => {
        clearInterval(interval);
      });
    } catch (error) {
      logger.error('Quote subscription error:', error);
      socket.emit('quote:error', { error: 'Failed to subscribe' });
    }
  });
});

// Error handling
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`Market Data service running on port ${PORT}`);
  logger.info(`Mode: ${process.env.POLYGON_API_KEY ? 'Live' : 'Mock'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});
```

### 3.2 Mock Polygon Service (`/services/market-data/src/services/mock-polygon.service.ts`)

```typescript
export class MockPolygonService {
  private mockData = {
    AAPL: { price: 178.50, change: 2.35, changePercent: 1.33, volume: 52341234 },
    GOOGL: { price: 142.75, change: -1.20, changePercent: -0.83, volume: 23456789 },
    MSFT: { price: 380.25, change: 5.50, changePercent: 1.47, volume: 18765432 },
    TSLA: { price: 245.80, change: -3.45, changePercent: -1.38, volume: 98765432 }
  };

  async getQuote(symbol: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const baseData = this.mockData[symbol] || {
      price: Math.random() * 500,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 100000000)
    };
    
    // Add some randomness to simulate real-time changes
    const variation = (Math.random() - 0.5) * 2;
    
    return {
      symbol,
      price: baseData.price + variation,
      previousClose: baseData.price - baseData.change,
      change: baseData.change,
      changePercent: baseData.changePercent,
      volume: baseData.volume,
      high: baseData.price + Math.abs(variation * 2),
      low: baseData.price - Math.abs(variation * 2),
      open: baseData.price - variation,
      timestamp: new Date().toISOString(),
      marketCap: baseData.price * 1000000000,
      peRatio: 25.5,
      dividendYield: 1.85,
      beta: 1.12
    };
  }

  async getHistoricalData(symbol: string, from: Date, to: Date) {
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: 150 + Math.random() * 50,
        high: 160 + Math.random() * 50,
        low: 140 + Math.random() * 50,
        close: 150 + Math.random() * 50,
        volume: Math.floor(Math.random() * 100000000)
      });
    }
    
    return data;
  }

  async searchSymbols(query: string) {
    const symbols = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' }
    ];
    
    return symbols.filter(s => 
      s.symbol.includes(query.toUpperCase()) || 
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

## 4. Migration Script Template

### 4.1 Port Migration Script (`/scripts/migrate-ports.ts`)

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

interface MigrationRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  description: string;
}

interface MigrationResult {
  file: string;
  changes: number;
  errors: string[];
}

class PortMigration {
  private rules: MigrationRule[] = [
    // Frontend port changes
    {
      pattern: /localhost:4100/g,
      replacement: 'localhost:4100',
      description: 'Frontend port 4100 → 4100'
    },
    {
      pattern: /PORT=4100/g,
      replacement: 'PORT=4100',
      description: 'Frontend env var'
    },
    
    // Gateway port changes
    {
      pattern: /localhost:4110/g,
      replacement: 'localhost:4110',
      description: 'Gateway port 4110 → 4110'
    },
    
    // Service port changes
    {
      pattern: /localhost:4100(?!0)/g,
      replacement: 'localhost:4120',
      description: 'User service 4100 → 4120'
    },
    {
      pattern: /localhost:4130/g,
      replacement: 'localhost:4130',
      description: 'AI service 4130 → 4130'
    },
    {
      pattern: /localhost:4140/g,
      replacement: 'localhost:4140',
      description: 'Terminal service 4140 → 4140'
    },
    {
      pattern: /localhost:4150/g,
      replacement: 'localhost:4150',
      description: 'Workspace service 4150 → 4150'
    },
    {
      pattern: /localhost:4160/g,
      replacement: 'localhost:4160',
      description: 'Portfolio service 4160 → 4160'
    },
    {
      pattern: /localhost:4170/g,
      replacement: 'localhost:4170',
      description: 'Market service 4170 → 4170'
    }
  ];

  private backupDir = join(process.cwd(), 'backup', new Date().toISOString().replace(/:/g, '-'));
  private dryRun = false;
  private verbose = false;

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  async migrate(patterns: string[]): Promise<void> {
    console.log(chalk.blue('🚀 Starting port migration...'));
    
    if (this.dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No files will be modified'));
    }

    // Get all files to migrate
    const files = await this.getFiles(patterns);
    console.log(chalk.green(`📁 Found ${files.length} files to process`));

    // Create backup directory
    if (!this.dryRun) {
      this.createBackupDirectory();
    }

    // Process each file
    const results: MigrationResult[] = [];
    let processed = 0;

    for (const file of files) {
      const result = await this.processFile(file);
      results.push(result);
      processed++;

      if (processed % 10 === 0) {
        console.log(chalk.gray(`Progress: ${processed}/${files.length}`));
      }
    }

    // Print summary
    this.printSummary(results);
  }

  private async getFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private createBackupDirectory(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      console.log(chalk.blue(`📦 Backup directory created: ${this.backupDir}`));
    }
  }

  private async processFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      changes: 0,
      errors: []
    };

    try {
      const content = readFileSync(filePath, 'utf-8');
      let modified = content;
      let totalChanges = 0;

      // Apply each rule
      for (const rule of this.rules) {
        const matches = modified.match(rule.pattern);
        if (matches) {
          const changeCount = matches.length;
          modified = modified.replace(rule.pattern, rule.replacement as string);
          totalChanges += changeCount;

          if (this.verbose) {
            console.log(chalk.gray(`  ${rule.description}: ${changeCount} changes`));
          }
        }
      }

      if (totalChanges > 0) {
        if (!this.dryRun) {
          // Backup original file
          const backupPath = join(this.backupDir, filePath);
          const backupDir = dirname(backupPath);
          
          if (!existsSync(backupDir)) {
            mkdirSync(backupDir, { recursive: true });
          }
          
          writeFileSync(backupPath, content);
          
          // Write modified content
          writeFileSync(filePath, modified);
        }

        result.changes = totalChanges;
        console.log(chalk.green(`✅ ${filePath}: ${totalChanges} changes`));
      }
    } catch (error) {
      result.errors.push(error.message);
      console.log(chalk.red(`❌ ${filePath}: ${error.message}`));
    }

    return result;
  }

  private printSummary(results: MigrationResult[]): void {
    const totalFiles = results.length;
    const modifiedFiles = results.filter(r => r.changes > 0).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
    const filesWithErrors = results.filter(r => r.errors.length > 0).length;

    console.log('\n' + chalk.blue('=' .repeat(50)));
    console.log(chalk.bold('📊 Migration Summary'));
    console.log(chalk.blue('=' .repeat(50)));
    console.log(chalk.green(`✅ Files processed: ${totalFiles}`));
    console.log(chalk.green(`📝 Files modified: ${modifiedFiles}`));
    console.log(chalk.green(`🔄 Total changes: ${totalChanges}`));
    
    if (filesWithErrors > 0) {
      console.log(chalk.red(`❌ Files with errors: ${filesWithErrors}`));
    }

    if (!this.dryRun) {
      console.log(chalk.blue(`\n📦 Backup saved to: ${this.backupDir}`));
      console.log(chalk.yellow('💡 To rollback, run: npm run rollback'));
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const migration = new PortMigration({ dryRun, verbose });

  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'services/**/*.{ts,js}',
    'scripts/**/*.{sh,js,ts}',
    '*.{json,js,ts}',
    '.env*',
    'docs/**/*.md'
  ];

  await migration.migrate(patterns);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { PortMigration };
```

## 5. Testing Templates

### 5.1 Port Configuration Tests (`/tests/port-config.test.ts`)

```typescript
import { PortConfig } from '../shared/config/ports.config';

describe('Port Configuration System', () => {
  let config: PortConfig;

  beforeEach(() => {
    // Clear singleton instance
    (PortConfig as any).instance = undefined;
    // Reset environment variables
    delete process.env.PORT_SERVICE_AI;
    config = PortConfig.getInstance();
  });

  describe('Service Port Resolution', () => {
    test('should return correct default ports', () => {
      expect(config.getServicePort('frontend')).toBe(4100);
      expect(config.getServicePort('ai')).toBe(4130);
      expect(config.getServicePort('market')).toBe(4170);
    });

    test('should throw error for unknown service', () => {
      expect(() => config.getServicePort('unknown')).toThrow('Unknown service');
    });
  });

  describe('Environment Override', () => {
    test('should override with environment variables', () => {
      process.env.PORT_SERVICE_AI = '5130';
      const newConfig = PortConfig.getInstance();
      expect(newConfig.getServicePort('ai')).toBe(5130);
    });

    test('should ignore invalid port values', () => {
      process.env.PORT_SERVICE_AI = 'invalid';
      const newConfig = PortConfig.getInstance();
      expect(newConfig.getServicePort('ai')).toBe(4130); // Falls back to default
    });
  });

  describe('Service URLs', () => {
    test('should generate correct HTTP URLs', () => {
      expect(config.getServiceUrl('frontend')).toBe('http://localhost:4100');
      expect(config.getServiceUrl('ai')).toBe('http://localhost:4130');
    });

    test('should generate correct WebSocket URLs', () => {
      expect(config.getServiceUrl('terminal', 'ws')).toBe('ws://localhost:4140');
    });
  });

  describe('Port Validation', () => {
    test('should detect port conflicts', () => {
      // Set same port for two services
      process.env.PORT_SERVICE_AI = '4130';
      process.env.PORT_SERVICE_TERMINAL = '4130';
      
      expect(() => PortConfig.getInstance()).toThrow('Port conflict');
    });
  });

  describe('Gateway Routes', () => {
    test('should return correct gateway routes', () => {
      expect(config.getGatewayRoute('user')).toBe('/api/v1/auth');
      expect(config.getGatewayRoute('ai')).toBe('/api/v1/assistant');
      expect(config.getGatewayRoute('market')).toBe('/api/v1/market');
    });
  });
});
```

### 5.2 Service Health Check Script (`/scripts/check-services.ts`)

```typescript
import axios from 'axios';
import chalk from 'chalk';
import { portConfig } from '../shared/config/ports.config';

interface ServiceHealth {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  responseTime?: number;
  error?: string;
}

async function checkService(name: string): Promise<ServiceHealth> {
  const port = portConfig.getServicePort(name);
  const url = `${portConfig.getServiceUrl(name)}/health`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const responseTime = Date.now() - startTime;

    return {
      name,
      port,
      status: response.data.status === 'healthy' ? 'healthy' : 'unhealthy',
      responseTime
    };
  } catch (error) {
    return {
      name,
      port,
      status: 'unreachable',
      error: error.message
    };
  }
}

async function checkAllServices(): Promise<void> {
  const services = ['frontend', 'gateway', 'user', 'ai', 'terminal', 'workspace', 'portfolio', 'market'];
  
  console.log(chalk.blue('🔍 Checking service health...\n'));

  const results = await Promise.all(services.map(checkService));

  // Print results
  for (const result of results) {
    const statusIcon = result.status === 'healthy' ? '✅' : result.status === 'unhealthy' ? '⚠️' : '❌';
    const statusColor = result.status === 'healthy' ? chalk.green : result.status === 'unhealthy' ? chalk.yellow : chalk.red;
    
    console.log(`${statusIcon} ${chalk.bold(result.name.padEnd(15))} (${result.port}): ${statusColor(result.status)}`);
    
    if (result.responseTime) {
      console.log(chalk.gray(`   Response time: ${result.responseTime}ms`));
    }
    if (result.error) {
      console.log(chalk.gray(`   Error: ${result.error}`));
    }
  }

  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  
  console.log('\n' + chalk.blue('=' .repeat(40)));
  console.log(chalk.bold('Summary:'), `${healthy}/${total} services healthy`);
  
  if (healthy === total) {
    console.log(chalk.green('🎉 All services are healthy!'));
  } else {
    console.log(chalk.yellow('⚠️  Some services need attention'));
  }
}

// Run if executed directly
if (require.main === module) {
  checkAllServices().catch(console.error);
}

export { checkAllServices, checkService };
```

---

**เอกสารนี้ประกอบด้วย code templates พร้อมใช้งานสำหรับการแก้ไขปัญหาพอร์ตทั้งหมด**  
Development Planner Agent  
2025-08-19