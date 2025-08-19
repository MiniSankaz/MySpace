// Enums
export enum TradeType {
  BUY = "BUY",
  SELL = "SELL",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
}

export enum TradeStatus {
  PENDING = "PENDING",
  EXECUTED = "EXECUTED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export enum Market {
  // US Markets
  US = "US",
  NASDAQ = "NASDAQ",
  NYSE = "NYSE",
  NYSE_ARCA = "NYSE_ARCA",
  
  // Thai Market
  SET = "SET",
  MAI = "MAI",
  
  // Hong Kong
  HKSE = "HKSE",
  
  // Japan
  TSE = "TSE",
  
  // UK
  LSE = "LSE",
  
  // Singapore
  SGX = "SGX",
  
  // Australia
  ASX = "ASX",
  
  // Generic/Other
  OTC = "OTC",
  OTHER = "OTHER"
}

export enum Currency {
  USD = "USD",
  THB = "THB",
  HKD = "HKD",
  JPY = "JPY",
  GBP = "GBP",
  SGD = "SGD",
  AUD = "AUD",
  EUR = "EUR"
}

// Base interfaces
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  createdAt: Date;
  updatedAt: Date;
  positions?: PortfolioPosition[];
  trades?: Trade[];
  performance?: PortfolioPerformance[];
  _count?: {
    positions: number;
    trades: number;
  };
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  country: string;
  currency: Currency;
  sector?: string;
  currentPrice: number;
  previousClose?: number;
  dayChange?: number;
  dayChangePercent?: number;
  pe?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  volume?: number;
  avgVolume?: number;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
  priceHistory?: StockPriceHistory[];
}

export interface Trade {
  id: string;
  userId: string;
  portfolioId: string;
  stockSymbol: string;
  market: Market;
  type: TradeType;
  quantity: number;
  price: number;
  totalAmount: number;
  fees?: number;
  notes?: string;
  status: TradeStatus;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  portfolio?: Pick<Portfolio, "id" | "name">;
  stock?: Stock;
}

export interface PortfolioPosition {
  id: string;
  portfolioId: string;
  stockSymbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  weight: number;
  lastPriceUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
  stock?: Stock;
}

export interface PortfolioPerformance {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: number;
  dayReturn: number;
  dayReturnPercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockPriceHistory {
  id: string;
  stockSymbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types
export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  currency?: string;
  isDefault?: boolean;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface ExecuteTradeRequest {
  portfolioId: string;
  stockSymbol: string;
  market: Market;
  type: TradeType;
  quantity: number;
  price: number;
  fees?: number;
  notes?: string;
}

export interface TradeHistoryFilters {
  portfolioId?: string;
  stockSymbol?: string;
  market?: Market;
  type?: TradeType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface PortfolioSummary {
  portfolio: {
    id: string;
    name: string;
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    positionCount: number;
    lastUpdated: Date;
  };
  topGainers: PortfolioPosition[];
  topLosers: PortfolioPosition[];
  sectorAllocation: Record<
    string,
    {
      value: number;
      weight: number;
      count: number;
    }
  >;
  recentTrades: Trade[];
  performanceHistory: PortfolioPerformance[];
}

export interface TrendingStocks {
  gainers: Stock[];
  losers: Stock[];
  mostActive: Stock[];
}

export interface ImportTradesResult {
  successful: number;
  failed: number;
  errors: string[];
}

// Market utility functions and constants
export const MarketInfo = {
  [Market.US]: { name: 'United States', currency: Currency.USD, timezone: 'America/New_York', country: 'US' },
  [Market.NASDAQ]: { name: 'NASDAQ', currency: Currency.USD, timezone: 'America/New_York', country: 'US' },
  [Market.NYSE]: { name: 'New York Stock Exchange', currency: Currency.USD, timezone: 'America/New_York', country: 'US' },
  [Market.NYSE_ARCA]: { name: 'NYSE Arca', currency: Currency.USD, timezone: 'America/New_York', country: 'US' },
  [Market.SET]: { name: 'Stock Exchange of Thailand', currency: Currency.THB, timezone: 'Asia/Bangkok', country: 'TH' },
  [Market.MAI]: { name: 'Market for Alternative Investment', currency: Currency.THB, timezone: 'Asia/Bangkok', country: 'TH' },
  [Market.HKSE]: { name: 'Hong Kong Stock Exchange', currency: Currency.HKD, timezone: 'Asia/Hong_Kong', country: 'HK' },
  [Market.TSE]: { name: 'Tokyo Stock Exchange', currency: Currency.JPY, timezone: 'Asia/Tokyo', country: 'JP' },
  [Market.LSE]: { name: 'London Stock Exchange', currency: Currency.GBP, timezone: 'Europe/London', country: 'GB' },
  [Market.SGX]: { name: 'Singapore Exchange', currency: Currency.SGD, timezone: 'Asia/Singapore', country: 'SG' },
  [Market.ASX]: { name: 'Australian Securities Exchange', currency: Currency.AUD, timezone: 'Australia/Sydney', country: 'AU' },
  [Market.OTC]: { name: 'Over-the-Counter', currency: Currency.USD, timezone: 'America/New_York', country: 'US' },
  [Market.OTHER]: { name: 'Other', currency: Currency.USD, timezone: 'UTC', country: 'XX' }
} as const;

export const getMarketInfo = (market: Market) => {
  return MarketInfo[market] || MarketInfo[Market.OTHER];
};

export const getMarketCurrency = (market: Market): Currency => {
  return getMarketInfo(market).currency;
};

export const getMarketCountry = (market: Market): string => {
  return getMarketInfo(market).country;
};

export const isMarketOpen = (market: Market): boolean => {
  // Simplified market hours check - in real implementation would check actual trading hours
  const info = getMarketInfo(market);
  const now = new Date();
  const marketTime = new Date(now.toLocaleString('en-US', { timeZone: info.timezone }));
  const hour = marketTime.getHours();
  const day = marketTime.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Basic trading hours (simplified)
  switch (market) {
    case Market.NYSE:
    case Market.NASDAQ:
    case Market.NYSE_ARCA:
    case Market.US:
      return hour >= 9 && hour < 16; // 9:30 AM - 4:00 PM EST (simplified)
    case Market.SET:
    case Market.MAI:
      return hour >= 10 && hour < 16; // 10:00 AM - 4:30 PM ICT (simplified)
    default:
      return hour >= 9 && hour < 17; // Default business hours
  }
};

// Enhanced interfaces for multi-market support
export interface MarketQuoteRequest {
  symbol: string;
  market: Market;
}

export interface StockSearchRequest {
  query: string;
  market?: Market;
  limit?: number;
}

export interface AddStockToPortfolioRequest {
  symbol: string;
  market: Market;
  quantity: number;
  averagePrice: number;
}

// Mock database types for Prisma compatibility
export type Prisma = any;
