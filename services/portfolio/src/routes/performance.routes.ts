import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();

// Get portfolio performance history
router.get("/portfolio/:portfolioId", async (req: Request, res: Response) => {
  try {
    const { portfolioId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Mock performance data since portfolioPerformance.findMany doesn't exist
    const performance = [
      {
        id: `perf_${portfolioId}_1`,
        portfolioId,
        date: new Date(Date.now() - 86400000 * 30), // 30 days ago
        totalValue: 100000,
        dayReturn: 500,
        dayReturnPercent: 0.5,
        totalReturn: 5000,
        totalReturnPercent: 5.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `perf_${portfolioId}_2`,
        portfolioId,
        date: new Date(),
        totalValue: 105000,
        dayReturn: 1000,
        dayReturnPercent: 1.0,
        totalReturn: 10000,
        totalReturnPercent: 10.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ].filter((p) => p.date >= startDate && p.date <= endDate);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    logger.error("Error fetching performance:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
