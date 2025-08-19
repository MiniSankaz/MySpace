/**
 * Inter-Service HTTP Client with Resilience Patterns
 * Provides circuit breaker, retry logic, and service discovery integration
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  ServiceRegistry,
  ServiceDefinition,
} from "../services/service-registry";
import { CircuitBreaker } from "../resilience/circuit-breaker";
import { ExponentialBackoffRetry } from "../resilience/retry-policy";
import { logger } from "../utils/logger";

export interface InterServiceConfig {
  retry?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    factor?: number;
  };
  auth?: {
    enabled?: boolean;
    secret?: string;
  };
  circuitBreaker?: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  };
  defaultTimeout?: number;
  maxRedirects?: number;
}

export interface RequestOptions {
  service: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retries?: number;
  correlationId?: string;
}

export interface ServiceToken {
  service: string;
  issuedAt: number;
  expiresAt: number;
}

export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class InterServiceClient {
  private registry: ServiceRegistry;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private retryPolicy: ExponentialBackoffRetry;
  private axiosInstance: AxiosInstance;
  private config: Required<InterServiceConfig>;
  private tokenCache: Map<string, { token: string; expiresAt: number }>;

  constructor(
    private serviceName: string,
    config: InterServiceConfig = {},
    registry?: ServiceRegistry,
  ) {
    // Apply default configuration
    this.config = {
      retry: {
        maxAttempts: config.retry?.maxAttempts || 3,
        baseDelay: config.retry?.baseDelay || 1000,
        maxDelay: config.retry?.maxDelay || 10000,
        factor: config.retry?.factor || 2,
      },
      auth: {
        enabled: config.auth?.enabled ?? true,
        secret:
          config.auth?.secret || process.env.SERVICE_SECRET || "service-secret",
      },
      circuitBreaker: {
        failureThreshold: config.circuitBreaker?.failureThreshold || 5,
        successThreshold: config.circuitBreaker?.successThreshold || 2,
        timeout: config.circuitBreaker?.timeout || 60000,
      },
      defaultTimeout: config.defaultTimeout || 30000,
      maxRedirects: config.maxRedirects || 5,
    };

    // Initialize components
    this.registry = registry || new ServiceRegistry();
    this.circuitBreakers = new Map();
    this.retryPolicy = new ExponentialBackoffRetry(this.config.retry);
    this.tokenCache = new Map();

    // Create axios instance with defaults
    this.axiosInstance = axios.create({
      timeout: this.config.defaultTimeout,
      maxRedirects: this.config.maxRedirects,
      validateStatus: () => true, // Handle all status codes
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(
          `Inter-service request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        logger.error("Inter-service request error:", error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(
          `Inter-service response: ${response.status} from ${response.config.url}`,
        );
        return response;
      },
      (error) => {
        logger.error("Inter-service response error:", error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Make a request to another service
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    // Get healthy service instance
    const targetService = await this.getHealthyService(options.service);
    if (!targetService) {
      throw new ServiceUnavailableError(
        `No healthy instances of ${options.service} available`,
      );
    }

    // Get or create circuit breaker for this service instance
    const breaker = this.getOrCreateBreaker(targetService.id);

    // Execute request with circuit breaker
    return await breaker.execute(async () => {
      // Execute with retry policy
      return await this.retryPolicy.execute(async () => {
        const response = await this.makeRequest(targetService, options);

        // Check for server errors
        if (response.status >= 500) {
          throw new ServiceError(
            `Service error: ${response.status}`,
            response.status,
            "SERVER_ERROR",
          );
        }

        // Check for client errors that shouldn't be retried
        if (response.status >= 400 && response.status < 500) {
          // Don't retry client errors
          const error = new ServiceError(
            `Client error: ${response.status}`,
            response.status,
            "CLIENT_ERROR",
          );
          (error as any).retriable = false;
          throw error;
        }

        return response.data;
      });
    });
  }

  /**
   * Make a GET request
   */
  async get<T = any>(
    service: string,
    path: string,
    options?: Partial<RequestOptions>,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      service,
      path,
      method: "GET",
    });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    service: string,
    path: string,
    data?: any,
    options?: Partial<RequestOptions>,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      service,
      path,
      method: "POST",
      data,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    service: string,
    path: string,
    data?: any,
    options?: Partial<RequestOptions>,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      service,
      path,
      method: "PUT",
      data,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(
    service: string,
    path: string,
    options?: Partial<RequestOptions>,
  ): Promise<T> {
    return this.request<T>({
      ...options,
      service,
      path,
      method: "DELETE",
    });
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(
    service: ServiceDefinition,
    options: RequestOptions,
  ): Promise<AxiosResponse> {
    const url = this.buildUrl(service, options.path);
    const headers = await this.buildHeaders(options);

    try {
      const response = await this.axiosInstance({
        method: options.method || "GET",
        url,
        headers,
        params: options.params,
        data: options.data,
        timeout: options.timeout || this.config.defaultTimeout,
      });

      // Log request metrics
      this.logMetrics(service, options, response);

      return response;
    } catch (error) {
      // Log error metrics
      this.logErrorMetrics(service, options, error);
      throw error;
    }
  }

  /**
   * Build the request URL
   */
  private buildUrl(service: ServiceDefinition, path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${service.protocol}://${service.host}:${service.port}${normalizedPath}`;
  }

  /**
   * Build request headers
   */
  private async buildHeaders(
    options: RequestOptions,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Service-Name": this.serviceName,
      "X-Correlation-Id": options.correlationId || uuidv4(),
      "X-Request-Id": uuidv4(),
      "X-Timestamp": new Date().toISOString(),
      ...options.headers,
    };

    // Add service-to-service authentication token
    if (this.config.auth.enabled) {
      headers["X-Service-Token"] = await this.generateServiceToken();
    }

    // Forward user context if available
    if (options.headers?.["x-user-id"]) {
      headers["X-User-Id"] = options.headers["x-user-id"];
    }
    if (options.headers?.["x-user-roles"]) {
      headers["X-User-Roles"] = options.headers["x-user-roles"];
    }
    if (options.headers?.["x-session-id"]) {
      headers["X-Session-Id"] = options.headers["x-session-id"];
    }

    return headers;
  }

  /**
   * Generate service-to-service authentication token
   */
  private async generateServiceToken(): Promise<string> {
    const cacheKey = `${this.serviceName}-token`;
    const cached = this.tokenCache.get(cacheKey);

    // Return cached token if still valid
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // Generate new token
    const payload: ServiceToken = {
      service: this.serviceName,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60000, // 1 minute expiry
    };

    const secret = this.config.auth.secret;
    if (!secret) {
      throw new Error(
        "AUTH_SECRET is not configured for inter-service authentication",
      );
    }

    const token = jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn: "1m",
    });

    // Cache the token
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: payload.expiresAt,
    });

    return token;
  }

  /**
   * Get a healthy service instance
   */
  private async getHealthyService(
    serviceName: string,
  ): Promise<ServiceDefinition | null> {
    try {
      return await this.registry.getHealthyInstance(serviceName);
    } catch (error) {
      logger.error(`Failed to get healthy instance of ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Get or create circuit breaker for a service
   */
  private getOrCreateBreaker(serviceId: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(serviceId);

    if (!breaker) {
      breaker = new CircuitBreaker({
        name: serviceId,
        ...this.config.circuitBreaker,
      });
      this.circuitBreakers.set(serviceId, breaker);
    }

    return breaker;
  }

  /**
   * Log request metrics
   */
  private logMetrics(
    service: ServiceDefinition,
    options: RequestOptions,
    response: AxiosResponse,
  ): void {
    const metrics = {
      service: service.name,
      method: options.method,
      path: options.path,
      status: response.status,
      responseTime: response.headers["x-response-time"],
      correlationId: options.correlationId,
    };

    logger.info("Inter-service request completed", metrics);
  }

  /**
   * Log error metrics
   */
  private logErrorMetrics(
    service: ServiceDefinition,
    options: RequestOptions,
    error: any,
  ): void {
    const metrics = {
      service: service.name,
      method: options.method,
      path: options.path,
      error: error.message,
      code: error.code,
      correlationId: options.correlationId,
    };

    logger.error("Inter-service request failed", metrics);
  }

  /**
   * Health check for the client
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    circuitBreakers: Record<string, string>;
  }> {
    const breakerStates: Record<string, string> = {};

    this.circuitBreakers.forEach((breaker, serviceId) => {
      breakerStates[serviceId] = breaker.getState();
    });

    return {
      healthy: true,
      circuitBreakers: breakerStates,
    };
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Clear token cache
    this.tokenCache.clear();

    // Reset circuit breakers
    this.circuitBreakers.forEach((breaker) => {
      breaker.reset();
    });
    this.circuitBreakers.clear();

    logger.info(`Inter-service client for ${this.serviceName} shut down`);
  }
}

// Factory function for creating clients
export function createInterServiceClient(
  serviceName: string,
  config?: InterServiceConfig,
  registry?: ServiceRegistry,
): InterServiceClient {
  return new InterServiceClient(serviceName, config, registry);
}

export default InterServiceClient;
