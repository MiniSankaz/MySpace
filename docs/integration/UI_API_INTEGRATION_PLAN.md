# UI-API Integration Plan

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Agent**: System Analyst
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: Technical Integration Architecture
- **Status**: Final
- **Dependencies**: Microservices Architecture v3.0, Frontend Architecture, API Integration Architecture

---

## Executive Summary

This document provides a comprehensive plan for integrating the React-based frontend UI components with the microservices backend through the API Gateway. The integration follows a layered architecture approach with service abstraction, state management, and real-time communication patterns.

### Key Integration Objectives

- **Unified API Communication**: All frontend requests route through API Gateway (port 4110)
- **Type-Safe Integration**: Complete TypeScript support with auto-generated types
- **State Management**: Zustand for global state, React Query for server state
- **Real-time Features**: WebSocket integration for live updates
- **Error Resilience**: Circuit breaker patterns and automatic retry logic
- **Performance Optimization**: Request deduplication, caching, and optimistic updates

---

## Service Client Architecture

### 1. API Gateway Client Configuration

```typescript
// /src/services/api/gateway.client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

export interface GatewayConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId: string;
  service?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: number;
  requestId: string;
  service: string;
}

class GatewayClient {
  private client: AxiosInstance;
  private config: GatewayConfig;
  private requestQueue = new Map<string, Promise<any>>();
  private circuitBreaker = new Map<
    string,
    { failures: number; lastFailure: number; isOpen: boolean }
  >();

  constructor(config: GatewayConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Client": "web-frontend",
        "X-Client-Version": process.env.NEXT_PUBLIC_APP_VERSION || "3.0.0",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request tracking
        config.headers["X-Request-ID"] = this.generateRequestId();
        config.headers["X-Timestamp"] = Date.now().toString();

        // Log requests in development
        if (
          this.config.enableLogging &&
          process.env.NODE_ENV === "development"
        ) {
          console.log(
            `🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`,
          );
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Reset circuit breaker on success
        this.resetCircuitBreaker(response.config.url || "");

        // Log successful responses
        if (
          this.config.enableLogging &&
          process.env.NODE_ENV === "development"
        ) {
          console.log(
            `✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`,
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const url = error.config?.url || "";

        // Update circuit breaker
        this.updateCircuitBreaker(url);

        // Handle specific error types
        if (error.response) {
          const status = error.response.status;

          switch (status) {
            case 401:
              return this.handleUnauthorized(error);
            case 429:
              return this.handleRateLimit(error);
            case 502:
            case 503:
            case 504:
              return this.handleServerError(error);
            default:
              return this.handleGenericError(error);
          }
        }

        // Network errors
        return this.handleNetworkError(error);
      },
    );
  }

  // Service-specific API methods
  async get<T>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: "GET", url: path });
  }

  async post<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: "POST", url: path, data });
  }

  async put<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: "PUT", url: path, data });
  }

  async patch<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: "PATCH", url: path, data });
  }

  async delete<T>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: "DELETE", url: path });
  }

  private async request<T>(
    config: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    // Check circuit breaker
    if (this.isCircuitOpen(config.url || "")) {
      throw new Error("Service temporarily unavailable");
    }

    // Request deduplication
    const requestKey = this.generateRequestKey(config);
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }

    const promise = this.executeRequest<T>(config);
    this.requestQueue.set(requestKey, promise);

    // Cleanup after request completes
    promise.finally(() => {
      this.requestQueue.delete(requestKey);
    });

    return promise;
  }

  private async executeRequest<T>(
    config: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error: any) {
      // Transform error to ApiError format
      const apiError: ApiError = {
        code: error.response?.data?.code || "NETWORK_ERROR",
        message:
          error.response?.data?.message ||
          error.message ||
          "An unknown error occurred",
        details: error.response?.data?.details,
        timestamp: Date.now(),
        requestId: error.config?.headers?.["X-Request-ID"] || "unknown",
        service: this.extractServiceFromUrl(error.config?.url),
      };

      throw apiError;
    }
  }

  // Circuit breaker implementation
  private isCircuitOpen(url: string): boolean {
    const service = this.extractServiceFromUrl(url);
    const circuit = this.circuitBreaker.get(service);

    if (!circuit) return false;

    if (circuit.isOpen) {
      // Check if circuit should be reset (5 minute timeout)
      if (Date.now() - circuit.lastFailure > 300000) {
        circuit.isOpen = false;
        circuit.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(url: string): void {
    const service = this.extractServiceFromUrl(url);
    const circuit = this.circuitBreaker.get(service) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };

    circuit.failures++;
    circuit.lastFailure = Date.now();

    // Open circuit after 5 failures
    if (circuit.failures >= 5) {
      circuit.isOpen = true;
    }

    this.circuitBreaker.set(service, circuit);
  }

  private resetCircuitBreaker(url: string): void {
    const service = this.extractServiceFromUrl(url);
    this.circuitBreaker.delete(service);
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;
  }

  private extractServiceFromUrl(url?: string): string {
    if (!url) return "unknown";
    const match = url.match(/\/api\/v1\/([^\/]+)/);
    return match ? match[1] : "gateway";
  }

  private async getAuthToken(): Promise<string | null> {
    // Implementation depends on auth strategy
    return localStorage.getItem("access_token");
  }

  // Error handlers
  private async handleUnauthorized(error: AxiosError): Promise<any> {
    // Try to refresh token
    try {
      const newToken = await this.refreshToken();
      if (newToken && error.config) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return this.client.request(error.config);
      }
    } catch (refreshError) {
      // Redirect to login
      window.location.href = "/login";
    }
    throw error;
  }

  private async handleRateLimit(error: AxiosError): Promise<any> {
    const retryAfter = error.response?.headers["retry-after"] || "1";
    const delay = parseInt(retryAfter) * 1000;

    await this.delay(delay);
    if (error.config) {
      return this.client.request(error.config);
    }
    throw error;
  }

  private async handleServerError(error: AxiosError): Promise<any> {
    const config = error.config as any;
    config._retryCount = config._retryCount || 0;

    if (config._retryCount < this.config.retries) {
      config._retryCount++;
      const delay =
        this.config.retryDelay * Math.pow(2, config._retryCount - 1);
      await this.delay(delay);
      return this.client.request(config);
    }

    throw error;
  }

  private handleNetworkError(error: AxiosError): Promise<never> {
    console.error("Network error:", error);
    throw error;
  }

  private handleGenericError(error: AxiosError): Promise<never> {
    console.error("API error:", error);
    throw error;
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await axios.post(
        `${this.config.baseURL}/api/v1/auth/refresh`,
        {
          refreshToken,
        },
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", newRefreshToken);

      return accessToken;
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const gatewayClient = new GatewayClient({
  baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:4110",
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  enableLogging: process.env.NODE_ENV === "development",
});
```

