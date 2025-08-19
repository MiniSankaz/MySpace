# API Integration Architecture

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: API Integration Architecture Specification
- **Status**: Final
- **Dependencies**: Frontend Architecture Document, Microservices Architecture

---

## API Integration Overview

The API Integration Architecture provides a unified approach for the frontend to communicate with the microservices backend through the API Gateway. This architecture ensures consistent error handling, authentication, caching, and real-time updates across all client-server interactions.

### Architecture Principles

- **Gateway-First**: All API communication goes through the API Gateway (port 4110)
- **Service Abstraction**: Frontend doesn't directly communicate with individual microservices
- **Consistent Interface**: Uniform request/response patterns across all services
- **Error Resilience**: Automatic retry, circuit breaker, and graceful degradation
- **Real-time Support**: WebSocket connections for live features
- **Type Safety**: Full TypeScript support for all API interactions

---

## Service Layer Architecture

### API Gateway Integration Pattern

```typescript
/**
 * Centralized API Configuration
 * All services route through the API Gateway
 */
const API_GATEWAY_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:4110",
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
} as const;

/**
 * Service Endpoint Mapping
 * Maps logical services to API Gateway routes
 */
const SERVICE_ENDPOINTS = {
  // Authentication & User Management (Port 4100)
  auth: {
    base: "/api/v1/auth",
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    refresh: "/api/v1/auth/refresh",
    register: "/api/v1/auth/register",
    forgotPassword: "/api/v1/auth/forgot-password",
    resetPassword: "/api/v1/auth/reset-password",
    verifyEmail: "/api/v1/auth/verify-email",
  },

  users: {
    base: "/api/v1/users",
    profile: "/api/v1/users/profile",
    preferences: "/api/v1/users/preferences",
    avatar: "/api/v1/users/avatar",
  },

  // AI Assistant Service (Port 4130)
  assistant: {
    base: "/api/v1/assistant",
    chat: "/api/v1/chat",
    conversations: "/api/v1/chat/conversations",
    messages: "/api/v1/chat/messages",
    documents: "/api/v1/assistant/documents",
    knowledge: "/api/v1/assistant/knowledge",
  },

  // Terminal Service (Port 4140)
  terminal: {
    base: "/api/v1/terminal",
    sessions: "/api/v1/terminal/sessions",
    commands: "/api/v1/terminal/commands",
    history: "/api/v1/terminal/history",
  },

  // Workspace Service (Port 4150)
  workspace: {
    base: "/api/v1/workspace",
    projects: "/api/v1/workspace/projects",
    files: "/api/v1/workspace/files",
    git: "/api/v1/workspace/git",
  },

  // Portfolio Service (Port 4160)
  portfolio: {
    base: "/api/v1/portfolios",
    positions: "/api/v1/portfolios/positions",
    transactions: "/api/v1/portfolios/transactions",
    analytics: "/api/v1/portfolios/analytics",
    alerts: "/api/v1/portfolios/alerts",
  },

  stocks: {
    base: "/api/v1/stocks",
    prices: "/api/v1/stocks/prices",
    search: "/api/v1/stocks/search",
    news: "/api/v1/stocks/news",
  },
} as const;

/**
 * WebSocket Endpoint Configuration
 * Real-time communication endpoints
 */
const WEBSOCKET_ENDPOINTS = {
  terminal: "ws://localhost:4110/ws/terminal",
  chat: "ws://localhost:4110/ws/chat",
  portfolio: "ws://localhost:4110/ws/portfolio",
  workspace: "ws://localhost:4110/ws/workspace",
} as const;
```

### HTTP Client Architecture

