"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePorts = exports.getGatewayServiceUrl = exports.getWebSocketUrl = exports.getServiceUrl = exports.getServicePort = exports.getGatewayPort = exports.getFrontendPort = exports.getPorts = exports.portConfig = exports.PortConfig = void 0;
/**
 * Port configuration singleton class
 */
class PortConfig {
    static instance;
    config;
    envPrefix = 'PORT_';
    constructor() {
        this.config = this.loadConfiguration();
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!PortConfig.instance) {
            PortConfig.instance = new PortConfig();
        }
        return PortConfig.instance;
    }
    /**
     * Load configuration with environment overrides
     */
    loadConfiguration() {
        const baseConfig = this.getBaseConfiguration();
        return this.applyEnvironmentOverrides(baseConfig);
    }
    /**
     * Get base port configuration
     */
    getBaseConfiguration() {
        return {
            frontend: {
                main: 4100,
                devServer: undefined
            },
            gateway: {
                main: 4110,
                admin: undefined
            },
            services: {
                userManagement: 4120,
                aiAssistant: 4130,
                terminal: 4140,
                workspace: 4150,
                portfolio: 4160,
                marketData: 4170
            },
            websocket: {
                system: 8001,
                claude: 8002,
                terminal: 8003,
                portfolio: 8004
            },
            database: {
                postgres: 25060,
                prismaStudio: 5555,
                redis: 6379
            },
            monitoring: {
                prometheus: 9090,
                grafana: 3001
            }
        };
    }
    /**
     * Apply environment variable overrides
     */
    applyEnvironmentOverrides(config) {
        // Frontend ports
        if (process.env.PORT_FRONTEND_MAIN) {
            config.frontend.main = parseInt(process.env.PORT_FRONTEND_MAIN, 10);
        }
        if (process.env.PORT_FRONTEND_DEV) {
            config.frontend.devServer = parseInt(process.env.PORT_FRONTEND_DEV, 10);
        }
        // Gateway ports
        if (process.env.PORT_GATEWAY_MAIN) {
            config.gateway.main = parseInt(process.env.PORT_GATEWAY_MAIN, 10);
        }
        if (process.env.PORT_GATEWAY_ADMIN) {
            config.gateway.admin = parseInt(process.env.PORT_GATEWAY_ADMIN, 10);
        }
        // Service ports
        if (process.env.PORT_SERVICE_USER) {
            config.services.userManagement = parseInt(process.env.PORT_SERVICE_USER, 10);
        }
        if (process.env.PORT_SERVICE_AI) {
            config.services.aiAssistant = parseInt(process.env.PORT_SERVICE_AI, 10);
        }
        if (process.env.PORT_SERVICE_TERMINAL) {
            config.services.terminal = parseInt(process.env.PORT_SERVICE_TERMINAL, 10);
        }
        if (process.env.PORT_SERVICE_WORKSPACE) {
            config.services.workspace = parseInt(process.env.PORT_SERVICE_WORKSPACE, 10);
        }
        if (process.env.PORT_SERVICE_PORTFOLIO) {
            config.services.portfolio = parseInt(process.env.PORT_SERVICE_PORTFOLIO, 10);
        }
        if (process.env.PORT_SERVICE_MARKET) {
            config.services.marketData = parseInt(process.env.PORT_SERVICE_MARKET, 10);
        }
        // WebSocket ports
        if (process.env.PORT_WS_SYSTEM) {
            config.websocket.system = parseInt(process.env.PORT_WS_SYSTEM, 10);
        }
        if (process.env.PORT_WS_CLAUDE) {
            config.websocket.claude = parseInt(process.env.PORT_WS_CLAUDE, 10);
        }
        if (process.env.PORT_WS_TERMINAL) {
            config.websocket.terminal = parseInt(process.env.PORT_WS_TERMINAL, 10);
        }
        if (process.env.PORT_WS_PORTFOLIO) {
            config.websocket.portfolio = parseInt(process.env.PORT_WS_PORTFOLIO, 10);
        }
        // Database ports
        if (process.env.PORT_DB_POSTGRES) {
            config.database.postgres = parseInt(process.env.PORT_DB_POSTGRES, 10);
        }
        if (process.env.PORT_DB_PRISMA_STUDIO) {
            config.database.prismaStudio = parseInt(process.env.PORT_DB_PRISMA_STUDIO, 10);
        }
        if (process.env.PORT_DB_REDIS) {
            config.database.redis = parseInt(process.env.PORT_DB_REDIS, 10);
        }
        // Monitoring ports
        if (config.monitoring) {
            if (process.env.PORT_MONITORING_PROMETHEUS) {
                config.monitoring.prometheus = parseInt(process.env.PORT_MONITORING_PROMETHEUS, 10);
            }
            if (process.env.PORT_MONITORING_GRAFANA) {
                config.monitoring.grafana = parseInt(process.env.PORT_MONITORING_GRAFANA, 10);
            }
        }
        return config;
    }
    /**
     * Get complete configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get frontend port
     */
    getFrontendPort() {
        return this.config.frontend.main;
    }
    /**
     * Get gateway port
     */
    getGatewayPort() {
        return this.config.gateway.main;
    }
    /**
     * Get service port by name
     */
    getServicePort(service) {
        return this.config.services[service];
    }
    /**
     * Get WebSocket port by type
     */
    getWebSocketPort(type) {
        return this.config.websocket[type];
    }
    /**
     * Get database port by type
     */
    getDatabasePort(db) {
        return this.config.database[db];
    }
    /**
     * Get service URL
     */
    getServiceUrl(service, host = 'localhost', protocol = 'http') {
        return `${protocol}://${host}:${this.config.services[service]}`;
    }
    /**
     * Get WebSocket URL
     */
    getWebSocketUrl(type, host = 'localhost', secure = false) {
        const protocol = secure ? 'wss' : 'ws';
        return `${protocol}://${host}:${this.config.websocket[type]}`;
    }
    /**
     * Get gateway API URL for a service
     */
    getGatewayServiceUrl(service, host = 'localhost', protocol = 'http') {
        const gatewayPort = this.config.gateway.main;
        const serviceMap = {
            userManagement: '/api/v1/users',
            aiAssistant: '/api/v1/chat',
            terminal: '/api/v1/terminal',
            workspace: '/api/v1/workspace',
            portfolio: '/api/v1/portfolios',
            marketData: '/api/v1/market'
        };
        return `${protocol}://${host}:${gatewayPort}${serviceMap[service]}`;
    }
    /**
     * Validate port configuration for conflicts
     */
    validatePorts() {
        const portMap = new Map();
        const conflicts = [];
        // Check frontend
        this.addPortToMap(portMap, this.config.frontend.main, 'frontend');
        if (this.config.frontend.devServer) {
            this.addPortToMap(portMap, this.config.frontend.devServer, 'frontend-dev');
        }
        // Check gateway
        this.addPortToMap(portMap, this.config.gateway.main, 'gateway');
        if (this.config.gateway.admin) {
            this.addPortToMap(portMap, this.config.gateway.admin, 'gateway-admin');
        }
        // Check services
        Object.entries(this.config.services).forEach(([name, port]) => {
            this.addPortToMap(portMap, port, `service-${name}`);
        });
        // Check WebSocket
        Object.entries(this.config.websocket).forEach(([name, port]) => {
            this.addPortToMap(portMap, port, `ws-${name}`);
        });
        // Check database
        Object.entries(this.config.database).forEach(([name, port]) => {
            if (port) {
                this.addPortToMap(portMap, port, `db-${name}`);
            }
        });
        // Check monitoring
        if (this.config.monitoring) {
            Object.entries(this.config.monitoring).forEach(([name, port]) => {
                if (port) {
                    this.addPortToMap(portMap, port, `monitoring-${name}`);
                }
            });
        }
        // Find conflicts
        portMap.forEach((services, port) => {
            if (services.length > 1) {
                conflicts.push({ port, services });
            }
        });
        return {
            valid: conflicts.length === 0,
            conflicts
        };
    }
    addPortToMap(map, port, service) {
        if (!map.has(port)) {
            map.set(port, []);
        }
        map.get(port).push(service);
    }
    /**
     * Generate environment variable template
     */
    generateEnvTemplate() {
        return `# Port Configuration
# Generated on ${new Date().toISOString()}

# Frontend
PORT_FRONTEND_MAIN=${this.config.frontend.main}
PORT_FRONTEND_DEV=${this.config.frontend.devServer || ''}

# Gateway
PORT_GATEWAY_MAIN=${this.config.gateway.main}
PORT_GATEWAY_ADMIN=${this.config.gateway.admin || ''}

# Services
PORT_SERVICE_USER=${this.config.services.userManagement}
PORT_SERVICE_AI=${this.config.services.aiAssistant}
PORT_SERVICE_TERMINAL=${this.config.services.terminal}
PORT_SERVICE_WORKSPACE=${this.config.services.workspace}
PORT_SERVICE_PORTFOLIO=${this.config.services.portfolio}
PORT_SERVICE_MARKET=${this.config.services.marketData}

# WebSocket
PORT_WS_SYSTEM=${this.config.websocket.system}
PORT_WS_CLAUDE=${this.config.websocket.claude}
PORT_WS_TERMINAL=${this.config.websocket.terminal}
PORT_WS_PORTFOLIO=${this.config.websocket.portfolio}

# Database
PORT_DB_POSTGRES=${this.config.database.postgres}
PORT_DB_PRISMA_STUDIO=${this.config.database.prismaStudio}
PORT_DB_REDIS=${this.config.database.redis || ''}

# Monitoring
PORT_MONITORING_PROMETHEUS=${this.config.monitoring?.prometheus || ''}
PORT_MONITORING_GRAFANA=${this.config.monitoring?.grafana || ''}`;
    }
    /**
     * Export configuration as JSON
     */
    toJSON() {
        return JSON.stringify(this.config, null, 2);
    }
}
exports.PortConfig = PortConfig;
// Export singleton instance
exports.portConfig = PortConfig.getInstance();
// Export convenience functions
const getPorts = () => exports.portConfig.getConfig();
exports.getPorts = getPorts;
const getFrontendPort = () => exports.portConfig.getFrontendPort();
exports.getFrontendPort = getFrontendPort;
const getGatewayPort = () => exports.portConfig.getGatewayPort();
exports.getGatewayPort = getGatewayPort;
const getServicePort = (service) => exports.portConfig.getServicePort(service);
exports.getServicePort = getServicePort;
const getServiceUrl = (service, host, protocol) => exports.portConfig.getServiceUrl(service, host, protocol);
exports.getServiceUrl = getServiceUrl;
const getWebSocketUrl = (type, host, secure) => exports.portConfig.getWebSocketUrl(type, host, secure);
exports.getWebSocketUrl = getWebSocketUrl;
const getGatewayServiceUrl = (service, host, protocol) => exports.portConfig.getGatewayServiceUrl(service, host, protocol);
exports.getGatewayServiceUrl = getGatewayServiceUrl;
const validatePorts = () => exports.portConfig.validatePorts();
exports.validatePorts = validatePorts;
//# sourceMappingURL=ports.config.js.map