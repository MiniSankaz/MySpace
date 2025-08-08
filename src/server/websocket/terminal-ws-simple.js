const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');

class TerminalWebSocketServer {
  constructor(server) {
    this.connections = new Map();
    this.shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws/terminal',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection');
    
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      let initialPath = url.searchParams.get('path') || process.cwd();

      // Validate and sanitize the path
      if (initialPath) {
        // Resolve to absolute path
        initialPath = path.resolve(initialPath);
        
        // Check if path exists, if not use home directory
        if (!fs.existsSync(initialPath)) {
          console.warn(`Path does not exist: ${initialPath}, using home directory`);
          initialPath = os.homedir();
        }
        
        // Check if it's a directory
        const stats = fs.statSync(initialPath);
        if (!stats.isDirectory()) {
          console.warn(`Path is not a directory: ${initialPath}, using parent directory`);
          initialPath = path.dirname(initialPath);
        }
      } else {
        initialPath = os.homedir();
      }

      console.log(`Starting terminal in: ${initialPath}`);

      // Create PTY instance with safer options for macOS
      const shell = process.env.SHELL || this.shell;
      const env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      };
      
      // Remove problematic env vars that can cause spawn issues
      delete env.ELECTRON_RUN_AS_NODE;
      
      console.log(`Using shell: ${shell}`);
      
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: initialPath,
        env: env,
        encoding: 'utf8'
      });

      // Store connection
      this.connections.set(sessionId, {
        ws,
        pty: ptyProcess,
        projectId,
      });

      // Send initial message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        pid: ptyProcess.pid,
        path: initialPath,
      }));

    // Handle PTY data
    ptyProcess.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          data,
        }));
      }
    });

    // Handle PTY exit
    ptyProcess.on('exit', (code) => {
      console.log(`Terminal process exited with code ${code}`);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          code,
        }));
        ws.close();
      }
      this.connections.delete(sessionId);
    });

    // Handle WebSocket messages
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        
        switch (msg.type) {
          case 'input':
            ptyProcess.write(msg.data);
            break;
            
          case 'resize':
            ptyProcess.resize(msg.cols, msg.rows);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.warn('Unknown message type:', msg.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle WebSocket close
    ws.on('close', () => {
      console.log('Terminal WebSocket closed');
      ptyProcess.kill();
      this.connections.delete(sessionId);
    });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        ptyProcess.kill();
        this.connections.delete(sessionId);
      });
      
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Failed to create terminal',
      }));
      ws.close();
    }
  }

  closeAllConnections() {
    this.connections.forEach((connection, sessionId) => {
      connection.pty.kill();
      connection.ws.close();
    });
    this.connections.clear();
  }
}

module.exports = { TerminalWebSocketServer };