```typescript
/**
 * Advanced HTTP Client with Interceptors and Retry Logic
 */
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId: string;
  service?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private rateLimitQueue: Array<() => void> = [];
  private isRefreshingToken = false;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request Interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracing
        config.headers["X-Request-ID"] = this.generateRequestId();

        // Add API version header
        config.headers["X-API-Version"] = "1.0";

        // Add client info
        config.headers["X-Client"] = "web-frontend";
        config.headers["X-Client-Version"] =
          process.env.NEXT_PUBLIC_APP_VERSION;

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`,
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle different error scenarios
        if (error.response) {
          const status = error.response.status;

          switch (status) {
            case 401:
              return this.handleUnauthorizedError(error, originalRequest);
            case 429:
              return this.handleRateLimitError(error, originalRequest);
            case 502:
            case 503:
            case 504:
              return this.handleServerError(error, originalRequest);
            default:
              return this.handleGenericError(error);
          }
        } else if (error.request) {
          // Network error
          return this.handleNetworkError(error, originalRequest);
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Handle 401 Unauthorized errors with token refresh
   */
  private async handleUnauthorizedError(
    error: AxiosError,
    originalRequest: AxiosRequestConfig & { _retry?: boolean },
  ): Promise<AxiosResponse> {
    if (!originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await this.refreshAccessToken();
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return this.client.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        this.handleAuthenticationFailure();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  private async handleRateLimitError(
    error: AxiosError,
    originalRequest: AxiosRequestConfig & { _retry?: boolean },
  ): Promise<AxiosResponse> {
    const retryAfter = error.response?.headers["retry-after"] || "1";
    const delay = parseInt(retryAfter) * 1000;

    await this.delay(delay);
    return this.client.request(originalRequest);
  }

  /**
   * Handle server errors with retry logic
   */
  private async handleServerError(
    error: AxiosError,
    originalRequest: AxiosRequestConfig & { _retryCount?: number },
  ): Promise<AxiosResponse> {
    const retryCount = originalRequest._retryCount || 0;

    if (retryCount < this.config.retries) {
      originalRequest._retryCount = retryCount + 1;

      const delay = Math.pow(2, retryCount) * this.config.retryDelay;
      await this.delay(delay);

      return this.client.request(originalRequest);
    }

    return Promise.reject(error);
  }

  /**
   * Token refresh logic
   */
  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshingToken && this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.isRefreshingToken = true;
    this.refreshTokenPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshTokenPromise;
      this.isRefreshingToken = false;
      this.refreshTokenPromise = null;
      return newToken;
    } catch (error) {
      this.isRefreshingToken = false;
      this.refreshTokenPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      `${this.config.baseURL}/api/v1/auth/refresh`,
      {
        refreshToken,
      },
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    this.setTokens(accessToken, newRefreshToken);
    return accessToken;
  }

  /**
   * Request deduplication
   */
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const key = this.generateRequestKey(config);

    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = this.client
      .request<T>(config)
      .then((response) => response.data);
    this.requestQueue.set(key, promise);

    // Clean up completed requests
    promise.finally(() => {
      this.requestQueue.delete(key);
    });

    return promise;
  }

  /**
   * Utility methods
   */
  private generateRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  }

  private handleAuthenticationFailure(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }

  private handleGenericError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      code: error.response?.data?.code || "UNKNOWN_ERROR",
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details,
      timestamp: Date.now(),
      requestId: error.config?.headers?.["X-Request-ID"] || "unknown",
      service: this.extractServiceFromUrl(error.config?.url),
    };

    console.error("API Error:", apiError);
    return Promise.reject(apiError);
  }

  private handleNetworkError(
    error: AxiosError,
    originalRequest: AxiosRequestConfig,
  ): Promise<never> {
    const apiError: ApiError = {
      code: "NETWORK_ERROR",
      message:
        "Unable to connect to the server. Please check your internet connection.",
      timestamp: Date.now(),
      requestId: originalRequest.headers?.["X-Request-ID"] || "unknown",
    };

    return Promise.reject(apiError);
  }

  private extractServiceFromUrl(url?: string): string | undefined {
    if (!url) return undefined;

    const match = url.match(/\/api\/v1\/([^\/]+)/);
    return match ? match[1] : undefined;
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_GATEWAY_CONFIG);
```

---

## Service-Specific API Clients

### Authentication Service Client

```typescript
/**
 * Authentication Service API Client
 */
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: string[];
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

