import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

export enum AgentType {
  CODE_ASSISTANT = "code-assistant",
  PORTFOLIO_ANALYST = "portfolio-analyst",
  PROJECT_MANAGER = "project-manager",
  DATA_ANALYST = "data-analyst",
  DOCUMENTATION_WRITER = "documentation-writer",
  SECURITY_AUDITOR = "security-auditor",
  PERFORMANCE_OPTIMIZER = "performance-optimizer",
  TEST_ENGINEER = "test-engineer",
}

export enum AgentStatus {
  IDLE = "idle",
  BUSY = "busy",
  THINKING = "thinking",
  COMMUNICATING = "communicating",
  ERROR = "error",
  OFFLINE = "offline",
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  capabilities: string[];
  status: AgentStatus;
  workload: number;
  performance: AgentPerformance;
  preferences: AgentPreferences;
  currentTask?: string;
  messageQueue: AgentMessage[];
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  specializations: string[];
  reputation: number;
}

export interface AgentPreferences {
  preferredTaskTypes: string[];
  maxConcurrentTasks: number;
  communicationStyle: "verbose" | "concise" | "technical";
  collaborationPreference: "solo" | "pair" | "team";
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: "request" | "response" | "notification" | "collaboration";
  content: any;
  timestamp: Date;
  priority: number;
  requiresResponse: boolean;
}

export interface CollaborationSession {
  id: string;
  goal: string;
  participants: string[];
  coordinator: string;
  status: "planning" | "executing" | "reviewing" | "completed";
  tasks: CollaborativeTask[];
  decisions: Decision[];
  results: any[];
  startTime: Date;
  endTime?: Date;
}

export interface CollaborativeTask {
  id: string;
  description: string;
  assignedAgents: string[];
  requiredCapabilities: string[];
  status: TaskStatus;
  dependencies: string[];
  results?: any;
  consensusRequired: boolean;
  votingThreshold?: number;
}

export interface Decision {
  id: string;
  topic: string;
  options: DecisionOption[];
  votes: Map<string, string>;
  selectedOption?: string;
  timestamp: Date;
  rationale?: string;
}

export interface DecisionOption {
  id: string;
  description: string;
  proposedBy: string;
  pros: string[];
  cons: string[];
  confidence: number;
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  COMPLETED = "completed",
  FAILED = "failed",
}

