import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

export interface Goal {
  id: string;
  description: string;
  type: "development" | "analysis" | "documentation" | "trading" | "management";
  priority: number;
  constraints?: {
    deadline?: Date;
    budget?: number;
    resources?: string[];
    dependencies?: string[];
  };
  metadata?: Record<string, any>;
}

export interface TaskPlan {
  id: string;
  goalId: string;
  tasks: PlannedTask[];
  executionStrategy: ExecutionStrategy;
  estimatedDuration: number;
  requiredResources: string[];
  riskAssessment: RiskAssessment;
  alternatives: TaskPlan[];
}

export interface PlannedTask {
  id: string;
  name: string;
  description: string;
  type: string;
  priority: number;
  dependencies: string[];
  estimatedDuration: number;
  requiredCapabilities: string[];
  inputRequirements: Record<string, any>;
  expectedOutputs: Record<string, any>;
  parallelizable: boolean;
  optional: boolean;
  fallbackStrategy?: string;
}

export interface ExecutionStrategy {
  type: "sequential" | "parallel" | "hybrid";
  parallelismLevel: number;
  priorityOrder: string[];
  adaptiveReplanning: boolean;
  checkpoints: string[];
}

export interface RiskAssessment {
  overallRisk: "low" | "medium" | "high" | "critical";
  risks: Risk[];
  mitigationStrategies: MitigationStrategy[];
}

export interface Risk {
  id: string;
  type: string;
  description: string;
  probability: number;
  impact: number;
  affectedTasks: string[];
}

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  cost: number;
  effectiveness: number;
}

export class TaskPlannerService extends EventEmitter {
  private planningTemplates: Map<string, PlanTemplate> = new Map();
  private historicalPlans: Map<string, TaskPlan[]> = new Map();
  private learningEngine: PlanningLearningEngine;

  constructor() {
    super();
    this.learningEngine = new PlanningLearningEngine();
    this.initializeTemplates();
  }

  /**
   * Initialize planning templates for common goal types
   */
  private initializeTemplates(): void {
    // Development goal template
    this.planningTemplates.set("development", {
      id: "dev-template",
      goalType: "development",
      standardTasks: [
        "requirements-analysis",
        "design-review",
        "implementation",
        "testing",
        "documentation",
        "deployment",
      ],
      typicalDuration: 7200000, // 2 hours
      requiredCapabilities: ["coding", "testing", "debugging"],
    });

    // Analysis goal template
    this.planningTemplates.set("analysis", {
      id: "analysis-template",
      goalType: "analysis",
      standardTasks: [
        "data-collection",
        "data-processing",
        "pattern-analysis",
        "insight-generation",
        "report-creation",
      ],
      typicalDuration: 3600000, // 1 hour
      requiredCapabilities: ["data-analysis", "visualization", "reporting"],
    });

    // Trading goal template
    this.planningTemplates.set("trading", {
      id: "trading-template",
      goalType: "trading",
      standardTasks: [
        "market-analysis",
        "risk-assessment",
        "strategy-selection",
        "order-preparation",
        "execution",
        "monitoring",
      ],
      typicalDuration: 1800000, // 30 minutes
      requiredCapabilities: ["market-analysis", "risk-management", "trading"],
    });
  }

  /**
   * Create a comprehensive task plan from a goal
   */
  public async createPlan(goal: Goal): Promise<TaskPlan> {
    logger.info(`Creating task plan for goal: ${goal.description}`);

    // Analyze goal complexity
    const complexity = await this.analyzeGoalComplexity(goal);

    // Generate base plan
    const basePlan = await this.generateBasePlan(goal, complexity);

    // Optimize plan based on constraints
    const optimizedPlan = await this.optimizePlan(basePlan, goal.constraints);

    // Assess risks
    const riskAssessment = await this.assessPlanRisks(optimizedPlan);
    optimizedPlan.riskAssessment = riskAssessment;

    // Generate alternative plans
    const alternatives = await this.generateAlternatives(optimizedPlan, goal);
    optimizedPlan.alternatives = alternatives;

    // Store for learning
    this.storePlanForLearning(goal.id, optimizedPlan);

    this.emit("plan:created", optimizedPlan);
    return optimizedPlan;
  }

