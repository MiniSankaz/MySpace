"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TerminalSession } from "../../types";

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeTab: string | null;
  onTabSelect: (sessionId: string) => void;
  onTabClose: (sessionId: string) => void;
  onNewTab: () => void;
  onRenameTab?: (sessionId: string) => void;
  onRecoverSession?: (sessionId: string) => void; // New prop for recovery
  maxTabs?: number;
  connectionStatus?: Record<
    string,
    "connected" | "disconnected" | "reconnecting" | "error"
  >;
  circuitBreakerStatus?: Record<string, "closed" | "open" | "half-open">; // Track circuit breaker state
  backgroundActivity?: Record<string, boolean>; // New prop to track background activity
  hasNewOutput?: Record<string, boolean>; // Track sessions with new output
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({
  sessions,
  activeTab,
  onTabSelect,
  onTabClose,
  onNewTab,
  onRenameTab,
  onRecoverSession,
  maxTabs = 10,
  connectionStatus = {},
  circuitBreakerStatus = {},
  backgroundActivity = {},
  hasNewOutput = {},
}) => {
  return (
    <div className="flex items-center space-x-1 flex-1 overflow-x-auto scrollbar-none">
      <AnimatePresence mode="popLayout">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center px-3 py-1 rounded-md text-xs cursor-pointer transition-all min-w-fit group ${
              activeTab === session.id
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
            }`}
            onClick={() => onTabSelect(session.id)}
          >
            <div className="flex items-center space-x-2">
              {/* Session indicator with activity status and circuit breaker */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  circuitBreakerStatus[session.id] === "open"
                    ? "bg-red-500 animate-pulse" // Circuit breaker triggered!
                    : circuitBreakerStatus[session.id] === "half-open"
                      ? "bg-yellow-500 animate-pulse" // Recovery attempt
                      : activeTab === session.id
                        ? "bg-green-400 animate-pulse"
                        : hasNewOutput[session.id]
                          ? "bg-yellow-400 animate-pulse" // New output indicator
                          : connectionStatus[session.id] === "connected"
                            ? "bg-blue-400"
                            : connectionStatus[session.id] === "reconnecting"
                              ? "bg-orange-400 animate-pulse"
                              : connectionStatus[session.id] === "error"
                                ? "bg-red-400"
                                : backgroundActivity[session.id]
                                  ? "bg-orange-400 animate-pulse" // Background activity indicator
                                  : "bg-gray-500"
                }`}
                title={
                  circuitBreakerStatus[session.id] === "open"
                    ? "Connection blocked - Too many failures"
                    : circuitBreakerStatus[session.id] === "half-open"
                      ? "Attempting to recover..."
                      : connectionStatus[session.id] || "Ready"
                }
              />

              {/* Tab name with activity badge */}
              <div className="flex items-center space-x-1">
                <span
                  className="whitespace-nowrap font-medium"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRenameTab?.(session.id);
                  }}
                  title="Double-click to rename"
                >
                  {session.tabName}
                </span>

                {/* Background activity or new output badge */}
                {activeTab !== session.id &&
                  (backgroundActivity[session.id] ||
                    hasNewOutput[session.id]) && (
                    <div
                      className={`w-1 h-1 rounded-full animate-pulse ${
                        hasNewOutput[session.id]
                          ? "bg-yellow-400"
                          : "bg-orange-400"
                      }`}
                      title={
                        hasNewOutput[session.id]
                          ? "New output available"
                          : "Background activity detected"
                      }
                    />
                  )}
              </div>

              {/* Recovery button for circuit breaker */}
              {circuitBreakerStatus[session.id] === "open" &&
                onRecoverSession && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecoverSession(session.id);
                    }}
                    className="ml-1 p-0.5 hover:bg-green-600 rounded transition-colors text-green-400"
                    title="Restart terminal connection"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}

              {/* Close button - always show to allow recovery from broken sessions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(session.id);
                }}
                className="ml-1 p-0.5 hover:bg-gray-600 rounded transition-colors opacity-60 hover:opacity-100"
                title={
                  sessions.length === 1
                    ? "Close and restart terminal"
                    : "Close terminal"
                }
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* New tab button */}
      {sessions.length < maxTabs && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewTab}
          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-all"
          title="New tab (⌘T)"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.button>
      )}

      {/* Tab overflow indicator */}
      {sessions.length >= maxTabs && (
        <div className="px-2 py-1 text-xs text-gray-500">
          Max tabs ({maxTabs})
        </div>
      )}
    </div>
  );
};

export default TerminalTabs;
