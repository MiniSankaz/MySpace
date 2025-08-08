const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class TerminalWebSocketServer {
  constructor(server) {
    this.sessions = new Map();
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws/terminal',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection (streaming mode)');
    
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      let workingDir = url.searchParams.get('path');
      
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

      console.log(`Starting session in: ${workingDir}`);

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

        // Handle process error
        shellProcess.on('error', (error) => {
          console.error('Shell process error:', error);
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'error',
              message: error.message,
            }));
          }
        });

        // Send initial ready message
        ws.send(JSON.stringify({
          type: 'connected',
          sessionId: sessionId,
          pid: shellProcess.pid,
          path: workingDir,
          mode: 'streaming',
        }));

        // Wait a bit for shell to initialize
        setTimeout(() => {
          // Send a newline to trigger prompt
          shellProcess.stdin.write('\n');
        }, 100);
        
      } else {
        // Reconnect to existing session
        session.ws = ws;
        console.log(`Reconnected to existing session: ${sessionId}`);
        
        ws.send(JSON.stringify({
          type: 'reconnected',
          sessionId: sessionId,
          pid: session.process.pid,
          path: session.workingDir,
        }));
        
        // Send buffered output
        if (session.outputBuffer) {
          ws.send(JSON.stringify({
            type: 'history',
            data: session.outputBuffer,
          }));
        }
      }

      // Update session with new WebSocket
      session.ws = ws;

      // Handle WebSocket messages
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          
          switch (msg.type) {
            case 'input':
              this.handleInput(session, msg.data);
              break;
              
            case 'ctrl':
              // Handle control characters
              if (msg.key === 'c') {
                session.process.stdin.write('\x03'); // Ctrl+C
              } else if (msg.key === 'z') {
                session.process.stdin.write('\x1a'); // Ctrl+Z
              } else if (msg.key === 'd') {
                session.process.stdin.write('\x04'); // Ctrl+D
              } else if (msg.key === 'l') {
                // Clear screen
                session.process.stdin.write('\x0c');
                session.outputBuffer = ''; // Clear buffer too
              }
              break;
              
            case 'resize':
              // Handle terminal resize if needed
              if (session.process.stdout.columns !== undefined) {
                session.process.stdout.columns = msg.cols;
                session.process.stdout.rows = msg.rows;
              }
              break;
              
            case 'env':
              // Update environment variable
              if (msg.key && msg.value !== undefined) {
                session.environment[msg.key] = msg.value;
                // Export to shell
                session.process.stdin.write(`export ${msg.key}="${msg.value}"\n`);
              }
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
        // Don't kill the process, keep it alive for reconnection
        if (session) {
          session.ws = null;
        }
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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

  handleInput(session, data) {
    if (!session || !session.process) return;
    
    // Special handling for certain commands
    if (data.trim().startsWith('cd ')) {
      // Track directory changes
      const dir = data.trim().substring(3);
      session.process.stdin.write(data + '\n');
      
      // Update working directory after cd command
      setTimeout(() => {
        session.process.stdin.write('pwd\n');
      }, 100);
    } else {
      // Normal command - just write to stdin
      session.process.stdin.write(data + '\n');
    }
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.process) {
        session.process.kill();
      }
      if (session.ws) {
        session.ws.close();
      }
      this.sessions.delete(sessionId);
    }
  }

  closeAllSessions() {
    this.sessions.forEach((session, sessionId) => {
      this.closeSession(sessionId);
    });
  }
}

module.exports = { TerminalWebSocketServer };