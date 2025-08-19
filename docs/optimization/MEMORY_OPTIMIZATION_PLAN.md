# Memory Optimization Plan

## Stock Portfolio System v3.0 - Critical Memory Usage Reduction

**Target**: Reduce memory usage from 3.8GB+ to under 2GB (50%+ reduction)  
**Current Status**: ~730MB total from running services + 3GB+ from main frontend  
**Priority**: Critical - Production stability  
**Timeline**: Immediate (1-2 weeks implementation)

---

## 🚨 Executive Summary

### Current Memory Analysis

Based on system analysis, we have identified critical memory inefficiencies:

**Current Memory Footprint**:

- **Frontend Application**: ~3.2GB (max-old-space-size=8192MB)
- **Gateway Service**: ~115MB (includes nodemon + tsx overhead)
- **Terminal Service**: ~120MB (includes esbuild processes)
- **Portfolio Service**: ~140MB (includes multiple node processes)
- **Total System Memory**: ~3.8GB+ in development mode

**Critical Issues Identified**:

1. **Oversized Node.js Heap**: 8GB allocation for frontend (excessive)
2. **Multiple Process Redundancy**: Each service runs 3+ Node.js processes
3. **Development Tool Overhead**: tsx, nodemon, esbuild processes
4. **Memory Leaks**: Long-running services without garbage collection
5. **Inefficient Bundle Loading**: Large dependency bundles in memory

---

## 📊 Memory Analysis Breakdown

### Service-by-Service Memory Usage

| Service       | Main Process | Supporting Processes | Total Memory | Optimization Potential    |
| ------------- | ------------ | -------------------- | ------------ | ------------------------- |
| **Frontend**  | 3.2GB        | N/A                  | 3.2GB        | 60-70% (Target: 1GB)      |
| **Terminal**  | 120MB        | esbuild (30MB)       | 150MB        | 40% (Target: 90MB)        |
| **Gateway**   | 115MB        | nodemon (35MB)       | 150MB        | 35% (Target: 100MB)       |
| **Portfolio** | 140MB        | nodemon (53MB)       | 193MB        | 30% (Target: 135MB)       |
| **Total**     | 3.575GB      | 118MB                | 3.693GB      | **47% (Target: 1.925GB)** |

### Memory Leak Sources Identified

1. **Frontend Application**:
   - WebSocket connections accumulating
   - Monaco Editor instances not disposed
   - React component memory leaks
   - Large bundle chunks staying in memory

2. **Microservices**:
   - Database connection pools not optimized
   - Event listeners not cleaned up
   - File system watchers accumulating
   - HTTP request objects retained

3. **Development Tools**:
   - tsx compilation caching
   - nodemon file watching
   - esbuild worker processes
   - TypeScript type checking memory

---

## 🎯 Optimization Strategy

### Phase 1: Immediate Wins (Week 1)

#### 1.1 Node.js Heap Size Optimization

**Target Reduction**: 2GB+ (60% frontend reduction)

**Current Issue**:

```json
// package.json - EXCESSIVE ALLOCATION
"dev": "node --max-old-space-size=8192 --expose-gc server.js"
```

**Optimized Configuration**:

```json
// Reduce to appropriate size based on actual usage
"dev": "node --max-old-space-size=2048 --expose-gc --optimize-for-size server.js",
"dev:minimal": "node --max-old-space-size=1024 --expose-gc --optimize-for-size server.js"
```

**Memory Savings**: ~3GB reduction

#### 1.2 Process Consolidation

**Target Reduction**: 100MB+ (Remove redundant processes)

**Current Issues**:

- Multiple node processes per service (nodemon + tsx + main)
- Duplicate esbuild processes for terminal
- Unnecessary development watchers

**Optimization Actions**:

```bash
# Replace multiple processes with single optimized process
# Use production-like setup in development
# Consolidate build tools
```

#### 1.3 Development Tool Optimization

**Target Reduction**: 80MB+ (Development overhead)

**Actions**:

- Configure tsx with minimal memory footprint
- Optimize nodemon watching patterns
- Use esbuild with memory limits
- Implement smart file watching

### Phase 2: Service-Level Optimizations (Week 1-2)

#### 2.1 Database Connection Optimization

**Target Reduction**: 50MB+ per service

**Current Issues**:

- Prisma connection pools not optimized
- Connection timeouts too long
- No connection limits per service

