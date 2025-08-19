// Simple test to check if services can be instantiated
console.log("Testing AI services instantiation...");

try {
  // Test basic imports
  console.log("1. Testing service imports...");

  const {
    TaskOrchestratorService,
  } = require("./dist/services/ai-orchestration/task-orchestrator.service.js");
  console.log("✓ TaskOrchestratorService imported");

  const {
    TaskPlannerService,
  } = require("./dist/services/ai-orchestration/task-planner.service.js");
  console.log("✓ TaskPlannerService imported");

  const {
    MultiAgentCoordinatorService,
  } = require("./dist/services/ai-orchestration/multi-agent-coordinator.service.js");
  console.log("✓ MultiAgentCoordinatorService imported");

  // Test controller import
  const {
    AIOrchestrationController,
  } = require("./dist/controllers/ai-orchestration.controller.js");
  console.log("✓ AIOrchestrationController imported");

  // Test instantiation
  console.log("\n2. Testing service instantiation...");

  const taskOrchestrator = new TaskOrchestratorService();
  console.log("✓ TaskOrchestratorService instantiated");

  const taskPlanner = new TaskPlannerService();
  console.log("✓ TaskPlannerService instantiated");

  const multiAgent = new MultiAgentCoordinatorService();
  console.log("✓ MultiAgentCoordinatorService instantiated");

  const controller = new AIOrchestrationController();
  console.log("✓ AIOrchestrationController instantiated");

  console.log("\n✅ All services successfully instantiated!");
} catch (error) {
  console.error("❌ Error testing services:", error.message);
  console.error("Stack:", error.stack);
}
