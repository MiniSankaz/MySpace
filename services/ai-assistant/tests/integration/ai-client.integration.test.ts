/**
 * Integration Tests for AI Client Service
 * Tests the complete integration between frontend AI client and backend services
 */

import request from "supertest";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import { Server } from "http";
import express from "express";
import { AIClient } from "../../src/services/ai-client";

// Mock API Gateway Client
const mockApiResponse = {
  success: true,
  data: null,
  error: null,
  status: 200,
};

const mockGatewayClient = {
  post: jest.fn().mockResolvedValue(mockApiResponse),
  get: jest.fn().mockResolvedValue(mockApiResponse),
  put: jest.fn().mockResolvedValue(mockApiResponse),
  delete: jest.fn().mockResolvedValue(mockApiResponse),
  getInstance: jest.fn().mockReturnThis(),
};

// Mock the gateway client
jest.mock("../../src/services/api/gateway.client", () => ({
  ApiGatewayClient: {
    getInstance: () => mockGatewayClient,
  },
}));

// Mock WebSocket for testing
class MockWebSocket {
  readyState = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private listeners = new Map<string, Set<Function>>();

  addEventListener(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  send(data: string) {
    // Simulate message send
    setTimeout(() => {
      this.simulateMessage({ data: `echo: ${data}` });
    }, 10);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.simulateClose();
  }

  private simulateMessage(event: { data: string }) {
    const listeners = this.listeners.get("message");
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  private simulateClose() {
    const listeners = this.listeners.get("close");
    if (listeners) {
      listeners.forEach((listener) => listener({}));
    }
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe("AI Client Integration Tests", () => {
  let aiClient: AIClient;
  let server: Server;
  let app: express.Application;

  beforeAll(() => {
    // Setup test server
    app = express();
    app.use(express.json());

    // Mock AI endpoints
    app.post("/ai/orchestration/chains", (req, res) => {
      res.json({
        success: true,
        chainId: "test-chain-123",
        estimatedDuration: 300000,
        tasksCount: 3,
        executionOrder: [["task-1"], ["task-2", "task-3"]],
        status: "planning",
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/orchestration",
      });
    });

    app.get("/ai/orchestration/chains/:chainId/status", (req, res) => {
      res.json({
        success: true,
        chainId: req.params.chainId,
        status: "executing",
        progress: {
          completed: 1,
          total: 3,
          percentage: 33,
          currentTask: "task-2",
        },
        tasks: [
          {
            id: "task-1",
            name: "First Task",
            status: "completed",
            progress: 100,
            startTime: new Date(),
            endTime: new Date(),
            result: { success: true },
          },
        ],
        estimatedCompletion: new Date(Date.now() + 200000),
        performance: {
          executionTime: 100000,
          averageTaskTime: 50000,
          errorRate: 0,
        },
      });
    });

    app.put("/ai/orchestration/chains/:chainId/control", (req, res) => {
      res.json({ success: true });
    });

    app.post("/ai/planning/analyze", (req, res) => {
      res.json({
        success: true,
        plans: [
          {
            id: "plan-123",
            goalId: "goal-1",
            tasks: [
              {
                id: "task-1",
                name: "Implement Feature",
                description: "Create the main feature",
                type: "development",
                dependencies: [],
                estimatedDuration: 3600000,
                requiredCapabilities: ["coding", "testing"],
              },
            ],
            executionStrategy: {
              type: "sequential",
              batchSize: 1,
              priority: "medium",
            },
            estimatedDuration: 3600000,
            requiredResources: ["coding", "testing"],
            riskAssessment: {
              level: "low",
              factors: ["simple requirements"],
              mitigations: ["regular testing"],
            },
            alternatives: [],
          },
        ],
        recommendations: ["Use TDD approach", "Consider code review"],
        complexityAnalysis: {
          level: "moderate",
          factors: {
            totalGoals: 1,
            averageTasksPerGoal: 1,
            estimatedTotalDuration: 3600000,
          },
          approach: "Direct implementation possible",
        },
      });
    });

    app.get("/ai/planning/templates", (req, res) => {
      res.json({
        success: true,
        templates: [
          {
            id: "dev-template",
            goalType: "development",
            standardTasks: ["implementation", "testing", "documentation"],
            typicalDuration: 3600000,
            requiredCapabilities: ["coding", "testing"],
          },
        ],
      });
    });

    app.post("/ai/agents/collaboration", (req, res) => {
      res.json({
        success: true,
        sessionId: "collab-123",
        participants: [
          {
            id: "agent-1",
            name: "CodeMaster",
            type: "code-assistant",
            capabilities: ["code-generation", "refactoring"],
            role: "coordinator",
          },
          {
            id: "agent-2",
            name: "QualityGuard",
            type: "test-engineer",
            capabilities: ["test-generation", "bug-detection"],
            role: "participant",
          },
        ],
        estimatedDuration: 1800000,
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/collaboration",
      });
    });

    app.get("/ai/agents/available", (req, res) => {
      res.json({
        success: true,
        agents: [
          {
            id: "agent-1",
            name: "CodeMaster",
            type: "code-assistant",
            status: "idle",
            capabilities: ["code-generation", "refactoring", "debugging"],
            workload: 25,
            performance: {
              completionRate: 0.95,
              averageResponseTime: 2500,
              qualityScore: 0.92,
              recentErrors: 1,
            },
            availability: "available",
          },
        ],
        totalCapabilities: [
          "code-generation",
          "testing",
          "analysis",
          "optimization",
        ],
        recommendedCombinations: [
          {
            purpose: "Full-stack development",
            agents: ["code-assistant", "test-engineer"],
            coverage: 85,
          },
        ],
      });
    });

    app.post("/ai/agents/sessions/:sessionId/tasks", (req, res) => {
      res.json({ success: true });
    });

    server = app.listen(0); // Use random available port
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    aiClient = AIClient.getInstance();
    jest.clearAllMocks();

    // Setup mock responses
    mockApiResponse.success = true;
    mockApiResponse.error = null;
  });

  afterEach(() => {
    aiClient.cleanup();
  });

  describe("Task Orchestration API", () => {
    it("should create task chain successfully", async () => {
      const request = {
        goals: ["Implement user authentication", "Add input validation"],
        context: {
          userId: "test-user-123",
          sessionId: "test-session-456",
          workspaceId: "workspace-789",
          metadata: { source: "integration-test" },
        },
        options: {
          priority: "high" as const,
          timeout: 300000,
          parallelization: true,
        },
      };

      mockApiResponse.data = {
        chainId: "chain-123",
        estimatedDuration: 300000,
        tasksCount: 5,
        executionOrder: [["task-1"], ["task-2", "task-3"]],
        status: "planning",
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/orchestration",
      };

      const result = await aiClient.createTaskChain(request);

      expect(mockGatewayClient.post).toHaveBeenCalledWith(
        "/ai/orchestration/chains",
        request,
      );
      expect(result).toMatchObject({
        chainId: "chain-123",
        estimatedDuration: 300000,
        tasksCount: 5,
        status: "planning",
      });
    });

    it("should get chain status successfully", async () => {
      const chainId = "test-chain-123";

      mockApiResponse.data = {
        chainId,
        status: "executing",
        progress: {
          completed: 2,
          total: 5,
          percentage: 40,
          currentTask: "task-3",
        },
        tasks: [
          {
            id: "task-1",
            name: "Authentication Module",
            status: "completed",
            progress: 100,
            result: { success: true, output: "Auth module created" },
          },
          {
            id: "task-2",
            name: "Validation Logic",
            status: "executing",
            progress: 60,
          },
        ],
        estimatedCompletion: new Date(Date.now() + 180000),
        performance: {
          executionTime: 120000,
          averageTaskTime: 60000,
          errorRate: 0.05,
        },
      };

      const result = await aiClient.getChainStatus(chainId);

      expect(mockGatewayClient.get).toHaveBeenCalledWith(
        `/ai/orchestration/chains/${chainId}/status`,
      );
      expect(result).toMatchObject({
        chainId,
        status: "executing",
        progress: expect.objectContaining({
          completed: 2,
          total: 5,
          percentage: 40,
        }),
      });
    });

    it("should control chain execution successfully", async () => {
      const chainId = "test-chain-123";
      const control = {
        action: "pause" as const,
        reason: "User requested pause",
      };

      await aiClient.controlChain(chainId, control);

      expect(mockGatewayClient.put).toHaveBeenCalledWith(
        `/ai/orchestration/chains/${chainId}/control`,
        control,
      );
    });

    it("should handle chain creation errors gracefully", async () => {
      mockApiResponse.success = false;
      mockApiResponse.error = "Invalid request parameters";

      const request = {
        goals: [],
        context: {
          userId: "test-user",
          sessionId: "test-session",
        },
      };

      await expect(aiClient.createTaskChain(request)).rejects.toThrow(
        "Failed to create task chain: Invalid request parameters",
      );
    });
  });

  describe("Task Planning API", () => {
    it("should analyze goals successfully", async () => {
      const request = {
        goals: [
          {
            description: "Create responsive dashboard",
            type: "development" as const,
            priority: 80,
            constraints: {
              deadline: new Date(Date.now() + 86400000),
              resources: ["frontend-developer", "ui-designer"],
            },
          },
          {
            description: "Optimize database queries",
            type: "development" as const,
            priority: 60,
            constraints: {
              resources: ["backend-developer", "database-admin"],
            },
          },
        ],
        context: {
          userId: "test-user",
          sessionId: "test-session",
          workspaceId: "workspace-123",
        },
      };

      mockApiResponse.data = {
        plans: [
          {
            id: "plan-1",
            goalId: "goal-1",
            tasks: [
              {
                id: "task-1",
                name: "Dashboard Layout",
                description: "Create responsive grid layout",
                type: "frontend",
                dependencies: [],
                estimatedDuration: 3600000,
                requiredCapabilities: ["html", "css", "responsive-design"],
              },
            ],
            executionStrategy: {
              type: "parallel",
              batchSize: 2,
              priority: "high",
            },
            estimatedDuration: 3600000,
            requiredResources: ["frontend-developer", "ui-designer"],
            riskAssessment: {
              level: "low",
              factors: ["well-defined requirements"],
              mitigations: ["regular design reviews"],
            },
            alternatives: [],
          },
        ],
        recommendations: [
          "Use CSS Grid for responsive layout",
          "Implement progressive enhancement",
          "Consider mobile-first approach",
        ],
        complexityAnalysis: {
          level: "moderate",
          factors: {
            totalGoals: 2,
            averageTasksPerGoal: 3,
            estimatedTotalDuration: 7200000,
          },
          approach: "Parallel development recommended",
        },
      };

      const result = await aiClient.analyzeGoals(request);

      expect(mockGatewayClient.post).toHaveBeenCalledWith(
        "/ai/planning/analyze",
        request,
      );
      expect(result).toMatchObject({
        plans: expect.any(Array),
        recommendations: expect.any(Array),
        complexityAnalysis: expect.objectContaining({
          level: "moderate",
          approach: "Parallel development recommended",
        }),
      });
      expect(result.plans.length).toBe(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should get planning templates successfully", async () => {
      mockApiResponse.data = {
        templates: [
          {
            id: "dev-template",
            goalType: "development",
            standardTasks: [
              "requirements-analysis",
              "implementation",
              "testing",
              "deployment",
            ],
            typicalDuration: 7200000,
            requiredCapabilities: ["coding", "testing", "deployment"],
          },
          {
            id: "analysis-template",
            goalType: "analysis",
            standardTasks: [
              "data-collection",
              "processing",
              "visualization",
              "reporting",
            ],
            typicalDuration: 3600000,
            requiredCapabilities: ["data-analysis", "visualization"],
          },
        ],
      };

      const result = await aiClient.getPlanningTemplates();

      expect(mockGatewayClient.get).toHaveBeenCalledWith(
        "/ai/planning/templates",
      );
      expect(result.templates).toBeInstanceOf(Array);
      expect(result.templates.length).toBe(2);
      expect(result.templates[0]).toMatchObject({
        id: "dev-template",
        goalType: "development",
        standardTasks: expect.any(Array),
      });
    });
  });

  describe("Multi-Agent API", () => {
    it("should create collaboration successfully", async () => {
      const request = {
        goal: "Develop secure payment system",
        requiredCapabilities: ["security", "backend-development", "testing"],
        options: {
          maxAgents: 4,
          timeoutMinutes: 60,
          consensusThreshold: 0.75,
          preferredAgents: ["security-specialist", "senior-developer"],
        },
        context: {
          userId: "test-user",
          sessionId: "test-session",
          portfolioId: "portfolio-123",
        },
      };

      mockApiResponse.data = {
        sessionId: "collab-session-789",
        participants: [
          {
            id: "agent-security",
            name: "SecurityGuard",
            type: "security-auditor",
            capabilities: [
              "security-audit",
              "vulnerability-scan",
              "compliance",
            ],
            role: "coordinator",
          },
          {
            id: "agent-backend",
            name: "BackendExpert",
            type: "code-assistant",
            capabilities: ["backend-development", "api-design", "database"],
            role: "participant",
          },
          {
            id: "agent-testing",
            name: "QualityGuard",
            type: "test-engineer",
            capabilities: [
              "security-testing",
              "penetration-testing",
              "automation",
            ],
            role: "participant",
          },
        ],
        estimatedDuration: 3600000,
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/collaboration",
      };

      const result = await aiClient.createCollaboration(request);

      expect(mockGatewayClient.post).toHaveBeenCalledWith(
        "/ai/agents/collaboration",
        request,
      );
      expect(result).toMatchObject({
        sessionId: "collab-session-789",
        participants: expect.any(Array),
        estimatedDuration: 3600000,
      });
      expect(result.participants.length).toBe(3);
      expect(result.participants[0].role).toBe("coordinator");
    });

    it("should get available agents successfully", async () => {
      mockApiResponse.data = {
        agents: [
          {
            id: "agent-1",
            name: "CodeMaster",
            type: "code-assistant",
            status: "idle",
            capabilities: [
              "code-generation",
              "refactoring",
              "debugging",
              "optimization",
            ],
            workload: 20,
            performance: {
              completionRate: 0.96,
              averageResponseTime: 1800,
              qualityScore: 0.94,
              recentErrors: 0,
            },
            availability: "available",
          },
          {
            id: "agent-2",
            name: "MarketSage",
            type: "portfolio-analyst",
            status: "busy",
            capabilities: [
              "market-analysis",
              "risk-assessment",
              "trading-strategy",
            ],
            workload: 85,
            performance: {
              completionRate: 0.92,
              averageResponseTime: 2200,
              qualityScore: 0.9,
              recentErrors: 1,
            },
            availability: "busy",
          },
        ],
        totalCapabilities: [
          "code-generation",
          "testing",
          "market-analysis",
          "security-audit",
          "data-processing",
          "optimization",
          "deployment",
        ],
        recommendedCombinations: [
          {
            purpose: "Full-stack development",
            agents: ["code-assistant", "test-engineer", "documentation-writer"],
            coverage: 85,
          },
          {
            purpose: "Trading system development",
            agents: ["portfolio-analyst", "code-assistant", "security-auditor"],
            coverage: 90,
          },
        ],
      };

      const result = await aiClient.getAvailableAgents();

      expect(mockGatewayClient.get).toHaveBeenCalledWith(
        "/ai/agents/available",
      );
      expect(result).toMatchObject({
        agents: expect.any(Array),
        totalCapabilities: expect.any(Array),
        recommendedCombinations: expect.any(Array),
      });
      expect(result.agents.length).toBe(2);
      expect(result.totalCapabilities.length).toBeGreaterThan(0);
      expect(result.recommendedCombinations.length).toBeGreaterThan(0);
    });

    it("should assign task to collaboration session successfully", async () => {
      const sessionId = "collab-session-123";
      const task = {
        description: "Implement OAuth2 authentication flow",
        requiredCapabilities: ["security", "backend-development"],
        assignedAgents: ["agent-security", "agent-backend"],
        consensusRequired: true,
        votingThreshold: 0.8,
      };

      await aiClient.assignTask(sessionId, task);

      expect(mockGatewayClient.post).toHaveBeenCalledWith(
        `/ai/agents/sessions/${sessionId}/tasks`,
        { task },
      );
    });
  });

  describe("WebSocket Management", () => {
    it("should create WebSocket connection with proper URL", () => {
      const endpoint = "/orchestration";
      const ws = aiClient.createAIWebSocket(endpoint);

      expect(ws).toBeInstanceOf(MockWebSocket);
      expect(ws.readyState).toBe(MockWebSocket.OPEN);
    });

    it("should handle WebSocket authentication", (done) => {
      // Mock localStorage for auth token
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn().mockReturnValue("test-auth-token"),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const ws = aiClient.createAIWebSocket("/test");

      ws.addEventListener("open", () => {
        // WebSocket should send auth message on open
        expect(ws).toBeInstanceOf(MockWebSocket);
        done();
      });

      // Simulate connection open
      setTimeout(() => {
        const openListeners = (ws as any).listeners.get("open");
        if (openListeners) {
          openListeners.forEach((listener: Function) => listener({}));
        }
      }, 10);
    });

    it("should handle WebSocket messages properly", (done) => {
      const ws = aiClient.createAIWebSocket("/test");

      ws.addEventListener("message", (event) => {
        expect(event.data).toContain("echo:");
        done();
      });

      // Send a test message
      ws.send(JSON.stringify({ type: "test", data: "hello" }));
    });

    it("should cleanup WebSocket connections", () => {
      const ws1 = aiClient.createAIWebSocket("/test1");
      const ws2 = aiClient.createAIWebSocket("/test2");

      expect(ws1.readyState).toBe(MockWebSocket.OPEN);
      expect(ws2.readyState).toBe(MockWebSocket.OPEN);

      aiClient.cleanup();

      expect(ws1.readyState).toBe(MockWebSocket.CLOSED);
      expect(ws2.readyState).toBe(MockWebSocket.CLOSED);
    });

    it("should get WebSocket connection status", () => {
      const ws1 = aiClient.createAIWebSocket("/status1");
      const ws2 = aiClient.createAIWebSocket("/status2");

      const status = aiClient.getConnectionStatus();

      expect(typeof status).toBe("object");
      // Should have connection status for created WebSockets
      const statusValues = Object.values(status);
      expect(statusValues.some((s) => s === "connected")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockGatewayClient.post.mockRejectedValue(new Error("Network error"));

      const request = {
        goals: ["Test goal"],
        context: { userId: "test", sessionId: "test" },
      };

      await expect(aiClient.createTaskChain(request)).rejects.toThrow(
        "Failed to create task chain: Network error",
      );
    });

    it("should handle API errors with proper error messages", async () => {
      mockApiResponse.success = false;
      mockApiResponse.error = "Invalid authentication token";

      const request = {
        goals: ["Test analysis"],
        context: { userId: "test", sessionId: "test" },
      };

      await expect(aiClient.analyzeGoals(request)).rejects.toThrow(
        "Failed to analyze goals: Invalid authentication token",
      );
    });

    it("should handle missing data in API responses", async () => {
      mockApiResponse.success = true;
      mockApiResponse.data = null;

      const chainId = "test-chain";

      await expect(aiClient.getChainStatus(chainId)).rejects.toThrow(
        "Failed to get chain status",
      );
    });

    it("should handle WebSocket connection errors", () => {
      // Override WebSocket to simulate connection error
      const OriginalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor() {
          super();
          setTimeout(() => {
            const errorListeners = this.listeners.get("error");
            if (errorListeners) {
              errorListeners.forEach((listener) =>
                listener(new Event("error")),
              );
            }
          }, 10);
        }
      } as any;

      expect(() => {
        aiClient.createAIWebSocket("/error-test");
      }).not.toThrow();

      // Restore original WebSocket
      global.WebSocket = OriginalWebSocket;
    });
  });

  describe("Authentication and Security", () => {
    it("should include auth token in WebSocket messages", (done) => {
      // Mock localStorage
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn().mockReturnValue("test-auth-token-123"),
        },
        writable: true,
      });

      const ws = aiClient.createAIWebSocket("/auth-test");

      // Mock the send method to capture auth message
      const originalSend = ws.send;
      ws.send = jest.fn().mockImplementation((data) => {
        const message = JSON.parse(data);
        if (message.type === "auth") {
          expect(message.token).toBe("test-auth-token-123");
          done();
        }
        return originalSend.call(ws, data);
      });

      // Simulate connection open to trigger auth
      setTimeout(() => {
        const openListeners = (ws as any).listeners.get("open");
        if (openListeners) {
          openListeners.forEach((listener: Function) => listener({}));
        }
      }, 10);
    });

    it("should handle missing auth token gracefully", () => {
      // Mock localStorage to return null
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn().mockReturnValue(null),
        },
        writable: true,
      });

      expect(() => {
        aiClient.createAIWebSocket("/no-auth-test");
      }).not.toThrow();
    });
  });

  describe("Performance and Optimization", () => {
    it("should handle multiple concurrent requests", async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        goals: [`Test goal ${i}`],
        context: { userId: `user-${i}`, sessionId: `session-${i}` },
      }));

      mockApiResponse.data = {
        chainId: "test-chain",
        estimatedDuration: 100000,
        tasksCount: 1,
        executionOrder: [["task-1"]],
        status: "planning",
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/orchestration",
      };

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((req) => aiClient.createTaskChain(req)),
      );
      const endTime = Date.now();

      expect(results.length).toBe(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      results.forEach((result) => {
        expect(result.chainId).toBe("test-chain");
      });
    });

    it("should not create duplicate WebSocket connections", () => {
      const ws1 = aiClient.createAIWebSocket("/duplicate-test");
      const ws2 = aiClient.createAIWebSocket("/duplicate-test");

      // Should handle duplicate connections gracefully
      expect(ws1).toBeInstanceOf(MockWebSocket);
      expect(ws2).toBeInstanceOf(MockWebSocket);
    });
  });
});
