/**
 * Agent Spawner Service
 * Manages spawning and coordination of multiple Claude CLI instances
 * @AI-MARKER:SERVICE:AGENT_SPAWNER
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { enhancedUsageMonitor } from './enhanced-usage-monitor.service';

export enum AgentType {
  BUSINESS_ANALYST = 'business-analyst',
  DEVELOPMENT_PLANNER = 'development-planner',
  TECHNICAL_ARCHITECT = 'technical-architect',
  SYSTEM_ANALYST = 'system-analyst',
  CODE_REVIEWER = 'code-reviewer',
  SOP_ENFORCER = 'sop-enforcer',
  DEVOPS_AUDITOR = 'devops-maturity-auditor',
  DEV_CONSULTANT = 'dev-life-consultant',
  TEST_RUNNER = 'test-runner',
  GENERAL_PURPOSE = 'general-purpose'
}

export enum AgentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  WORKING = 'working',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TERMINATED = 'terminated'
}

export interface AgentConfig {
  type: AgentType;
  maxTokens?: number;
  temperature?: number;
  model?: 'opus' | 'sonnet' | 'haiku';
  timeout?: number;
  retryOnFailure?: boolean;
  requiresApproval?: boolean;
}

export interface AgentTask {
  id: string;
  description: string;
  prompt: string;
  context?: Record<string, any>;
  dependencies?: string[];
  priority?: number;
  deadline?: Date;
}

export interface AgentInstance {
  id: string;
  type: AgentType;
  status: AgentStatus;
  process?: ChildProcess;
  task?: AgentTask;
  startTime: Date;
  endTime?: Date;
  output: string[];
  errors: string[];
  metadata: Record<string, any>;
}

export class AgentSpawnerService extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private taskQueue: AgentTask[] = [];
  private maxConcurrentAgents: number = 5; // Max 20x plan allows this
  private claudeCliPath: string = 'claude';
  private workDir: string = '/Volumes/Untitled/Progress/port';
  private agentConfigs: Map<AgentType, AgentConfig> = new Map();

  constructor() {
    super();
    this.initializeAgentConfigs();
    this.setupCleanupHandlers();
  }

  /**
   * Initialize default agent configurations
   */
  private initializeAgentConfigs(): void {
    // Business Analyst - Requirements analysis
    this.agentConfigs.set(AgentType.BUSINESS_ANALYST, {
      type: AgentType.BUSINESS_ANALYST,
      model: 'sonnet',
      maxTokens: 4096,
      requiresApproval: false
    });

    // Development Planner - Technical planning
    this.agentConfigs.set(AgentType.DEVELOPMENT_PLANNER, {
      type: AgentType.DEVELOPMENT_PLANNER,
      model: 'sonnet',
      maxTokens: 4096,
      requiresApproval: true
    });

    // Code Reviewer - Quality checks
    this.agentConfigs.set(AgentType.CODE_REVIEWER, {
      type: AgentType.CODE_REVIEWER,
      model: 'sonnet',
      maxTokens: 3000,
      requiresApproval: false
    });

    // Test Runner - Automated testing
    this.agentConfigs.set(AgentType.TEST_RUNNER, {
      type: AgentType.TEST_RUNNER,
      model: 'haiku',
      maxTokens: 2000,
      requiresApproval: false
    });

    // SOP Enforcer - Standards compliance
    this.agentConfigs.set(AgentType.SOP_ENFORCER, {
      type: AgentType.SOP_ENFORCER,
      model: 'sonnet',
      maxTokens: 3000,
      requiresApproval: false
    });
  }

  /**
   * Spawn a new agent instance
   */
  public async spawnAgent(
    type: AgentType,
    task: AgentTask,
    config?: Partial<AgentConfig>
  ): Promise<string> {
    // Check concurrent limit
    const activeAgents = Array.from(this.agents.values()).filter(
      a => a.status === AgentStatus.WORKING || a.status === AgentStatus.INITIALIZING
    );

    if (activeAgents.length >= this.maxConcurrentAgents) {
      logger.warn(`Max concurrent agents reached (${this.maxConcurrentAgents})`);
      this.taskQueue.push(task);
      this.emit('task:queued', task);
      return 'queued';
    }

    const agentId = uuidv4();
    const agentConfig = {
      ...this.agentConfigs.get(type),
      ...config
    } as AgentConfig;

    const agent: AgentInstance = {
      id: agentId,
      type,
      status: AgentStatus.INITIALIZING,
      task,
      startTime: new Date(),
      output: [],
      errors: [],
      metadata: {
        config: agentConfig,
        workDir: this.workDir
      }
    };

    this.agents.set(agentId, agent);
    this.emit('agent:spawned', agent);

    // Prepare task file
    const taskFile = await this.prepareTaskFile(agentId, task, type);

    // Spawn Claude CLI process
    try {
      const args = this.buildClaudeArgs(agentConfig);
      const taskContent = fs.readFileSync(taskFile, 'utf-8');
      
      const claudeProcess = spawn(this.claudeCliPath, args, {
        cwd: this.workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_AGENT_ID: agentId,
          CLAUDE_AGENT_TYPE: type
        }
      });

      // Handle process spawn error immediately  
      claudeProcess.on('error', (error) => {
        logger.error(`Failed to spawn Claude CLI process for agent ${agentId}:`, error);
        agent.status = AgentStatus.FAILED;
        agent.errors.push(`Process spawn error: ${error.message}`);
        this.emit('agent:failed', { agent, error });
        throw error;
      });
      
      // Send task content via stdin with proper encoding
      if (claudeProcess.stdin && taskContent) {
        try {
          claudeProcess.stdin.write(taskContent, 'utf8');
          claudeProcess.stdin.end();
        } catch (error: any) {
          logger.error(`Failed to write to Claude CLI stdin for agent ${agentId}:`, error);
          agent.errors.push(`Stdin write error: ${error.message}`);
        }
      } else {
        logger.warn(`No stdin available for agent ${agentId} or no task content`);
      }

      agent.process = claudeProcess;
      agent.status = AgentStatus.WORKING;

      // Handle stdout
      claudeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        agent.output.push(output);
        this.emit('agent:output', { agentId, output });
        logger.debug(`Agent ${agentId} output: ${output}`);
      });

      // Handle stderr
      claudeProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        agent.errors.push(error);
        this.emit('agent:error', { agentId, error });
        logger.error(`Agent ${agentId} error: ${error}`);
      });

      // Handle process exit
      claudeProcess.on('exit', async (code) => {
        agent.status = code === 0 ? AgentStatus.COMPLETED : AgentStatus.FAILED;
        agent.endTime = new Date();
        
        // Track usage metrics
        const duration = agent.endTime.getTime() - agent.startTime.getTime();
        const tokenUsage = enhancedUsageMonitor.extractTokenUsage(agent.output);
        
        try {
          await enhancedUsageMonitor.trackUsage({
            agentId: agent.id,
            agentType: agent.type,
            model: this.getModelFromConfig(agentConfig),
            inputTokens: tokenUsage.input,
            outputTokens: tokenUsage.output,
            duration,
            cost: 0, // Will be calculated by the service
            timestamp: new Date(),
            sessionId: task.context?.sessionId || 'unknown',
            userId: task.context?.userId || 'system',
            taskId: task.id,
            metadata: {
              exitCode: code,
              taskDescription: task.description,
              workDir: this.workDir
            }
          });
        } catch (error) {
          logger.error('Failed to track usage metrics:', error);
        }
        
        this.emit('agent:completed', agent);
        
        // Clean up task file
        this.cleanupTaskFile(taskFile);
        
        // Process next queued task if any
        this.processQueuedTasks();
      });

      // Handle process error
      claudeProcess.on('error', (error) => {
        logger.error(`Failed to spawn agent ${agentId}:`, error);
        agent.status = AgentStatus.FAILED;
        agent.errors.push(error.message);
        this.emit('agent:failed', agent);
      });

      logger.info(`Agent ${agentId} spawned successfully (type: ${type})`);
      return agentId;

    } catch (error: any) {
      logger.error(`Failed to spawn agent:`, error);
      agent.status = AgentStatus.FAILED;
      agent.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Build Claude CLI arguments
   */
  private buildClaudeArgs(config: AgentConfig): string[] {
    const args: string[] = [];

    // Model selection - Use the correct Claude CLI model names
    if (config.model === 'opus') {
      args.push('--model', 'claude-3-opus-20240229');
    } else if (config.model === 'sonnet') {
      args.push('--model', 'claude-3-5-sonnet-20241022');
    } else if (config.model === 'haiku') {
      args.push('--model', 'claude-3-haiku-20240307');
    } else {
      // Default to sonnet if no model specified
      args.push('--model', 'claude-3-5-sonnet-20241022');
    }

    // Add timeout if specified
    if (config.timeout) {
      args.push('--timeout', config.timeout.toString());
    }

    // Use non-interactive mode (content comes from stdin, single response)
    // Note: Claude CLI doesn't use --no-stream, we just send input via stdin

    logger.debug(`Claude CLI args for agent:`, args);
    return args;
  }

  /**
   * Prepare task file for agent
   */
  private async prepareTaskFile(
    agentId: string,
    task: AgentTask,
    type: AgentType
  ): Promise<string> {
    const taskDir = path.join(this.workDir, '.ai-tasks');
    
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    const taskFile = path.join(taskDir, `task-${agentId}.md`);
    
    // Build task content with context
    const content = this.buildTaskContent(task, type);
    
    fs.writeFileSync(taskFile, content);
    return taskFile;
  }

  /**
   * Build task content for agent
   */
  private buildTaskContent(task: AgentTask, type: AgentType): string {
    let content = `# AI Agent Task

**Agent Type**: ${type}
**Task ID**: ${task.id}
**Description**: ${task.description}

## Instructions

${task.prompt}

## Context

\`\`\`json
${JSON.stringify(task.context || {}, null, 2)}
\`\`\`

## Requirements

1. Follow the SOPs defined in CLAUDE.md
2. Use the appropriate agent type guidelines
3. Provide clear, actionable output
4. Include code examples where applicable
5. Document any assumptions made

## Output Format

Please provide your response in a structured format with:
- Executive Summary
- Detailed Analysis
- Recommendations
- Implementation Steps (if applicable)
- Code Examples (if applicable)

---

**Note**: You are running as a spawned agent with type "${type}". Focus on your specialized domain and provide expert-level insights.
`;

    // Add type-specific instructions
    switch (type) {
      case AgentType.BUSINESS_ANALYST:
        content += '\n\n## Business Analyst Focus\n- Analyze requirements thoroughly\n- Create user stories\n- Define acceptance criteria\n- Map business processes';
        break;
      
      case AgentType.CODE_REVIEWER:
        content += '\n\n## Code Review Focus\n- Check code quality\n- Identify security issues\n- Suggest performance improvements\n- Ensure SOP compliance';
        break;
      
      case AgentType.TEST_RUNNER:
        content += '\n\n## Testing Focus\n- Create comprehensive test cases\n- Run automated tests\n- Report coverage metrics\n- Identify edge cases';
        break;
    }

    return content;
  }

  /**
   * Clean up task file
   */
  private cleanupTaskFile(taskFile: string): void {
    try {
      if (fs.existsSync(taskFile)) {
        fs.unlinkSync(taskFile);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup task file: ${taskFile}`);
    }
  }

  /**
   * Process queued tasks
   */
  private processQueuedTasks(): void {
    if (this.taskQueue.length === 0) return;

    const activeAgents = Array.from(this.agents.values()).filter(
      a => a.status === AgentStatus.WORKING || a.status === AgentStatus.INITIALIZING
    );

    if (activeAgents.length < this.maxConcurrentAgents) {
      const task = this.taskQueue.shift();
      if (task) {
        // Determine agent type based on task
        const agentType = this.determineAgentType(task);
        this.spawnAgent(agentType, task);
      }
    }
  }

  /**
   * Determine appropriate agent type for task
   */
  private determineAgentType(task: AgentTask): AgentType {
    const keywords = task.description.toLowerCase() + ' ' + task.prompt.toLowerCase();

    if (keywords.includes('requirement') || keywords.includes('user story')) {
      return AgentType.BUSINESS_ANALYST;
    }
    if (keywords.includes('review') || keywords.includes('quality')) {
      return AgentType.CODE_REVIEWER;
    }
    if (keywords.includes('test') || keywords.includes('coverage')) {
      return AgentType.TEST_RUNNER;
    }
    if (keywords.includes('architecture') || keywords.includes('design')) {
      return AgentType.TECHNICAL_ARCHITECT;
    }
    if (keywords.includes('plan') || keywords.includes('roadmap')) {
      return AgentType.DEVELOPMENT_PLANNER;
    }

    return AgentType.GENERAL_PURPOSE;
  }

  /**
   * Get agent status
   */
  public getAgentStatus(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get active agents
   */
  public getActiveAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(
      a => a.status === AgentStatus.WORKING || a.status === AgentStatus.INITIALIZING
    );
  }

  /**
   * Terminate agent
   */
  public terminateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.process) {
      return false;
    }

    try {
      agent.process.kill('SIGTERM');
      agent.status = AgentStatus.TERMINATED;
      agent.endTime = new Date();
      this.emit('agent:terminated', agent);
      
      logger.info(`Agent ${agentId} terminated`);
      return true;
    } catch (error) {
      logger.error(`Failed to terminate agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Terminate all agents
   */
  public terminateAllAgents(): void {
    for (const agent of this.agents.values()) {
      if (agent.process) {
        this.terminateAgent(agent.id);
      }
    }
  }

  /**
   * Setup cleanup handlers
   */
  private setupCleanupHandlers(): void {
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, terminating all agents...');
      this.terminateAllAgents();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, terminating all agents...');
      this.terminateAllAgents();
    });
  }

  /**
   * Get agent metrics
   */
  public getMetrics(): Record<string, any> {
    const agents = Array.from(this.agents.values());
    
    return {
      total: agents.length,
      active: agents.filter(a => a.status === AgentStatus.WORKING).length,
      completed: agents.filter(a => a.status === AgentStatus.COMPLETED).length,
      failed: agents.filter(a => a.status === AgentStatus.FAILED).length,
      queued: this.taskQueue.length,
      byType: Object.values(AgentType).reduce((acc, type) => {
        acc[type] = agents.filter(a => a.type === type).length;
        return acc;
      }, {} as Record<string, number>),
      averageExecutionTime: this.calculateAverageExecutionTime()
    };
  }

  /**
   * Calculate average execution time
   */
  private calculateAverageExecutionTime(): number {
    const completedAgents = Array.from(this.agents.values())
      .filter(a => a.status === AgentStatus.COMPLETED && a.endTime);

    if (completedAgents.length === 0) return 0;

    const totalTime = completedAgents.reduce((sum, agent) => {
      const duration = agent.endTime!.getTime() - agent.startTime.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completedAgents.length;
  }

  /**
   * Get model string from config
   */
  private getModelFromConfig(config: AgentConfig): string {
    if (config.model === 'opus') {
      return 'claude-3-opus-20240229';
    } else if (config.model === 'sonnet') {
      return 'claude-3-5-sonnet-20241022'; 
    } else if (config.model === 'haiku') {
      return 'claude-3-haiku-20240307';
    }
    return 'claude-3-5-sonnet-20241022'; // Default to sonnet
  }
}

// Export singleton instance
export const agentSpawner = new AgentSpawnerService();