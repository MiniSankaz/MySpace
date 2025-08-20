import { Router, Request, Response } from "express";
import { PortfolioService } from "../services/portfolio.service";
import { marketDataService } from "../services/market-data.service";
import { logger } from "../utils/logger";

const router = Router();
const portfolioService = new PortfolioService();

// Get all portfolios for authenticated user
router.get("/", async (req: Request, res: Response) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = (req.headers["x-user-id"] as string) || "test-user";

    const portfolios = await portfolioService.getUserPortfolios(userId);
    res.json({
      success: true,
      data: portfolios,
    });
  } catch (error: any) {
    logger.error("Error fetching portfolios:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get specific portfolio
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    const portfolio = await portfolioService.getPortfolioById(id, userId);
    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    logger.error("Error fetching portfolio:", error);
    res.status(error.message === "Portfolio not found" ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new portfolio
router.post("/", async (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  const userId = (req.headers["x-user-id"] as string) || "test-user";
  
  logger.info('POST /portfolios request received:', {
    correlationId,
    userId,
    method: req.method,
    path: req.path,
    headers: {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': req.headers['user-agent'],
      'x-correlation-id': correlationId
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    rawBodySize: (req as any).rawBody ? (req as any).rawBody.length : 0
  });
  
  try {
    const { name, description, currency, isDefault } = req.body;

    if (!name) {
      logger.warn('Portfolio creation failed - missing name:', {
        correlationId,
        userId,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: "Portfolio name is required",
      });
    }

    logger.info('Creating portfolio:', {
      correlationId,
      userId,
      portfolioData: { name, description, currency, isDefault }
    });

    const portfolio = await portfolioService.createPortfolio(userId, {
      name,
      description,
      currency,
      isDefault,
    });

    logger.info('Portfolio created successfully:', {
      correlationId,
      userId,
      portfolioId: portfolio.id
    });

    res.status(201).json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    logger.error("Error creating portfolio:", {
      correlationId,
      userId,
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
});

// Update portfolio
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;
    const { name, description, isDefault } = req.body;

    const portfolio = await portfolioService.updatePortfolio(id, userId, {
      name,
      description,
      isDefault,
    });

    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    logger.error("Error updating portfolio:", error);
    res.status(error.message === "Portfolio not found" ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete portfolio
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    await portfolioService.deletePortfolio(id, userId);

    res.json({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting portfolio:", error);
    res.status(error.message === "Portfolio not found" ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get portfolio summary
router.get("/:id/summary", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    const summary = await portfolioService.getPortfolioSummary(id, userId);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error("Error fetching portfolio summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Recalculate portfolio metrics
router.post("/:id/recalculate", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    // Verify ownership
    await portfolioService.getPortfolioById(id, userId);

    const portfolio = await portfolioService.calculatePortfolioMetrics(id);
    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    logger.error("Error recalculating portfolio:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get real-time portfolio value
router.get("/:id/value", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    // Get portfolio holdings
    const portfolio = await portfolioService.getPortfolioById(id, userId);
    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return res.json({
        success: true,
        data: {
          portfolioId: id,
          totalValue: 0,
          holdings: [],
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Calculate real-time value
    const holdingsData = portfolio.holdings.map((h: any) => ({
      symbol: h.symbol,
      quantity: Number(h.quantity)
    }));

    const totalValue = await marketDataService.calculatePortfolioValue(holdingsData);
    
    // Get real-time prices for each holding
    const symbols = holdingsData.map(h => h.symbol);
    const quotes = await marketDataService.getQuotes(symbols);
    
    const holdingsWithPrices = portfolio.holdings.map((h: any) => {
      const quote = quotes.find(q => q.symbol === h.symbol);
      const currentPrice = quote?.price || 100; // Default fallback price
      const quantity = Number(h.quantity);
      
      return {
        ...h,
        currentPrice,
        marketValue: Number(currentPrice) * quantity,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0
      };
    });

    res.json({
      success: true,
      data: {
        portfolioId: id,
        portfolioName: portfolio.name,
        totalValue,
        holdings: holdingsWithPrices,
        lastUpdated: new Date().toISOString(),
        marketDataAvailable: await marketDataService.isServiceAvailable()
      }
    });
  } catch (error: any) {
    logger.error("Error getting real-time portfolio value:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Set default portfolio
router.post("/:id/set-default", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "test-user";
    const { id } = req.params;

    const portfolio = await portfolioService.updatePortfolio(id, userId, {
      isDefault: true,
    });

    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    logger.error("Error setting default portfolio:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
