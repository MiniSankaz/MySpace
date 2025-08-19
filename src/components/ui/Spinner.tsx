import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white" | "gray" | "current";
  className?: string;
  label?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
  label,
  fullScreen = false,
  overlay = false,
}) => {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const colorClasses = {
    primary: "text-blue-600",
    secondary: "text-gray-600",
    white: "text-white",
    gray: "text-gray-400",
    current: "text-current",
  };

  const spinner = (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center",
        className,
      )}
    >
      <svg
        className={cn("animate-spin", sizeClasses[size], colorClasses[color])}
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
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span
          className={cn(
            "mt-2 text-sm",
            color === "white"
              ? "text-white"
              : "text-gray-600 dark:text-gray-400",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-lg">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Spinner;
