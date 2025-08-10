# SOP: System Check and Logging Verification

## 1. Pre-Check Requirements
- [ ] Terminal access
- [ ] Database connection
- [ ] Admin/Developer credentials

## 2. Claude CLI Authentication Check

### 2.1 Check Authentication Status
```bash
# Check Claude version
claude --version

# Check environment variable
echo $ANTHROPIC_API_KEY

# Check config file
cat ~/.claude/config.json 2>/dev/null || echo "No config"

# Test Claude CLI
echo "test" | claude 2>&1 | head -5
```

### 2.2 If Not Authenticated
```bash
# Option 1: Login with account
claude login

# Option 2: Set API key
export ANTHROPIC_API_KEY='your-api-key'

# Option 3: Create config
mkdir -p ~/.claude
echo '{"apiKey": "your-api-key"}' > ~/.claude/config.json
```

## 3. Server and Services Check

### 3.1 Check Running Processes
```bash
# Check main server
ps aux | grep "node server.js" | grep -v grep

# Check ports
lsof -i :4000,4001,4002 | grep LISTEN

# Check server logs
tail -n 50 server.log
```

### 3.2 Health Check
```bash
# API health check
curl http://127.0.0.1:4000/api/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "environment": "development",
#   "checks": { ... }
# }
```

## 4. Database and Logging Verification

### 4.1 Database Connection
```bash
# Test database connection
npx prisma db push --skip-generate

# Check tables
npx prisma studio
```

### 4.2 Check Logging Tables
```sql
-- In Prisma Studio or psql
SELECT COUNT(*) FROM "AssistantConversation";
SELECT COUNT(*) FROM "AssistantMessage";
SELECT COUNT(*) FROM "TerminalLog";
SELECT COUNT(*) FROM "WorkspaceTerminalLog";
```

### 4.3 Fix Database Issues
```bash
# If foreign key errors
npx prisma migrate reset --force
npx prisma migrate dev
npx prisma db seed

# Or create default project
npm run db:seed:simple
```

## 5. WebSocket Servers Check

### 5.1 Test WebSocket Connections
```bash
# Terminal WebSocket (port 4001)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://127.0.0.1:4001/

# Claude Terminal WebSocket (port 4002)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://127.0.0.1:4002/
```

## 6. Assistant UI Testing

### 6.1 Manual UI Test
1. Open http://127.0.0.1:4000/assistant
2. Login if required
3. Send test message: "สวัสดี"
4. Check response

### 6.2 API Test
```bash
# Get session token (after login)
# Then test chat API
curl -X POST http://127.0.0.1:4000/api/assistant/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"message": "test", "sessionId": "test-session"}' | jq .
```

## 7. Logging Flow Verification

### 7.1 Check Assistant Logging
```bash
# Send test message through UI
# Then check logs
tail -f server.log | grep -E "(Claude|Assistant|prisma)"
```

### 7.2 Check Terminal Logging
```bash
# If using terminal feature
# Check WebSocket logs
tail -f server.log | grep -E "(Terminal|WebSocket)"
```

## 8. Troubleshooting Commands

### 8.1 Quick Restart
```bash
./quick-restart.sh
```

### 8.2 Full Restart
```bash
# Kill all processes
pkill -f "node server"

# Clear logs
> server.log

# Start fresh
npm run dev
```

### 8.3 Node Version Issues
```bash
# If Claude CLI has issues with Node v22
nvm use 18
npm install -g @anthropic-ai/claude-code
```

## 9. Monitoring Dashboard

### 9.1 Live Monitoring
```bash
# Terminal 1: Server logs
tail -f server.log

# Terminal 2: Database queries
tail -f server.log | grep prisma

# Terminal 3: API calls
tail -f server.log | grep -E "(GET|POST|PUT|DELETE)"

# Terminal 4: Errors
tail -f server.log | grep -E "(Error|error|ERROR)"
```

## 10. Health Check Script

Create and run automated check:
```bash
./check-system-health.sh
```

## Status Indicators

- ✅ **GREEN**: System fully operational
- 🟡 **YELLOW**: Operational with minor issues
- 🔴 **RED**: Critical issues, immediate action required

## Quick Reference

| Issue | Solution |
|-------|----------|
| Claude not authenticated | `claude login` or set API key |
| Database foreign key error | Run migrations and seed |
| WebSocket connection failed | Check ports 4001, 4002 |
| UI not loading | Check authentication |
| No logging | Check database connection |
| Node.js v22 issues | Switch to Node.js v18 |

## Contact

For critical issues:
- Check logs: `tail -f server.log`
- Database: Prisma Studio
- Debug mode: `DEBUG=* npm run dev`