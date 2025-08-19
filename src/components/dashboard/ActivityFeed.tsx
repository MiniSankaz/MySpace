import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  User,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Pause,
  Play,
  Loader2,
} from "lucide-react";

export type ActivityType =
  | "user_login"
  | "user_logout"
  | "file_upload"
  | "order_placed"
  | "trade_executed"
  | "alert_triggered"
  | "system_update"
  | "error_occurred";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
  status?: "success" | "warning" | "error" | "info";
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  error?: string;
  maxItems?: number;
  autoScroll?: boolean;
  showTimestamp?: boolean;
  showUser?: boolean;
  realtime?: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
  onLoadMore?: () => void;
  className?: string;
  compact?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading = false,
  error,
  maxItems = 50,
  autoScroll = true,
  showTimestamp = true,
  showUser = true,
  realtime = false,
  onActivityClick,
  onLoadMore,
  className,
  compact = false,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [visibleActivities, setVisibleActivities] = useState<ActivityItem[]>(
    [],
  );
  const feedRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(autoScroll);

  useEffect(() => {
    setVisibleActivities(activities.slice(0, maxItems));
  }, [activities, maxItems]);

  useEffect(() => {
    if (autoScroll && !isPaused && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [visibleActivities, autoScroll, isPaused]);

  const getActivityIcon = (type: ActivityType) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "user_login":
      case "user_logout":
        return <User className={iconClass} />;
      case "file_upload":
        return <FileText className={iconClass} />;
      case "order_placed":
        return <ShoppingCart className={iconClass} />;
      case "trade_executed":
        return <TrendingUp className={iconClass} />;
      case "alert_triggered":
        return <AlertCircle className={iconClass} />;
      case "system_update":
        return <Package className={iconClass} />;
      case "error_occurred":
        return <XCircle className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getStatusColor = (status?: ActivityItem["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
      case "error":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "info":
      default:
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleMouseEnter = () => {
    if (autoScroll) {
      shouldAutoScroll.current = false;
    }
  };

  const handleMouseLeave = () => {
    if (autoScroll && !isPaused) {
      shouldAutoScroll.current = true;
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
          className,
        )}
      >
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">
            Loading activities...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
          className,
        )}
      >
        <div className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm",
        className,
      )}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Activity Feed
            </h3>
            {realtime && (
              <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {autoScroll && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
              >
                {isPaused ? (
                  <Play className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            )}
            <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={feedRef}
        className={cn("overflow-y-auto", compact ? "max-h-64" : "max-h-96")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {visibleActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No activities to display
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleActivities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                  onActivityClick && "cursor-pointer",
                  compact && "py-2",
                )}
                onClick={() => onActivityClick?.(activity)}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      getStatusColor(activity.status),
                    )}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "font-medium text-gray-900 dark:text-gray-100",
                          compact ? "text-sm" : "text-base",
                        )}
                      >
                        {activity.title}
                      </p>
                      {showTimestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      )}
                    </div>

                    {activity.description && !compact && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.description}
                      </p>
                    )}

                    {showUser && activity.user && (
                      <div className="flex items-center mt-1">
                        {activity.user.avatar ? (
                          <img
                            src={activity.user.avatar}
                            alt={activity.user.name}
                            className="h-5 w-5 rounded-full mr-1"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-600 mr-1 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.user.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {onLoadMore && visibleActivities.length < activities.length && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onLoadMore}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Load more activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Mock data for display
export const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "user_login",
    title: "User logged in",
    description: "Successfully authenticated via email",
    user: { name: "John Doe" },
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    status: "success",
  },
  {
    id: "2",
    type: "trade_executed",
    title: "Trade executed",
    description: "Bought 100 shares of AAPL at $150.25",
    user: { name: "Jane Smith" },
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    status: "success",
  },
  {
    id: "3",
    type: "alert_triggered",
    title: "Price alert triggered",
    description: "TSLA reached target price of $800",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    status: "warning",
  },
  {
    id: "4",
    type: "file_upload",
    title: "Document uploaded",
    description: "Portfolio report Q3 2024.pdf",
    user: { name: "Admin User" },
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: "info",
  },
  {
    id: "5",
    type: "error_occurred",
    title: "API Error",
    description: "Failed to fetch market data",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: "error",
  },
];

export default ActivityFeed;
