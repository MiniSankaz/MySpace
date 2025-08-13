import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';

const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Import logging service - handle both ES6 and CommonJS
let terminalLoggingService;
try {
  // Try to use the compiled version first
  const loggingModule = require('../../../dist/services/terminal-logging.service');
  terminalLoggingService = loggingModule.terminalLoggingService || loggingModule.default;
  console.log('Terminal logging service loaded successfully');
} catch (error) {
  // Logging is optional - continue without it if not available
  console.warn('Terminal logging service not available (optional):', error.message);
  terminalLoggingService = null;
}

class TerminalWebSocketServer {
  constructor(port = terminalConfig.websocket.port) {
    this.port = port;
    this.sessions = new Map();
    this.loggingService = terminalLoggingService;
    
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
    
    for (const [sessionKey, session] of this.sessions) {
      if (!session.ws || session.ws.readyState !== 1) { // Not OPEN
        // Check if session has been disconnected for too long
        const disconnectedTime = Date.now() - (session.lastDisconnectTime || Date.now());
        
        // Keep sessions alive for 30 minutes for reconnection
        if (disconnectedTime > maxAge) {
          console.log(`Cleaning up long-disconnected session: ${sessionKey}`);
          if (session.process) {
            session.process.kill();
          }
          this.sessions.delete(sessionKey);
        } else if (!session.lastDisconnectTime) {
          // Mark disconnection time
          session.lastDisconnectTime = Date.now();
        }
      } else {
        // Session is connected, clear disconnect time
        session.lastDisconnectTime = null;
      }
    }
  }

