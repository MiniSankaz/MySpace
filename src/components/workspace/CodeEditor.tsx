import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Save,
  Copy,
  Search,
  Replace,
  Settings,
  Maximize2,
  Minimize2,
  Download,
  Upload,
  Code2,
  Terminal,
  Loader2,
} from "lucide-react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: "light" | "dark" | "monokai" | "github";
  height?: number | string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
  tabSize?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (value: string) => void;
  onMount?: (editor: any) => void;
  loading?: boolean;
  error?: string;
  className?: string;
  showToolbar?: boolean;
  enableFind?: boolean;
  enableReplace?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = "javascript",
  theme = "dark",
  height = 400,
  readOnly = false,
  showLineNumbers = true,
  showMinimap = true,
  wordWrap = true,
  fontSize = 14,
  tabSize = 2,
  autoSave = false,
  autoSaveDelay = 1000,
  onSave,
  onMount,
  loading = false,
  error,
  className,
  showToolbar = true,
  enableFind = true,
  enableReplace = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Simple code editor implementation (placeholder for Monaco)
  // In production, you would integrate Monaco Editor here

  useEffect(() => {
    if (autoSave && hasChanges && onSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        onSave(value);
        setHasChanges(false);
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, autoSave, autoSaveDelay, hasChanges, onSave]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(value);
      setHasChanges(false);
    }
  };

  const handleFind = () => {
    if (!findText) return;
    // Implement find logic
    const textarea = textareaRef.current;
    if (textarea) {
      const index = value.toLowerCase().indexOf(findText.toLowerCase());
      if (index !== -1) {
        textarea.setSelectionRange(index, index + findText.length);
        textarea.focus();
      }
    }
  };

  const handleReplace = () => {
    if (!findText) return;
    const newValue = value.replace(new RegExp(findText, "g"), replaceText);
    handleChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setShowFindReplace(true);
    }
  };

  const getLanguageMode = (lang: string) => {
    const modes: Record<string, string> = {
      javascript: "javascript",
      typescript: "typescript",
      python: "python",
      java: "java",
      cpp: "c++",
      html: "html",
      css: "css",
      json: "json",
      markdown: "markdown",
      sql: "sql",
      yaml: "yaml",
      xml: "xml",
    };
    return modes[lang] || "plaintext";
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center",
          className,
        )}
        style={{ height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-gray-900 rounded-lg border border-red-700 flex items-center justify-center",
          className,
        )}
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading editor</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gray-900 rounded-lg border border-gray-700 flex flex-col",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className,
      )}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {language.toUpperCase()}
            </span>
            {hasChanges && (
              <span className="px-2 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded">
                Modified
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {enableFind && (
              <button
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                title="Find & Replace (Ctrl+F)"
              >
                <Search className="h-4 w-4 text-gray-400" />
              </button>
            )}

            {onSave && (
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title="Save (Ctrl+S)"
              >
                <Save className="h-4 w-4 text-gray-400" />
              </button>
            )}

            <button
              onClick={() => navigator.clipboard.writeText(value)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Copy All"
            >
              <Copy className="h-4 w-4 text-gray-400" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-gray-400" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <button className="p-1.5 hover:bg-gray-700 rounded transition-colors">
              <Settings className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className="px-2 py-1 text-sm bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-blue-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleFind()}
            />
            {enableReplace && (
              <>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace..."
                  className="px-2 py-1 text-sm bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={handleReplace}
                  className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Replace All
                </button>
              </>
            )}
            <button
              onClick={() => setShowFindReplace(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {showLineNumbers && (
          <div className="px-2 py-3 bg-gray-850 text-gray-500 text-right select-none overflow-hidden">
            {value.split("\n").map((_, index) => (
              <div
                key={index}
                className="leading-relaxed"
                style={{ fontSize: `${fontSize}px`, lineHeight: "1.5" }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={cn(
              "w-full h-full p-3 bg-transparent text-gray-100 resize-none outline-none",
              "font-mono leading-relaxed",
              wordWrap
                ? "whitespace-pre-wrap"
                : "whitespace-pre overflow-x-auto",
            )}
            style={{
              fontSize: `${fontSize}px`,
              tabSize,
              lineHeight: "1.5",
              height: typeof height === "number" ? `${height}px` : height,
            }}
            spellCheck={false}
          />

          {/* Syntax Highlighting Overlay (simplified) */}
          <div
            className="absolute inset-0 p-3 pointer-events-none overflow-hidden"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: "1.5",
            }}
          >
            {/* In production, implement proper syntax highlighting here */}
          </div>
        </div>

        {/* Minimap (placeholder) */}
        {showMinimap && (
          <div className="w-24 bg-gray-850 border-l border-gray-700 p-2">
            <div className="text-xs text-gray-600">
              {/* Minimap implementation */}
              <div className="h-full bg-gray-800 rounded" />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Line {value.split("\n").length}</span>
          <span>Characters {value.length}</span>
          <span>{readOnly ? "Read Only" : "Editable"}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Spaces: {tabSize}</span>
          <span>UTF-8</span>
          <span>{theme} theme</span>
        </div>
      </div>
    </div>
  );
};

// Mock code samples
export const mockCodeSamples = {
  javascript: `// JavaScript Example
function calculatePortfolioValue(holdings) {
  return holdings.reduce((total, holding) => {
    const value = holding.quantity * holding.currentPrice;
    return total + value;
  }, 0);
}

const portfolio = [
  { symbol: 'AAPL', quantity: 100, currentPrice: 150 },
  { symbol: 'GOOGL', quantity: 50, currentPrice: 2800 },
  { symbol: 'MSFT', quantity: 75, currentPrice: 300 }
];

console.log('Total Value: $' + calculatePortfolioValue(portfolio));`,

  typescript: `// TypeScript Example
interface Holding {
  symbol: string;
  quantity: number;
  currentPrice: number;
  purchasePrice: number;
}

class Portfolio {
  private holdings: Holding[] = [];
  
  addHolding(holding: Holding): void {
    this.holdings.push(holding);
  }
  
  getTotalValue(): number {
    return this.holdings.reduce((total, h) => 
      total + (h.quantity * h.currentPrice), 0
    );
  }
  
  getProfit(): number {
    return this.holdings.reduce((total, h) => 
      total + (h.quantity * (h.currentPrice - h.purchasePrice)), 0
    );
  }
}`,

  python: `# Python Example
import pandas as pd
import numpy as np

class PortfolioAnalyzer:
    def __init__(self, holdings):
        self.holdings = pd.DataFrame(holdings)
    
    def calculate_total_value(self):
        self.holdings['value'] = self.holdings['quantity'] * self.holdings['current_price']
        return self.holdings['value'].sum()
    
    def calculate_returns(self):
        self.holdings['returns'] = (
            (self.holdings['current_price'] - self.holdings['purchase_price']) / 
            self.holdings['purchase_price'] * 100
        )
        return self.holdings[['symbol', 'returns']]
    
    def get_top_performers(self, n=5):
        return self.holdings.nlargest(n, 'returns')`,
};

export default CodeEditor;
