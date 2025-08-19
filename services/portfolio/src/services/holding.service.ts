import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import Decimal from "decimal.js";

export class HoldingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get all holdings for a portfolio
   */
  async getPortfolioHoldings(portfolioId: string, userId: string) {
    try {
      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
      });

      if (!portfolio) {
        throw new Error("Portfolio not found");
      }

      const holdings = await this.prisma.holding.findMany({
        where: { portfolioId },
        orderBy: { symbol: "asc" },
      });

      // Calculate current values for each holding (mock for now)
      const enrichedHoldings = holdings.map((holding) => {
        const currentPrice = holding.averagePrice.mul(1.1); // Mock 10% gain
        const marketValue = new Decimal(holding.quantity).mul(currentPrice);
        const cost = new Decimal(holding.quantity).mul(holding.averagePrice);
        const gainLoss = marketValue.minus(cost);
        const gainLossPercentage = cost.gt(0) ? gainLoss.div(cost).mul(100) : new Decimal(0);

        return {
          id: holding.id,
          symbol: holding.symbol,
          quantity: holding.quantity.toNumber(),
          averagePrice: holding.averagePrice.toNumber(),
          currentPrice: currentPrice.toNumber(),
          marketValue: marketValue.toNumber(),
          cost: cost.toNumber(),
          gainLoss: gainLoss.toNumber(),
          gainLossPercentage: gainLossPercentage.toNumber(),
          dayChange: marketValue.mul(0.02).toNumber(), // Mock 2% daily change
          dayChangePercentage: 2.0,
          createdAt: holding.createdAt,
          updatedAt: holding.updatedAt,
        };
      });

      return enrichedHoldings;
    } catch (error) {
      logger.error("Error fetching portfolio holdings:", error);
      throw error;
    }
  }

  /**
   * Add a new holding to portfolio
   */
  async addHolding(
    portfolioId: string,
    userId: string,
    data: {
      symbol: string;
      quantity: number;
      averagePrice: number;
    }
  ) {
    try {
      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
      });

      if (!portfolio) {
        throw new Error("Portfolio not found");
      }

      // Check if holding already exists
      const existingHolding = await this.prisma.holding.findUnique({
        where: {
          portfolioId_symbol: {
            portfolioId,
            symbol: data.symbol.toUpperCase(),
          },
        },
      });

      if (existingHolding) {
        // Update existing holding (add to quantity, recalculate average price)
        const existingQuantity = new Decimal(existingHolding.quantity);
        const existingCost = existingQuantity.mul(existingHolding.averagePrice);
        const newCost = new Decimal(data.quantity).mul(data.averagePrice);
        const totalCost = existingCost.plus(newCost);
        const totalQuantity = existingQuantity.plus(data.quantity);
        const newAveragePrice = totalQuantity.gt(0) ? totalCost.div(totalQuantity) : new Decimal(0);

        const updatedHolding = await this.prisma.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: totalQuantity.toNumber(),
            averagePrice: newAveragePrice.toNumber(),
          },
        });

        logger.info(`Updated existing holding ${data.symbol} in portfolio ${portfolioId}`);
        return updatedHolding;
      } else {
        // Create new holding
        const holding = await this.prisma.holding.create({
          data: {
            portfolioId,
            symbol: data.symbol.toUpperCase(),
            quantity: data.quantity,
            averagePrice: data.averagePrice,
          },
        });

        // Create transaction record
        await this.prisma.transaction.create({
          data: {
            portfolioId,
            holdingId: holding.id,
            type: "BUY",
            symbol: data.symbol.toUpperCase(),
            quantity: data.quantity,
            price: data.averagePrice,
            total: new Decimal(data.quantity).mul(data.averagePrice).toNumber(),
          },
        });

        logger.info(`Added new holding ${data.symbol} to portfolio ${portfolioId}`);
        return holding;
      }
    } catch (error) {
      logger.error("Error adding holding:", error);
      throw error;
    }
  }

  /**
   * Update a holding
   */
  async updateHolding(
    holdingId: string,
    portfolioId: string,
    userId: string,
    data: {
      quantity?: number;
      averagePrice?: number;
    }
  ) {
    try {
      // Verify portfolio ownership and holding exists
      const holding = await this.prisma.holding.findFirst({
        where: {
          id: holdingId,
          portfolioId,
          portfolio: { userId },
        },
      });

      if (!holding) {
        throw new Error("Holding not found");
      }

      const updatedHolding = await this.prisma.holding.update({
        where: { id: holdingId },
        data: {
          quantity: data.quantity ?? holding.quantity,
          averagePrice: data.averagePrice ?? holding.averagePrice,
        },
      });

      logger.info(`Updated holding ${holdingId}`);
      return updatedHolding;
    } catch (error) {
      logger.error("Error updating holding:", error);
      throw error;
    }
  }

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string, portfolioId: string, userId: string) {
    try {
      // Verify portfolio ownership and holding exists
      const holding = await this.prisma.holding.findFirst({
        where: {
          id: holdingId,
          portfolioId,
          portfolio: { userId },
        },
      });

      if (!holding) {
        throw new Error("Holding not found");
      }

      // Delete the holding (cascade will handle transactions)
      await this.prisma.holding.delete({
        where: { id: holdingId },
      });

      logger.info(`Deleted holding ${holdingId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error deleting holding:", error);
      throw error;
    }
  }
}