class AuthService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * User authentication
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.apiClient.request<LoginResponse>({
      method: "POST",
      url: SERVICE_ENDPOINTS.auth.login,
      data: credentials,
    });

    // Store tokens and user info
    this.setAuthData(response);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.request({
        method: "POST",
        url: SERVICE_ENDPOINTS.auth.logout,
      });
    } finally {
      // Always clear local data, even if API call fails
      this.clearAuthData();
    }
  }

  async register(data: RegisterData): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.auth.register,
      data,
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.auth.forgotPassword,
      data: { email },
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.auth.resetPassword,
      data: { token, newPassword },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.auth.verifyEmail,
      data: { token },
    });
  }

  /**
   * OAuth providers
   */
  getOAuthUrl(provider: "google" | "github" | "apple"): string {
    return `${API_GATEWAY_CONFIG.baseURL}/api/v1/auth/oauth/${provider}`;
  }

  /**
   * Utility methods
   */
  private setAuthData(authData: LoginResponse): void {
    localStorage.setItem("access_token", authData.accessToken);
    localStorage.setItem("refresh_token", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
    localStorage.setItem("permissions", JSON.stringify(authData.permissions));
  }

  private clearAuthData(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
  }
}

export const authService = new AuthService(apiClient);
```

### User Management Service Client

```typescript
/**
 * User Management Service API Client
 */
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
  trading: {
    defaultCurrency: string;
    riskTolerance: "low" | "medium" | "high";
  };
}

