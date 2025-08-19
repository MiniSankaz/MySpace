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
export declare class PortConfig {
    private static instance;
    private readonly defaultPorts;
    private readonly portMigrationMap;
    private constructor();
    static getInstance(): PortConfig;
    /**
     * Get port for a specific service
     * Supports environment variable override
     */
    getServicePort(serviceName: ServiceName): number;
    /**
     * Get all service ports
     */
    getAllServicePorts(): ServicePortMapping;
    /**
     * Get service URL
     */
    getServiceUrl(serviceName: ServiceName, protocol?: 'http' | 'https'): string;
    /**
     * Get WebSocket URL for a service
     */
    getWebSocketUrl(serviceName: ServiceName): string;
    /**
     * Check if a port should be migrated
     */
    shouldMigratePort(oldPort: number): boolean;
    /**
     * Get new port for migration
     */
    getNewPortForMigration(oldPort: number): number | null;
    /**
     * Get migration mapping
     */
    getPortMigrationMap(): Record<number, number>;
    /**
     * Validate that all services have different ports
     */
    validatePortConfiguration(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance(): void;
}
export default PortConfig;
/**
 * Convenience functions for direct usage
 */
export declare const getServicePort: (serviceName: ServiceName) => number;
export declare const getServiceUrl: (serviceName: ServiceName, protocol?: "http" | "https") => string;
export declare const getWebSocketUrl: (serviceName: ServiceName) => string;
//# sourceMappingURL=ports.config.d.ts.map