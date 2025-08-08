/**
 * useSmartQuery - Advanced data fetching hook with caching, error handling, and optimistic updates
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch, mutate } = useSmartQuery({
 *   queryKey: ['users'],
 *   queryFn: () => fetchUsers(),
 *   cacheTime: 5 * 60 * 1000, // 5 minutes
 *   staleTime: 2 * 60 * 1000, // 2 minutes
 * })
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseSmartQueryOptions<T> {
  /** Unique query key for caching */
  queryKey: string[];
  /** Function to fetch data */
  queryFn: () => Promise<T>;
  /** Cache time in milliseconds (default: 5 minutes) */
  cacheTime?: number;
  /** Stale time in milliseconds (default: 0) */
  staleTime?: number;
  /** Retry count on error (default: 3) */
  retryCount?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Enable query (default: true) */
  enabled?: boolean;
  /** Refetch on window focus (default: true) */
  refetchOnWindowFocus?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  /** Initial data */
  initialData?: T;
  /** Transform response data */
  select?: (data: T) => any;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Success handler */
  onSuccess?: (data: T) => void;
}

interface UseSmartQueryResult<T> {
  /** Query data */
  data: T | undefined;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Is data stale */
  isStale: boolean;
  /** Is data cached */
  isCached: boolean;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Mutate cached data */
  mutate: (updater: (oldData: T | undefined) => T) => void;
  /** Reset query state */
  reset: () => void;
}

// Global cache
const queryCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    error?: Error;
  }
>();

// Global subscribers for cache invalidation
const subscribers = new Map<string, Set<() => void>>();

export function useSmartQuery<T = any>({
  queryKey,
  queryFn,
  cacheTime = 5 * 60 * 1000, // 5 minutes
  staleTime = 0,
  retryCount = 3,
  retryDelay = 1000,
  enabled = true,
  refetchOnWindowFocus = true,
  refetchInterval,
  initialData,
  select,
  onError,
  onSuccess,
}: UseSmartQueryOptions<T>): UseSmartQueryResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const cacheKey = queryKey.join(":");

  // Check if data is cached and fresh
  const getCachedData = useCallback(() => {
    const cached = queryCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    const isFresh = now - cached.timestamp < cacheTime;
    const isStale = now - cached.timestamp > staleTime;

    return isFresh ? { ...cached, isStale } : null;
  }, [cacheKey, cacheTime, staleTime]);

  // Execute query with retry logic
  const executeQuery = useCallback(
    async (retries = retryCount): Promise<void> => {
      if (!enabled || !mountedRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const result = await queryFn();
        const transformedData = select ? select(result) : result;

        if (!mountedRef.current) return;

        // Update cache
        queryCache.set(cacheKey, {
          data: transformedData,
          timestamp: Date.now(),
        });

        setData(transformedData);
        setIsStale(false);
        setLoading(false);

        onSuccess?.(result);

        // Notify subscribers
        const cacheSubscribers = subscribers.get(cacheKey);
        cacheSubscribers?.forEach((callback) => callback());
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (!mountedRef.current) return;

        if (retries > 0) {
          // Retry after delay
          retryTimeoutRef.current = setTimeout(() => {
            executeQuery(retries - 1);
          }, retryDelay);
        } else {
          // Update cache with error
          queryCache.set(cacheKey, {
            data: undefined,
            timestamp: Date.now(),
            error,
          });

          setError(error);
          setLoading(false);

          onError?.(error);
        }
      }
    },
    [
      enabled,
      queryFn,
      select,
      cacheKey,
      retryCount,
      retryDelay,
      onSuccess,
      onError,
    ],
  );

  // Refetch function
  const refetch = useCallback(async () => {
    await executeQuery();
  }, [executeQuery]);

  // Mutate function for optimistic updates
  const mutate = useCallback(
    (updater: (oldData: T | undefined) => T) => {
      const newData = updater(data);

      // Update local state
      setData(newData);

      // Update cache
      queryCache.set(cacheKey, {
        data: newData,
        timestamp: Date.now(),
      });

      // Notify subscribers
      const cacheSubscribers = subscribers.get(cacheKey);
      cacheSubscribers?.forEach((callback) => callback());
    },
    [data, cacheKey],
  );

  // Reset function
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
    setIsStale(false);
    queryCache.delete(cacheKey);
  }, [initialData, cacheKey]);

  // Subscribe to cache changes
  useEffect(() => {
    if (!subscribers.has(cacheKey)) {
      subscribers.set(cacheKey, new Set());
    }

    const callback = () => {
      if (!mountedRef.current) return;

      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setIsStale(cached.isStale);
        setError(cached.error || null);
      }
    };

    subscribers.get(cacheKey)?.add(callback);

    return () => {
      subscribers.get(cacheKey)?.delete(callback);
      if (subscribers.get(cacheKey)?.size === 0) {
        subscribers.delete(cacheKey);
      }
    };
  }, [cacheKey, getCachedData]);

  // Initial data fetch
  useEffect(() => {
    if (!enabled) return;

    // Check cache first
    const cached = getCachedData();
    if (cached && !cached.error) {
      setData(cached.data);
      setIsStale(cached.isStale);

      // If stale, refetch in background
      if (cached.isStale) {
        executeQuery();
      }
    } else {
      executeQuery();
    }
  }, [enabled, getCachedData, executeQuery]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = getCachedData();
      if (cached?.isStale) {
        executeQuery();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchOnWindowFocus, getCachedData, executeQuery]);

  // Interval refetch
  useEffect(() => {
    if (!refetchInterval) return;

    intervalRef.current = setInterval(() => {
      executeQuery();
    }, refetchInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, executeQuery]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isCached = queryCache.has(cacheKey);

  return {
    data,
    loading,
    error,
    isStale,
    isCached,
    refetch,
    mutate,
    reset,
  };
}

// Utility functions for cache management
export const queryUtils = {
  /**
   * Invalidate query cache
   */
  invalidateQueries: (queryKey: string[]) => {
    const pattern = queryKey.join(":");

    // Remove exact matches and partial matches
    Array.from(queryCache.keys()).forEach((key) => {
      if (key.startsWith(pattern)) {
        queryCache.delete(key);

        // Notify subscribers
        const cacheSubscribers = subscribers.get(key);
        cacheSubscribers?.forEach((callback) => callback());
      }
    });
  },

  /**
   * Set query data manually
   */
  setQueryData: <T>(queryKey: string[], data: T) => {
    const cacheKey = queryKey.join(":");
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Notify subscribers
    const cacheSubscribers = subscribers.get(cacheKey);
    cacheSubscribers?.forEach((callback) => callback());
  },

  /**
   * Get query data from cache
   */
  getQueryData: <T>(queryKey: string[]): T | undefined => {
    const cacheKey = queryKey.join(":");
    return queryCache.get(cacheKey)?.data;
  },

  /**
   * Clear all cache
   */
  clear: () => {
    queryCache.clear();
    subscribers.clear();
  },
};

export default useSmartQuery;
