# Common Commands

## Development

### Start Development

```bash
npm run dev              # Start dev server (port 4110)
npm run build           # Build for production
npm run start           # Start production server
./start-v2.sh           # Start with Terminal V2 (recommended)
./start.sh              # Start with legacy terminal
./quick-restart.sh      # Quick restart development
```

### Code Quality

```bash
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # Check TypeScript types
npm run lint:fix        # Auto-fix linting issues
```

## Database

### Prisma Commands

```bash
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio (port 5555)
npx prisma db push      # Push schema changes
npx prisma db pull      # Pull schema from database
npx prisma migrate reset # Reset database
```

### Database Scripts

```bash
npm run db:reset        # Reset database
npm run db:seed         # Seed database
tsx scripts/database/cleanup-and-setup-sankaz.ts  # Setup sankaz user
```

## Testing

### Run Tests

```bash
npm run test            # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run E2E tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

### Terminal V2 Testing

```bash
npx tsx scripts/test-terminal-integration.ts  # Terminal V2 integration tests
npx tsx scripts/load-test-terminal.ts         # Load testing (200+ sessions)

# Environment Variables for Load Testing
NUM_PROJECTS=5                    # Number of test projects
SESSIONS_PER_PROJECT=10          # Sessions per project
MESSAGE_INTERVAL=1000            # Message frequency (ms)
TEST_DURATION=30000              # Test duration (30 seconds)
```

## Git Operations

### Branch Management

```bash
git checkout dev                    # Switch to dev branch
git checkout -b feature/name        # Create feature branch
git branch -d feature/name         # Delete local branch
git push origin --delete branch    # Delete remote branch
```

### Commit & Push

```bash
git add .                          # Stage all changes
git commit -m "feat: description"  # Commit with convention
git push origin feature/name       # Push to remote
git pull --rebase origin main      # Update from main
```

### Stash & Cherry-pick

```bash
git stash                          # Stash changes
git stash pop                      # Apply stashed changes
git cherry-pick <commit-hash>      # Apply specific commit
git revert <commit-hash>           # Revert commit
```

## Scripts

### Utility Scripts

```bash
./scripts/optimize-for-claude.sh          # Optimize for Claude
./scripts/enforce-claudemd-standards.sh   # Check CLAUDE.md compliance
./scripts/split-claude-docs.js           # Split documentation
```

### Deployment Scripts

```bash
./scripts/staging-setup.sh               # Setup staging
./scripts/automated-deployment.sh        # Auto deploy
./scripts/production-deployment.sh       # Production deploy
```

## Terminal V2 System

### Start Terminal V2

```bash
# Progressive Migration (Recommended for Production)
./start-v2.sh --progressive

# New System Only (Full V2)
./start-v2.sh --new

# Dual Mode (Testing Both Systems)
./start-v2.sh --dual

# Legacy Mode Only
./start-v2.sh --legacy
```

### Terminal V2 Operations

```bash
# Health Check
curl http://localhost:4110/api/terminal-v2/migration-status

# Create Session (API)
curl -X POST http://localhost:4110/api/terminal-v2/create \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","projectPath":"/tmp","mode":"normal"}'

# WebSocket Connection
# ws://localhost:4110/ws/terminal-v2?sessionId=<id>&projectId=<project>
```

### Migration Control

```bash
# Environment Variables
TERMINAL_MIGRATION_MODE=progressive  # legacy|dual|new|progressive
TERMINAL_USE_V2=true                # Enable V2 server
USE_NEW_TERMINAL_API=true           # Use new API endpoints

# Check Migration Status
curl http://localhost:4110/api/terminal-v2/migration-status | jq
```

### Terminal Commands (In Session)

```bash
clear                   # Clear terminal
exit                    # Exit session
pwd                     # Current directory
ls -la                  # List files
cd /path                # Change directory

# Terminal V2 specific
echo $TERMINAL_SESSION_ID    # Check session ID
echo $TERMINAL_PROJECT_ID    # Check project ID
```

## Legacy Terminal System

### WebSocket Servers (Backward Compatible)

```bash
# Legacy Terminal (Port 4001)
ws://localhost:4001

# Claude Terminal (Port 4002)
ws://localhost:4002
```

## Package Management

### NPM Commands

```bash
npm install             # Install dependencies
npm install <package>   # Install specific package
npm uninstall <package> # Remove package
npm update              # Update packages
npm outdated            # Check outdated packages
npm audit               # Security audit
npm audit fix           # Fix vulnerabilities
```

### Package Info

```bash
npm ls <package>        # Check package version
npm info <package>      # Package information
npm run                 # List available scripts
```

## Docker (Future)

### Container Management

```bash
docker-compose up       # Start containers
docker-compose down     # Stop containers
docker-compose logs     # View logs
docker-compose build    # Build images
```

## Environment

### Environment Files

```bash
cp .env.example .env.local    # Create local env file
source .env                   # Load environment variables
printenv | grep API           # Check API variables
```

## Debugging

### Process Management

```bash
lsof -i :4110           # Check port usage (main app)
lsof -i :4001           # Check port usage (legacy terminal)
lsof -i :4002           # Check port usage (claude terminal)
kill -9 <PID>           # Kill process
ps aux | grep node      # Find Node processes
netstat -an | grep 4110 # Check network connections
```

### Terminal V2 Debugging

```bash
# Check V2 System Health
curl http://localhost:4110/api/terminal-v2/migration-status

# Monitor WebSocket Connections
ws ws://localhost:4110/ws/terminal-v2?sessionId=test&projectId=test

# Check Service Status
ps aux | grep 'session-manager\|stream-manager\|metrics-collector'

# Memory Usage
node -e "console.log(process.memoryUsage())"
```

### Logs

```bash
tail -f logs/server-*.log          # Follow server logs
grep "Terminal V2" logs/*.log       # Search for V2 logs
grep ERROR logs/*.log              # Search for errors
journalctl -u your-app             # Systemd logs (production)

# Terminal V2 specific logs
grep "session-manager" logs/*.log   # Session management logs
grep "stream-manager" logs/*.log    # Stream management logs
grep "migration" logs/*.log         # Migration logs
```

## Performance Monitoring

### Metrics Collection

```bash
# Prometheus Metrics
curl http://localhost:4110/metrics

# System Metrics
top                     # CPU usage
free -h                 # Memory usage
iostat                  # I/O statistics
```

### Load Testing

```bash
# Basic Load Test
NUM_PROJECTS=3 SESSIONS_PER_PROJECT=5 npx tsx scripts/load-test-terminal.ts

# Heavy Load Test
NUM_PROJECTS=10 SESSIONS_PER_PROJECT=20 TEST_DURATION=60000 npx tsx scripts/load-test-terminal.ts

# Stress Test
NUM_PROJECTS=20 SESSIONS_PER_PROJECT=25 MESSAGE_INTERVAL=100 npx tsx scripts/load-test-terminal.ts
```
