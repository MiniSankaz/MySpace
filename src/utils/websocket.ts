import { config, isProduction } from "@/config/app.config";

/**
 * Build WebSocket URL based on type and environment
 */
export const buildWebSocketUrl = (
  type: "system" | "claude",
  options?: {
    projectId?: string;
    sessionId?: string;
    path?: string;
  },
): string => {
  const cfg = config();
  const port =
    type === "system" ? cfg.websocket.systemPort : cfg.websocket.claudePort;
  const protocol =
    isProduction() || window?.location?.protocol === "https:" ? "wss" : "ws";
  const host = cfg.websocket.host;

  let url = `${protocol}://${host}:${port}`;

  // Add optional path segments
  if (options?.path) {
    url += options.path;
  } else {
    if (options?.projectId) {
      url += `/project/${options.projectId}`;
    }
    if (options?.sessionId) {
      url += `/session/${options.sessionId}`;
    }
  }

  return url;
};

/**
 * Get WebSocket configuration for all types
 */
export const getWebSocketConfig = () => {
  const cfg = config();

  return {
    system: {
      url: buildWebSocketUrl("system"),
      port: cfg.websocket.systemPort,
      host: cfg.websocket.host,
    },
    claude: {
      url: buildWebSocketUrl("claude"),
      port: cfg.websocket.claudePort,
      host: cfg.websocket.host,
    },
    reconnect: {
      maxAttempts: 5,
      delay: 1000,
      maxDelay: 30000,
      factor: 2,
    },
  };
};

/**
 * Build API URL for terminal endpoints
 */
export const buildTerminalApiUrl = (endpoint: string): string => {
  const cfg = config();
  const baseUrl = cfg.app.baseUrl;

  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  return `${baseUrl}/api/terminal/${cleanEndpoint}`;
};

/**
 * Build API URL for workspace endpoints
 */
export const buildWorkspaceApiUrl = (endpoint: string): string => {
  const cfg = config();
  const baseUrl = cfg.app.baseUrl;

  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  return `${baseUrl}/api/workspace/${cleanEndpoint}`;
};

/**
 * Get full URL for the application
 */
export const getAppUrl = (path: string = ""): string => {
  const cfg = config();
  const baseUrl = cfg.app.baseUrl;

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Check if URL is local development
 */
export const isLocalUrl = (url: string): boolean => {
  return (
    url.includes(process.env.HOST || "localhost") ||
    url.includes(process.env.HOST || "127.0.0.1") ||
    url.includes("0.0.0.0")
  );
};

/**
 * Get WebSocket protocol based on current page protocol
 */
export const getWebSocketProtocol = (): "ws" | "wss" => {
  if (typeof window !== "undefined") {
    return window.location.protocol === "https:" ? "wss" : "ws";
  }
  return isProduction() ? "wss" : "ws";
};