  /**
   * Analyze goal complexity to determine planning approach
   */
  private async analyzeGoalComplexity(goal: Goal): Promise<ComplexityAnalysis> {
    const factors = {
      descriptionLength: goal.description.length,
      hasConstraints: !!goal.constraints,
      constraintCount: Object.keys(goal.constraints || {}).length,
      hasDependencies: !!goal.constraints?.dependencies?.length,
      dependencyCount: goal.constraints?.dependencies?.length || 0,
      priority: goal.priority,
    };

    // Calculate complexity score
    let complexityScore = 0;
    complexityScore += Math.min(factors.descriptionLength / 10, 30);
    complexityScore += factors.constraintCount * 10;
    complexityScore += factors.dependencyCount * 15;
    complexityScore += factors.priority / 10;

    const level =
      complexityScore < 30
        ? "simple"
        : complexityScore < 60
          ? "moderate"
          : complexityScore < 90
            ? "complex"
            : "highly-complex";

    return {
      score: complexityScore,
      level,
      factors,
      recommendedApproach: this.getRecommendedApproach(level),
    };
  }

  /**
   * Get recommended planning approach based on complexity
   */
  private getRecommendedApproach(complexityLevel: string): string {
    const approaches: Record<string, string> = {
      simple: "template-based",
      moderate: "hybrid",
      complex: "ai-generated",
      "highly-complex": "multi-phase-ai",
    };
    return approaches[complexityLevel] || "ai-generated";
  }

  /**
   * Generate base plan from goal and complexity analysis
   */
  private async generateBasePlan(
    goal: Goal,
    complexity: ComplexityAnalysis,
  ): Promise<TaskPlan> {
    const planId = uuidv4();

    // Get template if available
    const template = this.planningTemplates.get(goal.type);

    // Generate tasks based on complexity and template
    const tasks = await this.generateTasks(goal, template, complexity);

    // Determine execution strategy
    const executionStrategy = this.determineExecutionStrategy(
      tasks,
      complexity,
    );

    // Calculate estimated duration
    const estimatedDuration = this.calculateEstimatedDuration(tasks);

    // Identify required resources
    const requiredResources = this.identifyRequiredResources(tasks);

    return {
      id: planId,
      goalId: goal.id,
      tasks,
      executionStrategy,
      estimatedDuration,
      requiredResources,
      riskAssessment: {
        overallRisk: "low",
        risks: [],
        mitigationStrategies: [],
      },
      alternatives: [],
    };
  }

  /**
   * Generate tasks for the plan
   */
  private async generateTasks(
    goal: Goal,
    template: PlanTemplate | undefined,
    complexity: ComplexityAnalysis,
  ): Promise<PlannedTask[]> {
    const tasks: PlannedTask[] = [];

    // Parse goal description for action items
    const actionItems = this.parseGoalDescription(goal.description);

    // Generate tasks for each action item
    for (let i = 0; i < actionItems.length; i++) {
      const action = actionItems[i];
      const task: PlannedTask = {
        id: `task-${uuidv4()}`,
        name: action.name,
        description: action.description,
        type: this.determineTaskType(action),
        priority: goal.priority - i * 5, // Decrease priority for later tasks
        dependencies: i > 0 ? [`task-${tasks[i - 1].id}`] : [],
        estimatedDuration: this.estimateTaskDuration(action, complexity),
        requiredCapabilities: this.identifyRequiredCapabilities(action),
        inputRequirements: {},
        expectedOutputs: {},
        parallelizable: this.isTaskParallelizable(action),
        optional: false,
      };

      tasks.push(task);
    }

    // Add template tasks if applicable
    if (template && complexity.level !== "highly-complex") {
      for (const standardTask of template.standardTasks) {
        if (!tasks.some((t) => t.type === standardTask)) {
          tasks.push(this.createStandardTask(standardTask, goal.priority));
        }
      }
    }

    return tasks;
  }

  /**
   * Parse goal description into action items
   */
  private parseGoalDescription(description: string): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const sentences = description.split(/[.!?]+/).filter((s) => s.trim());

