import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Settings,
  Info,
} from "lucide-react";

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  symbol: string;
  data: PriceData[];
  height?: number | string;
  timeframe?: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";
  chartType?: "line" | "candlestick" | "area" | "bar";
  indicators?: string[];
  onTimeframeChange?: (timeframe: string) => void;
  onExport?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
  showVolume?: boolean;
  showIndicators?: boolean;
  interactive?: boolean;
}

const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  data,
  height = 400,
  timeframe = "1M",
  chartType = "candlestick",
  indicators = [],
  onTimeframeChange,
  onExport,
  loading = false,
  error,
  className,
  showVolume = true,
  showIndicators = true,
  interactive = true,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedChartType, setSelectedChartType] = useState(chartType);
  const [hoveredData, setHoveredData] = useState<PriceData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const timeframes = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"];
  const chartTypes = [
    { value: "line", label: "Line" },
    { value: "candlestick", label: "Candles" },
    { value: "area", label: "Area" },
    { value: "bar", label: "Bar" },
  ];

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const getChangeInfo = () => {
    if (data.length < 2)
      return { change: 0, changePercent: 0, isPositive: true };

    const first = data[0].close;
    const last = data[data.length - 1].close;
    const change = last - first;
    const changePercent = (change / first) * 100;

    return {
      change,
      changePercent,
      isPositive: change >= 0,
    };
  };

  const { change, changePercent, isPositive } = getChangeInfo();

  // Generate mock chart visualization
  const renderChart = () => {
    const width = 800;
    const chartHeight = 300;
    const volumeHeight = 60;

    if (data.length === 0) return null;

    const maxPrice = Math.max(...data.map((d) => d.high));
    const minPrice = Math.min(...data.map((d) => d.low));
    const priceRange = maxPrice - minPrice;
    const maxVolume = Math.max(...data.map((d) => d.volume));

    const scaleY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const scaleVolume = (volume: number) => {
      return volumeHeight - (volume / maxVolume) * volumeHeight;
    };

    const candleWidth = Math.max(2, (width / data.length) * 0.8);
    const spacing = width / data.length;

    return (
      <svg
        viewBox={`0 0 ${width} ${chartHeight + (showVolume ? volumeHeight + 20 : 0)}`}
        className="w-full"
      >
        {/* Price Chart */}
        <g>
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = ratio * chartHeight;
            const price = minPrice + (1 - ratio) * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="2,2"
                />
                <text
                  x={width - 5}
                  y={y - 5}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity="0.5"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks or Line */}
          {selectedChartType === "candlestick" &&
            data.map((d, i) => {
              const x = i * spacing + spacing / 2;
              const isGreen = d.close >= d.open;
              const color = isGreen ? "#10B981" : "#EF4444";

              return (
                <g key={i} onMouseEnter={() => setHoveredData(d)}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={scaleY(d.high)}
                    x2={x}
                    y2={scaleY(d.low)}
                    stroke={color}
                    strokeWidth="1"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={scaleY(Math.max(d.open, d.close))}
                    width={candleWidth}
                    height={Math.abs(scaleY(d.open) - scaleY(d.close)) || 1}
                    fill={color}
                    fillOpacity={isGreen ? 1 : 0.9}
                  />
                </g>
              );
            })}

          {selectedChartType === "line" && (
            <polyline
              points={data
                .map(
                  (d, i) => `${i * spacing + spacing / 2},${scaleY(d.close)}`,
                )
                .join(" ")}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {selectedChartType === "area" && (
            <>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`
                  ${data
                    .map(
                      (d, i) =>
                        `${i * spacing + spacing / 2},${scaleY(d.close)}`,
                    )
                    .join(" ")}
                  ${width},${chartHeight}
                  0,${chartHeight}
                `}
                fill="url(#areaGradient)"
              />
              <polyline
                points={data
                  .map(
                    (d, i) => `${i * spacing + spacing / 2},${scaleY(d.close)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              />
            </>
          )}
        </g>

        {/* Volume Chart */}
        {showVolume && (
          <g transform={`translate(0, ${chartHeight + 20})`}>
            {data.map((d, i) => {
              const x = i * spacing + spacing / 2;
              const isGreen = d.close >= d.open;

              return (
                <rect
                  key={i}
                  x={x - candleWidth / 2}
                  y={scaleVolume(d.volume)}
                  width={candleWidth}
                  height={volumeHeight - scaleVolume(d.volume)}
                  fill={isGreen ? "#10B981" : "#EF4444"}
                  fillOpacity="0.3"
                />
              );
            })}
          </g>
        )}
      </svg>
    );
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
          className,
        )}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
          className,
        )}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600 dark:text-red-400">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {symbol} Price Chart
            </h3>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-2xl font-bold">
                ${data[data.length - 1]?.close.toFixed(2)}
              </span>
              <div
                className={cn(
                  "flex items-center space-x-1",
                  isPositive ? "text-green-600" : "text-red-600",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {isPositive ? "+" : ""}
                  {change.toFixed(2)} ({changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {interactive && (
              <>
                <button
                  onClick={() => setZoomLevel(Math.min(zoomLevel + 0.2, 2))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(Math.max(zoomLevel - 0.2, 0.5))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Timeframe Selector */}
          <div className="flex space-x-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  selectedTimeframe === tf
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex space-x-1">
            {chartTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedChartType(type.value as any)}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  selectedChartType === type.value
                    ? "bg-gray-700 text-white dark:bg-gray-600"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div
        className="p-4"
        style={{ height: typeof height === "number" ? height - 120 : "auto" }}
      >
        {renderChart()}
      </div>

      {/* Hover Info */}
      {hoveredData && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <p className="font-medium">{hoveredData.date}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Open</span>
                <p className="font-medium">${hoveredData.open.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">High</span>
                <p className="font-medium">${hoveredData.high.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Low</span>
                <p className="font-medium">${hoveredData.low.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Close</span>
                <p className="font-medium">${hoveredData.close.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock price data
export const mockPriceData: PriceData[] = Array.from({ length: 30 }, (_, i) => {
  const basePrice = 150 + Math.random() * 20;
  const variation = Math.random() * 5;
  return {
    date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    open: basePrice,
    high: basePrice + variation,
    low: basePrice - variation * 0.8,
    close: basePrice + (Math.random() - 0.5) * variation * 2,
    volume: Math.floor(Math.random() * 1000000) + 500000,
  };
});

export default PriceChart;
