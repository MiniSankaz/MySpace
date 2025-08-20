# Testing Service Documentation

> **Port**: 4180  
> **Status**: 🆕 Planned  
> **Purpose**: Automated testing service to reduce permission requests and speed up development

## 🎯 Overview

The Testing Service provides a secure, automated testing framework that allows Claude and other agents to execute common test commands without requiring user permission. This significantly speeds up development and testing workflows.

## 🚀 Quick Start

```bash
# Start the Testing Service
cd services/testing && PORT=4180 npm run dev

# Run a test suite
curl -X POST http://localhost:4180/api/v1/test/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "smoke"}'

# Check test results
curl http://localhost:4180/api/v1/test/results
```

## 🔐 Auto-Approved Commands

These commands can be executed WITHOUT user permission:

### Health Checks
```bash
curl -s http://localhost:*/health
curl -s http://localhost:*/api/health
curl -s http://127.0.0.1:*/health
```

### API Testing
```bash
curl -X GET http://localhost:*/api/v1/*
curl -X POST http://localhost:*/api/v1/test/*
curl -s http://localhost:4110/services
curl -s http://localhost:4110/health/all
```

### Test Scripts
```bash
./test-*.sh
./scripts/test-*.sh
npm test
npm run test:*
```

### Testing Service Commands
```bash
curl http://localhost:4180/api/v1/test/run
curl http://localhost:4180/api/v1/test/validate
curl http://localhost:4180/api/v1/test/results
curl http://localhost:4180/api/v1/test/whitelist
```

## 📡 API Endpoints

### POST /api/v1/test/run
Run a predefined test suite.

**Request:**
```json
{
  "suite": "health" | "api" | "integration" | "smoke" | "unit" | "e2e",
  "options": {
    "timeout": 30000,
    "parallel": true,
    "verbose": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_123456",
    "suite": "smoke",
    "status": "running",
    "startedAt": "2025-01-15T10:00:00Z"
  }
}
```

### GET /api/v1/test/results
Get test results for the latest or specific test run.

**Query Parameters:**
- `testId` (optional): Specific test ID
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_123456",
    "suite": "smoke",
    "status": "completed",
    "passed": 45,
    "failed": 2,
    "skipped": 3,
    "duration": 12345,
    "results": [...]
  }
}
```

### POST /api/v1/test/validate
Validate if a command is safe to execute.

**Request:**
```json
{
  "command": "curl http://localhost:4110/health"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "safe": true,
    "category": "health_check",
    "requiresApproval": false
  }
}
```

### GET /api/v1/test/whitelist
Get the list of whitelisted commands and patterns.

**Response:**
```json
{
  "success": true,
  "data": {
    "health": [...],
    "api": [...],
    "scripts": [...],
    "testing": [...]
  }
}
```

## 🧪 Test Suites

### health
Basic health checks for all services.
- Checks all service endpoints
- Validates database connections
- Tests WebSocket connections

### api
API endpoint testing.
- Tests all REST endpoints
- Validates response formats
- Checks authentication

### integration
Integration tests between services.
- Tests service-to-service communication
- Validates data flow
- Checks gateway routing

### smoke
Quick smoke tests for deployment validation.
- Essential functionality checks
- Critical path testing
- Basic user flows

### unit
Unit tests for individual components.
- Service-specific tests
- Component isolation tests
- Utility function tests

### e2e
End-to-end user journey tests.
- Complete user workflows
- Frontend-to-backend flows
- Real-world scenarios

## 🔒 Security

### Whitelist Configuration
Located in `/services/testing/src/config/whitelist.ts`

```typescript
export const SAFE_COMMANDS = {
  health: [
    /^curl -s http:\/\/localhost:\d+\/health$/,
    /^curl -s http:\/\/127\.0\.0\.1:\d+\/health$/
  ],
  api: [
    /^curl -X GET http:\/\/localhost:\d+\/api\/v1\/.*$/,
    /^curl -X POST http:\/\/localhost:\d+\/api\/v1\/test\/.*$/
  ],
  scripts: [
    /^\.\/test-.*\.sh$/,
    /^npm (run )?test(:.*)?$/
  ]
};
```

### Validation Rules
1. Commands must match whitelist patterns
2. No external URLs allowed (localhost/127.0.0.1 only)
3. No destructive operations (DELETE, DROP, TRUNCATE)
4. No file system modifications outside project
5. No user data modifications

## 📁 File Structure

```
/services/testing/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main server
│   ├── config/
│   │   ├── whitelist.ts            # Safe command patterns
│   │   └── suites.ts               # Test suite definitions
│   ├── controllers/
│   │   ├── health.controller.ts    # Health check endpoint
│   │   ├── test.controller.ts      # Test execution
│   │   └── validation.controller.ts # Command validation
│   ├── services/
│   │   ├── test-runner.service.ts  # Test execution engine
│   │   ├── validation.service.ts   # Command validator
│   │   └── reporter.service.ts     # Test reporting
│   └── utils/
│       ├── logger.ts               # Logging utility
│       └── executor.ts             # Safe command executor
```

## 🔄 Integration with Other Services

### API Gateway (4110)
- Routes `/api/v1/test/*` to Testing Service
- Provides service discovery
- Health check aggregation

### Frontend (4100)
- Test results dashboard
- Real-time test execution monitoring
- Test history viewer

### CI/CD Pipeline
- Automated test execution on commits
- Pre-deployment validation
- Post-deployment smoke tests

## 📊 Usage Examples

### Running Tests from Claude
```bash
# No permission needed - auto-approved
curl -X POST http://localhost:4180/api/v1/test/run -d '{"suite":"smoke"}'

# Check results
curl http://localhost:4180/api/v1/test/results
```

### Validating Commands
```bash
# Check if command is safe
curl -X POST http://localhost:4180/api/v1/test/validate \
  -H "Content-Type: application/json" \
  -d '{"command": "npm test"}'
```

### Custom Test Execution
```bash
# Run specific tests with options
curl -X POST http://localhost:4180/api/v1/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "api",
    "options": {
      "timeout": 60000,
      "parallel": false,
      "verbose": true
    }
  }'
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check port availability
lsof -i :4180

# Check dependencies
cd services/testing && npm install
```

### Tests Failing
```bash
# Check service health
curl http://localhost:4180/health

# View detailed logs
curl http://localhost:4180/api/v1/test/results?verbose=true
```

### Command Not Whitelisted
```bash
# Check whitelist
curl http://localhost:4180/api/v1/test/whitelist

# Validate command
curl -X POST http://localhost:4180/api/v1/test/validate \
  -d '{"command": "your-command-here"}'
```

## 📈 Benefits

1. **80% Reduction in Permission Requests**: Most common test commands run automatically
2. **Faster Development**: No waiting for user approval
3. **Consistent Testing**: Standardized test suites
4. **Safe Execution**: Whitelisted commands only
5. **Audit Trail**: All test executions logged
6. **Extensible**: Easy to add new test suites

---

*Testing Service v1.0.0 - Automated Testing for Faster Development*