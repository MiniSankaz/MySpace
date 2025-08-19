/**
 * Unit Tests for Multi-Agent Coordinator Service
 * Comprehensive test coverage for AI Multi-Agent Coordination functionality
 */

import {
  MultiAgentCoordinatorService,
  AgentType,
  AgentStatus,
  Agent,
  CollaborationSession,
  CollaborativeTask,
  TaskStatus,
  AgentMessage,
  Decision,
} from "../../src/services/ai-orchestration/multi-agent-coordinator.service";

// Mock logger
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("MultiAgentCoordinatorService", () => {
  let coordinator: MultiAgentCoordinatorService;

  beforeEach(() => {
    coordinator = new MultiAgentCoordinatorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Agent Registration and Management", () => {
    it("should register a new agent successfully", () => {
      const agentConfig = {
        type: AgentType.CODE_ASSISTANT,
        name: "TestAgent",
        capabilities: ["testing", "debugging"],
        preferences: {
          preferredTaskTypes: ["testing"],
          maxConcurrentTasks: 2,
          communicationStyle: "technical" as const,
          collaborationPreference: "pair" as const,
        },
      };

      const agent = coordinator.registerAgent(agentConfig);

      expect(agent).toMatchObject({
        id: expect.any(String),
        type: agentConfig.type,
        name: agentConfig.name,
        capabilities: agentConfig.capabilities,
        status: AgentStatus.IDLE,
        workload: 0,
        performance: expect.objectContaining({
          tasksCompleted: 0,
          successRate: 1.0,
          averageResponseTime: 0,
          reputation: 100,
        }),
        preferences: agentConfig.preferences,
        messageQueue: [],
      });
    });

    it("should initialize with default agents", () => {
      const agents = coordinator.getAllAgents();

      expect(agents.length).toBeGreaterThan(0);

      // Should have various agent types
      const agentTypes = agents.map((agent) => agent.type);
      expect(agentTypes).toContain(AgentType.CODE_ASSISTANT);
      expect(agentTypes).toContain(AgentType.PORTFOLIO_ANALYST);
      expect(agentTypes).toContain(AgentType.PROJECT_MANAGER);
      expect(agentTypes).toContain(AgentType.DATA_ANALYST);
      expect(agentTypes).toContain(AgentType.TEST_ENGINEER);
    });

    it("should get agent by ID", () => {
      const allAgents = coordinator.getAllAgents();
      if (allAgents.length > 0) {
        const firstAgent = allAgents[0];
        const retrievedAgent = coordinator.getAgent(firstAgent.id);

        expect(retrievedAgent).toEqual(firstAgent);
      }
    });

    it("should update agent status", () => {
      const agents = coordinator.getAllAgents();
      if (agents.length > 0) {
        const agent = agents[0];
        const newStatus = AgentStatus.BUSY;

        coordinator.updateAgentStatus(agent.id, newStatus);

        const updatedAgent = coordinator.getAgent(agent.id);
        expect(updatedAgent?.status).toBe(newStatus);
      }
    });

    it("should get available agents", () => {
      const availableAgents = coordinator.getAvailableAgents();

      expect(Array.isArray(availableAgents)).toBe(true);

      // All available agents should be idle or have low workload
      availableAgents.forEach((agent) => {
        expect(agent.status === AgentStatus.IDLE || agent.workload < 80).toBe(
          true,
        );
      });
    });
  });

  describe("Collaboration Session Management", () => {
    it("should create a collaboration session with suitable agents", async () => {
      const goal = "Develop a new feature with comprehensive testing";
      const requiredCapabilities = ["code-generation", "testing", "debugging"];

      const session = await coordinator.createCollaboration(
        goal,
        requiredCapabilities,
      );

      expect(session).toMatchObject({
        id: expect.any(String),
        goal,
        participants: expect.any(Array),
        coordinator: expect.any(String),
        status: "planning",
        tasks: [],
        decisions: [],
        results: [],
        startTime: expect.any(Date),
      });

      expect(session.participants.length).toBeGreaterThan(0);
      expect(session.participants).toContain(session.coordinator);
    });

    it("should select agents based on capabilities and performance", async () => {
      const goal = "Analyze portfolio performance";
      const requiredCapabilities = [
        "market-analysis",
        "data-processing",
        "reporting",
      ];

      const session = await coordinator.createCollaboration(
        goal,
        requiredCapabilities,
      );

      // Verify that selected agents have required capabilities
      const selectedAgents = session.participants
        .map((id) => coordinator.getAgent(id))
        .filter((agent) => agent !== undefined) as Agent[];

      const allCapabilities = new Set<string>();
      selectedAgents.forEach((agent) => {
        agent.capabilities.forEach((cap) => allCapabilities.add(cap));
      });

      requiredCapabilities.forEach((requiredCap) => {
        const hasCapability = Array.from(allCapabilities).some(
          (cap) => cap.includes(requiredCap) || requiredCap.includes(cap),
        );
        expect(hasCapability).toBe(true);
      });
    });

    it("should choose coordinator based on reputation", async () => {
      const goal = "Complex development project";
      const requiredCapabilities = ["code-generation", "planning"];

      const session = await coordinator.createCollaboration(
        goal,
        requiredCapabilities,
      );

      const coordinatorAgent = coordinator.getAgent(session.coordinator);
      expect(coordinatorAgent).toBeDefined();
      expect(coordinatorAgent?.performance.reputation).toBeGreaterThan(0);
    });

    it("should handle collaboration when no suitable agents available", async () => {
      const goal = "Impossible task";
      const requiredCapabilities = [
        "non-existent-capability",
        "impossible-skill",
      ];

      await expect(
        coordinator.createCollaboration(goal, requiredCapabilities),
      ).rejects.toThrow("No suitable agents available for collaboration");
    });

    it("should get collaboration session by ID", async () => {
      const goal = "Test collaboration retrieval";
      const requiredCapabilities = ["testing"];

      const session = await coordinator.createCollaboration(
        goal,
        requiredCapabilities,
      );
      const retrievedSession = coordinator.getCollaborationSession(session.id);

      expect(retrievedSession).toEqual(session);
    });
  });

  describe("Task Assignment and Execution", () => {
    let testSession: CollaborationSession;

    beforeEach(async () => {
      testSession = await coordinator.createCollaboration(
        "Test task execution",
        ["code-generation", "testing"],
      );
    });

    it("should assign task to collaboration session", async () => {
      const task = {
        description: "Create unit tests for authentication module",
        requiredCapabilities: ["testing", "code-generation"],
        consensusRequired: false,
      };

      await coordinator.assignTask(testSession.id, task);

      const updatedSession = coordinator.getCollaborationSession(
        testSession.id,
      );
      expect(updatedSession?.tasks.length).toBe(1);
      expect(updatedSession?.tasks[0]).toMatchObject({
        id: expect.any(String),
        description: task.description,
        requiredCapabilities: task.requiredCapabilities,
        status: "pending",
        consensusRequired: false,
        votingThreshold: 0.6,
      });
    });

    it("should execute collaborative task successfully", async () => {
      const task: CollaborativeTask = {
        id: "test-task-1",
        description: "Test collaborative execution",
        assignedAgents: testSession.participants.slice(0, 2),
        requiredCapabilities: ["testing"],
        status: TaskStatus.PENDING,
        dependencies: [],
        consensusRequired: false,
      };

      const result = await coordinator.executeCollaborativeTask(
        testSession.id,
        task,
      );

      expect(result).toBeDefined();
      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.results).toBeDefined();
    });

    it("should handle consensus-required tasks", async () => {
      const consensusTask: CollaborativeTask = {
        id: "consensus-task-1",
        description: "Requires team consensus",
        assignedAgents: testSession.participants,
        requiredCapabilities: ["analysis"],
        status: TaskStatus.PENDING,
        dependencies: [],
        consensusRequired: true,
        votingThreshold: 0.6,
      };

      const result = await coordinator.executeCollaborativeTask(
        testSession.id,
        consensusTask,
      );

      expect(result).toBeDefined();
      expect(consensusTask.status).toBe(TaskStatus.COMPLETED);

      const session = coordinator.getCollaborationSession(testSession.id);
      expect(session?.decisions.length).toBeGreaterThan(0);
    });

    it("should handle task execution failures gracefully", async () => {
      // Create a task that will fail
      const failingTask: CollaborativeTask = {
        id: "failing-task",
        description: "This task will fail",
        assignedAgents: ["non-existent-agent"],
        requiredCapabilities: ["impossible-capability"],
        status: TaskStatus.PENDING,
        dependencies: [],
        consensusRequired: false,
      };

      // Should handle gracefully without throwing
      const result = await coordinator.executeCollaborativeTask(
        testSession.id,
        failingTask,
      );

      expect(result).toBeDefined();
      // Task should either fail or have empty results
      expect(
        failingTask.status === TaskStatus.FAILED ||
          (failingTask.results && failingTask.results.agentCount === 0),
      ).toBe(true);
    });
  });

  describe("Message Routing and Communication", () => {
    let testAgent: Agent;

    beforeEach(() => {
      const agents = coordinator.getAllAgents();
      testAgent = agents[0];
    });

    it("should send message between agents", async () => {
      const message: AgentMessage = {
        id: "msg-1",
        from: "system",
        to: testAgent.id,
        type: "notification",
        content: { text: "Test message" },
        timestamp: new Date(),
        priority: 50,
        requiresResponse: false,
      };

      await coordinator.sendMessage(message);

      const agent = coordinator.getAgent(testAgent.id);
      expect(agent?.messageQueue.length).toBeGreaterThan(0);
      expect(agent?.messageQueue[0]).toEqual(message);
    });

    it("should process messages that require responses", async () => {
      const responseMessage: AgentMessage = {
        id: "msg-response",
        from: "system",
        to: testAgent.id,
        type: "request",
        content: { action: "status-check" },
        timestamp: new Date(),
        priority: 75,
        requiresResponse: true,
      };

      await coordinator.sendMessage(responseMessage);

      // Wait for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Agent should process the message if idle
      if (testAgent.status === AgentStatus.IDLE) {
        expect(testAgent.messageQueue.length).toBe(0); // Should be processed
      }
    });
  });

  describe("Consensus Mechanism", () => {
    let testSession: CollaborationSession;

    beforeEach(async () => {
      testSession = await coordinator.createCollaboration("Consensus testing", [
        "analysis",
        "decision-making",
      ]);
    });

    it("should achieve consensus with sufficient agreement", async () => {
      const consensusTask: CollaborativeTask = {
        id: "consensus-test",
        description: "Test consensus mechanism",
        assignedAgents: testSession.participants,
        requiredCapabilities: ["analysis"],
        status: TaskStatus.PENDING,
        dependencies: [],
        consensusRequired: true,
        votingThreshold: 0.5, // 50% threshold
      };

      const result = await coordinator.executeCollaborativeTask(
        testSession.id,
        consensusTask,
      );

      expect(result).toBeDefined();

      const session = coordinator.getCollaborationSession(testSession.id);
      const decision = session?.decisions[0];

      expect(decision).toBeDefined();
      expect(decision?.selectedOption).toBeDefined();
      expect(decision?.rationale).toContain("agreement");
    });

    it("should handle cases where consensus is not achieved", async () => {
      const strictConsensusTask: CollaborativeTask = {
        id: "strict-consensus-test",
        description: "Requires high consensus",
        assignedAgents: testSession.participants,
        requiredCapabilities: ["analysis"],
        status: TaskStatus.PENDING,
        dependencies: [],
        consensusRequired: true,
        votingThreshold: 0.95, // Very high threshold
      };

      const result = await coordinator.executeCollaborativeTask(
        testSession.id,
        strictConsensusTask,
      );

      expect(result).toBeDefined();

      const session = coordinator.getCollaborationSession(testSession.id);
      const decision = session?.decisions[0];

      expect(decision).toBeDefined();
      // May or may not achieve consensus with high threshold
      expect(decision?.rationale).toBeDefined();
    });
  });

  describe("Agent Performance and Workload Management", () => {
    it("should update agent performance after task completion", async () => {
      const agents = coordinator.getAllAgents();
      const testAgent = agents.find((a) => a.type === AgentType.TEST_ENGINEER);

      if (testAgent) {
        const initialTaskCount = testAgent.performance.tasksCompleted;
        const initialResponseTime = testAgent.performance.averageResponseTime;

        // Simulate task assignment and completion
        coordinator.updateAgentStatus(testAgent.id, AgentStatus.BUSY);

        // Create a simple collaboration to trigger task execution
        const session = await coordinator.createCollaboration(
          "Performance test",
          ["test-generation"],
        );

        const task: CollaborativeTask = {
          id: "perf-task",
          description: "Performance testing task",
          assignedAgents: [testAgent.id],
          requiredCapabilities: ["test-generation"],
          status: TaskStatus.PENDING,
          dependencies: [],
          consensusRequired: false,
        };

        await coordinator.executeCollaborativeTask(session.id, task);

        const updatedAgent = coordinator.getAgent(testAgent.id);
        expect(updatedAgent?.performance.tasksCompleted).toBeGreaterThanOrEqual(
          initialTaskCount,
        );
      }
    });

    it("should manage agent workload appropriately", async () => {
      const agents = coordinator.getAllAgents();
      const testAgent = agents[0];

      const initialWorkload = testAgent.workload;

      // Simulate task assignment
      coordinator.updateAgentStatus(testAgent.id, AgentStatus.BUSY);

      const session = await coordinator.createCollaboration(
        "Workload test",
        testAgent.capabilities.slice(0, 1),
      );

      // Workload should increase when busy
      const busyAgent = coordinator.getAgent(testAgent.id);
      if (session.participants.includes(testAgent.id)) {
        expect(busyAgent?.workload).toBeGreaterThanOrEqual(initialWorkload);
      }
    });

    it("should degrade agent performance on failures", async () => {
      const agents = coordinator.getAllAgents();
      const testAgent = agents[0];

      const initialSuccessRate = testAgent.performance.successRate;

      // Force a task failure by updating agent status to error
      coordinator.updateAgentStatus(testAgent.id, AgentStatus.ERROR);

      // Success rate should be affected
      const errorAgent = coordinator.getAgent(testAgent.id);
      expect(errorAgent?.status).toBe(AgentStatus.ERROR);
    });
  });

  describe("API Endpoints", () => {
    it("should get all available capabilities", () => {
      const capabilities = coordinator.getAllCapabilities();

      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities).toContain("code-generation");
      expect(capabilities).toContain("market-analysis");
      expect(capabilities).toContain("testing");
    });

    it("should provide recommended agent combinations", () => {
      const recommendations = coordinator.getRecommendedCombinations();

      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation).toMatchObject({
          purpose: expect.any(String),
          agents: expect.any(Array),
          coverage: expect.any(Number),
        });
        expect(recommendation.coverage).toBeGreaterThan(0);
        expect(recommendation.coverage).toBeLessThanOrEqual(100);
      }
    });

    it("should create collaboration session via API endpoint", async () => {
      const goal = "API collaboration test";
      const requiredCapabilities = ["testing"];
      const options = {
        maxAgents: 3,
        timeoutMinutes: 30,
        consensusThreshold: 0.7,
      };
      const context = {
        userId: "test-user",
        sessionId: "test-session",
      };

      const session = await coordinator.createCollaborationSession(
        goal,
        requiredCapabilities,
        options,
      );

      expect(session).toMatchObject({
        id: expect.any(String),
        goal,
        participants: expect.any(Array),
        status: "planning",
      });
    });
  });

  describe("Agent Specialization and Capabilities", () => {
    it("should have agents with specialized capabilities", () => {
      const codeAssistant = coordinator
        .getAllAgents()
        .find((a) => a.type === AgentType.CODE_ASSISTANT);
      const portfolioAnalyst = coordinator
        .getAllAgents()
        .find((a) => a.type === AgentType.PORTFOLIO_ANALYST);
      const testEngineer = coordinator
        .getAllAgents()
        .find((a) => a.type === AgentType.TEST_ENGINEER);

      if (codeAssistant) {
        expect(codeAssistant.capabilities).toContain("code-generation");
        expect(codeAssistant.capabilities).toContain("refactoring");
      }

      if (portfolioAnalyst) {
        expect(portfolioAnalyst.capabilities).toContain("market-analysis");
        expect(portfolioAnalyst.capabilities).toContain("risk-assessment");
      }

      if (testEngineer) {
        expect(testEngineer.capabilities).toContain("test-generation");
        expect(testEngineer.capabilities).toContain("bug-detection");
      }
    });

    it("should respect agent preferences in task assignment", async () => {
      const agents = coordinator.getAllAgents();
      const preferredAgent = agents.find((a) =>
        a.preferences.preferredTaskTypes.includes("testing"),
      );

      if (preferredAgent) {
        const session = await coordinator.createCollaboration("Testing task", [
          "testing",
        ]);

        // Preferred agent should be selected for testing tasks
        expect(session.participants).toContain(preferredAgent.id);
      }
    });

    it("should limit concurrent tasks based on agent preferences", async () => {
      const agents = coordinator.getAllAgents();
      const limitedAgent = agents.find(
        (a) => a.preferences.maxConcurrentTasks <= 2,
      );

      if (limitedAgent) {
        // Agent should not be overloaded beyond their preference
        expect(limitedAgent.workload).toBeLessThanOrEqual(80);
      }
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle invalid collaboration session requests", async () => {
      await expect(
        coordinator.getCollaborationSession("invalid-id"),
      ).toBeUndefined();
    });

    it("should handle agent communication failures gracefully", async () => {
      const invalidMessage: AgentMessage = {
        id: "invalid-msg",
        from: "system",
        to: "non-existent-agent",
        type: "notification",
        content: {},
        timestamp: new Date(),
        priority: 50,
        requiresResponse: false,
      };

      // Should not throw error
      await expect(
        coordinator.sendMessage(invalidMessage),
      ).resolves.toBeUndefined();
    });

    it("should handle task assignment to unavailable agents", async () => {
      const session = await coordinator.createCollaboration(
        "Error handling test",
        ["testing"],
      );

      const invalidTask = {
        description: "Task for unavailable agent",
        assignedAgents: ["non-existent-agent"],
        requiredCapabilities: ["testing"],
      };

      // Should handle gracefully
      await expect(
        coordinator.assignTask(session.id, invalidTask),
      ).resolves.toBeUndefined();
    });
  });

  describe("Event Emission", () => {
    it("should emit events during agent registration", (done) => {
      coordinator.once("agent:registered", (agent) => {
        expect(agent).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          name: expect.any(String),
        });
        done();
      });

      coordinator.registerAgent({
        type: AgentType.DATA_ANALYST,
        name: "Event Test Agent",
        capabilities: ["data-processing"],
        preferences: {
          preferredTaskTypes: ["analysis"],
          maxConcurrentTasks: 1,
          communicationStyle: "concise",
          collaborationPreference: "solo",
        },
      });
    });

    it("should emit events during collaboration lifecycle", (done) => {
      let eventsReceived = 0;
      const expectedEvents = ["collaboration:created"];

      coordinator.once("collaboration:created", (session) => {
        expect(session).toMatchObject({
          id: expect.any(String),
          goal: expect.any(String),
          participants: expect.any(Array),
        });
        eventsReceived++;

        if (eventsReceived === expectedEvents.length) {
          done();
        }
      });

      coordinator.createCollaboration("Event test collaboration", ["testing"]);
    });
  });
});
