"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  portfolioService,
  Portfolio,
  PortfolioMetrics,
} from "@/services/microservices/portfolio-service";
import { cn } from "@/lib/utils";

interface PortfolioDashboardProps {
  userId: string;
}

export function PortfolioDashboard({ userId }: PortfolioDashboardProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(
    null,
  );
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPortfolios();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPortfolioMetrics(selectedPortfolio.id);
      // Subscribe to real-time updates
      const unsubscribe = portfolioService.subscribeToPortfolio(
        selectedPortfolio.id,
        handlePortfolioUpdate,
      );
      return unsubscribe;
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const response = await portfolioService.getPortfolios(userId);
      if (response.success && response.data) {
        setPortfolios(response.data);
        if (response.data.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Error loading portfolios:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioMetrics = async (portfolioId: string) => {
    try {
      const response = await portfolioService.getPortfolioMetrics(portfolioId);
      if (response.success && response.data) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error("Error loading metrics:", error);
    }
  };

  const handlePortfolioUpdate = (data: any) => {
    // Handle real-time portfolio updates
    if (data.type === "portfolio_update" && selectedPortfolio) {
      setSelectedPortfolio(data.portfolio);
      setMetrics(data.metrics);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolios();
    if (selectedPortfolio) {
      await loadPortfolioMetrics(selectedPortfolio.id);
    }
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (portfolios.length === 0) {
    return <EmptyPortfolioState />;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Selector and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            className="px-4 py-2 border rounded-lg bg-background"
            value={selectedPortfolio?.id || ""}
            onChange={(e) => {
              const portfolio = portfolios.find((p) => p.id === e.target.value);
              setSelectedPortfolio(portfolio || null);
            }}
          >
            {portfolios.map((portfolio) => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(refreshing && "animate-spin")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Portfolio
        </Button>
      </div>

      {/* Key Metrics Cards */}
      {selectedPortfolio && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Value"
              value={formatCurrency(selectedPortfolio.totalValue)}
              change={metrics?.dayChangePercent}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <MetricCard
              title="Day Change"
              value={formatCurrency(metrics?.dayChange || 0)}
              change={metrics?.dayChangePercent}
              icon={<Activity className="h-4 w-4" />}
              valueColor={
                metrics?.dayChange
                  ? metrics.dayChange >= 0
                    ? "text-green-600"
                    : "text-red-600"
                  : undefined
              }
            />
            <MetricCard
              title="Total Return"
              value={formatCurrency(selectedPortfolio.totalProfitLoss)}
              change={selectedPortfolio.totalProfitLossPercent}
              icon={<TrendingUp className="h-4 w-4" />}
              valueColor={
                selectedPortfolio.totalProfitLoss >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            />
            <MetricCard
              title="Holdings"
              value={selectedPortfolio.holdings.length.toString()}
              subtitle={`${metrics?.diversification?.sectors ? Object.keys(metrics.diversification.sectors).length : 0} sectors`}
              icon={<PieChart className="h-4 w-4" />}
            />
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="holdings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="holdings">Holdings</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="holdings" className="space-y-4">
              <HoldingsTable portfolio={selectedPortfolio} />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceChart portfolioId={selectedPortfolio.id} />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <TransactionHistory portfolioId={selectedPortfolio.id} />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <AIAnalysis portfolioId={selectedPortfolio.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Sub-components
function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  valueColor,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
        {change !== undefined && (
          <p
            className={cn(
              "text-xs flex items-center mt-1",
              change >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change).toFixed(2)}%
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingsTable({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
        <CardDescription>Your current stock positions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Symbol</th>
                <th className="text-right p-2">Quantity</th>
                <th className="text-right p-2">Avg Price</th>
                <th className="text-right p-2">Current Price</th>
                <th className="text-right p-2">Value</th>
                <th className="text-right p-2">P&L</th>
                <th className="text-right p-2">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding) => (
                <tr key={holding.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{holding.symbol}</td>
                  <td className="text-right p-2">{holding.quantity}</td>
                  <td className="text-right p-2">
                    ${holding.averagePrice.toFixed(2)}
                  </td>
                  <td className="text-right p-2">
                    ${holding.currentPrice.toFixed(2)}
                  </td>
                  <td className="text-right p-2">
                    ${holding.totalValue.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "text-right p-2",
                      holding.profitLoss >= 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    ${holding.profitLoss.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "text-right p-2",
                      holding.profitLossPercent >= 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {holding.profitLossPercent >= 0 ? "+" : ""}
                    {holding.profitLossPercent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceChart({ portfolioId }: { portfolioId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardDescription>Portfolio value over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mr-2" />
          Performance chart will be implemented here
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionHistory({ portfolioId }: { portfolioId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent buy and sell orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Transaction history will be displayed here
        </div>
      </CardContent>
    </Card>
  );
}

function AIAnalysis({ portfolioId }: { portfolioId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
        <CardDescription>Powered by Claude AI</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          AI portfolio analysis will be displayed here
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPortfolioState() {
  return (
    <Card className="p-12">
      <div className="text-center">
        <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Portfolios Yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first portfolio to start tracking your investments
        </p>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Portfolio
        </Button>
      </div>
    </Card>
  );
}

// Default export for compatibility
export default PortfolioDashboard;
