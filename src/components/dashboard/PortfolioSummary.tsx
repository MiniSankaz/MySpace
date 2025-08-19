import React from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  PieChart,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

interface Asset {
  symbol: string;
  name: string;
  value: number;
  quantity: number;
  change: number;
  changePercent: number;
  allocation: number;
}

interface PortfolioSummaryProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  topGainers?: Asset[];
  topLosers?: Asset[];
  assetAllocation?: {
    stocks: number;
    crypto: number;
    bonds: number;
    cash: number;
    other: number;
  };
  loading?: boolean;
  error?: string;
  currency?: string;
  onViewDetails?: () => void;
  onQuickTrade?: () => void;
  className?: string;
  compact?: boolean;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  dayChange,
  dayChangePercent,
  totalGainLoss,
  totalGainLossPercent,
  topGainers = [],
  topLosers = [],
  assetAllocation,
  loading = false,
  error,
  currency = "USD",
  onViewDetails,
  onQuickTrade,
  className,
  compact = false,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4" />;
    if (value < 0) return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6",
          className,
        )}
      >
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6",
          className,
        )}
      >
        <div className="flex flex-col items-center justify-center h-48">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
        className,
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Portfolio Summary
          </h3>
          <div className="flex space-x-2">
            {onQuickTrade && (
              <button
                onClick={onQuickTrade}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Quick Trade
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                View Details
              </button>
            )}
          </div>
        </div>

        {/* Total Value */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Total Value
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="text-right">
              <div
                className={cn("flex items-center", getChangeColor(dayChange))}
              >
                {getChangeIcon(dayChange)}
                <span className="ml-1 text-lg font-semibold">
                  {formatCurrency(Math.abs(dayChange))}
                </span>
              </div>
              <p className={cn("text-sm", getChangeColor(dayChangePercent))}>
                {formatPercent(dayChangePercent)} today
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Gain/Loss
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                getChangeColor(totalGainLoss),
              )}
            >
              {formatCurrency(totalGainLoss)}
            </p>
            <p className={cn("text-sm", getChangeColor(totalGainLossPercent))}>
              {formatPercent(totalGainLossPercent)}
            </p>
          </div>

          {assetAllocation && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Diversification
              </p>
              <div className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                  <span className="font-semibold">
                    {Object.keys(assetAllocation).length}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    asset types
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!compact && (
          <>
            {/* Top Movers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Top Gainers */}
              {topGainers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Top Gainers
                  </h4>
                  <div className="space-y-2">
                    {topGainers.slice(0, 3).map((asset) => (
                      <div
                        key={asset.symbol}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium">
                            {asset.symbol}
                          </span>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {formatPercent(asset.changePercent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Losers */}
              {topLosers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Top Losers
                  </h4>
                  <div className="space-y-2">
                    {topLosers.slice(0, 3).map((asset) => (
                      <div
                        key={asset.symbol}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium">
                            {asset.symbol}
                          </span>
                        </div>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {formatPercent(asset.changePercent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Asset Allocation */}
            {assetAllocation && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Asset Allocation
                </h4>
                <div className="space-y-2">
                  {Object.entries(assetAllocation).map(([type, percentage]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-gray-600 dark:text-gray-400">
                          {type}
                        </span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Mock data for display
export const mockPortfolioData = {
  totalValue: 125432.5,
  dayChange: 2341.2,
  dayChangePercent: 1.89,
  totalGainLoss: 15432.5,
  totalGainLossPercent: 14.02,
  topGainers: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      value: 15000,
      quantity: 100,
      change: 500,
      changePercent: 3.45,
      allocation: 12,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      value: 25000,
      quantity: 50,
      change: 800,
      changePercent: 3.31,
      allocation: 20,
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      value: 18000,
      quantity: 60,
      change: 400,
      changePercent: 2.27,
      allocation: 14,
    },
  ],
  topLosers: [
    {
      symbol: "META",
      name: "Meta Platforms",
      value: 12000,
      quantity: 40,
      change: -300,
      changePercent: -2.44,
      allocation: 10,
    },
    {
      symbol: "AMZN",
      name: "Amazon",
      value: 20000,
      quantity: 150,
      change: -250,
      changePercent: -1.23,
      allocation: 16,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      value: 15000,
      quantity: 100,
      change: -150,
      changePercent: -0.99,
      allocation: 12,
    },
  ],
  assetAllocation: {
    stocks: 65,
    crypto: 15,
    bonds: 10,
    cash: 5,
    other: 5,
  },
};

export default PortfolioSummary;
