# SOPs & Standards

## Git Workflow

### Branch Strategy
- **Production**: `main`
- **Development**: `dev`
- **Features**: `feature/[name]`
- **Fixes**: `fix/[name]`
- **Docs**: `docs/[name]`

### Commit Convention (Conventional Commits)
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
perf: Improve performance
```

### Pull Request Process
1. Create PR from feature to dev
2. At least 1 code review required
3. All tests must pass
4. Update CLAUDE.md if needed
5. Squash merge preferred

## Code Standards

### TypeScript
- Strict mode enabled
- No any types
- Explicit return types
- Interface over type when possible

### File Organization
- Maximum 200 lines per file
- Maximum 50 lines per function
- Cyclomatic complexity < 10
- Single responsibility principle

### ESLint Rules
```json
{
  "no-console": "warn",
  "no-unused-vars": "error",
  "prefer-const": "error",
  "no-var": "error"
}
```

### Prettier Config
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## Testing Requirements

### Unit Tests
- Required for all utilities
- Minimum 80% coverage
- Use Jest and React Testing Library

### Integration Tests
- Required for API endpoints
- Test happy path and error cases
- Mock external dependencies

### E2E Tests
- Required for critical user flows
- Use Playwright or Cypress
- Run before deployment

## Security Standards

### Authentication
- Use JWT with refresh tokens
- Secure httpOnly cookies
- 15-minute access token expiry
- 7-day refresh token expiry

### Input Validation
- Validate all user inputs
- Use Zod for schema validation
- Sanitize before database storage
- Escape for HTML output

### API Security
- Rate limiting on all endpoints
- CORS configuration
- API versioning
- Request signing for sensitive ops

### Database Security
- Use Prisma parameterized queries
- No raw SQL queries
- Connection pooling
- SSL connections only

## Performance Standards

### Page Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Cumulative Layout Shift < 0.1
- Bundle size < 500KB initial

### API Performance
- Response time < 500ms
- Database query < 100ms
- WebSocket latency < 100ms
- Cache hit rate > 80%

### Optimization Techniques
- Code splitting
- Lazy loading
- Image optimization
- CDN usage
- Caching strategy

## Deployment Process

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables set
- [ ] Database migrations ready

### Deployment Steps
1. Build application
2. Run database migrations
3. Update environment variables
4. Deploy to staging
5. Smoke tests
6. Deploy to production
7. Monitor metrics

### Rollback Procedure
1. Identify issue
2. Revert to previous version
3. Restore database if needed
4. Notify team
5. Post-mortem analysis

## Monitoring & Alerts

### Metrics to Monitor
- CPU usage < 80%
- Memory usage < 90%
- Error rate < 1%
- Response time P95 < 1s
- Active users
- Database connections

### Alert Thresholds
- Critical: Service down
- High: Error rate > 5%
- Medium: Response time > 2s
- Low: CPU > 90% for 5 min

## Documentation Standards

### Code Comments
- JSDoc for public APIs
- Inline comments for complex logic
- TODO comments with ticket number
- No commented-out code

### README Requirements
- Project description
- Installation steps
- Configuration guide
- API documentation
- Troubleshooting section

### CLAUDE.md Updates
- Update after major changes
- Include in PR if relevant
- Keep work log current
- Document known issues

## Code Change Checklist ⚠️ CRITICAL

### Before Making Changes - Systematic Analysis
```bash
# 1. Find ALL related files
find . -name "*.js" -o -name "*.ts" | xargs grep -l "pattern_to_change"

# 2. Check for duplicate/similar code
grep -r "similar_function\|similar_class" src/

# 3. Identify all dependencies
grep -r "import.*filename" src/

