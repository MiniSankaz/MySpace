"use strict";
/**
 * Centralized Port Configuration System
 * Safe port migration for all services
 *
 * Usage:
 * - import { PortConfig } from 'shared/config/ports.config';
 * - const config = PortConfig.getInstance();
 * - const port = config.getServicePort('ai');
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketUrl = exports.getServiceUrl = exports.getServicePort = exports.PortConfig = void 0;
class PortConfig {
    constructor() {
        // New port assignments (migrated from old ports)
        this.defaultPorts = {
            frontend: 4100, // was 3000
            gateway: 4110, // was 4000 
            user: 4120, // was 4100
            ai: 4130, // was 4200
            terminal: 4140, // was 4300
            workspace: 4150, // was 4400
            portfolio: 4160, // was 4500
            market: 4170 // was 4600
        };
        // Old to new port mapping for migration
        this.portMigrationMap = {
            3000: 4100, // Frontend
            4000: 4110, // Gateway
            4100: 4120, // User Management (was old User port)
            4200: 4130, // AI Assistant
            4300: 4140, // Terminal
            4400: 4150, // Workspace
            4500: 4160, // Portfolio
            4600: 4170 // Market Data
        };
    }
    static getInstance() {
        if (!PortConfig.instance) {
            PortConfig.instance = new PortConfig();
        }
        return PortConfig.instance;
    }
    /**
     * Get port for a specific service
     * Supports environment variable override
     */
    getServicePort(serviceName) {
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
    getAllServicePorts() {
        const result = {};
        for (const serviceName of Object.keys(this.defaultPorts)) {
            result[serviceName] = this.getServicePort(serviceName);
        }
        return result;
    }
    /**
     * Get service URL
     */
    getServiceUrl(serviceName, protocol = 'http') {
        const port = this.getServicePort(serviceName);
        const host = process.env.SERVICE_HOST || '127.0.0.1';
        return `${protocol}://${host}:${port}`;
    }
    /**
     * Get WebSocket URL for a service
     */
    getWebSocketUrl(serviceName) {
        const port = this.getServicePort(serviceName);
        return `ws://127.0.0.1:${port}`;
    }
    /**
     * Check if a port should be migrated
     */
    shouldMigratePort(oldPort) {
        return oldPort in this.portMigrationMap;
    }
    /**
     * Get new port for migration
     */
    getNewPortForMigration(oldPort) {
        return this.portMigrationMap[oldPort] || null;
    }
    /**
     * Get migration mapping
     */
    getPortMigrationMap() {
        return { ...this.portMigrationMap };
    }
    /**
     * Validate that all services have different ports
     */
    validatePortConfiguration() {
        const ports = Object.values(this.getAllServicePorts());
        const errors = [];
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
    static resetInstance() {
        PortConfig.instance = undefined;
    }
}
exports.PortConfig = PortConfig;
// Create CommonJS compatible export for legacy code
module.exports = { PortConfig };
// Default export for ES modules
exports.default = PortConfig;
/**
 * Convenience functions for direct usage
 */
const getServicePort = (serviceName) => {
    return PortConfig.getInstance().getServicePort(serviceName);
};
exports.getServicePort = getServicePort;
const getServiceUrl = (serviceName, protocol = 'http') => {
    return PortConfig.getInstance().getServiceUrl(serviceName, protocol);
};
exports.getServiceUrl = getServiceUrl;
const getWebSocketUrl = (serviceName) => {
    return PortConfig.getInstance().getWebSocketUrl(serviceName);
};
exports.getWebSocketUrl = getWebSocketUrl;
