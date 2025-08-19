"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Order {
  id: string;
  portfolioId: string;
  type: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  symbol: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: "PENDING" | "EXECUTED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  executedAt?: string;
  total?: number;
  fees?: number;
}

interface OrderManagementProps {
  portfolioId: string;
  onOrderSubmit?: (order: Partial<Order>) => void;
  orders?: Order[];
  loading?: boolean;
}

export default function OrderManagement({
  portfolioId,
  onOrderSubmit,
  orders = [],
  loading = false,
}: OrderManagementProps) {
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [orderMethod, setOrderMethod] = useState<"MARKET" | "LIMIT">("MARKET");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOrderSubmit) {
      onOrderSubmit({
        portfolioId,
        type: orderType,
        orderType: orderMethod,
        symbol: symbol.toUpperCase(),
        quantity: parseInt(quantity),
        price: orderMethod === "LIMIT" ? parseFloat(price) : undefined,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
    }
    // Reset form
    setSymbol("");
    setQuantity("");
    setPrice("");
  };

  const filteredOrders = orders.filter(
    (order) => filterStatus === "ALL" || order.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "EXECUTED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "EXECUTED":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "CANCELLED":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      case "PENDING":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Place Order
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType("BUY")}
              className={cn(
                "py-2 px-4 rounded-lg font-medium transition-colors",
                orderType === "BUY"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              )}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setOrderType("SELL")}
              className={cn(
                "py-2 px-4 rounded-lg font-medium transition-colors",
                orderType === "SELL"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              )}
            >
              <TrendingDown className="w-4 h-4 inline mr-2" />
              Sell
            </button>
          </div>

          {/* Order Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Type
            </label>
            <select
              value={orderMethod}
              onChange={(e) => setOrderMethod(e.target.value as "MARKET" | "LIMIT")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="MARKET">Market Order</option>
              <option value="LIMIT">Limit Order</option>
            </select>
          </div>

          {/* Symbol Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., AAPL"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Number of shares"
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price Input (for Limit orders) */}
          {orderMethod === "LIMIT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limit Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price per share"
                required={orderMethod === "LIMIT"}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Estimated Total */}
          {quantity && (orderMethod === "MARKET" || price) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Estimated Total:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${orderMethod === "LIMIT" && price
                    ? (parseFloat(price) * parseInt(quantity)).toFixed(2)
                    : "Market Price"}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !symbol || !quantity}
            className={cn(
              "w-full py-3 rounded-lg font-medium transition-colors",
              orderType === "BUY"
                ? "bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300"
                : "bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300"
            )}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Place {orderType} Order
          </button>
        </form>
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Order History
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Orders</option>
                <option value="PENDING">Pending</option>
                <option value="EXECUTED">Executed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No orders found
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        order.type === "BUY"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      )}>
                        {order.type}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {order.symbol}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {order.quantity} shares @ ${order.price || "Market"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                      {order.total && (
                        <span className="font-medium text-gray-900 dark:text-white">
                          Total: ${order.total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1",
                      getStatusColor(order.status)
                    )}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                      <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}