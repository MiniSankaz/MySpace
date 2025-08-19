import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { TradeService } from "../services/trade.service";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();
const tradeService = new TradeService(prisma);

// Execute a trade
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const trade = await tradeService.executeTrade(userId, req.body);

    res.status(201).json({
      success: true,
      data: trade,
    });
  } catch (error: any) {
    logger.error("Error executing trade:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get trade history
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const result = await tradeService.getTradeHistory(userId, req.query as any);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error("Error fetching trades:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get trade by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const trade = await tradeService.getTradeById(req.params.id, userId);

    res.json({
      success: true,
      data: trade,
    });
  } catch (error: any) {
    logger.error("Error fetching trade:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
