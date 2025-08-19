import { Request, Response } from 'express';
import { PolygonService } from '@services/polygon.service';
import { MockPolygonService } from '@services/mock-polygon.service';
import { CacheService } from '@services/cache.service';
import { PrismaClient } from '@prisma/client';
import logger from '@utils/logger';
import {
  QuoteData,
  QuoteResponse,
  BatchQuotesResponse
} from '../types/index';

export class QuoteController {
  private polygonService: PolygonService | MockPolygonService;
  private cacheService: CacheService;
  private prisma: PrismaClient;
  private isUsingMockService: boolean = false;

  constructor() {
    // Use mock service if Polygon API key is not configured
    const apiKey = process.env.POLYGON_API_KEY;
    if (apiKey && apiKey.length > 10) { // Basic validation
      try {
        this.polygonService = new PolygonService();
        logger.info('Using Polygon API Service');
      } catch (error) {
        logger.warn('Failed to initialize Polygon service, using mock:', error);
        this.polygonService = new MockPolygonService();
        this.isUsingMockService = true;
      }
    } else {
      logger.info('Using Mock Polygon Service (no valid API key)');
      this.polygonService = new MockPolygonService();
      this.isUsingMockService = true;
    }
    this.cacheService = new CacheService();
    this.prisma = new PrismaClient();
  }

  /**
   * Fallback to mock service if API fails
   */
  private async tryWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    if (this.isUsingMockService) {
      return fallbackOperation();
    }

