import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

export enum TaskStatus {
  PENDING = "pending",
  PLANNING = "planning",
  EXECUTING = "executing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  CRITICAL = 100,
  HIGH = 75,
  MEDIUM = 50,
  LOW = 25,
  BACKGROUND = 10,
}

export interface TaskContext {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  portfolioId?: string;
  terminalSessionId?: string;
  metadata: Record<string, any>;
  sharedState: Record<string, any>;
}

export interface TaskDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  priority: TaskPriority;
  dependencies: string[];
  parallelizable: boolean;
  timeout?: number;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
    exponential: boolean;
  };
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: Error;
  attempts: number;
  context: TaskContext;
  subtasks: TaskExecution[];
}

export interface TaskChain {
  id: string;
  name: string;
  goals: string[];
  tasks: TaskDefinition[];
  executionOrder: string[][];
  context: TaskContext;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
}

export class TaskOrchestratorService extends EventEmitter {
  private taskRegistry: Map<string, TaskDefinition> = new Map();
  private executionQueue: Map<string, TaskExecution> = new Map();
  private activeChains: Map<string, TaskChain> = new Map();
  private taskExecutors: Map<string, Function> = new Map();
  private contextManager: ContextManagerService;
  private errorRecoveryService: ErrorRecoveryService;
  private initialized: boolean = false;

  constructor() {
    super();
    this.setMaxListeners(20); // Prevent EventEmitter memory leak warnings
    this.contextManager = new ContextManagerService();
    this.errorRecoveryService = new ErrorRecoveryService();
    this.registerBuiltInTasks();
  }

  /**
   * Register built-in task types (with duplicate prevention)
   */
  private registerBuiltInTasks(): void {
    // Prevent duplicate initialization
    if (this.initialized) {
      logger.info('TaskOrchestrator already initialized, skipping...');
      return;
    }
    // Code generation task
    this.registerTask({
      id: "code-generation",
      type: "development",
      name: "Generate Code",
      description: "AI-powered code generation from requirements",
      priority: TaskPriority.HIGH,
      dependencies: [],
      parallelizable: false,
      timeout: 30000,
      retryConfig: {
        maxAttempts: 3,
        backoffMs: 1000,
        exponential: true,
      },
    });

    // Code analysis task
    this.registerTask({
      id: "code-analysis",
      type: "development",
      name: "Analyze Code",
      description: "Analyze code for quality, patterns, and issues",
      priority: TaskPriority.MEDIUM,
      dependencies: [],
      parallelizable: true,
      timeout: 20000,
    });

    // Portfolio analysis task
    this.registerTask({
      id: "portfolio-analysis",
      type: "finance",
      name: "Analyze Portfolio",
      description: "AI-driven portfolio performance analysis",
      priority: TaskPriority.HIGH,
      dependencies: [],
      parallelizable: false,
      timeout: 15000,
    });

    // Documentation generation task
    this.registerTask({
      id: "doc-generation",
      type: "documentation",
      name: "Generate Documentation",
      description: "Auto-generate documentation from code",
      priority: TaskPriority.LOW,
      dependencies: ["code-analysis"],
      parallelizable: true,
      timeout: 10000,
    });

    // Git operations task
    this.registerTask({
      id: "git-operations",
      type: "vcs",
      name: "Git Operations",
      description: "Automated git operations with AI assistance",
      priority: TaskPriority.MEDIUM,
      dependencies: [],
      parallelizable: false,
      timeout: 20000,
    });

    this.initialized = true;
    logger.info('TaskOrchestrator initialized successfully');
  }

  /**
   * Register a new task type
   */
  public registerTask(task: TaskDefinition): void {
    this.taskRegistry.set(task.id, task);
    logger.info(`Task registered: ${task.id}`);
  }

  /**
   * Register a task executor function
   */
  public registerExecutor(taskType: string, executor: Function): void {
    this.taskExecutors.set(taskType, executor);
    logger.info(`Executor registered for task type: ${taskType}`);
  }

  /**
   * Create a task chain from goals
   */
  public async createTaskChain(
    goals: string[],
    context: TaskContext,
  ): Promise<TaskChain> {
    const chainId = uuidv4();

    logger.info(`Creating task chain for goals: ${goals.join(", ")}`);

    // Analyze goals and generate task plan
    const tasks = await this.planTasksFromGoals(goals, context);
    const executionOrder = this.determineExecutionOrder(tasks);

    const chain: TaskChain = {
      id: chainId,
      name: `Chain-${chainId.substring(0, 8)}`,
      goals,
      tasks,
      executionOrder,
      context,
      status: TaskStatus.PLANNING,
      createdAt: new Date(),
    };

    this.activeChains.set(chainId, chain);
    this.emit("chain:created", chain);

    return chain;
  }

