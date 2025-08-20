import { Router, Request, Response } from 'express';
import { TestRunnerService } from '../services/test-runner.service';
import { getTestSuite, getAllSuites } from '../config/suites';
import { getWhitelist } from '../config/whitelist';
import { logger } from '../utils/logger';

export const testController = Router();
const testRunner = new TestRunnerService();

// Run test suite
testController.post('/run', async (req: Request, res: Response) => {
  try {
    const { suite, options = {} } = req.body;
    
    if (!suite) {
      return res.status(400).json({
        success: false,
        error: 'Test suite name is required'
      });
    }
    
    const testSuite = getTestSuite(suite);
    if (!testSuite) {
      return res.status(404).json({
        success: false,
        error: `Test suite '${suite}' not found`,
        availableSuites: getAllSuites()
      });
    }
    
    const testId = await testRunner.runSuite(testSuite, options);
    
    res.json({
      success: true,
      data: {
        testId,
        suite: suite,
        status: 'running',
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error running test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run test suite'
    });
  }
  return;
});

// Get test results
testController.get('/results', async (req: Request, res: Response) => {
  try {
    const { testId, limit = 10 } = req.query;
    
    const results = await testRunner.getResults(
      testId as string | undefined,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error getting test results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test results'
    });
  }
});

// Get whitelist
testController.get('/whitelist', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getWhitelist()
  });
});

// Get available test suites
testController.get('/suites', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getAllSuites()
  });
});