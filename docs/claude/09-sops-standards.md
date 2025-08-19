# SOPs & Standards

## Git Workflow

### Branch Strategy

- **Production**: `main`
- **Development**: `dev`
- **Features**: `feature/[name]`
- **Fixes**: `fix/[name]`
- **Docs**: `docs/[name]`

### Commit Convention (Conventional Commits)

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
perf: Improve performance
```

### Pull Request Process

1. Create PR from feature to dev
2. At least 1 code review required
3. All tests must pass
4. Update CLAUDE.md if needed
5. Squash merge preferred

## Code Standards

### TypeScript

- Strict mode enabled
- No any types
- Explicit return types
- Interface over type when possible

### File Organization

- Maximum 200 lines per file
- Maximum 50 lines per function
- Cyclomatic complexity < 10
- Single responsibility principle

### ESLint Rules

```json
{
  "no-console": "warn",
  "no-unused-vars": "error",
  "prefer-const": "error",
  "no-var": "error"
}
```

### Prettier Config

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## Testing Requirements

### Unit Tests

- Required for all utilities
- Minimum 80% coverage
- Use Jest and React Testing Library

### Integration Tests

- Required for API endpoints
- Test happy path and error cases
- Mock external dependencies

### E2E Tests

- Required for critical user flows
- Use Playwright or Cypress
- Run before deployment

## Security Standards

### Authentication

- Use JWT with refresh tokens
- Secure httpOnly cookies
- 15-minute access token expiry
- 7-day refresh token expiry

### Input Validation

- Validate all user inputs
- Use Zod for schema validation
- Sanitize before database storage
- Escape for HTML output

### API Security

- Rate limiting on all endpoints
- CORS configuration
- API versioning
- Request signing for sensitive ops

### Database Security

- Use Prisma parameterized queries
- No raw SQL queries
- Connection pooling
- SSL connections only

## Performance Standards

### Page Performance

- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Cumulative Layout Shift < 0.1
- Bundle size < 500KB initial

### API Performance

- Response time < 500ms
- Database query < 100ms
- WebSocket latency < 100ms
- Cache hit rate > 80%

### Optimization Techniques

- Code splitting
- Lazy loading
- Image optimization
- CDN usage
- Caching strategy

## Deployment Process

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables set
- [ ] Database migrations ready

### Deployment Steps

1. Build application
2. Run database migrations
3. Update environment variables
4. Deploy to staging
5. Smoke tests
6. Deploy to production
7. Monitor metrics

### Rollback Procedure

1. Identify issue
2. Revert to previous version
3. Restore database if needed
4. Notify team
5. Post-mortem analysis

## Monitoring & Alerts

### Metrics to Monitor

- CPU usage < 80%
- Memory usage < 90%
- Error rate < 1%
- Response time P95 < 1s
- Active users
- Database connections

### Alert Thresholds

- Critical: Service down
- High: Error rate > 5%
- Medium: Response time > 2s
- Low: CPU > 90% for 5 min

## Documentation Standards

### Code Comments

- JSDoc for public APIs
- Inline comments for complex logic
- TODO comments with ticket number
- No commented-out code

### README Requirements

- Project description
- Installation steps
- Configuration guide
- API documentation
- Troubleshooting section

### CLAUDE.md Updates

- Update after major changes
- Include in PR if relevant
- Keep work log current
- Document known issues

## Code Change Checklist ⚠️ CRITICAL

### Before Making Changes - Systematic Analysis

```bash
# 1. Find ALL related files
find . -name "*.js" -o -name "*.ts" | xargs grep -l "pattern_to_change"

# 2. Check for duplicate/similar code
grep -r "similar_function\|similar_class" src/

# 3. Identify all dependencies
grep -r "import.*filename" src/

