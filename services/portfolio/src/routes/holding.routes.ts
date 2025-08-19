import { Router, Request, Response } from "express";
import { HoldingService } from "../services/holding.service";
import { logger } from "../utils/logger";

const router = Router();
const holdingService = new HoldingService();

// Get all holdings for a portfolio
router.get("/:portfolioId/holdings", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { portfolioId } = req.params;

    const holdings = await holdingService.getPortfolioHoldings(portfolioId, userId);
    res.json({
      success: true,
      data: holdings,
    });
  } catch (error: any) {
    logger.error("Error fetching holdings:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add a new holding to portfolio
router.post("/:portfolioId/holdings", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { portfolioId } = req.params;
    const { symbol, quantity, averagePrice } = req.body;

    if (!symbol || !quantity || !averagePrice) {
      return res.status(400).json({
        success: false,
        error: "Symbol, quantity, and averagePrice are required",
      });
    }

    const holding = await holdingService.addHolding(portfolioId, userId, {
      symbol,
      quantity: parseFloat(quantity),
      averagePrice: parseFloat(averagePrice),
    });

    res.status(201).json({
      success: true,
      data: holding,
    });
  } catch (error: any) {
    logger.error("Error adding holding:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update a holding
router.put("/:portfolioId/holdings/:holdingId", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { portfolioId, holdingId } = req.params;
    const { quantity, averagePrice } = req.body;

    const holding = await holdingService.updateHolding(holdingId, portfolioId, userId, {
      quantity: quantity ? parseFloat(quantity) : undefined,
      averagePrice: averagePrice ? parseFloat(averagePrice) : undefined,
    });

    res.json({
      success: true,
      data: holding,
    });
  } catch (error: any) {
    logger.error("Error updating holding:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete a holding
router.delete("/:portfolioId/holdings/:holdingId", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { portfolioId, holdingId } = req.params;

    await holdingService.deleteHolding(holdingId, portfolioId, userId);

    res.json({
      success: true,
      message: "Holding deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting holding:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;