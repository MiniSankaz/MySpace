import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { StockService } from "../services/stock.service";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();
const stockService = new StockService(prisma);

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

export default router;
