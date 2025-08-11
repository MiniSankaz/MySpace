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

// Import Knowledge Base integration
let terminalKBIntegration;
try {
  const kbModulePath = path.join(__dirname, '../..', 'modules/knowledge-base/services/terminal-integration.service.ts');
  if (fs.existsSync(kbModulePath.replace('.ts', '.js'))) {
    const kbModule = require(kbModulePath.replace('.ts', '.js'));
    terminalKBIntegration = kbModule.terminalKBIntegration || kbModule.default;
    console.log('Claude Terminal: Knowledge Base integration loaded successfully');
  } else {
    console.log('Claude Terminal: Knowledge Base integration not compiled yet (will work after build)');
    terminalKBIntegration = null;
  }
} catch (error) {
  console.warn('Claude Terminal: Knowledge Base integration not available (optional):', error.message);
  terminalKBIntegration = null;
}

// Helper function to format KB suggestions
function formatKBSuggestions(suggestions) {
  const lines = [
    '\x1b[36m╔════════════════════════════════════════════════════════════╗\x1b[0m',
    '\x1b[36m║  💡 Knowledge Base: Found similar issues with solutions    ║\x1b[0m',
    '\x1b[36m╚════════════════════════════════════════════════════════════╝\x1b[0m',
    ''
  ];

  if (suggestions.issues && suggestions.issues.length > 0) {
    const issue = suggestions.issues[0];
    lines.push(`\x1b[33m📋 Issue:\x1b[0m ${issue.title}`);
    lines.push(`\x1b[33m🔍 Status:\x1b[0m ${issue.status} | \x1b[33mSeverity:\x1b[0m ${issue.severity}`);
    lines.push('');
  }

  if (suggestions.solutions && suggestions.solutions.length > 0) {
    lines.push('\x1b[32m✅ Suggested Solutions:\x1b[0m');
    suggestions.solutions.slice(0, 3).forEach((solution, index) => {
      lines.push(`${index + 1}. ${solution.title}`);
      if (solution.effectivenessScore) {
        lines.push(`   \x1b[35mEffectiveness: ${solution.effectivenessScore}%\x1b[0m`);
      }
    });
  }

  if (suggestions.confidence) {
    lines.push('');
    lines.push(`\x1b[33m🎯 Confidence:\x1b[0m ${suggestions.confidence}%`);
  }

  lines.push('');
  return lines.join('\r\n');
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
    
    for (const [sessionKey, session] of this.sessions) {
      if (!session.ws || session.ws.readyState !== 1) { // Not OPEN
        // Check if session has been disconnected for too long
        const disconnectedTime = Date.now() - (session.lastDisconnectTime || Date.now());
        
        // Keep sessions alive for 30 minutes for reconnection
        if (disconnectedTime > maxAge) {
          console.log(`Cleaning up long-disconnected Claude session: ${sessionKey}`);
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
    console.log('New Claude terminal WebSocket connection');
    console.log('Request URL:', request.url);
    
    try {
      const url = new URL(request.url, `http://localhost:${this.port}`);
      const projectId = url.searchParams.get('projectId') || 'default';
      const userId = url.searchParams.get('userId') || 'anonymous';
      let rawSessionId = url.searchParams.get('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      let workingDir = url.searchParams.get('path');
      
      // Parse session ID to handle both legacy and new formats
      let sessionId = this.parseSessionId(rawSessionId, projectId);
      const sessionKey = this.getSessionKey(sessionId, projectId);
      
      console.log('Connection params:', { projectId, userId, sessionId: sessionKey, workingDir });
      
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
      let session = this.sessions.get(sessionKey);
      
      // Validate existing session
      if (session && session.workingDir !== workingDir) {
        console.log(`Session ${sessionKey} exists but with different path. Creating new session.`);
        // Remove old session if path doesn't match
        if (session.process) {
          session.process.kill();
        }
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
        
        this.sessions.set(sessionKey, session);
        
        // Create logging session if service is available (with graceful degradation)
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
            console.warn('Logging session creation failed, continuing without logging:', error.message);
            // Continue without logging - this is not critical for terminal functionality
            session.loggingSessionId = null;
          }
        }

        // Register session with Knowledge Base integration
        if (terminalKBIntegration) {
          try {
            await terminalKBIntegration.registerSession({
              sessionId: sessionId,
              projectId: projectId,
              userId: userId || 'anonymous',
              type: 'claude',
              workingDir: workingDir,
              environment: projectEnv
            });
            console.log(`Registered Claude terminal with Knowledge Base: ${sessionId}`);
          } catch (error) {
            console.error('Failed to register KB session:', error);
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
          
          // Accumulate output for command result
          if (session.commandOutput === undefined) {
            session.commandOutput = '';
          }
          session.commandOutput += data;
          
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
          
          // Process output for Knowledge Base after command completes
          if (terminalKBIntegration && session.lastCommand) {
            // Detect command completion (look for prompt)
            if (data.includes('Claude>') || data.includes('$') || data.includes('#') || data.includes('>')) {
              const command = session.lastCommand;
              const output = session.commandOutput || '';
              
              // Clean ANSI codes for KB processing
              const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
              
              // Determine exit code (0 if no error patterns detected)
              const hasError = cleanOutput.match(/error|failed|exception|not found|denied/i);
              const exitCode = hasError ? 1 : 0;
              
              // Process terminal output in KB
              try {
                await terminalKBIntegration.processTerminalOutput(
                  sessionId,
                  command,
                  cleanOutput,
                  exitCode
                );
                
                // If error detected, get suggestions
                if (hasError) {
                  const suggestions = await terminalKBIntegration.getSuggestionsForError(
                    sessionId,
                    cleanOutput
                  );
                  
                  if (suggestions && suggestions.hasSuggestions) {
                    // Send suggestions to terminal
                    const message = formatKBSuggestions(suggestions);
                    shellProcess.write(`\r\n${message}\r\n`);
                  }
                }
              } catch (error) {
                console.error('Failed to process terminal output in KB:', error);
              }
              
              // Reset for next command
              session.lastCommand = null;
              session.commandOutput = '';
            }
          }
          
          // Enhanced Claude ready detection with multiple patterns
          if (!session.isClaudeReady) {
            // Check for various Claude CLI prompts and ready indicators
            const readyPatterns = [
              'Claude>', 
              'claude>',
              'Claude Code>',
              'Welcome to Claude',
              'claude code',
              'Type your message',
              'How can I help you',
              'What would you like',
              '>>>', // Python-style prompt
              'Ready', // Generic ready message
            ];
            
            const isReady = readyPatterns.some(pattern => data.toLowerCase().includes(pattern.toLowerCase()));
            
            if (isReady) {
              session.isClaudeReady = true;
              console.log('Claude CLI is ready (detected prompt)');
              
              // Send ready notification
              if (session.ws && session.ws.readyState === ws.OPEN) {
                session.ws.send(JSON.stringify({
                  type: 'claude_ready',
                  message: 'Claude CLI is now ready for commands',
                  detectedPrompt: data.trim().slice(-50) // Send last 50 chars for debugging
                }));
              }
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
          
          // Unregister from Knowledge Base
          if (terminalKBIntegration) {
            try {
              await terminalKBIntegration.unregisterSession(sessionId);
              console.log(`Unregistered KB session: ${sessionId}`);
            } catch (error) {
              console.error('Failed to unregister KB session:', error);
            }
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
        if (loadedEnvs.length > 0) {
          const envMessage = `\r\n\x1b[32m✓ Loaded Claude environment: ${loadedEnvs.join(', ')}\x1b[0m\r\n`;
          shellProcess.write(envMessage);
        }

        // Enhanced Claude CLI startup with better command handling
        setTimeout(async () => {
          console.log('Initializing Claude CLI...');
          
          try {
            // Clear any initial output and show status
            shellProcess.write('\r\n\x1b[36m╔════════════════════════════════════════╗\x1b[0m\r\n');
            shellProcess.write('\x1b[36m║  🤖 Initializing Claude Code CLI...    ║\x1b[0m\r\n');
            shellProcess.write('\x1b[36m╚════════════════════════════════════════╝\x1b[0m\r\n\r\n');
            
            // Start Claude CLI with proper command sequencing
            setTimeout(() => {
              console.log('Starting Claude CLI with enhanced startup sequence...');
              
              // First, clear the screen
              shellProcess.write('clear\r');
              
              // Wait for clear to complete, then start Claude
              setTimeout(() => {
                shellProcess.write('claude\r');
                
                // Set up a more robust ready detection
                let readyCheckInterval = setInterval(() => {
                  if (session.isClaudeReady) {
                    clearInterval(readyCheckInterval);
                    console.log('Claude CLI is confirmed ready');
                  }
                }, 500);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                  clearInterval(readyCheckInterval);
                  if (!session.isClaudeReady) {
                    console.warn('Claude CLI did not report ready state, but may still be functional');
                    // Send a test command to verify
                    shellProcess.write('\r\n');
                  }
                }, 10000);
              }, 500);
            }, 1000);
            
          } catch (error) {
            console.error('Error during Claude CLI initialization:', error);
            shellProcess.write('\r\n\x1b[31m❌ Error initializing Claude CLI. You can run "claude" manually.\x1b[0m\r\n');
          }
        }, 2000); // Give terminal time to fully initialize

      } else {
        // Reconnect to existing session
        console.log(`Reconnecting to Claude session: ${sessionKey} (ID: ${sessionId})`);
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
                        const command = session.currentCommand.trim();
                        await workspaceTerminalLogger.logCommand({
                          sessionId: session.loggingSessionId,
                          command: command,
                          workingDir: session.workingDir
                        });
                        
                        // Track command for Knowledge Base
                        if (terminalKBIntegration) {
                          session.lastCommand = command;
                          session.commandStartTime = Date.now();
                        }
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
        
        // Check close code to determine if we should keep the session alive
        // 1000 = Normal closure, 1001 = Going away (page refresh/navigation)
        // 1006 = Abnormal closure (network failure, browser crash)
        // 4000-4999 = Application-specific codes
        const isCleanClose = code === 1000 || code === 1001;
        const isCircuitBreakerClose = code >= 4000 && code <= 4099;
        
        if (isCleanClose) {
          // Clean close - end the session properly
          console.log(`Clean close for Claude session ${sessionKey}, ending session`);
          
          // End logging session if available
          if (workspaceTerminalLogger && session && session.loggingSessionId) {
            workspaceTerminalLogger.endSession(session.loggingSessionId).catch(err => {
              console.error('Failed to end logging session on close:', err);
            });
          }
          
          // Unregister from Knowledge Base
          if (terminalKBIntegration) {
            terminalKBIntegration.unregisterSession(sessionId).catch(err => {
              console.error('Failed to unregister KB session on close:', err);
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
          console.log(`Unexpected close (code ${code}) for Claude session ${sessionKey}, keeping process alive for reconnection`);
          
          // Only clean up the WebSocket connection, keep session alive
          if (session) {
            session.ws = null;
          }
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
    console.log('Cleaning up all Claude terminal sessions...');
    for (const [sessionId, session] of this.sessions) {
      // End logging session if available
      if (workspaceTerminalLogger && session.loggingSessionId) {
        workspaceTerminalLogger.endSession(session.loggingSessionId).catch(err => {
          console.error(`Failed to end logging session ${session.loggingSessionId}:`, err);
        });
      }
      
      // Unregister from Knowledge Base
      if (terminalKBIntegration) {
        terminalKBIntegration.unregisterSession(sessionId).catch(err => {
          console.error(`Failed to unregister KB session ${sessionId}:`, err);
        });
      }
      
      // Kill the process
      if (session.process) {
        session.process.kill();
      }
    }
    this.sessions.clear();
    console.log('All Claude terminal sessions cleaned up');
  }
}

// Graceful shutdown handlers
let claudeServerInstance = null;

function setupShutdownHandlers(server) {
  claudeServerInstance = server;
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n[Claude Terminal Server] Received SIGINT signal. Shutting down gracefully...');
    shutdown('SIGINT');
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('[Claude Terminal Server] Received SIGTERM signal. Shutting down gracefully...');
    shutdown('SIGTERM');
  });
  
  // Handle unexpected errors
  process.on('uncaughtException', (error) => {
    console.error('[Claude Terminal Server] Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Claude Terminal Server] Unhandled promise rejection:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

function shutdown(signal) {
  console.log(`[Claude Terminal Server] Initiating shutdown (${signal})...`);
  
  if (claudeServerInstance) {
    console.log('[Claude Terminal Server] Cleaning up all Claude terminal sessions...');
    claudeServerInstance.cleanup();
    
    console.log('[Claude Terminal Server] Closing WebSocket server...');
    claudeServerInstance.wss.close(() => {
      console.log('[Claude Terminal Server] WebSocket server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Claude Terminal Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    console.log('[Claude Terminal Server] No server instance to close');
    process.exit(0);
  }
}

module.exports = { ClaudeTerminalWebSocketServer, setupShutdownHandlers };