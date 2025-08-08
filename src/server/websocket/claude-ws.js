const WebSocket = require('ws');
const url = require('url');
const { ClaudeCodeService } = require('../services/claude-code.service');

class ClaudeWebSocketServer {
  constructor(server) {
    this.claudeService = new ClaudeCodeService();
    
    // Create WebSocket server for Claude terminals
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/claude',
      verifyClient: (info) => {
        // Parse query parameters
        const params = new URLSearchParams(info.req.url.split('?')[1]);
        const token = params.get('token');
        
        // Basic token validation (you should implement proper auth)
        if (!token) {
          console.log('Claude WebSocket: No token provided');
          return false;
        }
        
        return true;
      }
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('Claude WebSocket server initialized on /ws/claude');
  }

  handleConnection(ws, req) {
    // Parse query parameters
    const params = new URLSearchParams(req.url.split('?')[1]);
    const projectId = params.get('projectId');
    const sessionId = params.get('sessionId') || `claude-${Date.now()}`;
    let projectPath = params.get('path');
    
    // Decode and validate path
    if (projectPath) {
      try {
        projectPath = decodeURIComponent(projectPath);
        // Validate that path exists
        const fs = require('fs');
        if (!fs.existsSync(projectPath)) {
          console.warn(`Claude WebSocket: Path does not exist: ${projectPath}, using cwd`);
          projectPath = process.cwd();
        }
      } catch (error) {
        console.error('Invalid path:', error);
        projectPath = process.cwd();
      }
    } else {
      projectPath = process.cwd();
    }

    console.log(`Claude WebSocket connected: ${sessionId} for project ${projectId}`);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      message: 'Connected to Claude Code CLI',
    }));

    // Create streaming session
    let session;
    let cleanupListener;

    // Don't create session immediately - wait for first input
    const initializeSession = () => {
      if (!session) {
        try {
          session = this.claudeService.createStreamingSession(sessionId, projectPath);
          
          // Add listener for Claude output
          cleanupListener = this.claudeService.addSessionListener(sessionId, (event) => {
            if (ws.readyState === WebSocket.OPEN) {
              if (event.type === 'output') {
                ws.send(JSON.stringify({
                  type: 'stream',
                  data: event.data,
                }));
              } else if (event.type === 'error') {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: event.data,
                }));
              } else if (event.type === 'exit') {
                ws.send(JSON.stringify({
                  type: 'exit',
                  code: event.code,
                }));
                ws.close();
              }
            }
          });
          
          return true;
        } catch (error) {
          console.error('Failed to create Claude session:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to create Claude session: ${error.message}`,
          }));
          return false;
        }
      }
      return true;
    }

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'input':
            // Initialize session if needed and send input to Claude
            if (initializeSession()) {
              try {
                const parsedCommand = this.claudeService.parseCommand(data.data);
                this.claudeService.sendToSession(sessionId, parsedCommand.prompt);
              } catch (error) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: `Failed to send to Claude: ${error.message}`,
                }));
              }
            }
            break;
            
          case 'command':
            // Execute one-shot command (non-streaming)
            try {
              const parsedCommand = this.claudeService.parseCommand(data.data);
              const response = await this.claudeService.executeCommand(parsedCommand.prompt, {
                projectPath,
                sessionId,
              });
              
              ws.send(JSON.stringify({
                type: 'output',
                data: response,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `Command failed: ${error.message}`,
              }));
            }
            break;
            
          case 'ctrl':
            // Handle control characters (Ctrl+C, etc.)
            if (data.key === 'c') {
              // Kill the Claude process
              this.claudeService.closeSession(sessionId);
            }
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.warn('Unknown Claude message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling Claude message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Message handling error: ${error.message}`,
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`Claude WebSocket disconnected: ${sessionId}`);
      
      // Cleanup
      if (cleanupListener) {
        cleanupListener();
      }
      
      // Close Claude session
      this.claudeService.closeSession(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`Claude WebSocket error for ${sessionId}:`, error);
    });
  }

  closeAllSessions() {
    console.log('Closing all Claude sessions...');
    this.claudeService.closeAllSessions();
    
    // Close all WebSocket connections
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });
  }
}

module.exports = { ClaudeWebSocketServer };