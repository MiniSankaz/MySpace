# Terminal Memory Service Rebuild Guide

## Overview
The terminal-memory service needs to be compiled from TypeScript to JavaScript for the WebSocket servers to use it. This guide explains the automatic and manual rebuild processes.

## Automatic Rebuild

### 1. Using start.sh (Recommended)
The `start.sh` script now automatically rebuilds the terminal-memory service every time it runs:

```bash
./start.sh
```

This will:
- Create `dist/services/` directory if it doesn't exist
- Compile `src/services/terminal-memory.service.ts` to JavaScript
- Use pre-compiled fallback if TypeScript compilation fails
- Start the server with the compiled service

### 2. Using quick-restart.sh
The quick restart script also rebuilds the service:

```bash
./quick-restart.sh
```

This will:
- Check if the source file is newer than compiled version
- Rebuild if necessary
- Use pre-compiled version as fallback
- Restart the server quickly

## Manual Rebuild

If you need to manually rebuild the terminal-memory service:

### Option 1: TypeScript Compiler
```bash
# Create dist directory
mkdir -p dist/services

# Compile with TypeScript
npx tsc src/services/terminal-memory.service.ts \
  --outDir dist \
  --module commonjs \
  --target es2018 \
  --esModuleInterop \
  --skipLibCheck \
  --allowJs \
  --resolveJsonModule \
  --downlevelIteration \
  --moduleResolution node
```

### Option 2: Use Pre-compiled Version
```bash
# Copy the pre-compiled version
cp src/services/terminal-memory.service.js.compiled \
   dist/services/terminal-memory.service.js
```

## File Locations

- **Source**: `src/services/terminal-memory.service.ts`
- **Pre-compiled**: `src/services/terminal-memory.service.js.compiled`
- **Compiled Output**: `dist/services/terminal-memory.service.js`
- **Used By**: 
  - `src/server/websocket/terminal-ws-standalone.js`
  - `src/server/websocket/claude-terminal-ws.js`

## Troubleshooting

### Service Not Loading
If you see this error in server.log:
```
In-memory terminal service not available (optional): Cannot find module '../../../dist/services/terminal-memory.service'
```

Solution:
1. Run `./start.sh` to trigger automatic rebuild
2. Or manually rebuild using the steps above

### TypeScript Compilation Errors
If TypeScript compilation fails, the scripts will automatically use the pre-compiled fallback version.

### Multi-focus Methods Missing
If you see errors like:
```
TypeError: this.memoryService.getFocusedSessions is not a function
```

This means the compiled JavaScript is outdated. Run:
```bash
./quick-restart.sh
```

## Key Features
The terminal-memory service provides:
- Multi-focus support (up to 4 concurrent terminals)
- Session management without database persistence
- WebSocket connection tracking
- Automatic session cleanup
- Event-driven architecture

## Notes
- The service is optional but recommended for proper terminal functionality
- Compilation happens automatically with start.sh and quick-restart.sh
- Pre-compiled version is maintained as fallback
- No database dependency - everything runs in memory