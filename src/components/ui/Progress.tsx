import React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error" | "info";
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
  indeterminate?: boolean;
  className?: string;
  circular?: boolean;
  strokeWidth?: number;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = "md",
  variant = "default",
  showLabel = false,
  label,
  striped = false,
  animated = false,
  indeterminate = false,
  className,
  circular = false,
  strokeWidth = 4,
}) => {
  const percentage = indeterminate
    ? 0
    : Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    xs: circular ? "h-8 w-8" : "h-1",
    sm: circular ? "h-12 w-12" : "h-2",
    md: circular ? "h-16 w-16" : "h-3",
    lg: circular ? "h-20 w-20" : "h-4",
  };

  const variantClasses = {
    default: "bg-blue-600 dark:bg-blue-500",
    success: "bg-green-600 dark:bg-green-500",
    warning: "bg-yellow-600 dark:bg-yellow-500",
    error: "bg-red-600 dark:bg-red-500",
    info: "bg-cyan-600 dark:bg-cyan-500",
  };

  const backgroundClasses = {
    default: "bg-gray-200 dark:bg-gray-700",
    success: "bg-green-100 dark:bg-green-900/30",
    warning: "bg-yellow-100 dark:bg-yellow-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
    info: "bg-cyan-100 dark:bg-cyan-900/30",
  };

  const strokeColors = {
    default: "#2563EB",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    info: "#0891B2",
  };

  if (circular) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = indeterminate
      ? 0
      : circumference - (percentage / 100) * circumference;

    return (
      <div
        className={cn(
          "relative inline-flex items-center justify-center",
          sizeClasses[size],
          className,
        )}
      >
        <svg
          className={cn(
            "transform -rotate-90",
            indeterminate && "animate-spin",
          )}
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />

          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={strokeColors[variant]}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            className={cn(
              "transition-all duration-300 ease-in-out",
              indeterminate && "animate-pulse",
            )}
          />
        </svg>

        {showLabel && !indeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {label || `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Linear progress bar
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {!indeterminate && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          backgroundClasses[variant],
          sizeClasses[size],
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out relative overflow-hidden",
            variantClasses[variant],
            indeterminate && "animate-indeterminate",
          )}
          style={{ width: indeterminate ? "30%" : `${percentage}%` }}
        >
          {striped && (
            <div
              className={cn(
                "absolute inset-0 opacity-20",
                animated && "animate-stripes",
              )}
            >
              <div className="h-full w-full bg-stripes" />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        @keyframes stripes {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 40px 0;
          }
        }

        .animate-indeterminate {
          animation: indeterminate 1.5s infinite ease-in-out;
        }

        .animate-stripes {
          animation: stripes 1s linear infinite;
        }

        .bg-stripes {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};

// Progress with steps
interface StepProgressProps {
  steps: Array<{
    label: string;
    completed: boolean;
    active?: boolean;
  }>;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  className,
}) => {
  const completedSteps = steps.filter((step) => step.completed).length;
  const percentage = (completedSteps / steps.length) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white dark:bg-gray-800 transition-colors",
                  step.completed
                    ? "border-blue-600 bg-blue-600 dark:bg-blue-500"
                    : step.active
                      ? "border-blue-600 dark:border-blue-500"
                      : "border-gray-300 dark:border-gray-600",
                )}
              >
                {step.completed ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      step.active
                        ? "text-blue-600 dark:text-blue-500"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs text-center max-w-[80px]",
                  step.completed || step.active
                    ? "text-gray-900 dark:text-gray-100 font-medium"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Progress;
