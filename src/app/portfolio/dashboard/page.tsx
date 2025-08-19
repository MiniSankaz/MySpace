"use client";

import React, { useState } from "react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';
import { ModernLayout } from "@/components/layout/modern-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PortfolioDashboard from "@/components/portfolio/portfolio-dashboard";
import OrderManagement from "@/components/portfolio/OrderManagement";
import AlertsManager from "@/components/portfolio/AlertsManager";
import RiskAnalyzer from "@/components/portfolio/RiskAnalyzer";
import { usePortfolioService } from "@/hooks/usePortfolioService";
import {
  LayoutDashboard,
  ShoppingCart,
  Bell,
  Shield,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortfolioDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);
  
  const {
    portfolios,
    selectedPortfolio,
    holdings,
    transactions,
    metrics,
    loading,
    error,
    selectPortfolio,
    createPortfolio,
    executeTrade,
    refreshData,
  } = usePortfolioService();

  // Mock data for alerts (will be replaced with real API)
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);

  const handleCreatePortfolio = async (name: string, description?: string) => {
    const portfolio = await createPortfolio(name, description);
    if (portfolio) {
      setShowCreatePortfolioModal(false);
    }
  };

  const handleExecuteTrade = async (order: any) => {
    if (!selectedPortfolio) return;
    
    const transaction = await executeTrade(selectedPortfolio.id, {
      type: order.type,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price,
      notes: order.notes,
    });
    
    if (transaction) {
      // Update orders list (in real app, this would come from API)
      setOrders([...orders, { ...order, id: transaction.id, status: "EXECUTED" }]);
    }
  };

  const handleCreateAlert = (alert: any) => {
    // In real app, this would call API
    setAlerts([...alerts, { ...alert, id: Date.now().toString() }]);
  };

  const handleUpdateAlert = (id: string, update: any) => {
    // In real app, this would call API
    setAlerts(alerts.map((a: any) => a.id === id ? { ...a, ...update } : a));
  };

  const handleDeleteAlert = (id: string) => {
    // In real app, this would call API
    setAlerts(alerts.filter((a: any) => a.id !== id));
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Portfolio Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track and manage your investment portfolios
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <button
              onClick={refreshData}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreatePortfolioModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Portfolio
            </button>
          </div>
        </div>

        {/* Portfolio Selector */}
        {portfolios.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {portfolios.map((portfolio) => (
              <button
                key={portfolio.id}
                onClick={() => selectPortfolio(portfolio.id)}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-colors",
                  selectedPortfolio?.id === portfolio.id
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                )}
              >
                <span className="font-medium">{portfolio.name}</span>
                <span className="ml-2 text-sm opacity-75">
                  ${portfolio.totalValue?.toLocaleString() || "0"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Main Content */}
        {selectedPortfolio ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="risk" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Risk</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <PortfolioDashboard userId="demo-user" />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <OrderManagement
                portfolioId={selectedPortfolio.id}
                orders={orders}
                onOrderSubmit={handleExecuteTrade}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <AlertsManager
                portfolioId={selectedPortfolio.id}
                alerts={alerts}
                onCreateAlert={handleCreateAlert}
                onUpdateAlert={handleUpdateAlert}
                onDeleteAlert={handleDeleteAlert}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <RiskAnalyzer
                metrics={{
                  portfolioId: selectedPortfolio.id,
                  totalValue: selectedPortfolio.totalValue,
                  riskScore: 65,
                  volatility: 18.5,
                  beta: 1.2,
                  sharpeRatio: 1.45,
                  maxDrawdown: -12.3,
                  diversificationScore: 72,
                  concentrationRisk: {
                    topHolding: holdings[0]?.symbol || "N/A",
                    percentage: holdings[0] ? (holdings[0].totalValue / selectedPortfolio.totalValue * 100) : 0,
                  },
                  sectorExposure: [
                    { sector: "Technology", percentage: 45, risk: "HIGH" },
                    { sector: "Healthcare", percentage: 20, risk: "LOW" },
                    { sector: "Finance", percentage: 15, risk: "MEDIUM" },
                    { sector: "Consumer", percentage: 12, risk: "LOW" },
                    { sector: "Energy", percentage: 8, risk: "HIGH" },
                  ],
                  recommendations: [
                    {
                      type: "WARNING",
                      title: "High Concentration Risk",
                      description: `Your top holding represents a significant portion of your portfolio`,
                      action: "Consider diversifying your holdings",
                    },
                    {
                      type: "INFO",
                      title: "Portfolio Performance",
                      description: "Your portfolio is performing above market average",
                    },
                  ],
                }}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        ) : (
          // Empty State
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading portfolios...</p>
              </>
            ) : portfolios.length === 0 ? (
              <>
                <LayoutDashboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Portfolios Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create your first portfolio to start tracking investments
                </p>
                <button
                  onClick={() => setShowCreatePortfolioModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Portfolio
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a portfolio to view details
                </p>
              </>
            )}
          </div>
        )}

        {/* Create Portfolio Modal */}
        {showCreatePortfolioModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Portfolio
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreatePortfolio(
                    formData.get("name") as string,
                    formData.get("description") as string
                  );
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g., Growth Portfolio"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Describe your investment strategy..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePortfolioModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}