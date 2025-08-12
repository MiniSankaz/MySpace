const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { getShellManager } = require('./shell-manager');
const ImprovedGitService = require('./git-service-improved');

// Import in-memory terminal service instead of database logging
let InMemoryTerminalService;
try {
  // Try to use the TypeScript in-memory service directly
  require('ts-node/register');
  const memoryModule = require('../../services/terminal-memory.service.ts');
  InMemoryTerminalService = memoryModule.InMemoryTerminalService;
  console.log('In-memory terminal service loaded successfully');
} catch (error) {
  // Fallback to compiled version if ts-node is not available
  try {
    const memoryModule = require('../../../dist/services/terminal-memory.service');
    InMemoryTerminalService = memoryModule.InMemoryTerminalService;
    console.log('In-memory terminal service loaded successfully (compiled)');
  } catch (error2) {
    // In-memory service is optional - continue without it if not available
    console.warn('In-memory terminal service not available (optional):', error2.message);
    InMemoryTerminalService = null;
  }
}

class TerminalWebSocketServer {
  constructor(port = 4001) {
    this.port = port;
    this.sessions = new Map();
    this.memoryService = InMemoryTerminalService ? InMemoryTerminalService.getInstance() : null;
    
    // Initialize shell manager
    this.shellManager = getShellManager();
    
    // Initialize improved Git service
    this.gitService = new ImprovedGitService();
    
    // Rate limiting for terminal spawns
    this.spawnAttempts = new Map(); // Track spawn attempts per IP/session
    this.maxSpawnsPerMinute = 10;
    this.cleanupSpawnAttempts();
    
    // Multi-focus management - track multiple focused sessions per project
    this.focusedSessions = new Map(); // projectId -> Set<sessionId>
    this.outputBuffers = new Map(); // sessionId -> buffered output array
    
    // WebSocket retry configuration
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      factor: 2
    };
    this.registrationRetries = new Map(); // sessionId -> retry count
    
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

