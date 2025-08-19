/**
 * API Gateway Client
 * Central client for all API communications through the gateway
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  correlationId?: string;
  service?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export class ApiGatewayClient {
  private client: AxiosInstance;
  private static instance: ApiGatewayClient;
  private correlationId: string | null = null;

  private constructor(config?: ApiClientConfig) {
    const defaultConfig: AxiosRequestConfig = {
      baseURL:
        process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
        "http://localhost:4000/api/v1",
      timeout: 30000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    };

    this.client = axios.create({ ...defaultConfig, ...config });
    this.setupInterceptors();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: ApiClientConfig): ApiGatewayClient {
    if (!ApiGatewayClient.instance) {
      ApiGatewayClient.instance = new ApiGatewayClient(config);
    }
    return ApiGatewayClient.instance;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add correlation ID
        if (!this.correlationId) {
          this.correlationId = this.generateCorrelationId();
        }
        config.headers["X-Correlation-ID"] = this.correlationId;

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
            {
              correlationId: this.correlationId,
              data: config.data,
            },
          );
        }

        return config;
      },
      (error) => {
        console.error("[API Request Error]", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        if (process.env.NODE_ENV === "development") {
          console.log(`[API Response] ${response.config.url}`, {
            correlationId: response.headers["x-correlation-id"],
            data: response.data,
          });
        }

        // Reset correlation ID after successful response
        this.correlationId = null;

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized - Token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            const token = this.getAuthToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Redirect to login if refresh fails
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  /**
   * Set auth token
   */
  public setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  /**
   * Clear auth token
   */
  public clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
    }
  }

  /**
   * Refresh auth token
   */
  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await this.post<{ token: string; refreshToken: string }>(
      "/auth/refresh",
      { refreshToken },
    );

    if (response.data) {
      this.setAuthToken(response.data.token);
      localStorage.setItem("refresh_token", response.data.refreshToken);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(): void {
    this.clearAuthToken();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href =
        "/login?redirect=" + encodeURIComponent(window.location.pathname);
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError): void {
    const response = error.response;
    const request = error.request;

    if (response) {
      // Server responded with error
      console.error("[API Error]", {
        status: response.status,
        data: response.data,
        url: error.config?.url,
        correlationId: response.headers["x-correlation-id"],
      });

      // Show user-friendly error message
      this.showErrorNotification(response.status, response.data);
    } else if (request) {
      // Request was made but no response
      console.error("[API Network Error]", {
        message: "No response from server",
        url: error.config?.url,
      });
      this.showErrorNotification(0, {
        error: "Network error. Please check your connection.",
      });
    } else {
      // Something else happened
      console.error("[API Unknown Error]", error.message);
      this.showErrorNotification(0, { error: "An unexpected error occurred." });
    }
  }

  /**
   * Show error notification (integrate with your toast system)
   */
  private showErrorNotification(status: number, data: any): void {
    let message = "An error occurred";

    if (data?.error) {
      message = data.error;
    } else if (data?.message) {
      message = data.message;
    }

    // Emit event for toast notification
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: { status, message },
        }),
      );
    }
  }

  /**
   * HTTP Methods
   */

  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Upload file
   */
  public async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    };

    return this.post<T>(url, formData, config);
  }

  /**
   * Download file
   */
  public async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Get axios instance for advanced use cases
   */
  public getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export default ApiGatewayClient.getInstance();
