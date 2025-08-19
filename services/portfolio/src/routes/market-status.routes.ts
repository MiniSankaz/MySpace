import { Router, Request, Response } from 'express';
import { marketDataService } from '../services/market-data.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/market/status
 * Get market data APIs status and statistics
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await marketDataService.getApiStatus();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        apis: status,
        recommendations: {
          primary: status.primary.available ? 'healthy' : 'degraded',
          yahoo: status.yahoo.available ? 'healthy' : 'degraded',
          overall: status.primary.available || status.yahoo.available ? 'operational' : 'down'
        }
      }
    });
  } catch (error) {
    logger.error('Error getting market data status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market data status'
    });
  }
});

/**
 * POST /api/v1/market/test/:provider
 * Test specific API provider
 */
router.post('/test/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { symbol = 'AAPL' } = req.body;
    
    if (!['primary', 'yahoo_finance', 'fallback'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Use: primary, yahoo_finance, or fallback'
      });
    }

    const startTime = Date.now();
    const quote = await marketDataService.forceApiProvider(provider as any, symbol);
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        provider,
        symbol,
        quote,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error testing ${req.params.provider} provider:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to test ${req.params.provider} provider: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * POST /api/v1/market/reset-failures
 * Reset API failure counts
 */
router.post('/reset-failures', async (req: Request, res: Response) => {
  try {
    marketDataService.resetFailureCounts();
    
    res.json({
      success: true,
      message: 'API failure counts have been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting failure counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset failure counts'
    });
  }
});

/**
 * GET /api/v1/market/health
 * Health check endpoint for both APIs
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [primaryHealth, yahooHealth] = await Promise.allSettled([
      marketDataService.isServiceAvailable(),
      marketDataService.isYahooFinanceAvailable()
    ]);

    const primary = primaryHealth.status === 'fulfilled' ? primaryHealth.value : false;
    const yahoo = yahooHealth.status === 'fulfilled' ? yahooHealth.value : false;

    const overallHealth = primary || yahoo;

    res.json({
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      apis: {
        primary: {
          status: primary ? 'healthy' : 'unhealthy',
          name: 'Portfolio Market Data Service'
        },
        yahoo: {
          status: yahoo ? 'healthy' : 'unhealthy',
          name: 'Yahoo Finance API'
        }
      },
      fallback: {
        status: 'healthy',
        name: 'Static Price Fallback'
      }
    });
  } catch (error) {
    logger.error('Error checking market data health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

export { router as marketStatusRoutes };