    // Listen to InMemoryService focus events for real-time sync
    if (this.memoryService) {
      this.memoryService.on('focusChanged', (data) => {
        const { sessionId, focused, projectId, allFocused } = data;
        console.log(`[Terminal WS] Focus event received: session=${sessionId}, focused=${focused}, project=${projectId}`);
        
        // Update local focus cache
        if (projectId) {
          this.focusedSessions.set(projectId, new Set(allFocused));
        }
        
        // Notify the affected session's WebSocket
        const sessionKey = this.getSessionKey(sessionId, projectId);
        const session = this.sessions.get(sessionKey);
        if (session && session.ws && session.ws.readyState === 1) {
          // Send focus state update to frontend
          session.ws.send(JSON.stringify({
            type: 'focusUpdate',
            focused,
            allFocused
          }));
        }
      });
      
      // Listen for suspension events to prevent terminal killing
      this.memoryService.on('sessionSuspended', (data) => {
        const { sessionId, projectId } = data;
        console.log(`[Terminal WS] Session ${sessionId} suspended for project ${projectId}`);
        
        // Mark sessions as suspended but keep processes alive
        const sessionKey = this.getSessionKey(sessionId, projectId);
        const session = this.sessions.get(sessionKey);
        if (session) {
          session.suspended = true;
          session.suspendedAt = new Date();
          console.log(`[Terminal WS] Marked session ${sessionKey} as suspended, process kept alive`);
        }
      });
    }
    
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }
  
  cleanupSpawnAttempts() {
    // Clean up old spawn attempts every minute
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      for (const [key, attempts] of this.spawnAttempts.entries()) {
        const recentAttempts = attempts.filter(time => time > oneMinuteAgo);
        if (recentAttempts.length === 0) {
          this.spawnAttempts.delete(key);
        } else {
          this.spawnAttempts.set(key, recentAttempts);
        }
      }
    }, 60000);
  }
  
  checkRateLimit(identifier) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    if (!this.spawnAttempts.has(identifier)) {
      this.spawnAttempts.set(identifier, []);
    }
    
    const attempts = this.spawnAttempts.get(identifier);
    const recentAttempts = attempts.filter(time => time > oneMinuteAgo);
    
    if (recentAttempts.length >= this.maxSpawnsPerMinute) {
      return false; // Rate limit exceeded
    }
    
    recentAttempts.push(now);
    this.spawnAttempts.set(identifier, recentAttempts);
    return true;
  }

  cleanupInactiveSessions() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes - REDUCED FROM 30 minutes
    
    for (const [sessionKey, session] of this.sessions) {
      if (!session.ws || session.ws.readyState !== 1) { // Not OPEN
        // Check if keep-alive has expired - but don't kill suspended sessions
        if (session.keepAliveUntil && now > session.keepAliveUntil && !session.suspended) {
          console.log(`Keep-alive expired for session ${sessionKey}, cleaning up`);
          if (session.process && !session.process.killed) {
            session.process.kill();
          }
          this.sessions.delete(sessionKey);
          continue;
        } else if (session.suspended) {
          // Don't cleanup suspended sessions
          console.log(`Session ${sessionKey} is suspended, keeping alive`);
          continue;
        }
        
        // Check if session has been disconnected for too long
        const disconnectedTime = now - (session.lastDisconnectTime || now);
        
        // Keep sessions alive for 30 minutes for reconnection (unless keep-alive is set)
        if (!session.keepAliveUntil && disconnectedTime > maxAge) {
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

  async handleConnection(ws, request) {
    console.log('New terminal WebSocket connection on standalone server');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://localhost:${this.port}`);
      
      // Check if this is a Git WebSocket connection
      // Match any project ID format (alphanumeric with hyphens and underscores)
      const pathMatch = url.pathname.match(/^\/git\/([a-zA-Z0-9_-]+)$/);
      if (pathMatch) {
        // Handle Git WebSocket connections separately
        const gitProjectId = pathMatch[1];
        console.log(`Git WebSocket connection for project: ${gitProjectId}`);
        this.handleGitWebSocketConnection(ws, gitProjectId);
        return;
      }
      
      // Regular terminal WebSocket handling
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
      
      // Enhanced path handling - prioritize passed path from API
      if (workingDir) {
        try {
          workingDir = decodeURIComponent(workingDir);
          console.log(`Using provided path: ${workingDir}`);
        } catch (e) {
          console.error('Failed to decode path:', e);
          workingDir = null;
        }
      }
      
      // Enhanced path validation with better fallback
      if (workingDir && fs.existsSync(workingDir)) {
        const stats = fs.statSync(workingDir);
        if (!stats.isDirectory()) {
          workingDir = path.dirname(workingDir);
        }
        console.log(`✓ Using valid project path: ${workingDir}`);
      } else {
        // Fallback to home directory if project path is invalid
        workingDir = os.homedir();
        console.log(`⚠️ Invalid project path, using home directory: ${workingDir}`);
      }

      console.log(`Starting terminal session in: ${workingDir}`);

      // Check if session exists using composite key
      let session = this.sessions.get(sessionKey);
      
      // Reuse existing session if it exists and is still alive
      if (session && session.process && !session.process.killed) {
        console.log(`Reusing existing session: ${sessionKey} (ID: ${sessionId})`);
        // Clear keep-alive since we're reconnecting
        if (session.keepAliveUntil) {
          delete session.keepAliveUntil;
          delete session.lastDisconnectCode;
        }
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
        // Check rate limit before creating new session
        const rateLimitKey = projectId || request.socket.remoteAddress || 'global';
        if (!this.checkRateLimit(rateLimitKey)) {
          console.error(`Rate limit exceeded for ${rateLimitKey}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Too many terminal sessions. Please wait a moment and try again.',
          }));
          ws.close(1008, 'Rate limit exceeded');
          return;
        }
        
        // Create new shell session - detect platform
        // Helper function to check if shell exists
        const shellExists = (shellPath) => {
          try {
            return fs.existsSync(shellPath);
          } catch (error) {
            console.warn(`Failed to check shell ${shellPath}:`, error.message);
            return false;
          }
        };
        
        // Get available shell with fallback options
        const getAvailableShell = () => {
          const shells = [];
          
          if (os.platform() === 'win32') {
            // Windows shells - try multiple options
            shells.push(
              process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe',
              'powershell.exe',
              'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
              'cmd.exe'
            );
          } else if (os.platform() === 'darwin') {
            // macOS shells - try zsh first, then bash
            shells.push(
              process.env.SHELL || '/bin/zsh',
              '/bin/zsh',
              '/bin/bash',
              '/usr/bin/bash',
              '/bin/sh'
            );
          } else {
            // Linux/Unix shells
            shells.push(
              process.env.SHELL || '/bin/bash',
              '/bin/bash',
              '/usr/bin/bash',
              '/bin/sh',
              '/usr/bin/sh',
              '/bin/dash'
            );
          }
          
          // Find first available shell
          for (const shellPath of shells) {
            if (shellExists(shellPath)) {
              console.log(`✓ Found available shell: ${shellPath}`);
              return shellPath;
            } else {
              console.log(`✗ Shell not found: ${shellPath}`);
            }
          }
          
          // Ultimate fallback
          console.warn('⚠️ No standard shell found, using system default fallback');
          return os.platform() === 'win32' ? 'cmd.exe' : '/bin/sh';
        };
        
        let shell = getAvailableShell();
        let shellArgs = os.platform() === 'win32' ? [] : ['-l']; // Login shell on Unix
        
        console.log(`Creating new shell session with: ${shell}`);
        console.log(`Current working directory: ${workingDir}`);
        console.log(`Process cwd: ${process.cwd()}`);
        
        // Enhanced environment loading from project directory
        let projectEnv = { ...process.env };
        const loadedEnvFiles = [];
        
        // Load project-specific environment files with priority order
        const envFileNames = ['.env.local', '.env', '.env.development.local', '.env.development', '.env.production.local', '.env.production'];
        
        console.log(`🔍 Scanning for environment files in: ${workingDir}`);
        
        for (const fileName of envFileNames) {
          const envFile = path.join(workingDir, fileName);
          try {
            if (fs.existsSync(envFile)) {
              console.log(`📄 Loading project environment from: ${envFile}`);
              const envConfig = dotenv.parse(fs.readFileSync(envFile, 'utf8'));
              projectEnv = { ...projectEnv, ...envConfig };
              loadedEnvFiles.push(fileName);
              console.log(`✓ Loaded ${Object.keys(envConfig).length} variables from ${fileName}`);
            }
          } catch (error) {
            console.error(`❌ Failed to parse env file ${envFile}:`, error);
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
        
        // Use ShellManager to spawn shell with proper verification
        let shellProcess;
        try {
          const shellResult = await this.shellManager.spawnShell({
            cwd: workingDir,
            env: finalEnv,
            cols: 80,
            rows: 30
          });
          
          shellProcess = shellResult.process;
          console.log(`✓ Successfully spawned shell: ${shellResult.shell}`);
          console.log('Shell capabilities:', shellResult.capabilities);
        } catch (spawnError) {
          console.error('✗ Failed to spawn any shell:', spawnError.message);
          console.error('Shell spawn error details:', {
            error: spawnError.message,
            code: spawnError.code,
            availableShells: this.shellManager.getShellInfo().available,
            workingDir: workingDir,
            sessionId: sessionId
          });
          
          // Send detailed error to client
          ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to initialize terminal: ${spawnError.message}. No available shells found.`,
          }));
          
          // Close connection with error code
          ws.close(4000, 'Terminal spawn failed');
          return;
        }
        
        session = {
          id: sessionId,
          process: shellProcess,
          workingDir: workingDir,
          ws: ws,
          outputBuffer: '',
          commandQueue: [],
          isProcessing: false,
          environment: {},
          // No database session ID needed (using in-memory)
          projectId: projectId,
          userId: userId,
          currentCommand: '',
        };
        
        this.sessions.set(sessionKey, session);
        
        // Register session in memory - create if doesn't exist
        if (this.memoryService && projectId && sessionId) {
          // First check if session exists, if not create it
          let memSession = this.memoryService.getSession(sessionId);
          if (!memSession) {
            console.log(`[Terminal WS] Creating session ${sessionId} in memory service`);
            memSession = this.memoryService.createSession(
              projectId,
              workingDir,
              userId,
              'normal' // Default mode
            );
            // Override the generated ID with our existing session ID
            if (memSession && memSession.id !== sessionId) {
              // Update the session ID in memory service
              this.memoryService.sessions.delete(memSession.id);
              memSession.id = sessionId;
              this.memoryService.sessions.set(sessionId, memSession);
            }
          }
          
          // Now register the WebSocket connection
          this.registerWebSocketWithRetry(sessionId, ws, projectId).catch(err => {
            console.error('Failed to register WebSocket after retries:', err);
          });
        }

        // Handle PTY data with focus-aware streaming
        shellProcess.onData((data) => {
          // Check if this session is focused
          const isFocused = this.isSessionFocused(sessionId, projectId);
          
          // Always stream to focused sessions for real-time updates
          if (isFocused && session.ws && session.ws.readyState === ws.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'stream',
              data: data,
            }));
          }
          
          // Also buffer output for history (even for focused sessions)
          // This ensures we have complete output history
          this.bufferOutput(sessionId, data);
          
          // Update session activity in memory (no database logging)
          if (this.memoryService && session.id) {
            try {
              this.memoryService.updateSessionActivity(session.id);
            } catch (err) {
              // Ignore - session activity update is optional
            }
          }
          
          // Also buffer for history with strict limits
          session.outputBuffer += data;
          
          // Limit buffer size (keep last 5KB) - REDUCED FROM 10KB
          if (session.outputBuffer.length > 5120) {
            session.outputBuffer = session.outputBuffer.slice(-5120);
          }
        });

        // Handle process exit
        shellProcess.onExit(({ exitCode, signal }) => {
          console.log(`Shell process exited with code ${exitCode}, signal ${signal}`);
          
          // Session cleanup handled by in-memory service
          
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
          
          // Check if session is suspended
          if (this.memoryService && this.memoryService.isSessionSuspended(sessionId)) {
            // Buffer output for suspended session
            if (data.type === 'input') {
              this.memoryService.bufferOutputForSuspended(sessionId, data.data);
              ws.send(JSON.stringify({
                type: 'suspended',
                message: 'Session is suspended. Input buffered.',
                sessionId
              }));
              return;
            }
          }
          
          switch (data.type) {
            case 'suspend':
              // Handle suspension request
              if (this.memoryService) {
                const count = this.memoryService.suspendProjectSessions(projectId);
                ws.send(JSON.stringify({
                  type: 'suspended',
                  message: `Suspended ${count} sessions`,
                  sessionId
                }));
              }
              break;
              
            case 'resume':
              // Handle resumption request
              if (this.memoryService) {
                const result = this.memoryService.resumeProjectSessions(projectId);
                
                // Send buffered output if any
                const suspensionState = this.memoryService.getSuspensionState(sessionId);
                if (suspensionState && suspensionState.bufferedOutput.length > 0) {
                  ws.send(JSON.stringify({
                    type: 'buffered',
                    data: suspensionState.bufferedOutput.join(''),
                    sessionId
                  }));
                }
                
                ws.send(JSON.stringify({
                  type: 'resumed',
                  message: `Resumed ${result.sessions.length} sessions`,
                  sessionId
                }));
              }
              break;
              
            case 'input':
              if (session.process) {
                // For PTY with xterm.js, write data exactly as received
                // xterm.js will send the correct characters including \r for Enter
                session.process.write(data.data);
                
                // Log command input
                if (this.loggingService && session.dbSessionId) {
                  // Track command building (no database logging)
                  if (data.data === '\r' || data.data === '\n') {
                    // Command execution - reset command tracker
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
              
            case 'subscribe':
              // Subscribe to git status updates for a project
              if (data.projectId && data.projectPath) {
                this.subscribeToGitUpdates(ws, data.projectId, data.projectPath);
              }
              break;
              
            case 'unsubscribe':
              // Unsubscribe from git status updates
              if (data.projectId) {
                this.unsubscribeFromGitUpdates(ws, data.projectId);
              }
              break;
              
            case 'git-refresh':
              // Force refresh git status
              if (data.projectId && data.projectPath) {
                this.refreshGitStatus(data.projectId, data.projectPath);
              }
              break;
            
            case 'focus':
              // Handle focus change
              this.handleFocusChange(sessionId, projectId, true);
              // Flush any buffered output when session gains focus
              const buffered = this.flushBuffer(sessionId);
              if (buffered && buffered.length > 0 && session.ws && session.ws.readyState === ws.OPEN) {
                session.ws.send(JSON.stringify({
                  type: 'buffered',
                  data: buffered
                }));
              }
              break;
            
            case 'blur':
              // Handle blur (unfocus)
              this.handleFocusChange(sessionId, projectId, false);
              break;
            
            case 'focus_change':
              // Handle focus mode change from terminal service
              if (data.mode === 'active') {
                this.handleFocusChange(sessionId, projectId, true);
              } else if (data.mode === 'background') {
                this.handleFocusChange(sessionId, projectId, false);
              }
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
        // 4000-4999 = Application-specific codes
        const isIntentionalClose = code === 1000; // Only 1000 is truly intentional
        const isPageRefresh = code === 1001; // Browser navigation/refresh
        const isCircuitBreakerClose = code >= 4000 && code <= 4099;
        
        if (isIntentionalClose) {
          // Intentional close - suspend session instead of killing
          console.log(`Intentional close for session ${sessionKey}, suspending session`);
          
          // End logging session
          if (this.loggingService && session && session.dbSessionId) {
            this.loggingService.endSession(session.dbSessionId).catch(err => {
              console.error('Failed to end DB session on close:', err);
            });
          }
          
          // DON'T kill the process - just suspend it
          if (session && projectId && this.memoryService) {
            // Mark session as suspended in memory service
            this.memoryService.suspendProjectSessions(projectId);
            console.log(`Session ${sessionKey} suspended, process kept alive`);
          }
          
          // Remove WebSocket but keep session alive
          if (session) {
            session.ws = null;
            session.keepAliveUntil = Date.now() + (10 * 60 * 1000); // Keep alive for 10 minutes
          }
        } else if (isPageRefresh) {
          // Page refresh - keep session alive for reconnection
          console.log(`Page refresh (code 1001) for session ${sessionKey}, keeping session alive for 2 minutes`);
          
          if (session) {
            session.ws = null;
            session.keepAliveUntil = Date.now() + (2 * 60 * 1000); // Keep alive for 2 minutes
            session.lastDisconnectCode = code;
          }
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
  
  // Multi-focus management methods
  isSessionFocused(sessionId, projectId) {
    if (!projectId) return true; // If no project, assume focused
    
    // Check with memory service first (single source of truth)
    if (this.memoryService) {
      return this.memoryService.isSessionFocused(sessionId);
    }
    
    // Fallback to local tracking
    const focusedSet = this.focusedSessions.get(projectId);
    return focusedSet ? focusedSet.has(sessionId) : false;
  }
  
  handleFocusChange(sessionId, projectId, isFocused) {
    if (!projectId) return;
    
    // Use memory service as single source of truth
    if (this.memoryService) {
      this.memoryService.setSessionFocus(sessionId, isFocused);
      
      // Update local cache from memory service
      const focusedList = this.memoryService.getFocusedSessions(projectId);
      this.focusedSessions.set(projectId, new Set(focusedList));
      
      console.log(`Session ${sessionId} focus changed to ${isFocused}, total focused: ${focusedList.length}`);
    } else {
      // Fallback to local tracking for multi-focus
      if (!this.focusedSessions.has(projectId)) {
        this.focusedSessions.set(projectId, new Set());
      }
      
      const focusedSet = this.focusedSessions.get(projectId);
      
      if (isFocused) {
        focusedSet.add(sessionId);
        console.log(`Session ${sessionId} is now focused for project ${projectId}`);
      } else {
        focusedSet.delete(sessionId);
        console.log(`Session ${sessionId} is now unfocused for project ${projectId}`);
      }
    }
  }
  
  bufferOutput(sessionId, data) {
    const buffer = this.outputBuffers.get(sessionId) || [];
    buffer.push(data);
    
    // Limit buffer size to 100 lines/chunks - REDUCED FROM 500
    if (buffer.length > 100) {
      buffer.splice(0, buffer.length - 100);
    }
    
    this.outputBuffers.set(sessionId, buffer);
  }
  
  flushBuffer(sessionId) {
    const buffer = this.outputBuffers.get(sessionId) || [];
    this.outputBuffers.delete(sessionId);
    
    // Join buffer into single string if it has content
    if (buffer.length > 0) {
      return buffer.join('');
    }
    return null;
  }
  
  // Register WebSocket with exponential backoff retry
  async registerWebSocketWithRetry(sessionId, ws, projectId, retryCount = 0) {
    try {
      // First check if session exists in memory service
      const session = this.memoryService.getSession(sessionId);
      if (!session) {
        // Wait a bit for session to be created (race condition mitigation)
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check again after wait
        const sessionAfterWait = this.memoryService.getSession(sessionId);
        if (!sessionAfterWait) {
          throw new Error(`Session ${sessionId} not found in memory service`);
        }
      }
      
      // Register the WebSocket connection
      this.memoryService.registerWebSocketConnection(sessionId, ws);
      console.log(`Successfully registered WebSocket for session ${sessionId} on attempt ${retryCount + 1}`);
      
      // Mark WebSocket as ready for this session
      this.memoryService.markWebSocketReady(sessionId);
      console.log(`[Terminal WS] Marked WebSocket ready for session ${sessionId}`);
      
      // Clear retry count on success
      this.registrationRetries.delete(sessionId);
      
      // Sync focus state after successful registration
      if (projectId) {
        const focusedList = this.memoryService.getFocusedSessions(projectId);
        this.focusedSessions.set(projectId, new Set(focusedList));
      }
      
      return true;
    } catch (error) {
      const currentRetries = this.registrationRetries.get(sessionId) || 0;
      
      if (currentRetries >= this.retryConfig.maxRetries) {
        console.error(`Max retries (${this.retryConfig.maxRetries}) reached for session ${sessionId}:`, error.message);
        this.registrationRetries.delete(sessionId);
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.factor, currentRetries),
        this.retryConfig.maxDelay
      );
      
      console.warn(`Failed to register WebSocket for session ${sessionId}, retrying in ${delay}ms (attempt ${currentRetries + 1}/${this.retryConfig.maxRetries}):`, error.message);
      
      // Update retry count
      this.registrationRetries.set(sessionId, currentRetries + 1);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.registerWebSocketWithRetry(sessionId, ws, projectId, currentRetries + 1);
    }
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
      
      // Clean up focus and buffer
      if (projectId && this.focusedSessions.get(projectId) === sessionId) {
        this.focusedSessions.delete(projectId);
      }
      this.outputBuffers.delete(sessionId);
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
  
  // Git monitoring methods
  handleGitWebSocketConnection(ws, projectId) {
    console.log(`[Git WS] Handling Git WebSocket for project: ${projectId}`);
    
    // Register connection with improved Git service
    this.gitService.registerConnection(projectId, ws);
    
    // Handle WebSocket messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`[Git WS] Received message:`, data);
        
        switch(data.type) {
          case 'subscribe':
            if (data.projectPath) {
              // Use improved Git service for monitoring
              this.gitService.startMonitoring(projectId, data.projectPath);
            }
            break;
            
          case 'git-refresh':
            if (data.projectPath) {
              // Force refresh using improved Git service
              this.gitService.getGitStatus(projectId, data.projectPath);
            }
            break;
            
          default:
            console.warn(`[Git WS] Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('[Git WS] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });
    
    // Handle WebSocket close
    ws.on('close', () => {
      console.log(`[Git WS] Connection closed for project: ${projectId}`);
      // Cleanup handled automatically by improved Git service
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`[Git WS] WebSocket error for project ${projectId}:`, error);
    });
    
    // Send initial connection success
    ws.send(JSON.stringify({
      type: 'connected',
      projectId: projectId,
    }));
  }
  
  subscribeToGitUpdates(ws, projectId, projectPath) {
    if (!this.gitSubscriptions.has(projectId)) {
      this.gitSubscriptions.set(projectId, new Set());
      this.startGitMonitoring(projectId, projectPath);
    }
    
    const subscribers = this.gitSubscriptions.get(projectId);
    subscribers.add(ws);
    
    // Send cached status if available
    const cached = this.gitStatusCache.get(projectId);
    if (cached) {
      ws.send(JSON.stringify({
        type: 'status-update',
        status: cached.status,
        currentBranch: cached.currentBranch,
      }));
      
      if (cached.branches) {
        ws.send(JSON.stringify({
          type: 'branches-update',
          branches: cached.branches,
        }));
      }
    }
    
    console.log(`Git subscription added for project ${projectId}`);
  }
  
  unsubscribeFromGitUpdates(ws, projectId) {
    const subscribers = this.gitSubscriptions.get(projectId);
    if (subscribers) {
      subscribers.delete(ws);
      
      // Stop monitoring if no more subscribers
      if (subscribers.size === 0) {
        this.stopGitMonitoring(projectId);
        this.gitSubscriptions.delete(projectId);
      }
    }
  }
  
  startGitMonitoring(projectId, projectPath) {
    // Initial status check
    this.refreshGitStatus(projectId, projectPath);
    
    // Poll for changes every 5 seconds
    const intervalId = setInterval(() => {
      this.refreshGitStatus(projectId, projectPath);
    }, 5000);
    
    this.gitMonitorIntervals.set(projectId, intervalId);
    console.log(`Started git monitoring for project ${projectId}`);
  }
  
  stopGitMonitoring(projectId) {
    const intervalId = this.gitMonitorIntervals.get(projectId);
    if (intervalId) {
      clearInterval(intervalId);
      this.gitMonitorIntervals.delete(projectId);
      this.gitStatusCache.delete(projectId);
      console.log(`Stopped git monitoring for project ${projectId}`);
    }
  }
  
  async refreshGitStatus(projectId, projectPath) {
    try {
      // Execute git commands to get status
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Get git status
      const statusResult = await execAsync('git status --porcelain=v1 --branch', {
        cwd: projectPath,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
      
      // Parse status
      const status = this.parseGitStatus(statusResult.stdout);
      
      // Get current branch
      const branchResult = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
      });
      
      const currentBranch = branchResult.stdout.trim();
      
      // Get branches list
      const branchesResult = await execAsync('git branch -a -v', {
        cwd: projectPath,
      });
      
      const branches = this.parseGitBranches(branchesResult.stdout, currentBranch);
      
      // Update cache
      this.gitStatusCache.set(projectId, {
        status,
        currentBranch,
        branches,
        lastUpdate: Date.now(),
      });
      
      // Broadcast to all subscribers
      const subscribers = this.gitSubscriptions.get(projectId);
      if (subscribers) {
        const statusMessage = JSON.stringify({
          type: 'status-update',
          status,
          currentBranch,
        });
        
        const branchesMessage = JSON.stringify({
          type: 'branches-update',
          branches,
        });
        
        subscribers.forEach(ws => {
          if (ws.readyState === 1) { // OPEN
            ws.send(statusMessage);
            ws.send(branchesMessage);
          }
        });
      }
    } catch (error) {
      console.error(`Failed to refresh git status for project ${projectId}:`, error);
      
      // Notify subscribers of error
      const subscribers = this.gitSubscriptions.get(projectId);
      if (subscribers) {
        const errorMessage = JSON.stringify({
          type: 'error',
          message: 'Failed to get git status',
        });
        
        subscribers.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(errorMessage);
          }
        });
      }
    }
  }
  
  parseGitStatus(output) {
    const lines = output.split('\n').filter(Boolean);
    const status = {
      modified: [],
      staged: [],
      untracked: [],
      conflicts: [],
      ahead: 0,
      behind: 0,
      isClean: true,
    };
    
    for (const line of lines) {
      if (line.startsWith('##')) {
        // Parse branch info
        const aheadMatch = line.match(/ahead (\d+)/);
        const behindMatch = line.match(/behind (\d+)/);
        
        if (aheadMatch) status.ahead = parseInt(aheadMatch[1]);
        if (behindMatch) status.behind = parseInt(behindMatch[1]);
      } else {
        const statusCode = line.substring(0, 2);
        const filename = line.substring(3);
        
        status.isClean = false;
        
        if (statusCode === '??') {
          status.untracked.push(filename);
        } else if (statusCode === 'UU' || statusCode === 'AA' || statusCode === 'DD') {
          status.conflicts.push(filename);
        } else if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          status.staged.push(filename);
        } else if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
          status.modified.push(filename);
        }
      }
    }
    
    status.lastFetch = new Date();
    return status;
  }
  
  parseGitBranches(output, currentBranch) {
    const lines = output.split('\n').filter(Boolean);
    const branches = [];
    
    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const cleanLine = line.replace(/^\*?\s+/, '');
      const parts = cleanLine.split(/\s+/);
      
      if (parts.length < 2) continue;
      
      const name = parts[0];
      const isRemote = name.startsWith('remotes/');
      
      // Skip HEAD references
      if (name.includes('HEAD')) continue;
      
      branches.push({
        name: isRemote ? name.replace('remotes/', '') : name,
        isRemote,
        isCurrent: name === currentBranch,
        ahead: 0,
        behind: 0,
      });
    }
    
    return branches;
  }
}

// Graceful shutdown handlers
let terminalServerInstance = null;

function setupShutdownHandlers(server) {
  terminalServerInstance = server;
  
  // Increase max listeners to prevent memory leak warnings
  process.setMaxListeners(20);
  
  // Check if handlers are already set up to prevent duplicates
  if (!process._shutdownHandlersSet) {
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
    
    // Mark handlers as set up
    process._shutdownHandlersSet = true;
  }
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