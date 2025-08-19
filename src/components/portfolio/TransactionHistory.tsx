"use client";

import React, { useState, useEffect } from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";
import {
  Edit2,
  Trash2,
  Copy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  ChevronUp,
  ChevronDown,
  Calendar,
  Hash,
  FileText,
} from "lucide-react";

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "TRANSFER_IN" | "TRANSFER_OUT";

interface Transaction {
  id: string;
  type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  notes?: string;
  executedAt: string;
  createdAt: string;
  updatedAt: string;
  // คำนวณเพิ่มเติม
  profitLoss?: number;
  profitLossPercent?: number;
}

interface TransactionHistoryProps {
  portfolioId: string;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
}

type SortField = "date" | "symbol" | "type" | "amount" | "total";
type SortOrder = "asc" | "desc";

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  portfolioId,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Selection state
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
      });
      
      const response = await fetch(
        `/api/v1/portfolios/${portfolioId}/transactions?${params}`,
        {
          headers: {
            "x-user-id": "test-user", // TODO: ใช้ user ID จริงจาก context
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      
      const data = await response.json();
      setTransactions(data.data.transactions || []);
      setTotalCount(data.data.total || 0);
      setTotalPages(Math.ceil((data.data.total || 0) / pageSize));
    } catch (err: any) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [portfolioId, currentPage, pageSize, sortField, sortOrder]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTransactions(newSelection);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.size} transactions?`)) {
      return;
    }
    
    try {
      // Delete each selected transaction
      const deletePromises = Array.from(selectedTransactions).map((id) =>
        fetch(`/api/v1/transactions/${id}`, {
          method: "DELETE",
          headers: {
            "x-user-id": "test-user",
          },
        })
      );
      
      await Promise.all(deletePromises);
      setSelectedTransactions(new Set());
      fetchTransactions(); // Refresh list
    } catch (err: any) {
      setError("Failed to delete transactions");
    }
  };

  // Format transaction type
  const getTransactionTypeDisplay = (type: TransactionType) => {
    const config = {
      BUY: { label: "Buy", color: "success", icon: TrendingUp },
      SELL: { label: "Sell", color: "destructive", icon: TrendingDown },
      DIVIDEND: { label: "Dividend", color: "default", icon: DollarSign },
      TRANSFER_IN: { label: "Transfer In", color: "secondary", icon: TrendingUp },
      TRANSFER_OUT: { label: "Transfer Out", color: "warning", icon: TrendingDown },
    };
    
    return config[type] || { label: type, color: "default", icon: Hash };
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format number
  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        {error}
      </Alert>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
        <p className="text-sm text-gray-500">
          Start by adding your first transaction to track your portfolio performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      {selectedTransactions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedTransactions.size} transaction{selectedTransactions.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTransactions(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <SortIcon field="date" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center gap-1">
                    Type
                    <SortIcon field="type" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("symbol")}
                >
                  <div className="flex items-center gap-1">
                    Symbol
                    <SortIcon field="symbol" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fees
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("total")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    <SortIcon field="total" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const typeConfig = getTransactionTypeDisplay(transaction.type);
                const TypeIcon = typeConfig.icon;
                
                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${
                      selectedTransactions.has(transaction.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleSelectOne(transaction.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(transaction.executedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={typeConfig.color as any} className="flex items-center gap-1 w-fit">
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {transaction.symbol}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {transaction.type !== "DIVIDEND" ? formatNumber(transaction.quantity, 4) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ${formatNumber(transaction.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      ${formatNumber(transaction.fees)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      ${formatNumber(transaction.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {transaction.notes && (
                          <button
                            title={transaction.notes}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(transaction)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDuplicate && (
                          <button
                            onClick={() => onDuplicate(transaction)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(transaction)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};