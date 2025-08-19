import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Info,
  AlertCircle,
  Check,
  X,
  Search,
  Loader2,
} from "lucide-react";

interface TradeFormProps {
  symbol?: string;
  currentPrice?: number;
  availableBalance?: number;
  currentPosition?: {
    quantity: number;
    averageCost: number;
  };
  onSubmit: (trade: TradeOrder) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
  defaultType?: "buy" | "sell";
  showAdvanced?: boolean;
}

export interface TradeOrder {
  symbol: string;
  type: "buy" | "sell";
  orderType: "market" | "limit" | "stop" | "stop-limit";
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: "day" | "gtc" | "ioc" | "fok";
  total: number;
}

const TradeForm: React.FC<TradeFormProps> = ({
  symbol: initialSymbol = "",
  currentPrice = 0,
  availableBalance = 0,
  currentPosition,
  onSubmit,
  onCancel,
  loading = false,
  error,
  className,
  defaultType = "buy",
  showAdvanced = true,
}) => {
  const [tradeType, setTradeType] = useState<"buy" | "sell">(defaultType);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [orderType, setOrderType] = useState<TradeOrder["orderType"]>("market");
  const [quantity, setQuantity] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [timeInForce, setTimeInForce] =
    useState<TradeOrder["timeInForce"]>("day");
  const [showPreview, setShowPreview] = useState(false);

  const price =
    orderType === "market" ? currentPrice : parseFloat(limitPrice) || 0;
  const qty = parseFloat(quantity) || 0;
  const total = price * qty;
  const commission = total * 0.001; // 0.1% commission
  const totalWithCommission =
    total + (tradeType === "buy" ? commission : -commission);

  const canTrade =
    tradeType === "buy"
      ? totalWithCommission <= availableBalance
      : currentPosition && qty <= currentPosition.quantity;

  const maxQuantity =
    tradeType === "buy"
      ? Math.floor(availableBalance / (price * 1.001))
      : currentPosition?.quantity || 0;

  useEffect(() => {
    if (orderType === "market" && currentPrice) {
      setLimitPrice(currentPrice.toString());
    }
  }, [orderType, currentPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !qty || qty <= 0) return;

    const order: TradeOrder = {
      symbol,
      type: tradeType,
      orderType,
      quantity: qty,
      price: orderType !== "market" ? parseFloat(limitPrice) : currentPrice,
      stopPrice: ["stop", "stop-limit"].includes(orderType)
        ? parseFloat(stopPrice)
        : undefined,
      timeInForce,
      total: totalWithCommission,
    };

    if (showPreview) {
      setShowPreview(false);
      onSubmit(order);
    } else {
      setShowPreview(true);
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const max = maxQuantity;
    const amount = Math.floor(max * percentage);
    setQuantity(amount.toString());
  };

  const getPotentialPnL = () => {
    if (!currentPosition || tradeType !== "sell") return null;

    const proceeds = qty * price;
    const cost = qty * currentPosition.averageCost;
    const pnl = proceeds - cost;
    const pnlPercent =
      ((price - currentPosition.averageCost) / currentPosition.averageCost) *
      100;

    return { pnl, pnlPercent };
  };

  const potentialPnL = getPotentialPnL();

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <form onSubmit={handleSubmit}>
        {/* Trade Type Selector */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTradeType("buy")}
            className={cn(
              "flex-1 py-3 text-center font-medium transition-colors",
              tradeType === "buy"
                ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-b-2 border-green-600"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setTradeType("sell")}
            className={cn(
              "flex-1 py-3 text-center font-medium transition-colors",
              tradeType === "sell"
                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-b-2 border-red-600"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            Sell
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Symbol Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {currentPrice > 0 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Current Price: ${currentPrice.toFixed(2)}
              </p>
            )}
          </div>

          {/* Order Type */}
          {showAdvanced && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) =>
                  setOrderType(e.target.value as TradeOrder["orderType"])
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="market">Market Order</option>
                <option value="limit">Limit Order</option>
                <option value="stop">Stop Order</option>
                <option value="stop-limit">Stop-Limit Order</option>
              </select>
            </div>
          )}

          {/* Limit Price */}
          {orderType !== "market" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {orderType === "stop" ? "Stop Price" : "Limit Price"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          )}

          {/* Stop Price for Stop-Limit */}
          {orderType === "stop-limit" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stop Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="1"
              max={maxQuantity}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
            <div className="mt-2 flex space-x-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickAmount(pct / 100)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {pct}%
                </button>
              ))}
            </div>
            {tradeType === "sell" && currentPosition && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Available: {currentPosition.quantity} shares
              </p>
            )}
          </div>

          {/* Time in Force */}
          {showAdvanced && orderType !== "market" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time in Force
              </label>
              <select
                value={timeInForce}
                onChange={(e) =>
                  setTimeInForce(e.target.value as TradeOrder["timeInForce"])
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="day">Day</option>
                <option value="gtc">Good Till Cancelled</option>
                <option value="ioc">Immediate or Cancel</option>
                <option value="fok">Fill or Kill</option>
              </select>
            </div>
          )}

          {/* Order Summary */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Summary
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Estimated Total
                </span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Commission
                </span>
                <span className="font-medium">${commission.toFixed(2)}</span>
              </div>
              <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Total Cost</span>
                  <span className="font-bold text-lg">
                    ${Math.abs(totalWithCommission).toFixed(2)}
                  </span>
                </div>
              </div>

              {potentialPnL && (
                <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Potential P&L
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        potentialPnL.pnl >= 0
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      ${potentialPnL.pnl.toFixed(2)} (
                      {potentialPnL.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Balance Check */}
          {tradeType === "buy" && (
            <div
              className={cn(
                "p-3 rounded flex items-center space-x-2",
                canTrade
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
              )}
            >
              {canTrade ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Sufficient balance available</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Insufficient balance</span>
                </>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Preview Confirmation */}
          {showPreview && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                Please review your order before submitting:
              </p>
              <ul className="text-sm space-y-1">
                <li>
                  • {tradeType.toUpperCase()} {quantity} shares of {symbol}
                </li>
                <li>• Order Type: {orderType.toUpperCase()}</li>
                <li>• Price: ${price.toFixed(2)}</li>
                <li>• Total: ${Math.abs(totalWithCommission).toFixed(2)}</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !canTrade || !symbol || qty <= 0}
              className={cn(
                "flex-1 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50",
                tradeType === "buy"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700",
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : showPreview ? (
                `Confirm ${tradeType.toUpperCase()}`
              ) : (
                `Preview ${tradeType.toUpperCase()}`
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
