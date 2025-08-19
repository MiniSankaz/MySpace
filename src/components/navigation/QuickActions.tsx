import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Zap,
  Command,
  Search,
  FileText,
  TrendingUp,
  Terminal,
  MessageSquare,
  Settings,
  Wallet,
  Calculator,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  description?: string;
  onClick: () => void;
  category?: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  variant?: "dropdown" | "grid" | "fab";
  position?: "top-right" | "bottom-right" | "bottom-left" | "top-left";
  showShortcuts?: boolean;
  showSearch?: boolean;
  className?: string;
  buttonLabel?: string;
  buttonIcon?: React.ComponentType<{ className?: string }>;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  variant = "dropdown",
  position = "bottom-right",
  showShortcuts = true,
  showSearch = true,
  className,
  buttonLabel = "Quick Actions",
  buttonIcon: ButtonIcon = Zap,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const filteredActions = actions.filter(
    (action) =>
      searchQuery === "" ||
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedActions = filteredActions.reduce(
    (acc, action) => {
      const category = action.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(action);
      return acc;
    },
    {} as Record<string, QuickAction[]>,
  );

  const handleActionClick = (action: QuickAction) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const positionClasses = {
    "top-right": "top-16 right-4",
    "bottom-right": "bottom-16 right-4",
    "bottom-left": "bottom-16 left-4",
    "top-left": "top-16 left-4",
  };

  // FAB Variant
  if (variant === "fab") {
    return (
      <>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed z-50 p-4 bg-blue-600 text-white rounded-full shadow-lg",
            "hover:bg-blue-700 transition-all duration-200 hover:scale-110",
            positionClasses[position],
            className,
          )}
        >
          <ButtonIcon className="h-6 w-6" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            <div
              className={cn(
                "fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl",
                "max-w-sm w-80 max-h-[500px] overflow-hidden",
                position.includes("right") ? "right-4" : "left-4",
                position.includes("bottom") ? "bottom-24" : "top-24",
              )}
            >
              {showSearch && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search actions..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="overflow-y-auto max-h-[400px] p-2">
                {Object.entries(groupedActions).map(
                  ([category, categoryActions]) => (
                    <div key={category} className="mb-4">
                      <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {categoryActions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleActionClick(action)}
                            disabled={action.disabled}
                            onMouseEnter={() => setHoveredAction(action.id)}
                            onMouseLeave={() => setHoveredAction(null)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                              "text-sm text-left transition-colors",
                              action.disabled
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700",
                              hoveredAction === action.id &&
                                "bg-gray-100 dark:bg-gray-700",
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <action.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {action.label}
                                </p>
                                {action.description &&
                                  hoveredAction === action.id && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {action.description}
                                    </p>
                                  )}
                              </div>
                            </div>
                            {showShortcuts && action.shortcut && (
                              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                                {action.shortcut}
                              </kbd>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}

                {filteredActions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No actions found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Grid Variant
  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {actions.slice(0, 9).map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={action.disabled}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg",
              "border border-gray-200 dark:border-gray-700",
              "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
              action.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <action.icon className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
            <span className="text-xs text-gray-700 dark:text-gray-300 text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Default Dropdown Variant
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-4 py-2",
          "bg-blue-600 text-white rounded-lg",
          "hover:bg-blue-700 transition-colors",
        )}
      >
        <ButtonIcon className="h-4 w-4" />
        <span>{buttonLabel}</span>
        {showShortcuts && (
          <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-700 rounded">
            ⌘K
          </kbd>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-72 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            {showSearch && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search actions..."
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto p-2">
              {filteredActions.map((action, index) => (
                <React.Fragment key={action.id}>
                  {index > 0 &&
                    actions[index - 1]?.category !== action.category && (
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    )}

                  <button
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded",
                      "text-sm text-left transition-colors",
                      action.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700",
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <action.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-gray-100">
                        {action.label}
                      </span>
                    </div>
                    {showShortcuts && action.shortcut && (
                      <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                </React.Fragment>
              ))}

              {filteredActions.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No actions found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Mock actions data
export const mockQuickActions: QuickAction[] = [
  {
    id: "new-trade",
    label: "New Trade",
    icon: TrendingUp,
    shortcut: "⌘T",
    description: "Place a new buy or sell order",
    category: "Trading",
    onClick: () => console.log("New Trade"),
  },
  {
    id: "portfolio-analysis",
    label: "Portfolio Analysis",
    icon: Calculator,
    shortcut: "⌘A",
    description: "Analyze portfolio performance",
    category: "Analytics",
    onClick: () => console.log("Portfolio Analysis"),
  },
  {
    id: "open-terminal",
    label: "Open Terminal",
    icon: Terminal,
    shortcut: "⌘`",
    description: "Launch development terminal",
    category: "Development",
    onClick: () => console.log("Open Terminal"),
  },
  {
    id: "ai-chat",
    label: "AI Assistant",
    icon: MessageSquare,
    shortcut: "⌘I",
    description: "Chat with AI assistant",
    category: "AI",
    onClick: () => console.log("AI Chat"),
  },
  {
    id: "new-document",
    label: "New Document",
    icon: FileText,
    shortcut: "⌘N",
    description: "Create a new document",
    category: "Files",
    onClick: () => console.log("New Document"),
  },
  {
    id: "deposit-funds",
    label: "Deposit Funds",
    icon: Wallet,
    description: "Add funds to your account",
    category: "Account",
    onClick: () => console.log("Deposit Funds"),
  },
  {
    id: "export-data",
    label: "Export Data",
    icon: Download,
    shortcut: "⌘E",
    description: "Export portfolio data",
    category: "Data",
    onClick: () => console.log("Export Data"),
  },
  {
    id: "import-data",
    label: "Import Data",
    icon: Upload,
    description: "Import portfolio data",
    category: "Data",
    onClick: () => console.log("Import Data"),
  },
  {
    id: "refresh",
    label: "Refresh Data",
    icon: RefreshCw,
    shortcut: "⌘R",
    description: "Refresh all data",
    category: "General",
    onClick: () => console.log("Refresh"),
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    shortcut: "⌘,",
    description: "Open application settings",
    category: "General",
    onClick: () => console.log("Settings"),
  },
];

export default QuickActions;
