# Memory Best Practices

## Stock Portfolio System v3.0 - Memory-Efficient Development Guidelines

**Target**: Maintain system memory usage under 2GB  
**Focus**: Development patterns, monitoring, and troubleshooting  
**Updated**: 2025-08-15

---

## 🎯 Memory Targets by Component

### Production Targets

| Component           | Memory Limit | Optimal Range | Critical Threshold |
| ------------------- | ------------ | ------------- | ------------------ |
| **Frontend**        | 1024MB       | 600-800MB     | >1200MB            |
| **Gateway**         | 256MB        | 150-200MB     | >300MB             |
| **Terminal**        | 256MB        | 120-180MB     | >300MB             |
| **Portfolio**       | 256MB        | 150-200MB     | >300MB             |
| **AI Assistant**    | 256MB        | 100-150MB     | >300MB             |
| **User Management** | 256MB        | 100-150MB     | >300MB             |
| **Total System**    | 2048MB       | 1200-1500MB   | >2500MB            |

### Development Mode Adjustments

- Add 20-30% to targets for development tools
- Monitor hot reload and file watching overhead
- Account for TypeScript compilation memory

---

## 🏗️ Development Guidelines

### 1. Node.js Configuration

#### Optimal Node.js Flags

```bash
# Frontend (Heavy application)
NODE_OPTIONS="--max-old-space-size=1024 --expose-gc --optimize-for-size"

# Microservices (Lightweight)
NODE_OPTIONS="--max-old-space-size=256 --expose-gc --optimize-for-size"

# Development with debugging
NODE_OPTIONS="--max-old-space-size=512 --expose-gc --inspect"
```

#### Memory-Efficient Package.json Scripts

```json
{
  "scripts": {
    "dev": "node --max-old-space-size=1024 --expose-gc server.js",
    "dev:minimal": "node --max-old-space-size=512 --expose-gc server.js",
    "dev:debug": "node --max-old-space-size=1024 --inspect --expose-gc server.js",
    "start": "node --max-old-space-size=768 --expose-gc server.js"
  }
}
```

### 2. Database Connection Management

#### Prisma Optimization

```javascript
// Optimal Prisma configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool limits
process.env.DATABASE_CONNECTION_LIMIT = "5"; // Per service
process.env.DATABASE_POOL_TIMEOUT = "10000";
process.env.DATABASE_POOL_MIN = "2";
process.env.DATABASE_POOL_MAX = "5";
```

#### Connection Cleanup Pattern

```javascript
// Always implement cleanup
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

### 3. WebSocket Memory Management

#### Connection Limits

```javascript
const io = new Server(server, {
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1024 * 1024, // 1MB
});

// Connection tracking
const connections = new Map();
const MAX_CONNECTIONS = 100;

io.on("connection", (socket) => {
  if (connections.size >= MAX_CONNECTIONS) {
    socket.disconnect();
    return;
  }

  connections.set(socket.id, {
    connectedAt: Date.now(),
    lastActivity: Date.now(),
  });

  socket.on("disconnect", () => {
    connections.delete(socket.id);
  });
});
```

#### Message Buffer Management

```javascript
// Limit message history
const messageBuffer = new Map();
const MAX_MESSAGES = 100;
const MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes

function addMessage(channelId, message) {
  if (!messageBuffer.has(channelId)) {
    messageBuffer.set(channelId, []);
  }

  const messages = messageBuffer.get(channelId);
  messages.push({ ...message, timestamp: Date.now() });

  // Limit buffer size
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
  }

  // Clean old messages
  const cutoff = Date.now() - MESSAGE_TTL;
  messageBuffer.set(
    channelId,
    messages.filter((m) => m.timestamp > cutoff),
  );
}
```

### 4. Frontend Memory Patterns

#### Component Memory Management

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Heavy computation
  return <div>{/* render */}</div>
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.data.id === nextProps.data.id
})

// Cleanup in useEffect
useEffect(() => {
  const subscription = api.subscribe(callback)

  return () => {
    subscription.unsubscribe() // Always cleanup
  }
}, [])

// Lazy load heavy components
const MonacoEditor = lazy(() => import('@monaco-editor/react'))
const ChartComponent = lazy(() => import('./Charts/AdvancedChart'))
```