**Optimized Configuration**:

```javascript
// Prisma optimization
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

// Connection pool settings
process.env.DATABASE_CONNECTION_LIMIT = "5"; // Per service
process.env.DATABASE_POOL_TIMEOUT = "10000"; // 10 seconds
```

#### 2.2 WebSocket Connection Management

**Target Reduction**: 30MB+ (Connection cleanup)

**Implementation**:

- Implement connection limits
- Add automatic cleanup for idle connections
- Optimize message buffering
- Use connection pooling for WS

#### 2.3 File System Optimization

**Target Reduction**: 20MB+ (Reduce file watching)

**Actions**:

- Optimize nodemon ignore patterns
- Use smart file watching algorithms
- Implement caching strategies for file operations
- Reduce TypeScript compilation memory

### Phase 3: Frontend Bundle Optimization (Week 2)

#### 3.1 Code Splitting and Lazy Loading

**Target Reduction**: 500MB+ (Bundle optimization)

**Implementation**:

```javascript
// Implement route-based code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Terminal = lazy(() => import("./pages/Terminal"));

// Component-level lazy loading
const MonacoEditor = lazy(() => import("@monaco-editor/react"));
```

#### 3.2 Dependency Optimization

**Target Reduction**: 200MB+ (Remove unused dependencies)

**From Code Review Report - Remove**:

```bash
npm uninstall clamscan archiver nodemailer formidable json2csv node-fetch
npm uninstall xterm xterm-addon-fit xterm-addon-web-links  # Use @xterm/* only
```

**Bundle Size Reduction**: 8-12MB from unused packages

#### 3.3 Memory-Efficient Component Patterns

**Target Reduction**: 300MB+ (Component optimization)

**Implementation**:

- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize state management (reduce Zustand store size)
- Implement component cleanup patterns

---

## 🔧 Implementation Scripts

### Memory Monitor Script

**Location**: `/scripts/monitor-memory.js`

```javascript
const os = require("os");
const fs = require("fs");

class MemoryMonitor {
  constructor() {
    this.services = ["frontend", "gateway", "terminal", "portfolio"];
    this.alertThreshold = 2048; // 2GB
  }

  async getProcessMemory(serviceName) {
    const processes = await this.getServiceProcesses(serviceName);
    return processes.reduce((total, proc) => total + proc.memory, 0);
  }

  async monitorAllServices() {
    const results = {};
    let totalMemory = 0;

    for (const service of this.services) {
      const memory = await this.getProcessMemory(service);
      results[service] = memory;
      totalMemory += memory;
    }

    results.total = totalMemory;
    results.timestamp = new Date().toISOString();

    if (totalMemory > this.alertThreshold) {
      this.sendAlert(results);
    }

    return results;
  }

  sendAlert(results) {
    console.error(
      `🚨 MEMORY ALERT: Total usage ${results.total}MB exceeds ${this.alertThreshold}MB`,
    );
    console.error("Service breakdown:", results);
  }

  startMonitoring(intervalMs = 30000) {
    setInterval(async () => {
      const results = await this.monitorAllServices();
      console.log(`Memory Usage: ${results.total}MB`);
    }, intervalMs);
  }
}

// Usage
const monitor = new MemoryMonitor();
monitor.startMonitoring();
```

### Cleanup Script

**Location**: `/scripts/cleanup-memory.sh`

```bash
#!/bin/bash
# Memory Optimization Cleanup Script

echo "🧹 Starting memory cleanup..."

# 1. Clear Node.js caches
echo "Clearing Node.js caches..."
npm cache clean --force

# 2. Clear TypeScript caches
echo "Clearing TypeScript compilation caches..."
find . -name "*.tsbuildinfo" -delete
rm -rf .next/.tsbuildinfo

# 3. Clear development caches
echo "Clearing development caches..."
rm -rf .next/cache
rm -rf node_modules/.cache

# 4. Trigger garbage collection for running processes
echo "Triggering garbage collection..."
curl -X POST http://localhost:4110/api/system/gc
curl -X POST http://localhost:4140/api/system/gc
curl -X POST http://localhost:4160/api/system/gc

# 5. Restart services with optimized settings
echo "Restarting services with optimized memory settings..."
npm run stop-all-services
sleep 2
npm run start-all-services-optimized

echo "✅ Memory cleanup complete!"
```

### Production-Like Development Configuration

