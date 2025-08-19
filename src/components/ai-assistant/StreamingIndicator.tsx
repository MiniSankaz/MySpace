import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface StreamingIndicatorProps {
  message?: string;
  variant?: "dots" | "pulse" | "typing" | "wave";
  size?: "sm" | "md" | "lg";
  className?: string;
  showAvatar?: boolean;
  customText?: string;
}

const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  message = "AI is thinking",
  variant = "dots",
  size = "md",
  className,
  showAvatar = true,
  customText,
}) => {
  const [dots, setDots] = useState("");
  const [typingIndex, setTypingIndex] = useState(0);

  // Animate dots
  useEffect(() => {
    if (variant === "dots") {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === "...") return "";
          return prev + ".";
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [variant]);

  // Animate typing effect
  useEffect(() => {
    if (variant === "typing") {
      const interval = setInterval(() => {
        setTypingIndex((prev) => (prev + 1) % 4);
      }, 400);
      return () => clearInterval(interval);
    }
  }, [variant]);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const dotSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const avatarSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const renderIndicator = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="flex items-center space-x-2">
            <span
              className={cn(
                sizeClasses[size],
                "text-gray-600 dark:text-gray-400",
              )}
            >
              {customText || message}
              {dots}
            </span>
          </div>
        );

      case "pulse":
        return (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    dotSizeClasses[size],
                    "bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse",
                    i === 1 && "animation-delay-200",
                    i === 2 && "animation-delay-400",
                  )}
                  style={{
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>
            <span
              className={cn(
                sizeClasses[size],
                "text-gray-600 dark:text-gray-400 ml-2",
              )}
            >
              {customText || message}
            </span>
          </div>
        );

      case "typing":
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    dotSizeClasses[size],
                    "rounded-full transition-all duration-300",
                    typingIndex === i
                      ? "bg-gray-900 dark:bg-gray-100 scale-125"
                      : "bg-gray-400 dark:bg-gray-500",
                  )}
                />
              ))}
            </div>
          </div>
        );

      case "wave":
        return (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-blue-600 dark:bg-blue-400 rounded-full",
                    dotSizeClasses[size],
                  )}
                  style={{
                    animation: "wave 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span
              className={cn(
                sizeClasses[size],
                "text-gray-600 dark:text-gray-400 ml-2",
              )}
            >
              {customText || message}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {showAvatar && (
        <div
          className={cn(
            "flex-shrink-0 rounded-full bg-gray-600 dark:bg-gray-500 flex items-center justify-center",
            avatarSizeClasses[size],
          )}
        >
          <Bot
            className={cn(
              "text-white",
              size === "sm" && "h-4 w-4",
              size === "md" && "h-5 w-5",
              size === "lg" && "h-6 w-6",
            )}
          />
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span
            className={cn(
              "font-medium text-gray-700 dark:text-gray-300",
              sizeClasses[size],
            )}
          >
            AI Assistant
          </span>
        </div>

        <div className="inline-block">{renderIndicator()}</div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
};

export default StreamingIndicator;
