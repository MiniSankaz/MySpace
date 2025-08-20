/**
 * Task Orchestrator Service
 * Manages task dependencies and execution order
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface TaskDefinition {
  id: string;
  name: string;
  type: string;
  description: string;
  dependencies?: string[];
  priority: number;
  context?: Record<string, any>;
  status: TaskStatus;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  WAITING = 'waiting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export class TaskOrchestratorService extends EventEmitter {
  private tasks: Map<string, TaskDefinition> = new Map();
  private executionQueue: string[] = [];
  private runningTasks: Set<string> = new Set();
  private maxConcurrent: number = 5;

  constructor() {
    super();
    logger.info('Task Orchestrator Service initialized');
  }

  /**
   * Add a task to the orchestrator
   */
  public addTask(task: Omit<TaskDefinition, 'id' | 'status'>): string {
    const taskId = uuidv4();
    const taskDef: TaskDefinition = {
      ...task,
      id: taskId,
      status: TaskStatus.PENDING
    };

    this.tasks.set(taskId, taskDef);
    this.emit('task:added', taskDef);
    
    // Check if task can be queued
    this.updateTaskQueue();
    
    return taskId;
  }

  /**
   * Add multiple tasks
   */
  public addTasks(tasks: Omit<TaskDefinition, 'id' | 'status'>[]): string[] {
    return tasks.map(task => this.addTask(task));
  }

  /**
   * Update task queue based on dependencies
   */
  private updateTaskQueue(): void {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === TaskStatus.PENDING);

    // Sort by priority and check dependencies
    const readyTasks = pendingTasks
      .filter(task => this.areDependenciesMet(task))
      .sort((a, b) => b.priority - a.priority);

    // Add ready tasks to queue
    readyTasks.forEach(task => {
      if (!this.executionQueue.includes(task.id)) {
        this.executionQueue.push(task.id);
        task.status = TaskStatus.WAITING;
      }
    });

    // Try to execute tasks
    this.executeTasks();
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: TaskDefinition): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === TaskStatus.COMPLETED;
    });
  }

  /**
   * Execute tasks from queue
   */
  private executeTasks(): void {
    while (this.runningTasks.size < this.maxConcurrent && this.executionQueue.length > 0) {
      const taskId = this.executionQueue.shift();
      if (taskId) {
        this.executeTask(taskId);
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.RUNNING;
    task.startTime = new Date();
    this.runningTasks.add(taskId);
    
    this.emit('task:started', task);
    logger.info(`Task ${taskId} started: ${task.name}`);

    try {
      // Here you would actually execute the task
      // For now, we emit an event for external handlers
      this.emit('task:execute', task);
      
      // Simulate task completion after external processing
      // In real implementation, this would be called by the actual executor
    } catch (error: any) {
      this.completeTask(taskId, false, null, error.message);
    }
  }

  /**
   * Mark task as completed
   */
  public completeTask(
    taskId: string, 
    success: boolean, 
    result?: any, 
    error?: string
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
    task.endTime = new Date();
    task.result = result;
    task.error = error;
    
    this.runningTasks.delete(taskId);
    
    this.emit('task:completed', task);
    logger.info(`Task ${taskId} completed: ${task.status}`);

    // Update queue for dependent tasks
    this.updateTaskQueue();
  }

  /**
   * Cancel a task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === TaskStatus.RUNNING) {
      this.runningTasks.delete(taskId);
    }

    task.status = TaskStatus.CANCELLED;
    this.emit('task:cancelled', task);
    
    // Remove from queue
    const index = this.executionQueue.indexOf(taskId);
    if (index > -1) {
      this.executionQueue.splice(index, 1);
    }

    return true;
  }

  /**
   * Get task status
   */
  public getTask(taskId: string): TaskDefinition | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  public getAllTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  public getTasksByStatus(status: TaskStatus): TaskDefinition[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }

  /**
   * Clear completed tasks
   */
  public clearCompleted(): void {
    const completed = this.getTasksByStatus(TaskStatus.COMPLETED);
    completed.forEach(task => {
      this.tasks.delete(task.id);
    });
  }

  /**
   * Get orchestrator metrics
   */
  public getMetrics(): Record<string, any> {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      waiting: tasks.filter(t => t.status === TaskStatus.WAITING).length,
      running: this.runningTasks.size,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
      cancelled: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
      queueLength: this.executionQueue.length
    };
  }
}

// Export singleton instance
export const taskOrchestrator = new TaskOrchestratorService();