**Location**: `/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: "frontend",
      script: "server.js",
      node_args: "--max-old-space-size=1024 --expose-gc --optimize-for-size",
      env: {
        NODE_ENV: "development",
        PORT: 4100,
      },
      max_memory_restart: "1G",
      instances: 1,
    },
    {
      name: "gateway",
      script: "services/gateway/dist/index.js",
      node_args: "--max-old-space-size=256 --expose-gc",
      env: {
        NODE_ENV: "development",
        PORT: 4110,
      },
      max_memory_restart: "300M",
      instances: 1,
    },
    {
      name: "terminal",
      script: "services/terminal/dist/index.js",
      node_args: "--max-old-space-size=256 --expose-gc",
      env: {
        NODE_ENV: "development",
        PORT: 4140,
      },
      max_memory_restart: "300M",
      instances: 1,
    },
    {
      name: "portfolio",
      script: "services/portfolio/dist/index.js",
      node_args: "--max-old-space-size=256 --expose-gc",
      env: {
        NODE_ENV: "development",
        PORT: 4160,
      },
      max_memory_restart: "300M",
      instances: 1,
    },
  ],
};
```

---

## 📈 Testing & Validation Plan

### Memory Baseline Measurement

```bash
# Before optimization
npm run memory:baseline

# After each optimization phase
npm run memory:measure

# Continuous monitoring
npm run memory:monitor
```

### Load Testing with Memory Monitoring

```bash
# Simulate production load while monitoring memory
npm run test:load:memory

# Long-running stability test
npm run test:stability:24h
```

### Performance Metrics Tracking

- Memory usage per service
- Garbage collection frequency
- Response time correlation with memory usage
- Memory leak detection over time

---

## 🎯 Success Metrics

### Primary Targets

- **Total System Memory**: < 2GB (Currently ~3.8GB)
- **Frontend Memory**: < 1GB (Currently ~3.2GB)
- **Service Memory**: < 100MB each (Currently 100-150MB)
- **Memory Stability**: No increase > 10% over 24 hours

### Performance Indicators

- **Bundle Size Reduction**: 15-20% smaller
- **Startup Time**: 20-30% faster
- **Response Time**: Maintained or improved
- **Stability**: No memory-related crashes

### Development Experience

- **Build Time**: Reduced by 15-25%
- **Hot Reload**: Faster and more stable
- **IDE Performance**: Improved responsiveness
- **Resource Usage**: Lower CPU and disk I/O

---

## 🚀 Implementation Timeline

### Week 1: Critical Optimizations

- **Day 1-2**: Node.js heap size reduction and process consolidation
- **Day 3-4**: Database connection and WebSocket optimization
- **Day 5-7**: Development tool optimization and testing

### Week 2: Bundle and Frontend Optimization

- **Day 8-10**: Code splitting and lazy loading implementation
- **Day 11-12**: Dependency cleanup and bundle optimization
- **Day 13-14**: Component memory optimization and validation

### Ongoing: Monitoring and Maintenance

- **Daily**: Memory usage monitoring
- **Weekly**: Performance regression testing
- **Monthly**: Memory leak analysis and optimization review

---

## 🔍 Risk Assessment

### Low Risk

- Node.js heap size reduction (easily reversible)
- Development tool optimization
- Dependency cleanup

### Medium Risk

- Database connection optimization (requires testing)
- WebSocket connection management (affects real-time features)

### High Risk

- Frontend bundle splitting (could break functionality)
- Service process consolidation (affects development workflow)

### Mitigation Strategies

- Comprehensive testing at each phase
- Rollback scripts for each optimization
- Feature flags for experimental optimizations
- Continuous monitoring during implementation

---

## 📋 Next Steps

### Immediate Actions (Today)

1. **Baseline Memory Measurement**: Document current usage
2. **Create Memory Monitor**: Implement monitoring script
3. **Test Environment Setup**: Prepare for optimization testing

### This Week

1. **Implement Phase 1 Optimizations**: Heap size and process optimization
2. **Database Optimization**: Connection pool tuning
3. **Development Tool Optimization**: Reduce overhead

### Next Week

1. **Frontend Bundle Optimization**: Code splitting and lazy loading
2. **Component Memory Optimization**: Implement efficient patterns
3. **Production Readiness**: Prepare optimized configurations

---

_Generated: 2025-08-15_  
_Target: 50%+ memory reduction_  
_Status: Ready for implementation_