    try {
      return await operation();
    } catch (error: any) {
      // Check if it's an authentication error or API failure
      if (error.response?.status === 401 || error.response?.status === 403 || error.code === 'ERR_BAD_REQUEST') {
        logger.warn('Polygon API authentication failed, falling back to mock service:', error.message);
        this.isUsingMockService = true;
        this.polygonService = new MockPolygonService();
        return fallbackOperation();
      }
      throw error;
    }
  }

  /**
   * Get single quote
   * GET /api/v1/market/quote/:symbol
   */
  async getQuote(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { symbol } = req.params;
    const userId = (req as any).user?.id;

    try {
      // Validate symbol
      if (!symbol || symbol.length < 1 || symbol.length > 10) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SYMBOL',
            message: 'Invalid symbol provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check cache first
      let quote = await this.cacheService.getQuote(symbol.toUpperCase());
      let cached = true;

      if (!quote) {
        // Fetch from Polygon API with fallback to mock
        cached = false;
        quote = await this.tryWithFallback(
          () => this.polygonService.getQuote(symbol.toUpperCase()),
          () => new MockPolygonService().getQuote(symbol.toUpperCase())
        );
        
        if (!quote) {
          res.status(404).json({
            success: false,
            error: {
              code: 'QUOTE_NOT_FOUND',
              message: `No quote data available for ${symbol}`,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        // Save to cache
        await this.cacheService.setQuote(symbol.toUpperCase(), quote);

        // Save to database for historical tracking
        try {
          await this.prisma.marketQuote.create({
            data: {
              symbol: quote.symbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              volume: quote.volume ? BigInt(quote.volume) : null,
              high: quote.high,
              low: quote.low,
              open: quote.open,
              previousClose: quote.previousClose,
              marketCap: quote.marketCap ? BigInt(quote.marketCap) : null,
              timestamp: new Date(quote.timestamp),
              source: 'polygon',
              delaySeconds: quote.delay
            }
          });
        } catch (dbError) {
          logger.error('Error saving quote to database:', dbError);
          // Continue - don't fail the request
        }
      }

      // Track API usage
      const responseTime = Date.now() - startTime;
      try {
        await this.prisma.apiUsageTracking.create({
          data: {
            userId,
            endpoint: '/api/v1/market/quote',
            method: 'GET',
            statusCode: 200,
            responseTime: responseTime,
            cacheHit: cached,
            apiCallsUsed: cached ? 0 : 1,
            rateLimitRemaining: this.polygonService.getRateLimitStatus().remaining
          }
        });
      } catch (trackError) {
        logger.error('Error tracking API usage:', trackError);
      }

      // Build response
      const rateLimitStatus = this.polygonService.getRateLimitStatus();
      const response: QuoteResponse = {
        success: true,
        data: quote,
        meta: {
          cached,
          cacheExpiry: cached ? new Date(Date.now() + 30000).toISOString() : undefined,
          apiCallsUsed: cached ? 0 : 1,
          rateLimit: {
            remaining: rateLimitStatus.remaining,
            reset: new Date(Date.now() + rateLimitStatus.resetIn * 1000).toISOString()
          },
          responseTime
        }
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error getting quote for ${symbol}:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quote data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get batch quotes
   * GET /api/v1/market/quotes
   */
  async getBatchQuotes(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { symbols } = req.query;
    const userId = (req as any).user?.id;

    try {
      // Parse and validate symbols
      const symbolList = typeof symbols === 'string' 
        ? symbols.split(',').map(s => s.trim().toUpperCase())
        : [];

      if (symbolList.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'No symbols provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (symbolList.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_SYMBOLS',
            message: 'Maximum 100 symbols allowed per request',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check cache for all symbols
      const cachedQuotes = await this.cacheService.getBatchQuotes(symbolList);
      const uncachedSymbols = symbolList.filter(symbol => !cachedQuotes.has(symbol));
      
      let apiCallsUsed = 0;
      const allQuotes: QuoteData[] = Array.from(cachedQuotes.values());

      // Fetch uncached symbols from Polygon with fallback
      if (uncachedSymbols.length > 0) {
        const freshQuotes = await this.tryWithFallback(
          () => this.polygonService.getBatchQuotes(uncachedSymbols),
          () => new MockPolygonService().getBatchQuotes(uncachedSymbols)
        );
        apiCallsUsed = uncachedSymbols.length;
        
        // Cache the fresh quotes
        if (freshQuotes.length > 0) {
          await this.cacheService.setBatchQuotes(freshQuotes);
          allQuotes.push(...freshQuotes);

          // Save to database
          for (const quote of freshQuotes) {
            try {
              await this.prisma.marketQuote.create({
                data: {
                  symbol: quote.symbol,
                  price: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  volume: quote.volume ? BigInt(quote.volume) : null,
                  high: quote.high,
                  low: quote.low,
                  open: quote.open,
                  previousClose: quote.previousClose,
                  marketCap: quote.marketCap ? BigInt(quote.marketCap) : null,
                  timestamp: new Date(quote.timestamp),
                  source: 'polygon',
                  delaySeconds: quote.delay
                }
              });
            } catch (dbError) {
              logger.error(`Error saving quote for ${quote.symbol}:`, dbError);
            }
          }
        }
      }

      // Track API usage
      const responseTime = Date.now() - startTime;
      try {
        await this.prisma.apiUsageTracking.create({
          data: {
            userId,
            endpoint: '/api/v1/market/quotes',
            method: 'GET',
            statusCode: 200,
            responseTime: responseTime,
            cacheHit: uncachedSymbols.length === 0,
            apiCallsUsed,
            rateLimitRemaining: this.polygonService.getRateLimitStatus().remaining
          }
        });
      } catch (trackError) {
        logger.error('Error tracking API usage:', trackError);
      }

      // Build response
      const rateLimitStatus = this.polygonService.getRateLimitStatus();
      const response: BatchQuotesResponse = {
        success: true,
        data: allQuotes,
        meta: {
          cached: uncachedSymbols.length === 0,
          apiCallsUsed,
          rateLimit: {
            remaining: rateLimitStatus.remaining,
            reset: new Date(Date.now() + rateLimitStatus.resetIn * 1000).toISOString()
          },
          responseTime
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting batch quotes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch batch quotes',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Clear quote cache
   * POST /api/v1/market/quotes/cache/clear
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.body;
      
      if (symbol) {
        await this.cacheService.clearCache(`market:quote:*${symbol}*`);
        res.json({
          success: true,
          message: `Cache cleared for ${symbol}`
        });
      } else {
        await this.cacheService.clearCache('market:quote:*');
        res.json({
          success: true,
          message: 'All quote cache cleared'
        });
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear cache',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}