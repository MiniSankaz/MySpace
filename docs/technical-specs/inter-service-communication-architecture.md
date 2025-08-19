# Inter-Service Communication Architecture

## Stock Portfolio v3.0 Microservices

**Document Version**: 1.0.0  
**Date**: 2025-08-14  
**Author**: Technical Architect Agent  
**Status**: FINAL

---

## Executive Summary

This document defines the comprehensive inter-service communication architecture for the Stock Portfolio v3.0 microservices ecosystem. The architecture implements production-ready patterns including service discovery, API gateway routing, authentication flow, circuit breakers, and request tracing across 6 microservices.

### Key Design Decisions

- **Service Mesh Pattern**: Lightweight service mesh for inter-service communication
- **API Gateway**: Single entry point with intelligent routing and authentication
- **Service Discovery**: Consul-based service registry with health checking
- **Communication Protocol**: REST for synchronous, WebSocket for real-time, gRPC for internal high-performance
- **Resilience**: Circuit breaker pattern with exponential backoff
- **Observability**: Distributed tracing with correlation IDs

---

## System Architecture Overview

### Microservices Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│         (Web App, Mobile App, Third-party APIs)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (4110)                        │
│  • Authentication  • Rate Limiting  • Routing               │
│  • Circuit Breaker • Request Tracing • Load Balancing       │
└───┬──────┬──────┬──────┬──────┬────────────────────────────┘
    │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│  User  ││   AI   ││Terminal││Workspace││Portfolio│
│  Mgmt  ││Assistant││Service ││ Service ││ Service │
│ (4100) ││ (4130) ││ (4140) ││ (4150)  ││ (4160)  │
└────────┘└────────┘└────────┘└────────┘└────────┘
    │         │         │         │         │
    └─────────┴─────────┴─────────┴─────────┘
                      │
              ┌───────▼────────┐
              │Service Registry│
              │   (Consul)     │
              └────────────────┘
```

### Communication Patterns

1. **Client to Gateway**: HTTPS with JWT authentication
2. **Gateway to Services**: HTTP/WebSocket with forwarded JWT
3. **Service to Service**: Direct HTTP with service tokens
4. **Real-time Updates**: WebSocket multiplexing through Gateway
5. **Event-driven**: Redis Pub/Sub for async events

---

## Detailed Component Specifications

### 1. Service Discovery & Registry

#### Service Registry Implementation

```typescript
// /shared/services/service-registry.ts

interface ServiceDefinition {
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
  };
  status: "healthy" | "unhealthy" | "degraded" | "offline";
  lastHeartbeat: Date;
}

class ServiceRegistry {
  private services: Map<string, ServiceDefinition>;
  private consul: ConsulClient;

  async register(service: ServiceDefinition): Promise<void>;
  async deregister(serviceId: string): Promise<void>;
  async discover(serviceName: string): Promise<ServiceDefinition[]>;
  async getHealthyInstance(serviceName: string): Promise<ServiceDefinition>;
  async updateHealth(serviceId: string, status: string): Promise<void>;
}
```

#### Service Discovery Configuration

```yaml
# /config/service-discovery.yaml
consul:
  host: localhost
  port: 8500
  datacenter: dc1

services:
  user-management:
    id: user-mgmt-${NODE_ID}
    name: user-management
    port: 4100
    health:
      endpoint: /health
      interval: 10s
      timeout: 5s
      deregister_after: 60s

  ai-assistant:
    id: ai-assistant-${NODE_ID}
    name: ai-assistant
    port: 4130
    health:
      endpoint: /health
      interval: 10s
      timeout: 5s

  terminal:
    id: terminal-${NODE_ID}
    name: terminal
    port: 4140
    health:
      endpoint: /health
      interval: 10s
      timeout: 5s

  workspace:
    id: workspace-${NODE_ID}
    name: workspace
    port: 4150
    health:
      endpoint: /health
      interval: 10s
      timeout: 5s

  portfolio:
    id: portfolio-${NODE_ID}
    name: portfolio
    port: 4160
    health:
      endpoint: /health
      interval: 10s
      timeout: 5s
```

### 2. API Gateway Routing

#### Enhanced Gateway Configuration

```typescript
// /services/gateway/src/config/routing.config.ts

