/**
 * DataTable - Reusable data table component with sorting, filtering, and pagination
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'email', label: 'Email', sortable: true },
 *   { key: 'role', label: 'Role' }
 * ]
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   onRowClick={handleRowClick}
 *   pagination={true}
 * />
 * ```
 */

import React, { useState, useMemo } from "react";
import { cn } from "@/shared/lib/utils";

export interface ColumnDef<T> {
  /** Unique key for the column */
  key: keyof T;
  /** Display label */
  label: string;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Custom render function */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Column width */
  width?: string | number;
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Column is hidden */
  hidden?: boolean;
}

interface DataTableProps<T> {
  /** Array of data objects */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Loading state */
  loading?: boolean;
  /** Enable pagination */
  pagination?: boolean;
  /** Items per page (when pagination enabled) */
  pageSize?: number;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Table className */
  className?: string;
  /** Row className function */
  rowClassName?: (row: T, index: number) => string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  pagination = false,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No data found",
  className,
  rowClassName,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];
        return value
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }),
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  // Handle sort
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const visibleColumns = columns.filter((col) => !col.hidden);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Search */}
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 bg-white">
          {/* Header */}
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={cn(
                    "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-gray-100",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                  )}
                  style={{ width: column.width }}
                  onClick={
                    column.sortable ? () => handleSort(column.key) : undefined
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="flex flex-col">
                        <span
                          className={cn(
                            "text-xs",
                            sortColumn === column.key && sortDirection === "asc"
                              ? "text-blue-600"
                              : "text-gray-400",
                          )}
                        >
                          ▲
                        </span>
                        <span
                          className={cn(
                            "text-xs -mt-1",
                            sortColumn === column.key &&
                              sortDirection === "desc"
                              ? "text-blue-600"
                              : "text-gray-400",
                          )}
                        >
                          ▼
                        </span>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "hover:bg-gray-50",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row, index),
                  )}
                  onClick={
                    onRowClick ? () => onRowClick(row, index) : undefined
                  }
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, sortedData.length)}
                </span>{" "}
                of <span className="font-medium">{sortedData.length}</span>{" "}
                results
              </p>
            </div>

            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                        currentPage === pageNum
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50",
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
