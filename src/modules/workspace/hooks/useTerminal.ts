import { useEffect, useRef, useCallback, useState } from "react";
import io, { Socket } from "socket.io-client";
import { TerminalMessage } from "../types";

interface UseTerminalOptions {
  sessionId: string;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number) => void;
  onError?: (error: string) => void;
}

export const useTerminal = ({
  sessionId,
  onOutput,
  onExit,
  onError,
}: UseTerminalOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io("/terminal", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Terminal connected");
      setConnected(true);
      setLoading(false);

      // Join session room
      socket.emit("join", { sessionId });
    });

    socket.on("disconnect", () => {
      console.log("Terminal disconnected");
      setConnected(false);
    });

    socket.on("output", (message: TerminalMessage) => {
      if (message.sessionId === sessionId && message.type === "output") {
        onOutput?.(message.data);
      }
    });

    socket.on("error", (message: TerminalMessage) => {
      if (message.sessionId === sessionId && message.type === "error") {
        onError?.(message.data);
      }
    });

    socket.on(
      "exit",
      ({
        sessionId: sid,
        exitCode,
      }: {
        sessionId: string;
        exitCode: number;
      }) => {
        if (sid === sessionId) {
          onExit?.(exitCode);
        }
      },
    );

    socket.on("connect_error", (error) => {
      console.error("Terminal connection error:", error);
      setLoading(false);
      onError?.("Failed to connect to terminal");
    });

    // Cleanup
    return () => {
      socket.emit("leave", { sessionId });
      socket.disconnect();
    };
  }, [sessionId, onOutput, onExit, onError]);

  // Send command to terminal
  const sendCommand = useCallback(
    (command: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("command", { sessionId, command });
      } else {
        console.error("Socket not connected");
      }
    },
    [sessionId],
  );

  // Send input to terminal (for interactive programs)
  const sendInput = useCallback(
    (data: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("input", { sessionId, data });
      }
    },
    [sessionId],
  );

  // Resize terminal
  const resize = useCallback(
    (cols: number, rows: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("resize", { sessionId, cols, rows });
      }
    },
    [sessionId],
  );

  // Clear terminal
  const clear = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("clear", { sessionId });
    }
  }, [sessionId]);

  // Restart terminal
  const restart = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("restart", { sessionId });
    }
  }, [sessionId]);

  // Create new terminal session
  const createSession = useCallback(
    async (projectId: string, type: "system" | "claude", tabName: string) => {
      try {
        const response = await fetch("/api/workspace/terminal/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, type, tabName }),
        });

        if (!response.ok) throw new Error("Failed to create terminal session");

        const session = await response.json();
        return session;
      } catch (error) {
        console.error("Failed to create terminal session:", error);
        throw error;
      }
    },
    [],
  );

  // Close terminal session
  const closeSession = useCallback(async () => {
    try {
      await fetch(`/api/workspace/terminal/session/${sessionId}`, {
        method: "DELETE",
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit("close", { sessionId });
      }
    } catch (error) {
      console.error("Failed to close terminal session:", error);
    }
  }, [sessionId]);

  // Get command history
  const getHistory = useCallback(
    async (limit = 100) => {
      try {
        const response = await fetch(
          `/api/workspace/terminal/session/${sessionId}/history?limit=${limit}`,
        );
        if (!response.ok) throw new Error("Failed to fetch history");

        const history = await response.json();
        return history;
      } catch (error) {
        console.error("Failed to fetch command history:", error);
        return [];
      }
    },
    [sessionId],
  );

  return {
    connected,
    loading,
    sendCommand,
    sendInput,
    resize,
    clear,
    restart,
    createSession,
    closeSession,
    getHistory,
    socket: socketRef.current,
  };
};
