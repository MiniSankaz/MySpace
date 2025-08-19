import { useEffect, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { Message } from "../types";

interface UseSocketProps {
  userId: string;
  sessionId: string;
  onMessage?: (message: Message) => void;
  onTyping?: (userId: string) => void;
  onStopTyping?: (userId: string) => void;
}

export function useSocket({
  userId,
  sessionId,
  onMessage,
  onTyping,
  onStopTyping,
}: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "http://localhost:process.env.PORT || 4000";
    const newSocket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);

      // Join session room
      newSocket.emit("join-session", { userId, sessionId });
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    newSocket.on("session-joined", (data) => {
      console.log("Joined session:", data.roomName);
    });

    newSocket.on("user-message", (message: Message) => {
      onMessage?.(message);
    });

    newSocket.on("assistant-response", (data) => {
      const message: Message = {
        id: data.id,
        userId: "assistant",
        content: data.content,
        type: "assistant",
        timestamp: data.timestamp,
        metadata: { suggestions: data.suggestions },
      };
      onMessage?.(message);
    });

    newSocket.on("user-typing", (data) => {
      onTyping?.(data.userId);
    });

    newSocket.on("user-stopped-typing", (data) => {
      onStopTyping?.(data.userId);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId, sessionId]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket && connected) {
        socket.emit("assistant-message", {
          userId,
          sessionId,
          message,
        });
      }
    },
    [socket, connected, userId, sessionId],
  );

  const startTyping = useCallback(() => {
    if (socket && connected && !typing) {
      socket.emit("typing-start", { userId, sessionId });
      setTyping(true);

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Stop typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        stopTyping();
      }, 2000);

      setTypingTimeout(timeout);
    }
  }, [socket, connected, typing, userId, sessionId, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (socket && connected && typing) {
      socket.emit("typing-stop", { userId, sessionId });
      setTyping(false);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }, [socket, connected, typing, userId, sessionId, typingTimeout]);

  return {
    socket,
    connected,
    sendMessage,
    startTyping,
    stopTyping,
  };
}