export class MultiAgentCoordinatorService extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private messageRouter: MessageRouter;
  private consensusEngine: ConsensusEngine;
  private loadBalancer: LoadBalancer;
  private initialized: boolean = false;

  constructor() {
    super();
    this.messageRouter = new MessageRouter();
    this.consensusEngine = new ConsensusEngine();
    this.loadBalancer = new LoadBalancer();
    this.initializeAgents();
  }

  /**
   * Initialize default agents (with duplicate prevention)
   */
  private initializeAgents(): void {
    // Prevent duplicate initialization
    if (this.initialized) {
      logger.info('MultiAgentCoordinator already initialized, skipping...');
      return;
    }

    const agentConfigs = [
      {
        type: AgentType.CODE_ASSISTANT,
        name: "CodeMaster",
        capabilities: [
          "code-generation",
          "refactoring",
          "debugging",
          "optimization",
        ],
        preferences: {
          preferredTaskTypes: ["development", "refactoring"],
          maxConcurrentTasks: 3,
          communicationStyle: "technical" as const,
          collaborationPreference: "pair" as const,
        },
      },
      {
        type: AgentType.PORTFOLIO_ANALYST,
        name: "MarketSage",
        capabilities: [
          "market-analysis",
          "risk-assessment",
          "portfolio-optimization",
          "trading-strategy",
        ],
        preferences: {
          preferredTaskTypes: ["analysis", "trading"],
          maxConcurrentTasks: 2,
          communicationStyle: "concise" as const,
          collaborationPreference: "solo" as const,
        },
      },
      {
        type: AgentType.PROJECT_MANAGER,
        name: "TaskOrganizer",
        capabilities: [
          "planning",
          "scheduling",
          "resource-allocation",
          "progress-tracking",
        ],
        preferences: {
          preferredTaskTypes: ["planning", "coordination"],
          maxConcurrentTasks: 5,
          communicationStyle: "verbose" as const,
          collaborationPreference: "team" as const,
        },
      },
      {
        type: AgentType.DATA_ANALYST,
        name: "DataWizard",
        capabilities: [
          "data-processing",
          "pattern-recognition",
          "visualization",
          "reporting",
        ],
        preferences: {
          preferredTaskTypes: ["analysis", "reporting"],
          maxConcurrentTasks: 2,
          communicationStyle: "technical" as const,
          collaborationPreference: "solo" as const,
        },
      },
      {
        type: AgentType.TEST_ENGINEER,
        name: "QualityGuard",
        capabilities: [
          "test-generation",
          "test-execution",
          "bug-detection",
          "coverage-analysis",
        ],
        preferences: {
          preferredTaskTypes: ["testing", "validation"],
          maxConcurrentTasks: 4,
          communicationStyle: "concise" as const,
          collaborationPreference: "pair" as const,
        },
      },
    ];

    for (const config of agentConfigs) {
      this.registerAgent(config);
    }

    this.initialized = true;
    logger.info('MultiAgentCoordinator initialized successfully');
  }

  /**
   * Register a new agent
   */
  public registerAgent(config: {
    type: AgentType;
    name: string;
    capabilities: string[];
    preferences: AgentPreferences;
  }): Agent {
    const agent: Agent = {
      id: uuidv4(),
      type: config.type,
      name: config.name,
      capabilities: config.capabilities,
      status: AgentStatus.IDLE,
      workload: 0,
      performance: {
        tasksCompleted: 0,
        successRate: 1.0,
        averageResponseTime: 0,
        specializations: config.capabilities,
        reputation: 100,
      },
      preferences: config.preferences,
      messageQueue: [],
    };

    this.agents.set(agent.id, agent);
    logger.info(`Agent registered: ${agent.name} (${agent.type})`);
    this.emit("agent:registered", agent);

    return agent;
  }

  /**
   * Create a collaboration session for complex tasks
   */
  public async createCollaboration(
    goal: string,
    requiredCapabilities: string[],
  ): Promise<CollaborationSession> {
    logger.info(`Creating collaboration session for goal: ${goal}`);

    // Select suitable agents
    const selectedAgents =
      await this.selectAgentsForCollaboration(requiredCapabilities);

    if (selectedAgents.length === 0) {
      throw new Error("No suitable agents available for collaboration");
    }

    // Choose coordinator (agent with highest reputation)
    const coordinator = selectedAgents.reduce((best, agent) =>
      agent.performance.reputation > best.performance.reputation ? agent : best,
    );

    // Create session
    const session: CollaborationSession = {
      id: uuidv4(),
      goal,
      participants: selectedAgents.map((a) => a.id),
      coordinator: coordinator.id,
      status: "planning",
      tasks: [],
      decisions: [],
      results: [],
      startTime: new Date(),
    };

    this.collaborationSessions.set(session.id, session);
    this.emit("collaboration:created", session);

    // Notify agents
    await this.notifyAgentsOfCollaboration(selectedAgents, session);

    return session;
  }

  /**
   * Select agents for collaboration based on capabilities
   */
  private async selectAgentsForCollaboration(
    requiredCapabilities: string[],
  ): Promise<Agent[]> {
    const availableAgents = Array.from(this.agents.values()).filter(
      (agent) => agent.status !== AgentStatus.OFFLINE,
    );

    const selectedAgents: Agent[] = [];
    const capabilitiesCovered = new Set<string>();

    // Greedy selection: pick agents that cover most uncovered capabilities
    while (
      capabilitiesCovered.size < requiredCapabilities.length &&
      availableAgents.length > 0
    ) {
      let bestAgent: Agent | null = null;
      let bestCoverage = 0;

      for (const agent of availableAgents) {
        const newCapabilities = agent.capabilities.filter(
          (cap) =>
            requiredCapabilities.includes(cap) && !capabilitiesCovered.has(cap),
        );

        const coverage = newCapabilities.length;

        // Consider workload and performance
        const score =
          coverage * agent.performance.successRate * (1 - agent.workload / 100);

        if (score > bestCoverage) {
          bestAgent = agent;
          bestCoverage = score;
        }
      }

      if (bestAgent) {
        selectedAgents.push(bestAgent);
        bestAgent.capabilities.forEach((cap) => {
          if (requiredCapabilities.includes(cap)) {
            capabilitiesCovered.add(cap);
          }
        });
        availableAgents.splice(availableAgents.indexOf(bestAgent), 1);
      } else {
        break;
      }
    }

    return selectedAgents;
  }

  /**
   * Notify agents of new collaboration
   */
  private async notifyAgentsOfCollaboration(
    agents: Agent[],
    session: CollaborationSession,
  ): Promise<void> {
    const notifications = agents.map((agent) => {
      const message: AgentMessage = {
        id: uuidv4(),
        from: "coordinator",
        to: agent.id,
        type: "notification",
        content: {
          type: "collaboration-invitation",
          sessionId: session.id,
          goal: session.goal,
          role:
            agent.id === session.coordinator ? "coordinator" : "participant",
        },
        timestamp: new Date(),
        priority: 100,
        requiresResponse: true,
      };

      return this.sendMessage(message);
    });

    await Promise.all(notifications);
  }

  /**
   * Execute collaborative task
   */
  public async executeCollaborativeTask(
    sessionId: string,
    task: CollaborativeTask,
  ): Promise<any> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    logger.info(`Executing collaborative task: ${task.description}`);
    task.status = TaskStatus.IN_PROGRESS;

    // Assign task to agents
    const assignments = await this.assignTaskToAgents(task, session);

    // Execute task parts in parallel
    const results = await Promise.all(
      assignments.map((assignment) => this.executeAgentTask(assignment)),
    );

    // If consensus required, initiate voting
    if (task.consensusRequired) {
      const consensus = await this.achieveConsensus(session, task, results);
      task.results = consensus;
    } else {
      // Aggregate results
      task.results = this.aggregateResults(results);
    }

    task.status = TaskStatus.COMPLETED;
    this.emit("task:completed", { session, task });

    return task.results;
  }

  /**
   * Assign task to specific agents
   */
  private async assignTaskToAgents(
    task: CollaborativeTask,
    session: CollaborationSession,
  ): Promise<AgentAssignment[]> {
    const assignments: AgentAssignment[] = [];

    for (const agentId of task.assignedAgents) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      // Check agent availability and capabilities
      if (
        agent.status === AgentStatus.IDLE &&
        task.requiredCapabilities.some((cap) =>
          agent.capabilities.includes(cap),
        )
      ) {
        assignments.push({
          agentId: agent.id,
          taskId: task.id,
          subtask: this.createSubtask(task, agent),
          deadline: new Date(Date.now() + 300000), // 5 minutes
        });

        // Update agent status
        agent.status = AgentStatus.BUSY;
        agent.currentTask = task.id;
        agent.workload = Math.min(100, agent.workload + 20);
      }
    }

    return assignments;
  }

  /**
   * Create subtask for specific agent
   */
  private createSubtask(task: CollaborativeTask, agent: Agent): any {
    // Create agent-specific subtask based on capabilities
    const relevantCapabilities = agent.capabilities.filter((cap) =>
      task.requiredCapabilities.includes(cap),
    );

    return {
      id: `${task.id}-${agent.id}`,
      description: task.description,
      focusAreas: relevantCapabilities,
      agent: agent.name,
      type: agent.type,
    };
  }

  /**
   * Execute individual agent task
   */
  private async executeAgentTask(
    assignment: AgentAssignment,
  ): Promise<AgentResult> {
    const agent = this.agents.get(assignment.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${assignment.agentId}`);
    }

    const startTime = Date.now();

    try {
      // Simulate agent processing (in real implementation, this would call actual AI)
      agent.status = AgentStatus.THINKING;
      await this.simulateAgentProcessing(agent, assignment.subtask);

      const result = {
        agentId: agent.id,
        taskId: assignment.taskId,
        success: true,
        output: await this.generateAgentOutput(agent, assignment.subtask),
        confidence: 0.85 + Math.random() * 0.15,
        processingTime: Date.now() - startTime,
      };

      // Update agent performance
      agent.performance.tasksCompleted++;
      agent.performance.averageResponseTime =
        (agent.performance.averageResponseTime *
          (agent.performance.tasksCompleted - 1) +
          result.processingTime) /
        agent.performance.tasksCompleted;

      agent.status = AgentStatus.IDLE;
      agent.currentTask = undefined;
      agent.workload = Math.max(0, agent.workload - 20);

      return result;
    } catch (error: any) {
      agent.status = AgentStatus.ERROR;
      agent.performance.successRate *= 0.95; // Decrease success rate

      return {
        agentId: agent.id,
        taskId: assignment.taskId,
        success: false,
        error: error.message,
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Simulate agent processing
   */
  private async simulateAgentProcessing(
    agent: Agent,
    subtask: any,
  ): Promise<void> {
    // Simulate processing time based on agent type
    const processingTimes: Record<AgentType, number> = {
      [AgentType.CODE_ASSISTANT]: 2000,
      [AgentType.PORTFOLIO_ANALYST]: 1500,
      [AgentType.PROJECT_MANAGER]: 1000,
      [AgentType.DATA_ANALYST]: 2500,
      [AgentType.DOCUMENTATION_WRITER]: 1800,
      [AgentType.SECURITY_AUDITOR]: 3000,
      [AgentType.PERFORMANCE_OPTIMIZER]: 2200,
      [AgentType.TEST_ENGINEER]: 1600,
    };

    const baseTime = processingTimes[agent.type] || 2000;
    const variance = baseTime * 0.2;
    const actualTime = baseTime + (Math.random() - 0.5) * variance;

    await new Promise((resolve) => setTimeout(resolve, actualTime));
  }

  /**
   * Generate agent output based on type and task
   */
  private async generateAgentOutput(agent: Agent, subtask: any): Promise<any> {
    // In real implementation, this would call actual AI models
    const outputs: Record<AgentType, () => any> = {
      [AgentType.CODE_ASSISTANT]: () => ({
        code: `// Generated code for ${subtask.description}`,
        language: "typescript",
        complexity: "medium",
        linesOfCode: Math.floor(Math.random() * 100) + 20,
      }),
      [AgentType.PORTFOLIO_ANALYST]: () => ({
        analysis: `Market analysis for ${subtask.description}`,
        riskLevel: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
        recommendations: ["buy", "hold", "sell"][Math.floor(Math.random() * 3)],
        confidence: 0.7 + Math.random() * 0.3,
      }),
      [AgentType.PROJECT_MANAGER]: () => ({
        plan: `Project plan for ${subtask.description}`,
        estimatedDuration: Math.floor(Math.random() * 10) + 1,
        requiredResources: Math.floor(Math.random() * 5) + 1,
        milestones: Math.floor(Math.random() * 4) + 2,
      }),
      [AgentType.DATA_ANALYST]: () => ({
        insights: `Data insights for ${subtask.description}`,
        patterns: Math.floor(Math.random() * 5) + 1,
        anomalies: Math.floor(Math.random() * 3),
        dataQuality: 0.8 + Math.random() * 0.2,
      }),
      [AgentType.DOCUMENTATION_WRITER]: () => ({
        documentation: `Documentation for ${subtask.description}`,
        sections: Math.floor(Math.random() * 6) + 3,
        wordCount: Math.floor(Math.random() * 1000) + 500,
        readabilityScore: 0.7 + Math.random() * 0.3,
      }),
      [AgentType.SECURITY_AUDITOR]: () => ({
        report: `Security audit for ${subtask.description}`,
        vulnerabilities: Math.floor(Math.random() * 5),
        severity: ["low", "medium", "high", "critical"][
          Math.floor(Math.random() * 4)
        ],
        recommendations: Math.floor(Math.random() * 8) + 2,
      }),
      [AgentType.PERFORMANCE_OPTIMIZER]: () => ({
        optimization: `Performance optimization for ${subtask.description}`,
        improvements: Math.floor(Math.random() * 10) + 5,
        performanceGain: `${Math.floor(Math.random() * 50) + 10}%`,
        memoryReduction: `${Math.floor(Math.random() * 30) + 5}%`,
      }),
      [AgentType.TEST_ENGINEER]: () => ({
        testResults: `Test results for ${subtask.description}`,
        testsRun: Math.floor(Math.random() * 50) + 20,
        passed: Math.floor(Math.random() * 40) + 15,
        coverage: `${Math.floor(Math.random() * 30) + 70}%`,
      }),
    };

    const generator = outputs[agent.type];
    return generator ? generator() : { result: "Generic output" };
  }

  /**
   * Achieve consensus among agents
   */
  private async achieveConsensus(
    session: CollaborationSession,
    task: CollaborativeTask,
    results: AgentResult[],
  ): Promise<any> {
    logger.info(`Achieving consensus for task: ${task.id}`);

    // Create decision for consensus
    const decision: Decision = {
      id: uuidv4(),
      topic: `Consensus for ${task.description}`,
      options: results.map((r) => ({
        id: r.agentId,
        description: JSON.stringify(r.output),
        proposedBy: r.agentId,
        pros: [`Confidence: ${r.confidence}`],
        cons: [],
        confidence: r.confidence,
      })),
      votes: new Map(),
      timestamp: new Date(),
    };

    // Collect votes from agents
    for (const agentId of session.participants) {
      const vote = await this.collectAgentVote(agentId, decision);
      decision.votes.set(agentId, vote);
    }

    // Determine consensus
    const consensus = this.consensusEngine.determineConsensus(
      decision,
      task.votingThreshold || 0.6,
    );

    decision.selectedOption = consensus.selectedOption;
    decision.rationale = consensus.rationale;

    session.decisions.push(decision);
    this.emit("consensus:achieved", { session, decision });

    return consensus.result;
  }

  /**
   * Collect vote from an agent
   */
  private async collectAgentVote(
    agentId: string,
    decision: Decision,
  ): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) return decision.options[0].id;

    // Simulate agent voting based on confidence and preferences
    const weightedOptions = decision.options.map((option) => ({
      id: option.id,
      weight: option.confidence * (Math.random() * 0.4 + 0.8), // Add some randomness
    }));

    weightedOptions.sort((a, b) => b.weight - a.weight);
    return weightedOptions[0].id;
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(results: AgentResult[]): any {
    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return {
        error: "All agents failed",
        details: results.map((r) => r.error),
      };
    }

    // Simple aggregation - in real implementation, this would be more sophisticated
    return {
      aggregated: true,
      results: successfulResults.map((r) => r.output),
      confidence:
        successfulResults.reduce((sum, r) => sum + r.confidence, 0) /
        successfulResults.length,
      agentCount: successfulResults.length,
    };
  }

  /**
   * Send message between agents
   */
  public async sendMessage(message: AgentMessage): Promise<void> {
    const recipient = this.agents.get(message.to);
    if (recipient) {
      recipient.messageQueue.push(message);
      this.emit("message:sent", message);

      // Process message if agent is idle
      if (recipient.status === AgentStatus.IDLE) {
        await this.processAgentMessages(recipient);
      }
    }
  }

  /**
   * Process queued messages for an agent
   */
  private async processAgentMessages(agent: Agent): Promise<void> {
    while (agent.messageQueue.length > 0 && agent.status === AgentStatus.IDLE) {
      const message = agent.messageQueue.shift();
      if (!message) continue;

      agent.status = AgentStatus.COMMUNICATING;

      // Process message based on type
      if (message.requiresResponse) {
        const response = await this.generateAgentResponse(agent, message);
        await this.sendMessage(response);
      }

      agent.status = AgentStatus.IDLE;
    }
  }

  /**
   * Generate agent response to message
   */
  private async generateAgentResponse(
    agent: Agent,
    message: AgentMessage,
  ): Promise<AgentMessage> {
    return {
      id: uuidv4(),
      from: agent.id,
      to: message.from,
      type: "response",
      content: {
        originalMessage: message.id,
        response: `${agent.name} acknowledges: ${message.content}`,
      },
      timestamp: new Date(),
      priority: message.priority,
      requiresResponse: false,
    };
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get collaboration session
   */
  public getCollaborationSession(
    sessionId: string,
  ): CollaborationSession | undefined {
    return this.collaborationSessions.get(sessionId);
  }

  /**
   * Update agent status
   */
  public updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit("agent:status-changed", { agent, status });
    }
  }

  /**
   * Create collaboration session (API endpoint alias)
   */
  public async createCollaborationSession(
    goal: string,
    requiredCapabilities: string[],
    options: any = {},
  ): Promise<CollaborationSession> {
    return this.createCollaboration(goal, requiredCapabilities);
  }

  /**
   * Get available agents (API endpoint)
   */
  public getAvailableAgents(): Agent[] {
    return this.getAllAgents().filter(
      (agent) => agent.status === AgentStatus.IDLE || agent.workload < 80,
    );
  }

  /**
   * Get all capabilities across agents (API endpoint)
   */
  public getAllCapabilities(): string[] {
    const capabilities = new Set<string>();
    for (const agent of this.agents.values()) {
      agent.capabilities.forEach((cap) => capabilities.add(cap));
    }
    return Array.from(capabilities).sort();
  }

  /**
   * Get recommended agent combinations (API endpoint)
   */
  public getRecommendedCombinations(): Array<{
    purpose: string;
    agents: string[];
    coverage: number;
  }> {
    const combinations = [
      {
        purpose: "Full-stack development",
        agents: ["code-assistant", "test-engineer", "documentation-writer"],
        coverage: 85,
      },
      {
        purpose: "Portfolio analysis",
        agents: ["portfolio-analyst", "data-analyst", "performance-optimizer"],
        coverage: 90,
      },
      {
        purpose: "Security audit",
        agents: ["security-auditor", "code-assistant", "test-engineer"],
        coverage: 80,
      },
      {
        purpose: "Project management",
        agents: ["project-manager", "data-analyst", "performance-optimizer"],
        coverage: 75,
      },
    ];

    // Filter combinations based on available agents
    return combinations.filter((combo) =>
      combo.agents.every((agentType) =>
        this.getAllAgents().some(
          (agent) => agent.type.toString() === agentType,
        ),
      ),
    );
  }

  /**
   * Assign task to collaboration session (API endpoint)
   */
  public async assignTask(sessionId: string, task: any): Promise<void> {
    const session = this.getCollaborationSession(sessionId);
    if (!session) {
      throw new Error(`Collaboration session not found: ${sessionId}`);
    }

    const collaborativeTask: CollaborativeTask = {
      id: uuidv4(),
      description: task.description,
      assignedAgents: task.assignedAgents || session.participants.slice(0, 2),
      requiredCapabilities: task.requiredCapabilities || [],
      status: "pending" as any, // Will be defined in the TaskStatus enum
      dependencies: [],
      consensusRequired: task.consensusRequired || false,
      votingThreshold: task.votingThreshold || 0.6,
    };

    session.tasks.push(collaborativeTask);

    // Notify assigned agents
    for (const agentId of collaborativeTask.assignedAgents) {
      const agent = this.getAgent(agentId);
      if (agent) {
        await this.sendMessage({
          id: uuidv4(),
          from: "system",
          to: agentId,
          type: "request",
          content: {
            sessionId,
            task: collaborativeTask,
          },
          timestamp: new Date(),
          priority: 50,
          requiresResponse: true,
        });
      }
    }

    logger.info(`Task assigned to session ${sessionId}: ${task.description}`);
  }
}

