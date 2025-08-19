import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Download,
  Maximize2,
  MoreVertical,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export type ChartType = "line" | "bar" | "pie" | "area";

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  data: ChartData[];
  chartType?: ChartType;
  dataKey?: string;
  loading?: boolean;
  error?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  className?: string;
  interactive?: boolean;
  realtime?: boolean;
  updateInterval?: number;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  subtitle,
  data,
  chartType = "line",
  dataKey = "value",
  loading = false,
  error,
  height = 300,
  colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"],
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  onRefresh,
  onExport,
  onFullscreen,
  className,
  interactive = true,
  realtime = false,
  updateInterval = 5000,
}) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>(chartType);
  const [isUpdating, setIsUpdating] = useState(false);

  // Simulate real-time data updates
  useEffect(() => {
    if (realtime && onRefresh) {
      const interval = setInterval(() => {
        setIsUpdating(true);
        onRefresh();
        setTimeout(() => setIsUpdating(false), 500);
      }, updateInterval);

      return () => clearInterval(interval);
    }
  }, [realtime, onRefresh, updateInterval]);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (selectedChart) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill={colors[0]}
              dataKey={dataKey}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
          className,
        )}
      >
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
          className,
        )}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{ height }}
        >
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try again
            </button>
          )}
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
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {realtime && (
              <div
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  isUpdating
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                )}
              >
                {isUpdating ? "Updating..." : "Live"}
              </div>
            )}

            {interactive && (
              <select
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value as ChartType)}
                className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="area">Area</option>
                <option value="pie">Pie</option>
              </select>
            )}

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={isUpdating}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 text-gray-500 dark:text-gray-400",
                    isUpdating && "animate-spin",
                  )}
                />
              </button>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Maximize2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Mock data for display
export const mockChartData: ChartData[] = [
  { name: "Jan", value: 4000, sales: 2400, profit: 2400 },
  { name: "Feb", value: 3000, sales: 1398, profit: 2210 },
  { name: "Mar", value: 2000, sales: 9800, profit: 2290 },
  { name: "Apr", value: 2780, sales: 3908, profit: 2000 },
  { name: "May", value: 1890, sales: 4800, profit: 2181 },
  { name: "Jun", value: 2390, sales: 3800, profit: 2500 },
  { name: "Jul", value: 3490, sales: 4300, profit: 2100 },
];

export const mockPieData: ChartData[] = [
  { name: "Desktop", value: 45 },
  { name: "Mobile", value: 35 },
  { name: "Tablet", value: 15 },
  { name: "Other", value: 5 },
];

export default ChartWidget;
