/**
 * Terminal System Configuration
 * Centralized configuration for terminal-related settings
 * Follows Zero Hardcoding Policy
 */

export const terminalConfig = {
  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.TERMINAL_WS_PORT || "4001"),
    host: process.env.WS_HOST || process.env.HOST || "127.0.0.1",
    claudePort: parseInt(process.env.CLAUDE_WS_PORT || "4002"),
    timeout: parseInt(process.env.WS_TIMEOUT || "5000"),
    reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || "3"),
    reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || "1000"),
  },

  // Memory Management
  memory: {
    // RSS Memory thresholds in MB
    rssWarningThreshold: parseInt(process.env.MEMORY_RSS_WARNING || "2048"),
    rssEmergencyThreshold: parseInt(process.env.MEMORY_RSS_EMERGENCY || "6144"),
    heapWarningThreshold: parseInt(process.env.MEMORY_HEAP_WARNING || "4000"),

    // Session limits
    maxTotalSessions: parseInt(process.env.MAX_TERMINAL_SESSIONS || "50"),
    maxSessionsPerProject: parseInt(
      process.env.MAX_SESSIONS_PER_PROJECT || "20",
    ),
    maxFocusedPerProject: parseInt(process.env.MAX_FOCUSED_PER_PROJECT || "10"),

    // Cleanup intervals (in ms)
    cleanupInterval: parseInt(process.env.MEMORY_CLEANUP_INTERVAL || "300000"), // 5 minutes
    emergencyCheckInterval: parseInt(
      process.env.MEMORY_EMERGENCY_CHECK || "120000",
    ), // 2 minutes
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "300000"), // 5 minutes
  },

  // Rate Limiting
  rateLimit: {
    maxCreationsPerMinute: parseInt(
      process.env.MAX_TERMINAL_CREATIONS_PER_MIN || "10",
    ),
    circuitBreakerResetTime: parseInt(
      process.env.CIRCUIT_BREAKER_RESET || "300000",
    ), // 5 minutes
  },

  // Project Switching
  projectSwitch: {
    debounceMs: parseInt(process.env.TERMINAL_SWITCH_DEBOUNCE || "500"),
    queueProcessDelay: parseInt(process.env.QUEUE_PROCESS_DELAY || "100"),
    operationQueueDelay: parseInt(process.env.OPERATION_QUEUE_DELAY || "50"),
  },

  // Suspension
  suspension: {
    maxSuspensionTime: parseInt(process.env.MAX_SUSPENSION_TIME || "1800000"), // 30 minutes
    cleanupInterval: parseInt(
      process.env.SUSPENSION_CLEANUP_INTERVAL || "600000",
    ), // 10 minutes
    maxResumeAttempts: parseInt(process.env.MAX_RESUME_ATTEMPTS || "3"),
    bufferedOutputLimit: parseInt(process.env.BUFFERED_OUTPUT_LIMIT || "1000"),
  },

  // Terminal Naming
  naming: {
    prefix: process.env.TERMINAL_NAME_PREFIX || "Terminal",
    separator: process.env.TERMINAL_NAME_SEPARATOR || " ",
  },

  // Activity Tracking
  activity: {
    backgroundCheckInterval: parseInt(
      process.env.BACKGROUND_CHECK_INTERVAL || "2000",
    ),
    activityTimeout: parseInt(process.env.ACTIVITY_TIMEOUT || "300000"), // 5 minutes
  },
};

// Helper function to get WebSocket URL
export function getWebSocketUrl(type: "system" | "claude" = "system"): string {
  const { websocket } = terminalConfig;
  const port = type === "system" ? websocket.port : websocket.claudePort;
  const protocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
  return `${protocol}://${websocket.host}:${port}`;
}

// Validation function to ensure required environment variables
export function validateTerminalConfig(): void {
  const required = ["TERMINAL_WS_PORT", "WS_HOST"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    console.warn(
      "[Terminal Config] Missing environment variables:",
      missing.join(", "),
    );
    console.warn(
      "[Terminal Config] Using default values. This may cause issues in production.",
    );
  }
}

export default terminalConfig;