class UserService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Profile management
   */
  async getProfile(): Promise<UserProfile> {
    return this.apiClient.request({
      method: "GET",
      url: SERVICE_ENDPOINTS.users.profile,
    });
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.apiClient.request({
      method: "PATCH",
      url: SERVICE_ENDPOINTS.users.profile,
      data: updates,
    });
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append("avatar", file);

    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.users.avatar,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  /**
   * Preferences management
   */
  async getPreferences(): Promise<UserPreferences> {
    return this.apiClient.request({
      method: "GET",
      url: SERVICE_ENDPOINTS.users.preferences,
    });
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    return this.apiClient.request({
      method: "PATCH",
      url: SERVICE_ENDPOINTS.users.preferences,
      data: preferences,
    });
  }

  /**
   * Account management
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "POST",
      url: `${SERVICE_ENDPOINTS.users.base}/change-password`,
      data: { currentPassword, newPassword },
    });
  }

  async deleteAccount(password: string): Promise<{ message: string }> {
    return this.apiClient.request({
      method: "DELETE",
      url: SERVICE_ENDPOINTS.users.base,
      data: { password },
    });
  }

  async exportData(): Promise<{ downloadUrl: string }> {
    return this.apiClient.request({
      method: "POST",
      url: `${SERVICE_ENDPOINTS.users.base}/export`,
    });
  }
}

export const userService = new UserService(apiClient);
```

### AI Assistant Service Client

```typescript
/**
 * AI Assistant Service API Client
 */
interface Conversation {
  id: string;
  title: string;
  folderId?: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

interface SendMessageRequest {
  conversationId?: string;
  content: string;
  context?: ConversationContext;
  attachments?: File[];
}

interface ConversationContext {
  projectId?: string;
  terminalSessionId?: string;
  portfolioId?: string;
  documentIds?: string[];
}

class AIAssistantService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Conversation management
   */
  async getConversations(folderId?: string): Promise<Conversation[]> {
    return this.apiClient.request({
      method: "GET",
      url: SERVICE_ENDPOINTS.assistant.conversations,
      params: { folderId },
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.apiClient.request({
      method: "GET",
      url: `${SERVICE_ENDPOINTS.assistant.conversations}/${conversationId}`,
    });
  }

  async createConversation(
    title: string,
    folderId?: string,
  ): Promise<Conversation> {
    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.assistant.conversations,
      data: { title, folderId },
    });
  }

  async updateConversation(
    conversationId: string,
    updates: { title?: string; folderId?: string },
  ): Promise<Conversation> {
    return this.apiClient.request({
      method: "PATCH",
      url: `${SERVICE_ENDPOINTS.assistant.conversations}/${conversationId}`,
      data: updates,
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.apiClient.request({
      method: "DELETE",
      url: `${SERVICE_ENDPOINTS.assistant.conversations}/${conversationId}`,
    });
  }

  /**
   * Message handling
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const formData = new FormData();
    formData.append("content", request.content);

    if (request.conversationId) {
      formData.append("conversationId", request.conversationId);
    }

    if (request.context) {
      formData.append("context", JSON.stringify(request.context));
    }

    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.assistant.messages,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  /**
   * Streaming messages
   */
  async *streamMessage(
    request: SendMessageRequest,
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(
      `${API_GATEWAY_CONFIG.baseURL}/api/v1/chat/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "content") {
              yield data.content;
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Document management
   */
  async uploadDocument(
    file: File,
    description?: string,
  ): Promise<{ documentId: string }> {
    const formData = new FormData();
    formData.append("document", file);

    if (description) {
      formData.append("description", description);
    }

    return this.apiClient.request({
      method: "POST",
      url: SERVICE_ENDPOINTS.assistant.documents,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  async getDocuments(): Promise<Document[]> {
    return this.apiClient.request({
      method: "GET",
      url: SERVICE_ENDPOINTS.assistant.documents,
    });
  }

  async deleteDocument(documentId: string): Promise<void> {
    return this.apiClient.request({
      method: "DELETE",
      url: `${SERVICE_ENDPOINTS.assistant.documents}/${documentId}`,
    });
  }

  /**
   * Knowledge management
   */
  async searchKnowledge(
    query: string,
    filters?: SearchFilters,
  ): Promise<SearchResult[]> {
    return this.apiClient.request({
      method: "POST",
      url: `${SERVICE_ENDPOINTS.assistant.knowledge}/search`,
      data: { query, filters },
    });
  }
}

export const aiAssistantService = new AIAssistantService(apiClient);
```

---

## WebSocket Integration Architecture

### WebSocket Connection Manager

```typescript
/**
 * WebSocket Connection Management
 */
interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id: string;
}

type WebSocketEventHandler<T = any> = (message: WebSocketMessage<T>) => void;

class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private configs = new Map<string, WebSocketConfig>();
  private handlers = new Map<string, Map<string, WebSocketEventHandler[]>>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private reconnectAttempts = new Map<string, number>();

  /**
   * Connect to a WebSocket service
   */
  connect(serviceId: string, config: WebSocketConfig): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(config.url, config.protocols);

        ws.onopen = () => {
          console.log(`✅ WebSocket connected: ${serviceId}`);

          this.connections.set(serviceId, ws);
          this.configs.set(serviceId, config);
          this.reconnectAttempts.set(serviceId, 0);

          this.setupHeartbeat(serviceId);
          resolve(ws);
        };

        ws.onmessage = (event) => {
          this.handleMessage(serviceId, event);
        };

        ws.onclose = (event) => {
          this.handleDisconnection(serviceId, event);
        };

        ws.onerror = (error) => {
          console.error(`❌ WebSocket error: ${serviceId}`, error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from a WebSocket service
   */
  disconnect(serviceId: string): void {
    const ws = this.connections.get(serviceId);
    if (ws) {
      ws.close();
      this.cleanup(serviceId);
    }
  }

  /**
   * Send message to a WebSocket service
   */
  send<T>(serviceId: string, type: string, data: T): void {
    const ws = this.connections.get(serviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = {
        type,
        data,
        timestamp: Date.now(),
        id: this.generateMessageId(),
      };

      ws.send(JSON.stringify(message));
    } else {
      console.warn(`Cannot send message to ${serviceId}: connection not ready`);
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on<T>(
    serviceId: string,
    eventType: string,
    handler: WebSocketEventHandler<T>,
  ): void {
    if (!this.handlers.has(serviceId)) {
      this.handlers.set(serviceId, new Map());
    }

    const serviceHandlers = this.handlers.get(serviceId)!;
    if (!serviceHandlers.has(eventType)) {
      serviceHandlers.set(eventType, []);
    }

    serviceHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off<T>(
    serviceId: string,
    eventType: string,
    handler: WebSocketEventHandler<T>,
  ): void {
    const serviceHandlers = this.handlers.get(serviceId);
    if (serviceHandlers) {
      const eventHandlers = serviceHandlers.get(eventType);
      if (eventHandlers) {
        const index = eventHandlers.indexOf(handler);
        if (index > -1) {
          eventHandlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(
    serviceId: string,
  ): "connecting" | "open" | "closed" | "unknown" {
    const ws = this.connections.get(serviceId);
    if (!ws) return "unknown";

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "open";
      case WebSocket.CLOSED:
        return "closed";
      default:
        return "unknown";
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(serviceId: string, event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      const serviceHandlers = this.handlers.get(serviceId);
      if (serviceHandlers) {
        const eventHandlers = serviceHandlers.get(message.type);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => handler(message));
        }

        // Also trigger global handlers
        const globalHandlers = serviceHandlers.get("*");
        if (globalHandlers) {
          globalHandlers.forEach((handler) => handler(message));
        }
      }
    } catch (error) {
      console.error(`Error parsing WebSocket message for ${serviceId}:`, error);
    }
  }

  /**
   * Handle disconnections and reconnection logic
   */
  private handleDisconnection(serviceId: string, event: CloseEvent): void {
    console.log(`🔌 WebSocket disconnected: ${serviceId}`, event);

    const config = this.configs.get(serviceId);
    if (config?.reconnect) {
      this.scheduleReconnection(serviceId);
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnection(serviceId: string): void {
    const config = this.configs.get(serviceId);
    if (!config) return;

    const attempts = this.reconnectAttempts.get(serviceId) || 0;
    const maxAttempts = config.reconnectAttempts || 5;

    if (attempts >= maxAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${serviceId}`);
      return;
    }

    const delay = Math.min(
      (config.reconnectInterval || 1000) * Math.pow(2, attempts),
      30000, // Max 30 seconds
    );

    console.log(
      `🔄 Scheduling reconnection for ${serviceId} in ${delay}ms (attempt ${attempts + 1})`,
    );

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(serviceId, attempts + 1);
      this.connect(serviceId, config);
    }, delay);

    this.reconnectTimers.set(serviceId, timer);
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(serviceId: string): void {
    const config = this.configs.get(serviceId);
    const interval = config?.heartbeatInterval || 30000;

    const timer = setInterval(() => {
      this.send(serviceId, "ping", { timestamp: Date.now() });
    }, interval);

    this.heartbeatTimers.set(serviceId, timer);
  }

  /**
   * Cleanup resources
   */
  private cleanup(serviceId: string): void {
    // Clear timers
    const reconnectTimer = this.reconnectTimers.get(serviceId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(serviceId);
    }

    const heartbeatTimer = this.heartbeatTimers.get(serviceId);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.heartbeatTimers.delete(serviceId);
    }

    // Clear references
    this.connections.delete(serviceId);
    this.configs.delete(serviceId);
    this.handlers.delete(serviceId);
    this.reconnectAttempts.delete(serviceId);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    for (const [serviceId] of this.connections) {
      this.disconnect(serviceId);
    }
  }
}

