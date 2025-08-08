/**
 * useApi - Custom hook for API calls with loading, error, and caching
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, loading, error, refetch } = useApi<User[]>('/api/users')
 *
 * // With options
 * const { data, loading } = useApi('/api/users', {
 *   method: 'POST',
 *   body: { name: 'John' },
 *   cache: true,
 *   refetchInterval: 30000
 * })
 *
 * // Manual trigger
 * const { trigger, data, loading } = useApi('/api/users', {
 *   manual: true
 * })
 *
 * // In component
 * useEffect(() => {
 *   trigger()
 * }, [])
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface ApiOptions extends Omit<RequestInit, "cache"> {
  /** Don't auto-fetch on mount */
  manual?: boolean;
  /** Cache the response */
  cache?: boolean | RequestCache;
  /** Cache key (defaults to URL) */
  cacheKey?: string;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** Auto-refetch interval in milliseconds */
  refetchInterval?: number;
  /** Transform response data */
  transform?: (data: any) => any;
  /** Dependencies to watch for changes */
  deps?: any[];
}

interface ApiResponse<T> {
  /** Response data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error object */
  error: Error | null;
  /** Manual trigger function */
  trigger: () => Promise<void>;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

export function useApi<T = any>(
  url: string,
  options: ApiOptions = {},
): ApiResponse<T> {
  const {
    manual = false,
    cache: enableCache = false,
    cacheKey = url,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    transform,
    deps = [],
    ...fetchOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState<Error | null>(null);

  const abortController = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch function
  const fetchData = useCallback(async () => {
    try {
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }

      // Create new abort controller
      abortController.current = new AbortController();

      setLoading(true);
      setError(null);

      // Check cache first
      if (enableCache) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheDuration) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        ...fetchOptions,
        signal: abortController.current.signal,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      };

      // Handle body serialization
      if (fetchOptions.body && typeof fetchOptions.body === "object") {
        requestOptions.body = JSON.stringify(fetchOptions.body);
      }

      // Make request
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      let responseData = await response.json();

      // Transform data if provided
      if (transform) {
        responseData = transform(responseData);
      }

      // Handle API wrapper format
      if (responseData.success !== undefined) {
        if (!responseData.success) {
          throw new Error(responseData.error || "API request failed");
        }
        responseData = responseData.data;
      }

      // Cache response
      if (enableCache) {
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now(),
        });
      }

      setData(responseData);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, cacheKey, cacheDuration, enableCache, transform, fetchOptions]);

  // Manual trigger
  const trigger = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Refetch (clears cache)
  const refetch = useCallback(async () => {
    if (enableCache) {
      cache.delete(cacheKey);
    }
    await fetchData();
  }, [fetchData, enableCache, cacheKey]);

  // Reset state
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);

    if (abortController.current) {
      abortController.current.abort();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Auto-fetch on mount and deps change
  useEffect(() => {
    if (!manual) {
      fetchData();
    }

    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [manual, fetchData, ...deps]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && !manual) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, manual, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    trigger,
    refetch,
    reset,
  };
}

export default useApi;
