/**
 * Agent Coordinator Service
 * Manages multi-agent coordination for code analysis tasks
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { logger } from '../utils/logger';
import { config } from '../config';

export enum AgentType {
  CODE_REVIEWER = 'code-reviewer',
  TECHNICAL_ARCHITECT = 'technical-architect',
  SYSTEM_ANALYST = 'system-analyst',
  SOP_ENFORCER = 'sop-enforcer',
  BUSINESS_ANALYST = 'business-analyst',
  DEVELOPMENT_PLANNER = 'development-planner',
  GENERAL_PURPOSE = 'general-purpose'
}

export interface AgentTask {
  id: string;
  type: AgentType;
  prompt: string;
  context?: Record<string, any>;
  priority?: number;
  timeout?: number;
  retries?: number;
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  status: 'success' | 'failure' | 'timeout';
  result?: any;
  error?: string;
  duration: number;
  tokens?: number;
}

export interface AgentStatus {
  id: string;
  type: AgentType;
  status: 'idle' | 'working' | 'failed';
  currentTask?: string;
  completedTasks: number;
  failedTasks: number;
}

interface ParallelTaskGroup {
  id: string;
  tasks: AgentTask[];
  results: Map<string, AgentResult>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class AgentCoordinatorService extends EventEmitter {
  private orchestratorClient: AxiosInstance;
  private taskQueue: PQueue;
  private activeAgents: Map<string, AgentStatus> = new Map();
  private taskGroups: Map<string, ParallelTaskGroup> = new Map();
  private resourceLocks: Map<string, string> = new Map(); // resource -> agentId
  
  constructor(orchestratorUrl: string) {
    super();
    
    this.orchestratorClient = axios.create({
      baseURL: orchestratorUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.taskQueue = new PQueue({
      concurrency: config.agents.maxConcurrent,
      interval: 1000,
      intervalCap: 10 // Max 10 tasks per second
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.taskQueue.on('active', () => {
      logger.debug(`Task queue active. Size: ${this.taskQueue.size} Pending: ${this.taskQueue.pending}`);
    });
    
    this.taskQueue.on('idle', () => {
      logger.debug('Task queue is idle');
      this.emit('queue:idle');
    });
  }
  
  /**
   * Spawn a single agent for a task
   */
  async spawnAgent(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const agentId = uuidv4();
    
    // Register agent
    const agentStatus: AgentStatus = {
      id: agentId,
      type: task.type,
      status: 'working',
      currentTask: task.id,
      completedTasks: 0,
      failedTasks: 0
    };
    
    this.activeAgents.set(agentId, agentStatus);
    this.emit('agent:spawned', { agentId, task });
    
    try {
      // Call AI orchestrator
      const response = await this.orchestratorClient.post('/api/v1/orchestration/spawn', {
        agentType: task.type,
        task: {
          id: task.id,
          description: `Code analysis task: ${task.type}`,
          prompt: task.prompt,
          context: task.context,
          priority: task.priority || 5,
          timeout: task.timeout || config.agents.timeout
        }
      });
      
      // Wait for completion
      const result = await this.waitForCompletion(response.data.agentId, task.timeout);
      
      agentStatus.status = 'idle';
      agentStatus.completedTasks++;
      
      const agentResult: AgentResult = {
        taskId: task.id,
        agentType: task.type,
        status: 'success',
        result: result.output,
        duration: Date.now() - startTime,
        tokens: result.tokensUsed
      };
      
      this.emit('agent:completed', { agentId, result: agentResult });
      return agentResult;
      
    } catch (error: any) {
      agentStatus.status = 'failed';
      agentStatus.failedTasks++;
      
      const agentResult: AgentResult = {
        taskId: task.id,
        agentType: task.type,
        status: 'failure',
        error: error.message,
        duration: Date.now() - startTime
      };
      
      logger.error(`Agent ${agentId} failed:`, error);
      this.emit('agent:failed', { agentId, error: error.message });
      
      // Retry if configured
      if (task.retries && task.retries > 0) {
        logger.info(`Retrying task ${task.id} (${task.retries} retries left)`);
        task.retries--;
        return this.spawnAgent(task);
      }
      
      return agentResult;
      
    } finally {
      this.activeAgents.delete(agentId);
    }
  }
  
  /**
   * Execute tasks in parallel with resource coordination
   */
  async executeParallelTasks(tasks: AgentTask[]): Promise<Map<string, AgentResult>> {
    const groupId = uuidv4();
    const taskGroup: ParallelTaskGroup = {
      id: groupId,
      tasks,
      results: new Map(),
      status: 'running'
    };
    
    this.taskGroups.set(groupId, taskGroup);
    logger.info(`Starting parallel task group ${groupId} with ${tasks.length} tasks`);
    
    try {
      // Group tasks by resource requirements
      const resourceGroups = this.groupTasksByResources(tasks);
      
      // Execute each resource group
      for (const [resource, groupTasks] of resourceGroups.entries()) {
        logger.debug(`Processing ${groupTasks.length} tasks for resource: ${resource}`);
        
        // Add tasks to queue
        const promises = groupTasks.map(task => 
          this.taskQueue.add(async () => {
            // Acquire resource lock if needed
            if (resource !== 'none') {
              await this.acquireResourceLock(resource, task.id);
            }
            
            try {
              const result = await this.spawnAgent(task);
              taskGroup.results.set(task.id, result);
              return result;
            } finally {
              // Release resource lock
              if (resource !== 'none') {
                this.releaseResourceLock(resource);
              }
            }
          })
        );
        
        // Wait for group completion
        await Promise.all(promises);
      }
      
      taskGroup.status = 'completed';
      logger.info(`Parallel task group ${groupId} completed successfully`);
      this.emit('taskgroup:completed', { groupId, results: taskGroup.results });
      
      return taskGroup.results;
      
    } catch (error) {
      taskGroup.status = 'failed';
      logger.error(`Parallel task group ${groupId} failed:`, error);
      this.emit('taskgroup:failed', { groupId, error });
      throw error;
      
    } finally {
      this.taskGroups.delete(groupId);
    }
  }
  
  /**
   * Execute analysis workflow with multiple agent types
   */
  async executeAnalysisWorkflow(filePath: string, analysisType: string): Promise<any> {
    logger.info(`Starting analysis workflow for ${filePath} (type: ${analysisType})`);
    
    const workflowTasks: AgentTask[] = [];
    
    // Phase 1: Initial analysis
    if (analysisType === 'comprehensive' || analysisType === 'quality') {
      workflowTasks.push({
        id: uuidv4(),
        type: AgentType.CODE_REVIEWER,
        prompt: `Perform a comprehensive code review of the file: ${filePath}
                 Focus on:
                 - Code quality and maintainability
                 - Potential bugs and issues
                 - Performance concerns
                 - Security vulnerabilities
                 - Testing coverage`,
        context: { filePath, phase: 'initial' },
        priority: 10
      });
    }
    
    // Phase 2: Architecture analysis
    if (analysisType === 'comprehensive' || analysisType === 'architecture') {
      workflowTasks.push({
        id: uuidv4(),
        type: AgentType.TECHNICAL_ARCHITECT,
        prompt: `Analyze the architectural patterns and design of: ${filePath}
                 Evaluate:
                 - Design patterns used
                 - SOLID principles compliance
                 - Coupling and cohesion
                 - Scalability considerations
                 - Integration points`,
        context: { filePath, phase: 'architecture' },
        priority: 8
      });
    }
    
    // Phase 3: Standards compliance
    if (analysisType === 'comprehensive' || analysisType === 'compliance') {
      workflowTasks.push({
        id: uuidv4(),
        type: AgentType.SOP_ENFORCER,
        prompt: `Check compliance with coding standards for: ${filePath}
                 Verify:
                 - Naming conventions
                 - Code formatting
                 - Documentation standards
                 - Error handling patterns
                 - Logging practices`,
        context: { filePath, phase: 'compliance' },
        priority: 6
      });
    }
    
    // Execute workflow tasks
    const results = await this.executeParallelTasks(workflowTasks);
    
    // Phase 4: Synthesis and recommendations
    const synthesisTask: AgentTask = {
      id: uuidv4(),
      type: AgentType.DEVELOPMENT_PLANNER,
      prompt: `Based on the following analysis results, provide a comprehensive refactoring plan:
               ${JSON.stringify(Array.from(results.values()), null, 2)}
               
               Create a prioritized list of refactoring tasks with:
               - Specific code changes needed
               - Estimated effort and impact
               - Implementation order
               - Risk assessment`,
      context: { 
        filePath, 
        phase: 'synthesis',
        previousResults: Array.from(results.values())
      },
      priority: 10
    };
    
    const synthesisResult = await this.spawnAgent(synthesisTask);
    
    return {
      filePath,
      analysisType,
      phases: {
        initial: Array.from(results.values()).find(r => r.agentType === AgentType.CODE_REVIEWER),
        architecture: Array.from(results.values()).find(r => r.agentType === AgentType.TECHNICAL_ARCHITECT),
        compliance: Array.from(results.values()).find(r => r.agentType === AgentType.SOP_ENFORCER),
        synthesis: synthesisResult
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Group tasks by resource requirements
   */
  private groupTasksByResources(tasks: AgentTask[]): Map<string, AgentTask[]> {
    const groups = new Map<string, AgentTask[]>();
    
    for (const task of tasks) {
      // Determine resource requirement based on task context
      const resource = task.context?.resource || 'none';
      
      if (!groups.has(resource)) {
        groups.set(resource, []);
      }
      
      groups.get(resource)!.push(task);
    }
    
    return groups;
  }
  
  /**
   * Acquire resource lock
   */
  private async acquireResourceLock(resource: string, agentId: string): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 100; // 100ms
    const startTime = Date.now();
    
    while (this.resourceLocks.has(resource)) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Timeout acquiring lock for resource: ${resource}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    this.resourceLocks.set(resource, agentId);
    logger.debug(`Resource lock acquired: ${resource} -> ${agentId}`);
  }
  
  /**
   * Release resource lock
   */
  private releaseResourceLock(resource: string): void {
    this.resourceLocks.delete(resource);
    logger.debug(`Resource lock released: ${resource}`);
  }
  
  /**
   * Wait for agent completion
   */
  private async waitForCompletion(agentId: string, timeout?: number): Promise<any> {
    const maxWaitTime = timeout || config.agents.timeout;
    const checkInterval = 1000; // Check every second
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.orchestratorClient.get(`/api/v1/orchestration/agent/${agentId}/status`);
        
        if (response.data.status === 'completed') {
          return response.data;
        }
        
        if (response.data.status === 'failed') {
          throw new Error(response.data.error || 'Agent task failed');
        }
        
      } catch (error: any) {
        if (error.response?.status !== 404) {
          throw error;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Agent ${agentId} timed out after ${maxWaitTime}ms`);
  }
  
  /**
   * Get active agents
   */
  getActiveAgents(): AgentStatus[] {
    return Array.from(this.activeAgents.values());
  }
  
  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      size: this.taskQueue.size,
      pending: this.taskQueue.pending,
      isPaused: this.taskQueue.isPaused,
      concurrency: config.agents.maxConcurrent
    };
  }
  
  /**
   * Pause task processing
   */
  pauseProcessing(): void {
    this.taskQueue.pause();
    logger.info('Agent task processing paused');
  }
  
  /**
   * Resume task processing
   */
  resumeProcessing(): void {
    this.taskQueue.start();
    logger.info('Agent task processing resumed');
  }
  
  /**
   * Clear pending tasks
   */
  clearPendingTasks(): void {
    this.taskQueue.clear();
    logger.info('Pending agent tasks cleared');
  }
}