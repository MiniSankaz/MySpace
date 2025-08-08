const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class TerminalWebSocketServer {
  constructor(port = 4001) {
    this.port = port;
    this.sessions = new Map();
    
    // Create standalone WebSocket server
    this.wss = new WebSocketServer({ 
      port: this.port,
      perMessageDeflate: false,
      maxPayload: 100 * 1024 * 1024 // 100MB max payload
    });

    console.log(`Terminal WebSocket server listening on port ${this.port}`);

    this.wss.on('connection', this.handleConnection.bind(this));
    
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  cleanupInactiveSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions) {
      if (!session.ws || session.ws.readyState !== 1) { // Not OPEN
        console.log(`Cleaning up disconnected session: ${sessionId}`);
        if (session.process) {
          session.process.kill();
        }
        this.sessions.delete(sessionId);
      }
    }
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection on standalone server');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://localhost:${this.port}`);
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

      // Check if session exists and has matching working directory
      let session = this.sessions.get(sessionId);
      
      // Validate existing session
      if (session && session.workingDir !== workingDir) {
        console.log(`Session ${sessionId} exists but with different path. Creating new session.`);
        // Remove old session if path doesn't match
        if (session.process) {
          session.process.kill();
        }
        this.sessions.delete(sessionId);
        session = null;
      }
      
      if (!session) {
        // Create new shell session - detect platform
        let shell;
        let shellArgs = [];
        
        if (os.platform() === 'win32') {
          shell = 'powershell.exe';
        } else if (os.platform() === 'darwin') {
          // macOS uses zsh by default
          shell = '/bin/zsh';
        } else {
          // Linux
          shell = process.env.SHELL || '/bin/bash';
        }
        
        console.log(`Creating new shell session with: ${shell}`);
        
        // โหลด .env จาก project directory ถ้ามี
        let projectEnv = { ...process.env };
        const envFiles = [
          path.join(workingDir, '.env'),
          path.join(workingDir, '.env.local'),
          path.join(workingDir, '.env.development'),
          path.join(workingDir, '.env.production')
        ];
        
        for (const envFile of envFiles) {
          if (fs.existsSync(envFile)) {
            console.log(`Loading environment from: ${envFile}`);
            const envConfig = dotenv.parse(fs.readFileSync(envFile));
            projectEnv = { ...projectEnv, ...envConfig };
          }
        }
        
        // Use node-pty for proper PTY support with project-specific env
        const shellProcess = pty.spawn(shell, shellArgs, {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd: workingDir,
          env: {
            ...projectEnv,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            LANG: projectEnv.LANG || 'en_US.UTF-8',
            // เพิ่ม PATH ของ project's node_modules/.bin
            PATH: `${path.join(workingDir, 'node_modules', '.bin')}:${projectEnv.PATH}`
          },
        });
        
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

        // Handle PTY data with streaming
        shellProcess.onData((data) => {
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

        // Handle process exit
        shellProcess.onExit(({ exitCode, signal }) => {
          console.log(`Shell process exited with code ${exitCode}, signal ${signal}`);
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'exit',
              code: exitCode,
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

        // แสดงข้อความเมื่อโหลด environment แล้ว
        const loadedEnvs = envFiles.filter(f => fs.existsSync(f)).map(f => path.basename(f));
        if (loadedEnvs.length > 0) {
          const envMessage = `\r\n\x1b[32m✓ Loaded environment: ${loadedEnvs.join(', ')}\x1b[0m\r\n`;
          shellProcess.write(envMessage);
        }
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
              if (session.process) {
                // For PTY with xterm.js, write data exactly as received
                // xterm.js will send the correct characters including \r for Enter
                session.process.write(data.data);
              }
              break;
              
            case 'resize':
              // Handle terminal resize with node-pty
              if (session.process) {
                session.process.resize(data.cols, data.rows);
              }
              break;
              
            case 'ctrl':
              // Handle control characters
              if (session.process) {
                const ctrlChar = this.getControlCharacter(data.key);
                if (ctrlChar) {
                  session.process.write(ctrlChar);
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
        // Clean up session on close to ensure fresh start next time
        if (session && session.process) {
          console.log(`Cleaning up session ${session.id}`);
          session.process.kill();
          this.sessions.delete(session.id);
        }
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