# 4. List all WebSocket/Service files
ls -la src/server/websocket/*.js
ls -la src/services/*.ts
```

### During Changes - Complete Coverage
- [ ] Fixed primary file (from error log)
- [ ] Fixed ALL similar files (from search)
- [ ] Updated shared interfaces/types
- [ ] Updated imports if paths changed
- [ ] Checked frontend components using the API
- [ ] Verified WebSocket handlers (both system AND Claude)

### After Changes - Comprehensive Testing
- [ ] Test primary functionality
- [ ] Test ALL terminal types (system, Claude)
- [ ] Test edge cases (reconnection, multiple sessions)
- [ ] Check for console errors
- [ ] Verify no regression in other features
- [ ] Run build to catch TypeScript errors

### Common Pitfalls to Avoid
1. **Tunnel Vision**: Don't fix just the file showing errors
2. **Duplicate Code**: Always check for similar implementations
3. **Incomplete Testing**: Test ALL affected components, not just the obvious ones
4. **Missing Dependencies**: Update ALL files importing changed modules
5. **WebSocket Pairs**: terminal-ws-standalone.js AND claude-terminal-ws.js often need same fixes

## Terminal V2 Development Standards

### Clean Architecture Principles
- **Single Responsibility**: Each service has one clear purpose
- **Dependency Inversion**: Core services don't depend on external services
- **Interface Segregation**: Services expose only necessary methods
- **Open/Closed**: Open for extension, closed for modification

### Terminal V2 Service Guidelines

#### Session Manager Service
```typescript
// ✅ Good - Clear responsibility
class SessionManager {
  createSession(params: CreateSessionParams): TerminalSession
  suspendProjectSessions(projectId: string): number
  resumeProjectSessions(projectId: string): TerminalSession[]
}

// ❌ Bad - Mixed responsibilities
class SessionManager {
  createSession(params: CreateSessionParams): TerminalSession
  writeToTerminal(data: string): void  // Stream Manager responsibility
  collectMetrics(): void               // Metrics Collector responsibility
}
```

#### Migration Service Best Practices
```typescript
// ✅ Good - Progressive migration
if (this.migrationService.shouldUseNewAPI('terminal-create')) {
  return await this.terminalOrchestrator.createSession(params);
} else {
  return await this.legacyAdapter.createSession(params);
}

// ❌ Bad - Hardcoded system choice
return await this.terminalOrchestrator.createSession(params); // No migration support
```

#### Error Handling Standards
```typescript
// ✅ Good - Circuit breaker pattern
try {
  const result = await operation();
  this.circuitBreaker.recordSuccess();
  return result;
} catch (error) {
  this.circuitBreaker.recordFailure();
  if (this.circuitBreaker.isOpen()) {
    throw new ServiceUnavailableError('Circuit breaker open');
  }
  throw error;
}
```

### Performance Requirements

#### Terminal V2 Specific
- Session creation: < 100ms
- WebSocket connection: < 50ms
- Memory per session: < 5MB
- CPU per 100 sessions: < 20%
- Cleanup time: < 10ms per session

#### Migration Performance
- Legacy to V2 conversion: < 200ms
- Progressive migration overhead: < 10%
- Feature flag check: < 1ms
- Rollback time: < 30 seconds

## Terminal V2 Testing Standards

### Unit Testing Requirements
```typescript
// ✅ Required tests for each service
describe('SessionManager', () => {
  test('creates session with valid parameters')
  test('suspends project sessions correctly')
  test('handles session limits')
  test('cleans up expired sessions')
  test('throws error on invalid input')
})
```

### Integration Testing
```bash
# Run Terminal V2 integration tests
npx tsx scripts/test-terminal-integration.ts

# Tests must cover:
# - Session creation and management
# - Project switching (suspend/resume)
# - Memory management and cleanup
# - Error handling and recovery
# - Migration service functionality
```

### Load Testing Requirements
```bash
# Performance benchmarks
NUM_PROJECTS=10 SESSIONS_PER_PROJECT=20 npx tsx scripts/load-test-terminal.ts

# Acceptance criteria:
# - Support 200+ concurrent sessions
# - < 50ms average latency
# - < 1% error rate
# - Memory growth < 10MB/hour
```

## Terminal V2 Code Change Checklist ⚠️ CRITICAL

### Before Making Terminal V2 Changes
```bash
# 1. Understand the clean architecture
ls -la src/services/terminal-v2/core/
ls -la src/services/terminal-v2/orchestrator/
ls -la src/services/terminal-v2/migration/

# 2. Check migration service impact
grep -r "migrationService|MigrationMode" src/

# 3. Verify service dependencies
grep -r "sessionManager|streamManager|metricsCollector" src/

# 4. Check configuration files
ls -la src/config/terminal*.ts
```

### During Terminal V2 Changes
- [ ] Maintain clean architecture boundaries
- [ ] Update migration service if needed
- [ ] Keep backward compatibility
- [ ] Follow single responsibility principle
- [ ] Update relevant configuration
- [ ] Add appropriate error handling
- [ ] Include circuit breaker pattern

### After Terminal V2 Changes
- [ ] Run integration tests: `npx tsx scripts/test-terminal-integration.ts`
- [ ] Run load tests: `npx tsx scripts/load-test-terminal.ts`
- [ ] Test all migration modes (legacy/dual/new/progressive)
- [ ] Verify health check endpoint works
- [ ] Check Prometheus metrics endpoint
- [ ] Test project switching scenarios
- [ ] Verify cleanup procedures work

### Terminal V2 Deployment Checklist
- [ ] Set appropriate migration mode
- [ ] Configure environment variables
- [ ] Test health check endpoint
- [ ] Verify WebSocket connections
- [ ] Monitor memory usage
- [ ] Check error rates
- [ ] Validate performance metrics

### Common Terminal V2 Pitfalls to Avoid
1. **Mixing Service Responsibilities**: Keep session, stream, and metrics concerns separate
2. **Bypassing Migration Service**: Always go through migration layer
3. **Ignoring Circuit Breakers**: Use resilience patterns for external dependencies
4. **Hard-coding Configuration**: Use configuration files for all settings
5. **Skipping Integration Tests**: Always run full test suite
6. **Missing Cleanup**: Ensure proper resource cleanup in all scenarios