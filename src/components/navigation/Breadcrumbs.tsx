import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  homeHref?: string;
  maxItems?: number;
  className?: string;
  truncate?: boolean;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = <ChevronRight className="h-4 w-4 text-gray-400" />,
  showHome = true,
  homeHref = "/",
  maxItems = 0,
  className,
  truncate = true,
}) => {
  // Process items for mobile/truncation
  const processedItems = React.useMemo(() => {
    if (maxItems <= 0 || items.length <= maxItems) {
      return items;
    }

    // Show first item, ellipsis, and last (maxItems - 2) items
    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 2));

    return [firstItem, { label: "...", href: undefined }, ...lastItems];
  }, [items, maxItems]);

  const renderItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const content = (
      <span className="flex items-center space-x-1">
        {item.icon && <item.icon className="h-4 w-4" />}
        <span className={cn(truncate && "max-w-[200px] truncate", "block")}>
          {item.label}
        </span>
      </span>
    );

    if (isLast || item.current || !item.href) {
      return (
        <li key={index} className="flex items-center">
          <span
            className={cn(
              "text-sm font-medium",
              isLast || item.current
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400",
            )}
          >
            {content}
          </span>
        </li>
      );
    }

    return (
      <li key={index} className="flex items-center">
        <Link
          href={item.href}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {content}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2">
        {showHome && (
          <>
            <li className="flex items-center">
              <Link
                href={homeHref}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {processedItems.length > 0 && (
              <li className="flex items-center" aria-hidden="true">
                {separator}
              </li>
            )}
          </>
        )}

        {processedItems.map((item, index) => {
          const isLast = index === processedItems.length - 1;

          return (
            <React.Fragment key={index}>
              {renderItem(item, index, isLast)}
              {!isLast && (
                <li className="flex items-center" aria-hidden="true">
                  {separator}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

// Export for use in other components
export default Breadcrumbs;

// Mock data
export const mockBreadcrumbs: BreadcrumbItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Holdings", href: "/portfolio/holdings" },
  { label: "AAPL", current: true },
];
