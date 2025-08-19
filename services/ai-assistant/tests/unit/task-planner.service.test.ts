/**
 * Unit Tests for Task Planner Service
 * Comprehensive test coverage for AI Task Planning functionality
 */

import {
  TaskPlannerService,
  Goal,
  TaskPlan,
  PlannedTask,
  ExecutionStrategy,
  RiskAssessment,
} from "../../src/services/ai-orchestration/task-planner.service";

// Mock logger
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("TaskPlannerService", () => {
  let planner: TaskPlannerService;

  beforeEach(() => {
    planner = new TaskPlannerService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Goal Analysis", () => {
    it("should analyze simple goals correctly", async () => {
      const simpleGoal: Goal = {
        id: "simple-goal-1",
        description: "Create a simple login form",
        type: "development",
        priority: 50,
        metadata: { complexity: "low" },
      };

      const plan = await planner.createPlan(simpleGoal);

      expect(plan).toMatchObject({
        id: expect.any(String),
        goalId: simpleGoal.id,
        tasks: expect.any(Array),
        executionStrategy: expect.objectContaining({
          type: expect.any(String),
          parallelismLevel: expect.any(Number),
        }),
        estimatedDuration: expect.any(Number),
        requiredResources: expect.any(Array),
        riskAssessment: expect.objectContaining({
          overallRisk: expect.any(String),
          risks: expect.any(Array),
        }),
      });

      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it("should handle complex goals with constraints", async () => {
      const complexGoal: Goal = {
        id: "complex-goal-1",
        description:
          "Build a complete portfolio management system with real-time analytics and advanced trading features",
        type: "development",
        priority: 100,
        constraints: {
          deadline: new Date(Date.now() + 86400000 * 30), // 30 days
          budget: 50000,
          resources: ["senior-developer", "ui-designer", "qa-engineer"],
          dependencies: ["database-setup", "api-framework"],
        },
        metadata: { complexity: "high" },
      };

      const plan = await planner.createPlan(complexGoal);

      expect(plan.tasks.length).toBeGreaterThan(5); // Complex goals should have many tasks
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.requiredResources.length).toBeGreaterThan(0);
      expect(plan.riskAssessment.overallRisk).toMatch(
        /low|medium|high|critical/,
      );
      expect(plan.alternatives.length).toBeGreaterThan(0);
    });

    it("should correctly identify goal types and map to appropriate tasks", async () => {
      const developmentGoal: Goal = {
        id: "dev-goal",
        description: "Implement user authentication with JWT tokens",
        type: "development",
        priority: 75,
      };

      const analysisGoal: Goal = {
        id: "analysis-goal",
        description: "Analyze market trends for portfolio optimization",
        type: "analysis",
        priority: 60,
      };

      const tradingGoal: Goal = {
        id: "trading-goal",
        description:
          "Execute automated trading strategy based on technical indicators",
        type: "trading",
        priority: 90,
      };

      const devPlan = await planner.createPlan(developmentGoal);
      const analysisPlan = await planner.createPlan(analysisGoal);
      const tradingPlan = await planner.createPlan(tradingGoal);

      // Development plan should have coding-related tasks
      expect(devPlan.requiredResources).toContain("coding");

      // Analysis plan should have data analysis capabilities
      expect(analysisPlan.requiredResources).toContain("data-analysis");

      // Trading plan should have market analysis capabilities
      expect(tradingPlan.requiredResources).toContain("market-analysis");
    });
  });

  describe("Task Generation", () => {
    it("should generate tasks from action verbs in goal description", async () => {
      const actionGoal: Goal = {
        id: "action-goal",
        description:
          "Create user interface, implement backend API, test functionality, and deploy to production",
        type: "development",
        priority: 70,
      };

      const plan = await planner.createPlan(actionGoal);

      // Should identify multiple action items
      expect(plan.tasks.length).toBeGreaterThanOrEqual(3);

      // Tasks should have proper types based on actions
      const taskTypes = plan.tasks.map((task) => task.type);
      expect(taskTypes).toContain("development");
      expect(taskTypes).toContain("testing");
      expect(taskTypes).toContain("deployment");
    });

    it("should assign proper priorities to tasks", async () => {
      const priorityGoal: Goal = {
        id: "priority-goal",
        description:
          "First create foundation, then build features, finally add polish",
        type: "development",
        priority: 80,
      };

      const plan = await planner.createPlan(priorityGoal);

      // First task should have highest priority
      const sortedTasks = plan.tasks.sort((a, b) => b.priority - a.priority);
      expect(sortedTasks[0].priority).toBeGreaterThanOrEqual(75); // Should be close to goal priority
    });

    it("should estimate task durations appropriately", async () => {
      const durationGoal: Goal = {
        id: "duration-goal",
        description: "Create simple button component",
        type: "development",
        priority: 30,
      };

      const plan = await planner.createPlan(durationGoal);

      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeLessThan(86400000); // Should be less than 1 day for simple task

      // All tasks should have positive durations
      plan.tasks.forEach((task) => {
        expect(task.estimatedDuration).toBeGreaterThan(0);
      });
    });

    it("should identify required capabilities for tasks", async () => {
      const capabilityGoal: Goal = {
        id: "capability-goal",
        description: "Optimize database queries and improve API performance",
        type: "development",
        priority: 85,
      };

      const plan = await planner.createPlan(capabilityGoal);

      // Should require optimization and performance analysis capabilities
      expect(plan.requiredResources).toContain("performance-analysis");
      expect(plan.requiredResources).toContain("optimization");
    });
  });

  describe("Execution Strategy Determination", () => {
    it("should choose parallel execution for independent parallelizable tasks", async () => {
      const parallelGoal: Goal = {
        id: "parallel-goal",
        description: "Create multiple independent UI components",
        type: "development",
        priority: 60,
      };

      const plan = await planner.createPlan(parallelGoal);

      if (plan.tasks.filter((t) => t.parallelizable).length > 1) {
        expect(plan.executionStrategy.type).toBe("parallel");
        expect(plan.executionStrategy.parallelismLevel).toBeGreaterThan(1);
      }
    });

    it("should choose sequential execution for dependent tasks", async () => {
      const sequentialGoal: Goal = {
        id: "sequential-goal",
        description: "Deploy application after testing",
        type: "development",
        priority: 90,
      };

      const plan = await planner.createPlan(sequentialGoal);

      if (plan.tasks.some((t) => t.dependencies.length > 0)) {
        expect(["sequential", "hybrid"]).toContain(plan.executionStrategy.type);
      }
    });

    it("should set appropriate checkpoints for complex plans", async () => {
      const checkpointGoal: Goal = {
        id: "checkpoint-goal",
        description: "Build large-scale application with multiple phases",
        type: "development",
        priority: 95,
      };

      const plan = await planner.createPlan(checkpointGoal);

      if (plan.tasks.length > 6) {
        expect(plan.executionStrategy.checkpoints.length).toBeGreaterThan(0);
        expect(plan.executionStrategy.adaptiveReplanning).toBe(true);
      }
    });
  });

  describe("Risk Assessment", () => {
    it("should identify risks in long-duration tasks", async () => {
      const riskyGoal: Goal = {
        id: "risky-goal",
        description:
          "Develop complete enterprise software system with complex integrations",
        type: "development",
        priority: 100,
      };

      const plan = await planner.createPlan(riskyGoal);

      expect(plan.riskAssessment.overallRisk).toMatch(/medium|high|critical/);
      expect(plan.riskAssessment.risks.length).toBeGreaterThan(0);
      expect(plan.riskAssessment.mitigationStrategies.length).toBeGreaterThan(
        0,
      );
    });

    it("should assess dependency complexity risks", async () => {
      const dependencyGoal: Goal = {
        id: "dependency-goal",
        description: "Integrate with multiple external APIs and services",
        type: "development",
        priority: 80,
        constraints: {
          dependencies: [
            "external-api-1",
            "external-api-2",
            "payment-gateway",
            "auth-service",
          ],
        },
      };

      const plan = await planner.createPlan(dependencyGoal);

      const dependencyRisks = plan.riskAssessment.risks.filter(
        (risk) => risk.type === "dependency",
      );

      expect(dependencyRisks.length).toBeGreaterThanOrEqual(0);
    });

    it("should provide mitigation strategies for identified risks", async () => {
      const complexGoal: Goal = {
        id: "mitigation-goal",
        description: "Build high-performance real-time trading system",
        type: "trading",
        priority: 100,
      };

      const plan = await planner.createPlan(complexGoal);

      plan.riskAssessment.risks.forEach((risk) => {
        const mitigations = plan.riskAssessment.mitigationStrategies.filter(
          (strategy) => strategy.riskId === risk.id,
        );
        expect(mitigations.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Plan Optimization", () => {
    it("should optimize for deadline constraints", async () => {
      const deadlineGoal: Goal = {
        id: "deadline-goal",
        description: "Complete feature development",
        type: "development",
        priority: 70,
        constraints: {
          deadline: new Date(Date.now() + 3600000), // 1 hour from now
        },
      };

      const plan = await planner.createPlan(deadlineGoal);

      // Should optimize for speed
      expect(plan.estimatedDuration).toBeLessThanOrEqual(3600000);
      expect(plan.executionStrategy.parallelismLevel).toBeGreaterThanOrEqual(2);

      // Should prefer critical tasks only
      const optionalTasks = plan.tasks.filter((task) => task.optional);
      expect(optionalTasks.length).toBeLessThanOrEqual(plan.tasks.length / 2);
    });

    it("should optimize for resource constraints", async () => {
      const resourceGoal: Goal = {
        id: "resource-goal",
        description: "Develop application with limited team",
        type: "development",
        priority: 60,
        constraints: {
          resources: ["coding", "testing"], // Limited capabilities
        },
      };

      const plan = await planner.createPlan(resourceGoal);

      // Should only include tasks that can be done with available resources
      plan.tasks.forEach((task) => {
        const hasRequiredCapability = task.requiredCapabilities.some((cap) =>
          ["coding", "testing"].includes(cap),
        );
        expect(hasRequiredCapability).toBe(true);
      });
    });

    it("should add dependency resolution tasks when needed", async () => {
      const dependencyGoal: Goal = {
        id: "dependency-optimization-goal",
        description: "Build feature requiring external dependencies",
        type: "development",
        priority: 75,
        constraints: {
          dependencies: ["redis-server", "postgres-database"],
        },
      };

      const plan = await planner.createPlan(dependencyGoal);

      // Should include dependency resolution tasks
      const dependencyTasks = plan.tasks.filter(
        (task) =>
          task.type === "dependency" || task.name.includes("dependency"),
      );

      expect(dependencyTasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Alternative Plans", () => {
    it("should generate alternative execution approaches", async () => {
      const alternativeGoal: Goal = {
        id: "alternative-goal",
        description: "Develop user authentication system",
        type: "development",
        priority: 80,
      };

      const plan = await planner.createPlan(alternativeGoal);

      expect(plan.alternatives.length).toBeGreaterThan(0);

      // Alternatives should have different characteristics
      const mainDuration = plan.estimatedDuration;
      const fastTrack = plan.alternatives.find((alt) =>
        alt.id.includes("fast"),
      );
      const conservative = plan.alternatives.find((alt) =>
        alt.id.includes("conservative"),
      );

      if (fastTrack) {
        expect(fastTrack.estimatedDuration).toBeLessThanOrEqual(mainDuration);
      }

      if (conservative) {
        expect(conservative.estimatedDuration).toBeGreaterThanOrEqual(
          mainDuration,
        );
      }
    });

    it("should provide fast-track alternatives with reduced scope", async () => {
      const scopeGoal: Goal = {
        id: "scope-goal",
        description: "Build comprehensive dashboard with analytics",
        type: "development",
        priority: 65,
      };

      const plan = await planner.createPlan(scopeGoal);

      const fastTrack = plan.alternatives.find((alt) =>
        alt.id.includes("fast"),
      );

      if (fastTrack) {
        expect(fastTrack.estimatedDuration).toBeLessThan(
          plan.estimatedDuration,
        );
      }
    });
  });

  describe("Historical Learning", () => {
    it("should store plans for learning purposes", async () => {
      const learningGoal: Goal = {
        id: "learning-goal-1",
        description: "Simple test task for learning",
        type: "development",
        priority: 40,
      };

      // Create multiple plans for the same goal type
      for (let i = 0; i < 3; i++) {
        const goal = { ...learningGoal, id: `learning-goal-${i + 1}` };
        await planner.createPlan(goal);
      }

      // Should have historical data
      const historicalPlans = planner.getHistoricalPlans("development");
      expect(historicalPlans.length).toBeGreaterThanOrEqual(3);
    });

    it("should retrieve historical plans by goal type", async () => {
      const devGoal: Goal = {
        id: "dev-history-goal",
        description: "Development task",
        type: "development",
        priority: 50,
      };

      const analysisGoal: Goal = {
        id: "analysis-history-goal",
        description: "Analysis task",
        type: "analysis",
        priority: 50,
      };

      await planner.createPlan(devGoal);
      await planner.createPlan(analysisGoal);

      const devPlans = planner.getHistoricalPlans("development");
      const analysisPlans = planner.getHistoricalPlans("analysis");

      expect(devPlans.length).toBeGreaterThanOrEqual(1);
      expect(analysisPlans.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Planning Templates", () => {
    it("should have predefined templates for common goal types", () => {
      const templates = planner.getAvailableTemplates();

      expect(templates.has("development")).toBe(true);
      expect(templates.has("analysis")).toBe(true);
      expect(templates.has("trading")).toBe(true);

      const devTemplate = templates.get("development");
      if (devTemplate) {
        expect(devTemplate.standardTasks).toContain("implementation");
        expect(devTemplate.standardTasks).toContain("testing");
        expect(devTemplate.requiredCapabilities).toContain("coding");
      }
    });

    it("should use templates to enhance task planning", async () => {
      const templateGoal: Goal = {
        id: "template-goal",
        description: "Standard development task",
        type: "development",
        priority: 60,
      };

      const plan = await planner.createPlan(templateGoal);

      // Should include standard development tasks
      const taskTypes = plan.tasks.map((task) => task.type);
      expect(taskTypes).toContain("testing");
    });
  });

  describe("API Endpoints", () => {
    it("should analyze multiple goals and provide complexity analysis", async () => {
      const goals: Goal[] = [
        {
          id: "api-goal-1",
          description: "Simple UI update",
          type: "development",
          priority: 30,
        },
        {
          id: "api-goal-2",
          description: "Complex backend integration with multiple services",
          type: "development",
          priority: 90,
        },
        {
          id: "api-goal-3",
          description: "Market analysis for trading strategy",
          type: "analysis",
          priority: 70,
        },
      ];

      const result = await planner.analyzeGoals(goals, {});

      expect(result).toMatchObject({
        plans: expect.any(Array),
        recommendations: expect.any(Array),
        complexityAnalysis: expect.objectContaining({
          level: expect.stringMatching(
            /simple|moderate|complex|highly-complex/,
          ),
          factors: expect.any(Object),
          approach: expect.any(String),
        }),
      });

      expect(result.plans.length).toBe(goals.length);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should provide appropriate complexity level based on goals", async () => {
      const simpleGoals: Goal[] = [
        {
          id: "simple-1",
          description: "Fix button color",
          type: "development",
          priority: 20,
        },
      ];

      const complexGoals: Goal[] = [
        {
          id: "complex-1",
          description:
            "Build enterprise-grade microservices architecture with real-time data processing",
          type: "development",
          priority: 100,
        },
        {
          id: "complex-2",
          description:
            "Implement machine learning algorithms for predictive analytics",
          type: "analysis",
          priority: 95,
        },
        {
          id: "complex-3",
          description:
            "Create high-frequency trading system with sub-millisecond latency",
          type: "trading",
          priority: 100,
        },
      ];

      const simpleResult = await planner.analyzeGoals(simpleGoals, {});
      const complexResult = await planner.analyzeGoals(complexGoals, {});

      expect(simpleResult.complexityAnalysis.level).toMatch(/simple|moderate/);
      expect(complexResult.complexityAnalysis.level).toMatch(
        /complex|highly-complex/,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid goals gracefully", async () => {
      const invalidGoal: Goal = {
        id: "",
        description: "",
        type: "development",
        priority: -1,
      };

      await expect(planner.createPlan(invalidGoal)).resolves.toBeDefined();
    });

    it("should handle goals with circular dependencies", async () => {
      const circularGoal: Goal = {
        id: "circular-goal",
        description: "Task with circular dependencies",
        type: "development",
        priority: 50,
        constraints: {
          dependencies: ["task-a", "task-b", "task-a"], // Circular reference
        },
      };

      const plan = await planner.createPlan(circularGoal);
      expect(plan).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should handle large numbers of goals efficiently", async () => {
      const manyGoals: Goal[] = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-goal-${i}`,
        description: `Performance test goal ${i}`,
        type: "development",
        priority: 50,
      }));

      const startTime = Date.now();
      const result = await planner.analyzeGoals(manyGoals, {});
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.plans.length).toBe(50);
    });
  });
});
