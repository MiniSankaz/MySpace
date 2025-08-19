import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();

// Get positions for a portfolio
router.get("/portfolio/:portfolioId", async (req: Request, res: Response) => {
  try {
    const { portfolioId } = req.params;

    const positions = await prisma.portfolioPosition.findMany({
      where: { portfolioId },
      include: { stock: true },
    });

    // Sort by weight descending
    positions.sort((a, b) => (b.weight || 0) - (a.weight || 0));

    res.json({
      success: true,
      data: positions,
    });
  } catch (error: any) {
    logger.error("Error fetching positions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
