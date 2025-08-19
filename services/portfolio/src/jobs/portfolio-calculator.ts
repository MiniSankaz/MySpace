import { PrismaClient } from "@prisma/client";
import { PortfolioService } from "../services/portfolio.service";
import { wsService } from "../services/websocket.service";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();
const portfolioService = new PortfolioService();

let calculationInterval: NodeJS.Timeout | null = null;

export async function startPortfolioCalculationJob() {
  const interval = parseInt(process.env.PORTFOLIO_CALC_INTERVAL || "60000"); // 1 minute default

  calculationInterval = setInterval(async () => {
    try {
      await calculateAllPortfolios();
    } catch (error) {
      logger.error("Error in portfolio calculation job:", error);
    }
  }, interval);

  // Run once immediately
  calculateAllPortfolios();

  logger.info(`Portfolio calculation job started with interval: ${interval}ms`);
}

export function stopPortfolioCalculationJob() {
  if (calculationInterval) {
    clearInterval(calculationInterval);
    calculationInterval = null;
    logger.info("Portfolio calculation job stopped");
  }
}

async function calculateAllPortfolios() {
  try {
    // Get all active portfolios
    const portfolios = await prisma.portfolio.findMany({
      where: {},
      select: { id: true, userId: true },
    });

    logger.info(`Calculating metrics for ${portfolios.length} portfolios`);

    for (const portfolio of portfolios) {
      try {
        // Calculate portfolio metrics
        const updatedPortfolio =
          await portfolioService.calculatePortfolioMetrics(portfolio.id);

        // Broadcast portfolio update via WebSocket
        wsService.broadcastPortfolioUpdate(portfolio.id, {
          portfolioId: portfolio.id,
          totalValue: updatedPortfolio.totalValue,
          totalGainLoss: updatedPortfolio.totalGainLoss,
          timestamp: new Date().toISOString(),
        });

        logger.debug(`Calculated metrics for portfolio ${portfolio.id}`);
      } catch (error) {
        logger.error(`Error calculating portfolio ${portfolio.id}:`, error);
      }
    }

    logger.info(`Completed portfolio calculations`);
  } catch (error) {
    logger.error("Error in portfolio calculation:", error);
  }
}
