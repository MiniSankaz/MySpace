import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  allocation: number;
  assetType: "stock" | "crypto" | "etf" | "bond";
}

interface PositionTableProps {
  positions: Position[];
  onView?: (position: Position) => void;
  onEdit?: (position: Position) => void;
  onClose?: (position: Position) => void;
  onExport?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  pageSize?: number;
}

type SortField = keyof Position;
type SortOrder = "asc" | "desc";

const PositionTable: React.FC<PositionTableProps> = ({
  positions,
  onView,
  onEdit,
  onClose,
  onExport,
  loading = false,
  error,
  className,
  showSearch = true,
  showFilters = true,
  pageSize = 10,
}) => {
  const [sortField, setSortField] = useState<SortField>("marketValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(
    new Set(),
  );
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      searchQuery === "" ||
      pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === "all" || pos.assetType === selectedType;

    return matchesSearch && matchesType;
  });

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const totalPages = Math.ceil(sortedPositions.length / pageSize);
  const paginatedPositions = sortedPositions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const toggleSelection = (id: string) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPositions.size === paginatedPositions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(paginatedPositions.map((p) => p.id)));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getAssetTypeColor = (type: Position["assetType"]) => {
    const colors = {
      stock: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      crypto:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      etf: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      bond: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    };
    return colors[type];
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
          className,
        )}
      >
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"
              ></div>
            ))}
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
      >
        <div className="p-8 text-center text-red-600 dark:text-red-400">
          {error}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Positions ({filteredPositions.length})
          </h3>

          <div className="flex items-center space-x-2">
            {selectedPositions.size > 0 && (
              <span className="text-sm text-gray-500">
                {selectedPositions.size} selected
              </span>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4 inline mr-1" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          {showSearch && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by symbol or name..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          {showFilters && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="stock">Stocks</option>
              <option value="crypto">Crypto</option>
              <option value="etf">ETFs</option>
              <option value="bond">Bonds</option>
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedPositions.size === paginatedPositions.length &&
                    paginatedPositions.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("symbol")}
              >
                <div className="flex items-center space-x-1">
                  <span>Asset</span>
                  {getSortIcon("symbol")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("quantity")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Quantity</span>
                  {getSortIcon("quantity")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("averageCost")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Avg Cost</span>
                  {getSortIcon("averageCost")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("currentPrice")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Current Price</span>
                  {getSortIcon("currentPrice")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("marketValue")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Market Value</span>
                  {getSortIcon("marketValue")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("unrealizedPnL")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Unrealized P&L</span>
                  {getSortIcon("unrealizedPnL")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("allocation")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Allocation</span>
                  {getSortIcon("allocation")}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedPositions.map((position) => (
              <tr
                key={position.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPositions.has(position.id)}
                    onChange={() => toggleSelection(position.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {position.symbol}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs rounded font-medium",
                            getAssetTypeColor(position.assetType),
                          )}
                        >
                          {position.assetType.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {position.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {position.quantity.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(position.averageCost)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(position.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  {formatCurrency(position.marketValue)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div
                    className={cn(
                      "font-medium",
                      getChangeColor(position.unrealizedPnL),
                    )}
                  >
                    {formatCurrency(position.unrealizedPnL)}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      getChangeColor(position.unrealizedPnLPercent),
                    )}
                  >
                    {formatPercent(position.unrealizedPnLPercent)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {position.allocation.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {onView && (
                      <button
                        onClick={() => onView(position)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(position)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edit Position"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    {onClose && (
                      <button
                        onClick={() => onClose(position)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Close Position"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, sortedPositions.length)} of{" "}
              {sortedPositions.length} results
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "px-3 py-1 text-sm rounded",
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700",
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock data
export const mockPositions: Position[] = [
  {
    id: "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 100,
    averageCost: 150,
    currentPrice: 178.25,
    marketValue: 17825,
    unrealizedPnL: 2825,
    unrealizedPnLPercent: 18.83,
    realizedPnL: 0,
    allocation: 25.5,
    assetType: "stock",
  },
  {
    id: "2",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.5,
    averageCost: 30000,
    currentPrice: 45000,
    marketValue: 22500,
    unrealizedPnL: 7500,
    unrealizedPnLPercent: 50,
    realizedPnL: 0,
    allocation: 32.2,
    assetType: "crypto",
  },
  // Add more mock positions as needed
];

export default PositionTable;
