/**
 * Orchestration Client
 * User-friendly interface for orchestrating AI agents
 * @AI-MARKER:SERVICE:ORCHESTRATION_CLIENT
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { logger } from '../../utils/logger';
import {
  AgentType,
  AgentStatus,
  AgentConfig,
  AgentTask,
  AgentInstance
} from './agent-spawner.service';
import {
  ResourceType,
  LockStatus,
  ResourceLock,
  LockRequest
} from './resource-lock-manager.service';

export interface OrchestrationConfig {
  apiUrl?: string;
  wsUrl?: string;
  apiKey?: string;
  maxRetries?: number;
  timeout?: number;
  autoReconnect?: boolean;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  parameters: Record<string, TemplateParameter>;
  promptTemplate: string;
  estimatedDuration?: number;
  requiresApproval?: boolean;
  tags?: string[];
}

export interface TemplateParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description?: string;
  validation?: (value: any) => boolean;
}

export interface TaskQueueItem extends AgentTask {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  agentId?: string;
  progress?: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  agentId: string;
  description: string;
  context: Record<string, any>;
  requestedAt: Date;
  approvedBy?: string;
  rejectedBy?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  comments?: string;
}

export interface OrchestrationStats {
  activeAgents: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalUsage: {
    opus: number;
    sonnet: number;
    haiku: number;
  };
  estimatedCost: number;
  resourceLocks: number;
}

export class OrchestrationClient extends EventEmitter {
  private api: AxiosInstance;
  private socket?: Socket;
  private config: Required<OrchestrationConfig>;
  private agents: Map<string, AgentInstance> = new Map();
  private taskQueue: Map<string, TaskQueueItem> = new Map();
  private templates: Map<string, TaskTemplate> = new Map();
  private approvals: Map<string, ApprovalRequest> = new Map();
  private locks: Map<string, ResourceLock> = new Map();
  private stats: OrchestrationStats = {
    activeAgents: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalUsage: { opus: 0, sonnet: 0, haiku: 0 },
    estimatedCost: 0,
    resourceLocks: 0
  };

  constructor(config: OrchestrationConfig = {}) {
    super();
    
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:4110/api/v1',
      wsUrl: config.wsUrl || 'ws://localhost:4111',
      apiKey: config.apiKey || '',
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      autoReconnect: config.autoReconnect !== false
    };

    this.api = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.initializeTemplates();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  /**
   * Initialize default task templates
   */
  private initializeTemplates(): void {
    const defaultTemplates: TaskTemplate[] = [
      {
        id: 'code-review',
        name: 'Code Review',
        description: 'Perform comprehensive code review',
        agentType: AgentType.CODE_REVIEWER,
        parameters: {
          files: { type: 'array', required: true, description: 'Files to review' },
          branch: { type: 'string', default: 'main', description: 'Git branch' },
          checkSecurity: { type: 'boolean', default: true },
          checkPerformance: { type: 'boolean', default: true }
        },
        promptTemplate: 'Review the following files: {files}. Check for security issues: {checkSecurity}, performance issues: {checkPerformance}',
        estimatedDuration: 300000,
        tags: ['review', 'quality']
      },
      {
        id: 'bug-fix',
        name: 'Bug Fix',
        description: 'Diagnose and fix a bug',
        agentType: AgentType.DEVELOPMENT_PLANNER,
        parameters: {
          bugDescription: { type: 'string', required: true },
          errorLog: { type: 'string', description: 'Error log or stack trace' },
          affectedFiles: { type: 'array', description: 'Potentially affected files' }
        },
        promptTemplate: 'Fix the following bug: {bugDescription}. Error log: {errorLog}',
        estimatedDuration: 600000,
        requiresApproval: true,
        tags: ['fix', 'debug']
      },
      {
        id: 'feature-implementation',
        name: 'Feature Implementation',
        description: 'Implement a new feature',
        agentType: AgentType.DEVELOPMENT_PLANNER,
        parameters: {
          featureDescription: { type: 'string', required: true },
          requirements: { type: 'array', required: true },
          targetFiles: { type: 'array' }
        },
        promptTemplate: 'Implement the following feature: {featureDescription}. Requirements: {requirements}',
        estimatedDuration: 1200000,
        requiresApproval: true,
        tags: ['feature', 'development']
      },
      {
        id: 'test-creation',
        name: 'Test Creation',
        description: 'Create unit and integration tests',
        agentType: AgentType.TEST_RUNNER,
        parameters: {
          targetFile: { type: 'string', required: true },
          testType: { type: 'string', default: 'unit' },
          coverage: { type: 'number', default: 80 }
        },
        promptTemplate: 'Create {testType} tests for {targetFile} with minimum {coverage}% coverage',
        estimatedDuration: 480000,
        tags: ['testing', 'quality']
      },
      {
        id: 'documentation',
        name: 'Documentation Update',
        description: 'Update project documentation',
        agentType: AgentType.TECHNICAL_ARCHITECT,
        parameters: {
          scope: { type: 'string', required: true },
          format: { type: 'string', default: 'markdown' },
          includeExamples: { type: 'boolean', default: true }
        },
        promptTemplate: 'Update documentation for {scope} in {format} format. Include examples: {includeExamples}',
        estimatedDuration: 360000,
        tags: ['documentation']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Set up WebSocket connection for real-time updates
   */
  private setupWebSocket(): void {
    try {
      this.socket = io(`${this.config.wsUrl}/orchestration`, {
        auth: { token: this.config.apiKey },
        reconnection: this.config.autoReconnect,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        logger.info('WebSocket connected to orchestration service');
        this.emit('connected');
      });

      this.socket.on('disconnect', () => {
        logger.warn('WebSocket disconnected from orchestration service');
        this.emit('disconnected');
      });

      // Agent events
      this.socket.on('agent.spawned', (data) => {
        this.handleAgentSpawned(data);
      });

      this.socket.on('agent.status', (data) => {
        this.handleAgentStatusUpdate(data);
      });

      this.socket.on('agent.terminated', (data) => {
        this.handleAgentTerminated(data);
      });

      // Task events
      this.socket.on('task.created', (data) => {
        this.handleTaskCreated(data);
      });

      this.socket.on('task.progress', (data) => {
        this.handleTaskProgress(data);
      });

      this.socket.on('task.completed', (data) => {
        this.handleTaskCompleted(data);
      });

      this.socket.on('task.failed', (data) => {
        this.handleTaskFailed(data);
      });

      // Approval events
      this.socket.on('approval.required', (data) => {
        this.handleApprovalRequired(data);
      });

      this.socket.on('approval.granted', (data) => {
        this.handleApprovalGranted(data);
      });

      // Usage events
      this.socket.on('usage.update', (data) => {
        this.handleUsageUpdate(data);
      });

      // Lock events
      this.socket.on('lock.acquired', (data) => {
        this.handleLockAcquired(data);
      });

      this.socket.on('lock.released', (data) => {
        this.handleLockReleased(data);
      });

    } catch (error) {
      logger.error('Failed to setup WebSocket:', error);
    }
  }

  /**
   * Set up error handling and retry logic
   */
  private setupErrorHandling(): void {
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          // Attempt to refresh token or re-authenticate
          // For now, just reject
          return Promise.reject(error);
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          if (originalRequest._retryCount < this.config.maxRetries) {
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
            const delay = Math.pow(2, originalRequest._retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.api(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ============= Agent Management =============

  /**
   * Spawn a new agent
   */
  public async spawnAgent(config: AgentConfig, task?: AgentTask): Promise<AgentInstance> {
    try {
      const response = await this.api.post('/orchestration/agents/spawn', {
        config,
        task
      });

      const agent = response.data;
      this.agents.set(agent.id, agent);
      this.stats.activeAgents++;
      
      this.emit('agent:spawned', agent);
      return agent;
    } catch (error) {
      logger.error('Failed to spawn agent:', error);
      throw error;
    }
  }

  /**
   * Get all active agents
   */
  public async getAgents(): Promise<AgentInstance[]> {
    try {
      const response = await this.api.get('/orchestration/agents');
      return response.data;
    } catch (error) {
      logger.error('Failed to get agents:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  public async getAgent(agentId: string): Promise<AgentInstance | null> {
    try {
      const response = await this.api.get(`/orchestration/agents/${agentId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Terminate an agent
   */
  public async terminateAgent(agentId: string): Promise<boolean> {
    try {
      await this.api.delete(`/orchestration/agents/${agentId}`);
      
      this.agents.delete(agentId);
      this.stats.activeAgents = Math.max(0, this.stats.activeAgents - 1);
      
      this.emit('agent:terminated', agentId);
      return true;
    } catch (error) {
      logger.error(`Failed to terminate agent ${agentId}:`, error);
      return false;
    }
  }

  // ============= Task Management =============

  /**
   * Create a task from template
   */
  public createTaskFromTemplate(
    templateId: string,
    parameters: Record<string, any>
  ): AgentTask {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate parameters
    for (const [key, param] of Object.entries(template.parameters)) {
      if (param.required && !(key in parameters)) {
        throw new Error(`Required parameter ${key} missing`);
      }
      
      if (param.validation && !param.validation(parameters[key])) {
        throw new Error(`Parameter ${key} validation failed`);
      }
    }

    // Build prompt from template
    let prompt = template.promptTemplate;
    for (const [key, value] of Object.entries(parameters)) {
      prompt = prompt.replace(`{${key}}`, String(value));
    }

    return {
      id: uuidv4(),
      description: template.description,
      prompt,
      context: {
        templateId,
        parameters,
        estimatedDuration: template.estimatedDuration
      },
      priority: parameters.priority || 5
    };
  }

  /**
   * Queue a task
   */
  public async queueTask(task: AgentTask): Promise<TaskQueueItem> {
    try {
      const response = await this.api.post('/orchestration/tasks', task);
      
      const queueItem: TaskQueueItem = {
        ...response.data,
        status: 'pending',
        createdAt: new Date()
      };
      
      this.taskQueue.set(queueItem.id, queueItem);
      this.stats.queuedTasks++;
      
      this.emit('task:queued', queueItem);
      return queueItem;
    } catch (error) {
      logger.error('Failed to queue task:', error);
      throw error;
    }
  }

  /**
   * Get task queue
   */
  public getTaskQueue(): TaskQueueItem[] {
    return Array.from(this.taskQueue.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Cancel a task
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    try {
      await this.api.delete(`/orchestration/tasks/${taskId}`);
      
      const task = this.taskQueue.get(taskId);
      if (task) {
        task.status = 'cancelled';
        this.stats.queuedTasks = Math.max(0, this.stats.queuedTasks - 1);
      }
      
      this.emit('task:cancelled', taskId);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Reprioritize a task
   */
  public async reprioritizeTask(taskId: string, priority: number): Promise<boolean> {
    try {
      await this.api.put(`/orchestration/tasks/${taskId}`, { priority });
      
      const task = this.taskQueue.get(taskId);
      if (task) {
        task.priority = priority;
      }
      
      this.emit('task:reprioritized', { taskId, priority });
      return true;
    } catch (error) {
      logger.error(`Failed to reprioritize task ${taskId}:`, error);
      return false;
    }
  }

  // ============= Approval Management =============

  /**
   * Get pending approvals
   */
  public getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvals.values())
      .filter(a => a.approvalStatus === 'pending');
  }

  /**
   * Approve a task
   */
  public async approveTask(
    approvalId: string,
    approvedBy: string,
    comments?: string
  ): Promise<boolean> {
    try {
      await this.api.post(`/orchestration/tasks/${approvalId}/approve`, {
        approvedBy,
        comments
      });
      
      const approval = this.approvals.get(approvalId);
      if (approval) {
        approval.approvalStatus = 'approved';
        approval.approvedBy = approvedBy;
        approval.comments = comments;
      }
      
      this.emit('approval:granted', { approvalId, approvedBy });
      return true;
    } catch (error) {
      logger.error(`Failed to approve task ${approvalId}:`, error);
      return false;
    }
  }

  /**
   * Reject a task
   */
  public async rejectTask(
    approvalId: string,
    rejectedBy: string,
    reason: string
  ): Promise<boolean> {
    try {
      await this.api.post(`/orchestration/tasks/${approvalId}/reject`, {
        rejectedBy,
        reason
      });
      
      const approval = this.approvals.get(approvalId);
      if (approval) {
        approval.approvalStatus = 'rejected';
        approval.rejectedBy = rejectedBy;
        approval.comments = reason;
      }
      
      this.emit('approval:rejected', { approvalId, rejectedBy });
      return true;
    } catch (error) {
      logger.error(`Failed to reject task ${approvalId}:`, error);
      return false;
    }
  }

  // ============= Resource Lock Management =============

  /**
   * Acquire a resource lock
   */
  public async acquireLock(request: LockRequest): Promise<ResourceLock | null> {
    try {
      const response = await this.api.post('/orchestration/locks/acquire', request);
      
      const lock = response.data;
      this.locks.set(lock.id, lock);
      this.stats.resourceLocks++;
      
      this.emit('lock:acquired', lock);
      return lock;
    } catch (error) {
      logger.error('Failed to acquire lock:', error);
      return null;
    }
  }

  /**
   * Release a resource lock
   */
  public async releaseLock(lockId: string): Promise<boolean> {
    try {
      await this.api.post('/orchestration/locks/release', { lockId });
      
      this.locks.delete(lockId);
      this.stats.resourceLocks = Math.max(0, this.stats.resourceLocks - 1);
      
      this.emit('lock:released', lockId);
      return true;
    } catch (error) {
      logger.error(`Failed to release lock ${lockId}:`, error);
      return false;
    }
  }

  /**
   * Get current locks
   */
  public async getLocks(): Promise<ResourceLock[]> {
    try {
      const response = await this.api.get('/orchestration/locks');
      return response.data;
    } catch (error) {
      logger.error('Failed to get locks:', error);
      return [];
    }
  }

  // ============= Statistics and Monitoring =============

  /**
   * Get orchestration statistics
   */
  public getStats(): OrchestrationStats {
    return { ...this.stats };
  }

  /**
   * Get usage summary
   */
  public async getUsageSummary(): Promise<any> {
    try {
      const response = await this.api.get('/ai/usage/summary');
      return response.data;
    } catch (error) {
      logger.error('Failed to get usage summary:', error);
      return null;
    }
  }

  // ============= Template Management =============

  /**
   * Register a custom template
   */
  public registerTemplate(template: TaskTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template:registered', template);
  }

  /**
   * Get all templates
   */
  public getTemplates(): TaskTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): TaskTemplate | undefined {
    return this.templates.get(templateId);
  }

  // ============= Event Handlers =============

  private handleAgentSpawned(data: any): void {
    const agent = data as AgentInstance;
    this.agents.set(agent.id, agent);
    this.stats.activeAgents++;
    this.emit('agent:spawned', agent);
  }

  private handleAgentStatusUpdate(data: any): void {
    const { agentId, status } = data;
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit('agent:status', { agentId, status });
    }
  }

  private handleAgentTerminated(data: any): void {
    const agentId = data.agentId;
    this.agents.delete(agentId);
    this.stats.activeAgents = Math.max(0, this.stats.activeAgents - 1);
    this.emit('agent:terminated', agentId);
  }

  private handleTaskCreated(data: any): void {
    const task = data as TaskQueueItem;
    this.taskQueue.set(task.id, task);
    this.stats.queuedTasks++;
    this.emit('task:created', task);
  }

  private handleTaskProgress(data: any): void {
    const { taskId, progress } = data;
    const task = this.taskQueue.get(taskId);
    if (task) {
      task.progress = progress;
      task.status = 'running';
      this.emit('task:progress', { taskId, progress });
    }
  }

  private handleTaskCompleted(data: any): void {
    const { taskId, result } = data;
    const task = this.taskQueue.get(taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.stats.queuedTasks = Math.max(0, this.stats.queuedTasks - 1);
      this.stats.completedTasks++;
      this.emit('task:completed', { taskId, result });
    }
  }

  private handleTaskFailed(data: any): void {
    const { taskId, error } = data;
    const task = this.taskQueue.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = new Date();
      this.stats.queuedTasks = Math.max(0, this.stats.queuedTasks - 1);
      this.stats.failedTasks++;
      this.emit('task:failed', { taskId, error });
    }
  }

  private handleApprovalRequired(data: any): void {
    const approval = data as ApprovalRequest;
    this.approvals.set(approval.id, approval);
    this.emit('approval:required', approval);
  }

  private handleApprovalGranted(data: any): void {
    const { approvalId } = data;
    const approval = this.approvals.get(approvalId);
    if (approval) {
      approval.approvalStatus = 'approved';
      this.emit('approval:granted', approval);
    }
  }

  private handleUsageUpdate(data: any): void {
    if (data.totalUsage) {
      this.stats.totalUsage = data.totalUsage;
    }
    if (data.estimatedCost !== undefined) {
      this.stats.estimatedCost = data.estimatedCost;
    }
    this.emit('usage:update', data);
  }

  private handleLockAcquired(data: any): void {
    const lock = data as ResourceLock;
    this.locks.set(lock.id, lock);
    this.stats.resourceLocks++;
    this.emit('lock:acquired', lock);
  }

  private handleLockReleased(data: any): void {
    const { lockId } = data;
    this.locks.delete(lockId);
    this.stats.resourceLocks = Math.max(0, this.stats.resourceLocks - 1);
    this.emit('lock:released', lockId);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const orchestrationClient = new OrchestrationClient();