/**
 * AI Orchestration Hook
 * React hook for managing AI task orchestration on the Frontend
 * 70% reuse from existing hook patterns, 30% new AI-specific functionality
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { aiClient } from "../services/api/ai.client";

// Types
export interface TaskChain {
  id: string;
  name: string;
  goals: string[];
  status: "planning" | "executing" | "completed" | "failed" | "cancelled";
  progress: {
    completed: number;
    total: number;
    percentage: number;
    currentTask?: string;
  };
  estimatedDuration: number;
  tasksCount: number;
  createdAt: Date;
  completedAt?: Date;
  websocketUrl: string;
}

export interface TaskContext {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  portfolioId?: string;
  terminalSessionId?: string;
  metadata?: Record<string, any>;
}

export interface ChainCreationOptions {
  priority?: "low" | "medium" | "high" | "critical";
  timeout?: number;
  parallelization?: boolean;
}

export interface UseAIOrchestrationReturn {
  // State
  activeChains: TaskChain[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: Record<string, string>;

  // Actions
  createChain: (
    goals: string[],
    context: TaskContext,
    options?: ChainCreationOptions,
  ) => Promise<TaskChain>;
  getChainStatus: (chainId: string) => Promise<any>;
  controlChain: (
    chainId: string,
    action: "pause" | "resume" | "cancel",
    reason?: string,
  ) => Promise<void>;
  clearError: () => void;
  refreshChains: () => Promise<void>;

  // WebSocket management
  subscribeToChain: (chainId: string) => void;
  unsubscribeFromChain: (chainId: string) => void;
  cleanup: () => void;
}

/**
 * AI Orchestration Hook
 * Manages task chains and real-time updates
 */