export const wsManager = new WebSocketManager();
```

### Service-Specific WebSocket Clients

```typescript
/**
 * Terminal WebSocket Client
 */
interface TerminalSession {
  id: string;
  name: string;
  projectId: string;
  type: "system" | "claude";
  status: "active" | "disconnected" | "error";
}

class TerminalWebSocketClient {
  private wsManager: WebSocketManager;
  private activeSessions = new Map<string, TerminalSession>();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  /**
   * Connect to terminal service
   */
  async connect(): Promise<void> {
    await this.wsManager.connect("terminal", {
      url: WEBSOCKET_ENDPOINTS.terminal,
      reconnect: true,
      reconnectAttempts: 10,
      heartbeatInterval: 30000,
    });

    // Setup event handlers
    this.wsManager.on(
      "terminal",
      "session_created",
      this.handleSessionCreated.bind(this),
    );
    this.wsManager.on(
      "terminal",
      "output",
      this.handleTerminalOutput.bind(this),
    );
    this.wsManager.on(
      "terminal",
      "session_closed",
      this.handleSessionClosed.bind(this),
    );
  }

  /**
   * Create terminal session
   */
  createSession(
    projectId: string,
    type: "system" | "claude",
    name?: string,
  ): void {
    this.wsManager.send("terminal", "create_session", {
      projectId,
      type,
      name: name || `Terminal ${type}`,
    });
  }

