import { ReactNode } from "react";

interface LoadingProps {
  size?: "small" | "medium" | "large";
  variant?: "spinner" | "dots" | "pulse" | "bars";
  color?: "primary" | "secondary" | "white" | "gray";
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

export default function Loading({
  size = "medium",
  variant = "spinner",
  color = "primary",
  text,
  fullScreen = false,
  overlay = false,
  className = "",
}: LoadingProps) {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  const colorClasses = {
    primary: "text-primary-600",
    secondary: "text-gray-600",
    white: "text-white",
    gray: "text-gray-400",
  };

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  };

  const renderSpinner = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
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
  );

  const renderDots = () => {
    const dotSize = {
      small: "w-1.5 h-1.5",
      medium: "w-2 h-2",
      large: "w-3 h-3",
    };

    return (
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSize[size]} bg-current rounded-full animate-pulse ${colorClasses[color]}`}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    );
  };

  const renderPulse = () => {
    const pulseSize = {
      small: "w-8 h-8",
      medium: "w-12 h-12",
      large: "w-16 h-16",
    };

    return (
      <div className={`${pulseSize[size]} ${colorClasses[color]}`}>
        <div className="w-full h-full bg-current rounded-full animate-ping opacity-75" />
      </div>
    );
  };

  const renderBars = () => {
    const barHeight = {
      small: "h-4",
      medium: "h-6",
      large: "h-8",
    };

    const barWidth = {
      small: "w-1",
      medium: "w-1.5",
      large: "w-2",
    };

    return (
      <div className="flex items-end space-x-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`${barWidth[size]} ${barHeight[size]} bg-current animate-pulse ${colorClasses[color]}`}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    );
  };

  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return renderDots();
      case "pulse":
        return renderPulse();
      case "bars":
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderLoader()}
      {text && (
        <p
          className={`mt-3 ${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton Loading Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  lines?: number;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  circle = false,
  lines = 1,
  className = "",
}: SkeletonProps) {
  const skeletonClass = `animate-pulse bg-gray-200 ${circle ? "rounded-full" : "rounded"} ${className}`;

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={skeletonClass}
            style={{
              width: i === lines - 1 ? "75%" : width,
              height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={skeletonClass}
      style={{
        width,
        height,
      }}
    />
  );
}

// Loading Button Component
interface LoadingButtonProps {
  loading: boolean;
  children: ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function LoadingButton({
  loading,
  children,
  loadingText,
  className = "",
  disabled = false,
  onClick,
  type = "button",
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
      )}
      {loading ? loadingText || "Loading..." : children}
    </button>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  max?: number;
  size?: "small" | "medium" | "large";
  color?: "primary" | "secondary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = "medium",
  color = "primary",
  showLabel = false,
  label,
  animated = false,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    small: "h-1",
    medium: "h-2",
    large: "h-4",
  };

  const colorClasses = {
    primary: "bg-primary-600",
    secondary: "bg-gray-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    danger: "bg-red-600",
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          {showLabel && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${colorClasses[color]} ${
            animated ? "animate-pulse" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
