import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Check,
  Zap,
  Brain,
  Sparkles,
  Star,
  Info,
  Settings,
  Loader2,
} from "lucide-react";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  speed: "fast" | "medium" | "slow";
  cost: "free" | "low" | "medium" | "high";
  contextWindow: number;
  recommended?: boolean;
  isDefault?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ModelSelectorProps {
  models: AIModel[];
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
  variant?: "dropdown" | "cards" | "compact";
  onSettingsClick?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onModelSelect,
  loading = false,
  disabled = false,
  showDetails = true,
  className,
  variant = "dropdown",
  onSettingsClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);

  const selectedModel =
    models.find((m) => m.id === selectedModelId) || models[0];

  const getSpeedIcon = (speed: AIModel["speed"]) => {
    switch (speed) {
      case "fast":
        return <Zap className="h-3 w-3 text-green-600 dark:text-green-400" />;
      case "medium":
        return <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />;
      case "slow":
        return <Zap className="h-3 w-3 text-red-600 dark:text-red-400" />;
    }
  };

  const getCostBadge = (cost: AIModel["cost"]) => {
    const costColors = {
      free: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      medium:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <span
        className={cn(
          "px-1.5 py-0.5 text-xs rounded font-medium",
          costColors[cost],
        )}
      >
        {cost === "free"
          ? "Free"
          : `${"$".repeat(cost === "low" ? 1 : cost === "medium" ? 2 : 3)}`}
      </span>
    );
  };

  const formatContextWindow = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  if (variant === "cards") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          className,
        )}
      >
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => !disabled && onModelSelect(model.id)}
            className={cn(
              "p-4 rounded-lg border cursor-pointer transition-all",
              selectedModelId === model.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {model.icon ? (
                  <model.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {model.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {model.provider}
                  </p>
                </div>
              </div>
              {selectedModelId === model.id && (
                <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {model.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getSpeedIcon(model.speed)}
                <span className="text-xs text-gray-500">
                  {formatContextWindow(model.contextWindow)} tokens
                </span>
              </div>
              {getCostBadge(model.cost)}
            </div>

            {model.recommended && (
              <div className="mt-2 flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400">
                <Star className="h-3 w-3" />
                <span>Recommended</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <select
          value={selectedModelId}
          onChange={(e) => onModelSelect(e.target.value)}
          disabled={disabled || loading}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 text-sm",
          "border border-gray-300 dark:border-gray-600 rounded-lg",
          "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100",
          "hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <div className="flex items-center space-x-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedModel.icon ? (
            <selectedModel.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <div className="text-left">
            <div className="font-medium">{selectedModel.name}</div>
            {showDetails && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedModel.provider} •{" "}
                {formatContextWindow(selectedModel.contextWindow)} tokens
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="p-2 max-h-96 overflow-y-auto">
            {models.map((model) => (
              <div
                key={model.id}
                onClick={() => {
                  onModelSelect(model.id);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHoveredModelId(model.id)}
                onMouseLeave={() => setHoveredModelId(null)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  selectedModelId === model.id
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {model.icon ? (
                      <model.icon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    ) : (
                      <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {model.name}
                        </h4>
                        {model.isDefault && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                            Default
                          </span>
                        )}
                        {model.recommended && (
                          <Star className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {model.provider}
                      </p>
                      {(hoveredModelId === model.id || showDetails) && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {model.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              {getSpeedIcon(model.speed)}
                              <span className="text-xs text-gray-500">
                                {model.speed}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatContextWindow(model.contextWindow)} tokens
                            </span>
                            {getCostBadge(model.cost)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedModelId === model.id && (
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {onSettingsClick && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSettingsClick();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Model Settings</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Mock data for display
export const mockAIModels: AIModel[] = [
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Most capable model for complex tasks",
    capabilities: ["Analysis", "Coding", "Creative Writing", "Math"],
    speed: "slow",
    cost: "high",
    contextWindow: 200000,
    recommended: true,
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    description: "Balanced performance and speed",
    capabilities: ["Analysis", "Coding", "Writing"],
    speed: "medium",
    cost: "medium",
    contextWindow: 200000,
    isDefault: true,
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Fast responses for simple tasks",
    capabilities: ["Chat", "Simple Tasks"],
    speed: "fast",
    cost: "low",
    contextWindow: 200000,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Advanced reasoning and analysis",
    capabilities: ["Analysis", "Coding", "Vision"],
    speed: "medium",
    cost: "high",
    contextWindow: 128000,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and cost-effective",
    capabilities: ["Chat", "Basic Tasks"],
    speed: "fast",
    cost: "low",
    contextWindow: 16385,
  },
];

export default ModelSelector;