  /**
   * Send command to terminal
   */
  sendCommand(sessionId: string, command: string): void {
    this.wsManager.send("terminal", "command", {
      sessionId,
      command,
    });
  }

  /**
   * Resize terminal
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    this.wsManager.send("terminal", "resize", {
      sessionId,
      cols,
      rows,
    });
  }

  /**
   * Close terminal session
   */
  closeSession(sessionId: string): void {
    this.wsManager.send("terminal", "close_session", { sessionId });
  }

  /**
   * Event handlers
   */
  private handleSessionCreated(
    message: WebSocketMessage<TerminalSession>,
  ): void {
    this.activeSessions.set(message.data.id, message.data);
  }

  private handleTerminalOutput(
    message: WebSocketMessage<{ sessionId: string; output: string }>,
  ): void {
    // This will be handled by terminal components
  }

  private handleSessionClosed(
    message: WebSocketMessage<{ sessionId: string }>,
  ): void {
    this.activeSessions.delete(message.data.sessionId);
  }

  /**
   * Get active sessions
   */
  getSessions(): TerminalSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Subscribe to session events
   */
  onSessionOutput(handler: (sessionId: string, output: string) => void): void {
    this.wsManager.on("terminal", "output", (message) => {
      handler(message.data.sessionId, message.data.output);
    });
  }

  onSessionStatusChange(handler: (session: TerminalSession) => void): void {
    this.wsManager.on("terminal", "session_status", (message) => {
      const session = this.activeSessions.get(message.data.sessionId);
      if (session) {
        session.status = message.data.status;
        handler(session);
      }
    });
  }
}

/**
 * AI Chat WebSocket Client
 */
class ChatWebSocketClient {
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  async connect(): Promise<void> {
    await this.wsManager.connect("chat", {
      url: WEBSOCKET_ENDPOINTS.chat,
      reconnect: true,
      reconnectAttempts: 5,
      heartbeatInterval: 30000,
    });
  }

  /**
   * Start streaming conversation
   */
  startStreaming(conversationId: string): void {
    this.wsManager.send("chat", "start_stream", { conversationId });
  }