export const routingConfig = {
  routes: [
    {
      path: "/api/users/*",
      service: "user-management",
      methods: ["GET", "POST", "PUT", "DELETE"],
      authentication: {
        required: true,
        exceptions: ["/api/users/auth/login", "/api/users/auth/register"],
      },
      rateLimit: {
        windowMs: 60000,
        max: 100,
      },
      timeout: 30000,
      retry: {
        attempts: 3,
        delay: 1000,
        backoff: "exponential",
      },
    },
    {
      path: "/api/ai/*",
      service: "ai-assistant",
      methods: ["GET", "POST"],
      authentication: { required: true },
      rateLimit: {
        windowMs: 60000,
        max: 50,
      },
      timeout: 60000,
      streamingSupport: true,
    },
    {
      path: "/api/terminal/*",
      service: "terminal",
      methods: ["GET", "POST", "DELETE"],
      authentication: { required: true },
      websocket: {
        enabled: true,
        path: "/ws/terminal",
      },
      timeout: 120000,
    },
    {
      path: "/api/workspace/*",
      service: "workspace",
      methods: ["GET", "POST", "PUT", "DELETE"],
      authentication: { required: true },
      timeout: 30000,
    },
    {
      path: "/api/portfolio/*",
      service: "portfolio",
      methods: ["GET", "POST", "PUT", "DELETE"],
      authentication: { required: true },
      websocket: {
        enabled: true,
        path: "/ws/portfolio",
      },
      timeout: 30000,
      caching: {
        enabled: true,
        ttl: 60000,
        paths: ["/api/portfolio/stocks/prices"],
      },
    },
  ],

  defaultRetry: {
    attempts: 3,
    delay: 1000,
    backoff: "exponential",
    maxDelay: 10000,
  },

  circuitBreaker: {
    threshold: 0.5,
    timeout: 60000,
    bucketSize: 10,
    bucketNum: 10,
  },
};
```

#### Dynamic Routing Implementation

```typescript
// /services/gateway/src/middleware/dynamic-router.ts

export class DynamicRouter {
  private registry: ServiceRegistry;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(req: Request, res: Response): Promise<void> {
    const route = this.matchRoute(req.path);
    const service = await this.registry.getHealthyInstance(route.service);

    if (!service) {
      throw new ServiceUnavailableError(
        `No healthy instances of ${route.service}`,
      );
    }

    const breaker = this.getCircuitBreaker(service.id);

    await breaker.execute(async () => {
      const response = await this.forwardRequest(req, service);
      this.sendResponse(res, response);
    });
  }

  private async forwardRequest(
    req: Request,
    service: ServiceDefinition,
  ): Promise<any> {
    const headers = this.buildHeaders(req);
    const url = `${service.protocol}://${service.host}:${service.port}${req.path}`;

    return await axios({
      method: req.method,
      url,
      headers,
      data: req.body,
      timeout: this.getTimeout(req.path),
      validateStatus: () => true,
    });
  }
}
```

### 3. Authentication Flow

#### JWT Token Management

```typescript
// /shared/auth/jwt-manager.ts

interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  refreshToken?: string;
}

export class JWTManager {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenTTL: number = 15 * 60; // 15 minutes
  private readonly refreshTokenTTL: number = 7 * 24 * 60 * 60; // 7 days

  generateTokenPair(user: User): TokenPair {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: generateSessionId(),
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.accessTokenTTL * 1000,
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenTTL,
    });

    const refreshToken = jwt.sign(
      { ...payload, type: "refresh" },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenTTL },
    );

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JWTPayload;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new TokenExpiredError("Access token expired");
      }
      throw new InvalidTokenError("Invalid access token");
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = jwt.verify(
      refreshToken,
      this.refreshTokenSecret,
    ) as JWTPayload;
    const user = await this.userService.findById(payload.userId);
    return this.generateTokenPair(user);
  }
}
```

#### Authentication Middleware

```typescript
// /services/gateway/src/middleware/auth.middleware.ts

export class AuthenticationMiddleware {
  private jwtManager: JWTManager;
  private cache: RedisCache;

  async authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        throw new UnauthorizedError("No token provided");
      }

      // Check token blacklist
      if (await this.cache.exists(`blacklist:${token}`)) {
        throw new UnauthorizedError("Token has been revoked");
      }

      // Verify and decode token
      const payload = await this.jwtManager.verifyAccessToken(token);

      // Validate session
      const session = await this.cache.get(`session:${payload.sessionId}`);
      if (!session) {
        throw new UnauthorizedError("Session expired");
      }

      // Attach user context to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
      };

      // Forward user context to downstream services
      req.headers["x-user-id"] = payload.userId;
      req.headers["x-user-roles"] = payload.roles.join(",");
      req.headers["x-session-id"] = payload.sessionId;

      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      } else {
        res.status(401).json({ error: "Authentication failed" });
      }
    }
  }
}
```

### 4. Inter-Service HTTP Client

#### Resilient HTTP Client Implementation

```typescript
// /shared/http/inter-service-client.ts

