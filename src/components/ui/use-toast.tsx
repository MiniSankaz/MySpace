import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (newToast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toastWithId = { ...newToast, id };

    setToasts((prev) => [...prev, toastWithId]);

    // Auto dismiss after duration (default 5 seconds)
    const duration = newToast.duration || 5000;
    setTimeout(() => {
      dismiss(id);
    }, duration);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  // If context is not available, return a simple implementation
  if (!context) {
    return {
      toast: (toast: Omit<Toast, "id">) => {
        // Simple console logging as fallback
        if (toast.variant === "destructive") {
          console.error(`[Toast Error] ${toast.title}:`, toast.description);
        } else {
          console.log(`[Toast] ${toast.title}:`, toast.description);
        }
      },
      toasts: [],
      dismiss: () => {},
    };
  }

  return context;
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            min-w-[300px] max-w-[420px] p-4 rounded-lg shadow-lg
            animate-in slide-in-from-bottom-2 duration-300
            ${
              toast.variant === "destructive"
                ? "bg-red-500/90 text-white"
                : "bg-gray-800/90 text-gray-100"
            }
            backdrop-blur-sm border border-gray-700/50
          `}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{toast.title}</h4>
              {toast.description && (
                <p className="text-xs mt-1 opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-4 text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
