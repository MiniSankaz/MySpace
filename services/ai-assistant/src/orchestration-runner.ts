#!/usr/bin/env tsx
/**
 * AI Orchestration Runner - ระบบจัดการ AI Agents แบบ Parallel
 * ใช้งานจริงสำหรับ spawn multiple Claude instances
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { agentSpawner, AgentType, AgentTask } from './services/ai-orchestration/agent-spawner.service';
import { resourceLockManager, ResourceType } from './services/ai-orchestration/resource-lock-manager.service';
import { taskOrchestrator } from './services/ai-orchestration/task-orchestrator.service';
import { logger } from './utils/logger';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Initialize Express
const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:4100', 'http://localhost:4110'],
    credentials: true
  }
});

const PORT = process.env.ORCHESTRATION_PORT || 4190;

// Middleware
app.use(cors());
app.use(express.json());

// Store active sessions
const activeSessions = new Map<string, any>();

/**
 * REST API Endpoints
 */

// Health check
app.get('/health', (req, res) => {
  const metrics = agentSpawner.getMetrics();
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    agents: metrics,
    sessions: activeSessions.size
  });
});

// Spawn single agent
app.post('/api/spawn-agent', async (req, res) => {
  try {
    const { type, task, config } = req.body;
    
    if (!type || !task) {
      return res.status(400).json({ error: 'Missing type or task' });
    }

    const agentTask: AgentTask = {
      id: uuidv4(),
      description: task.description || 'AI Task',
      prompt: task.prompt,
      context: task.context || {},
      priority: task.priority || 50
    };

    const agentId = await agentSpawner.spawnAgent(
      type as AgentType,
      agentTask,
      config
    );

    res.json({
      success: true,
      agentId,
      task: agentTask
    });
  } catch (error: any) {
    logger.error('Failed to spawn agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Spawn multiple agents (parallel)
app.post('/api/spawn-parallel', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' });
    }

    const spawnPromises = tasks.map(async (taskDef: any) => {
      const agentTask: AgentTask = {
        id: uuidv4(),
        description: taskDef.description || 'AI Task',
        prompt: taskDef.prompt || '',
        context: taskDef.context || {},
        priority: taskDef.priority || 50
      };

      // Auto-determine agent type
      const agentType = determineAgentType(taskDef);
      
      try {
        const agentId = await agentSpawner.spawnAgent(agentType, agentTask);
        return {
          agentId,
          type: agentType,
          task: agentTask,
          success: true
        };
      } catch (error: any) {
        logger.error(`Failed to spawn agent for task ${agentTask.id}:`, error);
        return {
          agentId: null,
          type: agentType,
          task: agentTask,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(spawnPromises);

    res.json({
      success: true,
      agents: results,
      count: results.length
    });
  } catch (error: any) {
    logger.error('Failed to spawn parallel agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent status
app.get('/api/agents/:agentId', (req, res) => {
  const agent = agentSpawner.getAgentStatus(req.params.agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(agent);
});

// Get all agents
app.get('/api/agents', (req, res) => {
  const agents = agentSpawner.getAllAgents();
  res.json(agents);
});

// Terminate agent
app.delete('/api/agents/:agentId', (req, res) => {
  const success = agentSpawner.terminateAgent(req.params.agentId);
  res.json({ success });
});

// Clear completed/failed agents
app.post('/api/agents/clear', (req, res) => {
  try {
    const allAgents = agentSpawner.getAllAgents();
    let clearedCount = 0;
    
    allAgents.forEach(agent => {
      if (agent.status === 'completed' || agent.status === 'failed') {
        const success = agentSpawner.terminateAgent(agent.id);
        if (success) clearedCount++;
      }
    });
    
    res.json({ 
      success: true, 
      message: `Cleared ${clearedCount} completed/failed agents`,
      clearedCount 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create task chain
app.post('/api/task-chain', async (req, res) => {
  try {
    const { goals, context } = req.body;
    
    // TODO: Implement createTaskChain and executeChain methods
    logger.warn('Task chain functionality not yet fully implemented');
    
    // For now, create individual tasks
    const taskIds = goals.map((goal: any) => {
      return taskOrchestrator.addTask({
        name: goal.name || 'Task',
        type: goal.type || 'general',
        description: goal.description || '',
        priority: goal.priority || 50,
        context: goal.context || {}
      });
    });
    
    const chain = {
      id: uuidv4(),
      tasks: taskIds,
      status: 'created'
    };

    res.json({
      success: true,
      chainId: chain.id,
      tasks: taskIds.length,
      taskIds: taskIds,
      status: chain.status
    });
  } catch (error: any) {
    logger.error('Failed to create task chain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resource locks
app.get('/api/locks', async (req, res) => {
  try {
    const [metrics, activeLocks] = await Promise.all([
      resourceLockManager.getMetrics(),
      resourceLockManager.getActiveLocks()
    ]);
    res.json({
      ...metrics,
      activeLocks
    });
  } catch (error: any) {
    logger.error('Failed to get resource locks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acquire lock
app.post('/api/locks', async (req, res) => {
  try {
    const { resourceId, resourceType, ownerId, ttl } = req.body;
    
    const lock = await resourceLockManager.acquireLock({
      resourceId,
      resourceType: resourceType as ResourceType,
      ownerId,
      ttl
    });

    res.json({ success: !!lock, lock });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Release lock
app.delete('/api/locks/:lockId', async (req, res) => {
  const success = await resourceLockManager.releaseLock(req.params.lockId);
  res.json({ success });
});

/**
 * WebSocket Events
 */
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Subscribe to agent events
  const handleAgentOutput = (data: any) => {
    socket.emit('agent:output', data);
  };
  
  const handleAgentCompleted = (data: any) => {
    socket.emit('agent:completed', data);
  };
  
  const handleAgentError = (data: any) => {
    socket.emit('agent:error', data);
  };

  agentSpawner.on('agent:output', handleAgentOutput);
  agentSpawner.on('agent:completed', handleAgentCompleted);
  agentSpawner.on('agent:error', handleAgentError);

  // Handle client commands
  socket.on('spawn:agent', async (data) => {
    try {
      const agentId = await agentSpawner.spawnAgent(
        data.type,
        data.task,
        data.config
      );
      socket.emit('agent:spawned', { agentId });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('terminate:agent', (agentId) => {
    const success = agentSpawner.terminateAgent(agentId);
    socket.emit('agent:terminated', { agentId, success });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    agentSpawner.off('agent:output', handleAgentOutput);
    agentSpawner.off('agent:completed', handleAgentCompleted);
    agentSpawner.off('agent:error', handleAgentError);
  });
});

/**
 * Helper Functions
 */
function determineAgentType(task: any): AgentType {
  const keywords = (task.description + ' ' + task.prompt).toLowerCase();
  
  if (keywords.includes('requirement') || keywords.includes('analyze requirements')) {
    return AgentType.BUSINESS_ANALYST;
  }
  if (keywords.includes('review') || keywords.includes('code quality')) {
    return AgentType.CODE_REVIEWER;
  }
  if (keywords.includes('test') || keywords.includes('testing')) {
    return AgentType.TEST_RUNNER;
  }
  if (keywords.includes('architecture') || keywords.includes('design')) {
    return AgentType.TECHNICAL_ARCHITECT;
  }
  if (keywords.includes('plan') || keywords.includes('roadmap')) {
    return AgentType.DEVELOPMENT_PLANNER;
  }
  if (keywords.includes('sop') || keywords.includes('compliance')) {
    return AgentType.SOP_ENFORCER;
  }
  
  return AgentType.GENERAL_PURPOSE;
}

/**
 * Start Server
 */
server.listen(PORT, () => {
  logger.info(`🚀 AI Orchestration Runner started on port ${PORT}`);
  logger.info(`📊 Dashboard: http://localhost:${PORT}/health`);
  logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
  logger.info(`📝 API: http://localhost:${PORT}/api/*`);
  logger.info('Ready to spawn parallel AI agents!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  agentSpawner.terminateAllAgents();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  agentSpawner.terminateAllAgents();
  server.close();
  process.exit(0);
});