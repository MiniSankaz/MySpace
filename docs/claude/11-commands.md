# Common Commands

## Development

### Start Development
```bash
npm run dev              # Start dev server (port 4000)
npm run build           # Build for production
npm run start           # Start production server
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

### Terminal Testing
```bash
node scripts/test-terminal-v2.js           # Test Terminal V2
node scripts/test-parallel-terminals.js    # Test parallel terminals
node scripts/test-realtime-terminals.js    # Test real-time streaming
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

## Terminal System

### WebSocket Servers
```bash
# System Terminal (Port 4001)
node src/server/websocket/terminal-ws-standalone.js

# Claude Terminal (Port 4002)
node src/server/websocket/claude-terminal-ws.js
```

### Terminal Commands
```bash
# In terminal session
clear                   # Clear terminal
exit                    # Exit session
pwd                     # Current directory
ls -la                  # List files
cd /path                # Change directory
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
lsof -i :4000           # Check port usage
kill -9 <PID>           # Kill process
ps aux | grep node      # Find Node processes
netstat -an | grep 4000 # Check network connections
```

### Logs
```bash
tail -f logs/app.log    # Follow log file
grep ERROR logs/*.log   # Search for errors
pm2 logs                # PM2 logs (if using PM2)
```