export class InterServiceClient {
  private registry: ServiceRegistry;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private retryPolicy: RetryPolicy;
  private correlationId: string;

  constructor(
    private serviceName: string,
    private config: InterServiceConfig,
  ) {
    this.circuitBreakers = new Map();
    this.retryPolicy = new ExponentialBackoffRetry(config.retry);
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const targetService = await this.registry.getHealthyInstance(
      options.service,
    );
    const breaker = this.getOrCreateBreaker(targetService.id);

    return await breaker.execute(async () => {
      return await this.retryPolicy.execute(async () => {
        const response = await this.makeRequest(targetService, options);

        if (response.status >= 500) {
          throw new ServiceError(`Service error: ${response.status}`);
        }

        return response.data;
      });
    });
  }

  private async makeRequest(
    service: ServiceDefinition,
    options: RequestOptions,
  ): Promise<AxiosResponse> {
    const url = `${service.protocol}://${service.host}:${service.port}${options.path}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Service-Name": this.serviceName,
      "X-Correlation-Id": this.correlationId || uuidv4(),
      "X-Request-Id": uuidv4(),
      ...options.headers,
    };

    // Add service-to-service authentication
    if (this.config.auth.enabled) {
      headers["X-Service-Token"] = await this.generateServiceToken();
    }

    return await axios({
      method: options.method || "GET",
      url,
      headers,
      data: options.data,
      timeout: options.timeout || this.config.defaultTimeout,
      validateStatus: () => true,
    });
  }

  private async generateServiceToken(): Promise<string> {
    // Generate short-lived service-to-service JWT
    return jwt.sign(
      {
        service: this.serviceName,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 60000, // 1 minute
      },
      this.config.auth.secret,
      { algorithm: "HS256" },
    );
  }
}
```

#### Retry Policy Implementation

```typescript
// /shared/resilience/retry-policy.ts

export class ExponentialBackoffRetry implements RetryPolicy {
  constructor(private config: RetryConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetriable(error)) {
          throw error;
        }

        if (attempt < this.config.maxAttempts - 1) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new MaxRetriesExceededError(
      `Failed after ${this.config.maxAttempts} attempts`,
      lastError,
    );
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.baseDelay || 1000;
    const maxDelay = this.config.maxDelay || 30000;
    const factor = this.config.factor || 2;

    const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return delay + jitter;
  }

  private isRetriable(error: any): boolean {
    // Network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return true;
    }

    // HTTP status codes
    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx errors and specific 4xx errors
      return status >= 500 || status === 429 || status === 408;
    }

    return false;
  }
}
```

### 5. WebSocket Proxying

#### WebSocket Proxy Implementation

```typescript
// /services/gateway/src/websocket/ws-proxy.ts

export class WebSocketProxy {
  private wss: WebSocket.Server;
  private registry: ServiceRegistry;
  private connections: Map<string, WebSocketConnection>;

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    this.connections = new Map();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on("connection", async (ws, req) => {
      const connectionId = uuidv4();
      const path = req.url;
      const token = this.extractToken(req);

      try {
        // Authenticate connection
        const user = await this.authenticateWebSocket(token);

        // Determine target service
        const targetService = this.getTargetService(path);
        const serviceInstance =
          await this.registry.getHealthyInstance(targetService);

        // Create upstream connection
        const upstream = await this.createUpstreamConnection(
          serviceInstance,
          path,
          user,
        );

        // Store connection mapping
        const connection: WebSocketConnection = {
          id: connectionId,
          client: ws,
          upstream,
          user,
          service: targetService,
          createdAt: new Date(),
        };

        this.connections.set(connectionId, connection);

        // Setup bi-directional message forwarding
        this.setupMessageForwarding(connection);

        // Handle disconnection
        ws.on("close", () => this.handleDisconnection(connectionId));
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Connection failed",
            error: error.message,
          }),
        );
        ws.close();
      }
    });
  }

  private setupMessageForwarding(connection: WebSocketConnection): void {
    // Client to upstream
    connection.client.on("message", (data) => {
      try {
        const message = this.enhanceMessage(data, connection);
        connection.upstream.send(message);
      } catch (error) {
        this.handleForwardingError(connection, error);
      }
    });

    // Upstream to client
    connection.upstream.on("message", (data) => {
      try {
        connection.client.send(data);
      } catch (error) {
        this.handleForwardingError(connection, error);
      }
    });
  }

  private enhanceMessage(data: any, connection: WebSocketConnection): string {
    const message = JSON.parse(data.toString());

    // Add user context and correlation ID
    return JSON.stringify({
      ...message,
      _metadata: {
        userId: connection.user.id,
        correlationId: message.correlationId || uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### 6. Circuit Breaker Pattern

#### Circuit Breaker Implementation

```typescript
// /shared/resilience/circuit-breaker.ts

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError("Circuit breaker is open");
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successCount = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }
}
```

### 7. Request Tracing

#### Distributed Tracing Implementation

```typescript
// /shared/tracing/tracer.ts