  /**
   * Plan tasks from high-level goals using AI
   */
  private async planTasksFromGoals(
    goals: string[],
    context: TaskContext,
  ): Promise<TaskDefinition[]> {
    const tasks: TaskDefinition[] = [];

    for (const goal of goals) {
      // Analyze goal and determine required tasks
      const requiredTasks = await this.analyzeGoal(goal, context);

      for (const taskType of requiredTasks) {
        const taskDef = this.taskRegistry.get(taskType);
        if (taskDef) {
          tasks.push({ ...taskDef, id: `${taskDef.id}-${uuidv4()}` });
        }
      }
    }

    return tasks;
  }

  /**
   * Analyze a goal and determine required tasks
   */
  private async analyzeGoal(
    goal: string,
    context: TaskContext,
  ): Promise<string[]> {
    // AI-powered goal analysis
    const goalKeywords = goal.toLowerCase();
    const taskTypes: string[] = [];

    if (goalKeywords.includes("code") || goalKeywords.includes("implement")) {
      taskTypes.push("code-generation");
      taskTypes.push("code-analysis");
    }

    if (goalKeywords.includes("document") || goalKeywords.includes("docs")) {
      taskTypes.push("doc-generation");
    }

    if (
      goalKeywords.includes("portfolio") ||
      goalKeywords.includes("trading")
    ) {
      taskTypes.push("portfolio-analysis");
    }

    if (goalKeywords.includes("git") || goalKeywords.includes("commit")) {
      taskTypes.push("git-operations");
    }

    return taskTypes;
  }

  /**
   * Determine optimal execution order for tasks
   */
  private determineExecutionOrder(tasks: TaskDefinition[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map((t) => t.id));

    while (remaining.size > 0) {
      const batch: string[] = [];

      for (const taskId of remaining) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) continue;

        // Check if all dependencies are completed
        const depsCompleted = task.dependencies.every(
          (dep) => completed.has(dep) || !remaining.has(dep),
        );

        if (depsCompleted) {
          batch.push(taskId);
        }
      }

      if (batch.length === 0 && remaining.size > 0) {
        // Circular dependency detected
        logger.warn("Circular dependency detected in task chain");
        batch.push(...Array.from(remaining));
      }

      for (const taskId of batch) {
        remaining.delete(taskId);
        completed.add(taskId);
      }

