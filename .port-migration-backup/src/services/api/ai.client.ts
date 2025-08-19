/**
 * AI Client Service
 * Extends ApiGatewayClient for AI Features integration
 * 80% reuse from gateway.client.ts with AI-specific endpoints
 */

import { ApiGatewayClient, ApiResponse } from "./gateway.client";

// AI-specific types
export interface TaskContext {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  portfolioId?: string;
  terminalSessionId?: string;
  metadata?: Record<string, any>;
}

export interface CreateChainRequest {
  goals: string[];
  context: TaskContext;
  options?: {
    priority?: "low" | "medium" | "high" | "critical";
    timeout?: number;
    parallelization?: boolean;
  };
}

export interface CreateChainResponse {
  success: boolean;
  chainId: string;
  estimatedDuration: number;
  tasksCount: number;
  executionOrder: string[][];
  status: "planning" | "executing" | "completed" | "failed";
  websocketUrl: string;
}

export interface ChainStatusResponse {
  chainId: string;
  status: TaskStatus;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    currentTask?: string;
  };
  tasks: Array<{
    id: string;
    name: string;
    status: TaskStatus;
    progress: number;
    startTime?: Date;
    endTime?: Date;
    result?: any;
    error?: string;
  }>;
  estimatedCompletion: Date;
  performance: {
    executionTime: number;
    averageTaskTime: number;
    errorRate: number;
  };
}

export interface ChainControlRequest {
  action: "pause" | "resume" | "cancel" | "priority_change";
  reason?: string;
  newPriority?: TaskPriority;
}

export interface AnalyzeGoalsRequest {
  goals: Array<{
    description: string;
    type:
      | "development"
      | "analysis"
      | "documentation"
      | "trading"
      | "management";
    priority: number;
    constraints?: {
      deadline?: Date;
      budget?: number;
      resources?: string[];
      dependencies?: string[];
    };
  }>;
  context: TaskContext;
}

export interface TaskPlanResponse {
  plans: Array<{
    id: string;
    goalId: string;
    tasks: PlannedTask[];
    executionStrategy: ExecutionStrategy;
    estimatedDuration: number;
    requiredResources: string[];
    riskAssessment: RiskAssessment;
    alternatives: Array<{
      id: string;
      name: string;
      estimatedDuration: number;
      tradeoffs: string[];
    }>;
  }>;
  recommendations: string[];
  complexityAnalysis: {
    level: "simple" | "moderate" | "complex" | "highly-complex";
    factors: Record<string, any>;
    approach: string;
  };
}

export interface CreateCollaborationRequest {
  goal: string;
  requiredCapabilities: string[];
  options?: {
    maxAgents?: number;
    timeoutMinutes?: number;
    consensusThreshold?: number;
    preferredAgents?: string[];
  };
  context: TaskContext;
}

export interface CollaborationResponse {
  sessionId: string;
  participants: Array<{
    id: string;
    name: string;
    type: AgentType;
    capabilities: string[];
    role: "coordinator" | "participant";
  }>;
  estimatedDuration: number;
  websocketUrl: string;
}

export interface AvailableAgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    type: AgentType;
    status: AgentStatus;
    capabilities: string[];
    workload: number;
    performance: AgentPerformance;
    availability: "available" | "busy" | "offline";
  }>;
  totalCapabilities: string[];
  recommendedCombinations: Array<{
    purpose: string;
    agents: string[];
    coverage: number;
  }>;
}

// Additional type definitions
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type AgentType =
  | "developer"
  | "analyst"
  | "tester"
  | "coordinator"
  | "specialist";
export type AgentStatus = "idle" | "busy" | "offline" | "error";

export interface PlannedTask {
  id: string;
  name: string;
  description: string;
  type: string;
  dependencies: string[];
  estimatedDuration: number;
  requiredCapabilities: string[];
}

export interface ExecutionStrategy {
  type: "sequential" | "parallel" | "mixed";
  batchSize?: number;
  priority: TaskPriority;
}

export interface RiskAssessment {
  level: "low" | "medium" | "high";
  factors: string[];
  mitigations: string[];
}

