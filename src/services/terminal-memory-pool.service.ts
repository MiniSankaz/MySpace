/**
 * Terminal Memory Pool Service
 * Efficient memory management with pooling and recycling
 */

import { EventEmitter } from "events";

export interface PooledSession {
  id: string;
  allocated: boolean;
  lastUsed: Date;
  data: any;
  buffer: string[];
  metadata: Record<string, any>;
}

export class TerminalMemoryPool extends EventEmitter {
  private static instance: TerminalMemoryPool;

  // Pool configuration
  private readonly POOL_SIZE = 20; // Maximum pool size
  private readonly BUFFER_SIZE = 500; // Lines per buffer
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Memory pools
  private sessionPool: Map<string, PooledSession> = new Map();
  private bufferPool: string[][] = [];
  private recycledSessions: PooledSession[] = [];

  // Metrics
  private metrics = {
    allocations: 0,
    deallocations: 0,
    recycled: 0,
    poolHits: 0,
    poolMisses: 0,
  };

  private constructor() {
    super();
    this.initializePool();
    this.startMaintenanceTask();
  }

  public static getInstance(): TerminalMemoryPool {
    if (!this.instance) {
      this.instance = new TerminalMemoryPool();
    }
    return this.instance;
  }

  /**
   * Initialize session pool with pre-allocated objects
   */
  private initializePool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const session: PooledSession = {
        id: "",
        allocated: false,
        lastUsed: new Date(),
        data: {},
        buffer: this.getBufferFromPool(),
        metadata: {},
      };
      this.recycledSessions.push(session);
    }
    console.log(
      `[MemoryPool] Initialized with ${this.POOL_SIZE} pre-allocated sessions`,
    );
  }

  /**
   * Get a buffer from pool or create new one
   */
  private getBufferFromPool(): string[] {
    if (this.bufferPool.length > 0) {
      const buffer = this.bufferPool.pop()!;
      buffer.length = 0; // Clear existing content
      return buffer;
    }
    return new Array(this.BUFFER_SIZE);
  }

  /**
   * Allocate a session from pool
   */
  public allocateSession(id: string, data: any): PooledSession {
    this.metrics.allocations++;

    // Try to get recycled session
    let session: PooledSession;

    if (this.recycledSessions.length > 0) {
      session = this.recycledSessions.pop()!;
      this.metrics.poolHits++;
      this.metrics.recycled++;

      // Reset session
      session.id = id;
      session.allocated = true;
      session.lastUsed = new Date();
      session.data = data;
      session.buffer.length = 0;
      session.metadata = {};
    } else {
      // Create new session if pool is empty
      this.metrics.poolMisses++;
      session = {
        id,
        allocated: true,
        lastUsed: new Date(),
        data,
        buffer: this.getBufferFromPool(),
        metadata: {},
      };
    }

    this.sessionPool.set(id, session);
    return session;
  }

  /**
   * Deallocate session back to pool
   */
  public deallocateSession(id: string): void {
    const session = this.sessionPool.get(id);
    if (!session) return;

    this.metrics.deallocations++;

    // Return buffer to pool
    if (session.buffer.length <= this.BUFFER_SIZE) {
      this.bufferPool.push(session.buffer);
    }

    // Reset and recycle session
    session.allocated = false;
    session.id = "";
    session.data = {};
    session.metadata = {};

    // Add to recycled pool if under limit
    if (this.recycledSessions.length < this.POOL_SIZE) {
      this.recycledSessions.push(session);
    }

    this.sessionPool.delete(id);
  }

  /**
   * Get session from pool
   */
  public getSession(id: string): PooledSession | null {
    const session = this.sessionPool.get(id);
    if (session) {
      session.lastUsed = new Date();
    }
    return session || null;
  }

  /**
   * Add output to session buffer with circular buffer behavior
   */
  public addToBuffer(sessionId: string, output: string): void {
    const session = this.sessionPool.get(sessionId);
    if (!session) return;

    // Circular buffer implementation
    if (session.buffer.length >= this.BUFFER_SIZE) {
      // Remove oldest entry
      session.buffer.shift();
    }
    session.buffer.push(output);
    session.lastUsed = new Date();
  }

  /**
   * Clean up idle sessions
   */
  private cleanupIdleSessions(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, session] of this.sessionPool) {
      if (now - session.lastUsed.getTime() > this.IDLE_TIMEOUT) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      console.log(`[MemoryPool] Cleaning up idle session: ${id}`);
      this.deallocateSession(id);
    }
  }

  /**
   * Maintenance task for pool cleanup
   */
  private startMaintenanceTask(): void {
    setInterval(() => {
      this.cleanupIdleSessions();
      this.reportMetrics();
    }, 60000); // Every minute
  }

  /**
   * Report pool metrics
   */
  private reportMetrics(): void {
    const poolUsage = (this.sessionPool.size / this.POOL_SIZE) * 100;
    const recycleRate =
      this.metrics.allocations > 0
        ? (this.metrics.recycled / this.metrics.allocations) * 100
        : 0;

    console.log(`[MemoryPool] Metrics:`, {
      poolUsage: `${poolUsage.toFixed(1)}%`,
      activeSessions: this.sessionPool.size,
      recycledAvailable: this.recycledSessions.length,
      recycleRate: `${recycleRate.toFixed(1)}%`,
      ...this.metrics,
    });
  }

  /**
   * Get current pool statistics
   */
  public getStats(): any {
    return {
      poolSize: this.POOL_SIZE,
      activeSessions: this.sessionPool.size,
      recycledAvailable: this.recycledSessions.length,
      bufferPoolSize: this.bufferPool.length,
      metrics: this.metrics,
    };
  }

  /**
   * Force garbage collection if needed
   */
  public forceCleanup(): void {
    // Clear all idle sessions
    this.cleanupIdleSessions();

    // Trim buffer pool if too large
    if (this.bufferPool.length > this.POOL_SIZE) {
      this.bufferPool = this.bufferPool.slice(0, this.POOL_SIZE);
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
    }
  }
}

// Export singleton instance
export const terminalMemoryPool = TerminalMemoryPool.getInstance();