### 2. Service-Specific API Clients

#### Authentication Service

```typescript
// /src/services/api/auth.service.ts
import { gatewayClient } from "./gateway.client";

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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roles: string[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
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

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await gatewayClient.post<LoginResponse>(
      "/api/v1/auth/login",
      credentials,
    );

    if (response.success && response.data) {
      // Store tokens
      localStorage.setItem("access_token", response.data.accessToken);
      localStorage.setItem("refresh_token", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      return response.data;
    }

    throw new Error(response.message || "Login failed");
  }

  async logout(): Promise<void> {
    try {
      await gatewayClient.post("/api/v1/auth/logout");
    } finally {
      // Always clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  }

  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await gatewayClient.post<{ message: string }>(
      "/api/v1/auth/register",
      data,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Registration failed");
  }

  async getCurrentUser(): Promise<User> {
    const response = await gatewayClient.get<User>("/api/v1/users/me");

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get current user");
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await gatewayClient.patch<User>(
      "/api/v1/users/me",
      updates,
    );

    if (response.success && response.data) {
      // Update local storage
      localStorage.setItem("user", JSON.stringify(response.data));
      return response.data;
    }

    throw new Error(response.message || "Failed to update profile");
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const response = await gatewayClient.patch<UserPreferences>(
      "/api/v1/users/me/preferences",
      preferences,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to update preferences");
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const response = await gatewayClient.post<{ message: string }>(
      "/api/v1/auth/change-password",
      {
        currentPassword,
        newPassword,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to change password");
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await gatewayClient.post<{ message: string }>(
      "/api/v1/auth/forgot-password",
      { email },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to send reset email");
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const response = await gatewayClient.post<{ message: string }>(
      "/api/v1/auth/reset-password",
      {
        token,
        newPassword,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to reset password");
  }

  // Utility methods
  getCurrentUserFromStorage(): User | null {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem("access_token");
    return !!token && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

export const authService = new AuthService();
```

#### AI Assistant Service

