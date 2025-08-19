import { Router, Request, Response } from "express";
import { MockPrismaClient } from "../types/mock-db";
import { Parser } from "json2csv";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new MockPrismaClient();

// Export portfolio to CSV
router.get(
  "/portfolio/:portfolioId/csv",
  async (req: Request, res: Response) => {
    try {
      const { portfolioId } = req.params;

      const positions = await prisma.portfolioPosition.findMany({
        where: { portfolioId },
        include: { stock: true },
      });

      const fields = [
        "stockSymbol",
        "stock.name",
        "quantity",
        "averageCost",
        "currentPrice",
        "marketValue",
        "gainLoss",
        "gainLossPercent",
        "weight",
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(positions);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=portfolio_${portfolioId}.csv`,
      );
      res.send(csv);
    } catch (error: any) {
      logger.error("Error exporting to CSV:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// Export trades to CSV
router.get("/trades/csv", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";

    const trades = await prisma.trade.findMany({
      where: { userId },
      include: { stock: true, portfolio: true },
    });

    const fields = [
      "executedAt",
      "portfolio.name",
      "stockSymbol",
      "stock.name",
      "type",
      "quantity",
      "price",
      "totalAmount",
      "fees",
      "status",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(trades);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=trades.csv");
    res.send(csv);
  } catch (error: any) {
    logger.error("Error exporting trades to CSV:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