export class DistributedTracer {
  private spans: Map<string, Span>;

  startSpan(name: string, parentId?: string): Span {
    const span: Span = {
      id: uuidv4(),
      traceId: parentId ? this.getTraceId(parentId) : uuidv4(),
      parentId,
      name,
      service: process.env.SERVICE_NAME,
      startTime: Date.now(),
      tags: new Map(),
      logs: [],
    };

    this.spans.set(span.id, span);
    return span;
  }

  finishSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      this.exportSpan(span);
      this.spans.delete(spanId);
    }
  }

  addTag(spanId: string, key: string, value: any): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.tags.set(key, value);
    }
  }

  addLog(spanId: string, message: string, level: string = "info"): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
      });
    }
  }

  private async exportSpan(span: Span): Promise<void> {
    // Export to tracing backend (Jaeger, Zipkin, etc.)
    await this.tracingBackend.export(span);
  }
}
```

#### Correlation ID Middleware

```typescript
// /shared/middleware/correlation-id.ts

export class CorrelationIdMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate correlation ID
    const correlationId =
      (req.headers["x-correlation-id"] as string) || uuidv4();

    // Attach to request
    req.correlationId = correlationId;

    // Add to response headers
    res.setHeader("X-Correlation-Id", correlationId);

    // Add to logging context
    logger.setContext({ correlationId });

    // Continue to next middleware
    next();
  }
}
```

### 8. Health Check Aggregation

#### Health Check Service

```typescript
// /services/gateway/src/services/health-aggregator.ts

export class HealthAggregator {
  private registry: ServiceRegistry;
  private cache: Map<string, HealthStatus>;
  private healthCheckInterval: number = 10000;

  constructor() {
    this.cache = new Map();
    this.startHealthChecking();
  }

  async getAggregatedHealth(): Promise<SystemHealth> {
    const services = await this.registry.getAllServices();
    const healthStatuses = await Promise.all(
      services.map((service) => this.checkServiceHealth(service)),
    );

    const overallStatus = this.calculateOverallStatus(healthStatuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: healthStatuses,
      metrics: {
        healthyServices: healthStatuses.filter((s) => s.status === "healthy")
          .length,
        unhealthyServices: healthStatuses.filter(
          (s) => s.status === "unhealthy",
        ).length,
        degradedServices: healthStatuses.filter((s) => s.status === "degraded")
          .length,
      },
    };
  }