  handleConnection(ws, request) {
    console.log('New terminal WebSocket connection on standalone server');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://localhost:${this.port}`);
      const projectId = url.searchParams.get('projectId');
      let rawSessionId = url.searchParams.get('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      let workingDir = url.searchParams.get('path');
      
      // Parse session ID to handle both legacy and new formats
      let sessionId = this.parseSessionId(rawSessionId, projectId);
      const sessionKey = this.getSessionKey(sessionId, projectId);
      
      console.log('Connection params:', { projectId, sessionId, workingDir });
      
      // Extract userId from token if available
      const token = url.searchParams.get('token');
      let userId = null;
      // TODO: Validate token and extract userId if needed
      
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

      // Check if session exists using composite key
      let session = this.sessions.get(sessionKey);
      
      // Reuse existing session if it exists and is still alive
      if (session && session.process && !session.process.killed) {
        console.log(`Reusing existing session: ${sessionKey} (ID: ${sessionId})`);
        // Update WebSocket connection
        session.ws = ws;
        
        // Send current buffer to reconnected client
        if (session.outputBuffer) {
          ws.send(JSON.stringify({
            type: 'stream',
            data: session.outputBuffer,
          }));
        }
      } else if (session) {
        // Clean up dead session
        console.log(`Session ${sessionKey} exists but process is dead. Creating new session.`);
        this.sessions.delete(sessionKey);
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
        console.log(`Current working directory: ${workingDir}`);
        console.log(`Process cwd: ${process.cwd()}`);
        
        // โหลด .env จาก project directory ถ้ามี (ปรับปรุงเพื่อลดการโหลดซ้ำ)
        let projectEnv = { ...process.env };
        const loadedEnvFiles = [];
        
        // Load project-specific environment files only once
        const envFileNames = ['.env', '.env.local', '.env.development', '.env.production'];
        
        for (const fileName of envFileNames) {
          const envFile = path.join(workingDir, fileName);
          if (fs.existsSync(envFile)) {
            console.log(`Loading project environment from: ${envFile}`);
            try {
              const envConfig = dotenv.parse(fs.readFileSync(envFile));
              projectEnv = { ...projectEnv, ...envConfig };
              loadedEnvFiles.push(fileName);
            } catch (error) {
              console.error(`Failed to parse env file ${envFile}:`, error);
            }
          }
        }
        
        // Debug: Check if DATABASE_URL was loaded
        if (projectEnv.DATABASE_URL) {
          console.log('✓ DATABASE_URL loaded successfully');
        } else {
          console.warn('⚠️ DATABASE_URL not found in environment variables');
        }
        
        // Use node-pty for proper PTY support with project-specific env
        // Make sure PORT from project env is used
        const finalEnv = {
            ...process.env, // Base environment
            ...projectEnv,  // Project-specific overrides
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            LANG: projectEnv.LANG || process.env.LANG || 'en_US.UTF-8',
            // เพิ่ม PATH ของ project's node_modules/.bin
            PATH: `${path.join(workingDir, 'node_modules', '.bin')}:${projectEnv.PATH || process.env.PATH}`
        };
        
        // Debug PORT value
        console.log(`PORT value for terminal: ${finalEnv.PORT}`);
        
        const shellProcess = pty.spawn(shell, shellArgs, {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd: workingDir,
          env: finalEnv,
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
          dbSessionId: null, // Database session ID
          projectId: projectId,
          userId: userId,
          currentCommand: '',
        };
        
        this.sessions.set(sessionKey, session);
        
        // Create database session for logging
        if (this.loggingService && projectId) {
          this.loggingService.createSession({
            userId: userId,
            projectId: projectId,
            type: 'system',
            tabName: `Terminal ${sessionId.substring(0, 8)}`,
            currentPath: workingDir,
            metadata: {
              shell: shell,
              platform: os.platform(),
              sessionId: sessionId,
            }
          }).then(dbSession => {
            if (dbSession) {
              session.dbSessionId = dbSession.id;
              console.log(`Created DB session: ${dbSession.id}`);
            }
          }).catch(err => {
            console.error('Failed to create DB session:', err);
          });
        }

        // Handle PTY data with streaming
        shellProcess.onData((data) => {
          // Stream output immediately
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
            }));
          }
          
          // Log output to database
          if (this.loggingService && session.dbSessionId) {
            // Strip ANSI codes for clean content
            const cleanContent = data.replace(/\x1b\[[0-9;]*m/g, '');
            
            // Detect if this is an error output
            const isError = data.includes('error') || data.includes('Error') || 
                          data.includes('failed') || data.includes('Failed');
            
            if (isError) {
              this.loggingService.logError(
                session.dbSessionId,
                session.userId,
                cleanContent,
                { raw: data }
              );
            } else {
              this.loggingService.logOutput(
                session.dbSessionId,
                session.userId,
                cleanContent,
                data
              );
            }
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
          
          // End logging session
          if (this.loggingService && session.dbSessionId) {
            this.loggingService.endSession(session.dbSessionId).catch(err => {
              console.error('Failed to end DB session:', err);
            });
          }
          
          if (session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'exit',
              code: exitCode,
            }));
            session.ws.close();
          }
          this.sessions.delete(sessionKey);
        });

        // Send initial connection success
        ws.send(JSON.stringify({
          type: 'connected',
          sessionId: sessionId,
          workingDir: workingDir,
        }));

        // แสดงข้อความเมื่อโหลด environment แล้ว
        const uniqueLoadedFiles = [...new Set(loadedEnvFiles)];
        if (uniqueLoadedFiles.length > 0) {
          // เพิ่ม delay เล็กน้อยเพื่อให้ terminal พร้อม
          setTimeout(() => {
            const envMessage = `\x1b[32m✓ Loaded environment: ${uniqueLoadedFiles.join(', ')}\x1b[0m\r\n`;
            shellProcess.write(envMessage);
          }, 100);
        }
      } else {
        // Reconnect to existing session
        console.log(`Reconnecting to session: ${sessionKey} (ID: ${sessionId})`);
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
                
                // Log command input
                if (this.loggingService && session.dbSessionId) {
                  // Track command building
                  if (data.data === '\r' || data.data === '\n') {
                    // Command execution - log the complete command
                    if (session.currentCommand.trim()) {
                      this.loggingService.logCommand(
                        session.dbSessionId,
                        session.userId,
                        session.currentCommand.trim(),
                        { workingDir: session.workingDir }
                      );
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
                }
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
        
        // Check close code to determine if we should keep the session alive
        // 1000 = Normal closure, 1001 = Going away (page refresh/navigation)
        // 1006 = Abnormal closure (network failure, browser crash)
        // process.env.PORT || 4000-4999 = Application-specific codes
        const isCleanClose = code === 1000 || code === 1001;
        const isCircuitBreakerClose = code >= process.env.PORT || 4000 && code <= 4099;
        
        if (isCleanClose) {
          // Clean close - end the session properly
          console.log(`Clean close for session ${sessionKey}, ending session`);
          
          // End logging session
          if (this.loggingService && session && session.dbSessionId) {
            this.loggingService.endSession(session.dbSessionId).catch(err => {
              console.error('Failed to end DB session on close:', err);
            });
          }
          
          // Kill the process on clean close
          if (session && session.process && !session.process.killed) {
            session.process.kill();
          }
          this.sessions.delete(sessionKey);
        } else if (isCircuitBreakerClose) {
          // Circuit breaker triggered - log but keep session for recovery
          console.warn(`Circuit breaker close (code ${code}) for session ${sessionKey}, keeping session for recovery`);
          
          // Track circuit breaker state
          if (session) {
            session.ws = null;
            session.circuitBreakerTriggered = true;
            session.lastCircuitBreakerTime = Date.now();
          }
        } else {
          // Unexpected close - keep session alive for potential reconnection
          console.log(`Unexpected close (code ${code}) for session ${sessionKey}, keeping process alive for reconnection`);
          
          // Only clean up the WebSocket connection, keep session alive
          if (session) {
            session.ws = null;
          }
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

  parseSessionId(rawId, projectId) {
    // Handle different session ID formats
    // New format: session_{timestamp}_{random}
    // Legacy format with project: {sessionId}_{projectId}
    // Legacy format simple: {sessionId}
    
    if (!rawId) {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    
    // Check if it's already in new format
    if (rawId.startsWith('session_') && rawId.split('_').length === 3) {
      return rawId;
    }
    
    // Check if it's legacy composite format
    const parts = rawId.split('_');
    if (parts.length > 1 && parts[parts.length - 1] === projectId) {
      // Extract base session ID (everything except last part)
      const baseId = parts.slice(0, -1).join('_');
      console.log(`Migrating legacy composite session ID: ${rawId} -> ${baseId}`);
      return baseId;
    }
    
    // Return as-is for other formats
    return rawId;
  }
  
  getSessionKey(sessionId, projectId) {
    // Use composite key for session storage
    return projectId ? `${sessionId}:${projectId}` : sessionId;
  }
  
  closeSession(sessionId, projectId) {
    const sessionKey = this.getSessionKey(sessionId, projectId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      if (session.process && !session.process.killed) {
        session.process.kill();
      }
      if (session.ws) {
        session.ws.close();
      }
      this.sessions.delete(sessionKey);
    }
  }

  closeAllSessions() {
    console.log('Closing all terminal sessions...');
    this.sessions.forEach((session, sessionId) => {
      // End logging session first
      if (this.loggingService && session.dbSessionId) {
        this.loggingService.endSession(session.dbSessionId).catch(err => {
          console.error(`Failed to end DB session ${session.dbSessionId}:`, err);
        });
      }
      this.closeSession(sessionId);
    });
    this.sessions.clear();
    console.log('All terminal sessions closed');
  }
}

// Graceful shutdown handlers
let terminalServerInstance = null;

function setupShutdownHandlers(server) {
  terminalServerInstance = server;
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n[Terminal Server] Received SIGINT signal. Shutting down gracefully...');
    shutdown('SIGINT');
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('[Terminal Server] Received SIGTERM signal. Shutting down gracefully...');
    shutdown('SIGTERM');
  });
  
  // Handle unexpected errors
  process.on('uncaughtException', (error) => {
    console.error('[Terminal Server] Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Terminal Server] Unhandled promise rejection:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

function shutdown(signal) {
  console.log(`[Terminal Server] Initiating shutdown (${signal})...`);
  
  if (terminalServerInstance) {
    console.log('[Terminal Server] Closing all terminal sessions...');
    terminalServerInstance.closeAllSessions();
    
    console.log('[Terminal Server] Closing WebSocket server...');
    terminalServerInstance.wss.close(() => {
      console.log('[Terminal Server] WebSocket server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Terminal Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    console.log('[Terminal Server] No server instance to close');
    process.exit(0);
  }
}

module.exports = { TerminalWebSocketServer, setupShutdownHandlers };