// Register TypeScript paths
require('tsconfig-paths/register');

// Check Node.js version for Claude CLI compatibility
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 22) {
  console.warn('⚠️  Warning: Node.js v22+ may have issues with Claude CLI. Consider using Node.js v18.');
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 4000;

// Next.js will handle its own internal port
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // In development, Next.js HMR is already handled internally
  // We don't need a separate proxy for HTTP since Next.js is handling it
  
  const server = createServer(async (req, res) => {
    try {
      // Handle localhost redirect for development
      if (dev && req.headers.host && req.headers.host.startsWith('localhost:')) {
        res.writeHead(301, {
          Location: `http://127.0.0.1:${port}${req.url}`
        });
        res.end();
        return;
      }
      
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO after creating the server (disabled for now)
  // try {
  //   const { initSocketServer } = require('./dist/src/lib/socket-server');
  //   initSocketServer(server);
  //   console.log('✓ Socket.IO server initialized');
  // } catch (error) {
  //   console.error('Failed to initialize Socket.IO:', error.message);
  // }

  // Initialize WebSocket servers
  let terminalWS, claudeWS;
  
  try {
    // Use standalone WebSocket server on port 4001 for all terminals
    const { TerminalWebSocketServer, setupShutdownHandlers: setupTerminalShutdown } = require('./src/server/websocket/terminal-ws-standalone');
    const wsPort = process.env.WS_PORT || 4001;
    terminalWS = new TerminalWebSocketServer(wsPort);
    setupTerminalShutdown(terminalWS);
    console.log(`✓ Unified Terminal WebSocket server listening on port ${wsPort}`);
    
    // Initialize Claude WebSocket server for AI assistant (not terminal)
    const { ClaudeWebSocketServer } = require('./src/server/websocket/claude-ws');
    claudeWS = new ClaudeWebSocketServer(server);
    console.log('✓ Claude Assistant WebSocket server initialized');
    
    // Only handle custom WebSocket upgrades, not HMR
    // Next.js will handle HMR WebSocket internally
    
    // Graceful shutdown
    const shutdownHandler = () => {
      console.log('Shutdown signal received: closing servers');
      if (terminalWS) {
        console.log('Closing terminal WebSocket sessions...');
        terminalWS.closeAllSessions();
      }
      if (claudeWS) {
        console.log('Closing Claude WebSocket sessions...');
        claudeWS.closeAllSessions();
      }
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);  // Handle Ctrl+C
  } catch (error) {
    console.error('Failed to initialize WebSocket servers:', error.message);
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});