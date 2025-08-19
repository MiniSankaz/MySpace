/**
 * Service Registry for Microservices Discovery
 * Provides service registration, discovery, and health management
 */
import { EventEmitter } from "events";
export interface ServiceDefinition {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "ws" | "wss";
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  metadata: {
    capabilities: string[];
    dependencies: string[];
    environment: string;
    startTime?: Date;
  };
  status: "healthy" | "unhealthy" | "degraded" | "offline";
  lastHeartbeat: Date;
}
export interface ServiceHealth {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime?: number;
  checks?: Record<string, any>;
  error?: string;
  timestamp: string;
}
export declare class ServiceRegistry extends EventEmitter {
  private services;
  private consul;
  private healthCheckIntervals;
  private useConsul;
  constructor(consulConfig?: { host: string; port: number });
  /**
   * Register a new service
   */
  register(service: ServiceDefinition): Promise<void>;
  /**
   * Deregister a service
   */
  deregister(serviceId: string): Promise<void>;
  /**
   * Discover services by name
   */
  discover(serviceName: string): Promise<ServiceDefinition[]>;
  /**
   * Get a healthy instance of a service
   */
  getHealthyInstance(serviceName: string): Promise<ServiceDefinition | null>;
  /**
   * Get a specific service by ID
   */
  getService(serviceId: string): Promise<ServiceDefinition | null>;
  /**
   * Get all registered services
   */
  getAllServices(): Promise<ServiceDefinition[]>;
  /**
   * Update service health status
   */
  updateHealth(
    serviceId: string,
    status: ServiceDefinition["status"],
  ): Promise<void>;
  /**
   * Check service health
   */
  checkServiceHealth(service: ServiceDefinition): Promise<ServiceHealth>;
  /**
   * Start health checking for a service
   */
  private startHealthCheck;
  /**
   * Stop health checking for a service
   */
  private stopHealthCheck;
  /**
   * Register service with Consul
   */
  private registerWithConsul;
  /**
   * Deregister service from Consul
   */
  private deregisterFromConsul;
  /**
   * Discover services from Consul
   */
  private discoverFromConsul;
  /**
   * Convert Consul service to ServiceDefinition
   */
  private consulToServiceDefinition;
  /**
   * Convert Consul health check to ServiceDefinition
   */
  private consulHealthToServiceDefinition;
  /**
   * Map Consul check status to service status
   */
  private mapConsulStatus;
  /**
   * Sync with Consul periodically
   */
  private syncWithConsul;
  /**
   * Perform Consul synchronization
   */
  private performConsulSync;
  /**
   * Cleanup on shutdown
   */
  shutdown(): Promise<void>;
}
export declare function getServiceRegistry(consulConfig?: {
  host: string;
  port: number;
}): ServiceRegistry;
export default ServiceRegistry;
//# sourceMappingURL=service-registry.d.ts.map
