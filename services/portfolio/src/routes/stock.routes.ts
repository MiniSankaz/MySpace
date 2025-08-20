import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { StockService } from "../services/stock.service";
import { MarketDataService } from "../services/market-data.service";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();
const stockService = new StockService(prisma);
const marketDataService = new MarketDataService();

// Search stocks
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const stocks = await stockService.searchStocks(q as string);
    res.json({
      success: true,
      data: stocks,
    });
  } catch (error: any) {
    logger.error("Error searching stocks:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get trending stocks
router.get("/trending", async (req: Request, res: Response) => {
  try {
    const trending = await stockService.getTrendingStocks();
    res.json({
      success: true,
      data: trending,
    });
  } catch (error: any) {
    logger.error("Error fetching trending stocks:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get stock by symbol
router.get("/:symbol", async (req: Request, res: Response) => {
  try {
    const stock = await stockService.getStock(req.params.symbol.toUpperCase());
    res.json({
      success: true,
      data: stock,
    });
  } catch (error: any) {
    logger.error("Error fetching stock:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get stock price history
router.get("/:symbol/history", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await stockService.getStockHistory(
      req.params.symbol.toUpperCase(),
      days,
    );
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error("Error fetching stock history:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get current quote for a stock
router.get("/:symbol/quote", async (req: Request, res: Response) => {
  try {
    const quote = await marketDataService.getQuote(req.params.symbol.toUpperCase());
    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    logger.error("Error fetching stock quote:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get quotes for multiple stocks
router.get("/quotes", async (req: Request, res: Response) => {
  try {
    const symbols = (req.query.symbols as string)?.split(',').map(s => s.toUpperCase());
    if (!symbols || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Symbols parameter is required",
      });
    }
    
    const quotes = await marketDataService.getQuotes(symbols);
    res.json({
      success: true,
      data: quotes,
    });
  } catch (error: any) {
    logger.error("Error fetching stock quotes:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get cache statistics
router.get("/cache/stats", async (req: Request, res: Response) => {
  try {
    const stats = await marketDataService.getCacheStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error("Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Clear cache (admin endpoint)
router.delete("/cache/clear", async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    await marketDataService.clearCache(symbol);
    res.json({
      success: true,
      message: symbol ? `Cache cleared for ${symbol}` : "All cache cleared",
    });
  } catch (error: any) {
    logger.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