      if (batch.length > 0) {
        order.push(batch);
      }
    }

    return order;
  }

  /**
   * Execute a task chain
   */
  public async executeChain(chainId: string): Promise<void> {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Task chain not found: ${chainId}`);
    }

    chain.status = TaskStatus.EXECUTING;
    this.emit("chain:started", chain);

    try {
      // Build context for the chain
      const enrichedContext = await this.contextManager.buildContext(
        chain.context,
      );

      // Execute tasks in order
      for (const batch of chain.executionOrder) {
        await this.executeBatch(batch, chain, enrichedContext);
      }

      chain.status = TaskStatus.COMPLETED;
      chain.completedAt = new Date();
      this.emit("chain:completed", chain);
    } catch (error: any) {
      logger.error(`Chain execution failed: ${chainId}`, error);
      chain.status = TaskStatus.FAILED;

      // Attempt error recovery
      const recovery = await this.errorRecoveryService.analyzeAndRecover(
        error,
        chain,
      );
      if (recovery.success) {
        logger.info(`Successfully recovered from error in chain: ${chainId}`);
        await this.executeChain(chainId); // Retry with recovery applied
      } else {
        this.emit("chain:failed", { chain, error });
      }
    }
  }

  /**
   * Execute a batch of tasks in parallel
   */
  private async executeBatch(
    taskIds: string[],
    chain: TaskChain,
    context: TaskContext,
  ): Promise<void> {
    const executions = taskIds.map((taskId) =>
      this.executeTask(taskId, chain, context),
    );
    await Promise.all(executions);
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    taskId: string,
    chain: TaskChain,
    context: TaskContext,
  ): Promise<TaskExecution> {
    const task = chain.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const execution: TaskExecution = {
      id: uuidv4(),
      taskId,
      status: TaskStatus.EXECUTING,
      progress: 0,
      startTime: new Date(),
      attempts: 0,
      context,
      subtasks: [],
    };

    this.executionQueue.set(execution.id, execution);
    this.emit("task:started", execution);

    try {
      // Get the executor for this task type
      const executor = this.taskExecutors.get(task.type);
      if (!executor) {
        throw new Error(`No executor found for task type: ${task.type}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        executor,
        [task, context],
        task.timeout || 30000,
      );

      execution.status = TaskStatus.COMPLETED;
      execution.progress = 100;
      execution.endTime = new Date();
      execution.result = result;

      this.emit("task:completed", execution);
      return execution;
    } catch (error: any) {
      execution.status = TaskStatus.FAILED;
      execution.error = error;
      execution.endTime = new Date();

      // Attempt retry if configured
      if (
        task.retryConfig &&
        execution.attempts < task.retryConfig.maxAttempts
      ) {
        execution.attempts++;
        const delay = this.calculateRetryDelay(
          execution.attempts,
          task.retryConfig,
        );

        logger.info(
          `Retrying task ${taskId} in ${delay}ms (attempt ${execution.attempts})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.executeTask(taskId, chain, context);
      }

      this.emit("task:failed", execution);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout(
    func: Function,
    args: any[],
    timeoutMs: number,
  ): Promise<any> {
    return Promise.race([
      func(...args),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Task execution timeout")),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(
    attempt: number,
    config: { backoffMs: number; exponential: boolean },
  ): number {
    if (config.exponential) {
      return config.backoffMs * Math.pow(2, attempt - 1);
    }
    return config.backoffMs;
  }

  /**
   * Get chain status
   */
  public getChainStatus(chainId: string): TaskChain | undefined {
    return this.activeChains.get(chainId);
  }

  /**
   * Get all active chains
   */
  public getActiveChains(): TaskChain[] {
    return Array.from(this.activeChains.values());
  }

  /**
   * Get execution queue for task status checking
   */
  public getExecutionQueue(): Map<string, TaskExecution> {
    return this.executionQueue;
  }

  /**
   * Cancel a chain execution
   */
  public async cancelChain(chainId: string): Promise<void> {
    const chain = this.activeChains.get(chainId);
    if (chain) {
      chain.status = TaskStatus.CANCELLED;
      this.emit("chain:cancelled", chain);
      this.activeChains.delete(chainId);
    }
  }

  /**
   * Cleanup completed chains
   */
  public cleanupCompletedChains(maxAge: number = 3600000): void {
    const now = Date.now();

    for (const [chainId, chain] of this.activeChains.entries()) {
      if (chain.completedAt && now - chain.completedAt.getTime() > maxAge) {
        this.activeChains.delete(chainId);
        logger.info(`Cleaned up completed chain: ${chainId}`);
      }
    }
  }
}

/**
 * Context Manager Service
 */
class ContextManagerService {
  private contextCache: Map<string, any> = new Map();

  public async buildContext(baseContext: TaskContext): Promise<TaskContext> {
    const cacheKey = `${baseContext.userId}-${baseContext.sessionId}`;

    // Check cache
    if (this.contextCache.has(cacheKey)) {
      const cached = this.contextCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.context;
      }
    }

    // Build enriched context
    const enrichedContext: TaskContext = {
      ...baseContext,
      sharedState: {
        ...baseContext.sharedState,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
    };

    // Cache the context
    this.contextCache.set(cacheKey, {
      context: enrichedContext,
      timestamp: Date.now(),
    });

    return enrichedContext;
  }

  public updateContext(
    context: TaskContext,
    updates: Partial<TaskContext>,
  ): TaskContext {
    return {
      ...context,
      ...updates,
      sharedState: {
        ...context.sharedState,
        ...updates.sharedState,
      },
    };
  }

  public clearCache(): void {
    this.contextCache.clear();
  }
}

/**
 * Error Recovery Service
 */
class ErrorRecoveryService {
  private recoveryStrategies: Map<string, Function> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // Timeout recovery
    this.recoveryStrategies.set(
      "timeout",
      async (error: Error, context: any) => {
        logger.info("Applying timeout recovery strategy");
        return {
          success: true,
          action: "retry",
          modifications: { timeout: context.timeout * 2 },
        };
      },
    );

    // Connection error recovery
    this.recoveryStrategies.set(
      "connection",
      async (error: Error, context: any) => {
        logger.info("Applying connection recovery strategy");
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        return {
          success: true,
          action: "retry",
          modifications: {},
        };
      },
    );

    // Resource exhaustion recovery
    this.recoveryStrategies.set(
      "resource",
      async (error: Error, context: any) => {
        logger.info("Applying resource recovery strategy");
        return {
          success: true,
          action: "queue",
          modifications: { priority: TaskPriority.BACKGROUND },
        };
      },
    );
  }

  public async analyzeAndRecover(error: Error, context: any): Promise<any> {
    // Analyze error type
    const errorType = this.classifyError(error);

    // Get recovery strategy
    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      logger.warn(`No recovery strategy for error type: ${errorType}`);
      return { success: false };
    }

    // Apply recovery strategy
    return strategy(error, context);
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("timeout")) return "timeout";
    if (message.includes("connection") || message.includes("network"))
      return "connection";
    if (message.includes("memory") || message.includes("resource"))
      return "resource";

    return "unknown";
  }
}

// Export singleton instance
export const taskOrchestrator = new TaskOrchestratorService();
