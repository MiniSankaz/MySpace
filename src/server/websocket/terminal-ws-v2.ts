/**
 * Terminal WebSocket Server V2
 * ใช้ clean architecture services
 * รองรับ migration จากระบบเก่า
 */

import { Server as HTTPServer } from 'http';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { migrationService } from '../../services/terminal-v2/migration/migration-service';
import { getTerminalOrchestrator } from '../../services/terminal-v2/terminal-orchestrator';
import { StreamType } from '../../services/terminal-v2/core/stream-manager.service';

interface WSConnection {
  ws: WebSocket;
  sessionId: string;
  projectId: string;
  userId: string;
  mode: 'normal' | 'claude' | 'system';
  lastActivity: Date;
}

export class TerminalWebSocketServerV2 {
  private wss: WebSocketServer;
  private connections: Map<string, WSConnection> = new Map();
  private orchestrator: any;
  private useNewSystem: boolean;
  private heartbeatInterval: NodeJS.Timeout;
  
  constructor(server: HTTPServer, options?: { path?: string; port?: number }) {
    // Initialize orchestrator
    this.orchestrator = getTerminalOrchestrator();
    
    // Check if we should use new system
    this.useNewSystem = migrationService.isFeatureEnabled('useNewWebSocket');
    
    console.log(`[WebSocket V2] Initializing - useNewSystem: ${this.useNewSystem}`);
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: options?.path || '/ws/terminal-v2',
      verifyClient: this.verifyClient.bind(this)
    });
    
    // Setup event handlers
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start heartbeat
    this.startHeartbeat();
    
    console.log(`[WebSocket V2] Server ready on path: ${options?.path || '/ws/terminal-v2'}`);
  }
  
  /**
   * Verify client connection
   */
  private async verifyClient(info: any, cb: Function) {
    try {
      const { query } = parse(info.req.url || '', true);
      
      // For now, allow all connections in development
      // In production, verify JWT token
      if (process.env.NODE_ENV === 'production') {
        const token = query.token as string || 
                     info.req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          cb(false, 401, 'Unauthorized');
          return;
        }
        
        // TODO: Verify JWT token
      }
      
      cb(true);
    } catch (error) {
      console.error('[WebSocket V2] Auth failed:', error);
      cb(false, 401, 'Unauthorized');
    }
  }
  
  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: any) {
    const { query } = parse(request.url || '', true);
    const sessionId = query.sessionId as string;
    const projectId = query.projectId as string;
    const mode = (query.mode as string) || 'normal';
    
    console.log(`[WebSocket V2] New connection - session: ${sessionId}, project: ${projectId}, mode: ${mode}`);
    
    if (!sessionId || !projectId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing sessionId or projectId'
      }));
      ws.close();
      return;
    }
    
    try {
      // Store connection
      const connection: WSConnection = {
        ws,
        sessionId,
        projectId,
        userId: query.userId as string || 'system',
        mode: mode as any,
        lastActivity: new Date()
      };
      
      this.connections.set(sessionId, connection);
      
      // Setup WebSocket handlers
      this.setupWebSocketHandlers(ws, sessionId);
      
      // If using new system, setup stream forwarding
      if (this.useNewSystem) {
        await this.setupStreamForwarding(sessionId, ws);
      }
      
      // Send connected message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        system: this.useNewSystem ? 'new' : 'legacy',
        migrationMode: migrationService.getStatus().mode
      }));
      
    } catch (error) {
      console.error(`[WebSocket V2] Connection setup failed:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to setup connection'
      }));
      ws.close();
    }
  }
  
  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(ws: WebSocket, sessionId: string) {
    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message = data.toString();
        const connection = this.connections.get(sessionId);
        
        if (!connection) {
          console.error(`[WebSocket V2] No connection found for session ${sessionId}`);
          return;
        }
        
        // Update activity
        connection.lastActivity = new Date();
        
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(message);
          await this.handleCommand(sessionId, parsed);
        } catch {
          // If not JSON, treat as terminal input
          await this.handleTerminalInput(sessionId, message);
        }
      } catch (error) {
        console.error(`[WebSocket V2] Message handling error:`, error);
      }
    });
    
    // Handle close
    ws.on('close', () => {
      console.log(`[WebSocket V2] Connection closed for session ${sessionId}`);
      this.handleDisconnection(sessionId);
    });
    
    // Handle error
    ws.on('error', (error) => {
      console.error(`[WebSocket V2] WebSocket error for session ${sessionId}:`, error);
    });
    
    // Handle pong (for heartbeat)
    ws.on('pong', () => {
      const connection = this.connections.get(sessionId);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });
  }
  
  /**
   * Handle commands from client
   */
  private async handleCommand(sessionId: string, command: any) {
    const { type, data } = command;
    
    switch (type) {
      case 'resize':
        await this.handleResize(sessionId, data);
        break;
        
      case 'ping':
        this.handlePing(sessionId);
        break;
        
      case 'focus':
        await this.handleFocus(sessionId, data?.focused);
        break;
        
      case 'input':
        await this.handleTerminalInput(sessionId, data);
        break;
        
      default:
        console.log(`[WebSocket V2] Unknown command type: ${type}`);
    }
  }
  
  /**
   * Handle terminal input
   */
  private async handleTerminalInput(sessionId: string, input: string) {
    if (this.useNewSystem) {
      // Use new orchestrator
      try {
        this.orchestrator.writeToTerminal(sessionId, input);
      } catch (error) {
        console.error(`[WebSocket V2] Failed to write to terminal:`, error);
      }
    } else {
      // Use legacy system (would need to be implemented)
      console.log(`[WebSocket V2] Legacy input handling not implemented`);
    }
  }
  
  /**
   * Handle terminal resize
   */
  private async handleResize(sessionId: string, dimensions: any) {
    const { rows, cols } = dimensions || {};
    
    if (!rows || !cols) return;
    
    if (this.useNewSystem) {
      try {
        this.orchestrator.resizeTerminal(sessionId, { rows, cols });
      } catch (error) {
        console.error(`[WebSocket V2] Failed to resize terminal:`, error);
      }
    }
  }
  
  /**
   * Handle focus change
   */
  private async handleFocus(sessionId: string, focused: boolean) {
    if (this.useNewSystem) {
      try {
        this.orchestrator.setTerminalFocus(sessionId, focused);
      } catch (error) {
        console.error(`[WebSocket V2] Failed to set focus:`, error);
      }
    }
  }
  
  /**
   * Handle ping
   */
  private handlePing(sessionId: string) {
    const connection = this.connections.get(sessionId);
    if (connection?.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
    }
  }
  
  /**
   * Setup stream forwarding from orchestrator to WebSocket
   */
  private async setupStreamForwarding(sessionId: string, ws: WebSocket) {
    // Listen to stream events from orchestrator
    this.orchestrator.on('stream:data', (data: any) => {
      if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
        // Forward terminal output to WebSocket
        ws.send(JSON.stringify({
          type: 'output',
          data: data.data
        }));
      }
    });
    
    this.orchestrator.on('stream:exit', (data: any) => {
      if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          code: data.code
        }));
      }
    });
    
    this.orchestrator.on('stream:error', (data: any) => {
      if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: data.error?.message || 'Stream error'
        }));
      }
    });
  }
  
  /**
   * Handle disconnection
   */
  private handleDisconnection(sessionId: string) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;
    
    // Remove from connections
    this.connections.delete(sessionId);
    
    // Don't close the terminal session immediately
    // It might reconnect
    console.log(`[WebSocket V2] Session ${sessionId} disconnected, keeping terminal alive`);
  }
  
  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute
      
      for (const [sessionId, connection] of this.connections) {
        const lastActivity = connection.lastActivity.getTime();
        
        if (now - lastActivity > timeout) {
          // Connection is stale
          console.log(`[WebSocket V2] Closing stale connection: ${sessionId}`);
          connection.ws.close();
          this.connections.delete(sessionId);
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          // Send ping
          connection.ws.ping();
        }
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Get connection statistics
   */
  public getStats() {
    const stats = {
      totalConnections: this.connections.size,
      byProject: new Map<string, number>(),
      byMode: {
        normal: 0,
        claude: 0,
        system: 0
      }
    };
    
    for (const connection of this.connections.values()) {
      // Count by project
      const projectCount = stats.byProject.get(connection.projectId) || 0;
      stats.byProject.set(connection.projectId, projectCount + 1);
      
      // Count by mode
      stats.byMode[connection.mode]++;
    }
    
    return stats;
  }
  
  /**
   * Cleanup
   */
  public close() {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close();
    }
    
    // Clear connections
    this.connections.clear();
    
    // Close WebSocket server
    this.wss.close();
    
    console.log('[WebSocket V2] Server closed');
  }
}

// Export factory function
export function createTerminalWebSocketServerV2(
  server: HTTPServer, 
  options?: { path?: string; port?: number }
): TerminalWebSocketServerV2 {
  return new TerminalWebSocketServerV2(server, options);
}