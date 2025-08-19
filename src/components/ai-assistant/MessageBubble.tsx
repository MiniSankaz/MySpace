import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Bot,
  Copy,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Image,
  File,
  Download,
  ExternalLink,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  isLastMessage?: boolean;
  showActions?: boolean;
  className?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onEdit,
  onDelete,
  onCopy,
  isLastMessage = false,
  showActions = true,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    const textToCopy = message.content;
    if (onCopy) {
      onCopy(textToCopy);
    } else {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("text/") || type.includes("document"))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const renderContent = (content: string) => {
    // Check for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "code",
        language: match[1] || "plaintext",
        content: match[2].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content });
    }

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.type === "code") {
            return (
              <div key={index} className="relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigator.clipboard.writeText(part.content)}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 dark:bg-gray-950 rounded-lg overflow-x-auto">
                  <code className="text-sm text-gray-300">{part.content}</code>
                </pre>
              </div>
            );
          }

          // Render text with markdown-style formatting
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.content.split("\n").map((line, lineIndex) => {
                // Bold text
                line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                // Italic text
                line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");
                // Inline code
                line = line.replace(
                  /`(.*?)`/g,
                  '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm">$1</code>',
                );

                return (
                  <div
                    key={lineIndex}
                    dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
                    className="min-h-[1.5rem]"
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-3 mb-4",
        isUser && "flex-row-reverse",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-600" : "bg-gray-600 dark:bg-gray-500",
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 max-w-[70%]",
          isUser && "flex flex-col items-end",
        )}
      >
        {/* Name and Time */}
        <div
          className={cn(
            "flex items-center space-x-2 mb-1",
            isUser && "flex-row-reverse space-x-reverse",
          )}
        >
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-lg px-4 py-2",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
            message.error && "border-2 border-red-500",
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEdit}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.error ? (
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium">Error:</p>
                  <p className="text-sm">{message.error}</p>
                </div>
              ) : (
                <div className={cn("text-sm", isUser && "text-white")}>
                  {renderContent(message.content)}
                </div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded",
                        isUser
                          ? "bg-blue-700/50"
                          : "bg-gray-200 dark:bg-gray-600",
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        {getFileIcon(attachment.type)}
                        <div>
                          <p className="text-xs font-medium">
                            {attachment.name}
                          </p>
                          <p className="text-xs opacity-70">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      {attachment.url && (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Actions */}
          {showActions && isHovered && !isEditing && (
            <div
              className={cn(
                "absolute -top-8 flex items-center space-x-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-1",
                isUser ? "right-0" : "left-0",
              )}
            >
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              {isUser && onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Edit message"
                >
                  <Edit2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
