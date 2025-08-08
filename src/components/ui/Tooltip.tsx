"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click" | "focus";
  delay?: number;
  offset?: number;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

export default function Tooltip({
  children,
  content,
  position = "top",
  trigger = "hover",
  delay = 0,
  offset = 8,
  disabled = false,
  className = "",
  contentClassName = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        updatePosition();
      }, delay);
    } else {
      setIsVisible(true);
      updatePosition();
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    let x = 0;
    let y = 0;

    switch (position) {
      case "top":
        x = triggerRect.left + scrollLeft + triggerRect.width / 2;
        y = triggerRect.top + scrollTop - offset;
        break;
      case "bottom":
        x = triggerRect.left + scrollLeft + triggerRect.width / 2;
        y = triggerRect.bottom + scrollTop + offset;
        break;
      case "left":
        x = triggerRect.left + scrollLeft - offset;
        y = triggerRect.top + scrollTop + triggerRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + scrollLeft + offset;
        y = triggerRect.top + scrollTop + triggerRect.height / 2;
        break;
    }

    setTooltipPosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (trigger === "hover") {
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover") {
      hideTooltip();
    }
  };

  const handleClick = () => {
    if (trigger === "click") {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  };

  const handleFocus = () => {
    if (trigger === "focus") {
      showTooltip();
    }
  };

  const handleBlur = () => {
    if (trigger === "focus") {
      hideTooltip();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isVisible) {
      hideTooltip();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        trigger === "click" &&
        isVisible &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    };

    if (isVisible) {
      window.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", handleResize);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, trigger]);

  const getTransformStyle = () => {
    switch (position) {
      case "top":
        return "translate(-50%, -100%)";
      case "bottom":
        return "translate(-50%, 0%)";
      case "left":
        return "translate(-100%, -50%)";
      case "right":
        return "translate(0%, -50%)";
      default:
        return "translate(-50%, -100%)";
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-2 h-2 bg-gray-900 transform rotate-45";

    switch (position) {
      case "top":
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -translate-y-1/2`;
      case "bottom":
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 translate-y-1/2`;
      case "left":
        return `${baseClasses} left-full top-1/2 -translate-x-1/2 -translate-y-1/2`;
      case "right":
        return `${baseClasses} right-full top-1/2 translate-x-1/2 -translate-y-1/2`;
      default:
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -translate-y-1/2`;
    }
  };

  const tooltip = isVisible && (
    <div
      ref={tooltipRef}
      className={`
        fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg pointer-events-none
        ${contentClassName}
      `}
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: getTransformStyle(),
      }}
      role="tooltip"
    >
      {content}
      <div className={getArrowClasses()} />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        tabIndex={trigger === "focus" ? 0 : undefined}
      >
        {children}
      </div>
      {typeof document !== "undefined" && createPortal(tooltip, document.body)}
    </>
  );
}

// Rich Tooltip Component
interface RichTooltipProps extends Omit<TooltipProps, "content"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function RichTooltip({
  children,
  title,
  description,
  actions,
  contentClassName = "",
  ...props
}: RichTooltipProps) {
  const content = (
    <div className="max-w-xs">
      {title && <div className="font-semibold text-white mb-1">{title}</div>}
      {description && (
        <div className="text-gray-200 text-xs mb-2">{description}</div>
      )}
      {actions && <div className="flex space-x-2">{actions}</div>}
    </div>
  );

  return (
    <Tooltip
      {...props}
      content={content}
      contentClassName={`bg-gray-800 ${contentClassName}`}
    >
      {children}
    </Tooltip>
  );
}

// Confirmation Tooltip
interface ConfirmTooltipProps
  extends Omit<TooltipProps, "content" | "trigger"> {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function ConfirmTooltip({
  children,
  title = "Are you sure?",
  description,
  confirmText = "Yes",
  cancelText = "No",
  onConfirm,
  onCancel,
  loading = false,
  contentClassName = "",
  ...props
}: ConfirmTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm?.();
    setIsOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const content = (
    <div className="max-w-xs">
      <div className="font-semibold text-white mb-1">{title}</div>
      {description && (
        <div className="text-gray-200 text-xs mb-3">{description}</div>
      )}
      <div className="flex space-x-2">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1"
        >
          {loading && (
            <svg
              className="w-3 h-3 animate-spin"
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
          <span>{confirmText}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className="inline-block cursor-pointer"
    >
      <Tooltip
        {...props}
        content={content}
        trigger="click"
        contentClassName={`bg-gray-800 pointer-events-auto ${contentClassName}`}
      >
        {children}
      </Tooltip>
    </div>
  );
}

// Info Tooltip
interface InfoTooltipProps extends Omit<TooltipProps, "children"> {
  size?: "small" | "medium" | "large";
  variant?: "default" | "primary" | "warning" | "danger";
}

export function InfoTooltip({
  content,
  size = "medium",
  variant = "default",
  ...props
}: InfoTooltipProps) {
  const sizeClasses = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
  };

  const variantClasses = {
    default: "text-gray-400 hover:text-gray-600",
    primary: "text-primary-400 hover:text-primary-600",
    warning: "text-yellow-400 hover:text-yellow-600",
    danger: "text-red-400 hover:text-red-600",
  };

  return (
    <Tooltip {...props} content={content}>
      <svg
        className={`${sizeClasses[size]} ${variantClasses[variant]} cursor-help`}
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
    </Tooltip>
  );
}
