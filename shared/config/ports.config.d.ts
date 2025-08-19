/**
 * Centralized Port Configuration System
 *
 * This module provides a single source of truth for all port configurations
 * across the entire application. It supports environment variable overrides
 * and provides type-safe access to port configurations.
 *
 * @version 3.0.0
 * @since 2025-08-19
 */
export interface PortConfiguration {
    frontend: {
        main: number;
        devServer?: number;
    };
    gateway: {
        main: number;
        admin?: number;
    };
    services: {
        userManagement: number;
        aiAssistant: number;
        terminal: number;
        workspace: number;
        portfolio: number;
        marketData: number;
    };
    websocket: {
        system: number;
        claude: number;
        terminal: number;
        portfolio: number;
    };
    database: {
        postgres: number;
        prismaStudio: number;
        redis?: number;
    };
    monitoring?: {
        prometheus?: number;
        grafana?: number;
    };
}
export type ServiceName = keyof PortConfiguration['services'];
export type WebSocketType = keyof PortConfiguration['websocket'];
export type DatabaseType = keyof PortConfiguration['database'];
/**
 * Port configuration singleton class
 */
export declare class PortConfig {
    private static instance;
    private config;
    private envPrefix;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): PortConfig;
    /**
     * Load configuration with environment overrides
     */
    private loadConfiguration;
    /**
     * Get base port configuration
     */
    private getBaseConfiguration;
    /**
     * Apply environment variable overrides
     */
    private applyEnvironmentOverrides;
    /**
     * Get complete configuration
     */
    getConfig(): PortConfiguration;
    /**
     * Get frontend port
     */
    getFrontendPort(): number;
    /**
     * Get gateway port
     */
    getGatewayPort(): number;
    /**
     * Get service port by name
     */
    getServicePort(service: ServiceName): number;
    /**
     * Get WebSocket port by type
     */
    getWebSocketPort(type: WebSocketType): number;
    /**
     * Get database port by type
     */
    getDatabasePort(db: DatabaseType): number | undefined;
    /**
     * Get service URL
     */
    getServiceUrl(service: ServiceName, host?: string, protocol?: string): string;
    /**
     * Get WebSocket URL
     */
    getWebSocketUrl(type: WebSocketType, host?: string, secure?: boolean): string;
    /**
     * Get gateway API URL for a service
     */
    getGatewayServiceUrl(service: ServiceName, host?: string, protocol?: string): string;
    /**
     * Validate port configuration for conflicts
     */
    validatePorts(): {
        valid: boolean;
        conflicts: Array<{
            port: number;
            services: string[];
        }>;
    };
    private addPortToMap;
    /**
     * Generate environment variable template
     */
    generateEnvTemplate(): string;
    /**
     * Export configuration as JSON
     */
    toJSON(): string;
}
export declare const portConfig: PortConfig;
export declare const getPorts: () => PortConfiguration;
export declare const getFrontendPort: () => number;
export declare const getGatewayPort: () => number;
export declare const getServicePort: (service: ServiceName) => number;
export declare const getServiceUrl: (service: ServiceName, host?: string, protocol?: string) => string;
export declare const getWebSocketUrl: (type: WebSocketType, host?: string, secure?: boolean) => string;
export declare const getGatewayServiceUrl: (service: ServiceName, host?: string, protocol?: string) => string;
export declare const validatePorts: () => {
    valid: boolean;
    conflicts: Array<{
        port: number;
        services: string[];
    }>;
};
export type { ServiceName, WebSocketType, DatabaseType } from './ports.config';
//# sourceMappingURL=ports.config.d.ts.map