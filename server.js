// Register TypeScript paths
require('tsconfig-paths/register');

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 4000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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
  let terminalWS, claudeWS, claudeTerminalWS;
  
  try {
    // Use standalone WebSocket server on port 4001
    const { TerminalWebSocketServer } = require('./src/server/websocket/terminal-ws-standalone');
    const wsPort = process.env.WS_PORT || 4001;
    terminalWS = new TerminalWebSocketServer(wsPort);
    console.log(`✓ Terminal WebSocket server listening on port ${wsPort}`);
    
    // Initialize Claude Terminal WebSocket server on port 4002
    const ClaudeTerminalWebSocketServer = require('./src/server/websocket/claude-terminal-ws');
    const claudeTerminalPort = process.env.CLAUDE_WS_PORT || 4002;
    claudeTerminalWS = new ClaudeTerminalWebSocketServer(claudeTerminalPort);
    console.log(`✓ Claude Terminal WebSocket server listening on port ${claudeTerminalPort}`);
    
    // Initialize Claude WebSocket server
    const { ClaudeWebSocketServer } = require('./src/server/websocket/claude-ws');
    claudeWS = new ClaudeWebSocketServer(server);
    console.log('✓ Claude WebSocket server initialized');
    
    // No need for manual upgrade handling for terminal anymore
    // Only handle other WebSocket paths
    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        
        if (url.pathname === '/ws/claude') {
          console.log('Claude WebSocket upgrade handled by ClaudeWebSocketServer');
        } else if (url.pathname !== '/_next/webpack-hmr') {
          console.log(`Unknown WebSocket path: ${url.pathname}`);
        }
      } catch (error) {
        console.error('Error in upgrade handler:', error);
      }
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing servers');
      if (terminalWS) terminalWS.closeAllSessions();
      if (claudeTerminalWS) claudeTerminalWS.cleanup();
      if (claudeWS) claudeWS.closeAllSessions();
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to initialize WebSocket servers:', error.message);
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});