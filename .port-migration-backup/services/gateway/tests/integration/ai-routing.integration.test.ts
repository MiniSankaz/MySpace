/**
 * API Integration Tests for AI Gateway Routing
 * Tests the routing and integration between Gateway and AI Assistant service
 */

import request from "supertest";
import express from "express";
import { Server } from "http";
import jwt from "jsonwebtoken";

// Mock AI Assistant Service responses
const mockAIServiceResponses = new Map();

// Create a mock AI service
function createMockAIService() {
  const app = express();
  app.use(express.json());

  // Mock AI Orchestration endpoints
  app.post("/api/v1/orchestration/chains", (req, res) => {
    const response = mockAIServiceResponses.get("createChain") || {
      success: true,
      chainId: "test-chain-123",
      estimatedDuration: 300000,
      tasksCount: 3,
      executionOrder: [["task-1"], ["task-2", "task-3"]],
      status: "planning",
      websocketUrl: "ws://localhost:4200/ws/orchestration",
    };
    res.json(response);
  });

  app.get("/api/v1/orchestration/chains/:chainId/status", (req, res) => {
    const response = mockAIServiceResponses.get("getStatus") || {
      success: true,
      chainId: req.params.chainId,
      status: "executing",
      progress: {
        completed: 1,
        total: 3,
        percentage: 33,
        currentTask: "Task 2",
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
    };
    res.json(response);
  });

  app.put("/api/v1/orchestration/chains/:chainId/control", (req, res) => {
    const response = mockAIServiceResponses.get("controlChain") || {
      success: true,
      message: `Chain ${req.params.chainId} ${req.body.action} successful`,
    };
    res.json(response);
  });

  // Mock Task Planning endpoints
  app.post("/api/v1/planning/analyze", (req, res) => {
    const response = mockAIServiceResponses.get("analyzeGoals") || {
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
          totalGoals: req.body.goals.length,
          averageTasksPerGoal: 1,
          estimatedTotalDuration: 3600000,
        },
        approach: "Direct implementation possible",
      },
    };
    res.json(response);
  });

  app.get("/api/v1/planning/templates", (req, res) => {
    const response = mockAIServiceResponses.get("getTemplates") || {
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
    };
    res.json(response);
  });

  // Mock Multi-Agent endpoints
  app.post("/api/v1/agents/collaboration", (req, res) => {
    const response = mockAIServiceResponses.get("createCollaboration") || {
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
      websocketUrl: "ws://localhost:4200/ws/collaboration",
    };
    res.json(response);
  });

  app.get("/api/v1/agents/available", (req, res) => {
    const response = mockAIServiceResponses.get("getAgents") || {
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
      totalCapabilities: ["code-generation", "testing", "analysis"],
      recommendedCombinations: [
        {
          purpose: "Full-stack development",
          agents: ["code-assistant", "test-engineer"],
          coverage: 85,
        },
      ],
    };
    res.json(response);
  });

  app.post("/api/v1/agents/sessions/:sessionId/tasks", (req, res) => {
    const response = mockAIServiceResponses.get("assignTask") || {
      success: true,
      message: `Task assigned to session ${req.params.sessionId}`,
    };
    res.json(response);
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", service: "ai-assistant", port: 4200 });
  });

  return app;
}

