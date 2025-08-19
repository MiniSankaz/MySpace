/**
 * Centralized Port Configuration System
 * Safe port migration for all services
 * 
 * Usage:
 * - import { PortConfig } from 'shared/config/ports.config';
 * - const config = PortConfig.getInstance();
 * - const port = config.getServicePort('ai');
 */

export interface ServicePortMapping {
  frontend: number;
  gateway: number;
  user: number;
  ai: number;
  terminal: number;
  workspace: number;
  portfolio: number;
  market: number;
}

export type ServiceName = keyof ServicePortMapping;

export class PortConfig {
  private static instance: PortConfig;
  
  // New port assignments (migrated from old ports)
  private readonly defaultPorts: ServicePortMapping = {
    frontend: 4100,  // was 3000
    gateway: 4110,   // was 4000 
    user: 4120,      // was 4100
    ai: 4130,        // was 4200
    terminal: 4140,  // was 4300
    workspace: 4150, // was 4400
    portfolio: 4160, // was 4500
    market: 4170     // was 4600
  };

  // Old to new port mapping for migration
  private readonly portMigrationMap: Record<number, number> = {
    3000: 4100, // Frontend
    4000: 4110, // Gateway
    4100: 4120, // User Management (was old User port)
    4200: 4130, // AI Assistant
    4300: 4140, // Terminal
    4400: 4150, // Workspace
    4500: 4160, // Portfolio
    4600: 4170  // Market Data
  };

  private constructor() {}

  public static getInstance(): PortConfig {
    if (!PortConfig.instance) {
      PortConfig.instance = new PortConfig();
    }
    return PortConfig.instance;
  }

  /**
   * Get port for a specific service
   * Supports environment variable override
   */
  public getServicePort(serviceName: ServiceName): number {
    const envVar = `PORT_SERVICE_${serviceName.toUpperCase()}`;
    const envPort = process.env[envVar];
    
    if (envPort) {
      const port = parseInt(envPort, 10);
      if (!isNaN(port) && port > 0) {
        return port;
      }
    }
    
    if (!(serviceName in this.defaultPorts)) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    return this.defaultPorts[serviceName];
  }

  /**
   * Get all service ports
   */
  public getAllServicePorts(): ServicePortMapping {
    const result = {} as ServicePortMapping;
    for (const serviceName of Object.keys(this.defaultPorts) as ServiceName[]) {
      result[serviceName] = this.getServicePort(serviceName);
    }
    return result;
  }

  /**
   * Get service URL
   */
  public getServiceUrl(serviceName: ServiceName, protocol: 'http' | 'https' = 'http'): string {
    const port = this.getServicePort(serviceName);
    return `${protocol}://127.0.0.1:${port}`;
  }

  /**
   * Get WebSocket URL for a service
   */
  public getWebSocketUrl(serviceName: ServiceName): string {
    const port = this.getServicePort(serviceName);
    return `ws://127.0.0.1:${port}`;
  }

  /**
   * Check if a port should be migrated
   */
  public shouldMigratePort(oldPort: number): boolean {
    return oldPort in this.portMigrationMap;
  }

  /**
   * Get new port for migration
   */
  public getNewPortForMigration(oldPort: number): number | null {
    return this.portMigrationMap[oldPort] || null;
  }

  /**
   * Get migration mapping
   */
  public getPortMigrationMap(): Record<number, number> {
    return { ...this.portMigrationMap };
  }

  /**
   * Validate that all services have different ports
   */
  public validatePortConfiguration(): { valid: boolean; errors: string[] } {
    const ports = Object.values(this.getAllServicePorts());
    const errors: string[] = [];
    
    // Check for duplicates
    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.push('Duplicate ports detected in configuration');
    }
    
    // Check port ranges (4100-4170 is our range)
    for (const port of ports) {
      if (port < 4100 || port > 4170) {
        errors.push(`Port ${port} is outside allowed range (4100-4170)`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    PortConfig.instance = undefined as any;
  }
}

// Create CommonJS compatible export for legacy code
module.exports = { PortConfig };

// Default export for ES modules
export default PortConfig;

/**
 * Convenience functions for direct usage
 */
export const getServicePort = (serviceName: ServiceName): number => {
  return PortConfig.getInstance().getServicePort(serviceName);
};

export const getServiceUrl = (serviceName: ServiceName, protocol: 'http' | 'https' = 'http'): string => {
  return PortConfig.getInstance().getServiceUrl(serviceName, protocol);
};

export const getWebSocketUrl = (serviceName: ServiceName): string => {
  return PortConfig.getInstance().getWebSocketUrl(serviceName);
};