const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Import logging service - handle both ES6 and CommonJS
let workspaceTerminalLogger;
try {
  // Try to use the workspace terminal logging service
  const loggingModule = require('../../../dist/services/workspace-terminal-logging.service');
  workspaceTerminalLogger = loggingModule.workspaceTerminalLogger || loggingModule.default;
  console.log('Claude Terminal: Workspace logging service loaded successfully');
} catch (error) {
  // Logging is optional - continue without it if not available
  console.warn('Claude Terminal: Workspace logging service not available (optional):', error.message);
  workspaceTerminalLogger = null;
}

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
        
        // โหลด .env จาก project directory ถ้ามี (ปรับปรุงเพื่อลดการโหลดซ้ำ)
        let projectEnv = { ...process.env };
        const envFiles = [
          path.join(workingDir, '.env'),
          path.join(workingDir, '.env.local'),
          path.join(workingDir, '.env.development'),
          path.join(workingDir, '.env.production')
        ];
        const loadedEnvs = [];
        
        for (const envFile of envFiles) {
          if (fs.existsSync(envFile)) {
            console.log(`Loading Claude environment from: ${envFile}`);
            try {
              const envConfig = dotenv.parse(fs.readFileSync(envFile));
              projectEnv = { ...projectEnv, ...envConfig };
              loadedEnvs.push(path.basename(envFile));
            } catch (error) {
              console.error(`Failed to parse env file ${envFile}:`, error);
            }
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
        
        // Create logging session if service is available
        if (workspaceTerminalLogger) {
          try {
            const loggingSession = await workspaceTerminalLogger.createSession({
              tabId: sessionId,
              tabName: `Claude Terminal`,
              type: 'claude',
              projectId: projectId,
              userId: userId || 'anonymous',
              currentPath: workingDir
            });
            session.loggingSessionId = loggingSession.id;
            console.log(`Created logging session: ${loggingSession.id} for Claude terminal`);
          } catch (error) {
            console.error('Failed to create logging session:', error);
          }
        }

        // Handle PTY data with streaming
        shellProcess.onData(async (data) => {
          // Stream output immediately
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
            }));
          }
          
          // Log output to database if logging is available
          if (workspaceTerminalLogger && session.loggingSessionId) {
            try {
              // Clean ANSI codes for database storage
              const cleanContent = data.replace(/\x1b\[[0-9;]*m/g, '');
              
              // Detect if this is error output
              const isError = data.includes('error') || data.includes('Error') || 
                            data.includes('failed') || data.includes('Failed');
              
              await workspaceTerminalLogger.logOutput({
                sessionId: session.loggingSessionId,
                type: isError ? 'stderr' : 'stdout',
                content: cleanContent
              });
            } catch (error) {
              console.error('Failed to log terminal output:', error);
            }
          }
          
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
          
          // End logging session if available
          if (workspaceTerminalLogger && session.loggingSessionId) {
            try {
              await workspaceTerminalLogger.endSession(session.loggingSessionId);
              console.log(`Ended logging session: ${session.loggingSessionId}`);
            } catch (error) {
              console.error('Failed to end logging session:', error);
            }
          }
          
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
        if (loadedEnvs.length > 0) {
          const envMessage = `\r\n\x1b[32m✓ Loaded Claude environment: ${loadedEnvs.join(', ')}\x1b[0m\r\n`;
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
                // Log input command if logging is available
                if (workspaceTerminalLogger && session.loggingSessionId && data.data) {
                  try {
                    // Track command building for Claude
                    if (!session.currentCommand) {
                      session.currentCommand = '';
                    }
                    
                    if (data.data === '\r' || data.data === '\n') {
                      // Command execution - log the complete command
                      if (session.currentCommand.trim()) {
                        await workspaceTerminalLogger.logCommand({
                          sessionId: session.loggingSessionId,
                          command: session.currentCommand.trim(),
                          workingDir: session.workingDir
                        });
                      }
                      session.currentCommand = '';
                    } else if (data.data === '\x7f' || data.data === '\b') {
                      // Backspace
                      session.currentCommand = session.currentCommand.slice(0, -1);
                    } else if (data.data === '\x03') {
                      // Ctrl+C - cancel current command
                      session.currentCommand = '';
                    } else if (data.data.match(/^[\x20-\x7e]+$/)) {
                      // Regular printable characters
                      session.currentCommand += data.data;
                    }
                  } catch (error) {
                    console.error('Failed to log terminal input:', error);
                  }
                }
                
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
        
        // End logging session if available
        if (workspaceTerminalLogger && session && session.loggingSessionId) {
          workspaceTerminalLogger.endSession(session.loggingSessionId).catch(err => {
            console.error('Failed to end logging session on close:', err);
          });
        }
        
        // DON'T kill process on WebSocket close - keep session alive for reconnection
        // Only clean up the WebSocket connection
        if (session) {
          session.ws = null;
          console.log(`Claude WebSocket disconnected for session ${session.id}, keeping process alive`);
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