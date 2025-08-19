"use client";

import React, { useState, useEffect } from "react";
import { ModernLayout } from "@/components/layout/modern-layout";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Loader,
  AlertCircle,
  Receipt,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolio } from "@/hooks/usePortfolio";
import { CreatePortfolioModal } from "@/components/portfolio/CreatePortfolioModal";
import { EditPortfolioModal } from "@/components/portfolio/EditPortfolioModal";
import { DeletePortfolioModal } from "@/components/portfolio/DeletePortfolioModal";
import { AddHoldingModal } from "@/components/portfolio/AddHoldingModal";
import { EditHoldingModal } from "@/components/portfolio/EditHoldingModal";
import { DeleteHoldingModal } from "@/components/portfolio/DeleteHoldingModal";
import { TransactionHistory } from "@/components/portfolio/TransactionHistory";
import { TransactionFilters } from "@/components/portfolio/TransactionFilters";
import { TransactionModal } from "@/components/portfolio/TransactionModal";
import { apiClient } from "@/lib/api-client";

// Helper function to format holdings data
const formatHolding = (holding: any) => {
  const currentPrice = holding.currentPrice || 0;
  const avgCost = holding.avgCost || holding.averagePrice || 0;
  const quantity = holding.quantity || 0;
  const value = quantity * currentPrice;
  const totalGain = quantity * (currentPrice - avgCost);
  const totalGainPercent = avgCost > 0 ? (totalGain / (quantity * avgCost)) * 100 : 0;
  
  return {
    ...holding,
    id: holding.id || holding.symbol,
    symbol: holding.symbol || '',
    name: holding.name || holding.symbol || '',
    quantity,
    avgCost,
    averagePrice: avgCost,
    currentPrice,
    value,
    marketValue: value,
    dayChange: holding.dayChange || 0,
    dayChangePercent: holding.dayChangePercent || 0,
    totalGain,
    totalGainPercent,
    profitLoss: totalGain,
    profitLossPercent: totalGainPercent,
    allocation: holding.allocation || 0,
  };
};