  private async checkServiceHealth(
    service: ServiceDefinition,
  ): Promise<ServiceHealth> {
    try {
      const response = await axios.get(
        `${service.protocol}://${service.host}:${service.port}${service.healthCheck.endpoint}`,
        { timeout: service.healthCheck.timeout },
      );

      return {
        service: service.name,
        status: response.status === 200 ? "healthy" : "degraded",
        responseTime: response.headers["x-response-time"],
        checks: response.data.checks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: service.name,
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private calculateOverallStatus(statuses: ServiceHealth[]): string {
    if (statuses.every((s) => s.status === "healthy")) {
      return "healthy";
    }
    if (statuses.some((s) => s.status === "unhealthy")) {
      return "unhealthy";
    }
    return "degraded";
  }
}
```

---

## Data Models and Schemas

### Service Communication Models

```typescript
// /shared/types/communication.types.ts

export interface ServiceRequest {
  id: string;
  correlationId: string;
  source: string;
  target: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  metadata: {
    userId?: string;
    sessionId?: string;
    timestamp: number;
    timeout: number;
  };
}

export interface ServiceResponse {
  id: string;
  correlationId: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  metadata: {
    responseTime: number;
    timestamp: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ServiceEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  metadata: {
    correlationId?: string;
    userId?: string;
    timestamp: number;
  };
}
```

---

## API Specifications

### Gateway API Endpoints

#### Authentication Endpoints

```http
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/verify
```

#### Service Proxy Endpoints

```http
ALL /api/users/*     -> User Management Service
ALL /api/ai/*        -> AI Assistant Service
ALL /api/terminal/*  -> Terminal Service
ALL /api/workspace/* -> Workspace Service
ALL /api/portfolio/* -> Portfolio Service
```

#### Health & Monitoring

```http
GET /health          - Aggregated health status
GET /health/:service - Individual service health
GET /metrics         - Prometheus metrics
GET /info           - Gateway information
```

### Inter-Service API Contract

All services must implement:

```http
GET  /health        - Health check endpoint
GET  /metrics       - Service metrics
GET  /info          - Service information
POST /internal/auth - Service-to-service authentication
```

---

## Integration Requirements

### 1. Service Registration on Startup

Each service must register with the service registry on startup:

```typescript
// Example: User Management Service startup
async function startService() {
  const serviceDefinition: ServiceDefinition = {
    id: `user-mgmt-${process.env.NODE_ID}`,
    name: "user-management",
    version: "3.0.0",
    host: process.env.HOST || "localhost",
    port: parseInt(process.env.PORT) || 4100,
    protocol: "http",
    healthCheck: {
      endpoint: "/health",
      interval: 10000,
      timeout: 5000,
      retries: 3,
    },
    metadata: {
      capabilities: ["authentication", "user-crud", "role-management"],
      dependencies: ["database", "redis"],
      environment: process.env.NODE_ENV || "development",
    },
    status: "healthy",
    lastHeartbeat: new Date(),
  };

  await serviceRegistry.register(serviceDefinition);

  // Start heartbeat
  setInterval(async () => {
    await serviceRegistry.updateHealth(serviceDefinition.id, "healthy");
  }, 10000);
}
```

### 2. Inter-Service Communication Setup

Services communicate using the shared HTTP client:

```typescript
// Example: Portfolio Service calling User Management
class PortfolioService {
  private userClient: InterServiceClient;

  constructor() {
    this.userClient = new InterServiceClient("portfolio", {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
      },
      auth: {
        enabled: true,
        secret: process.env.SERVICE_SECRET,
      },
      defaultTimeout: 30000,
    });
  }

  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    // First, verify user exists
    const user = await this.userClient.request({
      service: "user-management",
      method: "GET",
      path: `/users/${userId}`,
      headers: {
        "X-Internal-Request": "true",
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get portfolios
    return await this.portfolioRepository.findByUserId(userId);
  }
}
```

### 3. Event-Driven Communication

Services publish and subscribe to events:

```typescript
// Event Publisher
class EventPublisher {
  async publish(event: ServiceEvent): Promise<void> {
    await this.redis.publish(`events:${event.type}`, JSON.stringify(event));
  }
}

// Event Subscriber
class EventSubscriber {
  async subscribe(
    eventType: string,
    handler: (event: ServiceEvent) => void,
  ): Promise<void> {
    await this.redis.subscribe(`events:${eventType}`);

    this.redis.on("message", (channel, message) => {
      const event = JSON.parse(message);
      handler(event);
    });
  }
}

// Usage in Portfolio Service
portfolioService.on("trade-executed", async (trade) => {
  await eventPublisher.publish({
    id: uuidv4(),
    type: "portfolio.trade.executed",
    source: "portfolio-service",
    data: trade,
    metadata: {
      correlationId: trade.correlationId,
      userId: trade.userId,
      timestamp: Date.now(),
    },
  });
});
```

---

## Security Specifications

### 1. Service-to-Service Authentication

```typescript
// Service Token Validation
export class ServiceAuthMiddleware {
  async validate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = req.headers["x-service-token"] as string;

    if (!token) {
      return res.status(401).json({ error: "Service token required" });
    }

    try {
      const payload = jwt.verify(token, process.env.SERVICE_SECRET);

      // Verify service is registered
      const service = await serviceRegistry.getService(payload.service);
      if (!service) {
        throw new Error("Unknown service");
      }

      req.serviceContext = {
        name: payload.service,
        authenticated: true,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid service token" });
    }
  }
}
```

### 2. Request Signing

```typescript
// Request signature for sensitive operations
export class RequestSigner {
  sign(request: ServiceRequest): string {
    const payload = `${request.method}:${request.path}:${JSON.stringify(request.body)}`;
    return crypto
      .createHmac("sha256", process.env.SIGNING_SECRET)
      .update(payload)
      .digest("hex");
  }

  verify(request: ServiceRequest, signature: string): boolean {
    const expectedSignature = this.sign(request);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
```

---

## Performance Requirements

### Latency Targets

- Gateway routing: < 5ms overhead
- Service discovery: < 10ms
- Health check: < 100ms
- Inter-service calls: < 50ms overhead
- Circuit breaker decision: < 1ms

### Throughput Targets

- Gateway: 10,000 req/s
- Service discovery: 1,000 lookups/s
- WebSocket connections: 10,000 concurrent
- Event processing: 5,000 events/s

### Resource Limits

- Connection pool: 100 per service
- Circuit breaker window: 10 seconds
- Request timeout: 30 seconds (default)
- WebSocket idle timeout: 5 minutes
- JWT token cache: 10,000 entries

---

## Implementation Guidelines

### Phase 1: Core Infrastructure (Days 1-3)

1. Set up Consul service registry
2. Implement service registration/discovery
3. Create shared communication libraries
4. Set up Redis for events and caching

### Phase 2: Gateway Enhancement (Days 4-5)

1. Implement dynamic routing
2. Add authentication middleware
3. Set up WebSocket proxying
4. Implement health aggregation

### Phase 3: Resilience Patterns (Days 6-7)

1. Implement circuit breakers
2. Add retry policies
3. Set up request timeout handling
4. Implement bulkhead pattern

### Phase 4: Observability (Days 8-9)

1. Add distributed tracing
2. Implement correlation IDs
3. Set up metrics collection
4. Create monitoring dashboards

### Phase 5: Testing & Optimization (Days 10-11)

1. Integration testing
2. Load testing
3. Failure scenario testing
4. Performance optimization

---

## Testing Requirements

### Unit Tests

- Service discovery logic
- Circuit breaker state transitions
- Retry policy calculations
- JWT token validation
- Request routing logic

### Integration Tests

- Service registration/deregistration
- End-to-end request flow
- WebSocket connection handling
- Authentication flow
- Health check aggregation

### Load Tests

- Gateway throughput
- Service discovery under load
- Circuit breaker behavior
- WebSocket scalability
- Event processing capacity

### Chaos Tests

- Service failure scenarios
- Network partition handling
- Cascading failure prevention
- Recovery time verification

---

## Deployment Considerations

### Docker Compose Configuration

```yaml
version: "3.8"

services:
  consul:
    image: consul:latest
    ports:
      - "8500:8500"
    volumes:
      - consul-data:/consul/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  gateway:
    build: ./services/gateway
    ports:
      - "4110:4110"
    environment:
      - CONSUL_HOST=consul
      - REDIS_HOST=redis
    depends_on:
      - consul
      - redis

  user-management:
    build: ./services/user-management
    ports:
      - "4100:4100"
    environment:
      - CONSUL_HOST=consul
      - REDIS_HOST=redis
    depends_on:
      - consul
      - redis

  # ... other services
```

### Kubernetes Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway
spec:
  type: LoadBalancer
  ports:
    - port: 4110
      targetPort: 4110
  selector:
    app: gateway

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
        - name: gateway
          image: stock-portfolio/gateway:3.0.0
          ports:
            - containerPort: 4110
          env:
            - name: CONSUL_HOST
              value: consul-service
            - name: REDIS_HOST
              value: redis-service
          livenessProbe:
            httpGet:
              path: /health
              port: 4110
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 4110
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## Appendices

### A. Glossary

- **Circuit Breaker**: Pattern that prevents cascading failures
- **Service Mesh**: Infrastructure layer for service-to-service communication
- **Correlation ID**: Unique identifier tracking requests across services
- **Bulkhead**: Pattern isolating resources to prevent total system failure
- **Service Registry**: Central database of available service instances

### B. References

1. [Microservices Patterns](https://microservices.io/patterns/)
2. [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
3. [Distributed Tracing](https://opentracing.io/docs/)
4. [Service Mesh Architecture](https://www.nginx.com/blog/what-is-a-service-mesh/)
5. [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### C. Configuration Templates

Available in `/config/templates/`:

- `consul-config.json`
- `gateway-routes.yaml`
- `service-registry.yaml`
- `circuit-breaker.yaml`
- `tracing-config.yaml`

---

**Document Control**

- Version: 1.0.0
- Last Modified: 2025-08-14
- Author: Technical Architect Agent
- Review Status: Final
- Next Review: 2025-09-14
