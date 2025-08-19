import { BaseServiceClient, ServiceResponse } from "./base-service-client";

// Portfolio Types
export interface Stock {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  timestamp: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  stock?: Stock;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  holdings: Holding[];
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  type: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  price: number;
  total: number;
  fees?: number;
  notes?: string;
  executedAt: string;
}

export interface CreatePortfolioDto {
  name: string;
  description?: string;
  initialCapital?: number;
}

export interface AddHoldingDto {
  symbol: string;
  quantity: number;
  price: number;
}

export interface TradeDto {
  type: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  price?: number; // If not provided, use current market price
  notes?: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  bestPerformer?: Holding;
  worstPerformer?: Holding;
  diversification: {
    sectors: { [key: string]: number };
    assetTypes: { [key: string]: number };
  };
}

export class PortfolioService extends BaseServiceClient {
  constructor() {
    super({
      name: "portfolio-service",
      baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000",
      timeout: 30000,
    });
  }

  // Portfolio CRUD operations
  async getPortfolios(userId: string): Promise<ServiceResponse<Portfolio[]>> {
    return this.get<Portfolio[]>(`/api/portfolios/user/${userId}`);
  }

  async getPortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    return this.get<Portfolio>(`/api/portfolios/${portfolioId}`);
  }

  async createPortfolio(
    userId: string,
    data: CreatePortfolioDto,
  ): Promise<ServiceResponse<Portfolio>> {
    return this.post<Portfolio>("/api/portfolios", { userId, ...data });
  }

  async updatePortfolio(
    portfolioId: string,
    data: Partial<CreatePortfolioDto>,
  ): Promise<ServiceResponse<Portfolio>> {
    return this.put<Portfolio>(`/api/portfolios/${portfolioId}`, data);
  }

  async deletePortfolio(portfolioId: string): Promise<ServiceResponse<void>> {
    return this.delete<void>(`/api/portfolios/${portfolioId}`);
  }

  // Holdings management
  async getHoldings(portfolioId: string): Promise<ServiceResponse<Holding[]>> {
    return this.get<Holding[]>(`/api/portfolios/${portfolioId}/holdings`);
  }

  async addHolding(
    portfolioId: string,
    data: AddHoldingDto,
  ): Promise<ServiceResponse<Holding>> {
    return this.post<Holding>(`/api/portfolios/${portfolioId}/holdings`, data);
  }

  async updateHolding(
    portfolioId: string,
    holdingId: string,
    quantity: number,
  ): Promise<ServiceResponse<Holding>> {
    return this.patch<Holding>(
      `/api/portfolios/${portfolioId}/holdings/${holdingId}`,
      { quantity },
    );
  }

  async removeHolding(
    portfolioId: string,
    holdingId: string,
  ): Promise<ServiceResponse<void>> {
    return this.delete<void>(
      `/api/portfolios/${portfolioId}/holdings/${holdingId}`,
    );
  }

  // Trading operations
  async executeTrade(
    portfolioId: string,
    trade: TradeDto,
  ): Promise<ServiceResponse<Transaction>> {
    return this.post<Transaction>(
      `/api/portfolios/${portfolioId}/trades`,
      trade,
    );
  }

  async getTransactions(
    portfolioId: string,
    limit?: number,
    offset?: number,
  ): Promise<ServiceResponse<Transaction[]>> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    return this.get<Transaction[]>(
      `/api/portfolios/${portfolioId}/transactions?${params}`,
    );
  }

  // Analytics and metrics
  async getPortfolioMetrics(
    portfolioId: string,
  ): Promise<ServiceResponse<PortfolioMetrics>> {
    return this.get<PortfolioMetrics>(`/api/portfolios/${portfolioId}/metrics`);
  }

  async getPerformanceHistory(
    portfolioId: string,
    period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL",
  ): Promise<ServiceResponse<any[]>> {
    return this.get<any[]>(
      `/api/portfolios/${portfolioId}/performance?period=${period}`,
    );
  }

  // Market data
  async getStockQuote(symbol: string): Promise<ServiceResponse<Stock>> {
    return this.get<Stock>(`/api/market/quote/${symbol}`);
  }

  async getMultipleQuotes(
    symbols: string[],
  ): Promise<ServiceResponse<Stock[]>> {
    return this.post<Stock[]>("/api/market/quotes", { symbols });
  }

  async searchStocks(query: string): Promise<ServiceResponse<Stock[]>> {
    return this.get<Stock[]>(
      `/api/market/search?q=${encodeURIComponent(query)}`,
    );
  }

  // Watchlist
  async getWatchlist(userId: string): Promise<ServiceResponse<Stock[]>> {
    return this.get<Stock[]>(`/api/watchlist/user/${userId}`);
  }

  async addToWatchlist(
    userId: string,
    symbol: string,
  ): Promise<ServiceResponse<void>> {
    return this.post<void>("/api/watchlist", { userId, symbol });
  }

  async removeFromWatchlist(
    userId: string,
    symbol: string,
  ): Promise<ServiceResponse<void>> {
    return this.delete<void>(`/api/watchlist/${userId}/${symbol}`);
  }

  // Real-time subscriptions
  subscribeToPortfolio(
    portfolioId: string,
    callback: (data: any) => void,
  ): () => void {
    const ws = new WebSocket(
      `${this.config.baseURL.replace("http", "ws")}/ws/portfolio/${portfolioId}`,
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Return cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }

  subscribeToStock(
    symbol: string,
    callback: (data: Stock) => void,
  ): () => void {
    const ws = new WebSocket(
      `${this.config.baseURL.replace("http", "ws")}/ws/market/${symbol}`,
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Return cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }
}

// Singleton instance
export const portfolioService = new PortfolioService();
