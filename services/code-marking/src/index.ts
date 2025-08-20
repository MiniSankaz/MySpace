/**
 * Code Marking Service
 * Multi-agent code analysis and refactoring with comprehensive indexing
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { logger } from './utils/logger';
import { setupRoutes } from './routes';
import { CodeIndexService } from './services/code-index.service';
import { AgentCoordinatorService } from './services/agent-coordinator.service';
import { MarkingEngineService } from './services/marking-engine.service';
import { RefactoringService } from './services/refactoring.service';
import { PatternDetectorService } from './services/pattern-detector.service';
import { FileWatcherService } from './services/file-watcher.service';
import { QueueService } from './services/queue.service';
import { prisma } from './utils/prisma';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'code-marking',
    port: config.port,
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Initialize services
let codeIndexService: CodeIndexService;
let agentCoordinator: AgentCoordinatorService;
let markingEngine: MarkingEngineService;
let refactoringService: RefactoringService;
let patternDetector: PatternDetectorService;
let fileWatcher: FileWatcherService;
let queueService: QueueService;

async function initializeServices() {
  try {
    logger.info('Initializing Code Marking Service...');
    
    // Initialize database
    await prisma.$connect();
    logger.info('Database connected');
    
    // Initialize queue service
    queueService = new QueueService();
    await queueService.initialize();
    
    // Initialize core services
    codeIndexService = new CodeIndexService(prisma, queueService);
    patternDetector = new PatternDetectorService(prisma);
    markingEngine = new MarkingEngineService(prisma, patternDetector);
    agentCoordinator = new AgentCoordinatorService(config.aiOrchestratorUrl);
    refactoringService = new RefactoringService(prisma, agentCoordinator);
    
    // Initialize file watcher for incremental updates
    fileWatcher = new FileWatcherService(codeIndexService, markingEngine);
    
    // Setup WebSocket handling
    wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });
      
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });
    
    // Setup routes
    setupRoutes(app, {
      codeIndexService,
      agentCoordinator,
      markingEngine,
      refactoringService,
      patternDetector,
      queueService
    });
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// WebSocket message handler
async function handleWebSocketMessage(ws: any, data: any) {
  const { type, payload } = data;
  
  switch (type) {
    case 'subscribe':
      // Subscribe to real-time updates
      const { channel } = payload;
      if (channel === 'analysis') {
        markingEngine.on('marking:added', (marking) => {
          ws.send(JSON.stringify({
            type: 'marking',
            data: marking
          }));
        });
      }
      break;
      
    case 'index:status':
      // Get indexing status
      const status = await codeIndexService.getIndexingStatus();
      ws.send(JSON.stringify({
        type: 'index:status',
        data: status
      }));
      break;
      
    case 'agent:status':
      // Get agent status
      const agentStatus = agentCoordinator.getActiveAgents();
      ws.send(JSON.stringify({
        type: 'agent:status',
        data: agentStatus
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        error: `Unknown message type: ${type}`
      }));
  }
}

// Start server
async function start() {
  await initializeServices();
  
  server.listen(config.port, () => {
    logger.info(`Code Marking Service running on port ${config.port}`);
    logger.info(`WebSocket server available on ws://localhost:${config.port}`);
    logger.info(`AI Orchestrator: ${config.aiOrchestratorUrl}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Stop file watcher
  if (fileWatcher) {
    fileWatcher.stop();
  }
  
  // Close queue connections
  if (queueService) {
    await queueService.close();
  }
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the service
start().catch((error) => {
  logger.error('Failed to start service:', error);
  process.exit(1);
});

export {
  codeIndexService,
  agentCoordinator,
  markingEngine,
  refactoringService,
  patternDetector,
  queueService
};