export interface AgentPerformance {
  completionRate: number;
  averageResponseTime: number;
  qualityScore: number;
  recentErrors: number;
}

export class AIClient {
  private static aiInstance: AIClient;
  private gatewayClient: ApiGatewayClient;
  private wsConnections: Map<string, WebSocket> = new Map();

  private constructor() {
    this.gatewayClient = ApiGatewayClient.getInstance();
  }

  /**
   * Get singleton AI client instance
   */
  public static getInstance(): AIClient {
    if (!AIClient.aiInstance) {
      AIClient.aiInstance = new AIClient();
    }
    return AIClient.aiInstance;
  }

  // ======================
  // Task Orchestration API
  // ======================

  /**
   * Create and execute a task chain from goals
   */
  async createTaskChain(
    request: CreateChainRequest,
  ): Promise<CreateChainResponse> {
    try {
      const response = await this.gatewayClient.post<CreateChainResponse>(
        "/ai/orchestration/chains",
        request,
      );

      if (response.success && response.data) {
        // Auto-subscribe to chain updates
        this.subscribeToChainUpdates(response.data.chainId);
        return response.data;
      }

      throw new Error(response.error || "Failed to create task chain");
    } catch (error: any) {
      console.error("[AI Client] Create task chain error:", error);
      throw new Error(`Failed to create task chain: ${error.message}`);
    }
  }

  /**
   * Get detailed status of a task chain
   */
  async getChainStatus(chainId: string): Promise<ChainStatusResponse> {
    try {
      const response = await this.gatewayClient.get<ChainStatusResponse>(
        `/ai/orchestration/chains/${chainId}/status`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || "Failed to get chain status");
    } catch (error: any) {
      console.error("[AI Client] Get chain status error:", error);
      throw new Error(`Failed to get chain status: ${error.message}`);
    }
  }

  /**
   * Control chain execution (pause, resume, cancel)
   */
  async controlChain(
    chainId: string,
    control: ChainControlRequest,
  ): Promise<void> {
    try {
      const response = await this.gatewayClient.put(
        `/ai/orchestration/chains/${chainId}/control`,
        control,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to control chain");
      }
    } catch (error: any) {
      console.error("[AI Client] Control chain error:", error);
      throw new Error(`Failed to control chain: ${error.message}`);
    }
  }

  // ======================
  // Task Planning API
  // ======================

  /**
   * Analyze goals and generate task plans
   */
  async analyzeGoals(request: AnalyzeGoalsRequest): Promise<TaskPlanResponse> {
    try {
      const response = await this.gatewayClient.post<TaskPlanResponse>(
        "/ai/planning/analyze",
        request,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || "Failed to analyze goals");
    } catch (error: any) {
      console.error("[AI Client] Analyze goals error:", error);
      throw new Error(`Failed to analyze goals: ${error.message}`);
    }
  }

