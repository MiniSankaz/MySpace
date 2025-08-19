"use strict";
/**
 * Service Registry for Microservices Discovery
 * Provides service registration, discovery, and health management
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = void 0;
exports.getServiceRegistry = getServiceRegistry;
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
const logger_1 = require("../utils/logger");
class ServiceRegistry extends events_1.EventEmitter {
  services;
  consul = null;
  healthCheckIntervals;
  useConsul;
  constructor(consulConfig) {
    super();
    this.services = new Map();
    this.healthCheckIntervals = new Map();
    this.useConsul = !!consulConfig;
    if (consulConfig) {
      this.consul = axios_1.default.create({
        baseURL: `http://${consulConfig.host}:${consulConfig.port}/v1`,
        timeout: 5000,
      });
      this.syncWithConsul();
    }
  }
  /**
   * Register a new service
   */
  async register(service) {
    try {
      // Store locally
      this.services.set(service.id, service);
      // Register with Consul if available
      if (this.consul) {
        await this.registerWithConsul(service);
      }
      // Start health checking
      this.startHealthCheck(service);
      // Emit registration event
      this.emit("service:registered", service);
      logger_1.logger.info(
        `Service registered: ${service.name} (${service.id})`,
      );
    } catch (error) {
      logger_1.logger.error(
        `Failed to register service ${service.name}:`,
        error,
      );
      throw error;
    }
  }
  /**
   * Deregister a service
   */
  async deregister(serviceId) {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }
      // Stop health checks
      this.stopHealthCheck(serviceId);
      // Remove from local registry
      this.services.delete(serviceId);
      // Deregister from Consul
      if (this.consul) {
        await this.deregisterFromConsul(serviceId);
      }
      // Emit deregistration event
      this.emit("service:deregistered", service);
      logger_1.logger.info(
        `Service deregistered: ${service.name} (${serviceId})`,
      );
    } catch (error) {
      logger_1.logger.error(
        `Failed to deregister service ${serviceId}:`,
        error,
      );
      throw error;
    }
  }
  /**
   * Discover services by name
   */
  async discover(serviceName) {
    // Try Consul first
    if (this.consul) {
      try {
        const consulServices = await this.discoverFromConsul(serviceName);
        if (consulServices.length > 0) {
          return consulServices;
        }
      } catch (error) {
        logger_1.logger.warn(
          `Consul discovery failed for ${serviceName}, falling back to local:`,
          error,
        );
      }
    }
    // Fall back to local registry
    const services = [];
    for (const service of this.services.values()) {
      if (service.name === serviceName && service.status !== "offline") {
        services.push(service);
      }
    }
    return services;
  }
  /**
   * Get a healthy instance of a service
   */
  async getHealthyInstance(serviceName) {
    const services = await this.discover(serviceName);
    // Prefer healthy services
    const healthyServices = services.filter((s) => s.status === "healthy");
    if (healthyServices.length > 0) {
      // Round-robin selection
      return healthyServices[
        Math.floor(Math.random() * healthyServices.length)
      ];
    }
    // Fall back to degraded services
    const degradedServices = services.filter((s) => s.status === "degraded");
    if (degradedServices.length > 0) {
      return degradedServices[
        Math.floor(Math.random() * degradedServices.length)
      ];
    }
    return null;
  }
  /**
   * Get a specific service by ID
   */
  async getService(serviceId) {
    // Check local registry first
    const localService = this.services.get(serviceId);
    if (localService) {
      return localService;
    }
    // Try Consul
    if (this.consul) {
      try {
        const response = await this.consul.get(`/agent/service/${serviceId}`);
        return this.consulToServiceDefinition(response.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          logger_1.logger.error(
            `Failed to get service ${serviceId} from Consul:`,
            error,
          );
        }
      }
    }
    return null;
  }
  /**
   * Get all registered services
   */
  async getAllServices() {
    const allServices = new Map();
    // Add local services
    for (const [id, service] of this.services) {
      allServices.set(id, service);
    }
    // Add Consul services
    if (this.consul) {
      try {
        const response = await this.consul.get("/agent/services");
        for (const [id, consulService] of Object.entries(response.data)) {
          if (!allServices.has(id)) {
            const service = this.consulToServiceDefinition(consulService);
            if (service) {
              allServices.set(id, service);
            }
          }
        }
      } catch (error) {
        logger_1.logger.error("Failed to get services from Consul:", error);
      }
    }
    return Array.from(allServices.values());
  }
  /**
   * Update service health status
   */
  async updateHealth(serviceId, status) {
    const service = this.services.get(serviceId);
    if (service) {
      service.status = status;
      service.lastHeartbeat = new Date();
      this.emit("service:health-updated", service);
    }
    // Update Consul health check
    if (this.consul) {
      try {
        const consulStatus =
          status === "healthy"
            ? "passing"
            : status === "degraded"
              ? "warning"
              : "critical";
        await this.consul.put(`/agent/check/update/service:${serviceId}`, {
          Status: consulStatus,
          Output: `Service is ${status}`,
        });
      } catch (error) {
        logger_1.logger.error(
          `Failed to update Consul health for ${serviceId}:`,
          error,
        );
      }
    }
  }
  /**
   * Check service health
   */
  async checkServiceHealth(service) {
    const startTime = Date.now();
    try {
      const url = `${service.protocol}://${service.host}:${service.port}${service.healthCheck.endpoint}`;
      const response = await axios_1.default.get(url, {
        timeout: service.healthCheck.timeout,
        validateStatus: () => true,
      });
      const responseTime = Date.now() - startTime;
      const status = response.status === 200 ? "healthy" : "degraded";
      // Update service status
      await this.updateHealth(service.id, status);
      return {
        service: service.name,
        status,
        responseTime,
        checks: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Update service status
      await this.updateHealth(service.id, "unhealthy");
      return {
        service: service.name,
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
  /**
   * Start health checking for a service
   */
  startHealthCheck(service) {
    // Clear existing interval if any
    this.stopHealthCheck(service.id);
    // Set up new health check interval
    const interval = setInterval(async () => {
      await this.checkServiceHealth(service);
    }, service.healthCheck.interval);
    this.healthCheckIntervals.set(service.id, interval);
  }
  /**
   * Stop health checking for a service
   */
  stopHealthCheck(serviceId) {
    const interval = this.healthCheckIntervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceId);
    }
  }
  /**
   * Register service with Consul
   */
  async registerWithConsul(service) {
    if (!this.consul) return;
    const consulService = {
      ID: service.id,
      Name: service.name,
      Tags: [
        `version:${service.version}`,
        `env:${service.metadata.environment}`,
        ...service.metadata.capabilities.map((c) => `capability:${c}`),
      ],
      Address: service.host,
      Port: service.port,
      Check: {
        HTTP: `${service.protocol}://${service.host}:${service.port}${service.healthCheck.endpoint}`,
        Interval: `${service.healthCheck.interval}ms`,
        Timeout: `${service.healthCheck.timeout}ms`,
        DeregisterCriticalServiceAfter: "60s",
      },
      Meta: {
        version: service.version,
        protocol: service.protocol,
        environment: service.metadata.environment,
        dependencies: service.metadata.dependencies.join(","),
        capabilities: service.metadata.capabilities.join(","),
      },
    };
    await this.consul.put("/agent/service/register", consulService);
  }
  /**
   * Deregister service from Consul
   */
  async deregisterFromConsul(serviceId) {
    if (!this.consul) return;
    await this.consul.put(`/agent/service/deregister/${serviceId}`);
  }
  /**
   * Discover services from Consul
   */
  async discoverFromConsul(serviceName) {
    if (!this.consul) return [];
    try {
      const response = await this.consul.get(
        `/health/service/${serviceName}?passing=true`,
      );
      const services = [];
      for (const entry of response.data) {
        const service = this.consulHealthToServiceDefinition(entry);
        if (service) {
          services.push(service);
        }
      }
      return services;
    } catch (error) {
      logger_1.logger.error(
        `Failed to discover ${serviceName} from Consul:`,
        error,
      );
      return [];
    }
  }
  /**
   * Convert Consul service to ServiceDefinition
   */
  consulToServiceDefinition(consulService) {
    try {
      const meta = consulService.Meta || {};
      return {
        id: consulService.ID,
        name: consulService.Service,
        version: meta.version || "1.0.0",
        host: consulService.Address,
        port: consulService.Port,
        protocol: meta.protocol || "http",
        healthCheck: {
          endpoint: "/health",
          interval: 10000,
          timeout: 5000,
          retries: 3,
        },
        metadata: {
          capabilities: meta.capabilities ? meta.capabilities.split(",") : [],
          dependencies: meta.dependencies ? meta.dependencies.split(",") : [],
          environment: meta.environment || "production",
        },
        status: "healthy",
        lastHeartbeat: new Date(),
      };
    } catch (error) {
      logger_1.logger.error("Failed to convert Consul service:", error);
      return null;
    }
  }
  /**
   * Convert Consul health check to ServiceDefinition
   */
  consulHealthToServiceDefinition(health) {
    try {
      const service = health.Service;
      const meta = service.Meta || {};
      return {
        id: service.ID,
        name: service.Service,
        version: meta.version || "1.0.0",
        host: service.Address,
        port: service.Port,
        protocol: meta.protocol || "http",
        healthCheck: {
          endpoint: "/health",
          interval: 10000,
          timeout: 5000,
          retries: 3,
        },
        metadata: {
          capabilities: meta.capabilities ? meta.capabilities.split(",") : [],
          dependencies: meta.dependencies ? meta.dependencies.split(",") : [],
          environment: meta.environment || "production",
        },
        status: this.mapConsulStatus(health.Checks),
        lastHeartbeat: new Date(),
      };
    } catch (error) {
      logger_1.logger.error("Failed to convert Consul health:", error);
      return null;
    }
  }
  /**
   * Map Consul check status to service status
   */
  mapConsulStatus(checks) {
    if (!checks || checks.length === 0) return "unhealthy";
    const hasFailure = checks.some((c) => c.Status === "critical");
    if (hasFailure) return "unhealthy";
    const hasWarning = checks.some((c) => c.Status === "warning");
    if (hasWarning) return "degraded";
    return "healthy";
  }
  /**
   * Sync with Consul periodically
   */
  syncWithConsul() {
    if (!this.consul) return;
    // Initial sync
    this.performConsulSync();
    // Periodic sync every 30 seconds
    setInterval(() => {
      this.performConsulSync();
    }, 30000);
  }
  /**
   * Perform Consul synchronization
   */
  async performConsulSync() {
    try {
      const services = await this.getAllServices();
      for (const service of services) {
        // Update local registry
        if (!this.services.has(service.id)) {
          this.services.set(service.id, service);
          this.emit("service:discovered", service);
        }
      }
      // Clean up offline services
      for (const [id, service] of this.services) {
        const now = Date.now();
        const lastHeartbeat = service.lastHeartbeat.getTime();
        if (now - lastHeartbeat > 60000) {
          service.status = "offline";
          this.emit("service:offline", service);
        }
      }
    } catch (error) {
      logger_1.logger.error("Consul sync failed:", error);
    }
  }
  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    // Stop all health checks
    for (const serviceId of this.healthCheckIntervals.keys()) {
      this.stopHealthCheck(serviceId);
    }
    // Deregister all services
    for (const serviceId of this.services.keys()) {
      await this.deregister(serviceId);
    }
    this.removeAllListeners();
  }
}
exports.ServiceRegistry = ServiceRegistry;
// Export singleton instance
let registryInstance = null;
function getServiceRegistry(consulConfig) {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry(consulConfig);
  }
  return registryInstance;
}
exports.default = ServiceRegistry;
//# sourceMappingURL=service-registry.js.map
