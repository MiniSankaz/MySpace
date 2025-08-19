"use client";

import React from "react";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  PieChart,
  Activity,
  Target,
  DollarSign,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RiskMetrics {
  portfolioId: string;
  totalValue: number;
  riskScore: number; // 0-100
  volatility: number;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  diversificationScore: number; // 0-100
  concentrationRisk: {
    topHolding: string;
    percentage: number;
  };
  sectorExposure: Array<{
    sector: string;
    percentage: number;
    risk: "LOW" | "MEDIUM" | "HIGH";
  }>;
  recommendations: Array<{
    type: "WARNING" | "INFO" | "SUCCESS";
    title: string;
    description: string;
    action?: string;
  }>;
}

interface RiskAnalyzerProps {
  metrics?: RiskMetrics;
  loading?: boolean;
}

// Mock data generator for demo
const generateMockMetrics = (): RiskMetrics => ({
  portfolioId: "1",
  totalValue: 125432.56,
  riskScore: 65,
  volatility: 18.5,
  beta: 1.2,
  sharpeRatio: 1.45,
  maxDrawdown: -12.3,
  diversificationScore: 72,
  concentrationRisk: {
    topHolding: "AAPL",
    percentage: 24.5,
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
      title: "High Technology Exposure",
      description: "45% of your portfolio is in tech stocks, which increases volatility",
      action: "Consider diversifying into other sectors",
    },
    {
      type: "INFO",
      title: "Good Diversification",
      description: "Your portfolio spans 5 different sectors",
      action: "Maintain current sector balance",
    },
    {
      type: "SUCCESS",
      title: "Positive Sharpe Ratio",
      description: "Your risk-adjusted returns are above market average",
    },
  ],
});

export default function RiskAnalyzer({
  metrics = generateMockMetrics(),
  loading = false,
}: RiskAnalyzerProps) {
  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-600 dark:text-green-400";
    if (score < 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return "Low Risk";
    if (score < 70) return "Medium Risk";
    return "High Risk";
  };

  const getRiskBgColor = (risk: "LOW" | "MEDIUM" | "HIGH") => {
    switch (risk) {
      case "LOW":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "MEDIUM":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "HIGH":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "WARNING":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "SUCCESS":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        <p className="text-center mt-4 text-gray-500 dark:text-gray-400">
          Analyzing portfolio risk...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Risk Analysis
          </h3>
          <span className={cn("text-sm font-medium", getRiskColor(metrics.riskScore))}>
            {getRiskLabel(metrics.riskScore)}
          </span>
        </div>

        {/* Risk Score Visual */}
        <div className="relative mb-6">
          <div className="flex justify-between items-end h-32">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {metrics.riskScore}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Risk Score
              </div>
              <div className="w-full mt-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      metrics.riskScore < 30
                        ? "bg-green-500"
                        : metrics.riskScore < 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${metrics.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Volatility</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.volatility.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Beta</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.beta.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Sharpe Ratio</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.sharpeRatio.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Max Drawdown</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.maxDrawdown.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Diversification Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2" />
          Diversification Analysis
        </h4>

        {/* Diversification Score */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Diversification Score
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {metrics.diversificationScore}/100
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${metrics.diversificationScore}%` }}
            />
          </div>
        </div>

        {/* Concentration Risk */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Concentration Risk
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {metrics.concentrationRisk.topHolding} represents{" "}
                {metrics.concentrationRisk.percentage}% of your portfolio
              </p>
            </div>
          </div>
        </div>

        {/* Sector Exposure */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sector Exposure
          </p>
          {metrics.sectorExposure.map((sector) => (
            <div key={sector.sector} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {sector.sector}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    getRiskBgColor(sector.risk)
                  )}
                >
                  {sector.risk}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      sector.risk === "HIGH"
                        ? "bg-red-500"
                        : sector.risk === "MEDIUM"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{ width: `${sector.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-900 dark:text-white min-w-[40px] text-right">
                  {sector.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          Recommendations
        </h4>
        
        <div className="space-y-3">
          {metrics.recommendations.map((rec, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border",
                rec.type === "WARNING"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  : rec.type === "SUCCESS"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              )}
            >
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">{getRecommendationIcon(rec.type)}</div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    {rec.title}
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {rec.description}
                  </p>
                  {rec.action && (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">
                      → {rec.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}