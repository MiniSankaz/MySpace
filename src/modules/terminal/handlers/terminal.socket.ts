import { Server, Socket } from 'socket.io';
import { terminalService } from '../services/terminal.service';
import { verifyAuth } from '@/modules/ums/middleware/auth';

interface TerminalData {
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  command?: string;
}

export function initTerminalSocket(io: Server) {
  const terminalNamespace = io.of('/terminal');

  // Middleware for authentication
  terminalNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token (you'll need to adapt this to your auth system)
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') {
              return `Bearer ${token}`;
            }
            return null;
          }
        }
      } as any;

      const authResult = await verifyAuth(mockRequest);
      if (!authResult.authenticated) {
        return next(new Error('Invalid token'));
      }

      // Attach user info to socket
      (socket as any).userId = authResult.userId;
      (socket as any).userRoles = authResult.roles;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  terminalNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRoles = (socket as any).userRoles || [];
    
    console.log(`Terminal WebSocket connected: ${socket.id} (User: ${userId})`);

    let currentSessionId: string | null = null;

    // Create new terminal session
    socket.on('terminal:create', async (data: TerminalData) => {
      try {
        // Check if user has permission (optional: require admin role)
        // if (!userRoles.includes('admin')) {
        //   socket.emit('terminal:error', { error: 'Permission denied' });
        //   return;
        // }

        const { cols = 80, rows = 24 } = data;
        
        try {
          const sessionId = terminalService.createSession(userId, cols, rows);
          
          currentSessionId = sessionId;
          socket.join(sessionId); // Join room for this session

          // Listen for terminal output
          const dataHandler = (sid: string, output: string) => {
            if (sid === sessionId) {
              socket.emit('terminal:data', { sessionId, data: output });
            }
          };

          const closeHandler = (sid: string) => {
            if (sid === sessionId) {
              socket.emit('terminal:closed', { sessionId });
              terminalService.removeListener('data', dataHandler);
              terminalService.removeListener('session-closed', closeHandler);
            }
          };

          terminalService.on('data', dataHandler);
          terminalService.on('session-closed', closeHandler);

          socket.emit('terminal:created', { sessionId });
          
          console.log(`Terminal session created: ${sessionId}`);
        } catch (ptyError: any) {
          console.error('PTY creation error:', ptyError);
          // Send more specific error message to client
          socket.emit('terminal:error', { 
            error: `Failed to create terminal: ${ptyError.message}. This might be due to platform compatibility issues with node-pty.`
          });
        }
      } catch (error: any) {
        console.error('Error creating terminal session:', error);
        socket.emit('terminal:error', { error: error.message || 'Unknown error creating terminal session' });
      }
    });

    // Connect to existing session
    socket.on('terminal:connect', (data: TerminalData) => {
      try {
        const { sessionId } = data;
        if (!sessionId) {
          socket.emit('terminal:error', { error: 'Session ID required' });
          return;
        }

        const session = terminalService.getSession(sessionId);
        if (!session) {
          socket.emit('terminal:error', { error: 'Session not found' });
          return;
        }

        // Check if user owns this session
        if (session.userId !== userId && !userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        currentSessionId = sessionId;
        socket.join(sessionId);

        // Listen for terminal output
        const dataHandler = (sid: string, output: string) => {
          if (sid === sessionId) {
            socket.emit('terminal:data', { sessionId, data: output });
          }
        };

        const closeHandler = (sid: string) => {
          if (sid === sessionId) {
            socket.emit('terminal:closed', { sessionId });
            terminalService.removeListener('data', dataHandler);
            terminalService.removeListener('session-closed', closeHandler);
          }
        };

        terminalService.on('data', dataHandler);
        terminalService.on('session-closed', closeHandler);

        socket.emit('terminal:connected', { 
          sessionId,
          cols: session.cols,
          rows: session.rows
        });

        console.log(`Connected to terminal session: ${sessionId}`);
      } catch (error: any) {
        console.error('Error connecting to terminal session:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Send input to terminal
    socket.on('terminal:input', (data: TerminalData) => {
      try {
        const sessionId = data.sessionId || currentSessionId;
        if (!sessionId || !data.data) {
          socket.emit('terminal:error', { error: 'Session ID and data required' });
          return;
        }

        const session = terminalService.getSession(sessionId);
        if (!session) {
          socket.emit('terminal:error', { error: 'Session not found' });
          return;
        }

        // Check permission
        if (session.userId !== userId && !userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        const success = terminalService.writeToSession(sessionId, data.data);
        if (!success) {
          socket.emit('terminal:error', { error: 'Failed to write to terminal' });
        }
      } catch (error: any) {
        console.error('Error writing to terminal:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Resize terminal
    socket.on('terminal:resize', (data: TerminalData) => {
      try {
        const sessionId = data.sessionId || currentSessionId;
        if (!sessionId || !data.cols || !data.rows) {
          socket.emit('terminal:error', { error: 'Session ID, cols, and rows required' });
          return;
        }

        const session = terminalService.getSession(sessionId);
        if (!session) {
          socket.emit('terminal:error', { error: 'Session not found' });
          return;
        }

        // Check permission
        if (session.userId !== userId && !userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        const success = terminalService.resizeSession(sessionId, data.cols, data.rows);
        if (success) {
          socket.emit('terminal:resized', { sessionId, cols: data.cols, rows: data.rows });
        } else {
          socket.emit('terminal:error', { error: 'Failed to resize terminal' });
        }
      } catch (error: any) {
        console.error('Error resizing terminal:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Execute command and get output
    socket.on('terminal:execute', async (data: TerminalData) => {
      try {
        const sessionId = data.sessionId || currentSessionId;
        if (!sessionId || !data.command) {
          socket.emit('terminal:error', { error: 'Session ID and command required' });
          return;
        }

        const session = terminalService.getSession(sessionId);
        if (!session) {
          socket.emit('terminal:error', { error: 'Session not found' });
          return;
        }

        // Check permission
        if (session.userId !== userId && !userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        const output = await terminalService.executeCommand(sessionId, data.command);
        socket.emit('terminal:executed', { sessionId, command: data.command, output });
      } catch (error: any) {
        console.error('Error executing command:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Close terminal session
    socket.on('terminal:close', (data: TerminalData) => {
      try {
        const sessionId = data.sessionId || currentSessionId;
        if (!sessionId) {
          socket.emit('terminal:error', { error: 'Session ID required' });
          return;
        }

        const session = terminalService.getSession(sessionId);
        if (!session) {
          socket.emit('terminal:error', { error: 'Session not found' });
          return;
        }

        // Check permission
        if (session.userId !== userId && !userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        const success = terminalService.destroySession(sessionId);
        if (success) {
          socket.leave(sessionId);
          socket.emit('terminal:closed', { sessionId });
          if (currentSessionId === sessionId) {
            currentSessionId = null;
          }
        } else {
          socket.emit('terminal:error', { error: 'Failed to close terminal' });
        }
      } catch (error: any) {
        console.error('Error closing terminal:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // List user sessions
    socket.on('terminal:list', () => {
      try {
        const sessions = terminalService.getUserSessions(userId);
        const sessionList = sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
          cols: s.cols,
          rows: s.rows
        }));
        
        socket.emit('terminal:sessions', { sessions: sessionList });
      } catch (error: any) {
        console.error('Error listing sessions:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Get statistics (admin only)
    socket.on('terminal:stats', () => {
      try {
        if (!userRoles.includes('admin')) {
          socket.emit('terminal:error', { error: 'Permission denied' });
          return;
        }

        const stats = terminalService.getStatistics();
        socket.emit('terminal:statistics', stats);
      } catch (error: any) {
        console.error('Error getting statistics:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Terminal WebSocket disconnected: ${socket.id}`);
      
      // Clean up listeners
      terminalService.removeAllListeners('data');
      terminalService.removeAllListeners('session-closed');
      
      // Optionally close session on disconnect
      // if (currentSessionId) {
      //   terminalService.destroySession(currentSessionId);
      // }
    });
  });

  return terminalNamespace;
}