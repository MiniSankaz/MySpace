import { EventEmitter } from 'events';
import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';
import { 
  CircuitBreakerConfig, 
  CircuitBreakerState, 
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  SessionValidator 
} from '../types/terminal.types';

interface ConnectionOptions {
  url: string;
  namespace?: string;
  auth?: Record<string, any>;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

interface TerminalConnection {
  sessionId: string;
  socket: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  reconnectAttempts: number;
  messageQueue: any[];
  type: 'system' | 'claude';
  projectId: string;
  circuitBreaker: CircuitBreaker;
  mode: 'active' | 'background'; // Connection mode for focus-based streaming
  outputBuffer: string[]; // Buffer for background mode output
}

/**
 * Circuit Breaker implementation to prevent infinite reconnection loops
 * Tracks failures and opens the circuit when threshold is exceeded
 */
class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private failureTimes: Date[] = [];
  private stateChangeCallback?: (state: CircuitBreakerState) => void;

  constructor(config?: CircuitBreakerConfig, onStateChange?: (state: CircuitBreakerState) => void) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: null,
      nextRetryTime: null
    };
    this.stateChangeCallback = onStateChange;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      // Success in half-open state closes the circuit
      this.changeState('closed');
      this.failureTimes = [];
      this.state.failures = 0;
      this.state.lastFailureTime = null;
      console.log('[CircuitBreaker] Circuit closed after successful recovery');
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    const now = new Date();
    this.failureTimes.push(now);
    this.state.lastFailureTime = now;
    
    // Remove failures outside the time window
    const windowStart = new Date(now.getTime() - this.config.failureWindow);
    this.failureTimes = this.failureTimes.filter(time => time > windowStart);
    
    this.state.failures = this.failureTimes.length;
    
    // Check if we should open the circuit
    if (this.state.failures >= this.config.failureThreshold && this.state.state === 'closed') {
      this.changeState('open');
      this.state.nextRetryTime = new Date(now.getTime() + this.config.recoveryTimeout);
      console.log(`[CircuitBreaker] Circuit opened after ${this.state.failures} failures. Next retry at ${this.state.nextRetryTime.toISOString()}`);
    }
  }

  /**
   * Check if an operation should be allowed
   */
  shouldAllow(): boolean {
    const now = new Date();
    
    switch (this.state.state) {
      case 'closed':
        return true;
        
      case 'open':
        // Check if recovery timeout has passed
        if (this.state.nextRetryTime && now >= this.state.nextRetryTime) {
          this.changeState('half-open');
          console.log('[CircuitBreaker] Circuit entering half-open state for testing');
          return true;
        }
        return false;
        
      case 'half-open':
        // Allow one attempt in half-open state
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Calculate backoff delay based on attempt number
   */
  getBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.reconnectBaseDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, this.config.reconnectMaxDelay);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.changeState('closed');
    this.failureTimes = [];
    this.state.failures = 0;
    this.state.lastFailureTime = null;
    this.state.nextRetryTime = null;
  }

  private changeState(newState: 'closed' | 'open' | 'half-open'): void {
    const oldState = this.state.state;
    this.state.state = newState;
    if (oldState !== newState && this.stateChangeCallback) {
      this.stateChangeCallback(this.state);
    }
  }
}

export class TerminalWebSocketMultiplexer extends EventEmitter {
  private connections: Map<string, TerminalConnection> = new Map();
  private options: ConnectionOptions;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: boolean = false;

