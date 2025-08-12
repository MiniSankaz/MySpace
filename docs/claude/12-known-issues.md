# Known Issues & Solutions

## 📑 Quick Navigation Index

### Critical Issues
- [WebSocket Terminal Reconnection Loop](#websocket-terminal-reconnection-loop-) - FIXED
- [Database Connection Timeouts](#database-connection-timeouts) - MITIGATED

### Common Issues
- [Chat History Not Displaying](#chat-history-not-displaying)
- [Build Errors with TypeScript](#build-errors-with-typescript)
- [Session Cookie Issues](#session-cookie-issues)
- [Terminal Session Creation Authentication](#terminal-session-creation-authentication-error)

### Environment Issues
- [Port Conflicts](#port-conflicts)
- [Missing Environment Variables](#missing-environment-variables)
- [Prisma Client Not Generated](#prisma-client-not-generated)

### UI/UX Issues
- [Terminal Scrolling Issues](#terminal-scrolling-issues) - FIXED
- [Duplicate Project Creation](#duplicate-project-creation)

### Performance Issues
- [Slow Initial Page Load](#slow-initial-page-load)
- [High Memory Usage](#high-memory-usage)

### Integration Issues
- [Claude CLI Command Fragmentation](#claude-cli-command-fragmentation)
- [API Route 405 Errors](#api-route-405-errors)

### Debugging
- [Enable Debug Logging](#enable-debug-logging)
- [Check Network Tab](#check-network-tab)
- [Database Issues](#database-issues)
- [WebSocket Debugging](#websocket-debugging)

---

## Critical Issues

### WebSocket Terminal Reconnection Loop ⚠️
**Status**: FIXED (2025-08-11)
**Problem**: Terminal WebSocket connections enter infinite reconnection loops
**Solution**: 
- Implemented Circuit Breaker pattern
- Standardized session ID format: `session_{timestamp}_{random}`
- Added exponential backoff for reconnections
**Workaround**: System has circuit breaker protection to prevent runaway loops

### Database Connection Timeouts
**Status**: MITIGATED
**Problem**: PostgreSQL on DigitalOcean times out intermittently
**Solution**: 
- Implemented cache manager with 15-minute TTL
- Added offline fallback with LocalStorage
**Workaround**: Restart server or use `./quick-restart.sh`

## Common Issues

### Chat History Not Displaying
**Problem**: Messages not showing after save in AI Assistant
**Cause**: API returns messages array, frontend uses UUID session IDs
**Solution**: Check `/src/app/api/assistant/chat/route.ts:112-120`
**Fix**: Ensure session ID format consistency

### Build Errors with TypeScript
**Problem**: Syntax errors in auth-client.ts
**Solution**: Fixed orphaned methods outside class, removed duplicate exports
**File**: `/src/core/auth/auth-client.ts`

### Session Cookie Issues
**Problem**: Cookies not set in production
**Solution**: Configure `sameSite` and `secure` flags properly
**Config**: Check `AUTH_COOKIE_*` environment variables

### Terminal Session Creation Authentication Error
**Problem**: "authClient.getCurrentUser is not a function"
**Solution**: Use `verifyAuth(request)` from middleware instead
**File**: `/src/app/api/workspace/projects/[id]/terminals/route.ts`

## Environment-Specific Issues

### Port Conflicts
**Problem**: Port 3000/4000 already in use
**Solution**:
```bash
lsof -i :4000
kill -9 <PID>
```

### Missing Environment Variables
**Problem**: Application fails to start
**Solution**: Check `.env.local` has all required variables:
```
DATABASE_URL
JWT_SECRET
ANTHROPIC_API_KEY
```

### Prisma Client Not Generated
**Problem**: Cannot find Prisma client
**Solution**:
```bash
npx prisma generate
```

## UI/UX Issues

### Terminal Scrolling Issues
**Status**: FIXED
**Problem**: Terminal scroll position jumps to top
**Solution**: Implemented intelligent scroll management with user scroll detection

### Duplicate Project Creation
**Problem**: Multiple default projects created on workspace load
**Solution**: Added `isCreatingDefault` flag to prevent race conditions
**Code**: `/src/modules/workspace/contexts/WorkspaceContext.tsx:45`

## Performance Issues

### Slow Initial Page Load
**Problem**: Bundle size too large
**Solution**: 
- Implement code splitting
- Use dynamic imports for heavy components
- Enable Next.js image optimization

### High Memory Usage
**Problem**: Memory leaks in terminal sessions
**Solution**: 
- Proper cleanup in useEffect hooks
- Dispose terminal instances on unmount
- Limit buffer size to 500 lines

## Integration Issues

### Claude CLI Command Fragmentation
**Problem**: Commands split incorrectly in Claude terminal
**Solution**: Enhanced startup sequence with proper ready detection
**File**: `/src/server/websocket/claude-terminal-ws.js`

### API Route 405 Errors
**Problem**: Some routes only support specific methods
**Solution**: Added appropriate method handlers
**Example**: `/src/app/api/ums/auth/login/route.ts`

## Debugging Tips

### Enable Debug Logging
```javascript
// In your code
console.log('[DEBUG]', data);

// Environment variable
DEBUG=* npm run dev
```

### Check Network Tab
1. Open DevTools
2. Go to Network tab
3. Look for failed requests
4. Check response codes and payloads

### Database Issues
```bash
# Check database connection
npx prisma db pull

# Reset database
npx prisma migrate reset

# View in Prisma Studio
npx prisma studio
```

### WebSocket Debugging
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:4001');
ws.onmessage = (e) => console.log(e.data);
ws.send(JSON.stringify({type: 'ping'}));
```

## Reporting New Issues

When reporting issues, include:
1. Error message
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser/OS information
6. Relevant code snippets
7. Console logs