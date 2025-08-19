# 📍 Port Index Registry

> **Last Updated**: 2025-01-19  
> **Version**: 2.0.0  
> **Status**: Active

## 🎯 Quick Reference Table

| Range | Service | Main HTTP | WebSocket | Admin/Dev | Status |
|-------|---------|-----------|-----------|-----------|---------|
| **4100-4109** | **Frontend** | 4100 | 4101 | 4102 | ✅ Active |
| **4110-4119** | **API Gateway** | 4110 | 4111 | 4112 | ✅ Active |
| **4120-4129** | **User Management** | 4120 | 4121 | 4122 | ✅ Active |
| **4130-4139** | **AI Assistant** | 4130 | 4131 | 4132 | ✅ Active |
| **4140-4149** | **Terminal** | 4140 | 4141 | 4142 | ✅ Active |
| **4150-4159** | **Workspace** | 4150 | 4151 | 4152 | ✅ Active |
| **4160-4169** | **Portfolio** | 4160 | 4161 | 4162 | ✅ Active |
| **4170-4179** | **Market Data** | 4170 | 4171 | 4172 | ✅ Active |
| **4180-4189** | **Notification** | 4180 | 4181 | 4182 | 🔄 Planned |
| **4190-4199** | **Analytics** | 4190 | 4191 | 4192 | 🔄 Planned |

## 📊 Detailed Port Allocation

### Frontend & Core (4100-4109)
```
4100 - Frontend Main (Next.js)
4101 - Frontend WebSocket
4102 - Frontend Dev Server
4103 - Storybook
4104 - Documentation Server
4105 - Test Server
4106-4109 - Reserved
```

### API Gateway (4110-4119)
```
4110 - Gateway HTTP API
4111 - Gateway WebSocket
4112 - Gateway Admin API
4113 - Gateway Health Check
4114 - Gateway Metrics
4115 - Gateway GraphQL (Future)
4116-4119 - Reserved
```

### User Management Service (4120-4129)
```
4120 - User HTTP API
4121 - User WebSocket
4122 - User Admin API
4123 - Auth Service
4124 - Session Management
4125 - RBAC Service
4126-4129 - Reserved
```

### AI Assistant Service (4130-4139)
```
4130 - AI HTTP API
4131 - AI Chat WebSocket
4132 - AI CLI Mode API
4133 - AI Orchestration API
4134 - AI Knowledge Base
4135 - AI Training API
4136-4139 - Reserved
```

### Terminal Service (4140-4149)
```
4140 - Terminal HTTP API
4141 - Terminal PTY WebSocket
4142 - Terminal Management API
4143 - Terminal Session API
4144 - Terminal Replay API
4145 - Terminal Sharing API
4146-4149 - Reserved
```

### Workspace Service (4150-4159)
```
4150 - Workspace HTTP API
4151 - Workspace WebSocket
4152 - File Operations API
4153 - Git Operations API
4154 - Project Management API
4155 - IDE Integration API
4156-4159 - Reserved
```

### Portfolio Service (4160-4169)
```
4160 - Portfolio HTTP API
4161 - Portfolio WebSocket
4162 - Trading API
4163 - Transaction API
4164 - Performance API
4165 - Risk Analysis API
4166-4169 - Reserved
```

### Market Data Service (4170-4179)
```
4170 - Market Data HTTP API
4171 - Market Data WebSocket
4172 - Historical Data API
4173 - Real-time Quotes API
4174 - News Feed API
4175 - Technical Analysis API
4176-4179 - Reserved
```

### Future Services (4180-4999)
```
4180-4189 - Notification Service
4190-4199 - Analytics Service
4130-4209 - Reporting Service
4210-4219 - Payment Service
4220-4229 - Billing Service
4230-4239 - Email Service
4240-4249 - SMS Service
4250-4259 - Push Notification Service
4260-4269 - Search Service
4270-4279 - Cache Service
4280-4289 - Queue Service
4290-4299 - Storage Service
4140-4399 - Integration Services (10 slots)
4150-4499 - Business Services (10 slots)
4160-4599 - AI/ML Services (10 slots)
4170-4699 - Communication Services (10 slots)
4700-4799 - Infrastructure Services (10 slots)
4800-4899 - Security Services (10 slots)
4900-4999 - Custom Services (10 slots)
```

## 🔧 Environment Variables

### Development
```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4110
NEXT_PUBLIC_WS_URL=ws://localhost:4111
PORT=4100

# Gateway
GATEWAY_PORT=4110
GATEWAY_WS_PORT=4111
GATEWAY_ADMIN_PORT=4112

# Services
USER_SERVICE_PORT=4120
AI_SERVICE_PORT=4130
TERMINAL_SERVICE_PORT=4140
WORKSPACE_SERVICE_PORT=4150
PORTFOLIO_SERVICE_PORT=4160
MARKET_DATA_SERVICE_PORT=4170
```

### Production
```bash
# Use same ports with proper domain
NEXT_PUBLIC_API_URL=https://api.yourdomain.com:4110
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com:4111
```

## 🚀 Quick Start Commands

### Start Individual Service
```bash
# Frontend
PORT=4100 npm run dev

# Gateway
PORT=4110 npm run dev

# Services
PORT=4120 npm run dev  # User Management
PORT=4130 npm run dev  # AI Assistant
PORT=4140 npm run dev  # Terminal
PORT=4150 npm run dev  # Workspace
PORT=4160 npm run dev  # Portfolio
PORT=4170 npm run dev  # Market Data
```

### Start All Services
```bash
./services/start-all-services.sh
```

## 📝 Migration Notes

### From Old Ports
- Frontend: 4100 → 4100
- Gateway: 4110 → 4110
- User: 4100 → 4120
- AI: 4130 → 4130
- Terminal: 4140 → 4140
- Workspace: 4150 → 4150
- Portfolio: 4160 → 4160
- Market: 4170 → 4170

### WebSocket Migration
- Old: 4001, 4002 → New: Service Port + 1
- Pattern: 41X0 = HTTP, 41X1 = WebSocket

## 🔍 Port Check Commands

### Check if port is in use
```bash
lsof -i :4100  # Check specific port
netstat -an | grep 41  # Check all 41xx ports
```

### Kill process on port
```bash
kill -9 $(lsof -t -i:4100)
```

## 📋 Service Discovery

All services register with the Gateway at startup:
```javascript
{
  "frontend": "http://localhost:4100",
  "gateway": "http://localhost:4110",
  "user": "http://localhost:4120",
  "ai": "http://localhost:4130",
  "terminal": "http://localhost:4140",
  "workspace": "http://localhost:4150",
  "portfolio": "http://localhost:4160",
  "market": "http://localhost:4170"
}
```

## ⚠️ Important Notes

1. **Port Range**: All services MUST use ports 4100-4999
2. **Pattern**: Main port ends with 0, WebSocket with 1, Admin with 2
3. **Increment**: Each service gets 10 ports (expandable)
4. **Gateway**: All external requests go through Gateway (4110)
5. **Internal**: Services communicate directly using service ports

## 🔄 Version History

- **v2.0.0** (2025-01-19): Complete port refactor to 4100-4999 range
- **v1.0.0** (2025-08-16): Initial port configuration

---

**This document is the single source of truth for all port configurations in the project.**