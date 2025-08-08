const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class TerminalWebSocketServer {
  constructor(server) {
    this.connections = new Map();
    this.shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash');
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws/terminal',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection (fallback mode)');
    
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      let initialPath = url.searchParams.get('path') || process.cwd();

      // Validate and sanitize the path
      if (initialPath) {
        initialPath = path.resolve(initialPath);
        
        if (!fs.existsSync(initialPath)) {
          console.warn(`Path does not exist: ${initialPath}, using home directory`);
          initialPath = os.homedir();
        }
        
        const stats = fs.statSync(initialPath);
        if (!stats.isDirectory()) {
          console.warn(`Path is not a directory: ${initialPath}, using parent directory`);
          initialPath = path.dirname(initialPath);
        }
      } else {
        initialPath = os.homedir();
      }

      console.log(`Starting terminal in: ${initialPath}`);
      console.log(`Using shell: ${this.shell}`);

      // Use child_process.spawn with interactive shell
      const shellProcess = spawn(this.shell, ['-i'], {
        cwd: initialPath,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        },
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Store connection
      this.connections.set(sessionId, {
        ws,
        process: shellProcess,
        projectId,
      });

      // Send initial message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        pid: shellProcess.pid,
        path: initialPath,
        mode: 'fallback',
      }));

      // Send initial prompt
      shellProcess.stdin.write('echo "Terminal connected (fallback mode)"\n');

      // Handle process stdout
      shellProcess.stdout.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString('utf8'),
          }));
        }
      });

      // Handle process stderr
      shellProcess.stderr.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString('utf8'),
          }));
        }
      });

      // Handle process exit
      shellProcess.on('exit', (code) => {
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

      // Handle process error
      shellProcess.on('error', (error) => {
        console.error('Shell process error:', error);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message,
          }));
        }
      });

      // Handle WebSocket messages
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          
          switch (msg.type) {
            case 'input':
              shellProcess.stdin.write(msg.data);
              break;
              
            case 'resize':
              // Resize not supported in fallback mode
              console.log('Resize not supported in fallback mode');
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
        shellProcess.kill();
        this.connections.delete(sessionId);
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        shellProcess.kill();
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
      connection.process.kill();
      connection.ws.close();
    });
    this.connections.clear();
  }
}

module.exports = { TerminalWebSocketServer };