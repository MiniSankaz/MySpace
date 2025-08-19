import { Router, Request, Response } from 'express';
import { stockMasterService } from '../services/stock-master.service';
import { Market, Currency } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/stocks/search
 * Search stocks with filters
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      q: query,
      market,
      country,
      sector,
      currency,
      minMarketCap,
      maxMarketCap,
      isActive,
      limit = '50',
      offset = '0'
    } = req.query;

    // Validate market parameter
    if (market && !Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    // Validate currency parameter
    if (currency && !Object.values(Currency).includes(currency as Currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency parameter'
      });
    }

    const filters = {
      query: query as string,
      market: market as Market,
      country: country as string,
      sector: sector as string,
      currency: currency as Currency,
      minMarketCap: minMarketCap ? Number(minMarketCap) : undefined,
      maxMarketCap: maxMarketCap ? Number(maxMarketCap) : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      limit: Math.min(Number(limit), 100), // Max 100 results
      offset: Number(offset)
    };

    const result = await stockMasterService.searchStocks(filters);

    res.json({
      success: true,
      data: result.stocks,
      pagination: {
        total: result.total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: result.hasMore
      },
      filters: {
        query: filters.query,
        market: filters.market,
        country: filters.country,
        sector: filters.sector,
        currency: filters.currency
      }
    });
  } catch (error) {
    logger.error('Error searching stocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search stocks'
    });
  }
});

/**
 * GET /api/v1/stocks/suggestions
 * Get stock suggestions for autocomplete
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q: query, market, limit = '10' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Validate market parameter
    if (market && !Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const suggestions = await stockMasterService.getStockSuggestions(
      query as string,
      market as Market,
      Math.min(Number(limit), 20) // Max 20 suggestions
    );

    res.json({
      success: true,
      data: suggestions,
      meta: {
        query: query as string,
        market: market as Market,
        count: suggestions.length
      }
    });
  } catch (error) {
    logger.error('Error getting stock suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stock suggestions'
    });
  }
});

/**
 * GET /api/v1/stocks/:symbol
 * Get stock details by symbol (requires market parameter)
 */
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { market } = req.query;

    if (!market) {
      return res.status(400).json({
        success: false,
        error: 'Market parameter is required'
      });
    }

    if (!Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const stock = await stockMasterService.getStock(symbol.toUpperCase(), market as Market);

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: `Stock ${symbol} not found in ${market} market`
      });
    }

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    logger.error(`Error getting stock ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stock details'
    });
  }
});

/**
 * GET /api/v1/stocks/market/:market
 * Get stocks by market
 */
router.get('/market/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const { limit = '100' } = req.query;

    if (!Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const stocks = await stockMasterService.getStocksByMarket(
      market as Market,
      Math.min(Number(limit), 500) // Max 500 stocks
    );

    res.json({
      success: true,
      data: stocks,
      meta: {
        market: market as Market,
        count: stocks.length
      }
    });
  } catch (error) {
    logger.error(`Error getting stocks for market ${req.params.market}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stocks by market'
    });
  }
});

/**
 * GET /api/v1/stocks/popular/:market?
 * Get popular stocks (optionally by market)
 */
router.get('/popular/:market?', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const { limit = '10' } = req.query;

    // Validate market parameter if provided
    if (market && !Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const stocks = await stockMasterService.getPopularStocks(
      market as Market,
      Math.min(Number(limit), 50) // Max 50 popular stocks
    );

    res.json({
      success: true,
      data: stocks,
      meta: {
        market: market as Market || 'ALL',
        count: stocks.length,
        criteria: 'market_cap_desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting popular stocks:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular stocks'
    });
  }
});

/**
 * POST /api/v1/stocks/validate
 * Validate stock for trading
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { symbol, market } = req.body;

    if (!symbol || !market) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and market are required'
      });
    }

    if (!Object.values(Market).includes(market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const validation = await stockMasterService.validateStockForTrading(symbol, market);

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        market,
        valid: validation.valid,
        stock: validation.stock,
        errors: validation.errors,
        warnings: validation.warnings
      }
    });
  } catch (error) {
    logger.error('Error validating stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate stock'
    });
  }
});

/**
 * GET /api/v1/stocks/statistics/:market?
 * Get market statistics (optionally by market)
 */
router.get('/statistics/:market?', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;

    // Validate market parameter if provided
    if (market && !Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const stats = await stockMasterService.getMarketStatistics(market as Market);

    res.json({
      success: true,
      data: {
        market: market || 'ALL',
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting market statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market statistics'
    });
  }
});

/**
 * POST /api/v1/stocks/refresh-price/:symbol
 * Refresh stock price data from external APIs
 */
router.post('/refresh-price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { market } = req.body;

    if (!market) {
      return res.status(400).json({
        success: false,
        error: 'Market parameter is required'
      });
    }

    if (!Object.values(Market).includes(market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const updated = await stockMasterService.updateStockPriceData(symbol.toUpperCase(), market);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Failed to update price data for ${symbol} in ${market} market`
      });
    }

    // Get updated stock data
    const stock = await stockMasterService.getStock(symbol.toUpperCase(), market);

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        market,
        updated: true,
        stock,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error refreshing price for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh stock price data'
    });
  }
});

/**
 * GET /api/v1/stocks/sectors/:market?
 * Get available sectors (optionally by market)
 */
router.get('/sectors/:market?', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;

    // Validate market parameter if provided
    if (market && !Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market parameter'
      });
    }

    const stats = await stockMasterService.getMarketStatistics(market as Market);
    
    // Convert sectors object to array with counts
    const sectors = Object.entries(stats.sectors).map(([name, count]) => ({
      name,
      count,
      market: market || 'ALL'
    })).sort((a, b) => b.count - a.count); // Sort by count descending

    res.json({
      success: true,
      data: sectors,
      meta: {
        market: market || 'ALL',
        totalSectors: sectors.length,
        totalStocks: stats.totalStocks
      }
    });
  } catch (error) {
    logger.error('Error getting sectors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sectors'
    });
  }
});

export { router as stockMasterRoutes };