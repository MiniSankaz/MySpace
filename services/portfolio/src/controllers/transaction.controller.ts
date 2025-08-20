import { Request, Response } from "express";
import { PrismaClient, TransactionType } from "@prisma/client";
import { logger } from "../utils/logger";

export class TransactionController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new transaction
   */
  async createTransaction(req: Request, res: Response) {
    try {
      const { portfolioId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }
      
      const { type, symbol, quantity, price, fees = 0, notes, executedAt } = req.body;

      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId }
      });

      if (!portfolio) {
        return res.status(404).json({
          success: false,
          error: "Portfolio not found"
        });
      }

      // Calculate total
      const total = (parseFloat(quantity) * parseFloat(price)) + parseFloat(fees);

      // Create transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          portfolioId,
          type: type as TransactionType,
          symbol,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          fees: parseFloat(fees),
          total,
          notes,
          executedAt: executedAt ? new Date(executedAt) : new Date()
        }
      });

      // Update holdings based on transaction type
      if (type === "BUY" || type === "TRANSFER_IN") {
        await this.updateHoldingAfterBuy(portfolioId, symbol, quantity, price);
      } else if (type === "SELL" || type === "TRANSFER_OUT") {
        await this.updateHoldingAfterSell(portfolioId, symbol, quantity);
      }

      // Create portfolio snapshot
      await this.createPortfolioSnapshot(portfolioId);

      res.status(201).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error("Error creating transaction:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create transaction"
      });
    }
  }

  /**
   * Get transactions for a portfolio
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const { portfolioId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }
      
      const { limit = 50, offset = 0, symbol, type, startDate, endDate } = req.query;

      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId }
      });

      if (!portfolio) {
        return res.status(404).json({
          success: false,
          error: "Portfolio not found"
        });
      }

      // Build filter
      const where: any = { portfolioId };
      if (symbol) where.symbol = symbol;
      if (type) where.type = type;
      if (startDate || endDate) {
        where.executedAt = {};
        if (startDate) where.executedAt.gte = new Date(startDate as string);
        if (endDate) where.executedAt.lte = new Date(endDate as string);
      }

      // Get transactions
      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          orderBy: { executedAt: "desc" },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
          include: {
            holding: true
          }
        }),
        this.prisma.transaction.count({ where })
      ]);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error("Error fetching transactions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transactions"
      });
    }
  }

  /**
   * Update a transaction
   */
  async updateTransaction(req: Request, res: Response) {
    try {
      const { portfolioId, transactionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }
      
      const { type, symbol, quantity, price, fees, notes, executedAt } = req.body;

      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId }
      });

      if (!portfolio) {
        return res.status(404).json({
          success: false,
          error: "Portfolio not found"
        });
      }

      // Update transaction
      const transaction = await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          type: type as TransactionType,
          symbol,
          quantity: quantity ? parseFloat(quantity) : undefined,
          price: price ? parseFloat(price) : undefined,
          fees: fees !== undefined ? parseFloat(fees) : undefined,
          total: quantity && price ? (parseFloat(quantity) * parseFloat(price)) + (fees ? parseFloat(fees) : 0) : undefined,
          notes,
          executedAt: executedAt ? new Date(executedAt) : undefined
        }
      });

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error("Error updating transaction:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update transaction"
      });
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(req: Request, res: Response) {
    try {
      const { portfolioId, transactionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId }
      });

      if (!portfolio) {
        return res.status(404).json({
          success: false,
          error: "Portfolio not found"
        });
      }

      // Delete transaction
      await this.prisma.transaction.delete({
        where: { id: transactionId }
      });

      res.json({
        success: true,
        message: "Transaction deleted successfully"
      });
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete transaction"
      });
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(req: Request, res: Response) {
    try {
      const { portfolioId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      // Verify portfolio ownership
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: portfolioId, userId }
      });

      if (!portfolio) {
        return res.status(404).json({
          success: false,
          error: "Portfolio not found"
        });
      }

      // Get transaction statistics
      const transactions = await this.prisma.transaction.findMany({
        where: { portfolioId }
      });

      const stats = {
        totalTransactions: transactions.length,
        totalBuys: transactions.filter(t => t.type === "BUY").length,
        totalSells: transactions.filter(t => t.type === "SELL").length,
        totalDividends: transactions.filter(t => t.type === "DIVIDEND").length,
        totalInvested: transactions
          .filter(t => t.type === "BUY" || t.type === "TRANSFER_IN")
          .reduce((sum, t) => sum + t.total.toNumber(), 0),
        totalRealized: transactions
          .filter(t => t.type === "SELL" || t.type === "TRANSFER_OUT")
          .reduce((sum, t) => sum + t.total.toNumber(), 0),
        totalFees: transactions.reduce((sum, t) => sum + t.fees.toNumber(), 0),
        bySymbol: this.groupTransactionsBySymbol(transactions)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error("Error fetching transaction stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transaction statistics"
      });
    }
  }

  /**
   * Helper: Update holding after buy
   */
  private async updateHoldingAfterBuy(portfolioId: string, symbol: string, quantity: string, price: string) {
    const existingHolding = await this.prisma.holding.findFirst({
      where: { portfolioId, symbol }
    });

    if (existingHolding) {
      // Update existing holding with new average price
      const currentQty = existingHolding.quantity.toNumber();
      const currentAvg = existingHolding.averagePrice.toNumber();
      const newQty = parseFloat(quantity);
      const newPrice = parseFloat(price);
      
      const totalQty = currentQty + newQty;
      const newAvgPrice = ((currentQty * currentAvg) + (newQty * newPrice)) / totalQty;

      await this.prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: totalQty,
          averagePrice: newAvgPrice
        }
      });
    } else {
      // Create new holding
      await this.prisma.holding.create({
        data: {
          portfolioId,
          symbol,
          quantity: parseFloat(quantity),
          averagePrice: parseFloat(price)
        }
      });
    }
  }

  /**
   * Helper: Update holding after sell
   */
  private async updateHoldingAfterSell(portfolioId: string, symbol: string, quantity: string) {
    const existingHolding = await this.prisma.holding.findFirst({
      where: { portfolioId, symbol }
    });

    if (existingHolding) {
      const currentQty = existingHolding.quantity.toNumber();
      const sellQty = parseFloat(quantity);
      const newQty = currentQty - sellQty;

      if (newQty <= 0) {
        // Delete holding if quantity is 0 or negative
        await this.prisma.holding.delete({
          where: { id: existingHolding.id }
        });
      } else {
        // Update quantity
        await this.prisma.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQty
          }
        });
      }
    }
  }

  /**
   * Helper: Create portfolio snapshot
   */
  private async createPortfolioSnapshot(portfolioId: string) {
    try {
      // Get all holdings
      const holdings = await this.prisma.holding.findMany({
        where: { portfolioId }
      });

      // Calculate portfolio value (simplified - should get real prices)
      let totalValue = 0;
      let totalCost = 0;

      for (const holding of holdings) {
        const qty = holding.quantity.toNumber();
        const avgPrice = holding.averagePrice.toNumber();
        const currentPrice = avgPrice; // TODO: Get real current price
        
        totalValue += qty * currentPrice;
        totalCost += qty * avgPrice;
      }

      const totalReturn = totalValue - totalCost;
      const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

      // Calculate day change (simplified - using mock 2% change)
      const dayChange = totalValue * 0.02; // Mock 2% daily change
      const dayChangePercent = 2.0; // Mock 2% percentage

      // Create snapshot
      await this.prisma.portfolioSnapshot.create({
        data: {
          portfolioId,
          totalValue,
          totalCost,
          dayChange,
          dayChangePercent,
          totalReturn,
          totalReturnPercent
        }
      });
    } catch (error) {
      logger.error("Error creating portfolio snapshot:", error);
    }
  }

  /**
   * Helper: Group transactions by symbol
   */
  private groupTransactionsBySymbol(transactions: any[]) {
    const grouped: any = {};

    for (const tx of transactions) {
      if (!grouped[tx.symbol]) {
        grouped[tx.symbol] = {
          symbol: tx.symbol,
          totalBuys: 0,
          totalSells: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }

      if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
        grouped[tx.symbol].totalBuys++;
        grouped[tx.symbol].totalQuantity += tx.quantity.toNumber();
        grouped[tx.symbol].totalValue += tx.total.toNumber();
      } else if (tx.type === "SELL" || tx.type === "TRANSFER_OUT") {
        grouped[tx.symbol].totalSells++;
        grouped[tx.symbol].totalQuantity -= tx.quantity.toNumber();
        grouped[tx.symbol].totalValue -= tx.total.toNumber();
      }
    }

    return Object.values(grouped);
  }
}