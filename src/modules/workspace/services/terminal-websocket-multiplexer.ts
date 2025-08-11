import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';

interface ConnectionOptions {
  url: string;
  namespace?: string;
  auth?: Record<string, any>;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface TerminalConnection {
  sessionId: string;
  socket: Socket;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  reconnectAttempts: number;
  messageQueue: any[];
}

export class TerminalWebSocketMultiplexer extends EventEmitter {
  private connections: Map<string, TerminalConnection> = new Map();
  private primarySocket: Socket | null = null;
  private options: ConnectionOptions;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: ConnectionOptions) {
    super();
    this.options = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...options,
    };
    this.initializePrimaryConnection();
  }

  /**
   * Initialize primary WebSocket connection for control messages
   */
  private initializePrimaryConnection(): void {
    const socketUrl = this.options.namespace 
      ? `${this.options.url}/${this.options.namespace}`
      : this.options.url;

    this.primarySocket = io(socketUrl, {
      auth: this.options.auth,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.options.reconnectionAttempts,
      reconnectionDelay: this.options.reconnectionDelay,
    });

    this.setupPrimarySocketListeners();
  }

  /**
   * Setup listeners for primary socket
   */
  private setupPrimarySocketListeners(): void {
    if (!this.primarySocket) return;

    this.primarySocket.on('connect', () => {
      console.log('Primary terminal WebSocket connected');
      this.emit('primary:connected');
      
      // Reconnect all terminal sessions
      for (const [sessionId, connection] of this.connections) {
        if (connection.status === 'disconnected') {
          this.reconnectSession(sessionId);
        }
      }
    });

    this.primarySocket.on('disconnect', (reason) => {
      console.log('Primary terminal WebSocket disconnected:', reason);
      this.emit('primary:disconnected', reason);
      
      // Mark all connections as disconnected
      for (const [sessionId, connection] of this.connections) {
        this.updateConnectionStatus(sessionId, 'disconnected');
      }
    });

    this.primarySocket.on('error', (error) => {
      console.error('Primary terminal WebSocket error:', error);
      this.emit('primary:error', error);
    });

    // Handle multiplexed messages
    this.primarySocket.on('terminal:multiplex', (data) => {
      const { sessionId, type, payload } = data;
      this.handleMultiplexedMessage(sessionId, type, payload);
    });
  }

  /**
   * Create or connect to a terminal session
   */
  async connectSession(
    sessionId: string,
    projectId: string,
    type: 'system' | 'claude'
  ): Promise<void> {
    // Check if already connected
    if (this.connections.has(sessionId)) {
      const connection = this.connections.get(sessionId)!;
      if (connection.status === 'connected') {
        console.log(`Session ${sessionId} already connected`);
        return;
      }
    }

    // Create connection record
    const connection: TerminalConnection = {
      sessionId,
      socket: this.primarySocket!,
      status: 'connecting',
      lastActivity: new Date(),
      reconnectAttempts: 0,
      messageQueue: [],
    };

    this.connections.set(sessionId, connection);
    this.updateConnectionStatus(sessionId, 'connecting');

    // Send connection request
    this.primarySocket!.emit('terminal:connect', {
      sessionId,
      projectId,
      type,
    });

    // Setup session-specific listeners
    this.setupSessionListeners(sessionId);
  }

  /**
   * Setup listeners for a specific session
   */
  private setupSessionListeners(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Session connected
    this.primarySocket!.once(`terminal:connected:${sessionId}`, (data) => {
      this.updateConnectionStatus(sessionId, 'connected');
      connection.reconnectAttempts = 0;
      
      // Flush message queue
      while (connection.messageQueue.length > 0) {
        const message = connection.messageQueue.shift();
        this.sendToSession(sessionId, message.type, message.data);
      }
      
      this.emit('session:connected', { sessionId, ...data });
    });

    // Session data
    this.primarySocket!.on(`terminal:data:${sessionId}`, (data) => {
      connection.lastActivity = new Date();
      this.emit('session:data', { sessionId, data });
    });

    // Session error
    this.primarySocket!.on(`terminal:error:${sessionId}`, (error) => {
      console.error(`Terminal session ${sessionId} error:`, error);
      this.updateConnectionStatus(sessionId, 'error');
      this.emit('session:error', { sessionId, error });
    });

    // Session closed
    this.primarySocket!.on(`terminal:closed:${sessionId}`, () => {
      this.disconnectSession(sessionId);
      this.emit('session:closed', { sessionId });
    });

    // Session status updates
    this.primarySocket!.on(`terminal:status:${sessionId}`, (status) => {
      this.emit('session:status', { sessionId, status });
    });
  }

  /**
   * Send input to a terminal session
   */
  sendInput(sessionId: string, data: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      console.error(`No connection for session ${sessionId}`);
      return;
    }

    if (connection.status !== 'connected') {
      // Queue message if not connected
      connection.messageQueue.push({ type: 'input', data });
      return;
    }

    this.sendToSession(sessionId, 'input', { data });
    connection.lastActivity = new Date();
  }

  /**
   * Send command to a terminal session
   */
  sendCommand(sessionId: string, command: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      console.error(`No connection for session ${sessionId}`);
      return;
    }

    if (connection.status !== 'connected') {
      // Queue message if not connected
      connection.messageQueue.push({ type: 'command', data: command });
      return;
    }

    this.sendToSession(sessionId, 'command', { command });
    connection.lastActivity = new Date();
  }

  /**
   * Resize terminal session
   */
  resizeSession(sessionId: string, cols: number, rows: number): void {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.status !== 'connected') {
      return;
    }

    this.sendToSession(sessionId, 'resize', { cols, rows });
  }

  /**
   * Clear terminal session
   */
  clearSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.status !== 'connected') {
      return;
    }

    this.sendToSession(sessionId, 'clear', {});
  }

  /**
   * Send message to specific session
   */
  private sendToSession(sessionId: string, type: string, data: any): void {
    if (!this.primarySocket || !this.primarySocket.connected) {
      console.error('Primary socket not connected');
      return;
    }

    this.primarySocket.emit('terminal:multiplex', {
      sessionId,
      type,
      data,
    });
  }

  /**
   * Handle multiplexed message from server
   */
  private handleMultiplexedMessage(sessionId: string, type: string, payload: any): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    switch (type) {
      case 'data':
        this.emit('session:data', { sessionId, data: payload });
        break;
      case 'status':
        this.emit('session:status', { sessionId, status: payload });
        break;
      case 'error':
        this.emit('session:error', { sessionId, error: payload });
        break;
      case 'closed':
        this.disconnectSession(sessionId);
        break;
      default:
        this.emit(`session:${type}`, { sessionId, ...payload });
    }
  }

  /**
   * Reconnect a disconnected session
   */
  private reconnectSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    if (connection.reconnectAttempts >= this.options.reconnectionAttempts!) {
      console.error(`Max reconnection attempts reached for session ${sessionId}`);
      this.updateConnectionStatus(sessionId, 'error');
      this.emit('session:reconnect-failed', { sessionId });
      return;
    }

    connection.reconnectAttempts++;
    this.updateConnectionStatus(sessionId, 'connecting');

    const delay = this.options.reconnectionDelay! * Math.pow(2, connection.reconnectAttempts - 1);
    
    const timer = setTimeout(() => {
      if (!this.primarySocket || !this.primarySocket.connected) {
        // Wait for primary socket to reconnect
        this.reconnectSession(sessionId);
        return;
      }

      this.primarySocket.emit('terminal:reconnect', { sessionId });
      this.reconnectTimers.delete(sessionId);
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
  }

  /**
   * Disconnect a terminal session (UI disconnection, but keep process alive)
   */
  disconnectSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    // Mark as disconnected but keep connection record for background processing
    connection.status = 'disconnected';

    // Remove session-specific listeners for UI
    if (this.primarySocket) {
      this.primarySocket.off(`terminal:connected:${sessionId}`);
      this.primarySocket.off(`terminal:data:${sessionId}`);
      this.primarySocket.off(`terminal:error:${sessionId}`);
      this.primarySocket.off(`terminal:closed:${sessionId}`);
      this.primarySocket.off(`terminal:status:${sessionId}`);
      
      // Send UI disconnect message but keep session alive on server
      if (this.primarySocket.connected) {
        this.primarySocket.emit('terminal:ui-disconnect', { sessionId });
      }
    }

    this.emit('session:disconnected', { sessionId });
  }

  /**
   * Permanently close a terminal session (kills the process)
   */
  closeSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    // Remove session-specific listeners
    if (this.primarySocket) {
      this.primarySocket.off(`terminal:connected:${sessionId}`);
      this.primarySocket.off(`terminal:data:${sessionId}`);
      this.primarySocket.off(`terminal:error:${sessionId}`);
      this.primarySocket.off(`terminal:closed:${sessionId}`);
      this.primarySocket.off(`terminal:status:${sessionId}`);
      
      // Send permanent close message
      if (this.primarySocket.connected) {
        this.primarySocket.emit('terminal:close', { sessionId });
      }
    }

    // Remove connection completely
    this.connections.delete(sessionId);
    this.emit('session:closed', { sessionId });
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(
    sessionId: string,
    status: 'connecting' | 'connected' | 'disconnected' | 'error'
  ): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.status = status;
      this.emit('session:status-changed', { sessionId, status });
    }
  }

  /**
   * Get connection status for a session
   */
  getSessionStatus(sessionId: string): string | null {
    const connection = this.connections.get(sessionId);
    return connection ? connection.status : null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalConnections: number;
    connectedSessions: number;
    disconnectedSessions: number;
    queuedMessages: number;
  } {
    let connectedSessions = 0;
    let disconnectedSessions = 0;
    let queuedMessages = 0;

    for (const connection of this.connections.values()) {
      if (connection.status === 'connected') {
        connectedSessions++;
      } else if (connection.status === 'disconnected') {
        disconnectedSessions++;
      }
      queuedMessages += connection.messageQueue.length;
    }

    return {
      totalConnections: this.connections.size,
      connectedSessions,
      disconnectedSessions,
      queuedMessages,
    };
  }

  /**
   * Cleanup and disconnect all sessions
   */
  destroy(): void {
    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Only disconnect UI, don't close sessions (preserve background processes)
    for (const sessionId of this.connections.keys()) {
      this.disconnectSession(sessionId);
    }

    // Disconnect primary socket
    if (this.primarySocket) {
      this.primarySocket.disconnect();
      this.primarySocket = null;
    }

    this.removeAllListeners();
  }

  /**
   * Force close all sessions (for shutdown)
   */
  forceCloseAllSessions(): void {
    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Permanently close all sessions
    for (const sessionId of this.connections.keys()) {
      this.closeSession(sessionId);
    }

    // Disconnect primary socket
    if (this.primarySocket) {
      this.primarySocket.disconnect();
      this.primarySocket = null;
    }

    this.removeAllListeners();
  }
}

// Factory function to create multiplexer instance
export function createTerminalMultiplexer(options: ConnectionOptions): TerminalWebSocketMultiplexer {
  return new TerminalWebSocketMultiplexer(options);
}