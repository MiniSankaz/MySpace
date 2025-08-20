import {
  Portfolio,
  Stock,
  Trade,
  PortfolioPosition,
  PortfolioPerformance,
  StockPriceHistory,
  TradeType,
  TradeStatus,
  Market,
  Currency,
} from "./index";

// In-memory storage
class MockDatabase {
  private portfolios: Map<string, Portfolio> = new Map();
  private stocks: Map<string, Stock> = new Map();
  private trades: Map<string, Trade> = new Map();
  private positions: Map<string, PortfolioPosition> = new Map();
  private performance: Map<string, PortfolioPerformance> = new Map();
  private priceHistory: Map<string, StockPriceHistory> = new Map();

  // Generate unique IDs
  private generateId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Portfolio operations
  portfolio = {
    findMany: async (options?: any) => {
      const portfolios = Array.from(this.portfolios.values());
      let filtered = portfolios;

      if (options?.where) {
        filtered = portfolios.filter((p) => {
          if (options.where.userId && p.userId !== options.where.userId)
            return false;
          if (
            options.where.isActive !== undefined &&
            p.isActive !== options.where.isActive
          )
            return false;
          return true;
        });
      }

      if (options?.orderBy?.isDefault) {
        filtered.sort((a, b) => {
          if (options.orderBy.isDefault === "desc") {
            return b.isDefault === a.isDefault ? 0 : b.isDefault ? 1 : -1;
          }
          return a.isDefault === b.isDefault ? 0 : a.isDefault ? 1 : -1;
        });
      }

      // Include related data
      if (options?.include) {
        filtered = filtered.map((p) => ({
          ...p,
          positions: options.include.positions
            ? this.getPortfolioPositions(p.id)
            : undefined,
          trades: options.include.trades
            ? this.getPortfolioTrades(p.id)
            : undefined,
          performance: options.include.performance
            ? this.getPortfolioPerformance(p.id)
            : undefined,
          _count: options.include._count
            ? {
                positions: this.getPortfolioPositions(p.id).length,
                trades: this.getPortfolioTrades(p.id).length,
              }
            : undefined,
        }));
      }

      return filtered;
    },

    findFirst: async (options?: any) => {
      const portfolios = await this.portfolio.findMany(options);
      return portfolios[0] || null;
    },

    findUnique: async (options?: any) => {
      if (options?.where?.id) {
        return this.portfolios.get(options.where.id) || null;
      }
      return null;
    },

    create: async (options: any) => {
      const id = this.generateId();
      const now = new Date();
      const portfolio: Portfolio = {
        id,
        ...options.data,
        createdAt: now,
        updatedAt: now,
      };
      this.portfolios.set(id, portfolio);
      return portfolio;
    },

    update: async (options: any) => {
      const portfolio = this.portfolios.get(options.where.id);
      if (!portfolio) throw new Error("Portfolio not found");

      const updated = {
        ...portfolio,
        ...options.data,
        updatedAt: new Date(),
      };
      this.portfolios.set(options.where.id, updated);
      return updated;
    },

    updateMany: async (options: any) => {
      let count = 0;
      for (const [id, portfolio] of this.portfolios) {
        let matches = true;
        if (options.where) {
          if (options.where.userId && portfolio.userId !== options.where.userId)
            matches = false;
          if (options.where.id?.not && portfolio.id === options.where.id.not)
            matches = false;
        }

        if (matches) {
          this.portfolios.set(id, {
            ...portfolio,
            ...options.data,
            updatedAt: new Date(),
          });
          count++;
        }
      }
      return { count };
    },

    count: async (options?: any) => {
      const portfolios = await this.portfolio.findMany(options);
      return portfolios.length;
    },
  };

  // Stock operations
  stock = {
    findMany: async (options?: any) => {
      const stocks = Array.from(this.stocks.values());
      let filtered = stocks;

      if (options?.where) {
        filtered = stocks.filter((s) => {
          if (options.where.OR) {
            return options.where.OR.some((condition: any) => {
              if (condition.symbol?.contains) {
                return s.symbol
                  .toLowerCase()
                  .includes(condition.symbol.contains.toLowerCase());
              }
              if (condition.name?.contains) {
                return s.name
                  .toLowerCase()
                  .includes(condition.name.contains.toLowerCase());
              }
              return false;
            });
          }
          if (options.where.dayChangePercent?.gt !== undefined) {
            return (
              s.dayChangePercent !== undefined &&
              s.dayChangePercent > options.where.dayChangePercent.gt
            );
          }
          if (options.where.dayChangePercent?.lt !== undefined) {
            return (
              s.dayChangePercent !== undefined &&
              s.dayChangePercent < options.where.dayChangePercent.lt
            );
          }
          return true;
        });
      }

      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const direction = options.orderBy[key];
        filtered.sort((a: any, b: any) => {
          if (direction === "desc") return (b[key] || 0) - (a[key] || 0);
          return (a[key] || 0) - (b[key] || 0);
        });
      }

      if (options?.take) {
        filtered = filtered.slice(0, options.take);
      }

      return filtered;
    },