#### State Management Optimization

```typescript
// Zustand store optimization
interface AppState {
  // Separate stores by domain
  user: UserState;
  portfolio: PortfolioState;
  terminal: TerminalState;
}

// Use selectors to prevent unnecessary re-renders
const useUser = () => useStore((state) => state.user);
const usePortfolioData = () => useStore((state) => state.portfolio.data);

// Implement cleanup actions
const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: new Map(),

  cleanup: () => {
    const { sessions } = get();
    sessions.clear();
    set({ sessions: new Map() });
  },
}));
```

#### Bundle Optimization

```javascript
// Next.js optimization
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            maxSize: 200000, // 200KB chunks
          },
        },
      };
    }
    return config;
  },
};
```

### 5. File System and Caching

#### Intelligent File Watching

```javascript
// Optimized nodemon configuration
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": [
    "node_modules",
    "dist",
    "logs",
    "*.test.ts",
    ".next",
    "coverage"
  ],
  "delay": 1000
}
```

#### Cache Management

```javascript
// Implement cache with TTL and size limits
class MemoryCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl,
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

## 🔍 Monitoring Procedures

### 1. Continuous Monitoring

#### Daily Monitoring Commands

```bash
# Quick memory check
npm run memory:check

# Detailed service breakdown
node scripts/monitor-memory.js once

# Start continuous monitoring
npm run memory:monitor