  /**
   * Send message with streaming response
   */
  sendMessage(conversationId: string, content: string, context?: any): void {
    this.wsManager.send("chat", "message", {
      conversationId,
      content,
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to streaming responses
   */
  onMessageChunk(
    handler: (conversationId: string, chunk: string) => void,
  ): void {
    this.wsManager.on("chat", "message_chunk", (message) => {
      handler(message.data.conversationId, message.data.chunk);
    });
  }

  onMessageComplete(
    handler: (conversationId: string, messageId: string) => void,
  ): void {
    this.wsManager.on("chat", "message_complete", (message) => {
      handler(message.data.conversationId, message.data.messageId);
    });
  }

  onTyping(handler: (conversationId: string, isTyping: boolean) => void): void {
    this.wsManager.on("chat", "typing", (message) => {
      handler(message.data.conversationId, message.data.isTyping);
    });
  }
}

/**
 * Portfolio WebSocket Client
 */
class PortfolioWebSocketClient {
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  async connect(): Promise<void> {
    await this.wsManager.connect("portfolio", {
      url: WEBSOCKET_ENDPOINTS.portfolio,
      reconnect: true,
      reconnectAttempts: 10,
      heartbeatInterval: 15000,
    });
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrices(symbols: string[]): void {
    this.wsManager.send("portfolio", "subscribe_prices", { symbols });
  }

  unsubscribeFromPrices(symbols: string[]): void {
    this.wsManager.send("portfolio", "unsubscribe_prices", { symbols });
  }

  /**
   * Subscribe to portfolio updates
   */
  subscribeToPortfolio(portfolioId: string): void {
    this.wsManager.send("portfolio", "subscribe_portfolio", { portfolioId });
  }

  /**
   * Event handlers for price updates
   */
  onPriceUpdate(
    handler: (symbol: string, price: number, change: number) => void,
  ): void {
    this.wsManager.on("portfolio", "price_update", (message) => {
      handler(message.data.symbol, message.data.price, message.data.change);
    });
  }

  onPortfolioUpdate(handler: (portfolioId: string, data: any) => void): void {
    this.wsManager.on("portfolio", "portfolio_update", (message) => {
      handler(message.data.portfolioId, message.data);
    });
  }

  onAlert(handler: (alert: any) => void): void {
    this.wsManager.on("portfolio", "alert", (message) => {
      handler(message.data);
    });
  }
}

// Export WebSocket clients
export const terminalWs = new TerminalWebSocketClient(wsManager);
export const chatWs = new ChatWebSocketClient(wsManager);
export const portfolioWs = new PortfolioWebSocketClient(wsManager);
```

---

## Request/Response Type System

### Complete TypeScript Type Definitions

```typescript
/**
 * API Request/Response Type System
 */

// Base API Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: number;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId: string;
  service?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Management Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
  trading: {
    defaultCurrency: string;
    riskTolerance: "low" | "medium" | "high";
  };
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: string[];
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

// AI Assistant Types
export interface Conversation {
  id: string;
  title: string;
  folderId?: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

export interface ConversationContext {
  projectId?: string;
  terminalSessionId?: string;
  portfolioId?: string;
  documentIds?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  sources?: string[];
}

// Workspace Types
export interface Project {
  id: string;
  name: string;
  description: string;
  template: ProjectTemplate;
  status: "active" | "archived";
  visibility: "private" | "shared" | "public";
  owner: User;
  collaborators: ProjectCollaborator[];
  repository?: GitRepository;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  files: TemplateFile[];
  dependencies: string[];
  scripts: Record<string, string>;
}

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  modifiedAt: string;
  children?: FileNode[];
  gitStatus?: GitFileStatus;
}

export enum GitFileStatus {
  UNTRACKED = "untracked",
  MODIFIED = "modified",
  ADDED = "added",
  DELETED = "deleted",
  RENAMED = "renamed",
  CONFLICT = "conflict",
}

// Terminal Types
export interface TerminalSession {
  id: string;
  name: string;
  projectId: string;
  type: "system" | "claude";
  status: "active" | "disconnected" | "error";
  lastActivity: string;
  history: string[];
  environment: Record<string, string>;
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
  duration: number;
}

// Portfolio Types
export interface Portfolio {
  id: string;
  name: string;
  description: string;
  baseCurrency: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  performance: PerformanceHistory;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  assetType: AssetType;
}

export enum AssetType {
  STOCK = "stock",
  CRYPTO = "crypto",
  GOLD = "gold",
  ETF = "etf",
  BOND = "bond",
}

export interface Transaction {
  id: string;
  portfolioId: string;
  type: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  commission: number;
  total: number;
  timestamp: string;
  notes?: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  timeWeightedReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
}

// Market Data Types
export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface MarketData {
  indices: {
    [key: string]: PriceData;
  };
  topMovers: {
    gainers: PriceData[];
    losers: PriceData[];
  };
  marketStatus: "open" | "closed" | "pre-market" | "after-hours";
}

// Alert Types
export interface Alert {
  id: string;
  userId: string;
  portfolioId?: string;
  type: "price" | "percentage" | "volume" | "news";
  symbol: string;
  condition: AlertCondition;
  isActive: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface AlertCondition {
  type: "above" | "below" | "change";
  value: number;
  timeframe?: string;
}

// WebSocket Types
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

// Search Types
export interface SearchResult {
  id: string;
  type: "document" | "conversation" | "code" | "portfolio";
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  type?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  source?: string[];
}
```

---

This comprehensive API Integration Architecture provides a robust foundation for frontend-backend communication, ensuring type safety, error resilience, and real-time capabilities across all modules of the Stock Portfolio Management System.