// Supporting classes

class MessageRouter {
  public route(message: AgentMessage, agents: Map<string, Agent>): void {
    const recipient = agents.get(message.to);
    if (recipient) {
      recipient.messageQueue.push(message);
    }
  }
}

class ConsensusEngine {
  public determineConsensus(
    decision: Decision,
    threshold: number,
  ): { selectedOption: string; rationale: string; result: any } {
    const voteCounts = new Map<string, number>();

    for (const vote of decision.votes.values()) {
      voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
    }

    const totalVotes = decision.votes.size;
    let selectedOption = "";
    let maxVotes = 0;

    for (const [option, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        selectedOption = option;
      }
    }

    const consensusRatio = maxVotes / totalVotes;
    const consensusAchieved = consensusRatio >= threshold;

    const selectedOptionData = decision.options.find(
      (o) => o.id === selectedOption,
    );

    return {
      selectedOption,
      rationale: consensusAchieved
        ? `Consensus achieved with ${(consensusRatio * 100).toFixed(1)}% agreement`
        : `No clear consensus (${(consensusRatio * 100).toFixed(1)}% agreement)`,
      result: selectedOptionData
        ? JSON.parse(selectedOptionData.description)
        : null,
    };
  }
}

class LoadBalancer {
  public selectAgent(
    agents: Agent[],
    requiredCapabilities: string[],
  ): Agent | null {
    const eligibleAgents = agents.filter(
      (agent) =>
        agent.status === AgentStatus.IDLE &&
        requiredCapabilities.some((cap) => agent.capabilities.includes(cap)),
    );

    if (eligibleAgents.length === 0) return null;

    // Select agent with lowest workload
    return eligibleAgents.reduce((best, agent) =>
      agent.workload < best.workload ? agent : best,
    );
  }
}

// Supporting interfaces

interface AgentAssignment {
  agentId: string;
  taskId: string;
  subtask: any;
  deadline: Date;
}

interface AgentResult {
  agentId: string;
  taskId: string;
  success: boolean;
  output?: any;
  error?: string;
  confidence: number;
  processingTime: number;
}

// Export singleton instance
export const multiAgentCoordinator = new MultiAgentCoordinatorService();
