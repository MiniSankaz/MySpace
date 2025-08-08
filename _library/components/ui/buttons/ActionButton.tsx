/**
 * ActionButton - Versatile action button component with different variants
 *
 * @example
 * ```tsx
 * <ActionButton variant="primary" onClick={handleSave}>
 *   Save
 * </ActionButton>
 *
 * <ActionButton variant="danger" icon="trash" loading={isDeleting}>
 *   Delete
 * </ActionButton>
 * ```
 */

import React from "react";
import { cn } from "@/shared/lib/utils";

interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Icon name (optional) */
  icon?: string;
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Children */
  children: React.ReactNode;
}

const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
  secondary: "bg-gray-600 hover:bg-gray-700 text-white border-gray-600",
  success: "bg-green-600 hover:bg-green-700 text-white border-green-600",
  warning: "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600",
  danger: "bg-red-600 hover:bg-red-700 text-white border-red-600",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700 border-gray-300",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function ActionButton({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center font-medium rounded-md border transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",

        // Variant styles
        variants[variant],

        // Size styles
        sizes[size],

        // Full width
        fullWidth && "w-full",

        // Loading state
        loading && "cursor-wait",

        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}

      {icon && !loading && (
        <span className="mr-2">
          {/* Icon would go here - can integrate with icon library */}
          🔧
        </span>
      )}

      {children}
    </button>
  );
}

export default ActionButton;
