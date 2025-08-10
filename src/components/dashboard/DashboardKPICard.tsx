'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardKPICardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage' | 'time';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
  onClick?: () => void;
}

export const DashboardKPICard: React.FC<DashboardKPICardProps> = ({
  title,
  value,
  previousValue,
  format = 'number',
  icon,
  trend,
  trendValue,
  description,
  color = 'blue',
  loading = false,
  onClick
}) => {
  const [displayValue, setDisplayValue] = useState<string | number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Format value based on type
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'time':
        // Convert seconds to readable format
        const hours = Math.floor(val / 3600);
        const minutes = Math.floor((val % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  // Animate number counting
  useEffect(() => {
    if (typeof value === 'number' && !loading) {
      setIsAnimating(true);
      const duration = 1000; // 1 second
      const steps = 30;
      const stepDuration = duration / steps;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, stepDuration);
      
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, loading]);

  // Calculate trend
  const calculateTrend = () => {
    if (!previousValue || typeof value !== 'number') return trend;
    const change = ((value - previousValue) / previousValue) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'neutral';
  };

  const actualTrend = calculateTrend();

  const getTrendIcon = () => {
    switch (actualTrend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      green: 'bg-green-500/10 border-green-500/20 text-green-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      red: 'bg-red-500/10 border-red-500/20 text-red-400'
    };
    return colors[color];
  };

  const getIconBgColor = () => {
    const colors = {
      blue: 'bg-blue-500/20',
      green: 'bg-green-500/20',
      purple: 'bg-purple-500/20',
      orange: 'bg-orange-500/20',
      red: 'bg-red-500/20'
    };
    return colors[color];
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border p-6
        transition-all duration-300 hover:scale-[1.02]
        ${getColorClasses()}
        ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
        ${loading ? 'animate-pulse' : ''}
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${getIconBgColor()}`}>
            {icon}
          </div>
          {actualTrend && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              {trendValue && (
                <span className={`text-xs font-medium ${
                  actualTrend === 'up' ? 'text-green-500' : 
                  actualTrend === 'down' ? 'text-red-500' : 
                  'text-gray-500'
                }`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          {loading ? (
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className={`text-3xl font-bold text-white ${isAnimating ? 'transition-all' : ''}`}>
              {formatValue(displayValue)}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-sm font-medium text-gray-400 mb-1">
          {title}
        </div>

        {/* Description */}
        {description && (
          <div className="text-xs text-gray-500 mt-2">
            {description}
          </div>
        )}

        {/* Click indicator */}
        {onClick && (
          <div className="absolute bottom-2 right-2">
            <ArrowUpRight className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardKPICard;