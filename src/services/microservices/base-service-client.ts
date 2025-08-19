import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import {
  getAuthToken,
  refreshAuthToken,
  isTokenExpired,
} from "@/lib/auth-utils";

export interface ServiceConfig {
  name: string;
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  service: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
}

export class BaseServiceClient {
  protected client: AxiosInstance;
  protected config: ServiceConfig;
  protected circuitBreaker: CircuitBreakerState;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  constructor(config: ServiceConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: "CLOSED",
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Name": this.config.name,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Check circuit breaker state
        if (this.circuitBreaker.state === "OPEN") {
          const now = Date.now();
          if (
            now - this.circuitBreaker.lastFailureTime >
            this.CIRCUIT_BREAKER_TIMEOUT
          ) {
            this.circuitBreaker.state = "HALF_OPEN";
            this.circuitBreaker.failures = 0;
          } else {
            throw new Error(
              `Service ${this.config.name} is unavailable (circuit breaker open)`,
            );
          }
        }

        // Add authentication token
        const token = await getAuthToken();
        if (token) {
          // Check if token is expired and refresh if needed
          if (isTokenExpired(token)) {
            const newToken = await refreshAuthToken();
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add request ID for tracing
        config.headers["X-Request-ID"] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Reset circuit breaker on success
        if (this.circuitBreaker.state === "HALF_OPEN") {
          this.circuitBreaker.state = "CLOSED";
        }
        this.circuitBreaker.failures = 0;
        return response;
      },
      async (error: AxiosError) => {
        // Handle circuit breaker
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailureTime = Date.now();

        if (this.circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
          this.circuitBreaker.state = "OPEN";
        }

        // Handle specific error cases
        if (error.response) {
          const { status } = error.response;

          // Token expired - try to refresh
          if (status === 401) {
            const newToken = await refreshAuthToken();
            if (newToken && error.config) {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return this.client.request(error.config);
            }
          }

          // Rate limiting - add delay
          if (status === 429) {
            const retryAfter = error.response.headers["retry-after"];
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            await this.delay(delay);
            if (error.config) {
              return this.client.request(error.config);
            }
          }
        }

        // Retry logic for network errors
        if (!error.response && error.config) {
          const config = error.config as any;
          config._retryCount = config._retryCount || 0;

          if (config._retryCount < this.config.retryAttempts!) {
            config._retryCount++;
            const delay =
              this.config.retryDelay! * Math.pow(2, config._retryCount - 1);
            await this.delay(delay);
            return this.client.request(config);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  protected async request<T = any>(
    config: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await this.client.request<T>(config);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
        service: this.config.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.extractErrorMessage(error),
        timestamp: new Date().toISOString(),
        service: this.config.name,
      };
    }
  }

  async get<T = any>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: "GET", url: path });
  }

  async post<T = any>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: "POST", url: path, data });
  }

  async put<T = any>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: "PUT", url: path, data });
  }

  async delete<T = any>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: "DELETE", url: path });
  }

  async patch<T = any>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: "PATCH", url: path, data });
  }

  // Health check method
  async healthCheck(): Promise<ServiceResponse<any>> {
    return this.get("/health");
  }

  // Get service info
  async getServiceInfo(): Promise<ServiceResponse<any>> {
    return this.get("/info");
  }

  // Circuit breaker status
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  // Reset circuit breaker
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: "CLOSED",
    };
  }

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return "An unknown error occurred";
  }

  private generateRequestId(): string {
    return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
