// Simple Service Registry for development
// In production, use Consul or similar service discovery tool

import { logger } from "../utils/logger";

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  healthUrl: string;
  isHealthy: boolean;
  lastHealthCheck?: Date;
  metadata?: Record<string, any>;
}

export class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultServices();
    this.startHealthChecks();
  }

  private initializeDefaultServices() {
    // Register default services with new port layout
    // Pattern: 41X0 = Main HTTP, 41X1 = WebSocket, 41X2 = Admin
    
    this.register({
      id: "user-management-1",
      name: "user-management",
      host: "localhost",
      port: 4120,  // Changed from 4100 to 4120
      healthUrl: "http://localhost:4120/health",
      isHealthy: true,
      metadata: {
        wsPort: 4121,
        adminPort: 4122
      }
    });

    this.register({
      id: "ai-assistant-1",
      name: "ai-assistant",
      host: "localhost",
      port: 4130,  // Changed from 4200 to 4130
      healthUrl: "http://localhost:4130/health",
      isHealthy: true,
      metadata: {
        wsPort: 4131,
        cliPort: 4132
      }
    });

    this.register({
      id: "terminal-1",
      name: "terminal",
      host: "localhost",
      port: 4140,  // Changed from 4300 to 4140
      healthUrl: "http://localhost:4140/health",
      isHealthy: true,
      metadata: {
        wsPort: 4141,
        adminPort: 4142
      }
    });

    this.register({
      id: "workspace-1",
      name: "workspace",
      host: "localhost",
      port: 4150,  // Changed from 4400 to 4150
      healthUrl: "http://localhost:4150/health",
      isHealthy: true,
      metadata: {
        wsPort: 4151,
        fileApiPort: 4152
      }
    });

    this.register({
      id: "portfolio-1",
      name: "portfolio",
      host: "localhost",
      port: 4160,  // Changed from 4500 to 4160
      healthUrl: "http://localhost:4160/health",
      isHealthy: true,
      metadata: {
        wsPort: 4161,
        tradingPort: 4162
      }
    });

    this.register({
      id: "market-data-1",
      name: "market-data",
      host: "localhost",
      port: 4170,  // Changed from 4600 to 4170
      healthUrl: "http://localhost:4170/health",
      isHealthy: true,
      metadata: {
        wsPort: 4171,
        historicalPort: 4172
      }
    });

    this.register({
      id: "testing-1",
      name: "testing",
      host: "localhost",
      port: 4180,  // Testing Service
      healthUrl: "http://localhost:4180/health",
      isHealthy: true,
      metadata: {
        description: "Automated Testing Service",
        autoApproved: true
      }
    });

    this.register({
      id: "orchestration-1",
      name: "orchestration",
      host: "localhost",
      port: 4191,  // AI Orchestration Service
      healthUrl: "http://localhost:4191/health",
      isHealthy: true,
      metadata: {
        description: "AI Agent Orchestration Service",
        wsPort: 4191,
        features: ["agent-spawning", "task-chains", "parallel-agents"]
      }
    });
  }

  register(instance: ServiceInstance): void {
    const instances = this.services.get(instance.name) || [];

    // Remove existing instance with same id
    const existingIndex = instances.findIndex((i) => i.id === instance.id);
    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }

    this.services.set(instance.name, instances);
    logger.info(
      `Registered service: ${instance.name} (${instance.id}) at ${instance.host}:${instance.port}`,
    );
  }

  deregister(instanceId: string): void {
    for (const [name, instances] of this.services.entries()) {
      const filtered = instances.filter((i) => i.id !== instanceId);
      if (filtered.length < instances.length) {
        this.services.set(name, filtered);
        logger.info(`Deregistered service instance: ${instanceId}`);
        break;
      }
    }
  }

  getHealthyInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    const healthy = instances.filter((i) => i.isHealthy);

    if (healthy.length === 0) {
      return null;
    }

    // Simple round-robin load balancing
    return healthy[Math.floor(Math.random() * healthy.length)];
  }

  getAllInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  private async checkHealth(instance: ServiceInstance): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(instance.healthUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async startHealthChecks() {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      for (const [_, instances] of this.services.entries()) {
        for (const instance of instances) {
          const wasHealthy = instance.isHealthy;
          instance.isHealthy = await this.checkHealth(instance);
          instance.lastHealthCheck = new Date();

          if (wasHealthy !== instance.isHealthy) {
            logger.info(
              `Service ${instance.name} (${instance.id}) health changed: ${wasHealthy} -> ${instance.isHealthy}`,
            );
          }
        }
      }
    }, 30000);

    // Initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks() {
    for (const [_, instances] of this.services.entries()) {
      for (const instance of instances) {
        instance.isHealthy = await this.checkHealth(instance);
        instance.lastHealthCheck = new Date();
      }
    }
  }

  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
