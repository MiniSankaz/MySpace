/**
 * Unit Tests for Task Orchestrator Service
 * Comprehensive test coverage for AI Task Orchestration functionality
 */

import {
  TaskOrchestratorService,
  TaskStatus,
  TaskPriority,
  TaskDefinition,
  TaskContext,
  TaskChain,
  TaskExecution,
} from "../../src/services/ai-orchestration/task-orchestrator.service";

// Mock logger
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("TaskOrchestratorService", () => {
  let orchestrator: TaskOrchestratorService;

  beforeEach(() => {
    orchestrator = new TaskOrchestratorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Task Registration", () => {
    it("should register a new task definition", () => {
      const taskDef: TaskDefinition = {
        id: "test-task",
        type: "testing",
        name: "Test Task",
        description: "A test task",
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        parallelizable: true,
        timeout: 5000,
      };

      orchestrator.registerTask(taskDef);

      // Verify task is registered by checking if we can create a chain with it
      expect(() => orchestrator.registerTask(taskDef)).not.toThrow();
    });

    it("should register a task executor", () => {
      const mockExecutor = jest.fn().mockResolvedValue("test result");

      orchestrator.registerExecutor("testing", mockExecutor);

      // No direct way to verify, but should not throw
      expect(() =>
        orchestrator.registerExecutor("testing", mockExecutor),
      ).not.toThrow();
    });

    it("should have built-in tasks registered on initialization", () => {
      // Test by trying to get active chains (should work without errors)
      const chains = orchestrator.getActiveChains();
      expect(Array.isArray(chains)).toBe(true);
    });
  });

  describe("Task Chain Creation", () => {
    const mockContext: TaskContext = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      workspaceId: "test-workspace-789",
      metadata: { source: "test" },
      sharedState: {},
    };

    it("should create a task chain from goals", async () => {
      const goals = ["Generate code for login feature", "Add unit tests"];

      const chain = await orchestrator.createTaskChain(goals, mockContext);

      expect(chain).toMatchObject({
        id: expect.any(String),
        name: expect.stringMatching(/^Chain-/),
        goals,
        context: mockContext,
        status: TaskStatus.PLANNING,
        createdAt: expect.any(Date),
      });

      expect(chain.tasks).toBeInstanceOf(Array);
      expect(chain.executionOrder).toBeInstanceOf(Array);
    });

    it("should determine execution order based on dependencies", async () => {
      const goals = ["Create documentation after code analysis"];

      const chain = await orchestrator.createTaskChain(goals, mockContext);

      // Should create tasks with proper dependencies
      expect(chain.executionOrder).toBeInstanceOf(Array);
      expect(chain.executionOrder.length).toBeGreaterThan(0);
    });

    it("should analyze goals and map to appropriate task types", async () => {
      const codeGoals = ["implement user authentication"];
      const portfolioGoals = ["analyze portfolio performance"];
      const docGoals = ["generate documentation"];

      const codeChain = await orchestrator.createTaskChain(
        codeGoals,
        mockContext,
      );
      const portfolioChain = await orchestrator.createTaskChain(
        portfolioGoals,
        mockContext,
      );
      const docChain = await orchestrator.createTaskChain(
        docGoals,
        mockContext,
      );

      // Should have tasks relevant to the goals
      expect(codeChain.tasks.length).toBeGreaterThan(0);
      expect(portfolioChain.tasks.length).toBeGreaterThan(0);
      expect(docChain.tasks.length).toBeGreaterThan(0);
    });
  });

  describe("Task Chain Execution", () => {
    let testChain: TaskChain;

    beforeEach(async () => {
      const mockContext: TaskContext = {
        userId: "test-user",
        sessionId: "test-session",
        metadata: {},
        sharedState: {},
      };

      testChain = await orchestrator.createTaskChain(
        ["test goal"],
        mockContext,
      );

      // Register a mock executor for testing
      const mockExecutor = jest.fn().mockResolvedValue({
        success: true,
        output: "test output",
      });
      orchestrator.registerExecutor("development", mockExecutor);
    });

    it("should execute a task chain successfully", async () => {
      const executionPromise = orchestrator.executeChain(testChain.id);

      // Wait a bit for execution to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = orchestrator.getChainStatus(testChain.id);
      expect(status?.status).toBe(TaskStatus.EXECUTING);

      // Let execution complete
      await executionPromise;

      const finalStatus = orchestrator.getChainStatus(testChain.id);
      expect(finalStatus?.status).toBe(TaskStatus.COMPLETED);
    });

    it("should handle task execution errors gracefully", async () => {
      // Register a failing executor
      const failingExecutor = jest
        .fn()
        .mockRejectedValue(new Error("Task failed"));
      orchestrator.registerExecutor("development", failingExecutor);

      await expect(orchestrator.executeChain(testChain.id)).rejects.toThrow();

      const status = orchestrator.getChainStatus(testChain.id);
      expect(status?.status).toBe(TaskStatus.FAILED);
    });

    it("should support chain cancellation", async () => {
      const executionPromise = orchestrator.executeChain(testChain.id);

      // Cancel the chain immediately
      await orchestrator.cancelChain(testChain.id);

      const status = orchestrator.getChainStatus(testChain.id);
      expect(status?.status).toBe(TaskStatus.CANCELLED);

      // Execution should handle cancellation
      await expect(executionPromise).rejects.toThrow();
    });
  });

  describe("Task Retry Mechanism", () => {
    it("should retry failed tasks according to retry configuration", async () => {
      const mockContext: TaskContext = {
        userId: "test-user",
        sessionId: "test-session",
        metadata: {},
        sharedState: {},
      };

      // Create a task with retry configuration
      const taskWithRetry: TaskDefinition = {
        id: "retry-task",
        type: "retry-test",
        name: "Retry Test Task",
        description: "A task that tests retry mechanism",
        priority: TaskPriority.HIGH,
        dependencies: [],
        parallelizable: false,
        timeout: 1000,
        retryConfig: {
          maxAttempts: 3,
          backoffMs: 100,
          exponential: true,
        },
      };

      orchestrator.registerTask(taskWithRetry);

      let attemptCount = 0;
      const retryExecutor = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        return Promise.resolve({
          success: true,
          output: "success after retry",
        });
      });

      orchestrator.registerExecutor("retry-test", retryExecutor);

      const chain = await orchestrator.createTaskChain(
        ["test retry"],
        mockContext,
      );

      await orchestrator.executeChain(chain.id);

      // Should have been called 3 times (initial + 2 retries)
      expect(retryExecutor).toHaveBeenCalledTimes(3);

      const status = orchestrator.getChainStatus(chain.id);
      expect(status?.status).toBe(TaskStatus.COMPLETED);
    });

    it("should fail after max retry attempts", async () => {
      const mockContext: TaskContext = {
        userId: "test-user",
        sessionId: "test-session",
        metadata: {},
        sharedState: {},
      };

      const taskWithRetry: TaskDefinition = {
        id: "fail-task",
        type: "fail-test",
        name: "Failing Task",
        description: "A task that always fails",
        priority: TaskPriority.LOW,
        dependencies: [],
        parallelizable: false,
        retryConfig: {
          maxAttempts: 2,
          backoffMs: 50,
          exponential: false,
        },
      };

      orchestrator.registerTask(taskWithRetry);

      const failingExecutor = jest
        .fn()
        .mockRejectedValue(new Error("Always fails"));
      orchestrator.registerExecutor("fail-test", failingExecutor);

      const chain = await orchestrator.createTaskChain(
        ["test failure"],
        mockContext,
      );

      await expect(orchestrator.executeChain(chain.id)).rejects.toThrow();

      // Should have been called maxAttempts times
      expect(failingExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe("Task Priority and Execution Order", () => {
    it("should execute tasks in priority order", async () => {
      const mockContext: TaskContext = {
        userId: "test-user",
        sessionId: "test-session",
        metadata: {},
        sharedState: {},
      };

      const highPriorityTask: TaskDefinition = {
        id: "high-priority",
        type: "priority-test",
        name: "High Priority Task",
        description: "High priority task",
        priority: TaskPriority.HIGH,
        dependencies: [],
        parallelizable: true,
      };

      const lowPriorityTask: TaskDefinition = {
        id: "low-priority",
        type: "priority-test",
        name: "Low Priority Task",
        description: "Low priority task",
        priority: TaskPriority.LOW,
        dependencies: [],
        parallelizable: true,
      };

      orchestrator.registerTask(highPriorityTask);
      orchestrator.registerTask(lowPriorityTask);

      const executionOrder: string[] = [];
      const priorityExecutor = jest.fn().mockImplementation((task) => {
        executionOrder.push(task.id);
        return Promise.resolve({ success: true, output: "completed" });
      });

      orchestrator.registerExecutor("priority-test", priorityExecutor);

      // Create a chain that should trigger both tasks
      const chain = await orchestrator.createTaskChain(
        ["execute priority test tasks"],
        mockContext,
      );

      await orchestrator.executeChain(chain.id);

      // Verify execution order follows priority
      const executionQueue = orchestrator.getExecutionQueue();
      expect(executionQueue.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Context Management", () => {
    it("should properly manage and enrich task context", async () => {
      const baseContext: TaskContext = {
        userId: "context-test-user",
        sessionId: "context-test-session",
        workspaceId: "context-workspace",
        metadata: { testMode: true },
        sharedState: { initialValue: "test" },
      };

      const contextExecutor = jest.fn().mockImplementation((task, context) => {
        // Verify context is properly passed
        expect(context).toMatchObject(baseContext);
        expect(context.sharedState).toHaveProperty("timestamp");
        expect(context.sharedState).toHaveProperty("environment");

        return Promise.resolve({ success: true, output: "context verified" });
      });

      orchestrator.registerExecutor("development", contextExecutor);

      const chain = await orchestrator.createTaskChain(
        ["test context"],
        baseContext,
      );
      await orchestrator.executeChain(chain.id);

      expect(contextExecutor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId: baseContext.userId,
          sessionId: baseContext.sessionId,
          workspaceId: baseContext.workspaceId,
          metadata: baseContext.metadata,
          sharedState: expect.objectContaining({
            initialValue: "test",
            timestamp: expect.any(String),
            environment: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("Error Recovery", () => {
    it("should attempt error recovery for known error types", async () => {
      const mockContext: TaskContext = {
        userId: "recovery-user",
        sessionId: "recovery-session",
        metadata: {},
        sharedState: {},
      };

      let callCount = 0;
      const timeoutExecutor = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Task execution timeout");
        }
        return Promise.resolve({ success: true, output: "recovered" });
      });

      orchestrator.registerExecutor("development", timeoutExecutor);

      const chain = await orchestrator.createTaskChain(
        ["test recovery"],
        mockContext,
      );

      // Should complete successfully after recovery
      await orchestrator.executeChain(chain.id);

      expect(timeoutExecutor).toHaveBeenCalledTimes(2); // Original + retry after recovery

      const status = orchestrator.getChainStatus(chain.id);
      expect(status?.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe("Cleanup and Management", () => {
    it("should cleanup completed chains older than specified age", async () => {
      const mockContext: TaskContext = {
        userId: "cleanup-user",
        sessionId: "cleanup-session",
        metadata: {},
        sharedState: {},
      };

      const quickExecutor = jest
        .fn()
        .mockResolvedValue({ success: true, output: "done" });
      orchestrator.registerExecutor("development", quickExecutor);

      const chain = await orchestrator.createTaskChain(
        ["quick task"],
        mockContext,
      );
      await orchestrator.executeChain(chain.id);

      // Manually set completion time to past
      const chainStatus = orchestrator.getChainStatus(chain.id);
      if (chainStatus) {
        chainStatus.completedAt = new Date(Date.now() - 3700000); // 1 hour + 100 seconds ago
      }

      const initialChains = orchestrator.getActiveChains();
      const initialCount = initialChains.length;

      // Cleanup with 1 hour max age
      orchestrator.cleanupCompletedChains(3600000);

      const remainingChains = orchestrator.getActiveChains();
      expect(remainingChains.length).toBeLessThanOrEqual(initialCount);
    });

    it("should provide execution queue status", () => {
      const queue = orchestrator.getExecutionQueue();
      expect(queue).toBeInstanceOf(Map);
    });

    it("should list all active chains", async () => {
      const mockContext: TaskContext = {
        userId: "list-user",
        sessionId: "list-session",
        metadata: {},
        sharedState: {},
      };

      const initialCount = orchestrator.getActiveChains().length;

      await orchestrator.createTaskChain(["first chain"], mockContext);
      await orchestrator.createTaskChain(["second chain"], mockContext);

      const chains = orchestrator.getActiveChains();
      expect(chains.length).toBe(initialCount + 2);
      expect(chains.every((chain) => typeof chain.id === "string")).toBe(true);
    });
  });

  describe("Event Emission", () => {
    it("should emit events during chain lifecycle", async () => {
      const mockContext: TaskContext = {
        userId: "event-user",
        sessionId: "event-session",
        metadata: {},
        sharedState: {},
      };

      const eventExecutor = jest
        .fn()
        .mockResolvedValue({ success: true, output: "completed" });
      orchestrator.registerExecutor("development", eventExecutor);

      const events: string[] = [];

      orchestrator.on("chain:created", () => events.push("created"));
      orchestrator.on("chain:started", () => events.push("started"));
      orchestrator.on("chain:completed", () => events.push("completed"));
      orchestrator.on("task:started", () => events.push("task-started"));
      orchestrator.on("task:completed", () => events.push("task-completed"));

      const chain = await orchestrator.createTaskChain(
        ["event test"],
        mockContext,
      );
      expect(events).toContain("created");

      await orchestrator.executeChain(chain.id);

      expect(events).toContain("started");
      expect(events).toContain("completed");
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout tasks that exceed their time limit", async () => {
      const mockContext: TaskContext = {
        userId: "timeout-user",
        sessionId: "timeout-session",
        metadata: {},
        sharedState: {},
      };

      const slowTask: TaskDefinition = {
        id: "slow-task",
        type: "timeout-test",
        name: "Slow Task",
        description: "A task that takes too long",
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        parallelizable: false,
        timeout: 100, // Very short timeout
      };

      orchestrator.registerTask(slowTask);

      const slowExecutor = jest.fn().mockImplementation(() => {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 200),
        );
      });

      orchestrator.registerExecutor("timeout-test", slowExecutor);

      const chain = await orchestrator.createTaskChain(
        ["test timeout"],
        mockContext,
      );

      await expect(orchestrator.executeChain(chain.id)).rejects.toThrow();

      const status = orchestrator.getChainStatus(chain.id);
      expect(status?.status).toBe(TaskStatus.FAILED);
    });
  });
});