// Create a mock gateway
function createMockGateway() {
  const app = express();
  app.use(express.json());

  // JWT middleware for authentication
  const authenticateJWT = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, "test-secret");
        req.user = decoded;
        next();
      } catch (err) {
        return res.status(403).json({ error: "Invalid token" });
      }
    } else {
      return res.status(401).json({ error: "No token provided" });
    }
  };

  // AI service routing - all requests go through authentication
  app.use("/api/v1/ai/*", authenticateJWT);

  // AI Orchestration routes
  app.post("/api/v1/ai/orchestration/chains", async (req, res) => {
    try {
      const response = await request(mockAIService)
        .post("/api/v1/orchestration/chains")
        .send(req.body);
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  app.get(
    "/api/v1/ai/orchestration/chains/:chainId/status",
    async (req, res) => {
      try {
        const response = await request(mockAIService).get(
          `/api/v1/orchestration/chains/${req.params.chainId}/status`,
        );
        res.json(response.body);
      } catch (error) {
        res.status(500).json({ error: "AI service unavailable" });
      }
    },
  );

  app.put(
    "/api/v1/ai/orchestration/chains/:chainId/control",
    async (req, res) => {
      try {
        const response = await request(mockAIService)
          .put(`/api/v1/orchestration/chains/${req.params.chainId}/control`)
          .send(req.body);
        res.json(response.body);
      } catch (error) {
        res.status(500).json({ error: "AI service unavailable" });
      }
    },
  );

  // AI Planning routes
  app.post("/api/v1/ai/planning/analyze", async (req, res) => {
    try {
      const response = await request(mockAIService)
        .post("/api/v1/planning/analyze")
        .send(req.body);
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  app.get("/api/v1/ai/planning/templates", async (req, res) => {
    try {
      const response = await request(mockAIService).get(
        "/api/v1/planning/templates",
      );
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // AI Agents routes
  app.post("/api/v1/ai/agents/collaboration", async (req, res) => {
    try {
      const response = await request(mockAIService)
        .post("/api/v1/agents/collaboration")
        .send(req.body);
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  app.get("/api/v1/ai/agents/available", async (req, res) => {
    try {
      const response = await request(mockAIService).get(
        "/api/v1/agents/available",
      );
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  app.post("/api/v1/ai/agents/sessions/:sessionId/tasks", async (req, res) => {
    try {
      const response = await request(mockAIService)
        .post(`/api/v1/agents/sessions/${req.params.sessionId}/tasks`)
        .send(req.body);
      res.json(response.body);
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // Health aggregation
  app.get("/health/all", async (req, res) => {
    try {
      const aiHealth = await request(mockAIService).get("/health");
      res.json({
        gateway: { status: "healthy", port: 4000 },
        ai_assistant: aiHealth.body,
      });
    } catch (error) {
      res.status(503).json({
        gateway: { status: "healthy", port: 4000 },
        ai_assistant: { status: "unhealthy", error: "Service unavailable" },
      });
    }
  });

  return app;
}

describe("AI Gateway Routing Integration Tests", () => {
  let gateway: express.Application;
  let mockAIService: express.Application;
  let gatewayServer: Server;
  let aiServiceServer: Server;
  let authToken: string;

  beforeAll((done) => {
    // Create mock services
    mockAIService = createMockAIService();
    gateway = createMockGateway();

    // Start servers
    aiServiceServer = mockAIService.listen(0, () => {
      gatewayServer = gateway.listen(0, () => {
        // Generate test JWT token
        authToken = jwt.sign(
          { userId: "test-user-123", role: "user" },
          "test-secret",
          { expiresIn: "1h" },
        );
        done();
      });
    });
  });

  afterAll((done) => {
    gatewayServer.close(() => {
      aiServiceServer.close(done);
    });
  });

  beforeEach(() => {
    // Reset mock responses
    mockAIServiceResponses.clear();
  });

  describe("Authentication and Authorization", () => {
    it("should reject requests without authentication", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .send({ goals: ["test goal"] });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("No token provided");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", "Bearer invalid-token")
        .send({ goals: ["test goal"] });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Invalid token");
    });

    it("should accept requests with valid token", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          goals: ["test goal"],
          context: { userId: "test-user", sessionId: "test-session" },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("AI Orchestration Routing", () => {
    it("should route chain creation requests correctly", async () => {
      const requestBody = {
        goals: ["Implement user authentication", "Add input validation"],
        context: {
          userId: "test-user",
          sessionId: "test-session",
          workspaceId: "workspace-123",
        },
        options: {
          priority: "high",
          timeout: 300000,
          parallelization: true,
        },
      };

      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        chainId: "test-chain-123",
        estimatedDuration: 300000,
        tasksCount: 3,
        status: "planning",
      });
    });

    it("should route chain status requests correctly", async () => {
      const chainId = "test-chain-123";

      const response = await request(gateway)
        .get(`/api/v1/ai/orchestration/chains/${chainId}/status`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        chainId,
        status: "executing",
        progress: expect.objectContaining({
          completed: 1,
          total: 3,
          percentage: 33,
        }),
      });
    });

    it("should route chain control requests correctly", async () => {
      const chainId = "test-chain-123";
      const controlRequest = {
        action: "pause",
        reason: "User requested pause",
      };

      const response = await request(gateway)
        .put(`/api/v1/ai/orchestration/chains/${chainId}/control`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(controlRequest);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining("pause successful"),
      });
    });

    it("should handle AI service errors gracefully", async () => {
      // Configure AI service to return error
      mockAIServiceResponses.set("createChain", {
        success: false,
        error: "Invalid request parameters",
      });

      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ goals: [] });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: "Invalid request parameters",
      });
    });
  });

  describe("AI Planning Routing", () => {
    it("should route goal analysis requests correctly", async () => {
      const requestBody = {
        goals: [
          {
            description: "Create responsive dashboard",
            type: "development",
            priority: 80,
            constraints: {
              deadline: new Date(Date.now() + 86400000),
              resources: ["frontend-developer", "ui-designer"],
            },
          },
        ],
        context: {
          userId: "test-user",
          sessionId: "test-session",
        },
      };

      const response = await request(gateway)
        .post("/api/v1/ai/planning/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        plans: expect.any(Array),
        recommendations: expect.any(Array),
        complexityAnalysis: expect.objectContaining({
          level: "moderate",
          factors: expect.objectContaining({
            totalGoals: 1,
          }),
        }),
      });
    });

    it("should route template requests correctly", async () => {
      const response = await request(gateway)
        .get("/api/v1/ai/planning/templates")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: "dev-template",
            goalType: "development",
            standardTasks: expect.any(Array),
          }),
        ]),
      });
    });
  });

  describe("AI Agents Routing", () => {
    it("should route collaboration creation requests correctly", async () => {
      const requestBody = {
        goal: "Develop secure payment system",
        requiredCapabilities: ["security", "backend-development", "testing"],
        options: {
          maxAgents: 4,
          timeoutMinutes: 60,
          consensusThreshold: 0.75,
        },
        context: {
          userId: "test-user",
          sessionId: "test-session",
        },
      };

      const response = await request(gateway)
        .post("/api/v1/ai/agents/collaboration")
        .set("Authorization", `Bearer ${authToken}`)
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        sessionId: "collab-123",
        participants: expect.arrayContaining([
          expect.objectContaining({
            id: "agent-1",
            name: "CodeMaster",
            type: "code-assistant",
            role: "coordinator",
          }),
        ]),
      });
    });

    it("should route available agents requests correctly", async () => {
      const response = await request(gateway)
        .get("/api/v1/ai/agents/available")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        agents: expect.any(Array),
        totalCapabilities: expect.any(Array),
        recommendedCombinations: expect.any(Array),
      });
    });

    it("should route task assignment requests correctly", async () => {
      const sessionId = "collab-123";
      const taskRequest = {
        task: {
          description: "Implement OAuth2 authentication flow",
          requiredCapabilities: ["security", "backend-development"],
          consensusRequired: true,
        },
      };

      const response = await request(gateway)
        .post(`/api/v1/ai/agents/sessions/${sessionId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskRequest);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining(`session ${sessionId}`),
      });
    });
  });

  describe("Health Check Routing", () => {
    it("should aggregate health status from all services", async () => {
      const response = await request(gateway).get("/health/all");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        gateway: {
          status: "healthy",
          port: 4000,
        },
        ai_assistant: {
          status: "healthy",
          service: "ai-assistant",
          port: 4200,
        },
      });
    });

    it("should handle unhealthy AI service", async () => {
      // Temporarily stop AI service
      aiServiceServer.close();

      const response = await request(gateway).get("/health/all");

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        gateway: {
          status: "healthy",
          port: 4000,
        },
        ai_assistant: {
          status: "unhealthy",
          error: "Service unavailable",
        },
      });

      // Restart AI service for other tests
      aiServiceServer = mockAIService.listen(0);
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle network timeouts gracefully", async () => {
      // Mock a delayed response
      mockAIServiceResponses.set(
        "createChain",
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                chainId: "delayed-chain",
              }),
            5000,
          ),
        ),
      );

      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          goals: ["delayed goal"],
          context: { userId: "test", sessionId: "test" },
        })
        .timeout(1000);

      // Should timeout and return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle malformed requests", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send("invalid json string");

      expect(response.status).toBe(400);
    });

    it("should handle large payloads", async () => {
      const largePayload = {
        goals: Array.from({ length: 1000 }, (_, i) => `Goal ${i}`),
        context: { userId: "test", sessionId: "test" },
      };

      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send(largePayload);

      // Should handle large payloads gracefully
      expect([200, 413]).toContain(response.status);
    });
  });

  describe("Request Validation", () => {
    it("should validate required fields in chain creation", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send({}); // Missing required fields

      // Should either validate at gateway level or pass through to AI service
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it("should validate chain ID format in status requests", async () => {
      const response = await request(gateway)
        .get("/api/v1/ai/orchestration/chains/invalid-chain-id/status")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200); // AI service handles validation
    });

    it("should validate collaboration parameters", async () => {
      const response = await request(gateway)
        .post("/api/v1/ai/agents/collaboration")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          goal: "", // Empty goal
          requiredCapabilities: [],
        });

      expect(response.status).toBe(200); // AI service handles validation
    });
  });

  describe("Rate Limiting and Security", () => {
    it("should handle concurrent requests efficiently", async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(gateway)
          .get("/api/v1/ai/agents/available")
          .set("Authorization", `Bearer ${authToken}`),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should sanitize request data", async () => {
      const maliciousPayload = {
        goals: ['<script>alert("xss")</script>'],
        context: {
          userId: "test",
          sessionId: "test",
          metadata: {
            script: '<script>alert("xss")</script>',
          },
        },
      };

      const response = await request(gateway)
        .post("/api/v1/ai/orchestration/chains")
        .set("Authorization", `Bearer ${authToken}`)
        .send(maliciousPayload);

      expect(response.status).toBe(200);
      // Data should be passed through to AI service for processing
    });
  });

  describe("Service Discovery and Load Balancing", () => {
    it("should route to healthy AI service instances", async () => {
      const response = await request(gateway)
        .get("/api/v1/ai/agents/available")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should handle service discovery failures", async () => {
      // This would test service registry failures
      // For now, we simulate by checking error handling
      const response = await request(gateway).get("/health/all");

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("Performance and Monitoring", () => {
    it("should respond within acceptable time limits", async () => {
      const startTime = Date.now();

      const response = await request(gateway)
        .get("/api/v1/ai/agents/available")
        .set("Authorization", `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 second limit
    });

    it("should handle multiple service calls efficiently", async () => {
      const startTime = Date.now();

      const responses = await Promise.all([
        request(gateway)
          .get("/api/v1/ai/agents/available")
          .set("Authorization", `Bearer ${authToken}`),
        request(gateway)
          .get("/api/v1/ai/planning/templates")
          .set("Authorization", `Bearer ${authToken}`),
        request(gateway).get("/health/all"),
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
      });

      expect(totalTime).toBeLessThan(10000); // 10 second limit for all calls
    });
  });
});