export const useAIOrchestration = (
  userId: string,
): UseAIOrchestrationReturn => {
  // State
  const [activeChains, setActiveChains] = useState<TaskChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, string>
  >({});

  // Refs for cleanup
  const wsConnections = useRef<Map<string, WebSocket>>(new Map());
  const eventListeners = useRef<Map<string, (event: CustomEvent) => void>>(
    new Map(),
  );

  /**
   * Create a new task chain
   */
  const createChain = useCallback(
    async (
      goals: string[],
      context: TaskContext,
      options?: ChainCreationOptions,
    ): Promise<TaskChain> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await aiClient.createTaskChain({
          goals,
          context: { ...context, userId },
          options,
        });

        const newChain: TaskChain = {
          id: response.chainId,
          name: `Chain-${response.chainId.substring(0, 8)}`,
          goals,
          status: response.status as any,
          progress: {
            completed: 0,
            total: response.tasksCount,
            percentage: 0,
          },
          estimatedDuration: response.estimatedDuration,
          tasksCount: response.tasksCount,
          createdAt: new Date(),
          websocketUrl: response.websocketUrl,
        };

        setActiveChains((prev) => [...prev, newChain]);

        // Auto-subscribe to updates
        subscribeToChain(newChain.id);

        return newChain;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to create task chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  /**
   * Get detailed status of a task chain
   */
  const getChainStatus = useCallback(async (chainId: string) => {
    try {
      const status = await aiClient.getChainStatus(chainId);

      // Update local state
      setActiveChains((prev) =>
        prev.map((chain) =>
          chain.id === chainId
            ? {
                ...chain,
                status: status.status as TaskChain["status"],
                progress: status.progress,
                ...(status.status === "completed" && {
                  completedAt: new Date(),
                }),
              }
            : chain,
        ),
      );

      return status;
    } catch (err: any) {
      setError(err.message || "Failed to get chain status");
      throw err;
    }
  }, []);

  /**
   * Control chain execution
   */
  const controlChain = useCallback(
    async (
      chainId: string,
      action: "pause" | "resume" | "cancel",
      reason?: string,
    ): Promise<void> => {
      try {
        await aiClient.controlChain(chainId, { action, reason });

        // Update local state
        if (action === "cancel") {
          setActiveChains((prev) =>
            prev.map((chain) =>
              chain.id === chainId
                ? { ...chain, status: "cancelled" as any }
                : chain,
            ),
          );

          // Unsubscribe from cancelled chain
          unsubscribeFromChain(chainId);
        }
      } catch (err: any) {
        setError(err.message || `Failed to ${action} chain`);
        throw err;
      }
    },
    [],
  );

  /**
   * Subscribe to chain updates via WebSocket
   */
  const subscribeToChain = useCallback((chainId: string) => {
    if (typeof window === "undefined") return;

    const wsKey = `chain-${chainId}`;

    // Don't create duplicate connections
    if (wsConnections.current.has(wsKey)) return;

    try {
      const ws = aiClient.createAIWebSocket("/orchestration");

      const onOpen = () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            topic: "chain",
            chainId,
          }),
        );

        setConnectionStatus((prev) => ({ ...prev, [wsKey]: "connected" }));
      };

      const onMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          handleChainUpdate(data);
        } catch (error) {
          console.error("[AI Hook] WebSocket message parse error:", error);
        }
      };

      const onClose = () => {
        wsConnections.current.delete(wsKey);
        setConnectionStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[wsKey];
          return newStatus;
        });
      };

      const onError = (error: Event) => {
        console.error(`[AI Hook] WebSocket error for ${chainId}:`, error);
        setConnectionStatus((prev) => ({ ...prev, [wsKey]: "error" }));
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", onClose);
      ws.addEventListener("error", onError);

      wsConnections.current.set(wsKey, ws);
      setConnectionStatus((prev) => ({ ...prev, [wsKey]: "connecting" }));
    } catch (error) {
      console.error("[AI Hook] Chain subscription error:", error);
      setError(`Failed to subscribe to chain ${chainId}`);
    }
  }, []);

  /**
   * Unsubscribe from chain updates
   */
  const unsubscribeFromChain = useCallback((chainId: string) => {
    const wsKey = `chain-${chainId}`;
    const ws = wsConnections.current.get(wsKey);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "unsubscribe",
          topic: "chain",
          chainId,
        }),
      );
      ws.close();
    }

    wsConnections.current.delete(wsKey);
    setConnectionStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[wsKey];
      return newStatus;
    });
  }, []);

  /**
   * Handle chain updates from WebSocket
   */
  const handleChainUpdate = useCallback((data: any) => {
    if (!data.chainId) return;

    setActiveChains((prev) =>
      prev.map((chain) => {
        if (chain.id !== data.chainId) return chain;

        switch (data.type) {
          case "chain:progress":
            return {
              ...chain,
              progress: {
                ...chain.progress,
                percentage: data.progress,
                currentTask: data.currentTask,
              },
            };

          case "chain:completed":
            return {
              ...chain,
              status: "completed" as any,
              progress: { ...chain.progress, percentage: 100 },
              completedAt: new Date(),
            };

          case "chain:failed":
            return {
              ...chain,
              status: "failed" as any,
            };

          case "task:started":
            return {
              ...chain,
              progress: {
                ...chain.progress,
                currentTask: data.name,
              },
            };

          case "task:completed":
            return {
              ...chain,
              progress: {
                ...chain.progress,
                completed: chain.progress.completed + 1,
                percentage: Math.round(
                  ((chain.progress.completed + 1) / chain.progress.total) * 100,
                ),
              },
            };

          default:
            return chain;
        }
      }),
    );
  }, []);

  /**
   * Refresh all active chains
   */
  const refreshChains = useCallback(async () => {
    setIsLoading(true);

    try {
      // Get updated status for all chains
      const updates = await Promise.allSettled(
        activeChains.map((chain) => getChainStatus(chain.id)),
      );

      // Log any failures
      updates.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(
            `Failed to refresh chain ${activeChains[index].id}:`,
            result.reason,
          );
        }
      });
    } catch (error) {
      console.error("[AI Hook] Refresh chains error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeChains, getChainStatus]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Cleanup all connections
   */
  const cleanup = useCallback(() => {
    // Close all WebSocket connections
    wsConnections.current.forEach((ws, key) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    wsConnections.current.clear();

    // Remove custom event listeners
    eventListeners.current.forEach((listener, event) => {
      window.removeEventListener(event, listener as any);
    });
    eventListeners.current.clear();

    // Clear connection status
    setConnectionStatus({});
  }, []);

  /**
   * Listen to custom AI events from the client
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChainEvent = (event: CustomEvent) => {
      handleChainUpdate(event.detail);
    };

    window.addEventListener("ai-chain-update", handleChainEvent as any);
    eventListeners.current.set("ai-chain-update", handleChainEvent);

    return () => {
      window.removeEventListener("ai-chain-update", handleChainEvent as any);
      eventListeners.current.delete("ai-chain-update");
    };
  }, [handleChainUpdate]);

  /**
   * Update connection status from AI client
   */
  useEffect(() => {
    const updateStatus = () => {
      const status = aiClient.getConnectionStatus();
      setConnectionStatus(status);
    };

    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    activeChains,
    isLoading,
    error,
    connectionStatus,

    // Actions
    createChain,
    getChainStatus,
    controlChain,
    clearError,
    refreshChains,

    // WebSocket management
    subscribeToChain,
    unsubscribeFromChain,
    cleanup,
  };
};

export default useAIOrchestration;
