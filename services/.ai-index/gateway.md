# Gateway Service Index

## @AI-MARKER Quick Jump Points

### Core Components
- **Main Entry**: src/index.ts#L1 @AI-MARKER:SERVICE:GATEWAY
- **Health Check**: src/index.ts#L108 @AI-MARKER:ENDPOINT:HEALTH_CHECK  
- **Service Discovery**: src/index.ts#L161 @AI-MARKER:ENDPOINT:SERVICE_DISCOVERY
- **WebSocket Proxy**: src/index.ts#L212 @AI-MARKER:WEBSOCKET:PROXY_HANDLER

### Middleware
- **Dynamic Router**: src/middleware/dynamic-router.ts
- **Rate Limiter**: src/middleware/rate-limit.ts
- **Request Logger**: src/middleware/request-logger.ts

### Services
- **Service Registry**: src/services/service-registry.ts
- **Health Aggregator**: src/services/health-aggregator.ts

## Service Information
- **Port**: 4110
- **Type**: API Gateway
- **Dependencies**: All microservices

## Critical Paths
- **Request Flow**: Client → Gateway → Service → Response
- **Health Check**: /health → aggregator → all services
- **WebSocket**: /ws/* → proxy → target service

## API Routes
- `/health` - Gateway health
- `/health/all` - All services health
- `/services` - Service discovery
- `/api/v1/*` - Dynamic routing to services

## Configuration
- **CORS**: Configured for frontend (4100)
- **Rate Limit**: 1000 req/15min per IP
- **Body Limit**: 10MB