# Generate memory report
npm run memory:report
```

#### Memory Monitoring Scripts in Package.json

```json
{
  "scripts": {
    "memory:check": "node scripts/monitor-memory.js once",
    "memory:monitor": "node scripts/monitor-memory.js monitor 10000",
    "memory:report": "node scripts/monitor-memory.js report",
    "memory:cleanup": "./scripts/cleanup-memory.sh",
    "memory:baseline": "node scripts/monitor-memory.js once > logs/memory-baseline.json"
  }
}
```

### 2. Performance Regression Detection

#### Automated Memory Testing

```javascript
// Jest test for memory leaks
describe("Memory Leak Tests", () => {
  test("API endpoints should not leak memory", async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate load
    for (let i = 0; i < 100; i++) {
      await request(app).get("/api/v1/portfolios");
    }

    // Force garbage collection
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

#### Load Testing with Memory Monitoring

```bash
# Load test with memory tracking
npm run test:load -- --memory-monitor

# Long-running stability test
npm run test:stability:24h
```

### 3. Alert Configuration

#### Memory Alert Thresholds

```javascript
const ALERT_THRESHOLDS = {
  CRITICAL: 2048, // 2GB total system
  WARNING: 1600, // 1.6GB total system
  SERVICE_CRITICAL: 400, // 400MB per service
  SERVICE_WARNING: 300, // 300MB per service
};

// Alert configuration
const alerts = {
  email: process.env.ALERT_EMAIL,
  slack: process.env.SLACK_WEBHOOK,
  enabled: process.env.NODE_ENV === "production",
};
```

---

## 🚨 Troubleshooting Guide

### Common Memory Issues

#### 1. Memory Leak Detection

```bash
# Identify memory leaks
node --inspect --expose-gc scripts/memory-leak-detector.js

# Generate heap snapshot
node --inspect server.js
# Then in Chrome DevTools: Memory tab > Take heap snapshot
```

#### 2. High Memory Consumption Debug Steps

```bash
# 1. Check process breakdown
ps aux | grep -E "(node|npm)" | grep "Stock/port"

# 2. Identify memory hogs
node scripts/monitor-memory.js report

# 3. Check for runaway processes
lsof -p $(pgrep -f "Stock/port")

# 4. Analyze heap usage
node --inspect --expose-gc server.js
```

#### 3. Service-Specific Issues

**Frontend High Memory**:

```bash
# Check bundle size
npm run build:analyze

# Check component renders
npm run dev:profile

# Reduce heap size
NODE_OPTIONS="--max-old-space-size=768" npm run dev
```

**Database Connection Issues**:

```bash
# Check connections
npm run db:connections

# Reset connection pool
npm run db:reset-pool
```

**WebSocket Memory Leaks**:

```bash
# Check WebSocket connections
curl http://localhost:4110/api/debug/websockets

# Force cleanup
curl -X POST http://localhost:4110/api/debug/cleanup
```

### Emergency Procedures

#### 1. Memory Crisis Response

```bash
# Immediate relief
./scripts/cleanup-memory.sh --restart

# Emergency heap reduction
export NODE_OPTIONS="--max-old-space-size=512"
npm run restart:all

# Kill high-memory processes
pkill -f "Stock/port.*tsx"
```

#### 2. Service Recovery

```bash
# Graceful restart
npm run services:restart:graceful

# Force restart with memory limits
npm run services:restart:minimal

# Reset to production mode
npm run mode:production
```

---

## 📊 Performance Optimization Checklist

### Development Setup

- [ ] Node.js heap size < 1024MB for frontend
- [ ] Node.js heap size < 256MB per microservice
- [ ] Database connection pool configured
- [ ] WebSocket connection limits in place
- [ ] File watching optimized
- [ ] Cache TTL and size limits configured

### Code Patterns

- [ ] React.memo used for expensive components
- [ ] useEffect cleanup implemented
- [ ] Lazy loading for heavy components
- [ ] State management optimized
- [ ] Event listeners cleaned up
- [ ] Database connections properly closed

### Monitoring

- [ ] Memory monitoring script scheduled
- [ ] Alert thresholds configured
- [ ] Performance regression tests in place
- [ ] Load testing with memory tracking
- [ ] Daily memory reports generated

### Production Readiness

- [ ] PM2 configuration with memory limits
- [ ] Bundle size analyzed and optimized
- [ ] Memory leak tests passing
- [ ] Emergency procedures documented
- [ ] Rollback scripts available

---

## 🎯 Quick Reference Commands

### Daily Operations

```bash
# Check current memory usage
npm run memory:check

# Clean up and restart services
./scripts/cleanup-memory.sh --restart

# Monitor for 5 minutes
timeout 300 npm run memory:monitor
```

### Development Workflow

```bash
# Start with memory monitoring
npm run dev:with-monitoring

# Clean development caches
npm run clean:dev

# Optimize development environment
npm run optimize:dev
```

### Troubleshooting

```bash
# Emergency memory cleanup
./scripts/cleanup-memory.sh --emergency

# Debug memory issues
npm run debug:memory

# Generate memory report
npm run memory:report > logs/memory-$(date +%Y%m%d).json
```

---

## 📈 Continuous Improvement

### Weekly Reviews

1. **Memory Trend Analysis**: Review weekly memory usage patterns
2. **Performance Regression Check**: Identify any memory increases
3. **Optimization Opportunities**: Look for new optimization possibilities
4. **Alert Tuning**: Adjust thresholds based on actual usage

### Monthly Assessments

1. **Dependency Audit**: Check for new unused dependencies
2. **Bundle Size Review**: Analyze frontend bundle growth
3. **Code Pattern Review**: Identify memory-inefficient patterns
4. **Infrastructure Optimization**: Consider architectural improvements

### Quarterly Goals

1. **Target Reduction**: Aim for 5-10% further memory reduction
2. **New Features Impact**: Assess memory impact of new features
3. **Technology Updates**: Evaluate new memory-efficient technologies
4. **Best Practices Update**: Refine guidelines based on learnings

---

_Last Updated: 2025-08-15_  
_Next Review: Weekly_  
_Target: <2GB total system memory_
