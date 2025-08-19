"use client";

import React from "react";
import { ModernLayout } from "@/components/layout/modern-layout";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for demonstration
const portfolioStats = {
  totalValue: 157842.35,
  dayChange: 2847.12,
  dayChangePercent: 1.84,
  totalGain: 23456.78,
  totalGainPercent: 17.42,
  positions: 12,
  cash: 15234.5,
};

const topMovers = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.23,
    change: 3.45,
    changePercent: 1.97,
    isUp: true,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: 412.56,
    change: -2.34,
    changePercent: -0.56,
    isUp: false,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    price: 142.78,
    change: 5.67,
    changePercent: 4.13,
    isUp: true,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    price: 234.56,
    change: 12.34,
    changePercent: 5.56,
    isUp: true,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    price: 456.78,
    change: -8.9,
    changePercent: -1.91,
    isUp: false,
  },
];

const recentActivity = [
  {
    type: "buy",
    symbol: "AAPL",
    quantity: 10,
    price: 175.5,
    time: "2 hours ago",
  },
  {
    type: "sell",
    symbol: "GOOGL",
    quantity: 5,
    price: 140.25,
    time: "5 hours ago",
  },
  { type: "dividend", symbol: "MSFT", amount: 125.5, time: "1 day ago" },
  {
    type: "buy",
    symbol: "NVDA",
    quantity: 8,
    price: 450.0,
    time: "2 days ago",
  },
];

const StatCard = ({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  isPositive,
}: any) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {change && (
          <div
            className={cn(
              "flex items-center mt-2 text-sm font-medium",
              isPositive
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-1" />
            )}
            <span>
              {change} ({changePercent}%)
            </span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "p-3 rounded-lg",
          isPositive
            ? "bg-green-50 dark:bg-green-900/20"
            : "bg-blue-50 dark:bg-blue-900/20",
        )}
      >
        <Icon
          className={cn(
            "w-6 h-6",
            isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-blue-600 dark:text-blue-400",
          )}
        />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back! Here's your portfolio overview.
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Last 30 Days
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Position
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Portfolio Value"
            value={`$${portfolioStats.totalValue.toLocaleString()}`}
            change={`+$${portfolioStats.dayChange.toLocaleString()}`}
            changePercent={portfolioStats.dayChangePercent}
            icon={DollarSign}
            isPositive={true}
          />
          <StatCard
            title="Total Gain/Loss"
            value={`$${portfolioStats.totalGain.toLocaleString()}`}
            changePercent={portfolioStats.totalGainPercent}
            icon={TrendingUp}
            isPositive={true}
          />
          <StatCard
            title="Positions"
            value={portfolioStats.positions}
            icon={PieChart}
            isPositive={false}
          />
          <StatCard
            title="Cash Balance"
            value={`$${portfolioStats.cash.toLocaleString()}`}
            icon={Activity}
            isPositive={false}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Portfolio Performance
                </h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium">
                    1D
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    1W
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    1M
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    1Y
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    ALL
                  </button>
                </div>
              </div>
              {/* Placeholder for chart */}
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-12 h-12 text-gray-400" />
                <span className="ml-3 text-gray-500 dark:text-gray-400">
                  Chart will be implemented
                </span>
              </div>
            </div>
          </div>

          {/* Top Movers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Movers
              </h2>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {topMovers.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stock.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${stock.price}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        stock.isUp
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {stock.isUp ? "+" : ""}
                      {stock.changePercent}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      activity.type === "buy"
                        ? "bg-green-50 dark:bg-green-900/20"
                        : activity.type === "sell"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-blue-50 dark:bg-blue-900/20",
                    )}
                  >
                    {activity.type === "buy" ? (
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : activity.type === "sell" ? (
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.type === "buy" &&
                        `Bought ${activity.quantity} ${activity.symbol}`}
                      {activity.type === "sell" &&
                        `Sold ${activity.quantity} ${activity.symbol}`}
                      {activity.type === "dividend" &&
                        `Dividend from ${activity.symbol}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.type === "dividend"
                        ? `$${activity.amount}`
                        : `$${activity.price} per share`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 inline-block mr-1" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Market closes in 2 hours
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Review your pending orders before market close at 4:00 PM EST.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