```typescript
// /src/services/api/ai.service.ts
import { gatewayClient } from "./gateway.client";

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

export interface SendMessageRequest {
  content: string;
  context?: ConversationContext;
  attachments?: File[];
}

class AIService {
  async getConversations(folderId?: string): Promise<Conversation[]> {
    const params = folderId ? `?folderId=${folderId}` : "";
    const response = await gatewayClient.get<Conversation[]>(
      `/api/v1/chat/conversations${params}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get conversations");
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await gatewayClient.get<Conversation>(
      `/api/v1/chat/conversations/${conversationId}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get conversation");
  }

  async createConversation(
    title: string,
    folderId?: string,
  ): Promise<Conversation> {
    const response = await gatewayClient.post<Conversation>(
      "/api/v1/chat/conversations",
      {
        title,
        folderId,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create conversation");
  }

  async sendMessage(
    conversationId: string,
    request: SendMessageRequest,
  ): Promise<Message> {
    const formData = new FormData();
    formData.append("content", request.content);

    if (request.context) {
      formData.append("context", JSON.stringify(request.context));
    }

    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await gatewayClient.post<Message>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to send message");
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/chat/conversations/${conversationId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete conversation");
    }
  }

  // Streaming message support
  async *streamMessage(
    conversationId: string,
    request: SendMessageRequest,
  ): AsyncGenerator<string, void, unknown> {
    const baseURL =
      process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:4110";
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `${baseURL}/api/v1/chat/conversations/${conversationId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
            } else if (data.type === "done") {
              return;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Folder management
  async getFolders(): Promise<Folder[]> {
    const response = await gatewayClient.get<Folder[]>("/api/v1/chat/folders");

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get folders");
  }

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    const response = await gatewayClient.post<Folder>("/api/v1/chat/folders", {
      name,
      parentId,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create folder");
  }

  async deleteFolder(folderId: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/chat/folders/${folderId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete folder");
    }
  }

  // Search functionality
  async searchConversations(
    query: string,
    filters?: SearchFilters,
  ): Promise<SearchResult[]> {
    const response = await gatewayClient.post<SearchResult[]>(
      "/api/v1/chat/search",
      {
        query,
        filters,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to search conversations");
  }
}

export const aiService = new AIService();
```

#### Terminal Service

```typescript
// /src/services/api/terminal.service.ts
import { gatewayClient } from "./gateway.client";

export interface TerminalSession {
  id: string;
  projectId: string;
  name: string;
  type: "system" | "claude";
  status: "active" | "suspended" | "closed";
  lastActivity: string;
  createdAt: string;
  metadata?: TerminalMetadata;
}

export interface TerminalMetadata {
  dimensions: { cols: number; rows: number };
  environment: Record<string, string>;
  workingDirectory: string;
}

export interface CreateTerminalRequest {
  projectId: string;
  type: "system" | "claude";
  name?: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
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

class TerminalService {
  async createSession(
    request: CreateTerminalRequest,
  ): Promise<TerminalSession> {
    const response = await gatewayClient.post<TerminalSession>(
      "/api/v1/terminal/sessions",
      request,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create terminal session");
  }

  async getSessions(projectId?: string): Promise<TerminalSession[]> {
    const params = projectId ? `?projectId=${projectId}` : "";
    const response = await gatewayClient.get<TerminalSession[]>(
      `/api/v1/terminal/sessions${params}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get terminal sessions");
  }

  async getSession(sessionId: string): Promise<TerminalSession> {
    const response = await gatewayClient.get<TerminalSession>(
      `/api/v1/terminal/sessions/${sessionId}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get terminal session");
  }

  async closeSession(sessionId: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/terminal/sessions/${sessionId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to close terminal session");
    }
  }

  async resizeSession(
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<void> {
    const response = await gatewayClient.post(
      `/api/v1/terminal/sessions/${sessionId}/resize`,
      {
        cols,
        rows,
      },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to resize terminal session");
    }
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const response = await gatewayClient.post(
      `/api/v1/terminal/sessions/${sessionId}/input`,
      {
        input,
      },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to send input to terminal");
    }
  }

  async getCommandHistory(
    sessionId: string,
    limit?: number,
    offset?: number,
  ): Promise<TerminalCommand[]> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const response = await gatewayClient.get<TerminalCommand[]>(
      `/api/v1/terminal/sessions/${sessionId}/history?${params}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get command history");
  }

  async getSessionStats(): Promise<TerminalStats> {
    const response = await gatewayClient.get<TerminalStats>(
      "/api/v1/terminal/stats",
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get terminal stats");
  }
}

export const terminalService = new TerminalService();
```

#### Workspace Service

```typescript
// /src/services/api/workspace.service.ts
import { gatewayClient } from "./gateway.client";

export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
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
  category: string;
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
  permissions?: FilePermissions;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  templateId?: string;
  visibility?: "private" | "shared" | "public";
  initializeGit?: boolean;
}

class WorkspaceService {
  // Project management
  async getProjects(): Promise<Project[]> {
    const response = await gatewayClient.get<Project[]>(
      "/api/v1/workspace/projects",
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get projects");
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await gatewayClient.get<Project>(
      `/api/v1/workspace/projects/${projectId}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get project");
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await gatewayClient.post<Project>(
      "/api/v1/workspace/projects",
      request,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create project");
  }

  async updateProject(
    projectId: string,
    updates: Partial<Project>,
  ): Promise<Project> {
    const response = await gatewayClient.patch<Project>(
      `/api/v1/workspace/projects/${projectId}`,
      updates,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to update project");
  }

  async deleteProject(projectId: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/workspace/projects/${projectId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete project");
    }
  }

  // File system operations
  async getFiles(projectId: string, path: string = "/"): Promise<FileNode[]> {
    const response = await gatewayClient.get<FileNode[]>(
      `/api/v1/workspace/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get files");
  }

  async getFileContent(projectId: string, filePath: string): Promise<string> {
    const response = await gatewayClient.get<{ content: string }>(
      `/api/v1/workspace/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`,
    );

    if (response.success && response.data) {
      return response.data.content;
    }

    throw new Error(response.message || "Failed to get file content");
  }

  async updateFileContent(
    projectId: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    const response = await gatewayClient.put(
      `/api/v1/workspace/projects/${projectId}/files/content`,
      {
        path: filePath,
        content,
      },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to update file content");
    }
  }

  async createFile(
    projectId: string,
    filePath: string,
    content: string = "",
  ): Promise<FileNode> {
    const response = await gatewayClient.post<FileNode>(
      `/api/v1/workspace/projects/${projectId}/files`,
      {
        path: filePath,
        type: "file",
        content,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create file");
  }

  async createDirectory(projectId: string, dirPath: string): Promise<FileNode> {
    const response = await gatewayClient.post<FileNode>(
      `/api/v1/workspace/projects/${projectId}/files`,
      {
        path: dirPath,
        type: "directory",
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create directory");
  }

  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/workspace/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete file");
    }
  }

  async renameFile(
    projectId: string,
    oldPath: string,
    newPath: string,
  ): Promise<FileNode> {
    const response = await gatewayClient.patch<FileNode>(
      `/api/v1/workspace/projects/${projectId}/files/rename`,
      {
        oldPath,
        newPath,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to rename file");
  }

  // Git operations
  async getGitStatus(projectId: string): Promise<GitStatus> {
    const response = await gatewayClient.get<GitStatus>(
      `/api/v1/workspace/projects/${projectId}/git/status`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get git status");
  }

  async gitAdd(projectId: string, files: string[]): Promise<void> {
    const response = await gatewayClient.post(
      `/api/v1/workspace/projects/${projectId}/git/add`,
      {
        files,
      },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to stage files");
    }
  }

  async gitCommit(projectId: string, message: string): Promise<GitCommit> {
    const response = await gatewayClient.post<GitCommit>(
      `/api/v1/workspace/projects/${projectId}/git/commit`,
      {
        message,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to commit changes");
  }

  async getBranches(projectId: string): Promise<GitBranch[]> {
    const response = await gatewayClient.get<GitBranch[]>(
      `/api/v1/workspace/projects/${projectId}/git/branches`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get branches");
  }

  async createBranch(
    projectId: string,
    branchName: string,
    fromBranch?: string,
  ): Promise<GitBranch> {
    const response = await gatewayClient.post<GitBranch>(
      `/api/v1/workspace/projects/${projectId}/git/branches`,
      {
        name: branchName,
        from: fromBranch,
      },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create branch");
  }

  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const response = await gatewayClient.post(
      `/api/v1/workspace/projects/${projectId}/git/checkout`,
      {
        branch: branchName,
      },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to switch branch");
    }
  }

  // Project templates
  async getTemplates(): Promise<ProjectTemplate[]> {
    const response = await gatewayClient.get<ProjectTemplate[]>(
      "/api/v1/workspace/templates",
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get templates");
  }

  async getTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await gatewayClient.get<ProjectTemplate>(
      `/api/v1/workspace/templates/${templateId}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get template");
  }
}

export const workspaceService = new WorkspaceService();
```

#### Portfolio Service

```typescript
// /src/services/api/portfolio.service.ts
import { gatewayClient } from "./gateway.client";

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  baseCurrency: string;
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  performance: PerformanceMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  assetType: AssetType;
  sector?: string;
  lastUpdated: string;
}

export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  pe?: number;
  eps?: number;
  dividend?: number;
  sector?: string;
  industry?: string;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  type: "BUY" | "SELL" | "DIVIDEND";
  symbol: string;
  quantity: number;
  price: number;
  commission: number;
  total: number;
  timestamp: string;
  notes?: string;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  baseCurrency?: string;
}

export interface TradeRequest {
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price?: number; // Market order if not provided
  notes?: string;
}

class PortfolioService {
  // Portfolio CRUD
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await gatewayClient.get<Portfolio[]>("/api/v1/portfolios");

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get portfolios");
  }

  async getPortfolio(portfolioId: string): Promise<Portfolio> {
    const response = await gatewayClient.get<Portfolio>(
      `/api/v1/portfolios/${portfolioId}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get portfolio");
  }

  async createPortfolio(request: CreatePortfolioRequest): Promise<Portfolio> {
    const response = await gatewayClient.post<Portfolio>(
      "/api/v1/portfolios",
      request,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create portfolio");
  }

  async updatePortfolio(
    portfolioId: string,
    updates: Partial<CreatePortfolioRequest>,
  ): Promise<Portfolio> {
    const response = await gatewayClient.patch<Portfolio>(
      `/api/v1/portfolios/${portfolioId}`,
      updates,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to update portfolio");
  }

  async deletePortfolio(portfolioId: string): Promise<void> {
    const response = await gatewayClient.delete(
      `/api/v1/portfolios/${portfolioId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete portfolio");
    }
  }

  // Trading operations
  async executeTrade(
    portfolioId: string,
    trade: TradeRequest,
  ): Promise<Transaction> {
    const response = await gatewayClient.post<Transaction>(
      `/api/v1/portfolios/${portfolioId}/trades`,
      trade,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to execute trade");
  }

  async getTransactions(
    portfolioId: string,
    limit?: number,
    offset?: number,
  ): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const response = await gatewayClient.get<Transaction[]>(
      `/api/v1/portfolios/${portfolioId}/transactions?${params}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get transactions");
  }

  // Market data
  async getStock(symbol: string): Promise<Stock> {
    const response = await gatewayClient.get<Stock>(`/api/v1/stocks/${symbol}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get stock data");
  }

  async searchStocks(query: string): Promise<Stock[]> {
    const response = await gatewayClient.get<Stock[]>(
      `/api/v1/stocks/search?q=${encodeURIComponent(query)}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to search stocks");
  }

  async getMultipleStocks(symbols: string[]): Promise<Stock[]> {
    const response = await gatewayClient.post<Stock[]>("/api/v1/stocks/batch", {
      symbols,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get multiple stocks");
  }

  // Analytics
  async getPortfolioPerformance(
    portfolioId: string,
    period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL",
  ): Promise<PerformanceData[]> {
    const response = await gatewayClient.get<PerformanceData[]>(
      `/api/v1/portfolios/${portfolioId}/performance?period=${period}`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get portfolio performance");
  }

  async getPortfolioMetrics(portfolioId: string): Promise<PerformanceMetrics> {
    const response = await gatewayClient.get<PerformanceMetrics>(
      `/api/v1/portfolios/${portfolioId}/metrics`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get portfolio metrics");
  }

  async getPortfolioAllocation(portfolioId: string): Promise<AllocationData> {
    const response = await gatewayClient.get<AllocationData>(
      `/api/v1/portfolios/${portfolioId}/allocation`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to get portfolio allocation");
  }

  // Export and reporting
  async exportPortfolio(
    portfolioId: string,
    format: "csv" | "xlsx" | "pdf",
  ): Promise<{ downloadUrl: string }> {
    const response = await gatewayClient.post<{ downloadUrl: string }>(
      `/api/v1/portfolios/${portfolioId}/export`,
      { format },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to export portfolio");
  }

  async generateTaxReport(
    portfolioId: string,
    taxYear: number,
  ): Promise<{ downloadUrl: string }> {
    const response = await gatewayClient.post<{ downloadUrl: string }>(
      `/api/v1/portfolios/${portfolioId}/tax-report`,
      { taxYear },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to generate tax report");
  }
}

export const portfolioService = new PortfolioService();
```

---

## WebSocket Integration Architecture

### WebSocket Client Manager

```typescript
// /src/services/websocket/ws.client.ts
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id: string;
}

type EventHandler<T = any> = (message: WebSocketMessage<T>) => void;

class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private configs = new Map<string, WebSocketConfig>();
  private handlers = new Map<string, Map<string, EventHandler[]>>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private reconnectAttempts = new Map<string, number>();

  async connect(
    serviceId: string,
    config: WebSocketConfig,
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl(config.url);
      const ws = new WebSocket(wsUrl, config.protocols);

      ws.onopen = () => {
        console.log(`✅ WebSocket connected: ${serviceId}`);

        this.connections.set(serviceId, ws);
        this.configs.set(serviceId, config);
        this.reconnectAttempts.set(serviceId, 0);

        this.setupHeartbeat(serviceId);
        this.authenticateConnection(serviceId);

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
    });
  }

  disconnect(serviceId: string): void {
    const ws = this.connections.get(serviceId);
    if (ws) {
      ws.close();
      this.cleanup(serviceId);
    }
  }

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

  on<T>(serviceId: string, eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(serviceId)) {
      this.handlers.set(serviceId, new Map());
    }

    const serviceHandlers = this.handlers.get(serviceId)!;
    if (!serviceHandlers.has(eventType)) {
      serviceHandlers.set(eventType, []);
    }

    serviceHandlers.get(eventType)!.push(handler);
  }

  off<T>(serviceId: string, eventType: string, handler: EventHandler<T>): void {
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

  private buildWebSocketUrl(url: string): string {
    const token = localStorage.getItem("access_token");
    const wsUrl = new URL(url);

    if (token) {
      wsUrl.searchParams.set("token", token);
    }

    return wsUrl.toString();
  }

  private async authenticateConnection(serviceId: string): Promise<void> {
    const token = localStorage.getItem("access_token");
    if (token) {
      this.send(serviceId, "auth", { token });
    }
  }

  private handleMessage(serviceId: string, event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      const serviceHandlers = this.handlers.get(serviceId);
      if (serviceHandlers) {
        // Specific event handlers
        const eventHandlers = serviceHandlers.get(message.type);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => handler(message));
        }

        // Global handlers
        const globalHandlers = serviceHandlers.get("*");
        if (globalHandlers) {
          globalHandlers.forEach((handler) => handler(message));
        }
      }

      // Handle system messages
      if (message.type === "pong") {
        // Handle heartbeat response
        console.log(`💓 Heartbeat response from ${serviceId}`);
      }
    } catch (error) {
      console.error(`Error parsing WebSocket message for ${serviceId}:`, error);
    }
  }

  private handleDisconnection(serviceId: string, event: CloseEvent): void {
    console.log(`🔌 WebSocket disconnected: ${serviceId}`, event);

    const config = this.configs.get(serviceId);
    if (config?.reconnect && event.code !== 1000) {
      // Don't reconnect on normal closure
      this.scheduleReconnection(serviceId);
    }
  }

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

  private setupHeartbeat(serviceId: string): void {
    const config = this.configs.get(serviceId);
    const interval = config?.heartbeatInterval || 30000;

    const timer = setInterval(() => {
      this.send(serviceId, "ping", { timestamp: Date.now() });
    }, interval);

    this.heartbeatTimers.set(serviceId, timer);
  }

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

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

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
// /src/services/websocket/terminal.ws.ts
import { wsManager } from "./ws.client";

export interface TerminalWebSocketData {
  sessionId: string;
  projectId: string;
  output?: string;
  input?: string;
  status?: "active" | "disconnected" | "error";
  dimensions?: { cols: number; rows: number };
}

class TerminalWebSocketClient {
  private isConnected = false;

  async connect(): Promise<void> {
    await wsManager.connect("terminal", {
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/terminal`,
      reconnect: true,
      reconnectAttempts: 10,
      heartbeatInterval: 30000,
    });

    this.isConnected = true;
    this.setupEventHandlers();
  }

  disconnect(): void {
    wsManager.disconnect("terminal");
    this.isConnected = false;
  }

  joinSession(sessionId: string, projectId: string): void {
    if (!this.isConnected) {
      throw new Error("Terminal WebSocket not connected");
    }

    wsManager.send("terminal", "join_session", {
      sessionId,
      projectId,
    });
  }

  leaveSession(sessionId: string): void {
    if (!this.isConnected) return;

    wsManager.send("terminal", "leave_session", {
      sessionId,
    });
  }

  sendInput(sessionId: string, input: string): void {
    if (!this.isConnected) {
      throw new Error("Terminal WebSocket not connected");
    }

    wsManager.send("terminal", "input", {
      sessionId,
      input,
    });
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    if (!this.isConnected) return;

    wsManager.send("terminal", "resize", {
      sessionId,
      dimensions: { cols, rows },
    });
  }

  onOutput(handler: (sessionId: string, output: string) => void): void {
    wsManager.on("terminal", "output", (message) => {
      const data = message.data as TerminalWebSocketData;
      if (data.sessionId && data.output) {
        handler(data.sessionId, data.output);
      }
    });
  }

  onSessionStatus(handler: (sessionId: string, status: string) => void): void {
    wsManager.on("terminal", "session_status", (message) => {
      const data = message.data as TerminalWebSocketData;
      if (data.sessionId && data.status) {
        handler(data.sessionId, data.status);
      }
    });
  }

  onError(handler: (error: any) => void): void {
    wsManager.on("terminal", "error", (message) => {
      handler(message.data);
    });
  }

  private setupEventHandlers(): void {
    wsManager.on("terminal", "connected", () => {
      console.log("✅ Terminal WebSocket authenticated");
    });

    wsManager.on("terminal", "error", (message) => {
      console.error("❌ Terminal WebSocket error:", message.data);
    });
  }

  getConnectionStatus(): string {
    return wsManager.getConnectionStatus("terminal");
  }
}

export const terminalWs = new TerminalWebSocketClient();
```

```typescript
// /src/services/websocket/chat.ws.ts
import { wsManager } from "./ws.client";

export interface ChatWebSocketData {
  conversationId: string;
  messageId?: string;
  content?: string;
  chunk?: string;
  isTyping?: boolean;
  isComplete?: boolean;
  error?: string;
}

class ChatWebSocketClient {
  private isConnected = false;

  async connect(): Promise<void> {
    await wsManager.connect("chat", {
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/chat`,
      reconnect: true,
      reconnectAttempts: 5,
      heartbeatInterval: 30000,
    });

    this.isConnected = true;
    this.setupEventHandlers();
  }

  disconnect(): void {
    wsManager.disconnect("chat");
    this.isConnected = false;
  }

  joinConversation(conversationId: string): void {
    if (!this.isConnected) {
      throw new Error("Chat WebSocket not connected");
    }

    wsManager.send("chat", "join_conversation", {
      conversationId,
    });
  }

  leaveConversation(conversationId: string): void {
    if (!this.isConnected) return;

    wsManager.send("chat", "leave_conversation", {
      conversationId,
    });
  }

  sendMessage(conversationId: string, content: string, context?: any): void {
    if (!this.isConnected) {
      throw new Error("Chat WebSocket not connected");
    }

    wsManager.send("chat", "message", {
      conversationId,
      content,
      context,
    });
  }

  startTyping(conversationId: string): void {
    if (!this.isConnected) return;

    wsManager.send("chat", "typing_start", {
      conversationId,
    });
  }

  stopTyping(conversationId: string): void {
    if (!this.isConnected) return;

    wsManager.send("chat", "typing_stop", {
      conversationId,
    });
  }

  onMessageChunk(
    handler: (conversationId: string, chunk: string) => void,
  ): void {
    wsManager.on("chat", "message_chunk", (message) => {
      const data = message.data as ChatWebSocketData;
      if (data.conversationId && data.chunk) {
        handler(data.conversationId, data.chunk);
      }
    });
  }

  onMessageComplete(
    handler: (conversationId: string, messageId: string) => void,
  ): void {
    wsManager.on("chat", "message_complete", (message) => {
      const data = message.data as ChatWebSocketData;
      if (data.conversationId && data.messageId) {
        handler(data.conversationId, data.messageId);
      }
    });
  }

  onTyping(handler: (conversationId: string, isTyping: boolean) => void): void {
    wsManager.on("chat", "typing", (message) => {
      const data = message.data as ChatWebSocketData;
      if (data.conversationId && data.isTyping !== undefined) {
        handler(data.conversationId, data.isTyping);
      }
    });
  }

  onError(handler: (error: any) => void): void {
    wsManager.on("chat", "error", (message) => {
      handler(message.data);
    });
  }

  private setupEventHandlers(): void {
    wsManager.on("chat", "connected", () => {
      console.log("✅ Chat WebSocket authenticated");
    });

    wsManager.on("chat", "error", (message) => {
      console.error("❌ Chat WebSocket error:", message.data);
    });
  }

  getConnectionStatus(): string {
    return wsManager.getConnectionStatus("chat");
  }
}

export const chatWs = new ChatWebSocketClient();
```

```typescript
// /src/services/websocket/portfolio.ws.ts
import { wsManager } from "./ws.client";

export interface PortfolioWebSocketData {
  portfolioId?: string;
  symbol?: string;
  type: "price_update" | "portfolio_update" | "alert" | "trade_executed";
  data: any;
}

class PortfolioWebSocketClient {
  private isConnected = false;
  private subscribedPortfolios = new Set<string>();
  private subscribedSymbols = new Set<string>();

  async connect(): Promise<void> {
    await wsManager.connect("portfolio", {
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/portfolio`,
      reconnect: true,
      reconnectAttempts: 10,
      heartbeatInterval: 15000,
    });

    this.isConnected = true;
    this.setupEventHandlers();
  }

  disconnect(): void {
    wsManager.disconnect("portfolio");
    this.isConnected = false;
    this.subscribedPortfolios.clear();
    this.subscribedSymbols.clear();
  }

  subscribeToPortfolio(portfolioId: string): void {
    if (!this.isConnected) {
      throw new Error("Portfolio WebSocket not connected");
    }

    if (!this.subscribedPortfolios.has(portfolioId)) {
      wsManager.send("portfolio", "subscribe_portfolio", { portfolioId });
      this.subscribedPortfolios.add(portfolioId);
    }
  }

  unsubscribeFromPortfolio(portfolioId: string): void {
    if (!this.isConnected) return;

    if (this.subscribedPortfolios.has(portfolioId)) {
      wsManager.send("portfolio", "unsubscribe_portfolio", { portfolioId });
      this.subscribedPortfolios.delete(portfolioId);
    }
  }

  subscribeToSymbol(symbol: string): void {
    if (!this.isConnected) {
      throw new Error("Portfolio WebSocket not connected");
    }

    if (!this.subscribedSymbols.has(symbol)) {
      wsManager.send("portfolio", "subscribe_symbol", { symbol });
      this.subscribedSymbols.add(symbol);
    }
  }

  unsubscribeFromSymbol(symbol: string): void {
    if (!this.isConnected) return;

    if (this.subscribedSymbols.has(symbol)) {
      wsManager.send("portfolio", "unsubscribe_symbol", { symbol });
      this.subscribedSymbols.delete(symbol);
    }
  }

  subscribeToMultipleSymbols(symbols: string[]): void {
    if (!this.isConnected) {
      throw new Error("Portfolio WebSocket not connected");
    }

    const newSymbols = symbols.filter(
      (symbol) => !this.subscribedSymbols.has(symbol),
    );
    if (newSymbols.length > 0) {
      wsManager.send("portfolio", "subscribe_symbols", { symbols: newSymbols });
      newSymbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
    }
  }

  onPriceUpdate(
    handler: (symbol: string, price: number, change: number) => void,
  ): void {
    wsManager.on("portfolio", "price_update", (message) => {
      const data = message.data as PortfolioWebSocketData;
      if (data.type === "price_update" && data.symbol) {
        handler(data.symbol, data.data.price, data.data.change);
      }
    });
  }

  onPortfolioUpdate(
    handler: (portfolioId: string, updates: any) => void,
  ): void {
    wsManager.on("portfolio", "portfolio_update", (message) => {
      const data = message.data as PortfolioWebSocketData;
      if (data.type === "portfolio_update" && data.portfolioId) {
        handler(data.portfolioId, data.data);
      }
    });
  }

  onTradeExecuted(handler: (portfolioId: string, trade: any) => void): void {
    wsManager.on("portfolio", "trade_executed", (message) => {
      const data = message.data as PortfolioWebSocketData;
      if (data.type === "trade_executed" && data.portfolioId) {
        handler(data.portfolioId, data.data);
      }
    });
  }

  onAlert(handler: (alert: any) => void): void {
    wsManager.on("portfolio", "alert", (message) => {
      const data = message.data as PortfolioWebSocketData;
      if (data.type === "alert") {
        handler(data.data);
      }
    });
  }

  onError(handler: (error: any) => void): void {
    wsManager.on("portfolio", "error", (message) => {
      handler(message.data);
    });
  }

  private setupEventHandlers(): void {
    wsManager.on("portfolio", "connected", () => {
      console.log("✅ Portfolio WebSocket authenticated");

      // Re-subscribe to previously subscribed data
      this.subscribedPortfolios.forEach((portfolioId) => {
        wsManager.send("portfolio", "subscribe_portfolio", { portfolioId });
      });

      this.subscribedSymbols.forEach((symbol) => {
        wsManager.send("portfolio", "subscribe_symbol", { symbol });
      });
    });

    wsManager.on("portfolio", "error", (message) => {
      console.error("❌ Portfolio WebSocket error:", message.data);
    });
  }

  getConnectionStatus(): string {
    return wsManager.getConnectionStatus("portfolio");
  }

  getSubscribedPortfolios(): string[] {
    return Array.from(this.subscribedPortfolios);
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}

export const portfolioWs = new PortfolioWebSocketClient();
```

---

## Component-Service Mapping

### Dashboard Components → Portfolio Service

#### StatsCard Component

**File**: `/src/components/dashboard/StatsCard.tsx`  
**API Endpoints**:

- `GET /api/v1/portfolios` - List portfolios
- `GET /api/v1/portfolios/{id}/metrics` - Portfolio metrics
- **WebSocket**: `portfolio_update` for real-time updates

**Integration Pattern**:

```typescript
// Hook integration
const usePortfolioStats = (userId: string) => {
  return useQuery({
    queryKey: ["portfolios", userId, "stats"],
    queryFn: () => portfolioService.getPortfolios(),
    refetchInterval: 30000, // 30 seconds
  });
};

// WebSocket integration for real-time updates
useEffect(() => {
  portfolioWs.connect();
  portfolioWs.onPortfolioUpdate((portfolioId, updates) => {
    queryClient.setQueryData(["portfolio", portfolioId], (old: any) => ({
      ...old,
      ...updates,
    }));
  });

  return () => portfolioWs.disconnect();
}, []);
```

#### ActivityFeed Component

**File**: `/src/components/dashboard/ActivityFeed.tsx`  
**API Endpoints**:

- `GET /api/v1/portfolios/{id}/transactions` - Recent transactions
- **WebSocket**: `trade_executed`, `alert` events

#### PortfolioSummary Component

**File**: `/src/components/dashboard/PortfolioSummary.tsx`  
**API Endpoints**:

- `GET /api/v1/portfolios/{id}` - Portfolio details
- `GET /api/v1/portfolios/{id}/performance` - Performance data
- **WebSocket**: `portfolio_update` for live values

### AI Assistant Components → AI Service

#### ChatWindow Component

**File**: `/src/modules/personal-assistant/components/ChatInterfaceWithFolders.tsx`  
**API Endpoints**:

- `POST /api/v1/chat/conversations` - Create conversation
- `POST /api/v1/chat/conversations/{id}/messages` - Send message
- `GET /api/v1/chat/conversations` - List conversations
- **WebSocket**: `message_chunk`, `typing` events

**Integration Pattern**:

```typescript
// Streaming messages
const [isStreaming, setIsStreaming] = useState(false);
const [streamingContent, setStreamingContent] = useState("");

const sendMessage = useCallback(
  async (content: string) => {
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const generator = aiService.streamMessage(conversationId, { content });

      for await (const chunk of generator) {
        setStreamingContent((prev) => prev + chunk);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsStreaming(false);
    }
  },
  [conversationId],
);
```

#### FolderManagement Component

**API Endpoints**:

- `GET /api/v1/chat/folders` - List folders
- `POST /api/v1/chat/folders` - Create folder
- `DELETE /api/v1/chat/folders/{id}` - Delete folder

### Workspace Components → Terminal & Workspace Services

#### FileExplorer Component

**File**: `/src/modules/workspace/components/Sidebar/FileExplorer.tsx`  
**API Endpoints**:

- `GET /api/v1/workspace/projects/{id}/files` - List files
- `POST /api/v1/workspace/projects/{id}/files` - Create file/folder
- `DELETE /api/v1/workspace/projects/{id}/files` - Delete file
- `GET /api/v1/workspace/projects/{id}/git/status` - Git status

#### TerminalWindow Component

**File**: `/src/modules/workspace/components/Terminal/XTermViewV2.tsx`  
**API Endpoints**:

- `POST /api/v1/terminal/sessions` - Create terminal session
- `DELETE /api/v1/terminal/sessions/{id}` - Close session
- **WebSocket**: `terminal` service for real-time I/O

**Integration Pattern**:

```typescript
// Terminal WebSocket integration
useEffect(() => {
  if (sessionId) {
    terminalWs.connect();
    terminalWs.joinSession(sessionId, projectId);

    terminalWs.onOutput((sid, output) => {
      if (sid === sessionId) {
        terminal.write(output);
      }
    });

    return () => {
      terminalWs.leaveSession(sessionId);
    };
  }
}, [sessionId, projectId]);

// Send input to terminal
const handleInput = useCallback(
  (data: string) => {
    if (sessionId) {
      terminalWs.sendInput(sessionId, data);
    }
  },
  [sessionId],
);
```

#### GitStatus Component

**API Endpoints**:

- `GET /api/v1/workspace/projects/{id}/git/status` - Git status
- `POST /api/v1/workspace/projects/{id}/git/add` - Stage files
- `POST /api/v1/workspace/projects/{id}/git/commit` - Commit changes

### Portfolio Components → Portfolio Service

#### AssetCard Component

**API Endpoints**:

- `GET /api/v1/stocks/{symbol}` - Stock details
- **WebSocket**: `price_update` for real-time prices

#### TradeForm Component

**API Endpoints**:

- `POST /api/v1/portfolios/{id}/trades` - Execute trade
- `GET /api/v1/stocks/search` - Search stocks

#### PriceChart Component

**API Endpoints**:

- `GET /api/v1/stocks/{symbol}/price` - Historical prices
- **WebSocket**: `price_update` for live data

---

## Integration continues in next section...
