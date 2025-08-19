import { Router, Request, Response } from 'express';
import { Market, Currency, getMarketInfo, isMarketOpen } from '../types';
import { MarketValidationService } from '../services/market-validation.service';
import { marketDataService } from '../services/market-data.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/markets
 * Get list of supported markets
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const markets = MarketValidationService.getSupportedMarkets();
    
    // Add market status for each market
    const marketsWithStatus = markets.map(market => ({
      ...market,
      isOpen: isMarketOpen(market.code),
      hours: MarketValidationService.getMarketHours(market.code)
    }));

    res.json({
      success: true,
      data: marketsWithStatus,
      meta: {
        total: markets.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting markets list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get markets list'
    });
  }
});

/**
 * GET /api/v1/markets/:market
 * Get specific market information
 */
router.get('/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    
    if (!Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market code'
      });
    }

    const marketCode = market as Market;
    const info = getMarketInfo(marketCode);
    const hours = MarketValidationService.getMarketHours(marketCode);
    
    res.json({
      success: true,
      data: {
        code: marketCode,
        name: info.name,
        currency: info.currency,
        country: info.country,
        timezone: info.timezone,
        isOpen: hours.isOpen,
        hours: {
          open: hours.openTime,
          close: hours.closeTime,
          timezone: hours.timezone
        }
      }
    });
  } catch (error) {
    logger.error(`Error getting market info for ${req.params.market}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market information'
    });
  }
});

/**
 * GET /api/v1/markets/country/:countryCode
 * Get markets by country code
 */
router.get('/country/:countryCode', async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const markets = MarketValidationService.getMarketsByCountry(countryCode.toUpperCase());
    
    if (markets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No markets found for this country'
      });
    }

    const marketsInfo = markets.map(market => ({
      code: market,
      ...getMarketInfo(market),
      isOpen: isMarketOpen(market),
      isDefault: market === MarketValidationService.getDefaultMarketForCountry(countryCode.toUpperCase())
    }));

    res.json({
      success: true,
      data: marketsInfo,
      meta: {
        country: countryCode.toUpperCase(),
        total: markets.length
      }
    });
  } catch (error) {
    logger.error(`Error getting markets for country ${req.params.countryCode}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get markets for country'
    });
  }
});

/**
 * POST /api/v1/markets/validate-symbol
 * Validate stock symbol for specific market
 */
router.post('/validate-symbol', async (req: Request, res: Response) => {
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
        error: 'Invalid market code'
      });
    }

    const validation = MarketValidationService.validateSymbol(symbol, market);
    const formattedSymbol = MarketValidationService.formatSymbol(symbol, market);
    const yahooSymbol = MarketValidationService.getYahooSymbol(symbol, market);

    res.json({
      success: true,
      data: {
        originalSymbol: symbol,
        formattedSymbol,
        yahooSymbol,
        market,
        validation,
        marketInfo: {
          ...getMarketInfo(market),
          isOpen: isMarketOpen(market)
        }
      }
    });
  } catch (error) {
    logger.error('Error validating symbol:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate symbol'
    });
  }
});

/**
 * POST /api/v1/markets/validate-trade
 * Validate trade parameters for specific market
 */
router.post('/validate-trade', async (req: Request, res: Response) => {
  try {
    const { symbol, market, quantity, price } = req.body;
    
    if (!symbol || !market || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, market, quantity, and price are required'
      });
    }

    if (!Object.values(Market).includes(market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market code'
      });
    }

    const validation = MarketValidationService.validateTrade(
      symbol, 
      market, 
      Number(quantity), 
      Number(price)
    );

    res.json({
      success: true,
      data: {
        symbol,
        market,
        quantity: Number(quantity),
        price: Number(price),
        validation,
        formattedSymbol: MarketValidationService.formatSymbol(symbol, market),
        marketInfo: {
          ...getMarketInfo(market),
          isOpen: isMarketOpen(market)
        }
      }
    });
  } catch (error) {
    logger.error('Error validating trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate trade'
    });
  }
});

/**
 * GET /api/v1/markets/:market/quote/:symbol
 * Get quote for symbol in specific market
 */
router.get('/:market/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { market, symbol } = req.params;
    
    if (!Object.values(Market).includes(market as Market)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market code'
      });
    }

    const marketCode = market as Market;
    const yahooSymbol = MarketValidationService.getYahooSymbol(symbol, marketCode);
    
    // Try to get quote using the formatted symbol
    const quote = await marketDataService.getQuote(yahooSymbol);
    
    // Add market-specific information
    const enhancedQuote = {
      ...quote,
      market: marketCode,
      originalSymbol: symbol,
      yahooSymbol,
      marketInfo: {
        ...getMarketInfo(marketCode),
        isOpen: isMarketOpen(marketCode)
      }
    };

    res.json({
      success: true,
      data: enhancedQuote
    });
  } catch (error) {
    logger.error(`Error getting quote for ${req.params.symbol} in ${req.params.market}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market quote'
    });
  }
});

/**
 * GET /api/v1/markets/open-status
 * Get current open/close status of all markets
 */
router.get('/status/all', async (req: Request, res: Response) => {
  try {
    const allMarkets = MarketValidationService.getSupportedMarkets();
    
    const marketStatus = allMarkets.map(market => {
      const hours = MarketValidationService.getMarketHours(market.code);
      return {
        code: market.code,
        name: market.name,
        country: market.country,
        currency: market.currency,
        isOpen: hours.isOpen,
        timezone: hours.timezone,
        hours: {
          open: hours.openTime,
          close: hours.closeTime
        }
      };
    });

    const openMarkets = marketStatus.filter(m => m.isOpen).length;
    const closedMarkets = marketStatus.filter(m => !m.isOpen).length;

    res.json({
      success: true,
      data: marketStatus,
      summary: {
        total: marketStatus.length,
        open: openMarkets,
        closed: closedMarkets,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting market status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market status'
    });
  }
});

export { router as marketRoutes };