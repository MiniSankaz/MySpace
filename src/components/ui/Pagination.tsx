"use client";

import { ReactNode } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "default" | "outline" | "minimal";
  disabled?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  size = "medium",
  variant = "default",
  disabled = false,
  className = "",
}: PaginationProps) {
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-2 text-sm",
    large: "px-4 py-3 text-base",
  };

  const variantClasses = {
    default: {
      button: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
      active: "border-primary-500 bg-primary-500 text-white",
      disabled: "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed",
    },
    outline: {
      button:
        "border border-gray-300 bg-transparent text-gray-700 hover:border-primary-500 hover:text-primary-500",
      active: "border-primary-500 bg-transparent text-primary-500",
      disabled:
        "border-gray-200 bg-transparent text-gray-400 cursor-not-allowed",
    },
    minimal: {
      button:
        "border-transparent bg-transparent text-gray-700 hover:bg-gray-100",
      active: "border-transparent bg-primary-100 text-primary-700",
      disabled:
        "border-transparent bg-transparent text-gray-400 cursor-not-allowed",
    },
  };

  const config = variantClasses[variant];

  // Generate page range
  const range = (start: number, end: number) => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  };

  const generatePagination = () => {
    // If total pages is less than or equal to 7, show all pages
    if (totalPages <= 7) {
      return range(1, totalPages);
    }

    // Calculate start and end page numbers
    const startPage = Math.max(1, currentPage - siblingCount);
    const endPage = Math.min(totalPages, currentPage + siblingCount);

    const showLeftEllipsis = startPage > 2;
    const showRightEllipsis = endPage < totalPages - 1;

    // Case 1: No ellipsis on either side
    if (!showLeftEllipsis && !showRightEllipsis) {
      return range(1, totalPages);
    }

    // Case 2: Ellipsis on the right side only
    if (!showLeftEllipsis && showRightEllipsis) {
      const leftRange = range(1, Math.max(5, endPage));
      return [...leftRange, "...", totalPages];
    }

    // Case 3: Ellipsis on the left side only
    if (showLeftEllipsis && !showRightEllipsis) {
      const rightRange = range(Math.min(totalPages - 4, startPage), totalPages);
      return [1, "...", ...rightRange];
    }

    // Case 4: Ellipsis on both sides
    const middleRange = range(startPage, endPage);
    return [1, "...", ...middleRange, "...", totalPages];
  };

  const pages = generatePagination();

  const handlePageClick = (page: number | string) => {
    if (typeof page === "number" && page !== currentPage && !disabled) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const renderPageButton = (page: number | string, index: number) => {
    if (page === "...") {
      return (
        <span
          key={index}
          className={`${sizeClasses[size]} border-transparent bg-transparent text-gray-400`}
        >
          ...
        </span>
      );
    }

    const pageNumber = page as number;
    const isActive = pageNumber === currentPage;
    const isDisabled = disabled;

    return (
      <button
        key={index}
        onClick={() => handlePageClick(pageNumber)}
        disabled={isDisabled}
        className={`
          ${sizeClasses[size]}
          ${isActive ? config.active : isDisabled ? config.disabled : config.button}
          rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        `}
        aria-current={isActive ? "page" : undefined}
        aria-label={`Page ${pageNumber}`}
      >
        {pageNumber}
      </button>
    );
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className={`flex items-center justify-center space-x-1 ${className}`}
      aria-label="Pagination"
    >
      {/* First page button */}
      {showFirstLast && currentPage > 1 && (
        <button
          onClick={() => handlePageClick(1)}
          disabled={disabled}
          className={`
            ${sizeClasses[size]}
            ${disabled ? config.disabled : config.button}
            rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          aria-label="First page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Previous button */}
      {showPrevNext && (
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || disabled}
          className={`
            ${sizeClasses[size]}
            ${currentPage === 1 || disabled ? config.disabled : config.button}
            rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          aria-label="Previous page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Page numbers */}
      <div className="flex items-center space-x-1">
        {pages.map(renderPageButton)}
      </div>

      {/* Next button */}
      {showPrevNext && (
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || disabled}
          className={`
            ${sizeClasses[size]}
            ${currentPage === totalPages || disabled ? config.disabled : config.button}
            rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          aria-label="Next page"
        >
          <svg
            className="w-4 h-4"
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
      )}

      {/* Last page button */}
      {showFirstLast && currentPage < totalPages && (
        <button
          onClick={() => handlePageClick(totalPages)}
          disabled={disabled}
          className={`
            ${sizeClasses[size]}
            ${disabled ? config.disabled : config.button}
            rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          aria-label="Last page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </nav>
  );
}

// Simple Pagination Component
interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  disabled = false,
  className = "",
}: SimplePaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-700">
          Page <span className="font-medium">{currentPage}</span> of{" "}
          <span className="font-medium">{totalPages}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || disabled}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || disabled}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Compact Pagination
interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = "",
}: CompactPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || disabled}
        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <span className="px-2 py-1 text-sm text-gray-700">
        {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || disabled}
        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <svg
          className="w-4 h-4"
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
    </div>
  );
}

// Load More Pagination
interface LoadMorePaginationProps {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  disabled?: boolean;
  loadMoreText?: string;
  loadingText?: string;
  className?: string;
}

export function LoadMorePagination({
  hasMore,
  loading = false,
  onLoadMore,
  disabled = false,
  loadMoreText = "Load More",
  loadingText = "Loading...",
  className = "",
}: LoadMorePaginationProps) {
  if (!hasMore && !loading) {
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <button
        onClick={onLoadMore}
        disabled={loading || disabled}
        className="px-6 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-200 rounded-md hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center space-x-2"
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
        )}
        <span>{loading ? loadingText : loadMoreText}</span>
      </button>
    </div>
  );
}
