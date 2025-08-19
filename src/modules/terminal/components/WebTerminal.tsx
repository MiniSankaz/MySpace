"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { io, Socket } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";

interface WebTerminalProps {
  className?: string;
  onClose?: () => void;
}

export function WebTerminal({ className = "", onClose }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Get auth token
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Authentication required. Please login.");
      return;
    }

    // Create xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      allowProposedApi: true,
      scrollback: 1000,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    // Track user scroll behavior
    const handleScroll = () => {
      if (term.element) {
        const scrollTop = term.element.scrollTop;
        const scrollHeight = term.element.scrollHeight;
        const clientHeight = term.element.clientHeight;

        // Consider user scrolled up if they're more than 10px from bottom
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setIsUserScrolledUp(!isAtBottom);

        // Store current position for potential restoration
        scrollPositionRef.current = scrollTop;
      }
    };

    // Add scroll listener
    if (term.element) {
      term.element.addEventListener("scroll", handleScroll);
    }

    // Alternative: use MutationObserver to detect when element is available
    const observer = new MutationObserver(() => {
      if (term.element && !term.element.hasAttribute("data-scroll-listener")) {
        term.element.addEventListener("scroll", handleScroll);
        term.element.setAttribute("data-scroll-listener", "true");
        observer.disconnect();
      }
    });

    if (terminalRef.current) {
      observer.observe(terminalRef.current, { childList: true, subtree: true });
    }

    // Connect to WebSocket
    const socketInstance = io("/terminal", {
      auth: {
        token,
      },
      transports: ["websocket"],
    });

    socketInstance.on("connect", () => {
      console.log("Terminal WebSocket connected");
      setIsConnected(true);

      // Create new terminal session
      const cols = term.cols;
      const rows = term.rows;
      socketInstance.emit("terminal:create", { cols, rows });
    });

    socketInstance.on("terminal:created", (data: { sessionId: string }) => {
      console.log("Terminal session created:", data.sessionId);
      setSessionId(data.sessionId);
      term.write("🚀 Web Terminal Connected\r\n");
    });

    socketInstance.on(
      "terminal:data",
      (data: { sessionId: string; data: string }) => {
        term.write(data.data);

        // Auto-scroll to bottom only if user hasn't scrolled up
        if (!isUserScrolledUp) {
          term.scrollToBottom();
        }
      },
    );

    socketInstance.on("terminal:error", (data: { error: string }) => {
      console.error("Terminal error:", data.error);
      setError(data.error);
      term.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
    });

    socketInstance.on("terminal:closed", () => {
      console.log("Terminal session closed");
      term.write("\r\n\x1b[33mTerminal session closed\x1b[0m\r\n");
      setSessionId(null);
    });

    socketInstance.on("disconnect", () => {
      console.log("Terminal WebSocket disconnected");
      setIsConnected(false);
      term.write("\r\n\x1b[31mDisconnected from server\x1b[0m\r\n");
    });

    // Handle terminal input
    term.onData((data: string) => {
      if (sessionId && socketInstance.connected) {
        socketInstance.emit("terminal:input", { sessionId, data });
      }
    });

    // Handle terminal resize
    term.onResize((size: { cols: number; rows: number }) => {
      if (sessionId && socketInstance.connected) {
        socketInstance.emit("terminal:resize", {
          sessionId,
          cols: size.cols,
          rows: size.rows,
        });
      }
    });

    // Handle window resize without changing scroll position
    const handleResize = () => {
      if (fitAddonRef.current && terminal) {
        // Save current scroll position
        const currentScrollTop = terminal.element?.scrollTop || 0;
        const currentScrollHeight = terminal.element?.scrollHeight || 0;
        const currentClientHeight = terminal.element?.clientHeight || 0;

        setTimeout(() => {
          fitAddonRef.current?.fit();

          // Restore scroll position or maintain bottom scroll if user was at bottom
          if (terminal.element) {
            const wasAtBottom =
              currentScrollTop + currentClientHeight >=
              currentScrollHeight - 10;
            if (wasAtBottom && !isUserScrolledUp) {
              terminal.scrollToBottom();
            }
          }
        }, 50);
      }
    };

    window.addEventListener("resize", handleResize);

    setTerminal(term);
    setSocket(socketInstance);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (term.element) {
        term.element.removeEventListener("scroll", handleScroll);
      }
      observer.disconnect();

      if (sessionId && socketInstance.connected) {
        socketInstance.emit("terminal:close", { sessionId });
      }

      socketInstance.disconnect();
      term.dispose();
    };
  }, []);

  const handleClear = () => {
    if (terminal) {
      terminal.clear();
    }
  };

  const handleReset = () => {
    if (terminal) {
      terminal.reset();
    }
  };

  const handleCopy = () => {
    if (terminal && terminal.hasSelection()) {
      const selection = terminal.getSelection();
      navigator.clipboard.writeText(selection);
      terminal.clearSelection();
    }
  };

  const handlePaste = async () => {
    if (terminal) {
      try {
        const text = await navigator.clipboard.readText();
        if (sessionId && socket?.connected) {
          socket.emit("terminal:input", { sessionId, data: text });
        }
      } catch (err) {
        console.error("Failed to read clipboard:", err);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {sessionId && (
            <span className="text-xs text-gray-500">
              Session: {sessionId.substring(0, 8)}...
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Copy"
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Paste"
          >
            Paste
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Clear"
          >
            Clear
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Reset"
          >
            Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900 text-red-200 text-sm">{error}</div>
      )}

      {/* Terminal Container */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
