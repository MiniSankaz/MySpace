import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import Decimal from "decimal.js";

export class PortfolioService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get all portfolios for a user
   */
  async getUserPortfolios(userId: string) {
    try {
      const portfolios = await this.prisma.portfolio.findMany({
        where: { userId },
        include: {
          holdings: true,
          transactions: {
            orderBy: { executedAt: "desc" },
            take: 10,
          },
          snapshots: {
            orderBy: { timestamp: "desc" },
            take: 30,
          },
        },
        orderBy: { isDefault: "desc" },
      });

      return portfolios;
    } catch (error) {
      logger.error("Error fetching user portfolios:", error);
      throw error;
    }
  }

  /**
   * Get a single portfolio by ID
   */
  async getPortfolioById(portfolioId: string, userId: string) {
    try {
      const portfolio = await this.prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId,
        },
        include: {
          holdings: true,
          transactions: {
            orderBy: { executedAt: "desc" },
            take: 10,
          },
          snapshots: {
            orderBy: { timestamp: "desc" },
            take: 30,
          },
        },
      });

      if (!portfolio) {
        throw new Error("Portfolio not found");
      }

      return portfolio;
    } catch (error) {
      logger.error("Error fetching portfolio:", error);
      throw error;
    }
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(
    userId: string,
    data: {
      name: string;
      description?: string;
      currency?: string;
      isDefault?: boolean;
    },
  ) {
    try {
      // If this is marked as default, unset other defaults
      if (data.isDefault) {
        await this.prisma.portfolio.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // Check portfolio limit
      const portfolioCount = await this.prisma.portfolio.count({
        where: { userId },
      });

      const maxPortfolios = parseInt(
        process.env.MAX_PORTFOLIOS_PER_USER || "10",
      );
      if (portfolioCount >= maxPortfolios) {
        throw new Error(`Maximum portfolio limit (${maxPortfolios}) reached`);
      }

      const portfolio = await this.prisma.portfolio.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          currency: data.currency || "USD",
          isDefault: data.isDefault || portfolioCount === 0, // First portfolio is default
        },
      });

      logger.info(`Created portfolio ${portfolio.id} for user ${userId}`);
      return portfolio;
    } catch (error) {
      logger.error("Error creating portfolio:", error);
      throw error;
    }
  }

  /**
   * Update a portfolio
   */
  async updatePortfolio(
    portfolioId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      isDefault?: boolean;
    },
  ) {
    try {
      // Verify ownership
      const existing = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
      });

      if (!existing) {
        throw new Error("Portfolio not found");
      }

      // If setting as default, unset others
      if (data.isDefault) {
        await this.prisma.portfolio.updateMany({
          where: { userId, id: { not: portfolioId } },
          data: { isDefault: false },
        });
      }

      const portfolio = await this.prisma.portfolio.update({
        where: { id: portfolioId },
        data: {
          name: data.name,
          description: data.description,
          isDefault: data.isDefault,
        },
      });

      logger.info(`Updated portfolio ${portfolioId}`);
      return portfolio;
    } catch (error) {
      logger.error("Error updating portfolio:", error);
      throw error;
    }
  }

  /**
   * Delete a portfolio (soft delete)
   */
  async deletePortfolio(portfolioId: string, userId: string) {
    try {
      // Verify ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
      });

      if (!portfolio) {
        throw new Error("Portfolio not found");
      }

      // Don't delete default portfolio if there are others
      if (portfolio.isDefault) {
        const otherPortfolios = await this.prisma.portfolio.count({
          where: { userId, id: { not: portfolioId } },
        });

        if (otherPortfolios > 0) {
          throw new Error(
            "Cannot delete default portfolio. Set another portfolio as default first.",
          );
        }
      }

      // Hard delete (cascade will handle related records)
      await this.prisma.portfolio.delete({
        where: { id: portfolioId },
      });

      logger.info(`Deleted portfolio ${portfolioId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error deleting portfolio:", error);
      throw error;
    }
  }

  /**
   * Calculate portfolio value and P&L
   */
  async calculatePortfolioMetrics(portfolioId: string) {
    try {
      const holdings = await this.prisma.holding.findMany({
        where: { portfolioId },
      });

      let totalValue = new Decimal(0);
      let totalCost = new Decimal(0);

      for (const holding of holdings) {
        // For now, use mock current price (in a real app, fetch from market data API)
        const currentPrice = holding.averagePrice.mul(1.1); // 10% gain for demo
        const marketValue = new Decimal(holding.quantity).mul(currentPrice);
        const cost = new Decimal(holding.quantity).mul(holding.averagePrice);

        totalValue = totalValue.plus(marketValue);
        totalCost = totalCost.plus(cost);
      }

      const totalGainLoss = totalValue.minus(totalCost);
      const totalGainLossPercent = totalCost.gt(0)
        ? totalGainLoss.div(totalCost).mul(100)
        : new Decimal(0);

      // Create portfolio snapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.portfolioSnapshot.create({
        data: {
          portfolioId,
          timestamp: today,
          totalValue: totalValue.toNumber(),
          totalCost: totalCost.toNumber(),
          totalReturn: totalGainLoss.toNumber(),
          totalReturnPercent: totalGainLossPercent.toNumber(),
          dayChange: 0,
          dayChangePercent: 0,
        },
      });

      logger.info(`Calculated metrics for portfolio ${portfolioId}`);
      return { totalValue: totalValue.toNumber(), totalCost: totalCost.toNumber(), totalGainLoss: totalGainLoss.toNumber() };
    } catch (error) {
      logger.error("Error calculating portfolio metrics:", error);
      throw error;
    }
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(portfolioId: string, userId: string) {
    try {
      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio.holdings) {
        throw new Error("Portfolio holdings not found");
      }

      // Get holdings with calculated metrics
      const holdings = portfolio.holdings.map((holding: any) => {
        const currentPrice = holding.averagePrice * 1.1; // Mock 10% gain
        const marketValue = holding.quantity * currentPrice;
        const cost = holding.quantity * holding.averagePrice;
        const gainLoss = marketValue - cost;
        const gainLossPercentage = cost > 0 ? (gainLoss / cost) * 100 : 0;
        
        return {
          ...holding,
          currentPrice,
          marketValue,
          cost,
          gainLoss,
          gainLossPercentage,
        };
      });

      const topGainers = holdings
        .filter((h: any) => h.gainLossPercentage > 0)
        .sort((a: any, b: any) => b.gainLossPercentage - a.gainLossPercentage)
        .slice(0, 5);
      const topLosers = holdings
        .filter((h: any) => h.gainLossPercentage < 0)
        .sort((a: any, b: any) => a.gainLossPercentage - b.gainLossPercentage)
        .slice(0, 5);

      // Mock sector allocation
      const sectorAllocation = {
        "Technology": { value: 50000, weight: 40, count: 3 },
        "Healthcare": { value: 30000, weight: 24, count: 2 },
        "Finance": { value: 25000, weight: 20, count: 2 },
        "Energy": { value: 20000, weight: 16, count: 1 },
      };

      return {
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
          currency: portfolio.currency,
          isDefault: portfolio.isDefault,
          holdingCount: portfolio.holdings?.length || 0,
          lastUpdated: portfolio.updatedAt,
        },
        holdings,
        topGainers,
        topLosers,
        sectorAllocation,
        recentTransactions: portfolio.transactions,
        performanceHistory: portfolio.snapshots,
      };
    } catch (error) {
      logger.error("Error getting portfolio summary:", error);
      throw error;
    }
  }
}
