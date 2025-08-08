const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class TerminalWebSocketServer {
  constructor() {
    this.sessions = new Map();
    
    // Create WebSocket server without HTTP server
    // We'll handle upgrade manually
    this.wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: false,
      maxPayload: 100 * 1024 * 1024 // 100MB max payload
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  // Handle HTTP upgrade request
  handleUpgrade(request, socket, head) {
    try {
      // Add error handling for socket
      socket.on('error', (err) => {
        console.error('Socket error during upgrade:', err);
      });
      
      // Parse URL to check path
      const url = new URL(request.url, `http://${request.headers.host}`);
      
      console.log('Upgrade request for path:', url.pathname);
      console.log('Request headers:', request.headers);
      
      if (url.pathname !== '/ws/terminal') {
        console.log('Not a terminal WebSocket path, destroying socket');
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      // Perform the WebSocket handshake
      console.log('Starting WebSocket handshake...');
      console.log('WebSocket server state:', this.wss ? 'initialized' : 'not initialized');
      
      try {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          console.log('WebSocket handshake completed successfully');
          this.wss.emit('connection', ws, request);
        });
      } catch (upgradeError) {
        console.error('Error during handleUpgrade:', upgradeError);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    } catch (error) {
      console.error('Error in handleUpgrade:', error);
      socket.destroy();
    }
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      let workingDir = url.searchParams.get('path');
      
      console.log('Connection params:', { projectId, sessionId, workingDir });
      
      // Decode path if provided
      if (workingDir) {
        try {
          workingDir = decodeURIComponent(workingDir);
        } catch (e) {
          console.error('Failed to decode path:', e);
          workingDir = process.cwd();
        }
      } else {
        workingDir = process.cwd();
      }

      // Validate path
      if (workingDir && fs.existsSync(workingDir)) {
        const stats = fs.statSync(workingDir);
        if (!stats.isDirectory()) {
          workingDir = path.dirname(workingDir);
        }
      } else {
        workingDir = os.homedir();
      }

      console.log(`Starting terminal session in: ${workingDir}`);

      // Check if session exists
      let session = this.sessions.get(sessionId);
      
      if (!session) {
        // Create new shell session
        const shell = process.env.SHELL || '/bin/bash';
        console.log(`Creating new shell session with: ${shell}`);
        
        const shellProcess = spawn(shell, ['-i'], {
          cwd: workingDir,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            PS1: '\\w $ ', // Simple prompt
          },
        });

        // Set encoding
        shellProcess.stdout.setEncoding('utf8');
        shellProcess.stderr.setEncoding('utf8');
        
        session = {
          id: sessionId,
          process: shellProcess,
          workingDir: workingDir,
          ws: ws,
          outputBuffer: '',
          commandQueue: [],
          isProcessing: false,
          environment: {},
        };
        
        this.sessions.set(sessionId, session);

        // Handle stdout with streaming
        shellProcess.stdout.on('data', (data) => {
          // Stream output immediately
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
            }));
          }
          
          // Also buffer for history
          session.outputBuffer += data;
          
          // Limit buffer size (keep last 10KB)
          if (session.outputBuffer.length > 10240) {
            session.outputBuffer = session.outputBuffer.slice(-10240);
          }
        });

        // Handle stderr with streaming
        shellProcess.stderr.on('data', (data) => {
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
              stderr: true,
            }));
          }
        });

        // Handle process exit
        shellProcess.on('exit', (code) => {
          console.log(`Shell process exited with code ${code}`);
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'exit',
              code: code,
            }));
            session.ws.close();
          }
          this.sessions.delete(sessionId);
        });

        // Send initial connection success
        ws.send(JSON.stringify({
          type: 'connected',
          sessionId: sessionId,
          workingDir: workingDir,
        }));

        // Send initial prompt
        shellProcess.stdin.write('echo "Terminal ready"\n');
      } else {
        // Reconnect to existing session
        console.log(`Reconnecting to session: ${sessionId}`);
        session.ws = ws;
        
        // Send reconnection success with history
        ws.send(JSON.stringify({
          type: 'reconnected',
          sessionId: sessionId,
          workingDir: session.workingDir,
        }));
        
        // Send buffered output as history
        if (session.outputBuffer) {
          ws.send(JSON.stringify({
            type: 'history',
            data: session.outputBuffer,
          }));
        }
      }

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'input':
              if (session.process && !session.process.killed) {
                // Add newline if not present
                const input = data.data.endsWith('\n') ? data.data : data.data + '\n';
                session.process.stdin.write(input);
              }
              break;
              
            case 'resize':
              // Handle terminal resize if needed
              if (session.process && !session.process.killed) {
                // Resize terminal (requires node-pty for full support)
                process.stdout.columns = data.cols;
                process.stdout.rows = data.rows;
              }
              break;
              
            case 'ctrl':
              // Handle control characters
              if (session.process && !session.process.killed) {
                const ctrlChar = this.getControlCharacter(data.key);
                if (ctrlChar) {
                  session.process.stdin.write(ctrlChar);
                }
              }
              break;
              
            case 'env':
              // Set environment variable
              if (data.key && data.value !== undefined) {
                session.environment[data.key] = data.value;
                if (session.process && !session.process.killed) {
                  session.process.stdin.write(`export ${data.key}="${data.value}"\n`);
                }
              }
              break;
              
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
              
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message,
          }));
        }
      });

      // Handle WebSocket close
      ws.on('close', (code, reason) => {
        console.log('Terminal WebSocket closed:', code, reason?.toString());
        // Keep session alive for reconnection
        // Session will be cleaned up when process exits
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: `WebSocket error: ${error.message}`,
        }));
      });

    } catch (error) {
      console.error('Connection handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to initialize terminal: ${error.message}`,
      }));
      ws.close();
    }
  }

  getControlCharacter(key) {
    const controlChars = {
      'c': '\x03',     // Ctrl+C (SIGINT)
      'd': '\x04',     // Ctrl+D (EOF)
      'z': '\x1a',     // Ctrl+Z (SIGTSTP)
      'l': '\x0c',     // Ctrl+L (Clear)
      '\\': '\x1c',    // Ctrl+\ (SIGQUIT)
      'a': '\x01',     // Ctrl+A (Beginning of line)
      'e': '\x05',     // Ctrl+E (End of line)
      'k': '\x0b',     // Ctrl+K (Kill line)
      'u': '\x15',     // Ctrl+U (Kill backwards)
      'w': '\x17',     // Ctrl+W (Delete word)
    };
    return controlChars[key.toLowerCase()];
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.process && !session.process.killed) {
        session.process.kill();
      }
      if (session.ws) {
        session.ws.close();
      }
      this.sessions.delete(sessionId);
    }
  }

  closeAllSessions() {
    console.log('Closing all terminal sessions...');
    this.sessions.forEach((session, sessionId) => {
      this.closeSession(sessionId);
    });
    this.sessions.clear();
  }
}

module.exports = { TerminalWebSocketServer };