  constructor(options: ConnectionOptions) {
    super();
    this.options = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      circuitBreakerConfig: DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...options,
    };
    this.initializePrimaryConnection();
  }

  /**
   * Initialize multiplexer (no primary socket needed for standalone servers)
   */
  private initializePrimaryConnection(): void {
    console.log('Terminal WebSocket Multiplexer initialized for standalone servers');
    // For standalone WebSocket servers, we don't need a primary socket
    // Each session will connect directly to its respective standalone server
  }

  /**
   * Setup listeners for primary socket (not needed for standalone servers)
   */
  private setupPrimarySocketListeners(): void {
    // Not needed for standalone WebSocket servers
    console.log('Using standalone WebSocket servers - no primary socket needed');
    this.emit('primary:connected');
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
      if (connection.status === 'connected' && connection.socket?.readyState === WebSocket.OPEN) {
        console.log(`Session ${sessionId} already connected`);
        return;
      } else {
        // Clean up existing connection and reset circuit breaker for new session
        console.log(`[${sessionId}] Cleaning up old connection and resetting circuit breaker`);
        this.cleanupConnection(sessionId);
        // Remove from connections to force fresh start
        this.connections.delete(sessionId);
      }
    }

    // Validate session ID format
    if (!SessionValidator.isValidSessionId(sessionId)) {
      console.error(`Invalid session ID format: ${sessionId}. Expected format: session_{timestamp}_{random}`);
      // Generate a new valid session ID instead
      const newSessionId = SessionValidator.generateSessionId();
      console.log(`Generated new valid session ID: ${newSessionId}`);
      sessionId = newSessionId;
    }

    // Create fresh circuit breaker for this connection
    // Always start with a clean state for new sessions
    const circuitBreaker = new CircuitBreaker(
      this.options.circuitBreakerConfig,
      (state) => {
        console.log(`[${sessionId}] Circuit breaker state changed:`, state);
        this.emit('session:circuit-breaker', { sessionId, state });
      }
    );
    console.log(`[${sessionId}] Created new circuit breaker with clean state`);

    // Create connection record
    const connection: TerminalConnection = {
      sessionId,
      socket: null,
      status: 'connecting',
      lastActivity: new Date(),
      reconnectAttempts: 0,
      messageQueue: [],
      type,
      projectId,
      circuitBreaker,
      mode: 'background', // Start in background mode by default
      outputBuffer: [], // Initialize empty output buffer
    };

    this.connections.set(sessionId, connection);
    this.updateConnectionStatus(sessionId, 'connecting');

    // Connect to appropriate standalone server
    await this.createWebSocketConnection(sessionId, projectId, type);
  }

  /**
   * Create WebSocket connection to standalone server
   */
  private async createWebSocketConnection(
    sessionId: string,
    projectId: string,
    type: 'system' | 'claude'
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Check circuit breaker before attempting connection
    if (!connection.circuitBreaker.shouldAllow()) {
      const cbState = connection.circuitBreaker.getState();
      console.warn(`[${sessionId}] Circuit breaker is OPEN. Not attempting connection. Next retry: ${cbState.nextRetryTime}`);
      this.updateConnectionStatus(sessionId, 'error');
      this.emit('session:circuit-open', { sessionId, state: cbState });
      
      // Schedule a retry when circuit might be ready
      if (cbState.nextRetryTime) {
        const delay = cbState.nextRetryTime.getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => this.scheduleReconnect(sessionId), delay);
        }
      }
      return;
    }

    const token = this.options.auth?.token || localStorage.getItem('accessToken');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Determine the correct port based on terminal type
    const port = type === 'system' ? 'terminalConfig.websocket.port' : 'terminalConfig.websocket.claudePort';
    const wsHost = `127.0.0.1:${port}`;
    
    const params = new URLSearchParams({
      projectId,
      token: token || '',
      sessionId: sessionId,
      path: process.cwd(), // You might want to get this from project context
    });

    const wsUrl = `${protocol}//${wsHost}/?${params.toString()}`;
    console.log(`Connecting to ${type} terminal WebSocket:`, wsUrl);
    
    const websocket = new WebSocket(wsUrl);
    connection.socket = websocket;

    // Setup WebSocket event handlers
    websocket.onopen = () => {
      console.log(`${type} terminal WebSocket connected for session ${sessionId}`);
      this.updateConnectionStatus(sessionId, 'connected');
      connection.reconnectAttempts = 0;
      
      // Record success in circuit breaker
      connection.circuitBreaker.recordSuccess();
      
      // Flush message queue
      while (connection.messageQueue.length > 0) {
        const message = connection.messageQueue.shift();
        this.sendToSession(sessionId, message.type, message.data);
      }
      
      this.emit('session:connected', { sessionId, type });
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        connection.lastActivity = new Date();
        
        // Handle output based on connection mode
        if (message.type === 'stream' || message.type === 'data') {
          if (connection.mode === 'active') {
            // Active mode: emit data immediately for real-time streaming
            this.emit('session:data', { sessionId, data: message.data });
          } else {
            // Background mode: buffer output
            connection.outputBuffer.push(message.data);
            
            // Keep buffer size manageable (last 500 entries)
            if (connection.outputBuffer.length > 500) {
              connection.outputBuffer = connection.outputBuffer.slice(-500);
            }
            
            // Emit background activity event
            this.emit('session:background-activity', { sessionId, data: message.data });
          }
        }
        
        switch (message.type) {
          case 'connected':
          case 'reconnected':
            this.emit('session:connected', { sessionId, ...message });
            break;
          case 'stream':
          case 'history':
            this.emit('session:data', { sessionId, data: message.data });
            break;
          case 'exit':
            this.emit('session:data', { sessionId, data: `\r\n\x1b[33m[Process exited with code ${message.code}]\x1b[0m\r\n` });
            break;
          case 'error':
            this.emit('session:error', { sessionId, error: message.message });
            break;
          default:
            this.emit(`session:${message.type}`, { sessionId, ...message });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.emit('session:error', { sessionId, error: 'Failed to parse message' });
      }
    };

    websocket.onerror = (error) => {
      console.error(`${type} WebSocket error for session ${sessionId}:`, error);
      this.updateConnectionStatus(sessionId, 'error');
      
      // Record failure in circuit breaker
      connection.circuitBreaker.recordFailure();
      
      this.emit('session:error', { sessionId, error: 'WebSocket connection error' });
    };

    websocket.onclose = (event) => {
      console.log(`${type} WebSocket closed for session ${sessionId}:`, event.code, event.reason);
      this.updateConnectionStatus(sessionId, 'disconnected');
      this.emit('session:disconnected', { sessionId, code: event.code, reason: event.reason });
      
      // Check for circuit breaker triggered codes (process.env.PORT || 4000-4099)
      const isCircuitBreakerClose = event.code >= process.env.PORT || 4000 && event.code <= 4099;
      
      // Record failure in circuit breaker
      if (event.code === 1005 || event.code === 1006) {
        connection.circuitBreaker.recordFailure();
      }
      
      // Only attempt reconnection if:
      // 1. Not shutting down
      // 2. Not a clean closure (1000 = normal closure, 1001 = going away)
      // 3. Not a circuit breaker triggered close
      // 4. Not a server error that indicates session doesn't exist (1005 can be ambiguous)
      if (!this.isShuttingDown && event.code !== 1000 && event.code !== 1001 && !isCircuitBreakerClose) {
        // For code 1005 (no status code), check if we should reconnect
        if (event.code === 1005) {
          // Check circuit breaker state before attempting reconnection
          if (!connection.circuitBreaker.shouldAllow()) {
            const cbState = connection.circuitBreaker.getState();
            console.warn(`[${sessionId}] Circuit breaker open after ${cbState.failures} failures. Stopping reconnection.`);
            this.emit('session:circuit-open', { sessionId, state: cbState });
            
            // Close with circuit breaker code to signal backend
            if (connection.socket && connection.socket.readyState !== WebSocket.CLOSED) {
              connection.socket.close(terminalConfig.websocket.port, 'Circuit breaker triggered');
            }
            return;
          }
          
          // If we're getting repeated 1005 errors, it might mean the session doesn't exist on server
          if (connection.reconnectAttempts >= 2) {
            console.warn(`Session ${sessionId} repeatedly failing with code 1005, stopping reconnection`);
            this.emit('session:closed', { sessionId, code: event.code, reason: 'Session not found on server' });
            
            // Close with error code to signal backend
            if (connection.socket && connection.socket.readyState !== WebSocket.CLOSED) {
              connection.socket.close(terminalConfig.websocket.claudePort, 'Session not found');
            }
            return;
          }
        }
        this.scheduleReconnect(sessionId);
      } else {
        if (isCircuitBreakerClose) {
          console.log(`Session ${sessionId} closed by circuit breaker (code ${event.code}), not reconnecting`);
        } else {
          console.log(`Session ${sessionId} closed cleanly or during shutdown, not reconnecting`);
        }
      }
    };
  }

  /**
   * Set session mode (active or background)
   */
  setSessionMode(sessionId: string, mode: 'active' | 'background'): void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      console.warn(`Cannot set mode for non-existent session ${sessionId}`);
      return;
    }

    const oldMode = connection.mode;
    connection.mode = mode;
    
    console.log(`[${sessionId}] Mode changed from ${oldMode} to ${mode}`);
    
    // If switching from background to active, flush buffered output
    if (oldMode === 'background' && mode === 'active' && connection.outputBuffer.length > 0) {
      console.log(`[${sessionId}] Flushing ${connection.outputBuffer.length} buffered entries`);
      
      // Emit all buffered output
      connection.outputBuffer.forEach(data => {
        this.emit('session:data', { sessionId, data });
      });
      
      // Clear the buffer
      connection.outputBuffer = [];
      
      // Emit buffer flush event
      this.emit('session:buffer-flushed', { sessionId });
    }
    
    // Emit mode change event
    this.emit('session:mode-changed', { sessionId, mode, oldMode });
  }

  /**
   * Get session mode
   */
  getSessionMode(sessionId: string): 'active' | 'background' | null {
    const connection = this.connections.get(sessionId);
    return connection ? connection.mode : null;
  }

  /**
   * Get buffered output for a session
   */
  getBufferedOutput(sessionId: string): string[] {
    const connection = this.connections.get(sessionId);
    return connection ? [...connection.outputBuffer] : [];
  }

  /**
   * Clear buffered output for a session
   */
  clearBufferedOutput(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.outputBuffer = [];
      this.emit('session:buffer-cleared', { sessionId });
    }
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

    if (connection.status !== 'connected' || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      connection.messageQueue.push({ type: 'input', data });
      return;
    }

    connection.socket.send(JSON.stringify({ type: 'input', data }));
    connection.lastActivity = new Date();
  }

  /**
   * Send command to a terminal session
   */
  sendCommand(sessionId: string, command: string): void {
    // For standalone servers, send as input with carriage return
    this.sendInput(sessionId, command + '\r');
  }

  /**
   * Resize terminal session
   */
  resizeSession(sessionId: string, cols: number, rows: number): void {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.status !== 'connected' || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    connection.socket.send(JSON.stringify({ type: 'resize', cols, rows }));
  }

  /**
   * Clear terminal session
   */
  clearSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.status !== 'connected' || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send clear command (Ctrl+L)
    connection.socket.send(JSON.stringify({ type: 'input', data: '\x0c' }));
  }

  /**
   * Clean up connection resources
   */
  private cleanupConnection(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    // Close WebSocket if exists
    if (connection.socket && connection.socket.readyState !== WebSocket.CLOSED) {
      connection.socket.close();
    }
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
   * Schedule reconnection for a disconnected session
   */
  private scheduleReconnect(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Don't reconnect if we're shutting down
    if (this.isShuttingDown) {
      console.log(`Not reconnecting session ${sessionId} - shutting down`);
      return;
    }

    // Check circuit breaker state
    if (!connection.circuitBreaker.shouldAllow()) {
      const cbState = connection.circuitBreaker.getState();
      console.warn(`[${sessionId}] Circuit breaker preventing reconnection. State: ${cbState.state}`);
      this.emit('session:circuit-open', { sessionId, state: cbState });
      
      // Schedule retry when circuit might allow
      if (cbState.nextRetryTime) {
        const delay = cbState.nextRetryTime.getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => this.scheduleReconnect(sessionId), delay);
        }
      }
      return;
    }

    if (connection.reconnectAttempts >= this.options.reconnectionAttempts!) {
      console.error(`Max reconnection attempts reached for session ${sessionId}`);
      this.updateConnectionStatus(sessionId, 'error');
      
      // Record final failure in circuit breaker
      connection.circuitBreaker.recordFailure();
      
      this.emit('session:reconnect-failed', { sessionId });
      // Clean up the failed session
      this.closeSession(sessionId);
      return;
    }

    connection.reconnectAttempts++;
    this.updateConnectionStatus(sessionId, 'connecting');
    this.emit('session:reconnecting', { sessionId, attempt: connection.reconnectAttempts });

    // Use circuit breaker's backoff delay calculation
    const delay = connection.circuitBreaker.getBackoffDelay(connection.reconnectAttempts);
    console.log(`Scheduling reconnect for session ${sessionId} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
    
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(sessionId);
      
      // Check again if we should reconnect
      if (this.isShuttingDown) {
        console.log(`Cancelling reconnect for session ${sessionId} - shutting down`);
        return;
      }
      
      // Clean up old connection
      this.cleanupConnection(sessionId);
      
      // Attempt reconnection
      try {
        await this.createWebSocketConnection(sessionId, connection.projectId, connection.type);
      } catch (error) {
        console.error(`Reconnection failed for session ${sessionId}:`, error);
        this.scheduleReconnect(sessionId);
      }
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
  }

  /**
   * Disconnect a terminal session (UI disconnection, but keep process alive)
   */
  disconnectSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    console.log(`Disconnecting UI for session ${sessionId} (keeping process alive)`);

    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    // Keep connection record for background processing but close WebSocket
    // The standalone servers will keep the shell process alive
    if (connection.socket && connection.socket.readyState !== WebSocket.CLOSED) {
      connection.socket.close(1000, 'UI disconnect'); // Normal closure
    }
    
    connection.socket = null;
    connection.status = 'disconnected';

    this.emit('session:disconnected', { sessionId });
  }

  /**
   * Permanently close a terminal session (kills the process)
   */
  closeSession(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    console.log(`Permanently closing session ${sessionId}`);

    // Reset circuit breaker before closing to allow fresh start
    connection.circuitBreaker.reset();
    console.log(`[${sessionId}] Circuit breaker reset on session close`);

    // Send close signal to backend with proper code
    // Code 1000 = Normal closure, which tells backend to kill the process
    if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close(1000, 'Session closed by user');
    }

    // Clean up connection resources
    this.cleanupConnection(sessionId);

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
    circuitBreakerStates: { [key: string]: CircuitBreakerState };
    activeSessions: number;
    backgroundSessions: number;
    totalBufferedEntries: number;
  } {
    let connectedSessions = 0;
    let disconnectedSessions = 0;
    let queuedMessages = 0;
    let activeSessions = 0;
    let backgroundSessions = 0;
    let totalBufferedEntries = 0;
    const circuitBreakerStates: { [key: string]: CircuitBreakerState } = {};

    for (const [sessionId, connection] of this.connections.entries()) {
      if (connection.status === 'connected') {
        connectedSessions++;
      } else if (connection.status === 'disconnected') {
        disconnectedSessions++;
      }
      
      queuedMessages += connection.messageQueue.length;
      totalBufferedEntries += connection.outputBuffer.length;
      
      if (connection.mode === 'active') {
        activeSessions++;
      } else {
        backgroundSessions++;
      }
      
      circuitBreakerStates[sessionId] = connection.circuitBreaker.getState();
    }

    return {
      totalConnections: this.connections.size,
      connectedSessions,
      disconnectedSessions,
      queuedMessages,
      circuitBreakerStates,
      activeSessions,
      backgroundSessions,
      totalBufferedEntries,
    };
  }

  /**
   * Reset circuit breaker for a specific session
   */
  resetCircuitBreaker(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.circuitBreaker.reset();
      console.log(`[${sessionId}] Circuit breaker reset`);
      this.emit('session:circuit-reset', { sessionId });
    }
  }

  /**
   * Cleanup and disconnect all sessions
   */
  destroy(): void {
    this.isShuttingDown = true;
    
    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Only disconnect UI, don't close sessions (preserve background processes)
    for (const sessionId of this.connections.keys()) {
      this.disconnectSession(sessionId);
    }

    this.removeAllListeners();
  }

  /**
   * Force close all sessions (for shutdown)
   */
  forceCloseAllSessions(): void {
    this.isShuttingDown = true;
    
    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Permanently close all sessions
    for (const sessionId of this.connections.keys()) {
      this.closeSession(sessionId);
    }

    this.removeAllListeners();
  }
}

// Factory function to create multiplexer instance
export function createTerminalMultiplexer(options: ConnectionOptions): TerminalWebSocketMultiplexer {
  return new TerminalWebSocketMultiplexer(options);
}