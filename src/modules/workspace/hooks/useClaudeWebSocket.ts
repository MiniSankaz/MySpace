"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ClaudeWebSocketOptions {
  projectId: string;
  sessionId?: string;
  path?: string;
  onOutput?: (data: string) => void;
  onExit?: (code: number) => void;
  onError?: (error: Error) => void;
}

export const useClaudeWebSocket = ({
  projectId,
  sessionId,
  path,
  onOutput,
  onExit,
  onError,
}: ClaudeWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    setIsConnecting(true);

    try {
      const token = localStorage.getItem("accessToken");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      const params = new URLSearchParams({
        projectId,
        token: token || "",
        ...(sessionId && { sessionId }),
        ...(path && { path }), // URLSearchParams will handle encoding
      });

      const wsUrl = `${protocol}//${host}/ws/claude?${params.toString()}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Claude WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              console.log("Claude session started:", message.sessionId);
              onOutput?.(`🤖 ${message.message}\n`);
              break;

            case "stream":
              // Streaming output from Claude
              onOutput?.(message.data);
              break;

            case "output":
              // Non-streaming output
              onOutput?.(message.data);
              break;

            case "error":
              onError?.(new Error(message.message));
              break;

            case "exit":
              onExit?.(message.code);
              break;

            case "pong":
              // Keep-alive response
              break;

            default:
              console.warn("Unknown Claude message type:", message.type);
          }
        } catch (error) {
          console.error("Error parsing Claude WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("Claude WebSocket error:", error);
        onError?.(new Error("Claude WebSocket connection error"));
      };

      ws.onclose = (event) => {
        console.log("Claude WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create Claude WebSocket:", error);
      setIsConnecting(false);
      onError?.(error as Error);
    }
  }, [projectId, sessionId, path, onOutput, onExit, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "input",
          data,
        }),
      );
    }
  }, []);

  const sendCommand = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "command",
          data,
        }),
      );
    }
  }, []);

  const sendControl = useCallback((key: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "ctrl",
          key,
        }),
      );
    }
  }, []);

  // Enable connect button for manual testing
  const [shouldConnect, setShouldConnect] = useState(false);

  useEffect(() => {
    if (shouldConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [shouldConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    sendInput,
    sendCommand,
    sendControl,
    connect: () => setShouldConnect(true),
    disconnect: () => {
      setShouldConnect(false);
      disconnect();
    },
  };
};