    for (const sentence of sentences) {
      const cleaned = sentence.trim().toLowerCase();

      // Identify action verbs
      const actionVerbs = [
        "create",
        "build",
        "implement",
        "analyze",
        "optimize",
        "refactor",
        "test",
        "deploy",
        "document",
        "review",
        "fix",
        "update",
        "migrate",
        "integrate",
        "configure",
      ];

      for (const verb of actionVerbs) {
        if (cleaned.includes(verb)) {
          actionItems.push({
            name: `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${this.extractObject(cleaned, verb)}`,
            description: sentence.trim(),
            verb,
            object: this.extractObject(cleaned, verb),
          });
          break;
        }
      }
    }

    // If no action items found, create a generic one
    if (actionItems.length === 0) {
      actionItems.push({
        name: "Execute Goal",
        description: description,
        verb: "execute",
        object: "goal",
      });
    }

    return actionItems;
  }

  /**
   * Extract object from sentence after verb
   */
  private extractObject(sentence: string, verb: string): string {
    const parts = sentence.split(verb);
    if (parts.length > 1) {
      const object = parts[1].trim().split(" ").slice(0, 3).join(" ");
      return object || "task";
    }
    return "task";
  }

  /**
   * Determine task type from action item
   */
  private determineTaskType(action: ActionItem): string {
    const typeMapping: Record<string, string> = {
      create: "development",
      build: "development",
      implement: "development",
      analyze: "analysis",
      optimize: "optimization",
      refactor: "refactoring",
      test: "testing",
      deploy: "deployment",
      document: "documentation",
      review: "review",
      fix: "bugfix",
      update: "update",
      migrate: "migration",
      integrate: "integration",
      configure: "configuration",
    };

    return typeMapping[action.verb] || "general";
  }

  /**
   * Estimate task duration
   */
  private estimateTaskDuration(
    action: ActionItem,
    complexity: ComplexityAnalysis,
  ): number {
    const baseDurations: Record<string, number> = {
      development: 3600000, // 1 hour
      analysis: 1800000, // 30 minutes
      testing: 1200000, // 20 minutes
      documentation: 900000, // 15 minutes
      deployment: 600000, // 10 minutes
      review: 900000, // 15 minutes
      general: 1800000, // 30 minutes
    };

    const taskType = this.determineTaskType(action);
    const baseDuration = baseDurations[taskType] || baseDurations.general;

    // Adjust based on complexity
    const complexityMultiplier =
      complexity.level === "simple"
        ? 0.7
        : complexity.level === "moderate"
          ? 1.0
          : complexity.level === "complex"
            ? 1.5
            : 2.0;

    return Math.round(baseDuration * complexityMultiplier);
  }

  /**
   * Identify required capabilities for task
   */
  private identifyRequiredCapabilities(action: ActionItem): string[] {
    const capabilityMapping: Record<string, string[]> = {
      create: ["coding", "design"],
      build: ["coding", "architecture"],
      implement: ["coding", "testing"],
      analyze: ["data-analysis", "reporting"],
      optimize: ["performance-analysis", "optimization"],
      refactor: ["code-analysis", "refactoring"],
      test: ["testing", "debugging"],
      deploy: ["deployment", "devops"],
      document: ["documentation", "writing"],
      review: ["code-review", "analysis"],
      fix: ["debugging", "coding"],
      update: ["coding", "testing"],
      migrate: ["migration", "data-management"],
      integrate: ["integration", "api-management"],
      configure: ["configuration", "system-admin"],
    };

    return capabilityMapping[action.verb] || ["general"];
  }

  /**
   * Check if task can be parallelized
   */
  private isTaskParallelizable(action: ActionItem): boolean {
    const nonParallelizableVerbs = ["deploy", "migrate", "integrate"];
    return !nonParallelizableVerbs.includes(action.verb);
  }

  /**
   * Create a standard task from template
   */
  private createStandardTask(taskType: string, priority: number): PlannedTask {
    return {
      id: `task-${uuidv4()}`,
      name: taskType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      description: `Standard ${taskType} task`,
      type: taskType,
      priority: priority - 10,
      dependencies: [],
      estimatedDuration: 900000, // 15 minutes default
      requiredCapabilities: [taskType],
      inputRequirements: {},
      expectedOutputs: {},
      parallelizable: true,
      optional: true,
    };
  }

  /**
   * Determine execution strategy
   */
  private determineExecutionStrategy(
    tasks: PlannedTask[],
    complexity: ComplexityAnalysis,
  ): ExecutionStrategy {
    const hasParallelizableTasks =
      tasks.filter((t) => t.parallelizable).length > 1;
    const hasDependencies = tasks.some((t) => t.dependencies.length > 0);

    let type: "sequential" | "parallel" | "hybrid" = "sequential";
    let parallelismLevel = 1;

    if (hasParallelizableTasks && !hasDependencies) {
      type = "parallel";
      parallelismLevel = Math.min(
        tasks.filter((t) => t.parallelizable).length,
        5,
      );
    } else if (hasParallelizableTasks && hasDependencies) {
      type = "hybrid";
      parallelismLevel = 3;
    }

    return {
      type,
      parallelismLevel,
      priorityOrder: tasks
        .sort((a, b) => b.priority - a.priority)
        .map((t) => t.id),
      adaptiveReplanning:
        complexity.level === "complex" || complexity.level === "highly-complex",
      checkpoints: tasks.filter((_, i) => i % 3 === 0).map((t) => t.id),
    };
  }

  /**
   * Calculate total estimated duration
   */
  private calculateEstimatedDuration(tasks: PlannedTask[]): number {
    const parallelTasks = tasks.filter((t) => t.parallelizable);
    const sequentialTasks = tasks.filter((t) => !t.parallelizable);

    const maxParallelDuration =
      parallelTasks.length > 0
        ? Math.max(...parallelTasks.map((t) => t.estimatedDuration))
        : 0;

    const totalSequentialDuration = sequentialTasks.reduce(
      (sum, t) => sum + t.estimatedDuration,
      0,
    );

    return maxParallelDuration + totalSequentialDuration;
  }

  /**
   * Identify required resources
   */
  private identifyRequiredResources(tasks: PlannedTask[]): string[] {
    const resources = new Set<string>();

    for (const task of tasks) {
      for (const capability of task.requiredCapabilities) {
        resources.add(capability);
      }
    }

    return Array.from(resources);
  }

  /**
   * Optimize plan based on constraints
   */
  private async optimizePlan(
    plan: TaskPlan,
    constraints?: Goal["constraints"],
  ): Promise<TaskPlan> {
    if (!constraints) return plan;

    let optimized = { ...plan };

    // Optimize for deadline
    if (constraints.deadline) {
      optimized = this.optimizeForDeadline(optimized, constraints.deadline);
    }

    // Optimize for resources
    if (constraints.resources) {
      optimized = this.optimizeForResources(optimized, constraints.resources);
    }

    // Optimize for dependencies
    if (constraints.dependencies) {
      optimized = this.optimizeForDependencies(
        optimized,
        constraints.dependencies,
      );
    }

    return optimized;
  }

  /**
   * Optimize plan for deadline constraint
   */
  private optimizeForDeadline(plan: TaskPlan, deadline: Date): TaskPlan {
    const timeAvailable = deadline.getTime() - Date.now();

    if (plan.estimatedDuration > timeAvailable) {
      // Remove optional tasks
      const criticalTasks = plan.tasks.filter((t) => !t.optional);

      // Increase parallelism
      const optimizedStrategy = { ...plan.executionStrategy };
      optimizedStrategy.parallelismLevel = Math.min(
        10,
        optimizedStrategy.parallelismLevel * 2,
      );

      return {
        ...plan,
        tasks: criticalTasks,
        executionStrategy: optimizedStrategy,
        estimatedDuration: this.calculateEstimatedDuration(criticalTasks),
      };
    }

    return plan;
  }

  /**
   * Optimize plan for resource constraints
   */
  private optimizeForResources(
    plan: TaskPlan,
    availableResources: string[],
  ): TaskPlan {
    const availableSet = new Set(availableResources);

    // Filter tasks that can be executed with available resources
    const executableTasks = plan.tasks.filter((task) =>
      task.requiredCapabilities.every((cap) => availableSet.has(cap)),
    );

    return {
      ...plan,
      tasks: executableTasks,
      estimatedDuration: this.calculateEstimatedDuration(executableTasks),
    };
  }

  /**
   * Optimize plan for dependency constraints
   */
  private optimizeForDependencies(
    plan: TaskPlan,
    dependencies: string[],
  ): TaskPlan {
    // Add dependency tasks at the beginning
    const dependencyTasks: PlannedTask[] = dependencies.map((dep) => ({
      id: `dep-${uuidv4()}`,
      name: `Resolve dependency: ${dep}`,
      description: `Ensure ${dep} is available`,
      type: "dependency",
      priority: 100,
      dependencies: [],
      estimatedDuration: 300000, // 5 minutes
      requiredCapabilities: ["dependency-management"],
      inputRequirements: { dependency: dep },
      expectedOutputs: { resolved: true },
      parallelizable: true,
      optional: false,
    }));

    // Update existing tasks to depend on dependency tasks
    const updatedTasks = plan.tasks.map((task) => ({
      ...task,
      dependencies: [...dependencyTasks.map((d) => d.id), ...task.dependencies],
    }));

    return {
      ...plan,
      tasks: [...dependencyTasks, ...updatedTasks],
      estimatedDuration: this.calculateEstimatedDuration([
        ...dependencyTasks,
        ...updatedTasks,
      ]),
    };
  }

  /**
   * Assess risks in the plan
   */
  private async assessPlanRisks(plan: TaskPlan): Promise<RiskAssessment> {
    const risks: Risk[] = [];
    const mitigationStrategies: MitigationStrategy[] = [];

    // Check for long duration tasks
    const longTasks = plan.tasks.filter((t) => t.estimatedDuration > 3600000);
    if (longTasks.length > 0) {
      const risk: Risk = {
        id: `risk-${uuidv4()}`,
        type: "duration",
        description: "Some tasks have long estimated durations",
        probability: 0.4,
        impact: 0.6,
        affectedTasks: longTasks.map((t) => t.id),
      };
      risks.push(risk);

      mitigationStrategies.push({
        riskId: risk.id,
        strategy: "Break down long tasks into smaller subtasks",
        cost: 0.2,
        effectiveness: 0.8,
      });
    }

    // Check for complex dependencies
    const complexDependencies = plan.tasks.filter(
      (t) => t.dependencies.length > 2,
    );
    if (complexDependencies.length > 0) {
      const risk: Risk = {
        id: `risk-${uuidv4()}`,
        type: "dependency",
        description: "Complex task dependencies may cause delays",
        probability: 0.5,
        impact: 0.7,
        affectedTasks: complexDependencies.map((t) => t.id),
      };
      risks.push(risk);

      mitigationStrategies.push({
        riskId: risk.id,
        strategy: "Implement dependency tracking and early warning system",
        cost: 0.3,
        effectiveness: 0.7,
      });
    }

    // Calculate overall risk
    const avgProbability =
      risks.reduce((sum, r) => sum + r.probability, 0) / (risks.length || 1);
    const avgImpact =
      risks.reduce((sum, r) => sum + r.impact, 0) / (risks.length || 1);
    const riskScore = avgProbability * avgImpact;

    const overallRisk =
      riskScore < 0.25
        ? "low"
        : riskScore < 0.5
          ? "medium"
          : riskScore < 0.75
            ? "high"
            : "critical";

    return {
      overallRisk,
      risks,
      mitigationStrategies,
    };
  }

  /**
   * Generate alternative plans
   */
  private async generateAlternatives(
    mainPlan: TaskPlan,
    goal: Goal,
  ): Promise<TaskPlan[]> {
    const alternatives: TaskPlan[] = [];

    // Fast-track alternative (remove optional tasks)
    const fastTrack = {
      ...mainPlan,
      id: `${mainPlan.id}-fast`,
      tasks: mainPlan.tasks.filter((t) => !t.optional),
      estimatedDuration: this.calculateEstimatedDuration(
        mainPlan.tasks.filter((t) => !t.optional),
      ),
    };
    alternatives.push(fastTrack);

    // Conservative alternative (sequential execution)
    const conservative = {
      ...mainPlan,
      id: `${mainPlan.id}-conservative`,
      executionStrategy: {
        ...mainPlan.executionStrategy,
        type: "sequential" as const,
        parallelismLevel: 1,
      },
    };
    alternatives.push(conservative);

    return alternatives;
  }

  /**
   * Store plan for learning
   */
  private storePlanForLearning(goalId: string, plan: TaskPlan): void {
    const plans = this.historicalPlans.get(goalId) || [];
    plans.push(plan);
    this.historicalPlans.set(goalId, plans);

    // Trigger learning if enough data
    if (plans.length >= 5) {
      this.learningEngine.learn(plans);
    }
  }

  /**
   * Get historical plans for a goal type
   */
  public getHistoricalPlans(goalType: string): TaskPlan[] {
    const allPlans: TaskPlan[] = [];

    for (const plans of this.historicalPlans.values()) {
      allPlans.push(...plans);
    }

    return allPlans;
  }

  /**
   * Analyze goals and generate task plans (API endpoint)
   */
  public async analyzeGoals(goals: Goal[], context: any): Promise<any> {
    const plans = [];
    const recommendations = [];
    let overallComplexity = "simple";

    for (const goal of goals) {
      try {
        const plan = await this.createPlan(goal);
        plans.push({
          id: plan.id,
          goalId: goal.id,
          tasks: plan.tasks,
          executionStrategy: plan.executionStrategy,
          estimatedDuration: plan.estimatedDuration,
          requiredResources: plan.requiredResources,
          riskAssessment: plan.riskAssessment,
          alternatives: plan.alternatives.map((alt) => ({
            id: alt.id,
            name: `Alternative for ${goal.description}`,
            estimatedDuration: alt.estimatedDuration,
            tradeoffs: [`Different approach for ${goal.type} goals`],
          })),
        });

        // Generate recommendations
        recommendations.push(
          `Consider ${goal.type} best practices for "${goal.description}"`,
        );

        // Update complexity
        if (plan.tasks.length > 5) overallComplexity = "complex";
        else if (plan.tasks.length > 3) overallComplexity = "moderate";
      } catch (error) {
        logger.error(`Failed to create plan for goal ${goal.id}:`, error);
      }
    }

    return {
      plans,
      recommendations,
      complexityAnalysis: {
        level: overallComplexity,
        factors: {
          totalGoals: goals.length,
          averageTasksPerGoal:
            plans.length > 0
              ? plans.reduce((sum, p) => sum + p.tasks.length, 0) / plans.length
              : 0,
          estimatedTotalDuration: plans.reduce(
            (sum, p) => sum + p.estimatedDuration,
            0,
          ),
        },
        approach:
          overallComplexity === "complex"
            ? "Phase-based implementation recommended"
            : "Direct implementation possible",
      },
    };
  }

  /**
   * Get available planning templates (API endpoint)
   */
  public getAvailableTemplates(): Map<string, PlanTemplate> {
    return this.planningTemplates;
  }
}

