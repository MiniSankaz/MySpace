const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Logging will be added later when the service is compiled
// const { workspaceTerminalLogger } = require('../../services/workspace-terminal-logging.service');

class ClaudeTerminalWebSocketServer {
  constructor(port = 4002) {
    this.port = port;
    this.sessions = new Map();
    
    // Create standalone WebSocket server for Claude terminals
    this.wss = new WebSocketServer({ 
      port: this.port,
      perMessageDeflate: false,
      maxPayload: 100 * 1024 * 1024 // 100MB max payload
    });

    console.log(`Claude Terminal WebSocket server listening on port ${this.port}`);

    this.wss.on('connection', this.handleConnection.bind(this));
    
    this.wss.on('error', (error) => {
      console.error('Claude WebSocket server error:', error);
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
        console.log(`Cleaning up disconnected Claude session: ${sessionId}`);
        if (session.process) {
          session.process.kill();
        }
        this.sessions.delete(sessionId);
      }
    }
  }

  async handleConnection(ws, request) {
    console.log('New Claude terminal WebSocket connection');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://localhost:${this.port}`);
      const projectId = url.searchParams.get('projectId') || 'default';
      const userId = url.searchParams.get('userId') || 'anonymous';
      const sessionId = url.searchParams.get('sessionId') || `claude_session_${Date.now()}`;
      let workingDir = url.searchParams.get('path');
      
      console.log('Connection params:', { projectId, userId, sessionId, workingDir });
      
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

      console.log(`Starting Claude terminal session in: ${workingDir}`);

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
        
        console.log(`Creating new Claude shell session with: ${shell}`);
        
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
          isClaudeReady: false,
          projectId: projectId,
          userId: userId,
          loggingSessionId: null
        };
        
        this.sessions.set(sessionId, session);
        
        // Create logging session - disabled for now
        // try {
        //   const loggingSession = await workspaceTerminalLogger.createSession({
        //     projectId,
        //     userId,
        //     type: shell.includes('zsh') ? 'zsh' : shell.includes('bash') ? 'bash' : 'sh',
        //     tabName: `Claude Terminal - ${sessionId}`,
        //     currentPath: workingDir,
        //     environment: projectEnv,
        //     pid: shellProcess.pid,
        //     metadata: {
        //       claudeSession: sessionId,
        //       shell: shell
        //     }
        //   });
        //   session.loggingSessionId = loggingSession.id;
        //   console.log(`Created logging session: ${loggingSession.id} for Claude terminal`);
        // } catch (error) {
        //   console.error('Failed to create logging session:', error);
        // }

        // Handle PTY data with streaming
        shellProcess.onData(async (data) => {
          // Stream output immediately
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
            }));
          }
          
          // Log output to database - disabled for now
          // if (session.loggingSessionId) {
          //   try {
          //     await workspaceTerminalLogger.streamOutput(
          //       session.loggingSessionId,
          //       session.projectId,
          //       session.userId,
          //       data,
          //       'stdout'
          //     );
          //   } catch (error) {
          //     console.error('Failed to log terminal output:', error);
          //   }
          // }
          
          // Check if Claude is ready
          if (!session.isClaudeReady && data.includes('Claude>')) {
            session.isClaudeReady = true;
            console.log('Claude CLI is ready');
          }
          
          // Also buffer for history
          session.outputBuffer += data;
          
          // Limit buffer size (keep last 10KB)
          if (session.outputBuffer.length > 10240) {
            session.outputBuffer = session.outputBuffer.slice(-10240);
          }
        });

        // Handle process exit
        shellProcess.onExit(async ({ exitCode, signal }) => {
          console.log(`Claude shell process exited with code ${exitCode}, signal ${signal}`);
          
          // End logging session - disabled for now
          // if (session.loggingSessionId) {
          //   try {
          //     await workspaceTerminalLogger.endSession(session.loggingSessionId);
          //     console.log(`Ended logging session: ${session.loggingSessionId}`);
          //   } catch (error) {
          //     console.error('Failed to end logging session:', error);
          //   }
          // }
          
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

        // รัน claude command อัตโนมัติ
        setTimeout(() => {
          console.log('Starting Claude CLI...');
          shellProcess.write('\r\n\x1b[35m🤖 Starting Claude Code CLI...\x1b[0m\r\n');
          shellProcess.write('claude\r');
        }, 500); // รอให้ terminal พร้อมก่อนรัน claude

      } else {
        // Reconnect to existing session
        console.log(`Reconnecting to Claude session: ${sessionId}`);
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
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'input':
              if (session.process) {
                // Log input command - disabled for now
                // if (session.loggingSessionId && data.data) {
                //   try {
                //     await workspaceTerminalLogger.logEntry({
                //       sessionId: session.loggingSessionId,
                //       projectId: session.projectId,
                //       userId: session.userId,
                //       type: 'stdin',
                //       content: data.data
                //     });
                //   } catch (error) {
                //     console.error('Failed to log terminal input:', error);
                //   }
                // }
                
                // For PTY with xterm.js, write data exactly as received
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
              }
              break;
              
            case 'ping':
              // Keep-alive ping
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
        console.log('Claude Terminal WebSocket closed:', code, reason?.toString());
        // Clean up session on close to ensure fresh start next time
        if (session && session.process) {
          console.log(`Cleaning up Claude session ${session.id}`);
          session.process.kill();
          this.sessions.delete(session.id);
        }
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('Claude WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: `WebSocket error: ${error.message}`,
        }));
      });

    } catch (error) {
      console.error('Connection handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to initialize Claude terminal: ${error.message}`,
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

  cleanup() {
    for (const [sessionId, session] of this.sessions) {
      if (session.process) {
        session.process.kill();
      }
    }
    this.sessions.clear();
  }
}

module.exports = ClaudeTerminalWebSocketServer;