import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info";
  size?: "small" | "medium" | "large";
  rounded?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function Badge({
  children,
  variant = "default",
  size = "medium",
  rounded = false,
  className = "",
  onClick,
}: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-primary-100 text-primary-800",
    secondary: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const sizeClasses = {
    small: "px-2 py-0.5 text-xs",
    medium: "px-2.5 py-1 text-sm",
    large: "px-3 py-1.5 text-base",
  };

  const classes = [
    "inline-flex items-center font-medium",
    variantClasses[variant],
    sizeClasses[size],
    rounded ? "rounded-full" : "rounded",
    onClick && "cursor-pointer hover:opacity-80 transition-opacity",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Component = onClick ? "button" : "span";

  return (
    <Component className={classes} onClick={onClick}>
      {children}
    </Component>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status:
    | "active"
    | "inactive"
    | "pending"
    | "draft"
    | "published"
    | "archived";
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: "success" as const, label: "Active" },
    inactive: { variant: "warning" as const, label: "Inactive" },
    pending: { variant: "warning" as const, label: "Pending" },
    draft: { variant: "secondary" as const, label: "Draft" },
    published: { variant: "success" as const, label: "Published" },
    archived: { variant: "danger" as const, label: "Archived" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

// Notification Badge Component
interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
}

export function NotificationBadge({
  count,
  max = 99,
  showZero = false,
  className = "",
}: NotificationBadgeProps) {
  if (count <= 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant="danger"
      size="small"
      rounded
      className={`${className} min-w-[1.25rem] h-5 flex items-center justify-center`}
    >
      {displayCount}
    </Badge>
  );
}

// Tag Badge Component
interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ tag, onRemove, className = "" }: TagBadgeProps) {
  return (
    <Badge
      variant="primary"
      size="small"
      rounded
      className={`${className} inline-flex items-center space-x-1`}
    >
      <span>{tag}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-primary-600 hover:text-primary-800 focus:outline-none"
        >
          <svg
            className="w-3 h-3"
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
      )}
    </Badge>
  );
}

// Named export for compatibility  
export { Badge };