  /**
   * Get available planning templates
   */
  async getPlanningTemplates(): Promise<any> {
    try {
      const response = await this.gatewayClient.get("/ai/planning/templates");

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || "Failed to get planning templates");
    } catch (error: any) {
      console.error("[AI Client] Get planning templates error:", error);
      throw new Error(`Failed to get planning templates: ${error.message}`);
    }
  }

  // ======================
  // Multi-Agent API
  // ======================

  /**
   * Create a collaboration session
   */
  async createCollaboration(
    request: CreateCollaborationRequest,
  ): Promise<CollaborationResponse> {
    try {
      const response = await this.gatewayClient.post<CollaborationResponse>(
        "/ai/agents/collaboration",
        request,
      );

      if (response.success && response.data) {
        // Auto-subscribe to collaboration updates
        this.subscribeToCollaboration(response.data.sessionId);
        return response.data;
      }

      throw new Error(response.error || "Failed to create collaboration");
    } catch (error: any) {
      console.error("[AI Client] Create collaboration error:", error);
      throw new Error(`Failed to create collaboration: ${error.message}`);
    }
  }

  /**
   * Get available agents and their status
   */
  async getAvailableAgents(): Promise<AvailableAgentsResponse> {
    try {
      const response = await this.gatewayClient.get<AvailableAgentsResponse>(
        "/ai/agents/available",
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || "Failed to get available agents");
    } catch (error: any) {
      console.error("[AI Client] Get available agents error:", error);
      throw new Error(`Failed to get available agents: ${error.message}`);
    }
  }

  /**
   * Assign a collaborative task
   */
  async assignTask(sessionId: string, task: any): Promise<void> {
    try {
      const response = await this.gatewayClient.post(
        `/ai/agents/sessions/${sessionId}/tasks`,
        { task },
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to assign task");
      }
    } catch (error: any) {
      console.error("[AI Client] Assign task error:", error);
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  // ======================
  // WebSocket Management
  // ======================

  /**
   * Create WebSocket connection for AI events
   */
  createAIWebSocket(endpoint: string): WebSocket {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
    const wsUrl = `${baseUrl}/ws/ai${endpoint}`;

    try {
      const ws = new WebSocket(wsUrl);

      // Add authentication
      ws.addEventListener("open", () => {
        const token = this.getAuthToken();
        if (token) {
          ws.send(JSON.stringify({ type: "auth", token }));
        }
      });

      // Error handling
      ws.addEventListener("error", (error) => {
        console.error(
          `[AI WebSocket] Connection error for ${endpoint}:`,
          error,
        );
      });

      return ws;
    } catch (error) {
      console.error("[AI Client] WebSocket creation error:", error);
      throw error;
    }
  }

  /**
   * Subscribe to task chain updates
   */
  private subscribeToChainUpdates(chainId: string): void {
    if (typeof window === "undefined") return;

    const wsKey = `chain-${chainId}`;

    // Don't create duplicate connections
    if (this.wsConnections.has(wsKey)) return;

    try {
      const ws = this.createAIWebSocket("/orchestration");

      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            topic: "chain",
            chainId,
          }),
        );
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleChainEvent(data);
        } catch (error) {
          console.error("[AI Client] WebSocket message parse error:", error);
        }
      });

      ws.addEventListener("close", () => {
        this.wsConnections.delete(wsKey);
      });

      this.wsConnections.set(wsKey, ws);
    } catch (error) {
      console.error("[AI Client] Chain subscription error:", error);
    }
  }

  /**
   * Subscribe to collaboration updates
   */
  private subscribeToCollaboration(sessionId: string): void {
    if (typeof window === "undefined") return;

    const wsKey = `collaboration-${sessionId}`;

    // Don't create duplicate connections
    if (this.wsConnections.has(wsKey)) return;

    try {
      const ws = this.createAIWebSocket("/collaboration");

      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            topic: "collaboration",
            sessionId,
          }),
        );
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleCollaborationEvent(data);
        } catch (error) {
          console.error("[AI Client] WebSocket message parse error:", error);
        }
      });

      ws.addEventListener("close", () => {
        this.wsConnections.delete(wsKey);
      });

      this.wsConnections.set(wsKey, ws);
    } catch (error) {
      console.error("[AI Client] Collaboration subscription error:", error);
    }
  }

  /**
   * Handle chain events
   */
  private handleChainEvent(data: any): void {
    // Emit custom event for components to listen to
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-chain-update", { detail: data }),
      );
    }
  }

  /**
   * Handle collaboration events
   */
  private handleCollaborationEvent(data: any): void {
    // Emit custom event for components to listen to
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-collaboration-update", { detail: data }),
      );
    }
  }

  /**
   * Get auth token (inherited method)
   */
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  /**
   * Cleanup WebSocket connections
   */
  public cleanup(): void {
    this.wsConnections.forEach((ws, key) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.wsConnections.clear();
  }

  /**
   * Get WebSocket connection status
   */
  public getConnectionStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.wsConnections.forEach((ws, key) => {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          status[key] = "connecting";
          break;
        case WebSocket.OPEN:
          status[key] = "connected";
          break;
        case WebSocket.CLOSING:
          status[key] = "closing";
          break;
        case WebSocket.CLOSED:
          status[key] = "closed";
          break;
        default:
          status[key] = "unknown";
      }
    });
    return status;
  }
}

// Export singleton instance
export const aiClient = AIClient.getInstance();
export default aiClient;
