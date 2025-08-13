/**
 * Server V2 - รองรับ migration ไปใช้ terminal services ใหม่
 */

// Register TypeScript paths
require('tsconfig-paths/register');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 22) {
  console.warn('⚠️  Warning: Node.js v22+ may have issues. Consider using Node.js v18.');
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 4000;

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Helper function to compile TypeScript modules
async function requireTypeScript(modulePath) {
  try {
    // Try to load compiled JS first
    const jsPath = modulePath.replace('.ts', '.js');
    return require(jsPath);
  } catch (error) {
    // If JS doesn't exist, compile TypeScript
    console.log(`Compiling TypeScript module: ${modulePath}`);
    const { register } = require('ts-node');
    register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        skipLibCheck: true
      }
    });
    return require(modulePath);
  }
}

app.prepare().then(async () => {
  // Memory monitoring
  console.log('Starting memory monitoring...');
  
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    console.log(`Memory: ${memUsedMB}MB / ${memTotalMB}MB`);
    
    // Force GC if needed
    if (memUsage.heapUsed > 4 * 1024 * 1024 * 1024) {
      console.warn('🚨 High memory usage, forcing GC');
      if (global.gc) {
        global.gc();
      }
    }
  }, 30000);
  
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  
  // Initialize WebSocket servers
  let terminalWSLegacy, terminalWSV2, claudeWS;
  
  try {
    // Get migration mode
    const migrationMode = process.env.TERMINAL_MIGRATION_MODE || 'progressive';
    console.log(`🔄 Migration mode: ${migrationMode}`);
    
    // Legacy WebSocket server (port 4001)
    if (migrationMode === 'legacy' || migrationMode === 'dual' || migrationMode === 'progressive') {
      try {
        const { TerminalWebSocketServer } = require('./src/server/websocket/terminal-ws-standalone');
        const wsPort = process.env.WS_PORT || 4001;
        terminalWSLegacy = new TerminalWebSocketServer(wsPort);
        console.log(`✓ Legacy Terminal WebSocket on port ${wsPort}`);
      } catch (error) {
        console.error('Failed to start legacy WebSocket:', error);
      }
    }
    
    // New WebSocket server V2 (same server, different path)
    if (migrationMode === 'new' || migrationMode === 'dual' || migrationMode === 'progressive') {
      try {
        // Load TypeScript module
        const wsV2Module = await requireTypeScript('./src/server/websocket/terminal-ws-v2.ts');
        const { createTerminalWebSocketServerV2 } = wsV2Module;
        
        terminalWSV2 = createTerminalWebSocketServerV2(server, {
          path: '/ws/terminal-v2'
        });
        console.log(`✓ Terminal WebSocket V2 on path /ws/terminal-v2`);
      } catch (error) {
        console.error('Failed to start WebSocket V2:', error);
      }
    }
    
    // Claude WebSocket server (port 4002)
    try {
      const { ClaudeWebSocketServer } = require('./src/server/websocket/claude-ws');
      claudeWS = new ClaudeWebSocketServer(4002);
      console.log('✓ Claude WebSocket on port 4002');
    } catch (error) {
      console.error('Failed to start Claude WebSocket:', error);
    }
    
  } catch (error) {
    console.error('Failed to initialize WebSocket servers:', error);
  }
  
  // Start server
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    console.log(`> Migration: ${process.env.TERMINAL_MIGRATION_MODE || 'progressive'}`);
    
    // Log all WebSocket endpoints
    console.log('\n📡 WebSocket Endpoints:');
    if (terminalWSLegacy) console.log('  - ws://localhost:4001 (legacy)');
    if (terminalWSV2) console.log('  - ws://localhost:4000/ws/terminal-v2 (new)');
    if (claudeWS) console.log('  - ws://localhost:4002 (claude)');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    
    // Close WebSocket servers
    if (terminalWSLegacy) terminalWSLegacy.close();
    if (terminalWSV2) terminalWSV2.close();
    if (claudeWS) claudeWS.close();
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    
    // Close WebSocket servers
    if (terminalWSLegacy) terminalWSLegacy.close();
    if (terminalWSV2) terminalWSV2.close();
    if (claudeWS) claudeWS.close();
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});