# 4. List all WebSocket/Service files
ls -la src/server/websocket/*.js
ls -la src/services/*.ts
```

### During Changes - Complete Coverage

- [ ] Fixed primary file (from error log)
- [ ] Fixed ALL similar files (from search)
- [ ] Updated shared interfaces/types
- [ ] Updated imports if paths changed
- [ ] Checked frontend components using the API
- [ ] Verified WebSocket handlers (both system AND Claude)

### After Changes - Comprehensive Testing

- [ ] Test primary functionality
- [ ] Test ALL terminal types (system, Claude)
- [ ] Test edge cases (reconnection, multiple sessions)
- [ ] Check for console errors
- [ ] Verify no regression in other features
- [ ] Run build to catch TypeScript errors

### Common Pitfalls to Avoid

1. **Tunnel Vision**: Don't fix just the file showing errors
2. **Duplicate Code**: Always check for similar implementations
3. **Incomplete Testing**: Test ALL affected components, not just the obvious ones
4. **Missing Dependencies**: Update ALL files importing changed modules
5. **WebSocket Pairs**: terminal-ws-standalone.js AND claude-terminal-ws.js often need same fixes

## Terminal V2 Development Standards

### Clean Architecture Principles

- **Single Responsibility**: Each service has one clear purpose
- **Dependency Inversion**: Core services don't depend on external services
- **Interface Segregation**: Services expose only necessary methods
- **Open/Closed**: Open for extension, closed for modification

### Terminal V2 Service Guidelines

#### Session Manager Service

```typescript
// ✅ Good - Clear responsibility
class SessionManager {
  createSession(params: CreateSessionParams): TerminalSession;
  suspendProjectSessions(projectId: string): number;
  resumeProjectSessions(projectId: string): TerminalSession[];
}

// ❌ Bad - Mixed responsibilities
class SessionManager {
  createSession(params: CreateSessionParams): TerminalSession;
  writeToTerminal(data: string): void; // Stream Manager responsibility
  collectMetrics(): void; // Metrics Collector responsibility
}
```

#### Migration Service Best Practices

```typescript
// ✅ Good - Progressive migration
if (this.migrationService.shouldUseNewAPI("terminal-create")) {
  return await this.terminalOrchestrator.createSession(params);
} else {
  return await this.legacyAdapter.createSession(params);
}

// ❌ Bad - Hardcoded system choice
return await this.terminalOrchestrator.createSession(params); // No migration support
```

#### Error Handling Standards

```typescript
// ✅ Good - Circuit breaker pattern
try {
  const result = await operation();
  this.circuitBreaker.recordSuccess();
  return result;
} catch (error) {
  this.circuitBreaker.recordFailure();
  if (this.circuitBreaker.isOpen()) {
    throw new ServiceUnavailableError("Circuit breaker open");
  }
  throw error;
}
```

### Performance Requirements

#### Terminal V2 Specific

- Session creation: < 100ms
- WebSocket connection: < 50ms
- Memory per session: < 5MB
- CPU per 100 sessions: < 20%
- Cleanup time: < 10ms per session

#### Migration Performance

- Legacy to V2 conversion: < 200ms
- Progressive migration overhead: < 10%
- Feature flag check: < 1ms
- Rollback time: < 30 seconds

## Terminal V2 Testing Standards

### Unit Testing Requirements

```typescript
// ✅ Required tests for each service
describe("SessionManager", () => {
  test("creates session with valid parameters");
  test("suspends project sessions correctly");
  test("handles session limits");
  test("cleans up expired sessions");
  test("throws error on invalid input");
});
```

### Integration Testing

```bash
# Run Terminal V2 integration tests
npx tsx scripts/test-terminal-integration.ts

# Tests must cover:
# - Session creation and management
# - Project switching (suspend/resume)
# - Memory management and cleanup
# - Error handling and recovery
# - Migration service functionality
```

### Load Testing Requirements

```bash
# Performance benchmarks
NUM_PROJECTS=10 SESSIONS_PER_PROJECT=20 npx tsx scripts/load-test-terminal.ts

# Acceptance criteria:
# - Support 200+ concurrent sessions
# - < 50ms average latency
# - < 1% error rate
# - Memory growth < 10MB/hour
```

## Terminal V2 Code Change Checklist ⚠️ CRITICAL

### Before Making Terminal V2 Changes

```bash
# 1. Understand the clean architecture
ls -la src/services/terminal-v2/core/
ls -la src/services/terminal-v2/orchestrator/
ls -la src/services/terminal-v2/migration/

# 2. Check migration service impact
grep -r "migrationService|MigrationMode" src/

# 3. Verify service dependencies
grep -r "sessionManager|streamManager|metricsCollector" src/

# 4. Check configuration files
ls -la src/config/terminal*.ts
```

### During Terminal V2 Changes

- [ ] Maintain clean architecture boundaries
- [ ] Update migration service if needed
- [ ] Keep backward compatibility
- [ ] Follow single responsibility principle
- [ ] Update relevant configuration
- [ ] Add appropriate error handling
- [ ] Include circuit breaker pattern

### After Terminal V2 Changes

- [ ] Run integration tests: `npx tsx scripts/test-terminal-integration.ts`
- [ ] Run load tests: `npx tsx scripts/load-test-terminal.ts`
- [ ] Test all migration modes (legacy/dual/new/progressive)
- [ ] Verify health check endpoint works
- [ ] Check Prometheus metrics endpoint
- [ ] Test project switching scenarios
- [ ] Verify cleanup procedures work

### Terminal V2 Deployment Checklist

- [ ] Set appropriate migration mode
- [ ] Configure environment variables
- [ ] Test health check endpoint
- [ ] Verify WebSocket connections
- [ ] Monitor memory usage
- [ ] Check error rates
- [ ] Validate performance metrics

### Common Terminal V2 Pitfalls to Avoid

1. **Mixing Service Responsibilities**: Keep session, stream, and metrics concerns separate
2. **Bypassing Migration Service**: Always go through migration layer
3. **Ignoring Circuit Breakers**: Use resilience patterns for external dependencies
4. **Hard-coding Configuration**: Use configuration files for all settings
5. **Skipping Integration Tests**: Always run full test suite
6. **Missing Cleanup**: Ensure proper resource cleanup in all scenarios

## AI Integration Standards ⚠️ CRITICAL

### AI-Driven Task Orchestration Standards

#### Task Chain Architecture

```typescript
// ✅ Good - AI orchestrated task chain with error recovery
interface AITaskChain {
  id: string;
  tasks: AITask[];
  context: TaskContext;
  errorRecovery: ErrorRecoveryStrategy;
  timeout: number;
}

class AITaskOrchestrator {
  async executeChain(chain: AITaskChain): Promise<TaskChainResult> {
    const context = await this.buildContext(chain.context);

    for (const task of chain.tasks) {
      try {
        const result = await this.executeTask(task, context);
        context = this.updateContext(context, result);

        // AI decides next task based on result
        const nextTasks = await this.aiPlanner.planNext(task, result, context);
        if (nextTasks.length > 0) {
          chain.tasks.splice(chain.tasks.indexOf(task) + 1, 0, ...nextTasks);
        }
      } catch (error) {
        const recovery = await this.aiErrorHandler.suggest(error, context);
        if (recovery.shouldContinue) {
          context = recovery.updatedContext;
          continue;
        }
        throw new TaskChainError(`Failed at task ${task.id}`, error);
      }
    }
  }
}

// ❌ Bad - Manual task execution without AI orchestration
async function executeTasksManually() {
  // No AI planning or error recovery
  await task1();
  await task2();
  await task3();
}
```

#### Context Awareness Across Tasks

```typescript
// ✅ Good - Comprehensive context tracking
interface TaskContext {
  projectId: string;
  terminalSessions: TerminalSession[];
  portfolioData: Portfolio[];
  conversationHistory: Message[];
  userPreferences: UserPreferences;
  currentWorkspace: WorkspaceState;
  aiLearnings: AILearning[];
}

class ContextManager {
  async buildContext(baseContext: Partial<TaskContext>): Promise<TaskContext> {
    return {
      ...baseContext,
      aiLearnings: await this.aiMemory.getRelevantLearnings(baseContext),
      smartSuggestions: await this.aiPlanner.generateSuggestions(baseContext),
    };
  }

  updateContext(current: TaskContext, taskResult: TaskResult): TaskContext {
    return {
      ...current,
      aiLearnings: this.aiMemory.updateLearnings(
        current.aiLearnings,
        taskResult,
      ),
      lastTaskResults: [...(current.lastTaskResults || []), taskResult],
    };
  }
}
```

### Intelligent Code Assistance Standards

#### AI Pair Programming Requirements

```typescript
// ✅ Required - AI code assistance with real-time suggestions
interface AICodeAssistant {
  // Real-time code analysis and suggestions
  analyzeCode(code: string, context: CodeContext): Promise<CodeAnalysis>;

  // AI pair programming features
  suggestCompletions(
    partial: string,
    context: CodeContext,
  ): Promise<CodeCompletion[]>;
  generateCode(
    requirements: string,
    context: CodeContext,
  ): Promise<GeneratedCode>;
  refactorCode(code: string, intent: RefactorIntent): Promise<RefactoredCode>;

  // Intelligent bug detection and fixing
  detectBugs(code: string): Promise<BugReport[]>;
  suggestFix(bug: BugReport, context: CodeContext): Promise<BugFix[]>;
  autoFix(bugs: BugReport[], userApproval: boolean): Promise<FixedCode>;
}

class AICodeService implements AICodeAssistant {
  async analyzeCode(code: string, context: CodeContext): Promise<CodeAnalysis> {
    const analysis = await this.aiModel.analyze(code, {
      language: context.language,
      framework: context.framework,
      projectPatterns: context.projectPatterns,
      userCodingStyle: context.userCodingStyle,
    });

    // Store learning for future improvements
    await this.aiMemory.recordCodeAnalysis(analysis, context);

    return analysis;
  }

  async suggestCompletions(
    partial: string,
    context: CodeContext,
  ): Promise<CodeCompletion[]> {
    // Use project-specific patterns and user preferences
    const completions = await this.aiModel.complete(partial, {
      projectContext: context.projectFiles,
      userHistory: context.userCodingHistory,
      currentFile: context.currentFile,
      imports: context.imports,
    });

    // Rank by relevance and user patterns
    return this.rankCompletions(completions, context.userPreferences);
  }
}

// ❌ Bad - Basic code completion without AI intelligence
function simpleCodeCompletion(partial: string): string[] {
  // Just return static completions
  return ["function", "const", "let", "if"];
}
```

#### Automatic Refactoring Standards

```typescript
// ✅ Required - AI-powered refactoring with pattern recognition
interface AIRefactorEngine {
  detectRefactoringOpportunities(
    codebase: string[],
  ): Promise<RefactoringOpportunity[]>;
  performRefactoring(
    opportunity: RefactoringOpportunity,
    approval: UserApproval,
  ): Promise<RefactorResult>;
  validateRefactoring(result: RefactorResult): Promise<ValidationResult>;
}

class IntelligentRefactorService implements AIRefactorEngine {
  async detectRefactoringOpportunities(
    codebase: string[],
  ): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];

    // AI pattern recognition for common refactoring scenarios
    const patterns = await this.aiModel.analyzePatterns(codebase);

    for (const pattern of patterns) {
      if (pattern.type === "duplicate_code" && pattern.confidence > 0.8) {
        opportunities.push({
          type: "extract_function",
          description: "Duplicate code detected - extract to shared function",
          files: pattern.files,
          estimatedImpact: "high",
          autoApplicable: pattern.confidence > 0.9,
        });
      }
    }

    return opportunities;
  }
}
```

### Smart Project Management Standards

#### AI-Based Task Prioritization

```typescript
// ✅ Required - AI project management with intelligent prioritization
interface AIProjectManager {
  analyzeTasks(tasks: Task[], context: ProjectContext): Promise<TaskAnalysis>;
  prioritizeTasks(
    tasks: Task[],
    constraints: ProjectConstraints,
  ): Promise<PrioritizedTasks>;
  planProject(requirements: ProjectRequirements): Promise<ProjectPlan>;
  trackProgress(
    project: Project,
    updates: ProgressUpdate[],
  ): Promise<ProgressInsights>;
}

class SmartProjectManager implements AIProjectManager {
  async prioritizeTasks(
    tasks: Task[],
    constraints: ProjectConstraints,
  ): Promise<PrioritizedTasks> {
    // AI analyzes multiple factors for prioritization
    const analysis = await this.aiModel.analyzeTasks(tasks, {
      deadlines: constraints.deadlines,
      resources: constraints.resources,
      dependencies: constraints.dependencies,
      businessValue: constraints.businessValue,
      userFeedback: constraints.userFeedback,
      technicalDebt: constraints.technicalDebt,
    });

    const prioritized = await this.aiPlanner.optimizePriorities(analysis, {
      strategy: constraints.strategy, // 'deadline_first' | 'value_first' | 'risk_balanced'
      teamCapacity: constraints.teamCapacity,
      skillMatrix: constraints.skillMatrix,
    });

    return {
      tasks: prioritized.tasks,
      rationale: prioritized.explanation,
      suggestedMilestones: prioritized.milestones,
      riskAssessment: prioritized.risks,
    };
  }

  async planProject(requirements: ProjectRequirements): Promise<ProjectPlan> {
    // AI creates comprehensive project plan
    const plan = await this.aiPlanner.createPlan(requirements, {
      template: requirements.template,
      teamSkills: requirements.teamSkills,
      timeframe: requirements.timeframe,
      constraints: requirements.constraints,
    });

    // Include automatic optimization suggestions
    const optimizations = await this.aiOptimizer.suggestOptimizations(plan);

    return {
      ...plan,
      optimizations,
      confidenceScore: plan.confidenceScore,
      alternativePlans: plan.alternatives,
    };
  }
}
```

### Multi-Agent Collaboration Standards

#### Agent Communication Protocol

```typescript
// ✅ Required - Multi-agent coordination and collaboration
interface AIAgent {
  id: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  currentTasks: AgentTask[];

  // Inter-agent communication
  sendMessage(targetAgent: string, message: AgentMessage): Promise<void>;
  receiveMessage(message: AgentMessage): Promise<AgentResponse>;

  // Task delegation and coordination
  delegateTask(task: AgentTask, targetAgent: string): Promise<DelegationResult>;
  acceptTask(task: AgentTask): Promise<TaskAcceptance>;

  // Result sharing and validation
  shareResults(results: TaskResults): Promise<void>;
  validateResults(
    results: TaskResults,
    source: string,
  ): Promise<ValidationResult>;
}

class AIAgentOrchestrator {
  private agents: Map<string, AIAgent> = new Map();

  async coordinateAgents(task: ComplexTask): Promise<TaskResult> {
    // AI determines optimal agent assignment
    const assignment = await this.aiCoordinator.assignTasks(task, {
      availableAgents: Array.from(this.agents.values()),
      taskComplexity: task.complexity,
      requiredCapabilities: task.requirements,
    });

    // Execute with coordination
    const results = await Promise.all(
      assignment.map(async (agentTask) => {
        const agent = this.agents.get(agentTask.agentId);
        const result = await agent.executeTask(agentTask.task);

        // Cross-validate results with other agents
        const validation = await this.crossValidate(result, agentTask.task);

        return { ...result, validation };
      }),
    );

    // AI aggregates and reconciles results
    return await this.aiAggregator.reconcileResults(results, task);
  }

  private async crossValidate(
    result: TaskResult,
    task: AgentTask,
  ): Promise<ValidationResult> {
    const validators = this.agents
      .values()
      .filter(
        (agent) =>
          agent.capabilities.includes("validation") &&
          agent.id !== task.assignedAgent,
      );

    const validations = await Promise.all(
      validators.map((agent) =>
        agent.validateResults(result, task.assignedAgent),
      ),
    );

    return this.aiValidator.synthesizeValidations(validations);
  }
}
```

### Continuous Learning Standards

#### AI Performance Monitoring and Improvement

```typescript
// ✅ Required - Continuous learning and adaptation
interface AILearningSystem {
  recordInteraction(interaction: UserInteraction): Promise<void>;
  analyzePatterns(timeframe: TimeRange): Promise<PatternAnalysis>;
  updateModel(patterns: PatternAnalysis): Promise<ModelUpdate>;
  measureImprovement(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
  ): Promise<ImprovementReport>;
}

class ContinuousLearningService implements AILearningSystem {
  async recordInteraction(interaction: UserInteraction): Promise<void> {
    // Store user feedback and behavior patterns
    await this.interactionDB.store({
      ...interaction,
      timestamp: Date.now(),
      context: interaction.context,
      outcome: interaction.outcome,
      userSatisfaction: interaction.feedback?.satisfaction,
    });

    // Real-time pattern detection
    const patterns = await this.patternDetector.analyzeInteraction(interaction);
    if (patterns.length > 0) {
      await this.updateLearnings(patterns);
    }
  }

  async analyzePatterns(timeframe: TimeRange): Promise<PatternAnalysis> {
    const interactions = await this.interactionDB.getRange(timeframe);

    // AI identifies improvement opportunities
    const analysis = await this.aiAnalyzer.findPatterns(interactions, {
      categories: [
        "code_assistance",
        "task_orchestration",
        "project_management",
      ],
      successMetrics: ["task_completion", "user_satisfaction", "time_saved"],
      failurePatterns: ["timeout", "incorrect_suggestion", "user_rejection"],
    });

    return {
      improvementOpportunities: analysis.opportunities,
      performanceTrends: analysis.trends,
      userBehaviorInsights: analysis.insights,
      modelEffectiveness: analysis.effectiveness,
    };
  }

  async updateModel(patterns: PatternAnalysis): Promise<ModelUpdate> {
    // AI self-improvement based on patterns
    const updates = await this.modelUpdater.generateUpdates(patterns, {
      updateStrategy: "incremental", // 'incremental' | 'retrain' | 'fine_tune'
      validationRequired: true,
      rollbackPlan: true,
    });

    // Test updates in sandbox environment
    const validation = await this.validateUpdates(updates);

    if (validation.safe && validation.improvement > 0.05) {
      await this.deployUpdates(updates);
      return { success: true, improvement: validation.improvement };
    }

    return { success: false, reason: validation.failureReason };
  }
}
```

### AI Integration Testing Standards

#### Comprehensive AI Testing Requirements

```typescript
// ✅ Required - AI behavior validation and testing
interface AITestSuite {
  // Task orchestration tests
  testTaskChainExecution(chain: AITaskChain): Promise<TestResult>;
  testErrorRecovery(
    errorScenarios: ErrorScenario[],
  ): Promise<RecoveryTestResult>;

  // Code assistance tests
  testCodeGeneration(prompts: CodePrompt[]): Promise<CodeGenerationTestResult>;
  testRefactoringSuggestions(
    codebase: string[],
  ): Promise<RefactoringTestResult>;

  // Project management tests
  testTaskPrioritization(
    scenarios: PrioritizationScenario[],
  ): Promise<PrioritizationTestResult>;

  // Multi-agent tests
  testAgentCollaboration(
    collaborationScenarios: CollaborationScenario[],
  ): Promise<CollaborationTestResult>;

  // Learning system tests
  testLearningAdaptation(
    trainingData: TrainingData[],
  ): Promise<LearningTestResult>;
}

class AIIntegrationTester implements AITestSuite {
  async testTaskChainExecution(chain: AITaskChain): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const result = await this.aiOrchestrator.executeChain(chain);
      const endTime = Date.now();

      // Validate AI decision making
      const decisionQuality = await this.validateDecisions(result.decisions);

      return {
        success: true,
        executionTime: endTime - startTime,
        tasksCompleted: result.completedTasks.length,
        decisionQuality,
        adaptiveActions: result.adaptiveActions,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        failedAt: error.taskId,
        recoveryAttempts: error.recoveryAttempts,
      };
    }
  }
}
```

### AI Integration Performance Requirements

#### AI-Specific Performance Standards

- **Task Orchestration**: Decision making < 100ms, Chain execution varies by complexity
- **Code Assistance**: Suggestions < 200ms, Code generation < 2s
- **Project Planning**: Task prioritization < 500ms, Project plan generation < 5s
- **Multi-Agent Coordination**: Message passing < 50ms, Task delegation < 300ms
- **Learning Updates**: Pattern analysis < 1s, Model updates asynchronous
- **Context Awareness**: Context building < 150ms, Context updates < 50ms

#### AI Resource Management

```typescript
// ✅ Required - AI resource monitoring and limits
interface AIResourceManager {
  monitorUsage(): AIResourceUsage;
  setLimits(limits: AIResourceLimits): void;
  optimizePerformance(): Promise<OptimizationResult>;
}

interface AIResourceLimits {
  maxConcurrentTasks: number; // Default: 10
  maxContextSize: number; // Default: 32K tokens
  maxAgents: number; // Default: 5
  memoryLimit: number; // Default: 500MB
  apiCallsPerMinute: number; // Default: 100
  learningDataRetention: number; // Default: 90 days
}
```

### AI Integration Security Standards

#### AI-Specific Security Requirements

- **Context Isolation**: User contexts must be completely isolated
- **Learning Privacy**: No cross-user learning without explicit consent
- **Agent Authentication**: All agents must authenticate before communication
- **Model Integrity**: Regular validation of AI model responses
- **Data Sanitization**: All AI inputs/outputs must be sanitized
- **Audit Logging**: All AI decisions and actions must be logged

```typescript
// ✅ Required - AI security implementation
class AISecurityManager {
  async validateContext(
    context: TaskContext,
    userId: string,
  ): Promise<boolean> {
    // Ensure context belongs to user and contains no sensitive data
    return await this.contextValidator.validate(context, userId);
  }

  async sanitizeAIInput(input: string): Promise<string> {
    // Remove potential injection attacks and sensitive data
    return await this.sanitizer.clean(input, {
      removePersonalData: true,
      preventInjection: true,
      validateEncoding: true,
    });
  }

  async auditAIDecision(
    decision: AIDecision,
    context: TaskContext,
  ): Promise<void> {
    // Log all AI decisions for accountability
    await this.auditLogger.record({
      decision,
      context: this.sanitizeContext(context),
      timestamp: Date.now(),
      modelVersion: decision.modelVersion,
      confidence: decision.confidence,
    });
  }
}
```
