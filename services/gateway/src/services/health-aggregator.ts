import axios, { AxiosError } from "axios";
import { logger } from "../utils/logger";
import { ServiceHealth, ServiceDependencyHealth } from "../types";
import { getServiceUrl, ServiceName } from "../../../../shared/config/ports.config";

class HealthAggregator {
  private services: Record<string, string> = {
    user: process.env.USER_SERVICE_URL || getServiceUrl('userManagement'),
    ai: process.env.AI_SERVICE_URL || getServiceUrl('aiAssistant'),
    terminal: process.env.TERMINAL_SERVICE_URL || getServiceUrl('terminal'),
    workspace: process.env.WORKSPACE_SERVICE_URL || getServiceUrl('workspace'),
    portfolio: process.env.PORTFOLIO_SERVICE_URL || getServiceUrl('portfolio'),
    market: process.env.MARKET_SERVICE_URL || getServiceUrl('marketData'),
  };

  private healthCache = new Map<
    string,
    { health: ServiceHealth; timestamp: number }
  >();
  private cacheTimeout = 30000; // 30 seconds

  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const serviceUrl = this.services[serviceName as keyof typeof this.services];

    if (!serviceUrl) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // Check cache first
    const cached = this.healthCache.get(serviceName);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.health;
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(`${serviceUrl}/health`, {
        timeout: 5000, // 5 second timeout
        validateStatus: (status) => status < 500, // Accept 4xx as valid response
      });

      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        service: serviceName,
        status: response.status === 200 ? "OK" : "WARNING",
        timestamp: new Date().toISOString(),
        uptime: response.data.uptime || 0,
        memory: response.data.memory || process.memoryUsage(),
        version: response.data.version || "unknown",
        environment:
          response.data.environment || process.env.NODE_ENV || "development",
        dependencies: response.data.dependencies || [],
        metrics: {
          ...response.data.metrics,
          responseTime,
          lastChecked: new Date(),
        },
      };

      // Cache the result
      this.healthCache.set(serviceName, {
        health,
        timestamp: Date.now(),
      });

      return health;
    } catch (error: any) {
      logger.error(`Health check failed for ${serviceName}:`, {
        error: error.message,
        serviceUrl,
        code: error.code,
        status: error.response?.status,
      });

      const health: ServiceHealth = {
        service: serviceName,
        status: "ERROR",
        timestamp: new Date().toISOString(),
        uptime: 0,
        memory: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
        version: "unknown",
        environment: process.env.NODE_ENV || "development",
        dependencies: [],
        metrics: {
          responseTime: -1,
          lastChecked: new Date(),
          errorMessage: error.message,
        },
      };

      return health;
    }
  }

  async getAggregatedHealth(): Promise<{
    gateway: ServiceHealth;
    services: Record<string, ServiceHealth>;
    overall: {
      status: "OK" | "WARNING" | "ERROR";
      servicesUp: number;
      servicesTotal: number;
      timestamp: string;
    };
  }> {
    // Get gateway's own health
    const gatewayHealth: ServiceHealth = {
      service: "gateway",
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      metrics: {
        requestsPerMinute: 0, // TODO: Implement metrics collection
        averageResponseTime: 0,
        errorRate: 0,
        activeConnections: 0,
      },
    };

    // Get all service health statuses in parallel
    const serviceNames = Object.keys(this.services);
    const healthPromises = serviceNames.map(async (serviceName) => {
      try {
        const health = await this.getServiceHealth(serviceName);
        return { serviceName, health };
      } catch (error) {
        logger.error(`Failed to get health for ${serviceName}:`, error);
        return {
          serviceName,
          health: {
            service: serviceName,
            status: "ERROR" as const,
            timestamp: new Date().toISOString(),
            uptime: 0,
            memory: {
              rss: 0,
              heapTotal: 0,
              heapUsed: 0,
              external: 0,
              arrayBuffers: 0,
            },
            version: "unknown",
            environment: process.env.NODE_ENV || "development",
          },
        };
      }
    });

    const healthResults = await Promise.all(healthPromises);

    // Build services health map
    const services = healthResults.reduce(
      (acc, { serviceName, health }) => {
        acc[serviceName] = health;
        return acc;
      },
      {} as Record<string, ServiceHealth>,
    );

    // Calculate overall status
    const servicesUp = Object.values(services).filter(
      (h) => h.status === "OK",
    ).length;
    const servicesTotal = Object.keys(services).length;

    let overallStatus: "OK" | "WARNING" | "ERROR" = "OK";
    if (servicesUp === 0) {
      overallStatus = "ERROR";
    } else if (servicesUp < servicesTotal) {
      overallStatus = "WARNING";
    }

    // Update gateway status based on services
    if (overallStatus === "ERROR") {
      gatewayHealth.status = "WARNING"; // Gateway can still function with some services down
    }

    return {
      gateway: gatewayHealth,
      services,
      overall: {
        status: overallStatus,
        servicesUp,
        servicesTotal,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Clear cache for a specific service or all services
  clearCache(serviceName?: string): void {
    if (serviceName) {
      this.healthCache.delete(serviceName);
    } else {
      this.healthCache.clear();
    }
  }

  // Get cached health statuses
  getCachedHealth(): Map<string, { health: ServiceHealth; timestamp: number }> {
    return new Map(this.healthCache);
  }
}

export const healthAggregator = new HealthAggregator();
