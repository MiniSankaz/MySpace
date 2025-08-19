"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Search,
  Filter,
  Calendar,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
} from "lucide-react";

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "TRANSFER_IN" | "TRANSFER_OUT";

export interface TransactionFilters {
  symbol?: string;
  type?: TransactionType | "";
  startDate?: string;
  endDate?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onExport?: (format: "csv" | "pdf" | "excel" | "json") => void;
  onReset?: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  onReset,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.symbol || "");

  // Handle search
  const handleSearch = () => {
    onFiltersChange({
      ...filters,
      symbol: searchInput.trim().toUpperCase(),
    });
  };

  // Handle filter change
  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Handle reset
  const handleReset = () => {
    setSearchInput("");
    onFiltersChange({});
    if (onReset) {
      onReset();
    }
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.symbol ||
    filters.type ||
    filters.startDate ||
    filters.endDate
  );

  // Transaction type options
  const transactionTypes = [
    { value: "", label: "All Types" },
    { value: "BUY", label: "Buy", icon: TrendingUp, color: "text-green-600" },
    { value: "SELL", label: "Sell", icon: TrendingDown, color: "text-red-600" },
    { value: "DIVIDEND", label: "Dividend", icon: DollarSign, color: "text-blue-600" },
    { value: "TRANSFER_IN", label: "Transfer In", icon: TrendingUp, color: "text-purple-600" },
    { value: "TRANSFER_OUT", label: "Transfer Out", icon: TrendingDown, color: "text-orange-600" },
  ];

  // Export format options
  const exportFormats = [
    { value: "csv", label: "CSV" },
    { value: "excel", label: "Excel" },
    { value: "pdf", label: "PDF" },
    { value: "json", label: "JSON" },
  ];

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by symbol..."
              className="pl-10 pr-10"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  handleFilterChange("symbol", "");
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Transaction Type Filter */}
        <div className="w-full md:w-48">
          <Select
            value={filters.type || ""}
            onChange={(e) => handleFilterChange("type", e.target.value)}
          >
            {transactionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              );
            })}
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>

          {onExport && (
            <div className="relative group">
              <Button
                variant="outline"
                size="default"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              
              {/* Export Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="py-1">
                  {exportFormats.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => onExport(format.value as any)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as {format.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Advanced Filters</h4>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset All
              </button>
            )}
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  max={filters.endDate || new Date().toISOString().split("T")[0]}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  min={filters.startDate || ""}
                  max={new Date().toISOString().split("T")[0]}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Quick Select:</span>
            {[
              { label: "Today", days: 0 },
              { label: "Last 7 Days", days: 7 },
              { label: "Last 30 Days", days: 30 },
              { label: "Last 90 Days", days: 90 },
              { label: "This Year", days: "year" },
              { label: "All Time", days: "all" },
            ].map((range) => (
              <button
                key={range.label}
                onClick={() => {
                  if (range.days === "all") {
                    handleFilterChange("startDate", "");
                    handleFilterChange("endDate", "");
                  } else if (range.days === "year") {
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    handleFilterChange("startDate", startOfYear.toISOString().split("T")[0]);
                    handleFilterChange("endDate", now.toISOString().split("T")[0]);
                  } else {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - (range.days as number));
                    handleFilterChange("startDate", start.toISOString().split("T")[0]);
                    handleFilterChange("endDate", end.toISOString().split("T")[0]);
                  }
                }}
                className={`
                  px-3 py-1 text-sm rounded-full border transition-colors
                  ${
                    // Check if this range is currently selected
                    (() => {
                      if (range.days === "all" && !filters.startDate && !filters.endDate) {
                        return "bg-blue-600 text-white border-blue-600";
                      }
                      // Add more conditions for other ranges if needed
                      return "bg-white text-gray-700 border-gray-300 hover:border-gray-400";
                    })()
                  }
                `}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t">
              <div className="flex flex-wrap gap-2">
                {filters.symbol && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    Symbol: {filters.symbol}
                    <button
                      onClick={() => {
                        setSearchInput("");
                        handleFilterChange("symbol", "");
                      }}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.type && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    Type: {transactionTypes.find((t) => t.value === filters.type)?.label}
                    <button
                      onClick={() => handleFilterChange("type", "")}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.startDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    From: {new Date(filters.startDate).toLocaleDateString()}
                    <button
                      onClick={() => handleFilterChange("startDate", "")}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.endDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    To: {new Date(filters.endDate).toLocaleDateString()}
                    <button
                      onClick={() => handleFilterChange("endDate", "")}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};