/**
 * StreamManager Service
 * Manages WebSocket connections and terminal process streams
 * Clean Architecture - Infrastructure Service
 */

import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import WebSocket from 'ws';
import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';

// Stream interfaces
export interface StreamConnection {
  sessionId: string;
  type: StreamType;
  status: StreamStatus;
  process?: pty.IPty;
  websocket?: WebSocket;
  buffer: CircularBuffer;
  metrics: StreamMetrics;
}

export enum StreamType {
  TERMINAL = 'terminal',
  CLAUDE = 'claude',
  SYSTEM = 'system'
}

export enum StreamStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface StreamMetrics {
  bytesIn: number;
  bytesOut: number;
  messagesIn: number;
  messagesOut: number;
  latency: number;
  connectTime?: Date;
  disconnectTime?: Date;
}

class CircularBuffer {
  private buffer: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  push(data: string): void {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll(): string[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

/**
 * StreamManager - Handles all streaming I/O
 * Manages WebSocket connections and terminal processes
 */
export class StreamManager extends EventEmitter {
  private streams: Map<string, StreamConnection> = new Map();
  private processes: Map<string, pty.IPty> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  
  // Configuration
  private readonly BUFFER_SIZE = terminalConfig.suspension.bufferedOutputLimit;
  private readonly RECONNECT_ATTEMPTS = terminalConfig.websocket.reconnectAttempts;
  private readonly RECONNECT_DELAY = terminalConfig.websocket.reconnectDelay;

  constructor() {
    super();
    this.setupHealthCheck();
  }

  /**
   * Create a terminal stream
   */
  public createTerminalStream(params: {
    sessionId: string;
    workingDirectory: string;
    dimensions?: { rows: number; cols: number };
    environment?: Record<string, string>;
  }): StreamConnection {
    // Create PTY process
    const ptyProcess = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
      name: 'xterm-color',
      cols: params.dimensions?.cols || 80,
      rows: params.dimensions?.rows || 24,
      cwd: params.workingDirectory,
      env: { ...process.env, ...params.environment }
    });
    
    // Create stream connection
    const stream: StreamConnection = {
      sessionId: params.sessionId,
      type: StreamType.TERMINAL,
      status: StreamStatus.CONNECTED,
      process: ptyProcess,
      buffer: new CircularBuffer(this.BUFFER_SIZE),
      metrics: {
        bytesIn: 0,
        bytesOut: 0,
        messagesIn: 0,
        messagesOut: 0,
        latency: 0,
        connectTime: new Date()
      }
    };
    
    // Store references
    this.streams.set(params.sessionId, stream);
    this.processes.set(params.sessionId, ptyProcess);
    
    // Setup event handlers
    this.setupProcessHandlers(params.sessionId, ptyProcess);
    
    // Emit event
    this.emit('stream:created', { sessionId: params.sessionId, type: StreamType.TERMINAL });
    
    return stream;
  }

  /**
   * Create a WebSocket stream
   */
  public async createWebSocketStream(params: {
    sessionId: string;
    url?: string;
    type?: StreamType;
  }): Promise<StreamConnection> {
    const url = params.url || getWebSocketUrl('system');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      // Create stream connection
      const stream: StreamConnection = {
        sessionId: params.sessionId,
        type: params.type || StreamType.SYSTEM,
        status: StreamStatus.CONNECTING,
        websocket: ws,
        buffer: new CircularBuffer(this.BUFFER_SIZE),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0
        }
      };
      
      // WebSocket event handlers
      ws.on('open', () => {
        stream.status = StreamStatus.CONNECTED;
        stream.metrics.connectTime = new Date();
        
        this.streams.set(params.sessionId, stream);
        this.websockets.set(params.sessionId, ws);
        
        this.emit('stream:connected', { sessionId: params.sessionId, type: stream.type });
        resolve(stream);
      });
      
      ws.on('error', (error) => {
        stream.status = StreamStatus.ERROR;
        this.emit('stream:error', { sessionId: params.sessionId, error });
        reject(error);
      });
      
      ws.on('close', () => {
        stream.status = StreamStatus.DISCONNECTED;
        stream.metrics.disconnectTime = new Date();
        this.handleDisconnection(params.sessionId);
      });
      
      ws.on('message', (data) => {
        this.handleWebSocketMessage(params.sessionId, data);
      });
      
      // Timeout
      setTimeout(() => {
        if (stream.status === StreamStatus.CONNECTING) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, terminalConfig.websocket.timeout);
    });
  }

  /**
   * Write data to stream
   */
  public write(sessionId: string, data: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) {
      throw new Error(`Stream ${sessionId} not found`);
    }
    
    if (stream.process) {
      // Write to PTY
      stream.process.write(data);
      stream.metrics.bytesIn += data.length;
      stream.metrics.messagesIn++;
    } else if (stream.websocket && stream.websocket.readyState === WebSocket.OPEN) {
      // Write to WebSocket
      stream.websocket.send(data);
      stream.metrics.bytesOut += data.length;
      stream.metrics.messagesOut++;
    } else {
      // Buffer if disconnected
      stream.buffer.push(data);
    }
  }

  /**
   * Read buffered data
   */
  public readBuffer(sessionId: string): string[] {
    const stream = this.streams.get(sessionId);
    if (!stream) return [];
    
    return stream.buffer.getAll();
  }

  /**
   * Resize terminal
   */
  public resize(sessionId: string, dimensions: { rows: number; cols: number }): void {
    const process = this.processes.get(sessionId);
    if (process) {
      process.resize(dimensions.cols, dimensions.rows);
    }
    
    const stream = this.streams.get(sessionId);
    if (stream?.websocket && stream.websocket.readyState === WebSocket.OPEN) {
      stream.websocket.send(JSON.stringify({
        type: 'resize',
        rows: dimensions.rows,
        cols: dimensions.cols
      }));
    }
  }

  /**
   * Close stream
   */
  public closeStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;
    
    // Close process
    const process = this.processes.get(sessionId);
    if (process) {
      process.kill();
      this.processes.delete(sessionId);
    }
    
    // Close WebSocket
    const ws = this.websockets.get(sessionId);
    if (ws) {
      ws.close();
      this.websockets.delete(sessionId);
    }
    
    // Update status
    stream.status = StreamStatus.DISCONNECTED;
    stream.metrics.disconnectTime = new Date();
    
    // Emit event
    this.emit('stream:closed', { sessionId, type: stream.type });
    
    // Remove from memory after delay
    setTimeout(() => {
      this.streams.delete(sessionId);
    }, 5000);
  }

  /**
   * Get stream metrics
   */
  public getMetrics(sessionId: string): StreamMetrics | null {
    const stream = this.streams.get(sessionId);
    return stream ? stream.metrics : null;
  }

  /**
   * Get all active streams
   */
  public getActiveStreams(): StreamConnection[] {
    return Array.from(this.streams.values()).filter(
      s => s.status === StreamStatus.CONNECTED
    );
  }

  /**
   * Reconnect disconnected stream
   */
  public async reconnectStream(sessionId: string): Promise<void> {
    const stream = this.streams.get(sessionId);
    if (!stream || stream.status === StreamStatus.CONNECTED) return;
    
    let attempts = 0;
    while (attempts < this.RECONNECT_ATTEMPTS) {
      try {
        if (stream.type === StreamType.TERMINAL && !stream.process) {
          // Recreate PTY process
          // This would need session info from SessionManager
          throw new Error('Cannot recreate terminal process without session info');
        } else if (stream.websocket) {
          // Reconnect WebSocket
          await this.createWebSocketStream({ sessionId, type: stream.type });
          return;
        }
      } catch (error) {
        attempts++;
        if (attempts < this.RECONNECT_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
        }
      }
    }
    
    throw new Error(`Failed to reconnect stream ${sessionId} after ${attempts} attempts`);
  }

  // Private methods

  private setupProcessHandlers(sessionId: string, process: pty.IPty): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;
    
    // Handle output
    process.on('data', (data: string) => {
      stream.buffer.push(data);
      stream.metrics.bytesOut += data.length;
      stream.metrics.messagesOut++;
      
      this.emit('stream:data', { sessionId, data, type: 'output' });
    });
    
    // Handle exit
    process.on('exit', (code: number) => {
      stream.status = StreamStatus.DISCONNECTED;
      this.emit('stream:exit', { sessionId, code });
      this.handleDisconnection(sessionId);
    });
  }

  private handleWebSocketMessage(sessionId: string, data: WebSocket.Data): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;
    
    const message = data.toString();
    stream.buffer.push(message);
    stream.metrics.bytesIn += message.length;
    stream.metrics.messagesIn++;
    
    // Update latency
    const pingMatch = message.match(/ping:(\d+)/);
    if (pingMatch) {
      const latency = Date.now() - parseInt(pingMatch[1]);
      stream.metrics.latency = latency;
    }
    
    this.emit('stream:data', { sessionId, data: message, type: 'input' });
  }

  private handleDisconnection(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;
    
    // Try to reconnect if not intentionally closed
    if (stream.status !== StreamStatus.DISCONNECTED) {
      this.reconnectStream(sessionId).catch(error => {
        this.emit('stream:reconnect-failed', { sessionId, error });
      });
    }
  }

  private setupHealthCheck(): void {
    setInterval(() => {
      for (const [sessionId, stream] of this.streams) {
        if (stream.websocket && stream.status === StreamStatus.CONNECTED) {
          // Send ping
          if (stream.websocket.readyState === WebSocket.OPEN) {
            stream.websocket.ping();
          } else {
            // Mark as disconnected
            stream.status = StreamStatus.DISCONNECTED;
            this.handleDisconnection(sessionId);
          }
        }
      }
    }, 30000); // Every 30 seconds
  }
}

// Export singleton instance
export const streamManager = new StreamManager();