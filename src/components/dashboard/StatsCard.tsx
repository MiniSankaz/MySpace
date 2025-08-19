import React from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  loading?: boolean;
  error?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  showTrend?: boolean;
  suffix?: string;
  prefix?: string;
  onRefresh?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType,
  loading = false,
  error,
  onClick,
  icon: Icon,
  className,
  variant = "default",
  showTrend = true,
  suffix,
  prefix,
  onRefresh,
}) => {
  const isPositive = changeType === "increase" || (change && change > 0);

  const variantStyles = {
    default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    primary:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
    success:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
    warning:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
  };

  const trendColorStyles = isPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  if (loading) {
    return (
      <div
        className={cn(
          "p-6 rounded-lg border shadow-sm transition-all duration-200",
          variantStyles[variant],
          className,
        )}
      >
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-6 rounded-lg border shadow-sm transition-all duration-200",
          "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
          className,
        )}
      >
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 rounded-lg border shadow-sm transition-all duration-200",
        "hover:shadow-md",
        variantStyles[variant],
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {Icon && (
              <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </h3>
          </div>

          <div className="flex items-baseline space-x-1">
            {prefix && (
              <span className="text-lg text-gray-500 dark:text-gray-400">
                {prefix}
              </span>
            )}
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
            </p>
            {suffix && (
              <span className="text-lg text-gray-500 dark:text-gray-400">
                {suffix}
              </span>
            )}
          </div>

          {showTrend && change !== undefined && (
            <div
              className={cn("flex items-center mt-2 text-sm", trendColorStyles)}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="font-medium">
                {isPositive ? "+" : ""}
                {change}%
              </span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                vs last period
              </span>
            </div>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

// Mock data for display
export const mockStatsData = [
  {
    title: "Total Revenue",
    value: "$48,574",
    change: 12.5,
    changeType: "increase" as const,
    variant: "primary" as const,
  },
  {
    title: "Active Users",
    value: "2,451",
    change: -3.2,
    changeType: "decrease" as const,
    variant: "default" as const,
  },
  {
    title: "Conversion Rate",
    value: "3.84",
    suffix: "%",
    change: 8.1,
    changeType: "increase" as const,
    variant: "success" as const,
  },
  {
    title: "Avg Response Time",
    value: "128",
    suffix: "ms",
    change: -15.3,
    changeType: "decrease" as const,
    variant: "warning" as const,
  },
];

export default StatsCard;
