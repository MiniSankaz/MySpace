/**
 * Queue Service for managing background jobs
 */

import Bull from 'bull';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logger } from '../utils/logger';

export enum QueueName {
  INDEXING = 'indexing',
  ANALYSIS = 'analysis',
  REFACTORING = 'refactoring',
  AGENT_TASKS = 'agent-tasks'
}

export interface QueueJob<T = any> {
  id: string;
  data: T;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number;
}

export class QueueService extends EventEmitter {
  private queues: Map<QueueName, Bull.Queue> = new Map();
  private processors: Map<QueueName, (job: Bull.Job) => Promise<any>> = new Map();
  
  constructor() {
    super();
  }
  
  async initialize() {
    // Create queues
    for (const queueName of Object.values(QueueName)) {
      const queue = new Bull(queueName, {
        redis: config.redis,
        defaultJobOptions: {
          removeOnComplete: config.queue.removeOnComplete,
          removeOnFail: config.queue.removeOnFail,
          attempts: config.agents.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: config.agents.retryDelay
          }
        }
      });
      
      this.queues.set(queueName as QueueName, queue);
      
      // Setup event listeners
      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed in queue ${queueName}`);
        this.emit('job:completed', { queue: queueName, job, result });
      });
      
      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed in queue ${queueName}:`, err);
        this.emit('job:failed', { queue: queueName, job, error: err });
      });
      
      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in queue ${queueName}`);
        this.emit('job:stalled', { queue: queueName, job });
      });
    }
    
    logger.info('Queue service initialized');
  }
  
  /**
   * Add a job to a queue
   */
  async addJob<T>(queueName: QueueName, data: T, options?: Bull.JobOptions): Promise<Bull.Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const job = await queue.add(data, {
      priority: config.queue.defaultPriority,
      ...options
    });
    
    logger.debug(`Added job ${job.id} to queue ${queueName}`);
    return job;
  }
  
  /**
   * Add multiple jobs to a queue
   */
  async addBulkJobs<T>(queueName: QueueName, jobs: Array<{ data: T; opts?: Bull.JobOptions }>): Promise<Bull.Job<T>[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const bulkJobs = await queue.addBulk(jobs);
    logger.debug(`Added ${bulkJobs.length} jobs to queue ${queueName}`);
    return bulkJobs;
  }
  
  /**
   * Register a processor for a queue
   */
  registerProcessor(queueName: QueueName, processor: (job: Bull.Job) => Promise<any>, concurrency?: number) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    this.processors.set(queueName, processor);
    queue.process(concurrency || config.queue.concurrency, processor);
    
    logger.info(`Registered processor for queue ${queueName} with concurrency ${concurrency || config.queue.concurrency}`);
  }
  
  /**
   * Get queue status
   */
  async getQueueStatus(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused()
    ]);
    
    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    };
  }
  
  /**
   * Get all queues status
   */
  async getAllQueuesStatus() {
    const statuses = await Promise.all(
      Array.from(this.queues.keys()).map(name => this.getQueueStatus(name))
    );
    
    return statuses;
  }
  
  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }
  
  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }
  
  /**
   * Clean completed jobs
   */
  async cleanQueue(queueName: QueueName, grace: number = 0) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    logger.info(`Queue ${queueName} cleaned`);
  }
  
  /**
   * Get job by ID
   */
  async getJob(queueName: QueueName, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    return queue.getJob(jobId);
  }
  
  /**
   * Retry failed job
   */
  async retryJob(queueName: QueueName, jobId: string) {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }
    
    await job.retry();
    logger.info(`Job ${jobId} retried in queue ${queueName}`);
  }
  
  /**
   * Close all queue connections
   */
  async close() {
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );
    
    logger.info('All queue connections closed');
  }
}