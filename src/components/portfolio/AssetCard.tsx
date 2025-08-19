import React from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Wallet,
  MoreVertical,
  Star,
  AlertCircle,
  Info,
} from "lucide-react";

interface Asset {
  symbol: string;
  name: string;
  currentPrice: number;
  quantity: number;
  totalValue: number;
  averageCost: number;
  change: number;
  changePercent: number;
  dayChange: number;
  dayChangePercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocation: number;
  currency?: string;
}

interface AssetCardProps {
  asset: Asset;
  onBuy?: () => void;
  onSell?: () => void;
  showChart?: boolean;
  compact?: boolean;
  variant?: "card" | "list";
  onViewDetails?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  className?: string;
}

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onBuy,
  onSell,
  showChart = false,
  compact = false,
  variant = "card",
  onViewDetails,
  onToggleFavorite,
  isFavorite = false,
  className,
}) => {
  const formatCurrency = (value: number, currency = "USD") => {
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

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getBgChangeColor = (value: number) => {
    if (value > 0) return "bg-green-100 dark:bg-green-900/30";
    if (value < 0) return "bg-red-100 dark:bg-red-900/30";
    return "bg-gray-100 dark:bg-gray-700/30";
  };

  // Mock chart data
  const generateMockChart = () => {
    const points = 20;
    const trend = asset.changePercent > 0 ? 1 : -1;
    return Array.from({ length: points }, (_, i) => {
      const base = 50;
      const variation = Math.sin(i / 3) * 20 + Math.random() * 10;
      return base + variation * trend + i * trend;
    });
  };

  const chartData = generateMockChart();
  const chartColor = asset.changePercent > 0 ? "#10B981" : "#EF4444";

  if (variant === "list") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 bg-white dark:bg-gray-800",
          "border-b border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
          onViewDetails && "cursor-pointer",
          className,
        )}
        onClick={onViewDetails}
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {asset.symbol.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {asset.symbol}
              </h4>
              {isFavorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {asset.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(asset.currentPrice)}
            </p>
            <p
              className={cn("text-sm", getChangeColor(asset.dayChangePercent))}
            >
              {formatPercent(asset.dayChangePercent)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
            <p className="font-medium">{asset.quantity}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Value
            </p>
            <p className="font-semibold">{formatCurrency(asset.totalValue)}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">P&L</p>
            <p
              className={cn(
                "font-semibold",
                getChangeColor(asset.unrealizedPnL),
              )}
            >
              {formatCurrency(asset.unrealizedPnL)}
            </p>
          </div>

          <div className="flex items-center space-x-1">
            {onBuy && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy();
                }}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Buy
              </button>
            )}
            {onSell && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSell();
                }}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Sell
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
        "hover:shadow-md transition-shadow",
        onViewDetails && "cursor-pointer",
        className,
      )}
      onClick={onViewDetails}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {asset.symbol.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {asset.symbol}
                </h3>
                {onToggleFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        isFavorite
                          ? "text-yellow-500 fill-current"
                          : "text-gray-400 hover:text-yellow-500",
                      )}
                    />
                  </button>
                )}
              </div>
              {!compact && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {asset.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Price and Change */}
        <div className="mb-4">
          <div className="flex items-end justify-between mb-1">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(asset.currentPrice)}
            </p>
            <div
              className={cn(
                "px-2 py-1 rounded flex items-center space-x-1",
                getBgChangeColor(asset.dayChangePercent),
              )}
            >
              {asset.dayChangePercent > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : asset.dayChangePercent < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              <span
                className={cn(
                  "text-sm font-medium",
                  getChangeColor(asset.dayChangePercent),
                )}
              >
                {formatPercent(asset.dayChangePercent)}
              </span>
            </div>
          </div>
          <p className={cn("text-sm", getChangeColor(asset.dayChange))}>
            {asset.dayChange > 0 ? "+" : ""}
            {formatCurrency(asset.dayChange)} today
          </p>
        </div>

        {/* Mini Chart */}
        {showChart && !compact && (
          <div className="h-16 mb-4">
            <svg viewBox="0 0 100 40" className="w-full h-full">
              <polyline
                points={chartData
                  .map((y, x) => `${x * 5},${40 - y * 0.4}`)
                  .join(" ")}
                fill="none"
                stroke={chartColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Holdings Info */}
        {!compact && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Quantity</span>
              <span className="font-medium">{asset.quantity} shares</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Avg Cost</span>
              <span className="font-medium">
                {formatCurrency(asset.averageCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Total Value
              </span>
              <span className="font-semibold">
                {formatCurrency(asset.totalValue)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Unrealized P&L
              </span>
              <span
                className={cn(
                  "font-semibold",
                  getChangeColor(asset.unrealizedPnL),
                )}
              >
                {formatCurrency(asset.unrealizedPnL)} (
                {formatPercent(asset.unrealizedPnLPercent)})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Portfolio %
              </span>
              <span className="font-medium">
                {asset.allocation.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {onBuy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBuy();
              }}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Buy</span>
            </button>
          )}
          {onSell && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSell();
              }}
              className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Wallet className="h-4 w-4" />
              <span>Sell</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock data
export const mockAsset: Asset = {
  symbol: "AAPL",
  name: "Apple Inc.",
  currentPrice: 178.25,
  quantity: 100,
  totalValue: 17825.0,
  averageCost: 150.0,
  change: 3.45,
  changePercent: 1.97,
  dayChange: 3.45,
  dayChangePercent: 1.97,
  unrealizedPnL: 2825.0,
  unrealizedPnLPercent: 18.83,
  allocation: 15.5,
  currency: "USD",
};

export default AssetCard;