// Supporting interfaces and classes

interface PlanTemplate {
  id: string;
  goalType: string;
  standardTasks: string[];
  typicalDuration: number;
  requiredCapabilities: string[];
}

interface ComplexityAnalysis {
  score: number;
  level: string;
  factors: Record<string, any>;
  recommendedApproach: string;
}

interface ActionItem {
  name: string;
  description: string;
  verb: string;
  object: string;
}

/**
 * Learning engine for plan optimization
 */
class PlanningLearningEngine {
  private patterns: Map<string, PlanPattern> = new Map();

  public learn(plans: TaskPlan[]): void {
    // Analyze successful patterns
    for (const plan of plans) {
      this.extractPatterns(plan);
    }
  }

  private extractPatterns(plan: TaskPlan): void {
    // Extract task sequences
    const taskSequence = plan.tasks.map((t) => t.type).join("-");

    const pattern = this.patterns.get(taskSequence) || {
      sequence: taskSequence,
      occurrences: 0,
      avgDuration: 0,
      successRate: 1.0,
    };

    pattern.occurrences++;
    pattern.avgDuration =
      (pattern.avgDuration * (pattern.occurrences - 1) +
        plan.estimatedDuration) /
      pattern.occurrences;

    this.patterns.set(taskSequence, pattern);
  }

  public getRecommendations(goalType: string): PlanPattern[] {
    return Array.from(this.patterns.values())
      .filter((p) => p.occurrences > 3)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
  }
}

interface PlanPattern {
  sequence: string;
  occurrences: number;
  avgDuration: number;
  successRate: number;
}

// Export singleton instance
export const taskPlanner = new TaskPlannerService();
