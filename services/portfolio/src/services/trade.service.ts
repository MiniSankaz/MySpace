import { MockPrismaClient } from "../types/mock-db";
import { Trade, TradeType, TradeStatus } from "../types";
import { logger } from "../utils/logger";
import Decimal from "decimal.js";

export class TradeService {
  constructor(private prisma: MockPrismaClient) {}

  /**
   * Execute a trade
   */
  async executeTrade(
    userId: string,
    data: {
      portfolioId: string;
      stockSymbol: string;
      type: TradeType;
      quantity: number;
      price: number;
      fees?: number;
      notes?: string;
    },
  ) {
    try {
      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: data.portfolioId, userId },
      });

      if (!portfolio) {
        throw new Error("Portfolio not found");
      }

      // Get or create stock
      let stock = await this.prisma.stock.findUnique({
        where: { symbol: data.stockSymbol },
      });

      if (!stock) {
        // Create a basic stock entry (would normally fetch from market data)
        stock = await this.prisma.stock.create({
          data: {
            symbol: data.stockSymbol,
            name: data.stockSymbol, // Would fetch real name
            exchange: "UNKNOWN",
            currentPrice: data.price,
          },
        });
      }

      const totalAmount = new Decimal(data.quantity).mul(data.price).toNumber();

      // Create trade record
      const trade = await this.prisma.trade.create({
        data: {
          userId,
          portfolioId: data.portfolioId,
          stockSymbol: data.stockSymbol,
          type: data.type,
          quantity: data.quantity,
          price: data.price,
          totalAmount,
          fees: data.fees || 0,
          notes: data.notes,
          status: TradeStatus.EXECUTED,
          executedAt: new Date(),
        },
      });

      // Update portfolio position
      await this.updatePortfolioPosition(
        data.portfolioId,
        data.stockSymbol,
        data.type,
        data.quantity,
        data.price,
      );

      logger.info(`Executed trade ${trade.id} for user ${userId}`);
      return trade;
    } catch (error) {
      logger.error("Error executing trade:", error);
      throw error;
    }
  }

  /**
   * Update portfolio position after a trade
   */
  private async updatePortfolioPosition(
    portfolioId: string,
    stockSymbol: string,
    tradeType: TradeType,
    quantity: number,
    price: number,
  ) {
    try {
      const existingPosition = await this.prisma.portfolioPosition.findUnique({
        where: {
          portfolioId_stockSymbol: {
            portfolioId,
            stockSymbol,
          },
        },
      });

      if (tradeType === TradeType.BUY || tradeType === TradeType.TRANSFER_IN) {
        if (existingPosition) {
          // Update existing position
          const newQuantity = new Decimal(existingPosition.quantity).plus(
            quantity,
          );
          const totalCost = new Decimal(existingPosition.quantity)
            .mul(existingPosition.averageCost)
            .plus(new Decimal(quantity).mul(price));
          const newAverageCost = totalCost.div(newQuantity);

          await this.prisma.portfolioPosition.update({
            where: { id: existingPosition.id },
            data: {
              quantity: newQuantity.toNumber(),
              averageCost: newAverageCost.toNumber(),
            },
          });
        } else {
          // Create new position
          await this.prisma.portfolioPosition.create({
            data: {
              portfolioId,
              stockSymbol,
              quantity,
              averageCost: price,
              currentPrice: price,
              marketValue: new Decimal(quantity).mul(price).toNumber(),
              gainLoss: 0,
              gainLossPercent: 0,
              weight: 0,
            },
          });
        }
      } else if (
        tradeType === TradeType.SELL ||
        tradeType === TradeType.TRANSFER_OUT
      ) {
        if (!existingPosition) {
          throw new Error("No position to sell");
        }

        const newQuantity = new Decimal(existingPosition.quantity).minus(
          quantity,
        );

        if (newQuantity.lt(0)) {
          throw new Error("Insufficient quantity to sell");
        }

        if (newQuantity.eq(0)) {
          // Remove position entirely
          await this.prisma.portfolioPosition.delete({
            where: { id: existingPosition.id },
          });
        } else {
          // Update position
          await this.prisma.portfolioPosition.update({
            where: { id: existingPosition.id },
            data: {
              quantity: newQuantity.toNumber(),
            },
          });
        }
      }
    } catch (error) {
      logger.error("Error updating portfolio position:", error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(
    userId: string,
    filters?: {
      portfolioId?: string;
      stockSymbol?: string;
      type?: TradeType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    try {
      const where: any = { userId };

      if (filters?.portfolioId) {
        where.portfolioId = filters.portfolioId;
      }
      if (filters?.stockSymbol) {
        where.stockSymbol = filters.stockSymbol;
      }
      if (filters?.type) {
        where.type = filters.type;
      }
      if (filters?.startDate || filters?.endDate) {
        where.executedAt = {};
        if (filters.startDate) {
          where.executedAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.executedAt.lte = filters.endDate;
        }
      }

      const trades = await this.prisma.trade.findMany({
        where,
        include: {
          portfolio: {
            select: {
              id: true,
              name: true,
            },
          },
          stock: true,
        },
        orderBy: { executedAt: "desc" },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      const total = await this.prisma.trade.count({ where });

      return {
        trades,
        pagination: {
          total,
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
          hasNext: (filters?.offset || 0) + trades.length < total,
          hasPrevious: (filters?.offset || 0) > 0,
        },
      };
    } catch (error) {
      logger.error("Error fetching trade history:", error);
      throw error;
    }
  }

  /**
   * Get trade by ID
   */
  async getTradeById(tradeId: string, userId: string) {
    try {
      const trade = await this.prisma.trade.findFirst({
        where: {
          id: tradeId,
          userId,
        },
        include: {
          portfolio: true,
          stock: true,
        },
      });

      if (!trade) {
        throw new Error("Trade not found");
      }

      return trade;
    } catch (error) {
      logger.error("Error fetching trade:", error);
      throw error;
    }
  }

  /**
   * Cancel a pending trade
   */
  async cancelTrade(tradeId: string, userId: string) {
    try {
      const trade = await this.prisma.trade.findFirst({
        where: {
          id: tradeId,
          userId,
          status: TradeStatus.PENDING,
        },
      });

      if (!trade) {
        throw new Error("Trade not found or already executed");
      }

      const cancelledTrade = await this.prisma.trade.update({
        where: { id: tradeId },
        data: { status: TradeStatus.CANCELLED },
      });

      logger.info(`Cancelled trade ${tradeId}`);
      return cancelledTrade;
    } catch (error) {
      logger.error("Error cancelling trade:", error);
      throw error;
    }
  }

  /**
   * Import trades in bulk (CSV import)
   */
  async importTrades(
    userId: string,
    trades: Array<{
      portfolioId: string;
      stockSymbol: string;
      type: TradeType;
      quantity: number;
      price: number;
      fees?: number;
      executedAt: Date;
      notes?: string;
    }>,
  ) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const trade of trades) {
        try {
          await this.executeTrade(userId, trade);
          results.successful++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${trade.stockSymbol}: ${error.message}`);
        }
      }

      logger.info(`Imported ${results.successful} trades for user ${userId}`);
      return results;
    } catch (error) {
      logger.error("Error importing trades:", error);
      throw error;
    }
  }
}
