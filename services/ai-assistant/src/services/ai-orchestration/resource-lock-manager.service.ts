/**
 * Resource Lock Manager Service
 * Prevents conflicts between parallel AI agents accessing same resources
 * @AI-MARKER:SERVICE:RESOURCE_LOCK_MANAGER
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';

export enum ResourceType {
  FILE = 'file',
  SERVICE = 'service',
  DATABASE = 'database',
  PORT = 'port',
  TERMINAL = 'terminal',
  WORKSPACE = 'workspace',
  PORTFOLIO = 'portfolio'
}

export enum LockStatus {
  AVAILABLE = 'available',
  LOCKED = 'locked',
  PENDING = 'pending',
  RELEASED = 'released'
}

export interface ResourceLock {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  ownerId: string; // Agent ID
  status: LockStatus;
  acquiredAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface LockRequest {
  resourceId: string;
  resourceType: ResourceType;
  ownerId: string;
  ttl?: number; // Time to live in seconds
  priority?: number;
  metadata?: Record<string, any>;
}

export class ResourceLockManager extends EventEmitter {
  private locks: Map<string, ResourceLock> = new Map();
  private lockQueue: Map<string, LockRequest[]> = new Map();
  private redis?: Redis;
  private useRedis: boolean = false;
  private defaultTTL: number = 300; // 5 minutes default
  private cleanupInterval?: NodeJS.Timeout;

  constructor(redisUrl?: string) {
    super();
    
    if (redisUrl) {
      this.initRedis(redisUrl);
    }
    
    this.startCleanupTask();
  }

  /**
   * Initialize Redis for distributed locking
   */
  private initRedis(redisUrl: string): void {
    try {
      this.redis = new Redis(redisUrl);
      this.useRedis = true;
      
      this.redis.on('connect', () => {
        logger.info('Redis connected for distributed locking');
      });
      
      this.redis.on('error', (error) => {
        logger.error('Redis error:', error);
        this.useRedis = false;
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, using in-memory locks:', error);
      this.useRedis = false;
    }
  }

  /**
   * Acquire a lock on a resource
   */
  public async acquireLock(request: LockRequest): Promise<ResourceLock | null> {
    const lockKey = this.getLockKey(request.resourceType, request.resourceId);
    
    // Check if resource is already locked
    const existingLock = await this.getLock(lockKey);
    
    if (existingLock && existingLock.status === LockStatus.LOCKED) {
      // Check if lock has expired
      if (this.isLockExpired(existingLock)) {
        await this.releaseLock(existingLock.id);
      } else {
        // Add to queue if locked
        this.addToQueue(lockKey, request);
        this.emit('lock:queued', { request, existingLock });
        return null;
      }
    }

    // Create new lock
    const lock: ResourceLock = {
      id: uuidv4(),
      resourceId: request.resourceId,
      resourceType: request.resourceType,
      ownerId: request.ownerId,
      status: LockStatus.LOCKED,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + (request.ttl || this.defaultTTL) * 1000),
      metadata: request.metadata
    };

    // Store lock
    await this.storeLock(lockKey, lock);
    
    this.emit('lock:acquired', lock);
    logger.info(`Lock acquired: ${lock.id} for ${request.ownerId} on ${lockKey}`);
    
    return lock;
  }

  /**
   * Release a lock
   */
  public async releaseLock(lockId: string): Promise<boolean> {
    const lock = await this.findLockById(lockId);
    
    if (!lock) {
      logger.warn(`Lock not found: ${lockId}`);
      return false;
    }

    const lockKey = this.getLockKey(lock.resourceType, lock.resourceId);
    
    // Remove lock
    await this.removeLock(lockKey);
    
    lock.status = LockStatus.RELEASED;
    this.emit('lock:released', lock);
    logger.info(`Lock released: ${lockId}`);
    
    // Process queue for this resource
    await this.processQueue(lockKey);
    
    return true;
  }

  /**
   * Check if a resource is locked
   */
  public async isLocked(resourceType: ResourceType, resourceId: string): Promise<boolean> {
    const lockKey = this.getLockKey(resourceType, resourceId);
    const lock = await this.getLock(lockKey);
    
    if (!lock) return false;
    
    // Check if lock is expired
    if (this.isLockExpired(lock)) {
      await this.releaseLock(lock.id);
      return false;
    }
    
    return lock.status === LockStatus.LOCKED;
  }

  /**
   * Get lock status for a resource
   */
  public async getLockStatus(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<ResourceLock | null> {
    const lockKey = this.getLockKey(resourceType, resourceId);
    return this.getLock(lockKey);
  }

  /**
   * Extend lock TTL
   */
  public async extendLock(lockId: string, additionalTTL: number): Promise<boolean> {
    const lock = await this.findLockById(lockId);
    
    if (!lock || lock.status !== LockStatus.LOCKED) {
      return false;
    }

    lock.expiresAt = new Date(
      lock.expiresAt!.getTime() + additionalTTL * 1000
    );

    const lockKey = this.getLockKey(lock.resourceType, lock.resourceId);
    await this.storeLock(lockKey, lock);
    
    this.emit('lock:extended', lock);
    logger.info(`Lock extended: ${lockId} by ${additionalTTL}s`);
    
    return true;
  }

  /**
   * Force release all locks for an owner
   */
  public async releaseOwnerLocks(ownerId: string): Promise<number> {
    let released = 0;
    
    if (this.useRedis && this.redis) {
      // Redis implementation
      const keys = await this.redis.keys('lock:*');
      
      for (const key of keys) {
        const lockData = await this.redis.get(key);
        if (lockData) {
          const lock: ResourceLock = JSON.parse(lockData);
          if (lock.ownerId === ownerId) {
            await this.releaseLock(lock.id);
            released++;
          }
        }
      }
    } else {
      // In-memory implementation
      for (const [key, lock] of this.locks.entries()) {
        if (lock.ownerId === ownerId) {
          await this.releaseLock(lock.id);
          released++;
        }
      }
    }
    
    logger.info(`Released ${released} locks for owner: ${ownerId}`);
    return released;
  }

  /**
   * Get lock key
   */
  private getLockKey(resourceType: ResourceType, resourceId: string): string {
    return `lock:${resourceType}:${resourceId}`;
  }

  /**
   * Store lock (Redis or in-memory)
   */
  private async storeLock(key: string, lock: ResourceLock): Promise<void> {
    if (this.useRedis && this.redis) {
      const ttl = lock.expiresAt
        ? Math.floor((lock.expiresAt.getTime() - Date.now()) / 1000)
        : this.defaultTTL;
      
      await this.redis.setex(key, ttl, JSON.stringify(lock));
    } else {
      this.locks.set(key, lock);
    }
  }

  /**
   * Get lock (Redis or in-memory)
   */
  private async getLock(key: string): Promise<ResourceLock | null> {
    if (this.useRedis && this.redis) {
      const data = await this.redis.get(key);
      if (data) {
        const lock = JSON.parse(data);
        // Convert date strings back to Date objects
        lock.acquiredAt = new Date(lock.acquiredAt);
        lock.expiresAt = new Date(lock.expiresAt);
        return lock;
      }
      return null;
    } else {
      return this.locks.get(key) || null;
    }
  }

  /**
   * Remove lock (Redis or in-memory)
   */
  private async removeLock(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.del(key);
    } else {
      this.locks.delete(key);
    }
  }

  /**
   * Find lock by ID
   */
  private async findLockById(lockId: string): Promise<ResourceLock | null> {
    if (this.useRedis && this.redis) {
      const keys = await this.redis.keys('lock:*');
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const lock: ResourceLock = JSON.parse(data);
          if (lock.id === lockId) {
            lock.acquiredAt = new Date(lock.acquiredAt);
            lock.expiresAt = new Date(lock.expiresAt);
            return lock;
          }
        }
      }
      return null;
    } else {
      for (const lock of this.locks.values()) {
        if (lock.id === lockId) {
          return lock;
        }
      }
      return null;
    }
  }

  /**
   * Check if lock is expired
   */
  private isLockExpired(lock: ResourceLock): boolean {
    if (!lock.expiresAt) return false;
    return lock.expiresAt.getTime() < Date.now();
  }

  /**
   * Add request to queue
   */
  private addToQueue(lockKey: string, request: LockRequest): void {
    if (!this.lockQueue.has(lockKey)) {
      this.lockQueue.set(lockKey, []);
    }
    
    const queue = this.lockQueue.get(lockKey)!;
    
    // Add based on priority
    if (request.priority !== undefined) {
      const index = queue.findIndex(r => 
        (r.priority || 0) < (request.priority || 0)
      );
      
      if (index === -1) {
        queue.push(request);
      } else {
        queue.splice(index, 0, request);
      }
    } else {
      queue.push(request);
    }
  }

  /**
   * Process queue for a resource
   */
  private async processQueue(lockKey: string): Promise<void> {
    const queue = this.lockQueue.get(lockKey);
    
    if (!queue || queue.length === 0) {
      return;
    }

    const nextRequest = queue.shift();
    
    if (nextRequest) {
      const lock = await this.acquireLock(nextRequest);
      
      if (lock) {
        this.emit('lock:granted-from-queue', lock);
      }
    }
    
    // Clean up empty queue
    if (queue.length === 0) {
      this.lockQueue.delete(lockKey);
    }
  }

  /**
   * Start cleanup task for expired locks
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredLocks();
    }, 60000); // Run every minute
  }

  /**
   * Cleanup expired locks
   */
  private async cleanupExpiredLocks(): Promise<void> {
    let cleaned = 0;
    
    if (this.useRedis && this.redis) {
      // Redis TTL handles expiration automatically
      return;
    } else {
      // In-memory cleanup
      for (const [key, lock] of this.locks.entries()) {
        if (this.isLockExpired(lock)) {
          await this.releaseLock(lock.id);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired locks`);
    }
  }

  /**
   * Get metrics
   */
  public async getMetrics(): Promise<Record<string, any>> {
    const activeLocks = this.useRedis && this.redis
      ? (await this.redis.keys('lock:*')).length
      : this.locks.size;

    const queuedRequests = Array.from(this.lockQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    return {
      activeLocks,
      queuedRequests,
      locksByType: await this.getLocksByType(),
      queueByResource: this.getQueueMetrics()
    };
  }

  /**
   * Get locks grouped by type
   */
  private async getLocksByType(): Promise<Record<string, number>> {
    const byType: Record<string, number> = {};
    
    if (this.useRedis && this.redis) {
      const keys = await this.redis.keys('lock:*');
      
      for (const key of keys) {
        const type = key.split(':')[1];
        byType[type] = (byType[type] || 0) + 1;
      }
    } else {
      for (const lock of this.locks.values()) {
        byType[lock.resourceType] = (byType[lock.resourceType] || 0) + 1;
      }
    }
    
    return byType;
  }

  /**
   * Get active locks
   */
  public async getActiveLocks(): Promise<ResourceLock[]> {
    const activeLocks: ResourceLock[] = [];
    
    if (this.useRedis && this.redis) {
      const keys = await this.redis.keys('lock:*');
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const lock: ResourceLock = JSON.parse(data);
          lock.acquiredAt = new Date(lock.acquiredAt!);
          lock.expiresAt = new Date(lock.expiresAt!);
          activeLocks.push(lock);
        }
      }
    } else {
      for (const lock of this.locks.values()) {
        if (lock.status === LockStatus.LOCKED && !this.isLockExpired(lock)) {
          activeLocks.push(lock);
        }
      }
    }
    
    return activeLocks;
  }

  /**
   * Get queue metrics
   */
  private getQueueMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    for (const [key, queue] of this.lockQueue.entries()) {
      metrics[key] = queue.length;
    }
    
    return metrics;
  }

  /**
   * Shutdown cleanup
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.redis) {
      this.redis.disconnect();
    }
    
    this.removeAllListeners();
    logger.info('Resource Lock Manager shutdown');
  }
}

// Export singleton instance
export const resourceLockManager = new ResourceLockManager(
  process.env.REDIS_URL
);