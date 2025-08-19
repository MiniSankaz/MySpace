import { MockPrismaClient } from "../types/mock-db";
import { StockService } from "../services/stock.service";
import { wsService } from "../services/websocket.service";
import { logger } from "../utils/logger";

const prisma = new MockPrismaClient();
const stockService = new StockService(prisma);

let priceUpdateInterval: NodeJS.Timeout | null = null;

export async function startPriceUpdateJob() {
  // Initialize mock stocks on first run
  await stockService.initializeMockStocks();

  const interval = parseInt(process.env.MOCK_UPDATE_INTERVAL || "5000");

  priceUpdateInterval = setInterval(async () => {
    try {
      await updatePrices();
    } catch (error) {
      logger.error("Error in price update job:", error);
    }
  }, interval);

  logger.info(`Price update job started with interval: ${interval}ms`);
}

export function stopPriceUpdateJob() {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    logger.info("Price update job stopped");
  }
}

async function updatePrices() {
  try {
    // Update mock prices
    await stockService.updateMockPrices();

    // Get all stocks with recent updates
    const allStocks = await prisma.stock.findMany({});
    const stocks = allStocks
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        dayChange: stock.dayChange,
        dayChangePercent: stock.dayChangePercent,
        volume: stock.volume,
      }))
      .slice(0, 20);

    // Broadcast price updates via WebSocket
    wsService.broadcastPriceUpdate({
      stocks: stocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.currentPrice,
        change: stock.dayChange,
        changePercent: stock.dayChangePercent,
        volume: stock.volume?.toString() || "0",
      })),
      timestamp: new Date().toISOString(),
    });

    // Also broadcast individual stock updates
    for (const stock of stocks) {
      wsService.broadcastStockUpdate(stock.symbol, {
        price: stock.currentPrice,
        change: stock.dayChange,
        changePercent: stock.dayChangePercent,
        volume: stock.volume?.toString() || "0",
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug(`Updated prices for ${stocks.length} stocks`);
  } catch (error) {
    logger.error("Error updating prices:", error);
  }
}