    findUnique: async (options?: any) => {
      if (options?.where?.symbol) {
        const stock = this.stocks.get(options.where.symbol);
        if (stock && options?.include?.priceHistory) {
          return {
            ...stock,
            priceHistory: this.getStockPriceHistory(stock.symbol),
          };
        }
        return stock || null;
      }
      return null;
    },

    create: async (options: any) => {
      const now = new Date();
      const stock: Stock = {
        ...options.data,
        createdAt: now,
        updatedAt: now,
      };
      this.stocks.set(stock.symbol, stock);
      return stock;
    },

    update: async (options: any) => {
      const stock = this.stocks.get(options.where.symbol);
      if (!stock) throw new Error("Stock not found");

      const updated = {
        ...stock,
        ...options.data,
        updatedAt: new Date(),
      };
      this.stocks.set(options.where.symbol, updated);
      return updated;
    },

    upsert: async (options: any) => {
      const existing = this.stocks.get(options.where.symbol);
      if (existing) {
        return this.stock.update({
          where: options.where,
          data: options.update,
        });
      } else {
        return this.stock.create({ data: options.create });
      }
    },
  };

  // Trade operations
  trade = {
    findMany: async (options?: any) => {
      const trades = Array.from(this.trades.values());
      let filtered = trades;

      if (options?.where) {
        filtered = trades.filter((t) => {
          if (options.where.userId && t.userId !== options.where.userId)
            return false;
          if (
            options.where.portfolioId &&
            t.portfolioId !== options.where.portfolioId
          )
            return false;
          if (
            options.where.stockSymbol &&
            t.stockSymbol !== options.where.stockSymbol
          )
            return false;
          if (options.where.type && t.type !== options.where.type) return false;
          if (options.where.status && t.status !== options.where.status)
            return false;
          if (
            options.where.executedAt?.gte &&
            t.executedAt &&
            t.executedAt < options.where.executedAt.gte
          )
            return false;
          if (
            options.where.executedAt?.lte &&
            t.executedAt &&
            t.executedAt > options.where.executedAt.lte
          )
            return false;
          return true;
        });
      }

      if (options?.orderBy?.executedAt) {
        filtered.sort((a, b) => {
          const aDate = a.executedAt || a.createdAt;
          const bDate = b.executedAt || b.createdAt;
          if (options.orderBy.executedAt === "desc") {
            return bDate.getTime() - aDate.getTime();
          }
          return aDate.getTime() - bDate.getTime();
        });
      }

      if (options?.take) {
        filtered = filtered.slice(0, options.take);
      }

      if (options?.skip) {
        filtered = filtered.slice(options.skip);
      }

      // Include related data
      if (options?.include) {
        filtered = filtered.map((t) => ({
          ...t,
          portfolio: options.include.portfolio
            ? this.portfolios.get(t.portfolioId)
            : undefined,
          stock: options.include.stock
            ? this.stocks.get(t.stockSymbol)
            : undefined,
        }));
      }

      return filtered;
    },

    findFirst: async (options?: any) => {
      const trades = await this.trade.findMany(options);
      return trades[0] || null;
    },

    create: async (options: any) => {
      const id = this.generateId();
      const now = new Date();
      const trade: Trade = {
        id,
        ...options.data,
        createdAt: now,
        updatedAt: now,
      };
      this.trades.set(id, trade);
      return trade;
    },

    update: async (options: any) => {
      const trade = this.trades.get(options.where.id);
      if (!trade) throw new Error("Trade not found");

      const updated = {
        ...trade,
        ...options.data,
        updatedAt: new Date(),
      };
      this.trades.set(options.where.id, updated);
      return updated;
    },

    count: async (options?: any) => {
      const trades = await this.trade.findMany(options);
      return trades.length;
    },
  };

  // Portfolio Position operations
  portfolioPosition = {
    findMany: async (options?: any) => {
      const positions = Array.from(this.positions.values());
      let filtered = positions;

      if (options?.where) {
        filtered = positions.filter((p) => {
          if (
            options.where.portfolioId &&
            p.portfolioId !== options.where.portfolioId
          )
            return false;
          return true;
        });
      }

      if (options?.include?.stock) {
        filtered = filtered.map((p) => ({
          ...p,
          stock: this.stocks.get(p.stockSymbol),
        }));
      }

      return filtered;
    },

    findUnique: async (options?: any) => {
      if (options?.where?.portfolioId_stockSymbol) {
        const { portfolioId, stockSymbol } =
          options.where.portfolioId_stockSymbol;
        const position = Array.from(this.positions.values()).find(
          (p) => p.portfolioId === portfolioId && p.stockSymbol === stockSymbol,
        );
        return position || null;
      }
      return null;
    },

    create: async (options: any) => {
      const id = this.generateId();
      const now = new Date();
      const position: PortfolioPosition = {
        id,
        ...options.data,
        createdAt: now,
        updatedAt: now,
      };
      this.positions.set(id, position);
      return position;
    },

    update: async (options: any) => {
      const position = this.positions.get(options.where.id);
      if (!position) throw new Error("Position not found");

      const updated = {
        ...position,
        ...options.data,
        updatedAt: new Date(),
      };
      this.positions.set(options.where.id, updated);
      return updated;
    },

    delete: async (options: any) => {
      const position = this.positions.get(options.where.id);
      if (!position) throw new Error("Position not found");
      this.positions.delete(options.where.id);
      return position;
    },
  };

  // Portfolio Performance operations
  portfolioPerformance = {
    upsert: async (options: any) => {
      const key = `${options.where.portfolioId_date.portfolioId}_${options.where.portfolioId_date.date.toISOString()}`;
      const existing = this.performance.get(key);

      if (existing) {
        const updated = {
          ...existing,
          ...options.update,
          updatedAt: new Date(),
        };
        this.performance.set(key, updated);
        return updated;
      } else {
        const id = this.generateId();
        const now = new Date();
        const performance: PortfolioPerformance = {
          id,
          ...options.create,
          createdAt: now,
          updatedAt: now,
        };
        this.performance.set(key, performance);
        return performance;
      }
    },
  };

  // Stock Price History operations
  stockPriceHistory = {
    findMany: async (options?: any) => {
      const history = Array.from(this.priceHistory.values());
      let filtered = history;

      if (options?.where) {
        filtered = history.filter((h) => {
          if (
            options.where.stockSymbol &&
            h.stockSymbol !== options.where.stockSymbol
          )
            return false;
          if (options.where.date?.gte && h.date < options.where.date.gte)
            return false;
          if (options.where.date?.lte && h.date > options.where.date.lte)
            return false;
          return true;
        });
      }

      if (options?.orderBy?.date) {
        filtered.sort((a, b) => {
          if (options.orderBy.date === "desc") {
            return b.date.getTime() - a.date.getTime();
          }
          return a.date.getTime() - b.date.getTime();
        });
      }

      return filtered;
    },

    upsert: async (options: any) => {
      const key = `${options.where.stockSymbol_date.stockSymbol}_${options.where.stockSymbol_date.date.toISOString()}`;
      const existing = this.priceHistory.get(key);

      if (existing) {
        const updated = {
          ...existing,
          ...options.update,
          updatedAt: new Date(),
        };
        this.priceHistory.set(key, updated);
        return updated;
      } else {
        const id = this.generateId();
        const now = new Date();
        const history: StockPriceHistory = {
          id,
          ...options.create,
          createdAt: now,
          updatedAt: now,
        };
        this.priceHistory.set(key, history);
        return history;
      }
    },
  };

  // Transaction support (mock)
  $transaction = async (operations: any[]) => {
    const results = [];
    for (const op of operations) {
      results.push(await op);
    }
    return results;
  };

  // Helper methods
  private getPortfolioPositions(portfolioId: string): PortfolioPosition[] {
    return Array.from(this.positions.values()).filter(
      (p) => p.portfolioId === portfolioId,
    );
  }

  private getPortfolioTrades(portfolioId: string): Trade[] {
    return Array.from(this.trades.values())
      .filter((t) => t.portfolioId === portfolioId)
      .sort(
        (a, b) =>
          (b.executedAt || b.createdAt).getTime() -
          (a.executedAt || a.createdAt).getTime(),
      )
      .slice(0, 10);
  }

  private getPortfolioPerformance(portfolioId: string): PortfolioPerformance[] {
    return Array.from(this.performance.values())
      .filter((p) => p.portfolioId === portfolioId)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);
  }

  private getStockPriceHistory(symbol: string): StockPriceHistory[] {
    return Array.from(this.priceHistory.values())
      .filter((h) => h.stockSymbol === symbol)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);
  }

  // Initialize with some mock data
  initializeMockData() {
    // Initialize some mock stocks
    const mockStocks = [
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
    ];

    const now = new Date();
    mockStocks.forEach((mockStock) => {
      const stock: Stock = {
        symbol: mockStock.symbol,
        name: mockStock.name,
        exchange: mockStock.exchange,
        market: Market.US,
        country: 'US',
        currency: Currency.USD,
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
        createdAt: now,
        updatedAt: now,
      };
      this.stocks.set(stock.symbol, stock);
    });
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();

// Mock PrismaClient
export class MockPrismaClient {
  portfolio = mockDb.portfolio;
  stock = mockDb.stock;
  trade = mockDb.trade;
  portfolioPosition = mockDb.portfolioPosition;
  portfolioPerformance = mockDb.portfolioPerformance;
  stockPriceHistory = mockDb.stockPriceHistory;
  $transaction = mockDb.$transaction;

  constructor() {
    // Initialize mock data when client is created
    mockDb.initializeMockData();
  }
}

// For backward compatibility
export { MockPrismaClient as PrismaClient };
