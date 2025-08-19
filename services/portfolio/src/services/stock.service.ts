import { MockPrismaClient } from "../types/mock-db";
import { Stock } from "../types";
import { logger } from "../utils/logger";
import Decimal from "decimal.js";

export class StockService {
  private mockStocks = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 175.5,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 140.25,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 380.75,
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      exchange: "NASDAQ",
      sector: "Consumer Cyclical",
      price: 150.0,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      exchange: "NASDAQ",
      sector: "Consumer Cyclical",
      price: 250.3,
    },
    {
      symbol: "META",
      name: "Meta Platforms Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 325.4,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 450.2,
    },
    {
      symbol: "JPM",
      name: "JPMorgan Chase & Co.",
      exchange: "NYSE",
      sector: "Financial",
      price: 150.75,
    },
    {
      symbol: "V",
      name: "Visa Inc.",
      exchange: "NYSE",
      sector: "Financial",
      price: 245.6,
    },
    {
      symbol: "JNJ",
      name: "Johnson & Johnson",
      exchange: "NYSE",
      sector: "Healthcare",
      price: 160.8,
    },
    {
      symbol: "WMT",
      name: "Walmart Inc.",
      exchange: "NYSE",
      sector: "Consumer Defensive",
      price: 165.3,
    },
    {
      symbol: "PG",
      name: "Procter & Gamble Co.",
      exchange: "NYSE",
      sector: "Consumer Defensive",
      price: 155.45,
    },
    {
      symbol: "MA",
      name: "Mastercard Inc.",
      exchange: "NYSE",
      sector: "Financial",
      price: 420.9,
    },
    {
      symbol: "HD",
      name: "The Home Depot Inc.",
      exchange: "NYSE",
      sector: "Consumer Cyclical",
      price: 310.25,
    },
    {
      symbol: "DIS",
      name: "The Walt Disney Company",
      exchange: "NYSE",
      sector: "Communication Services",
      price: 95.6,
    },
    {
      symbol: "NFLX",
      name: "Netflix Inc.",
      exchange: "NASDAQ",
      sector: "Communication Services",
      price: 435.8,
    },
    {
      symbol: "ADBE",
      name: "Adobe Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 520.4,
    },
    {
      symbol: "CRM",
      name: "Salesforce Inc.",
      exchange: "NYSE",
      sector: "Technology",
      price: 210.3,
    },
    {
      symbol: "PFE",
      name: "Pfizer Inc.",
      exchange: "NYSE",
      sector: "Healthcare",
      price: 35.75,
    },
    {
      symbol: "CSCO",
      name: "Cisco Systems Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 48.9,
    },
  ];

  constructor(private prisma: MockPrismaClient) {}

  /**
   * Initialize mock stocks in database
   */
  async initializeMockStocks() {
    try {
      for (const mockStock of this.mockStocks) {
        await this.prisma.stock.upsert({
          where: { symbol: mockStock.symbol },
          update: {
            currentPrice: mockStock.price,
            lastUpdated: new Date(),
          },
          create: {
            symbol: mockStock.symbol,
            name: mockStock.name,
            exchange: mockStock.exchange,
            sector: mockStock.sector,
            currentPrice: mockStock.price,
            previousClose: mockStock.price,
            dayChange: 0,
            dayChangePercent: 0,
            pe: Math.random() * 30 + 10,
            eps: Math.random() * 10 + 1,
            beta: Math.random() * 2,
            dividendYield: Math.random() * 3,
            marketCap: Math.random() * 1000000000000 + 100000000000,
            fiftyTwoWeekHigh: mockStock.price * 1.3,
            fiftyTwoWeekLow: mockStock.price * 0.7,
            volume: Math.floor(Math.random() * 50000000),
            avgVolume: Math.floor(Math.random() * 40000000),
          },
        });
      }
      logger.info("Initialized mock stocks");
    } catch (error) {
      logger.error("Error initializing mock stocks:", error);
    }
  }

  /**
   * Get stock by symbol
   */
  async getStock(symbol: string) {
    try {
      const stock = await this.prisma.stock.findUnique({
        where: { symbol },
        include: {
          priceHistory: {
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      });

      if (!stock) {
        // Try to create from mock data
        const mockStock = this.mockStocks.find((s) => s.symbol === symbol);
        if (mockStock) {
          return await this.prisma.stock.create({
            data: {
              symbol: mockStock.symbol,
              name: mockStock.name,
              exchange: mockStock.exchange,
              sector: mockStock.sector,
              currentPrice: mockStock.price,
              previousClose: mockStock.price,
              dayChange: 0,
              dayChangePercent: 0,
            },
          });
        }
        throw new Error("Stock not found");
      }

      return stock;
    } catch (error) {
      logger.error("Error fetching stock:", error);
      throw error;
    }
  }

  /**
   * Search stocks
   */
  async searchStocks(query: string) {
    try {
      const stocks = await this.prisma.stock.findMany({
        where: {
          OR: [
            { symbol: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
      });

      return stocks;
    } catch (error) {
      logger.error("Error searching stocks:", error);
      throw error;
    }
  }

  /**
   * Update stock prices with mock data
   */
  async updateMockPrices() {
    try {
      const stocks = await this.prisma.stock.findMany();

      for (const stock of stocks) {
        // Generate random price movement (-5% to +5%)
        const changePercent = (Math.random() - 0.5) * 10;
        const changeAmount = new Decimal(stock.currentPrice)
          .mul(changePercent)
          .div(100);
        const newPrice = new Decimal(stock.currentPrice).plus(changeAmount);

        await this.prisma.stock.update({
          where: { symbol: stock.symbol },
          data: {
            previousClose: stock.currentPrice,
            currentPrice: newPrice.toNumber(),
            dayChange: changeAmount.toNumber(),
            dayChangePercent: changePercent,
            volume: Math.floor(Math.random() * 50000000),
            lastUpdated: new Date(),
          },
        });

        // Create price history entry
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await this.prisma.stockPriceHistory.upsert({
          where: {
            stockSymbol_date: {
              stockSymbol: stock.symbol,
              date: today,
            },
          },
          update: {
            close: newPrice.toNumber(),
            high: Math.max(stock.currentPrice, newPrice.toNumber()) * 1.01,
            low: Math.min(stock.currentPrice, newPrice.toNumber()) * 0.99,
            volume: Math.floor(Math.random() * 50000000),
          },
          create: {
            stockSymbol: stock.symbol,
            date: today,
            open: stock.previousClose || stock.currentPrice,
            high: Math.max(stock.currentPrice, newPrice.toNumber()) * 1.01,
            low: Math.min(stock.currentPrice, newPrice.toNumber()) * 0.99,
            close: newPrice.toNumber(),
            volume: Math.floor(Math.random() * 50000000),
          },
        });
      }

      logger.info("Updated mock stock prices");
    } catch (error) {
      logger.error("Error updating mock prices:", error);
    }
  }

  /**
   * Get trending stocks
   */
  async getTrendingStocks() {
    try {
      const gainers = await this.prisma.stock.findMany({
        where: { dayChangePercent: { gt: 0 } },
        orderBy: { dayChangePercent: "desc" },
        take: 5,
      });

      const losers = await this.prisma.stock.findMany({
        where: { dayChangePercent: { lt: 0 } },
        orderBy: { dayChangePercent: "asc" },
        take: 5,
      });

      const mostActive = await this.prisma.stock.findMany({
        orderBy: { volume: "desc" },
        take: 5,
      });

      return {
        gainers,
        losers,
        mostActive,
      };
    } catch (error) {
      logger.error("Error fetching trending stocks:", error);
      throw error;
    }
  }

  /**
   * Get stock price history
   */
  async getStockHistory(symbol: string, days: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await this.prisma.stockPriceHistory.findMany({
        where: {
          stockSymbol: symbol,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: "asc" },
      });

      return history;
    } catch (error) {
      logger.error("Error fetching stock history:", error);
      throw error;
    }
  }

  /**
   * Batch update stock prices
   */
  async batchUpdatePrices(updates: Array<{ symbol: string; price: number }>) {
    try {
      const operations = updates.map((update) => {
        const changeAmount = new Decimal(update.price).minus(0); // Would calculate from previous
        const changePercent = 0; // Would calculate

        return this.prisma.stock.update({
          where: { symbol: update.symbol },
          data: {
            currentPrice: update.price,
            dayChange: changeAmount.toNumber(),
            dayChangePercent: changePercent,
            lastUpdated: new Date(),
          },
        });
      });

      await this.prisma.$transaction(operations);
      logger.info(`Updated ${updates.length} stock prices`);
    } catch (error) {
      logger.error("Error batch updating prices:", error);
      throw error;
    }
  }
}
