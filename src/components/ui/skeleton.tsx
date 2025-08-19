import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'default', width, height, lines = 1, style, ...props }, ref) => {
    const skeletonStyle = {
      width,
      height,
      ...style
    };

    if (lines > 1) {
      return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'animate-pulse bg-gray-200 rounded',
                {
                  'rounded-full': variant === 'circular',
                  'rounded-md': variant === 'rectangular',
                  'h-4': !height
                }
              )}
              style={{
                width: index === lines - 1 ? '75%' : width,
                height: height || '1rem'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse bg-gray-200',
          {
            'rounded-full': variant === 'circular',
            'rounded-md': variant === 'rectangular',
            'rounded h-4': variant === 'default'
          },
          className
        )}
        style={skeletonStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Common skeleton patterns
const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <Skeleton lines={lines} className={className} />
);

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

const SkeletonAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  return (
    <Skeleton 
      variant="circular" 
      className={sizeClasses[size]} 
    />
  );
};

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };