import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface ToastProps {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  closable?: boolean;
  pauseOnHover?: boolean;
  showProgress?: boolean;
  className?: string;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type = "info",
  title,
  message,
  duration = 5000,
  position = "bottom-right",
  onClose,
  action,
  closable = true,
  pauseOnHover = true,
  showProgress = true,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (type === "loading" || duration <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= 0) {
            handleClose();
            return 0;
          }
          return prev - 100 / (duration / 100);
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, isPaused, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    const iconClass = "h-5 w-5 flex-shrink-0";
    switch (type) {
      case "success":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />;
      case "error":
        return <XCircle className={cn(iconClass, "text-red-500")} />;
      case "warning":
        return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
      case "info":
        return <Info className={cn(iconClass, "text-blue-500")} />;
      case "loading":
        return (
          <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
        );
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "loading":
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const getPositionStyles = () => {
    const base = "fixed z-50";
    switch (position) {
      case "top-left":
        return `${base} top-4 left-4`;
      case "top-center":
        return `${base} top-4 left-1/2 -translate-x-1/2`;
      case "top-right":
        return `${base} top-4 right-4`;
      case "bottom-left":
        return `${base} bottom-4 left-4`;
      case "bottom-center":
        return `${base} bottom-4 left-1/2 -translate-x-1/2`;
      case "bottom-right":
        return `${base} bottom-4 right-4`;
    }
  };

  return (
    <div
      className={cn(
        getPositionStyles(),
        "transition-all duration-300",
        isVisible
          ? "opacity-100 transform scale-100"
          : "opacity-0 transform scale-95",
        className,
      )}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div
        className={cn(
          "relative min-w-[300px] max-w-md rounded-lg border shadow-lg overflow-hidden",
          "bg-white dark:bg-gray-800",
          getTypeStyles(),
        )}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {getIcon()}

            <div className="flex-1">
              {title && (
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {title}
                </h4>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>

              {action && (
                <button
                  onClick={action.onClick}
                  className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {action.label}
                </button>
              )}
            </div>

            {closable && type !== "loading" && (
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {showProgress && type !== "loading" && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                "h-full transition-all duration-100",
                type === "success" && "bg-green-500",
                type === "error" && "bg-red-500",
                type === "warning" && "bg-yellow-500",
                type === "info" && "bg-blue-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Toast Container for managing multiple toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = "bottom-right",
  maxToasts = 5,
}) => {
  const visibleToasts = toasts.slice(0, maxToasts);
  const isTop = position.includes("top");

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none",
        position.includes("left") && "left-4",
        position.includes("right") && "right-4",
        position.includes("center") && "left-1/2 -translate-x-1/2",
        isTop ? "top-4" : "bottom-4",
      )}
    >
      <div
        className={cn(
          "flex flex-col space-y-2 pointer-events-auto",
          isTop ? "" : "flex-col-reverse",
        )}
      >
        {visibleToasts.map((toast, index) => (
          <div
            key={toast.id || index}
            style={{
              transform: `translateY(${isTop ? index * 10 : -index * 10}px) scale(${1 - index * 0.05})`,
              opacity: 1 - index * 0.1,
              zIndex: maxToasts - index,
            }}
            className="transition-all duration-300"
          >
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (toast: Omit<ToastProps, "id">) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    if (toast.type !== "loading" && (!toast.duration || toast.duration > 0)) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (message: string, options?: Partial<ToastProps>) => {
    return showToast({ ...options, message, type: "success" });
  };

  const error = (message: string, options?: Partial<ToastProps>) => {
    return showToast({ ...options, message, type: "error" });
  };

  const warning = (message: string, options?: Partial<ToastProps>) => {
    return showToast({ ...options, message, type: "warning" });
  };

  const info = (message: string, options?: Partial<ToastProps>) => {
    return showToast({ ...options, message, type: "info" });
  };

  const loading = (message: string, options?: Partial<ToastProps>) => {
    return showToast({ ...options, message, type: "loading", duration: 0 });
  };

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    loading,
  };
};

export default Toast;
