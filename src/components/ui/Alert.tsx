import { ReactNode } from "react";

interface AlertProps {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export default function Alert({
  children,
  variant = "info",
  title,
  dismissible = false,
  onDismiss,
  className = "",
}: AlertProps) {
  const variantConfig = {
    info: {
      containerClass: "bg-blue-50 border-blue-200",
      iconClass: "text-blue-400",
      titleClass: "text-blue-800",
      textClass: "text-blue-700",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    success: {
      containerClass: "bg-green-50 border-green-200",
      iconClass: "text-green-400",
      titleClass: "text-green-800",
      textClass: "text-green-700",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    warning: {
      containerClass: "bg-yellow-50 border-yellow-200",
      iconClass: "text-yellow-400",
      titleClass: "text-yellow-800",
      textClass: "text-yellow-700",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
    },
    error: {
      containerClass: "bg-red-50 border-red-200",
      iconClass: "text-red-400",
      titleClass: "text-red-800",
      textClass: "text-red-700",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className={`border rounded-md p-4 ${config.containerClass} ${className}`}
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${config.iconClass}`}>{config.icon}</div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleClass} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textClass}`}>{children}</div>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.iconClass} hover:opacity-75`}
            >
              <span className="sr-only">Dismiss</span>
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Toast Alert Component (for use with a toast system)
interface ToastAlertProps {
  id: string;
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export function ToastAlert({
  id,
  variant = "info",
  title,
  message,
  duration = 5000,
  onDismiss,
}: ToastAlertProps) {
  const handleDismiss = () => {
    onDismiss(id);
  };

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      onDismiss(id);
    }, duration);
  }

  return (
    <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <Alert
        variant={variant}
        title={title}
        dismissible
        onDismiss={handleDismiss}
      >
        {message}
      </Alert>
    </div>
  );
}

// Inline Alert Component
interface InlineAlertProps {
  variant?: "info" | "success" | "warning" | "error";
  message: string;
  className?: string;
}

export function InlineAlert({
  variant = "info",
  message,
  className = "",
}: InlineAlertProps) {
  const variantConfig = {
    info: { bgClass: "bg-blue-100", textClass: "text-blue-800" },
    success: { bgClass: "bg-green-100", textClass: "text-green-800" },
    warning: { bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
    error: { bgClass: "bg-red-100", textClass: "text-red-800" },
  };

  const config = variantConfig[variant];

  return (
    <div
      className={`px-3 py-2 rounded-md text-sm ${config.bgClass} ${config.textClass} ${className}`}
    >
      {message}
    </div>
  );
}