export default function PortfolioPage() {
  const {
    portfolios,
    selectedPortfolio,
    loading,
    error,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    refetch,
    addHolding,
    updateHolding,
    deleteHolding,
  } = usePortfolio();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditPortfolioModal, setShowEditPortfolioModal] = useState(false);
  const [showDeletePortfolioModal, setShowDeletePortfolioModal] = useState(false);
  const [showAddHoldingModal, setShowAddHoldingModal] = useState(false);
  const [showEditHoldingModal, setShowEditHoldingModal] = useState(false);
  const [showDeleteHoldingModal, setShowDeleteHoldingModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [portfolioToEdit, setPortfolioToEdit] = useState<any>(null);
  const [portfolioToDelete, setPortfolioToDelete] = useState<any>(null);
  
  // Transaction Management states
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions">("holdings");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionModalMode, setTransactionModalMode] = useState<"create" | "edit" | "delete">("create");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionFilters, setTransactionFilters] = useState<any>({});
  const [transactionsKey, setTransactionsKey] = useState(0); // สำหรับ force refresh

  // Format holdings data for display
  const holdings = (selectedPortfolio?.holdings || []).map(formatHolding);
  const filteredHoldings = holdings.filter(
    (holding: any) =>
      holding.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate portfolio stats from holdings
  const portfolioStats = selectedPortfolio
    ? {
        totalValue: holdings.reduce((sum: number, h: any) => sum + (h.value || h.marketValue || 0), 0),
        dayChange: holdings.reduce((sum: number, h: any) => sum + (h.dayChange || 0), 0),
        totalGain: holdings.reduce((sum: number, h: any) => sum + (h.totalGain || h.gainLoss || 0), 0),
        positions: holdings.length,
      }
    : { totalValue: 0, dayChange: 0, totalGain: 0, positions: 0 };

  const dayChangePercent = portfolioStats.totalValue > 0 
    ? (portfolioStats.dayChange / (portfolioStats.totalValue - portfolioStats.dayChange)) * 100 
    : 0;

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Portfolio
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your investment portfolios and track performance
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </button>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading portfolios...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Portfolio Selector */}
        {!loading && !error && portfolios.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No portfolios found. Create your first portfolio to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Portfolio
            </button>
          </div>
        )}

        {!loading && portfolios.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {portfolios.map((portfolio) => {
              const portfolioHoldings = (portfolio.holdings || []).map(formatHolding);
              const portfolioValue = portfolioHoldings.reduce((sum: number, h: any) => sum + (h.value || 0), 0);
              const portfolioDayChange = portfolioHoldings.reduce((sum: number, h: any) => sum + (h.dayChange || 0), 0);
              const portfolioDayChangePercent = portfolioValue > 0 ? (portfolioDayChange / (portfolioValue - portfolioDayChange)) * 100 : 0;
              
              return (
                <div
                  key={portfolio.id}
                  onClick={() => selectPortfolio(portfolio)}
                  className={cn(
                    "flex-1 min-w-[250px] p-4 rounded-xl border transition-all cursor-pointer",
                    selectedPortfolio?.id === portfolio.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {portfolio.name}
                        </h3>
                        {portfolio.isDefault && (
                          <Star className="w-4 h-4 ml-2 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {portfolioHoldings.length} positions
                      </p>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show dropdown menu
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPortfolioToEdit(portfolio);
                            setShowEditPortfolioModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 flex items-center"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Portfolio
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPortfolioToDelete(portfolio);
                            setShowDeletePortfolioModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-red-600 dark:text-red-400 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Portfolio
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${portfolioValue.toLocaleString()}
                    </p>
                    <div
                      className={cn(
                        "flex items-center mt-1 text-sm font-medium",
                        portfolioDayChange >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {portfolioDayChange >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 mr-1" />
                      )}
                      <span>
                        ${Math.abs(portfolioDayChange).toLocaleString()} (
                        {portfolioDayChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  {/* Mini chart placeholder */}
                  <div className="mt-3 h-8 flex items-end space-x-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-t",
                          portfolioDayChange >= 0
                            ? "bg-green-500 dark:bg-green-400"
                            : "bg-red-500 dark:bg-red-400",
                        )}
                        style={{ height: `${Math.random() * 100 + 20}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Value
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${portfolioStats.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Day Change
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    portfolioStats.dayChange >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {portfolioStats.dayChange >= 0 ? "+" : ""}$
                  {portfolioStats.dayChange.toLocaleString()}
                </p>
              </div>
              {portfolioStats.dayChange >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Gain
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  portfolioStats.totalGain >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {portfolioStats.totalGain >= 0 ? "+" : ""}$
                  {portfolioStats.totalGain.toLocaleString()}
                </p>
              </div>
              <PieChart className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Positions
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {portfolioStats.positions}
                </p>
              </div>
              <Eye className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Tabs for Holdings and Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("holdings")}
              className={cn(
                "flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors relative",
                activeTab === "holdings"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Holdings
              </div>
              {activeTab === "holdings" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={cn(
                "flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors relative",
                activeTab === "transactions"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                Transactions
              </div>
              {activeTab === "transactions" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "holdings" ? (
            <>
              {/* Holdings Table */}
              {/* Table Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Holdings
                  </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search holdings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Cost
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Day Change
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Gain
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHoldings.map((holding: any) => (
                  <tr
                    key={holding.symbol || holding.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {holding.symbol}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {holding.name}
                        </p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4 text-sm text-gray-900 dark:text-white">
                      {holding.quantity || 0}
                    </td>
                    <td className="text-right px-4 py-4 text-sm text-gray-900 dark:text-white">
                      ${(holding.avgCost || holding.averagePrice || 0).toFixed(2)}
                    </td>
                    <td className="text-right px-4 py-4 text-sm text-gray-900 dark:text-white">
                      ${(holding.currentPrice || 0).toFixed(2)}
                    </td>
                    <td className="text-right px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      ${(holding.value || holding.totalValue || 0).toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-4">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          (holding.dayChange || 0) >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {holding.dayChange >= 0 ? "+" : ""}$
                        {Math.abs(holding.dayChange || 0).toFixed(2)}
                        <p className="text-xs">
                          {(holding.dayChange || 0) >= 0 ? "+" : ""}
                          {(holding.dayChangePercent || 0).toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          (holding.totalGain || holding.profitLoss || 0) >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        ${(holding.totalGain || holding.profitLoss || 0).toLocaleString()}
                        <p className="text-xs">
                          {(holding.totalGain || holding.profitLoss || 0) >= 0 ? "+" : ""}
                          {(holding.totalGainPercent || holding.profitLossPercent || 0).toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4">
                      <div className="flex items-center justify-end">
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${holding.allocation || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {(holding.allocation || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedHolding(holding);
                            setShowEditHoldingModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedHolding(holding);
                            setShowDeleteHoldingModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Transactions Tab Content */
        <div className="p-4">
          {/* Transaction Actions Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transaction History
              </h2>
              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setTransactionModalMode("create");
                  setShowTransactionModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            </div>
            
            {/* Transaction Filters */}
            <TransactionFilters
              filters={transactionFilters}
              onFiltersChange={(filters) => {
                setTransactionFilters(filters);
                setTransactionsKey(prev => prev + 1); // Force refresh
              }}
              onExport={async (format) => {
                if (selectedPortfolio) {
                  await apiClient.exportTransactions(selectedPortfolio.id, format, {
                    startDate: transactionFilters.startDate,
                    endDate: transactionFilters.endDate,
                  });
                }
              }}
              onReset={() => {
                setTransactionFilters({});
                setTransactionsKey(prev => prev + 1);
              }}
            />
          </div>
          
          {/* Transaction History Table */}
          {selectedPortfolio && (
            <TransactionHistory
              key={transactionsKey}
              portfolioId={selectedPortfolio.id}
              onEdit={(transaction) => {
                setSelectedTransaction(transaction);
                setTransactionModalMode("edit");
                setShowTransactionModal(true);
              }}
              onDelete={(transaction) => {
                setSelectedTransaction(transaction);
                setTransactionModalMode("delete");
                setShowTransactionModal(true);
              }}
              onDuplicate={(transaction) => {
                setSelectedTransaction({
                  ...transaction,
                  executedAt: new Date().toISOString(),
                });
                setTransactionModalMode("create");
                setShowTransactionModal(true);
              }}
            />
          )}
        </div>
      )}
    </div>

        {/* Add Position Button */}
        {selectedPortfolio && (
          <div className="flex justify-center">
            <button 
              onClick={() => setShowAddHoldingModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Position
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Transaction Modal */}
      {selectedPortfolio && (
        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
          portfolioId={selectedPortfolio.id}
          transaction={selectedTransaction}
          mode={transactionModalMode}
          onSuccess={() => {
            setTransactionsKey(prev => prev + 1); // Force refresh transactions list
            refetch(); // Refresh portfolios to update values
          }}
        />
      )}
      
      <CreatePortfolioModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createPortfolio}
      />
      
      <EditPortfolioModal
        isOpen={showEditPortfolioModal}
        portfolio={portfolioToEdit}
        onClose={() => {
          setShowEditPortfolioModal(false);
          setPortfolioToEdit(null);
        }}
        onUpdate={updatePortfolio}
      />
      
      <DeletePortfolioModal
        isOpen={showDeletePortfolioModal}
        portfolio={portfolioToDelete}
        onClose={() => {
          setShowDeletePortfolioModal(false);
          setPortfolioToDelete(null);
        }}
        onDelete={deletePortfolio}
      />
      
      <AddHoldingModal
        isOpen={showAddHoldingModal}
        portfolioId={selectedPortfolio?.id || null}
        onClose={() => setShowAddHoldingModal(false)}
        onAdd={addHolding}
      />
      
      <EditHoldingModal
        isOpen={showEditHoldingModal}
        portfolioId={selectedPortfolio?.id || null}
        holding={selectedHolding}
        onClose={() => {
          setShowEditHoldingModal(false);
          setSelectedHolding(null);
        }}
        onUpdate={updateHolding}
      />
      
      <DeleteHoldingModal
        isOpen={showDeleteHoldingModal}
        portfolioId={selectedPortfolio?.id || null}
        holding={selectedHolding}
        onClose={() => {
          setShowDeleteHoldingModal(false);
          setSelectedHolding(null);
        }}
        onDelete={deleteHolding}
      />
    </ModernLayout>
  );
}
