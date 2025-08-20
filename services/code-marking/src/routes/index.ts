/**
 * API Routes for Code Marking Service
 */

import { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function setupRoutes(app: Express, services: any) {
  const {
    codeIndexService,
    agentCoordinator,
    markingEngine,
    refactoringService,
    patternDetector,
    queueService
  } = services;
  
  // Error handler wrapper
  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  // ==================== Indexing Routes ====================
  
  // Build full index
  app.post('/api/v1/index/build', asyncHandler(async (req: Request, res: Response) => {
    const options = req.body;
    await codeIndexService.buildIndex(options);
    res.json({ message: 'Indexing started', status: codeIndexService.getIndexingStatus() });
  }));
  
  // Get indexing status
  app.get('/api/v1/index/status', (req: Request, res: Response) => {
    res.json(codeIndexService.getIndexingStatus());
  });
  
  // Index single file
  app.post('/api/v1/index/file', asyncHandler(async (req: Request, res: Response) => {
    const { filePath, options } = req.body;
    await codeIndexService.indexFile(filePath, options);
    res.json({ message: 'File indexed successfully' });
  }));
  
  // Search files
  app.get('/api/v1/index/search', asyncHandler(async (req: Request, res: Response) => {
    const { pattern, language, limit } = req.query;
    const files = await codeIndexService.searchFiles(
      pattern as string,
      { language: language as string, limit: Number(limit) || 100 }
    );
    res.json(files);
  }));
  
  // Get metrics
  app.get('/api/v1/index/metrics', asyncHandler(async (req: Request, res: Response) => {
    const metrics = await codeIndexService.getMetrics();
    res.json(metrics);
  }));
  
  // ==================== Marking Routes ====================
  
  // Analyze file for markings
  app.post('/api/v1/markings/analyze', asyncHandler(async (req: Request, res: Response) => {
    const { fileId, options } = req.body;
    await markingEngine.analyzeFile(fileId, options);
    res.json({ message: 'Analysis completed' });
  }));
  
  // Get file markings
  app.get('/api/v1/markings/file/:fileId', asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const { severity, type, fixed } = req.query;
    
    const markings = await markingEngine.getFileMarkings(fileId, {
      severity: severity as any,
      type: type as any,
      fixed: fixed === 'true'
    });
    
    res.json(markings);
  }));
  
  // Get marking statistics
  app.get('/api/v1/markings/stats', asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.query;
    const stats = await markingEngine.getMarkingStats(fileId as string);
    res.json(stats);
  }));
  
  // ==================== Pattern Routes ====================
  
  // Detect patterns in file
  app.post('/api/v1/patterns/detect', asyncHandler(async (req: Request, res: Response) => {
    const { fileId, code, language } = req.body;
    const patterns = await patternDetector.detectPatterns(fileId, code, language);
    res.json(patterns);
  }));
  
  // Apply auto-fix
  app.post('/api/v1/patterns/autofix', asyncHandler(async (req: Request, res: Response) => {
    const { code, patternName } = req.body;
    const fixed = patternDetector.applyAutoFix(code, patternName);
    
    if (fixed) {
      res.json({ success: true, code: fixed });
    } else {
      res.status(400).json({ success: false, message: 'Auto-fix not available' });
    }
  }));
  
  // Get pattern statistics
  app.get('/api/v1/patterns/stats', asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.query;
    const stats = await patternDetector.getPatternStats(fileId as string);
    res.json(stats);
  }));
  
  // ==================== Refactoring Routes ====================
  
  // Create refactoring plan
  app.post('/api/v1/refactoring/plan', asyncHandler(async (req: Request, res: Response) => {
    const { fileId, markingIds } = req.body;
    const plan = await refactoringService.createRefactoringPlan(fileId, markingIds);
    res.json(plan);
  }));
  
  // Execute refactoring
  app.post('/api/v1/refactoring/:id/execute', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { autoApprove } = req.body;
    await refactoringService.executeRefactoring(id, autoApprove);
    res.json({ message: 'Refactoring executed' });
  }));
  
  // Apply refactoring
  app.post('/api/v1/refactoring/:id/apply', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await refactoringService.applyRefactoring(id);
    res.json({ message: 'Refactoring applied' });
  }));
  
  // Batch refactor
  app.post('/api/v1/refactoring/batch', asyncHandler(async (req: Request, res: Response) => {
    const { fileIds, type } = req.body;
    await refactoringService.batchRefactor(fileIds, type);
    res.json({ message: 'Batch refactoring started' });
  }));
  
  // Get refactoring statistics
  app.get('/api/v1/refactoring/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await refactoringService.getRefactoringStats();
    res.json(stats);
  }));
  
  // ==================== Agent Routes ====================
  
  // Spawn agent for task
  app.post('/api/v1/agents/spawn', asyncHandler(async (req: Request, res: Response) => {
    const task = req.body;
    const result = await agentCoordinator.spawnAgent(task);
    res.json(result);
  }));
  
  // Execute parallel tasks
  app.post('/api/v1/agents/parallel', asyncHandler(async (req: Request, res: Response) => {
    const { tasks } = req.body;
    const results = await agentCoordinator.executeParallelTasks(tasks);
    res.json(Array.from(results.entries()));
  }));
  
  // Execute analysis workflow
  app.post('/api/v1/agents/workflow', asyncHandler(async (req: Request, res: Response) => {
    const { filePath, analysisType } = req.body;
    const result = await agentCoordinator.executeAnalysisWorkflow(filePath, analysisType);
    res.json(result);
  }));
  
  // Get active agents
  app.get('/api/v1/agents/active', (req: Request, res: Response) => {
    res.json(agentCoordinator.getActiveAgents());
  });
  
  // Get queue status
  app.get('/api/v1/agents/queue', (req: Request, res: Response) => {
    res.json(agentCoordinator.getQueueStatus());
  });
  
  // Pause agent processing
  app.post('/api/v1/agents/pause', (req: Request, res: Response) => {
    agentCoordinator.pauseProcessing();
    res.json({ message: 'Agent processing paused' });
  });
  
  // Resume agent processing
  app.post('/api/v1/agents/resume', (req: Request, res: Response) => {
    agentCoordinator.resumeProcessing();
    res.json({ message: 'Agent processing resumed' });
  });
  
  // ==================== Queue Routes ====================
  
  // Get all queues status
  app.get('/api/v1/queues/status', asyncHandler(async (req: Request, res: Response) => {
    const status = await queueService.getAllQueuesStatus();
    res.json(status);
  }));
  
  // Get specific queue status
  app.get('/api/v1/queues/:name/status', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    const status = await queueService.getQueueStatus(name);
    res.json(status);
  }));
  
  // Pause queue
  app.post('/api/v1/queues/:name/pause', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    await queueService.pauseQueue(name);
    res.json({ message: `Queue ${name} paused` });
  }));
  
  // Resume queue
  app.post('/api/v1/queues/:name/resume', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    await queueService.resumeQueue(name);
    res.json({ message: `Queue ${name} resumed` });
  }));
  
  // Clean queue
  app.post('/api/v1/queues/:name/clean', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    const { grace } = req.body;
    await queueService.cleanQueue(name, grace);
    res.json({ message: `Queue ${name} cleaned` });
  }));
  
  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('API error:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
}