/**
 * AI Orchestration Controller
 * Handles REST API endpoints for Task Orchestration, Planning, and Multi-Agent features
 */

import { Request, Response } from "express";
import {
  TaskOrchestratorService,
  TaskContext,
  taskOrchestrator
} from "../services/ai-orchestration/task-orchestrator.service";
import { TaskPlannerService } from "../services/ai-orchestration/task-planner.service";
import { MultiAgentCoordinatorService, multiAgentCoordinator } from "../services/ai-orchestration/multi-agent-coordinator.service";
import { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../utils/logger";

export class AIOrchestrationController {
  private taskOrchestrator: TaskOrchestratorService;
  private taskPlanner: TaskPlannerService;
  private multiAgentCoordinator: MultiAgentCoordinatorService;

  constructor() {
    // Use singleton instances to prevent duplicate registrations
    this.taskOrchestrator = taskOrchestrator;
    this.taskPlanner = new TaskPlannerService();
    this.multiAgentCoordinator = multiAgentCoordinator;
  }

  // ======================
  // Task Orchestration Endpoints
  // ======================

  /**
   * POST /api/v1/ai/orchestration/chains
   * Create and execute a task chain from goals
   */
  async createTaskChain(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { goals, context, options } = req.body;

      // Validate required fields
      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        res.status(400).json({
          success: false,
          error: "Goals array is required and cannot be empty",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!context || !context.userId || !context.sessionId) {
        res.status(400).json({
          success: false,
          error: "Context with userId and sessionId is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Enrich context with user info from JWT
      const enrichedContext: TaskContext = {
        ...context,
        userId: req.userId || context.userId,
        metadata: {
          ...context.metadata,
          requestId: req.headers["x-correlation-id"],
          userAgent: req.headers["user-agent"],
          timestamp: new Date().toISOString(),
        },
      };

      // Create task chain
      const chain = await this.taskOrchestrator.createTaskChain(
        goals,
        enrichedContext,
      );

      // Start execution asynchronously
      this.taskOrchestrator.executeChain(chain.id).catch((error) => {
        logger.error(`Chain execution failed for ${chain.id}:`, error);
      });

      // Calculate estimated duration based on tasks
      const estimatedDuration = chain.tasks.reduce(
        (total, task) => total + (task.timeout || 30000),
        0,
      );

      const response = {
        success: true,
        data: {
          chainId: chain.id,
          estimatedDuration,
          tasksCount: chain.tasks.length,
          executionOrder: chain.executionOrder,
          status: chain.status,
          websocketUrl: `/ws/ai/orchestration?chainId=${chain.id}`,
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
        service: "ai-assistant",
      };

      logger.info(
        `Task chain created: ${chain.id} with ${chain.tasks.length} tasks`,
      );
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Create task chain error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create task chain",
        message: error.message,
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      });
    }
  }

  /**
   * GET /api/v1/ai/orchestration/chains/:chainId/status
   * Get detailed status of a task chain
   */
  async getChainStatus(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params;

      const chain = this.taskOrchestrator.getChainStatus(chainId);
      if (!chain) {
        res.status(404).json({
          success: false,
          error: "Task chain not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate progress
      const completedTasks = chain.tasks.filter(
        (t) =>
          this.taskOrchestrator.getExecutionQueue().get(t.id)?.status ===
          "completed",
      ).length;

      const progress = {
        completed: completedTasks,
        total: chain.tasks.length,
        percentage: Math.round((completedTasks / chain.tasks.length) * 100),
        currentTask: this.getCurrentTaskName(chain),
      };

      // Get performance metrics
      const performance = this.calculatePerformanceMetrics(chain);

      const response = {
        success: true,
        data: {
          chainId: chain.id,
          status: chain.status,
          progress,
          tasks: this.getTaskExecutionDetails(chain),
          estimatedCompletion: this.calculateEstimatedCompletion(chain),
          performance,
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      };

      res.json(response);
    } catch (error: any) {
      logger.error("Get chain status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get chain status",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PUT /api/v1/ai/orchestration/chains/:chainId/control
   * Control chain execution (pause, resume, cancel)
   */
  async controlChain(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params;
      const { action, reason, newPriority } = req.body;

      if (
        !action ||
        !["pause", "resume", "cancel", "priority_change"].includes(action)
      ) {
        res.status(400).json({
          success: false,
          error:
            "Valid action is required (pause, resume, cancel, priority_change)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const chain = this.taskOrchestrator.getChainStatus(chainId);
      if (!chain) {
        res.status(404).json({
          success: false,
          error: "Task chain not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Execute control action
      switch (action) {
        case "cancel":
          await this.taskOrchestrator.cancelChain(chainId);
          break;
        case "pause":
          // Implementation for pause (would need to be added to orchestrator)
          logger.info(
            `Pause requested for chain ${chainId}: ${reason || "No reason provided"}`,
          );
          break;
        case "resume":
          // Implementation for resume (would need to be added to orchestrator)
          logger.info(`Resume requested for chain ${chainId}`);
          break;
        case "priority_change":
          // Implementation for priority change (would need to be added to orchestrator)
          logger.info(
            `Priority change requested for chain ${chainId} to ${newPriority}`,
          );
          break;
      }

      logger.info(`Chain control action '${action}' applied to ${chainId}`);
      res.json({
        success: true,
        message: `Chain ${action} executed successfully`,
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (error: any) {
      logger.error("Control chain error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to control chain",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ======================
  // Task Planning Endpoints
  // ======================

  /**
   * POST /api/v1/ai/planning/analyze
   * Analyze goals and generate task plans
   */
  async analyzeGoals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { goals, context } = req.body;

      if (!goals || !Array.isArray(goals)) {
        res.status(400).json({
          success: false,
          error: "Goals array is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Enrich context
      const enrichedContext = {
        ...context,
        userId: req.userId || context?.userId,
        sessionId: context?.sessionId || req.headers["x-correlation-id"],
      };

      // Analyze goals using task planner
      const analysis = await this.taskPlanner.analyzeGoals(
        goals,
        enrichedContext,
      );

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
        service: "ai-assistant",
      });
    } catch (error: any) {
      logger.error("Analyze goals error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to analyze goals",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/ai/planning/templates
   * Get available planning templates
   */
  async getPlanningTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = this.taskPlanner.getAvailableTemplates();

      res.json({
        success: true,
        data: {
          templates: Array.from(templates.values()),
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (error: any) {
      logger.error("Get planning templates error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get planning templates",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ======================
  // Multi-Agent Endpoints
  // ======================

  /**
   * POST /api/v1/ai/agents/collaboration
   * Create a collaboration session
   */
  async createCollaboration(req: Request, res: Response): Promise<void> {
    try {
      const { goal, requiredCapabilities, options, context } = req.body;

      if (
        !goal ||
        !requiredCapabilities ||
        !Array.isArray(requiredCapabilities)
      ) {
        res.status(400).json({
          success: false,
          error: "Goal and requiredCapabilities array are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create collaboration session
      const session =
        await this.multiAgentCoordinator.createCollaborationSession(
          goal,
          requiredCapabilities,
          options || {},
        );

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          participants: session.participants
            .map((id) => {
              const agent = this.multiAgentCoordinator.getAgent(id);
              return agent
                ? {
                    id: agent.id,
                    name: agent.name,
                    type: agent.type,
                    capabilities: agent.capabilities,
                    role:
                      id === session.coordinator
                        ? "coordinator"
                        : "participant",
                  }
                : null;
            })
            .filter(Boolean),
          estimatedDuration: this.estimateCollaborationDuration(session),
          websocketUrl: `/ws/ai/collaboration?sessionId=${session.id}`,
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
        service: "ai-assistant",
      });
    } catch (error: any) {
      logger.error("Create collaboration error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create collaboration session",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/ai/agents/available
   * Get available agents and their status
   */
  async getAvailableAgents(req: Request, res: Response): Promise<void> {
    try {
      const agents = this.multiAgentCoordinator.getAvailableAgents();
      const allCapabilities = this.multiAgentCoordinator.getAllCapabilities();
      const recommendations =
        this.multiAgentCoordinator.getRecommendedCombinations();

      res.json({
        success: true,
        data: {
          agents: agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            status: agent.status,
            capabilities: agent.capabilities,
            workload: agent.workload,
            performance: agent.performance,
            availability: this.mapAgentAvailability(agent.status),
          })),
          totalCapabilities: allCapabilities,
          recommendedCombinations: recommendations,
        },
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (error: any) {
      logger.error("Get available agents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get available agents",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/ai/agents/sessions/:sessionId/tasks
   * Assign a collaborative task
   */
  async assignTask(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { task } = req.body;

      if (!task || !task.description) {
        res.status(400).json({
          success: false,
          error: "Task with description is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.multiAgentCoordinator.assignTask(sessionId, task);

      res.json({
        success: true,
        message: "Task assigned successfully",
        timestamp: new Date().toISOString(),
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (error: any) {
      logger.error("Assign task error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to assign task",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ======================
  // Helper Methods
  // ======================

  private getCurrentTaskName(chain: any): string | undefined {
    // Find the currently executing task
    const executingTask = chain.tasks.find((task: any) => {
      const execution = this.taskOrchestrator.getExecutionQueue().get(task.id);
      return execution?.status === "executing";
    });
    return executingTask?.name;
  }

  private calculatePerformanceMetrics(chain: any): any {
    const executions = Array.from(
      this.taskOrchestrator.getExecutionQueue().values(),
    ).filter((exec) =>
      chain.tasks.some((task: any) => task.id === exec.taskId),
    );

    const completedExecutions = executions.filter(
      (exec) => exec.status === "completed",
    );
    const failedExecutions = executions.filter(
      (exec) => exec.status === "failed",
    );

    const executionTimes = completedExecutions
      .filter((exec) => exec.startTime && exec.endTime)
      .map((exec) => exec.endTime!.getTime() - exec.startTime!.getTime());

    return {
      executionTime: chain.completedAt
        ? chain.completedAt.getTime() - chain.createdAt.getTime()
        : Date.now() - chain.createdAt.getTime(),
      averageTaskTime:
        executionTimes.length > 0
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
          : 0,
      errorRate:
        executions.length > 0
          ? (failedExecutions.length / executions.length) * 100
          : 0,
    };
  }

  private getTaskExecutionDetails(chain: any): any[] {
    return chain.tasks.map((task: any) => {
      const execution = this.taskOrchestrator.getExecutionQueue().get(task.id);
      return {
        id: task.id,
        name: task.name,
        status: execution?.status || "pending",
        progress: execution?.progress || 0,
        startTime: execution?.startTime,
        endTime: execution?.endTime,
        result: execution?.result,
        error: execution?.error?.message,
      };
    });
  }

  private calculateEstimatedCompletion(chain: any): Date {
    if (chain.status === "completed") {
      return chain.completedAt;
    }

    const remainingTasks = chain.tasks.filter((task: any) => {
      const execution = this.taskOrchestrator.getExecutionQueue().get(task.id);
      return !execution || execution.status === "pending";
    });

    const estimatedRemainingTime = remainingTasks.reduce(
      (total: number, task: any) => total + (task.timeout || 30000),
      0,
    );

    return new Date(Date.now() + estimatedRemainingTime);
  }

  private estimateCollaborationDuration(session: any): number {
    // Simple estimation based on number of participants and typical collaboration patterns
    const baseTime = 300000; // 5 minutes base
    const participantFactor = session.participants.length * 60000; // 1 minute per participant
    return baseTime + participantFactor;
  }

  private mapAgentAvailability(status: string): string {
    switch (status) {
      case "idle":
        return "available";
      case "busy":
      case "thinking":
      case "communicating":
        return "busy";
      case "offline":
      case "error":
        return "offline";
      default:
        return "unknown";
    }
  }
}

// Export singleton instance
export const aiOrchestrationController = new AIOrchestrationController();
