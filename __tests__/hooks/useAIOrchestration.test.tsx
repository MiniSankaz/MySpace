/**
 * Tests for useAIOrchestration Hook
 * Comprehensive test coverage for AI Orchestration React hook functionality
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';

// Mock AI Client - must be before the import
const mockCreateTaskChain = jest.fn();
const mockGetChainStatus = jest.fn();
const mockControlChain = jest.fn();
const mockCreateAIWebSocket = jest.fn();

const mockAIClient = {
  createTaskChain: mockCreateTaskChain,
  getChainStatus: mockGetChainStatus,
  controlChain: mockControlChain,
  createAIWebSocket: mockCreateAIWebSocket,
  getConnectionStatus: jest.fn().mockReturnValue({}),
};

jest.mock("../../src/services/api/ai.client", () => ({
  aiClient: mockAIClient,
}));

import {
  useAIOrchestration,
  TaskChain,
  TaskContext,
  ChainCreationOptions,
} from "../../src/hooks/useAIOrchestration";

// Mock WebSocket
class MockWebSocket {
  readyState: number = 1; // WebSocket.OPEN
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private listeners = new Map<string, Set<Function>>();

  addEventListener(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  send(data: string) {
    // Simulate message send
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    const closeListeners = this.listeners.get("close");
    if (closeListeners) {
      closeListeners.forEach((listener) => listener({}));
    }
  }

  // Simulate receiving messages
  simulateMessage(data: any) {
    const messageListeners = this.listeners.get("message");
    if (messageListeners) {
      messageListeners.forEach((listener) =>
        listener({ data: JSON.stringify(data) }),
      );
    }
  }

  // Simulate connection open
  simulateOpen() {
    const openListeners = this.listeners.get("open");
    if (openListeners) {
      openListeners.forEach((listener) => listener({}));
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Global mock WebSocket instance for tests
let mockWebSocket: MockWebSocket;

describe("useAIOrchestration Hook", () => {
  const testUserId = "test-user-123";
  const testContext: TaskContext = {
    userId: testUserId,
    sessionId: "test-session-456",
    workspaceId: "test-workspace-789",
    metadata: { source: "test" },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockCreateAIWebSocket.mockReturnValue(new MockWebSocket());
    mockCreateTaskChain.mockResolvedValue({
      chainId: "test-chain-123",
      status: "planning",
      tasksCount: 3,
      estimatedDuration: 300000,
      websocketUrl: "ws://${getGatewayPort()}/ws/ai/orchestration",
    });

    mockGetChainStatus.mockResolvedValue({
      chainId: "test-chain-123",
      status: "executing",
      progress: {
        completed: 1,
        total: 3,
        percentage: 33,
        currentTask: "Task 2",
      },
    });

    mockControlChain.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up any pending timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Initial State", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      expect(result.current.activeChains).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.connectionStatus).toEqual({});
    });

    it("should provide all required functions", () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      expect(typeof result.current.createChain).toBe("function");
      expect(typeof result.current.getChainStatus).toBe("function");
      expect(typeof result.current.controlChain).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
      expect(typeof result.current.refreshChains).toBe("function");
      expect(typeof result.current.subscribeToChain).toBe("function");
      expect(typeof result.current.unsubscribeFromChain).toBe("function");
      expect(typeof result.current.cleanup).toBe("function");
    });
  });

  describe("Chain Creation", () => {
    it("should create a new task chain successfully", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      const goals = ["Implement user authentication", "Add input validation"];
      const options: ChainCreationOptions = {
        priority: "high",
        timeout: 300000,
        parallelization: true,
      };

      let createdChain: TaskChain;

      await act(async () => {
        createdChain = await result.current.createChain(
          goals,
          testContext,
          options,
        );
      });

      expect(mockCreateTaskChain).toHaveBeenCalledWith({
        goals,
        context: { ...testContext, userId: testUserId },
        options,
      });

      expect(createdChain!).toMatchObject({
        id: "test-chain-123",
        name: expect.stringMatching(/^Chain-/),
        goals,
        status: "planning",
        progress: {
          completed: 0,
          total: 3,
          percentage: 0,
        },
        estimatedDuration: 300000,
        tasksCount: 3,
        createdAt: expect.any(Date),
        websocketUrl: "ws://${getGatewayPort()}/ws/ai/orchestration",
      });

      expect(result.current.activeChains).toHaveLength(1);
      expect(result.current.activeChains[0]).toEqual(createdChain!);
    });

    it("should handle chain creation errors", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      const errorMessage = "Invalid goals provided";
      mockCreateTaskChain.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await expect(
          result.current.createChain([], testContext),
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.activeChains).toHaveLength(0);
    });

    it("should set loading state during chain creation", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Mock a delayed response
      mockCreateTaskChain.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  chainId: "delayed-chain",
                  status: "planning",
                  tasksCount: 1,
                  estimatedDuration: 100000,
                  websocketUrl: "ws://test",
                }),
              100,
            ),
          ),
      );

      const goals = ["Test delayed creation"];

      act(() => {
        result.current.createChain(goals, testContext);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should auto-subscribe to created chains", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test auto-subscribe"], testContext);
      });

      expect(mockCreateAIWebSocket).toHaveBeenCalledWith("/orchestration");
    });
  });

  describe("Chain Status Management", () => {
    it("should get chain status and update state", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // First create a chain
      await act(async () => {
        await result.current.createChain(["Test status"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      mockGetChainStatus.mockResolvedValue({
        chainId,
        status: "completed",
        progress: {
          completed: 3,
          total: 3,
          percentage: 100,
        },
      });

      let statusResult: any;

      await act(async () => {
        statusResult = await result.current.getChainStatus(chainId);
      });

      expect(mockGetChainStatus).toHaveBeenCalledWith(chainId);
      expect(statusResult.status).toBe("completed");

      // Check if local state was updated
      const updatedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(updatedChain?.status).toBe("completed");
      expect(updatedChain?.progress.percentage).toBe(100);
      expect(updatedChain?.completedAt).toBeInstanceOf(Date);
    });

    it("should handle status retrieval errors", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      const errorMessage = "Chain not found";
      mockGetChainStatus.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await expect(
          result.current.getChainStatus("invalid-chain"),
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it("should refresh all active chains", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Create multiple chains
      await act(async () => {
        await result.current.createChain(["Chain 1"], testContext);
        await result.current.createChain(["Chain 2"], testContext);
      });

      mockGetChainStatus.mockResolvedValue({
        chainId: "test-chain-123",
        status: "executing",
        progress: { completed: 1, total: 3, percentage: 33 },
      });

      await act(async () => {
        await result.current.refreshChains();
      });

      expect(mockGetChainStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe("Chain Control", () => {
    it("should pause chain successfully", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test pause"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      await act(async () => {
        await result.current.controlChain(
          chainId,
          "pause",
          "User requested pause",
        );
      });

      expect(mockControlChain).toHaveBeenCalledWith(chainId, {
        action: "pause",
        reason: "User requested pause",
      });
    });

    it("should cancel chain and unsubscribe", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test cancel"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      await act(async () => {
        await result.current.controlChain(
          chainId,
          "cancel",
          "Test cancellation",
        );
      });

      expect(mockControlChain).toHaveBeenCalledWith(chainId, {
        action: "cancel",
        reason: "Test cancellation",
      });

      // Check if local state was updated
      const cancelledChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(cancelledChain?.status).toBe("cancelled");
    });

    it("should handle control errors", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      const errorMessage = "Cannot control chain";
      mockControlChain.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await expect(
          result.current.controlChain("test-chain", "pause"),
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("WebSocket Integration", () => {
    beforeEach(() => {
      mockWebSocket = new MockWebSocket();
      mockCreateAIWebSocket.mockReturnValue(mockWebSocket);
    });

    it("should subscribe to chain updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test WebSocket"], testContext);
      });

      expect(mockCreateAIWebSocket).toHaveBeenCalledWith("/orchestration");
    });

    it("should handle chain progress updates via WebSocket", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test progress"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      // Simulate WebSocket progress update
      act(() => {
        mockWebSocket.simulateMessage({
          type: "chain:progress",
          chainId,
          progress: 75,
          currentTask: "Final task",
        });
      });

      const updatedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(updatedChain?.progress.percentage).toBe(75);
      expect(updatedChain?.progress.currentTask).toBe("Final task");
    });

    it("should handle chain completion via WebSocket", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test completion"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      // Simulate WebSocket completion update
      act(() => {
        mockWebSocket.simulateMessage({
          type: "chain:completed",
          chainId,
        });
      });

      const completedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(completedChain?.status).toBe("completed");
      expect(completedChain?.progress.percentage).toBe(100);
      expect(completedChain?.completedAt).toBeInstanceOf(Date);
    });

    it("should handle task started updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test task started"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      // Simulate task started update
      act(() => {
        mockWebSocket.simulateMessage({
          type: "task:started",
          chainId,
          name: "Authentication Module",
        });
      });

      const updatedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(updatedChain?.progress.currentTask).toBe("Authentication Module");
    });

    it("should handle task completed updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test task completed"], testContext);
      });

      const chainId = result.current.activeChains[0].id;
      const initialCompleted =
        result.current.activeChains[0].progress.completed;

      // Simulate task completed update
      act(() => {
        mockWebSocket.simulateMessage({
          type: "task:completed",
          chainId,
        });
      });

      const updatedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(updatedChain?.progress.completed).toBe(initialCompleted + 1);
    });

    it("should unsubscribe from chain updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test unsubscribe"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      act(() => {
        result.current.unsubscribeFromChain(chainId);
      });

      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it("should handle WebSocket connection errors gracefully", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      mockCreateAIWebSocket.mockImplementation(() => {
        throw new Error("WebSocket connection failed");
      });

      await act(async () => {
        await result.current.createChain(["Test WebSocket error"], testContext);
      });

      expect(result.current.error).toContain("Failed to subscribe to chain");
    });
  });

  describe("Custom Events", () => {
    it("should listen to custom AI events", () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Simulate custom event
      act(() => {
        const event = new CustomEvent("ai-chain-update", {
          detail: {
            type: "chain:progress",
            chainId: "test-chain",
            progress: 50,
          },
        });
        window.dispatchEvent(event);
      });

      // Event should be handled gracefully
      expect(result.current.error).toBe(null);
    });
  });

  describe("Error Handling", () => {
    it("should clear error state", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Create an error
      mockCreateTaskChain.mockRejectedValue(new Error("Test error"));

      await act(async () => {
        try {
          await result.current.createChain(["Error test"], testContext);
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.error).toBe("Test error");

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it("should handle invalid WebSocket messages", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test invalid message"], testContext);
      });

      // Simulate invalid WebSocket message
      act(() => {
        mockWebSocket.simulateMessage("invalid json");
      });

      // Should not crash the application
      expect(result.current.activeChains).toHaveLength(1);
    });
  });

  describe("Connection Status", () => {
    it("should update connection status", () => {
      jest.useFakeTimers();

      mockAIClient.getConnectionStatus.mockReturnValue({
        "chain-123": "connected",
        "chain-456": "connecting",
      });

      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Fast-forward timer to trigger status update
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.connectionStatus).toEqual({
        "chain-123": "connected",
        "chain-456": "connecting",
      });

      jest.useRealTimers();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup WebSocket connections on unmount", () => {
      const { result, unmount } = renderHook(() =>
        useAIOrchestration(testUserId),
      );

      // Create connections
      act(() => {
        result.current.subscribeToChain("test-chain-1");
        result.current.subscribeToChain("test-chain-2");
      });

      // Unmount hook
      unmount();

      // All connections should be closed
      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it("should manually cleanup connections", () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Create connections
      act(() => {
        result.current.subscribeToChain("test-chain-1");
        result.current.subscribeToChain("test-chain-2");
      });

      // Manual cleanup
      act(() => {
        result.current.cleanup();
      });

      expect(result.current.connectionStatus).toEqual({});
    });
  });

  describe("Performance", () => {
    it("should handle multiple chains efficiently", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      const chains = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          return act(async () => {
            return result.current.createChain([`Chain ${i}`], testContext);
          });
        }),
      );

      expect(result.current.activeChains).toHaveLength(10);
      expect(mockCreateTaskChain).toHaveBeenCalledTimes(10);
    });

    it("should debounce rapid status updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Debounce test"], testContext);
      });

      const chainId = result.current.activeChains[0].id;

      // Simulate rapid updates
      act(() => {
        for (let i = 0; i < 5; i++) {
          mockWebSocket.simulateMessage({
            type: "chain:progress",
            chainId,
            progress: i * 20,
          });
        }
      });

      // Should handle all updates without issues
      const updatedChain = result.current.activeChains.find(
        (c) => c.id === chainId,
      );
      expect(updatedChain?.progress.percentage).toBe(80); // Last update
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty goals array", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain([], testContext);
      });

      expect(mockCreateTaskChain).toHaveBeenCalledWith({
        goals: [],
        context: { ...testContext, userId: testUserId },
        options: undefined,
      });
    });

    it("should handle missing chain ID in updates", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      await act(async () => {
        await result.current.createChain(["Test missing ID"], testContext);
      });

      // Simulate update without chainId
      act(() => {
        mockWebSocket.simulateMessage({
          type: "chain:progress",
          progress: 50,
          // Missing chainId
        });
      });

      // Should not affect existing chains
      expect(result.current.activeChains[0].progress.percentage).toBe(0);
    });

    it("should handle updates for non-existent chains", async () => {
      const { result } = renderHook(() => useAIOrchestration(testUserId));

      // Simulate update for non-existent chain
      act(() => {
        mockWebSocket.simulateMessage({
          type: "chain:progress",
          chainId: "non-existent-chain",
          progress: 50,
        });
      });

      // Should not crash or add phantom chains
      expect(result.current.activeChains).toHaveLength(0);
    });
  });
});
