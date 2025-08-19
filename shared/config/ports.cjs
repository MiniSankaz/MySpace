/**
 * CommonJS adapter for Node.js scripts that can't use ES modules
 * This provides the same port configuration functionality for legacy code
 */

const fs = require('fs');
const path = require('path');

class PortConfigCJS {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Base configuration - same as TypeScript version
    const baseConfig = {
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

    return this.applyEnvOverrides(baseConfig);
  }

  applyEnvOverrides(config) {
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
    if (process.env.PORT_MONITORING_PROMETHEUS) {
      config.monitoring.prometheus = parseInt(process.env.PORT_MONITORING_PROMETHEUS, 10);
    }
    if (process.env.PORT_MONITORING_GRAFANA) {
      config.monitoring.grafana = parseInt(process.env.PORT_MONITORING_GRAFANA, 10);
    }

    return config;
  }

  getConfig() {
    return this.config;
  }

  getFrontendPort() {
    return this.config.frontend.main;
  }

  getGatewayPort() {
    return this.config.gateway.main;
  }

  getServicePort(service) {
    return this.config.services[service];
  }

  getServiceUrl(service, host = 'localhost', protocol = 'http') {
    const port = this.config.services[service];
    return `${protocol}://${host}:${port}`;
  }

  getWebSocketUrl(type, host = 'localhost', secure = false) {
    const protocol = secure ? 'wss' : 'ws';
    const port = this.config.websocket[type];
    return `${protocol}://${host}:${port}`;
  }

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

  getDatabasePort(db) {
    return this.config.database[db];
  }

  validatePorts() {
    const portMap = new Map();
    const conflicts = [];

    // Helper function to add port to map
    const addPort = (port, service) => {
      if (!portMap.has(port)) {
        portMap.set(port, []);
      }
      portMap.get(port).push(service);
    };

    // Check all ports
    addPort(this.config.frontend.main, 'frontend');
    if (this.config.frontend.devServer) {
      addPort(this.config.frontend.devServer, 'frontend-dev');
    }

    addPort(this.config.gateway.main, 'gateway');
    if (this.config.gateway.admin) {
      addPort(this.config.gateway.admin, 'gateway-admin');
    }

    Object.entries(this.config.services).forEach(([name, port]) => {
      addPort(port, `service-${name}`);
    });

    Object.entries(this.config.websocket).forEach(([name, port]) => {
      addPort(port, `ws-${name}`);
    });

    Object.entries(this.config.database).forEach(([name, port]) => {
      if (port) addPort(port, `db-${name}`);
    });

    if (this.config.monitoring) {
      Object.entries(this.config.monitoring).forEach(([name, port]) => {
        if (port) addPort(port, `monitoring-${name}`);
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

  toJSON() {
    return JSON.stringify(this.config, null, 2);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getPortConfig: () => {
    if (!instance) {
      instance = new PortConfigCJS();
    }
    return instance;
  },
  
  // Direct exports for convenience
  getPorts: () => {
    const config = module.exports.getPortConfig();
    return config.getConfig();
  },
  
  getFrontendPort: () => {
    const config = module.exports.getPortConfig();
    return config.getFrontendPort();
  },
  
  getGatewayPort: () => {
    const config = module.exports.getPortConfig();
    return config.getGatewayPort();
  },
  
  getServicePort: (service) => {
    const config = module.exports.getPortConfig();
    return config.getServicePort(service);
  },
  
  getServiceUrl: (service, host, protocol) => {
    const config = module.exports.getPortConfig();
    return config.getServiceUrl(service, host, protocol);
  },

  getWebSocketUrl: (type, host, secure) => {
    const config = module.exports.getPortConfig();
    return config.getWebSocketUrl(type, host, secure);
  },

  getGatewayServiceUrl: (service, host, protocol) => {
    const config = module.exports.getPortConfig();
    return config.getGatewayServiceUrl(service, host, protocol);
  },

  getDatabasePort: (db) => {
    const config = module.exports.getPortConfig();
    return config.getDatabasePort(db);
  },

  validatePorts: () => {
    const config = module.exports.getPortConfig();
    return config.validatePorts();
  },

  generateEnvTemplate: () => {
    const config = module.exports.getPortConfig();
    return config.generateEnvTemplate();
  }
};