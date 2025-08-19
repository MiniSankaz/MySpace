/**
 * Portfolio Service
 */
import apiClient from "./gateway.client";

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  positions: Position[];
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
}

export interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: Date;
}

class PortfolioService {
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await apiClient.get<Portfolio[]>("/portfolios");
    return response.data || [];
  }

  async getPortfolio(id: string): Promise<Portfolio> {
    const response = await apiClient.get<Portfolio>(`/portfolios/${id}`);
    return response.data!;
  }

  async createTrade(trade: Omit<Trade, "id" | "timestamp">): Promise<Trade> {
    const response = await apiClient.post<Trade>("/trades", trade);
    return response.data!;
  }

  async getStockPrice(
    symbol: string,
  ): Promise<{ symbol: string; price: number }> {
    const response = await apiClient.get<{ symbol: string; price: number }>(
      `/stocks/${symbol}/price`,
    );
    return response.data!;
  }
}

export default new PortfolioService();
