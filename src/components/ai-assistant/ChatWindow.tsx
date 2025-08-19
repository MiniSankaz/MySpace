import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import StreamingIndicator from "./StreamingIndicator";
import {
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface ChatWindowProps {
  conversationId: string;
  messages: Message[];
  loading?: boolean;
  error?: string;
  isStreaming?: boolean;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSearch?: (query: string) => void;
  onExport?: () => void;
  onClearHistory?: () => void;
  className?: string;
  placeholder?: string;
  showHeader?: boolean;
  showSearch?: boolean;
  maxHeight?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  messages,
  loading = false,
  error,
  isStreaming = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onSearch,
  onExport,
  onClearHistory,
  className,
  placeholder = "Type your message...",
  showHeader = true,
  showSearch = false,
  maxHeight = "600px",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleSend = () => {
    if (inputValue.trim() || attachments.length > 0) {
      onSendMessage(inputValue.trim(), attachments);
      setInputValue("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearch = () => {
    if (searchQuery && onSearch) {
      onSearch(searchQuery);
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (error && !messages.length) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
          className,
        )}
      >
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col",
        className,
      )}
      style={{ maxHeight }}
    >
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Assistant
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Conversation ID: {conversationId}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {showSearch && (
                <button
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              {onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearchBar && (
            <div className="mt-3 flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search messages..."
                className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Start a conversation with AI Assistant
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Ask questions, get help with code, or explore ideas
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {date}
                    </span>
                  </div>
                </div>
                {dateMessages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    isLastMessage={index === dateMessages.length - 1}
                  />
                ))}
              </div>
            ))}
            {isStreaming && <StreamingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <Paperclip className="h-3 w-3 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Field */}
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isStreaming}
              className="w-full px-4 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              rows={1}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="absolute right-2 bottom-2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={
              isStreaming || (!inputValue.trim() && attachments.length === 0)
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Mock data for display
export const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Hello! Can you help me analyze my portfolio performance?",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: "2",
    role: "assistant",
    content: `I'd be happy to help you analyze your portfolio performance! To provide you with the most accurate analysis, I'll need some information:

1. **Portfolio Composition**: What assets do you currently hold (stocks, bonds, crypto, etc.)?
2. **Time Period**: What timeframe would you like to analyze?
3. **Benchmarks**: Would you like to compare against any specific indices (S&P 500, NASDAQ, etc.)?
4. **Risk Metrics**: Are you interested in volatility, Sharpe ratio, or other risk measurements?

Once you provide these details, I can give you a comprehensive analysis including performance metrics, risk assessment, and recommendations for optimization.`,
    timestamp: new Date(Date.now() - 1000 * 60 * 9),
  },
  {
    id: "3",
    role: "user",
    content:
      "I have mostly tech stocks: AAPL, MSFT, GOOGL, and some TSLA. Looking at the past 6 months.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "4",
    role: "assistant",
    content: `Based on your tech-heavy portfolio, here's a 6-month performance analysis:

## Portfolio Performance Summary

### Overall Returns
- **Portfolio Return**: +18.3%
- **S&P 500 Return**: +12.1%
- **NASDAQ Return**: +15.7%
- **Alpha Generated**: +6.2%

### Individual Stock Performance
1. **AAPL**: +22.5% (Best performer)
2. **MSFT**: +19.8%
3. **GOOGL**: +15.2%
4. **TSLA**: +14.1%

### Risk Metrics
- **Portfolio Volatility**: 24.3%
- **Sharpe Ratio**: 1.42
- **Beta**: 1.18 (higher market sensitivity)
- **Maximum Drawdown**: -12.8%

### Key Observations
✅ **Strengths**: Your portfolio has outperformed major indices
⚠️ **Risks**: High concentration in tech sector increases volatility
💡 **Recommendation**: Consider diversification into other sectors

Would you like me to provide specific rebalancing suggestions?`,
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
];

export default ChatWindow;
