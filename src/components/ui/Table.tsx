"use client";

import { ReactNode, useState, useMemo } from "react";

interface Column<T> {
  key: keyof T | string;
  title: ReactNode;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right";
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  sticky?: boolean;
  scrollable?: boolean;
  emptyText?: ReactNode;
  className?: string;
  rowKey?: keyof T | ((record: T, index: number) => string);
  onRowClick?: (record: T, index: number) => void;
  rowSelection?: {
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
}

type SortOrder = "asc" | "desc" | null;

interface SortState {
  key: string;
  order: SortOrder;
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  striped = false,
  bordered = false,
  hoverable = true,
  compact = false,
  sticky = false,
  scrollable = false,
  emptyText = "No data available",
  className = "",
  rowKey,
  onRowClick,
  rowSelection,
}: TableProps<T>) {
  const [sortState, setSortState] = useState<SortState>({
    key: "",
    order: null,
  });
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Generate row keys
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === "function") {
      return rowKey(record, index);
    }
    if (rowKey && record[rowKey] != null) {
      return String(record[rowKey]);
    }
    return String(index);
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.order) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortState.key];
      const bVal = b[sortState.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortState.order === "asc" ? -1 : 1;
      if (bVal == null) return sortState.order === "asc" ? 1 : -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortState.order === "asc" ? comparison : -comparison;
      }

      if (aVal < bVal) return sortState.order === "asc" ? -1 : 1;
      if (aVal > bVal) return sortState.order === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortState]);

  // Filter data
  const filteredData = useMemo(() => {
    return sortedData.filter((record) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const value = String(record[key] || "").toLowerCase();
        return value.includes(filterValue.toLowerCase());
      });
    });
  }, [sortedData, filters]);

  const handleSort = (key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, order: "asc" };
      }
      if (prev.order === "asc") {
        return { key, order: "desc" };
      }
      if (prev.order === "desc") {
        return { key: "", order: null };
      }
      return { key, order: "asc" };
    });
  };

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRowSelect = (recordKey: string, record: T, checked: boolean) => {
    if (!rowSelection?.onChange) return;

    const currentKeys = rowSelection.selectedRowKeys || [];
    const newKeys = checked
      ? [...currentKeys, recordKey]
      : currentKeys.filter((key) => key !== recordKey);

    const selectedRows = filteredData.filter((item, index) =>
      newKeys.includes(getRowKey(item, index)),
    );

    rowSelection.onChange(newKeys, selectedRows);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!rowSelection?.onChange) return;

    if (checked) {
      const allKeys = filteredData.map((record, index) =>
        getRowKey(record, index),
      );
      const enabledKeys = allKeys.filter((key, index) => {
        const checkboxProps = rowSelection.getCheckboxProps?.(
          filteredData[index],
        );
        return !checkboxProps?.disabled;
      });
      rowSelection.onChange(
        enabledKeys,
        filteredData.filter((_, index) => {
          const checkboxProps = rowSelection.getCheckboxProps?.(
            filteredData[index],
          );
          return !checkboxProps?.disabled;
        }),
      );
    } else {
      rowSelection.onChange([], []);
    }
  };

  const selectedKeys = rowSelection?.selectedRowKeys || [];
  const selectableRowsCount = filteredData.filter((record) => {
    const checkboxProps = rowSelection?.getCheckboxProps?.(record);
    return !checkboxProps?.disabled;
  }).length;

  const allSelected =
    selectableRowsCount > 0 && selectedKeys.length === selectableRowsCount;
  const someSelected =
    selectedKeys.length > 0 && selectedKeys.length < selectableRowsCount;

  const tableClasses = [
    "min-w-full",
    bordered && "border border-gray-300",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cellPadding = compact ? "px-3 py-1.5" : "px-6 py-4";

  return (
    <div className={`${scrollable ? "overflow-x-auto" : ""}`}>
      <table className={tableClasses}>
        <thead className={`${sticky ? "sticky top-0" : ""} bg-gray-50`}>
          <tr>
            {rowSelection && (
              <th className={`${cellPadding} text-left`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
            )}
            {columns.map((column, index) => {
              const isActive = sortState.key === column.key;
              const alignClass = {
                left: "text-left",
                center: "text-center",
                right: "text-right",
              }[column.align || "left"];

              return (
                <th
                  key={String(column.key) || index}
                  className={`${cellPadding} ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable
                      ? "cursor-pointer select-none hover:bg-gray-100"
                      : ""
                  } ${column.className || ""}`}
                  style={{ width: column.width }}
                  onClick={() =>
                    column.sortable && handleSort(String(column.key))
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${
                            isActive && sortState.order === "asc"
                              ? "text-primary-600"
                              : "text-gray-400"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M7 14l5-5 5 5z" />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${
                            isActive && sortState.order === "desc"
                              ? "text-primary-600"
                              : "text-gray-400"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M7 10l5 5 5-5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {column.filterable && (
                    <div className="mt-1">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        onChange={(e) =>
                          handleFilter(String(column.key), e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody
          className={`bg-white divide-y divide-gray-200 ${loading ? "opacity-50" : ""}`}
        >
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (rowSelection ? 1 : 0)}
                className={`${cellPadding} text-center`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="w-5 h-5 animate-spin text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-gray-500">Loading...</span>
                </div>
              </td>
            </tr>
          ) : filteredData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (rowSelection ? 1 : 0)}
                className={`${cellPadding} text-center text-gray-500`}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            filteredData.map((record, recordIndex) => {
              const key = getRowKey(record, recordIndex);
              const isSelected = selectedKeys.includes(key);
              const checkboxProps = rowSelection?.getCheckboxProps?.(record);

              return (
                <tr
                  key={key}
                  className={`
                    ${striped && recordIndex % 2 !== 0 ? "bg-gray-50" : ""}
                    ${hoverable ? "hover:bg-gray-50" : ""}
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${isSelected ? "bg-primary-50" : ""}
                  `}
                  onClick={() => onRowClick?.(record, recordIndex)}
                >
                  {rowSelection && (
                    <td className={cellPadding}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={checkboxProps?.disabled}
                        onChange={(e) =>
                          handleRowSelect(key, record, e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((column, columnIndex) => {
                    const value = record[column.key as keyof T];
                    const content = column.render
                      ? column.render(value, record, recordIndex)
                      : String(value || "");

                    const alignClass = {
                      left: "text-left",
                      center: "text-center",
                      right: "text-right",
                    }[column.align || "left"];

                    return (
                      <td
                        key={String(column.key) || columnIndex}
                        className={`${cellPadding} ${alignClass} text-sm text-gray-900 ${column.className || ""}`}
                        style={{ width: column.width }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// Expandable Table Component
interface ExpandableTableProps<T> extends TableProps<T> {
  expandable?: {
    expandedRowRender: (record: T, index: number) => ReactNode;
    expandedRowKeys?: string[];
    onExpandedRowsChange?: (expandedKeys: string[]) => void;
    rowExpandable?: (record: T) => boolean;
  };
}

export function ExpandableTable<T extends Record<string, any>>({
  expandable,
  ...props
}: ExpandableTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(
    expandable?.expandedRowKeys || [],
  );

  const handleToggleExpand = (key: string) => {
    const newKeys = expandedKeys.includes(key)
      ? expandedKeys.filter((k) => k !== key)
      : [...expandedKeys, key];

    setExpandedKeys(newKeys);
    expandable?.onExpandedRowsChange?.(newKeys);
  };

  // Add expand column
  const expandColumn: Column<T> = {
    key: "__expand__",
    title: "",
    width: 50,
    render: (_, record, index) => {
      if (expandable?.rowExpandable && !expandable.rowExpandable(record)) {
        return null;
      }

      const key =
        typeof props.rowKey === "function"
          ? props.rowKey(record, index)
          : String(record[props.rowKey as keyof T] || index);

      const isExpanded = expandedKeys.includes(key);

      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpand(key);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      );
    },
  };

  const columnsWithExpand = [expandColumn, ...props.columns];

  return <Table {...props} columns={columnsWithExpand} />;
}
