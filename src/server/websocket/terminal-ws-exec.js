const { WebSocketServer } = require('ws');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class TerminalWebSocketServer {
  constructor(server) {
    this.connections = new Map();
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws/terminal',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection (exec mode)');
    
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      let workingDir = url.searchParams.get('path') || process.cwd();

      // Validate path
      if (workingDir && fs.existsSync(workingDir)) {
        const stats = fs.statSync(workingDir);
        if (!stats.isDirectory()) {
          workingDir = path.dirname(workingDir);
        }
      } else {
        workingDir = os.homedir();
      }

      console.log(`Working directory: ${workingDir}`);

      // Store connection
      const connection = {
        ws,
        projectId,
        workingDir,
        commandHistory: [],
      };
      
      this.connections.set(sessionId, connection);

      // Send initial message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        path: workingDir,
        mode: 'exec',
      }));

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'output',
        data: `Terminal connected (exec mode)\nWorking directory: ${workingDir}\n$ `,
      }));

      // Handle WebSocket messages
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          
          switch (msg.type) {
            case 'input':
              this.executeCommand(sessionId, msg.data.trim());
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
        this.connections.delete(sessionId);
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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

  executeCommand(sessionId, command) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const { ws, workingDir } = connection;
    
    // Add command to history
    connection.commandHistory.push(command);
    
    // Handle special commands
    if (command === 'clear') {
      ws.send(JSON.stringify({
        type: 'clear',
      }));
      ws.send(JSON.stringify({
        type: 'output',
        data: '$ ',
      }));
      return;
    }
    
    if (command.startsWith('cd ')) {
      const newPath = command.substring(3).trim();
      let targetPath = path.isAbsolute(newPath) 
        ? newPath 
        : path.join(workingDir, newPath);
      
      if (newPath === '~') {
        targetPath = os.homedir();
      }
      
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        connection.workingDir = targetPath;
        ws.send(JSON.stringify({
          type: 'output',
          data: `Changed directory to: ${targetPath}\n$ `,
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'output',
          data: `cd: no such file or directory: ${newPath}\n$ `,
        }));
      }
      return;
    }
    
    if (command === 'pwd') {
      ws.send(JSON.stringify({
        type: 'output',
        data: `${connection.workingDir}\n$ `,
      }));
      return;
    }

    // Execute command
    console.log(`Executing: ${command} in ${connection.workingDir}`);
    
    exec(command, {
      cwd: connection.workingDir,
      env: process.env,
      maxBuffer: 1024 * 1024, // 1MB buffer
    }, (error, stdout, stderr) => {
      let output = '';
      
      if (stdout) output += stdout;
      if (stderr) output += stderr;
      if (error && !output) {
        output += `Error: ${error.message}`;
      }
      
      // Send output with prompt
      ws.send(JSON.stringify({
        type: 'output',
        data: output + '\n$ ',
      }));
    });
  }

  closeAllConnections() {
    this.connections.forEach((connection, sessionId) => {
      connection.ws.close();
    });
    this.connections.clear();
  }
}

module.exports = { TerminalWebSocketServer };