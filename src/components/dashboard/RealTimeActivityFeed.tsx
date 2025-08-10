'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Terminal, 
  GitCommit, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'ai_chat' | 'terminal' | 'file_change' | 'git_commit' | 'system';
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  metadata?: any;
}

interface RealTimeActivityFeedProps {
  initialActivities?: ActivityItem[];
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const RealTimeActivityFeed: React.FC<RealTimeActivityFeedProps> = ({
  initialActivities = [],
  maxItems = 20,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch latest activities
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.data?.recentActivity) {
          setActivities(data.data.recentActivity.slice(0, maxItems));
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // WebSocket connection for real-time updates (future enhancement)
  useEffect(() => {
    // TODO: Implement WebSocket connection
    // const ws = new WebSocket('ws://localhost:3000/ws/dashboard/activity');
    // ws.onmessage = (event) => {
    //   const newActivity = JSON.parse(event.data);
    //   setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
    // };
    // return () => ws.close();
  }, [maxItems]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ai_chat':
        return <MessageSquare className="w-4 h-4" />;
      case 'terminal':
        return <Terminal className="w-4 h-4" />;
      case 'git_commit':
        return <GitCommit className="w-4 h-4" />;
      case 'file_change':
        return <FileText className="w-4 h-4" />;
      case 'system':
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ai_chat':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'terminal':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'git_commit':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'file_change':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'system':
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH');
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-200">กิจกรรมล่าสุด</h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>อัปเดต {formatTimestamp(lastUpdate)}</span>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>ไม่มีกิจกรรมล่าสุด</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all
                hover:bg-gray-800/30 cursor-pointer
                ${getActivityColor(activity.type)}
              `}
            >
              {/* Icon */}
              <div className="mt-0.5">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 break-words">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(activity.status)}
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {activities.length >= maxItems && (
        <button
          onClick={fetchActivities}
          className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-200 
                   hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          โหลดกิจกรรมเพิ่มเติม
        </button>
      )}
    </div>
  );
};

export default RealTimeActivityFeed;