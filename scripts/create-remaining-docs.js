#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs', 'claude');

// Create remaining documentation files
const remainingDocs = [
  {
    filename: '06-api-reference.md',
    content: `# API Reference

## Authentication Endpoints

### POST /api/ums/auth/login
Login user with credentials
\`\`\`json
Request: { "email": "string", "password": "string" }
Response: { "success": true, "user": {...}, "token": "..." }
\`\`\`

### POST /api/ums/auth/register
Register new user
\`\`\`json
Request: { "email": "string", "password": "string", "name": "string" }
Response: { "success": true, "user": {...} }
\`\`\`

### POST /api/ums/auth/logout
Logout current user
\`\`\`json
Response: { "success": true }
\`\`\`

### POST /api/ums/auth/refresh
Refresh access token
\`\`\`json
Request: { "refreshToken": "string" }
Response: { "accessToken": "string", "refreshToken": "string" }
\`\`\`

## User Management

### GET /api/ums/users/me
Get current user profile
\`\`\`json
Response: { "user": {...} }
\`\`\`

### PUT /api/ums/users/:id
Update user profile
\`\`\`json
Request: { "name": "string", "email": "string" }
Response: { "success": true, "user": {...} }
\`\`\`

## AI Assistant

### POST /api/assistant/chat
Send message to AI assistant
\`\`\`json
Request: { "message": "string", "sessionId": "string" }
Response: Stream of { "content": "string", "done": boolean }
\`\`\`

### GET /api/assistant/sessions
Get user's chat sessions
\`\`\`json
Response: { "sessions": [...] }
\`\`\`

### GET /api/assistant/sessions/:id
Get specific session history
\`\`\`json
Response: { "messages": [...] }
\`\`\`

## Terminal System

### POST /api/terminal/create
Create new terminal session
\`\`\`json
Request: { "projectId": "string", "type": "system|claude" }
Response: { "sessionId": "string", "wsUrl": "string" }
\`\`\`

### GET /api/terminal/list
List terminal sessions for project
\`\`\`json
Query: ?projectId=string
Response: { "sessions": [...] }
\`\`\`

### PUT /api/terminal/focus
Set focused terminal
\`\`\`json
Request: { "sessionId": "string", "projectId": "string" }
Response: { "success": true }
\`\`\`

### DELETE /api/terminal/close/:sessionId
Close terminal session
\`\`\`json
Response: { "success": true }
\`\`\`

## Workspace

### GET /api/workspace/files
List files in directory
\`\`\`json
Query: ?path=string
Response: { "files": [...] }
\`\`\`

### POST /api/workspace/files
Create file or directory
\`\`\`json
Request: { "path": "string", "type": "file|directory", "content": "string" }
Response: { "success": true }
\`\`\`

### PUT /api/workspace/files
Update file content
\`\`\`json
Request: { "path": "string", "content": "string" }
Response: { "success": true }
\`\`\`

### DELETE /api/workspace/files
Delete file or directory
\`\`\`json
Query: ?path=string
Response: { "success": true }
\`\`\`

## Dashboard

### GET /api/dashboard/stats
Get dashboard statistics
\`\`\`json
Response: { "users": 0, "sessions": 0, "files": 0, ... }
\`\`\`

### GET /api/health
System health check
\`\`\`json
Response: { "status": "healthy", "services": {...} }
\`\`\``
  },
  {
    filename: '07-components-ui.md',
    content: `# Components & UI Guide

## UI Component Library

### Basic Components (shadcn/ui)

| Component | Import | Props | Usage |
|-----------|--------|-------|-------|
| Button | \`@/components/ui/button\` | variant, size, disabled | Actions |
| Card | \`@/components/ui/card\` | className, children | Containers |
| Input | \`@/components/ui/input\` | type, placeholder, value | Forms |
| Dialog | \`@/components/ui/dialog\` | open, onOpenChange | Modals |
| Toast | \`@/components/ui/toast\` | title, description | Notifications |
| Select | \`@/components/ui/select\` | options, value | Dropdowns |
| Table | \`@/components/ui/table\` | columns, data | Data grids |
| Tabs | \`@/components/ui/tabs\` | defaultValue, children | Navigation |

### Terminal Components

#### TerminalContainerV2
Main terminal container with split screen support
\`\`\`tsx
import TerminalContainerV2 from '@/modules/workspace/components/Terminal/TerminalContainerV2';

<TerminalContainerV2 project={project} />
\`\`\`

#### XTermViewV2
Terminal view component
\`\`\`tsx
import XTermViewV2 from '@/modules/workspace/components/Terminal/XTermViewV2';

<XTermViewV2 
  sessionId={sessionId}
  projectId={projectId}
  type="system|claude"
  isFocused={true}
/>
\`\`\`

### AI Assistant Components

#### ChatInterfaceWithFolders
Main chat interface with session management
\`\`\`tsx
import { ChatInterfaceWithFolders } from '@/modules/personal-assistant/components/ChatInterfaceWithFolders';

<ChatInterfaceWithFolders userId={userId} />
\`\`\`

### Workspace Components

#### FileExplorer
File tree navigation component
\`\`\`tsx
import { FileExplorer } from '@/modules/workspace/components/Sidebar/FileExplorer';

<FileExplorer 
  projectPath={path}
  onFileSelect={handleFileSelect}
/>
\`\`\`

## UI Design System

### Color Palette

#### Primary Colors
- Blue: \`from-blue-500 to-blue-600\`
- Purple: \`from-purple-500 to-purple-600\`
- Emerald: \`from-emerald-500 to-green-500\`

#### Neutral Colors
- Background: \`bg-gray-900\`
- Surface: \`bg-gray-800\`
- Border: \`border-gray-700\`
- Text: \`text-gray-300\`

### Glass Morphism Effects
\`\`\`css
/* Glass effect */
.glass {
  @apply bg-gray-800/95 backdrop-blur-xl border-gray-700/50;
}

/* Glass with gradient */
.glass-gradient {
  @apply bg-gradient-to-br from-gray-800/95 to-slate-800/95 backdrop-blur-xl;
}
\`\`\`

### Animation Classes

#### Hover Effects
\`\`\`css
.hover-lift {
  @apply hover:scale-105 transition-transform duration-200;
}

.hover-glow {
  @apply hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200;
}
\`\`\`

#### Loading States
\`\`\`css
.pulse-glow {
  @apply animate-pulse shadow-lg shadow-green-400/50;
}

.spin-slow {
  @apply animate-spin animation-duration-3000;
}
\`\`\`

## Layout Patterns

### Split Screen Layout
\`\`\`tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={50}>
    {/* Left content */}
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={50}>
    {/* Right content */}
  </Panel>
</PanelGroup>
\`\`\`

### Dashboard Layout
\`\`\`tsx
<DashboardLayout>
  <DashboardHeader />
  <DashboardSidebar />
  <DashboardContent>
    {children}
  </DashboardContent>
</DashboardLayout>
\`\`\`

## Best Practices

### Component Structure
1. Use TypeScript interfaces for props
2. Export types separately
3. Use default exports for pages
4. Use named exports for components

### State Management
1. Use useState for local state
2. Use useReducer for complex state
3. Use Zustand for global state
4. Use React Query for server state

### Performance
1. Use React.memo for expensive components
2. Use useMemo for expensive calculations
3. Use useCallback for stable callbacks
4. Use lazy loading for heavy components`
  },
  {
    filename: '08-import-guide.md',
    content: `# Import Guide

## Services

### Core Services
\`\`\`typescript
// Dashboard service
import { DashboardService } from '@/services/dashboard.service';

// Claude AI services
import { ClaudeDirectService } from '@/services/claude-direct.service';
import { ClaudeEnhancedService } from '@/services/claude-enhanced.service';
import { ClaudeRealtimeService } from '@/services/claude-realtime.service';

// Terminal service
import { TerminalService } from '@/services/terminal.service';

// Cache manager
import { CacheManager } from '@/core/database/cache-manager';
\`\`\`

### Module Services
\`\`\`typescript
// User services
import { UserService } from '@/modules/ums/services/user.service';
import { AuthService } from '@/modules/ums/services/auth.service';

// AI Assistant services
import { ConversationStorage } from '@/modules/personal-assistant/services/conversation-storage';

// Workspace services
import { WorkspaceService } from '@/modules/workspace/services/workspace.service';
\`\`\`

## Components

### UI Components
\`\`\`typescript
// Basic UI components (always from ui folder)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from '@/components/ui/select';
\`\`\`

### Module Components
\`\`\`typescript
// AI Assistant components
import { ChatInterfaceWithFolders } from '@/modules/personal-assistant/components/ChatInterfaceWithFolders';

// Terminal components
import TerminalContainerV2 from '@/modules/workspace/components/Terminal/TerminalContainerV2';
import XTermViewV2 from '@/modules/workspace/components/Terminal/XTermViewV2';

// Workspace components
import { FileExplorer } from '@/modules/workspace/components/Sidebar/FileExplorer';
import { WorkspaceLayout } from '@/modules/workspace/components/Layout/WorkspaceLayout';
\`\`\`

## Utilities

### Core Utilities
\`\`\`typescript
// Logger
import { logger } from '@/core/utils/logger';

// Authentication
import { authClient } from '@/core/auth/auth-client';
import { verifyAuth } from '@/middleware/auth';

// Database
import { prisma } from '@/core/database/prisma';
import { DBManager } from '@/core/database/db-manager';

// Security
import { hashPassword, verifyPassword } from '@/core/security/password';
import { generateJWT, verifyJWT } from '@/core/security/jwt';
\`\`\`

### Type Imports
\`\`\`typescript
// Prisma types
import type { User, Session, Project } from '@prisma/client';

// Custom types
import type { ApiResponse } from '@/types/api';
import type { TerminalSession } from '@/modules/workspace/types/terminal';
import type { WorkspaceProject } from '@/modules/workspace/types/workspace';
\`\`\`

## Hooks

### Custom Hooks
\`\`\`typescript
// Authentication hook
import { useAuth } from '@/hooks/useAuth';

// WebSocket hook
import { useWebSocket } from '@/hooks/useWebSocket';

// Toast notifications
import { useToast } from '@/components/ui/use-toast';

// Terminal store
import { useTerminalStore } from '@/modules/workspace/stores/terminal.store';
\`\`\`

## Icons

### Lucide Icons
\`\`\`typescript
import { 
  Terminal, 
  Plus, 
  X, 
  Settings, 
  User,
  FileText,
  Folder,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
\`\`\`

## Environment Variables

### Client-side (NEXT_PUBLIC_*)
\`\`\`typescript
// Available in browser
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
\`\`\`

### Server-side
\`\`\`typescript
// Only available on server
const dbUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const claudeApiKey = process.env.ANTHROPIC_API_KEY;
\`\`\`

## Path Aliases

### Configured Aliases
\`\`\`json
{
  "@/*": ["src/*"],
  "@/components/*": ["src/components/*"],
  "@/modules/*": ["src/modules/*"],
  "@/services/*": ["src/services/*"],
  "@/core/*": ["src/core/*"],
  "@/hooks/*": ["src/hooks/*"],
  "@/types/*": ["src/types/*"],
  "@/utils/*": ["src/utils/*"]
}
\`\`\`

## Import Order Convention

\`\`\`typescript
// 1. React/Next.js imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import { z } from 'zod';

// 3. UI components
import { Button } from '@/components/ui/button';

// 4. Module components
import { TerminalContainer } from '@/modules/terminal/components';

// 5. Services and utilities
import { TerminalService } from '@/services/terminal.service';
import { logger } from '@/core/utils/logger';

// 6. Types
import type { TerminalSession } from '@/types/terminal';

// 7. Styles
import styles from './Component.module.css';
\`\`\``
  },
  {
    filename: '09-sops-standards.md',
    content: `# SOPs & Standards

## Git Workflow

### Branch Strategy
- **Production**: \`main\`
- **Development**: \`dev\`
- **Features**: \`feature/[name]\`
- **Fixes**: \`fix/[name]\`
- **Docs**: \`docs/[name]\`

### Commit Convention (Conventional Commits)
\`\`\`
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
perf: Improve performance
\`\`\`

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
\`\`\`json
{
  "no-console": "warn",
  "no-unused-vars": "error",
  "prefer-const": "error",
  "no-var": "error"
}
\`\`\`

### Prettier Config
\`\`\`json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
\`\`\`

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
- Document known issues`
  },
  {
    filename: '10-credentials.md',
    content: `# Test Accounts & Credentials

## Admin Accounts

### Primary Admin
\`\`\`
Email: sankaz@example.com
Username: sankaz
Password: Sankaz#3E25167B@2025
Role: Admin (Full access)
\`\`\`

### Secondary Admin
\`\`\`
Email: admin@example.com
Password: Admin@123
Role: Admin (Default admin)
\`\`\`

## Test User Accounts

### Standard User
\`\`\`
Email: user@example.com
Password: User@123
Role: User
\`\`\`

### Test User
\`\`\`
Email: test@personalai.com
Password: Test@123
Role: User
\`\`\`

## API Keys (Reference .env.local)

### Claude API
\`\`\`
ANTHROPIC_API_KEY=sk-ant-...
\`\`\`

### Database Connection
\`\`\`
DATABASE_URL=postgresql://user:pass@host:25060/dbname
\`\`\`

### JWT Secrets
\`\`\`
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
\`\`\`

### NextAuth
\`\`\`
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=your-nextauth-secret
\`\`\`

## Service URLs

### Development
\`\`\`
Main App: http://localhost:4000
Terminal WS: ws://localhost:4001
Claude WS: ws://localhost:4002
Prisma Studio: http://localhost:5555
\`\`\`

### Database
\`\`\`
Host: db-postgresql-sgp1-xxxxx.ondigitalocean.com
Port: 25060
Database: defaultdb
SSL Mode: require
\`\`\`

## Create New Test User

### Using Script
\`\`\`bash
# Run sankaz setup script
tsx scripts/database/cleanup-and-setup-sankaz.ts

# Create admin manually
tsx scripts/create-admin.ts
\`\`\`

### Manual SQL
\`\`\`sql
INSERT INTO "User" (email, password, role, name)
VALUES ('test@example.com', 'hashed_password', 'USER', 'Test User');
\`\`\`

## SSH/Server Access

### Development Server
\`\`\`
Host: localhost
Port: 22
User: developer
Key: ~/.ssh/id_rsa
\`\`\`

### Production Server
\`\`\`
Host: [Contact DevOps]
Port: [Contact DevOps]
User: [Contact DevOps]
Key: [Contact DevOps]
\`\`\`

## Third-party Services

### GitHub
\`\`\`
Organization: [Your Org]
Repository: stock-portfolio-system
Branch: main, dev, feature/*
\`\`\`

### Monitoring
\`\`\`
Service: [TBD]
Dashboard: [TBD]
API Key: [TBD]
\`\`\`

## Security Notes

1. **Never commit credentials** to git
2. **Use environment variables** for all secrets
3. **Rotate passwords** regularly
4. **Use different passwords** for each environment
5. **Enable 2FA** where possible
6. **Audit access logs** regularly`
  },
  {
    filename: '11-commands.md',
    content: `# Common Commands

## Development

### Start Development
\`\`\`bash
npm run dev              # Start dev server (port 4000)
npm run build           # Build for production
npm run start           # Start production server
./quick-restart.sh      # Quick restart development
\`\`\`

### Code Quality
\`\`\`bash
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # Check TypeScript types
npm run lint:fix        # Auto-fix linting issues
\`\`\`

## Database

### Prisma Commands
\`\`\`bash
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio (port 5555)
npx prisma db push      # Push schema changes
npx prisma db pull      # Pull schema from database
npx prisma migrate reset # Reset database
\`\`\`

### Database Scripts
\`\`\`bash
npm run db:reset        # Reset database
npm run db:seed         # Seed database
tsx scripts/database/cleanup-and-setup-sankaz.ts  # Setup sankaz user
\`\`\`

## Testing

### Run Tests
\`\`\`bash
npm run test            # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run E2E tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
\`\`\`

### Terminal Testing
\`\`\`bash
node scripts/test-terminal-v2.js           # Test Terminal V2
node scripts/test-parallel-terminals.js    # Test parallel terminals
node scripts/test-realtime-terminals.js    # Test real-time streaming
\`\`\`

## Git Operations

### Branch Management
\`\`\`bash
git checkout dev                    # Switch to dev branch
git checkout -b feature/name        # Create feature branch
git branch -d feature/name         # Delete local branch
git push origin --delete branch    # Delete remote branch
\`\`\`

### Commit & Push
\`\`\`bash
git add .                          # Stage all changes
git commit -m "feat: description"  # Commit with convention
git push origin feature/name       # Push to remote
git pull --rebase origin main      # Update from main
\`\`\`

### Stash & Cherry-pick
\`\`\`bash
git stash                          # Stash changes
git stash pop                      # Apply stashed changes
git cherry-pick <commit-hash>      # Apply specific commit
git revert <commit-hash>           # Revert commit
\`\`\`

## Scripts

### Utility Scripts
\`\`\`bash
./scripts/optimize-for-claude.sh          # Optimize for Claude
./scripts/enforce-claudemd-standards.sh   # Check CLAUDE.md compliance
./scripts/split-claude-docs.js           # Split documentation
\`\`\`

### Deployment Scripts
\`\`\`bash
./scripts/staging-setup.sh               # Setup staging
./scripts/automated-deployment.sh        # Auto deploy
./scripts/production-deployment.sh       # Production deploy
\`\`\`

## Terminal System

### WebSocket Servers
\`\`\`bash
# System Terminal (Port 4001)
node src/server/websocket/terminal-ws-standalone.js

# Claude Terminal (Port 4002)
node src/server/websocket/claude-terminal-ws.js
\`\`\`

### Terminal Commands
\`\`\`bash
# In terminal session
clear                   # Clear terminal
exit                    # Exit session
pwd                     # Current directory
ls -la                  # List files
cd /path                # Change directory
\`\`\`

## Package Management

### NPM Commands
\`\`\`bash
npm install             # Install dependencies
npm install <package>   # Install specific package
npm uninstall <package> # Remove package
npm update              # Update packages
npm outdated            # Check outdated packages
npm audit               # Security audit
npm audit fix           # Fix vulnerabilities
\`\`\`

### Package Info
\`\`\`bash
npm ls <package>        # Check package version
npm info <package>      # Package information
npm run                 # List available scripts
\`\`\`

## Docker (Future)

### Container Management
\`\`\`bash
docker-compose up       # Start containers
docker-compose down     # Stop containers
docker-compose logs     # View logs
docker-compose build    # Build images
\`\`\`

## Environment

### Environment Files
\`\`\`bash
cp .env.example .env.local    # Create local env file
source .env                   # Load environment variables
printenv | grep API           # Check API variables
\`\`\`

## Debugging

### Process Management
\`\`\`bash
lsof -i :4000           # Check port usage
kill -9 <PID>           # Kill process
ps aux | grep node      # Find Node processes
netstat -an | grep 4000 # Check network connections
\`\`\`

### Logs
\`\`\`bash
tail -f logs/app.log    # Follow log file
grep ERROR logs/*.log   # Search for errors
pm2 logs                # PM2 logs (if using PM2)
\`\`\``
  },
  {
    filename: '12-known-issues.md',
    content: `# Known Issues & Solutions

## Critical Issues

### WebSocket Terminal Reconnection Loop ⚠️
**Status**: FIXED (2025-08-11)
**Problem**: Terminal WebSocket connections enter infinite reconnection loops
**Solution**: 
- Implemented Circuit Breaker pattern
- Standardized session ID format: \`session_{timestamp}_{random}\`
- Added exponential backoff for reconnections
**Workaround**: System has circuit breaker protection to prevent runaway loops

### Database Connection Timeouts
**Status**: MITIGATED
**Problem**: PostgreSQL on DigitalOcean times out intermittently
**Solution**: 
- Implemented cache manager with 15-minute TTL
- Added offline fallback with LocalStorage
**Workaround**: Restart server or use \`./quick-restart.sh\`

## Common Issues

### Chat History Not Displaying
**Problem**: Messages not showing after save in AI Assistant
**Cause**: API returns messages array, frontend uses UUID session IDs
**Solution**: Check \`/src/app/api/assistant/chat/route.ts:112-120\`
**Fix**: Ensure session ID format consistency

### Build Errors with TypeScript
**Problem**: Syntax errors in auth-client.ts
**Solution**: Fixed orphaned methods outside class, removed duplicate exports
**File**: \`/src/core/auth/auth-client.ts\`

### Session Cookie Issues
**Problem**: Cookies not set in production
**Solution**: Configure \`sameSite\` and \`secure\` flags properly
**Config**: Check \`AUTH_COOKIE_*\` environment variables

### Terminal Session Creation Authentication Error
**Problem**: "authClient.getCurrentUser is not a function"
**Solution**: Use \`verifyAuth(request)\` from middleware instead
**File**: \`/src/app/api/workspace/projects/[id]/terminals/route.ts\`

## Environment-Specific Issues

### Port Conflicts
**Problem**: Port 3000/4000 already in use
**Solution**:
\`\`\`bash
lsof -i :4000
kill -9 <PID>
\`\`\`

### Missing Environment Variables
**Problem**: Application fails to start
**Solution**: Check \`.env.local\` has all required variables:
\`\`\`
DATABASE_URL
JWT_SECRET
ANTHROPIC_API_KEY
\`\`\`

### Prisma Client Not Generated
**Problem**: Cannot find Prisma client
**Solution**:
\`\`\`bash
npx prisma generate
\`\`\`

## UI/UX Issues

### Terminal Scrolling Issues
**Status**: FIXED
**Problem**: Terminal scroll position jumps to top
**Solution**: Implemented intelligent scroll management with user scroll detection

### Duplicate Project Creation
**Problem**: Multiple default projects created on workspace load
**Solution**: Added \`isCreatingDefault\` flag to prevent race conditions
**Code**: \`/src/modules/workspace/contexts/WorkspaceContext.tsx:45\`

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
**File**: \`/src/server/websocket/claude-terminal-ws.js\`

### API Route 405 Errors
**Problem**: Some routes only support specific methods
**Solution**: Added appropriate method handlers
**Example**: \`/src/app/api/ums/auth/login/route.ts\`

## Debugging Tips

### Enable Debug Logging
\`\`\`javascript
// In your code
console.log('[DEBUG]', data);

// Environment variable
DEBUG=* npm run dev
\`\`\`

### Check Network Tab
1. Open DevTools
2. Go to Network tab
3. Look for failed requests
4. Check response codes and payloads

### Database Issues
\`\`\`bash
# Check database connection
npx prisma db pull

# Reset database
npx prisma migrate reset

# View in Prisma Studio
npx prisma studio
\`\`\`

### WebSocket Debugging
\`\`\`javascript
// In browser console
const ws = new WebSocket('ws://localhost:4001');
ws.onmessage = (e) => console.log(e.data);
ws.send(JSON.stringify({type: 'ping'}));
\`\`\`

## Reporting New Issues

When reporting issues, include:
1. Error message
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser/OS information
6. Relevant code snippets
7. Console logs`
  },
  {
    filename: '13-agent-guidelines.md',
    content: `# Agent Guidelines & Best Practices

## Working with AI Agents

### Core Principles
1. **Trust but Verify** - Always verify agent outputs
2. **Atomic Tasks** - Break work into small, verifiable units
3. **Clear Context** - Provide specific, detailed instructions
4. **Progress Tracking** - Use TodoWrite for task management
5. **Documentation** - Update CLAUDE.md after significant changes

## Known Agent Issues

### 1. Development Planner Overconfidence
**Problem**: Agent claims tasks complete without creating files
**Symptom**: "✅ API routes created" but files don't exist
**Root Cause**: Context limitations, hallucination, incomplete tool usage
**Solution**: Always verify with Code Reviewer after Development Planner

### 2. Context Length Limitations
**Problem**: Agents may "forget" earlier steps in long tasks
**Solution**: Break work into smaller phases, verify each phase

### 3. Hallucination Risk
**Problem**: Agents may imagine they've completed tasks
**Solution**: Use "Trust but Verify" approach

## Recommended Agent Workflow

### ❌ BAD Pattern:
\`\`\`
User: "Develop complete system with 5 phases"
Development Planner: "✅ All 5 phases complete!" 
[Reality: Only 2 phases done, API routes missing]
\`\`\`

### ✅ GOOD Pattern:
\`\`\`
User: "Create Phase 1: API routes"
Development Planner: [Creates files]
User: "Code review Phase 1"
Code Reviewer: [Verifies files exist and work]
User: "Continue with Phase 2"
\`\`\`

## Agent Usage Guidelines

### Task Decomposition
- Maximum 3-5 files per agent task
- Verify completion before next task
- Define clear success criteria

### Verification Chain
\`\`\`
Plan (BA) → Execute (Dev) → Verify (Code Review) → Test
\`\`\`

### Clear Success Criteria
- Define what "done" means explicitly
- Include file paths that should exist
- Specify tests that should pass

### Use Multiple Agents
- **business-analyst**: Analyze and plan
- **development-planner**: Implement
- **code-reviewer**: Verify
- **sop-enforcer**: Ensure standards
- **dev-life-consultant**: Holistic view

### Track Progress
- Use TodoWrite for task tracking
- Update after EACH completed task
- Don't mark complete until verified

## Agent-Specific Notes

### business-analyst
- Good at planning, not execution
- Use for requirements gathering
- Excellent for gap analysis

### development-planner
- May claim false completions
- Always verify outputs
- Good for structured implementation

### code-reviewer
- Most reliable for verification
- Thorough analysis
- Good at finding issues

### sop-enforcer
- Good for standards compliance
- May be overly strict
- Use for final checks

### dev-life-consultant
- Good for holistic view
- Balances technical and business
- Helpful for prioritization

## Best Practices

### 1. Start with Business Analyst
\`\`\`
"Analyze requirements for [feature]"
→ Get clear plan
→ Break into phases
\`\`\`

### 2. Implement with Development Planner
\`\`\`
"Implement Phase 1 from the plan"
→ Create specific files
→ Small, verifiable chunks
\`\`\`

### 3. Verify with Code Reviewer
\`\`\`
"Review the implementation of Phase 1"
→ Check files exist
→ Verify functionality
→ Identify issues
\`\`\`

### 4. Enforce Standards with SOP Enforcer
\`\`\`
"Check if implementation follows SOPs"
→ Ensure compliance
→ Fix violations
\`\`\`

## Communication Tips

### Be Specific
❌ "Build the feature"
✅ "Create REST API endpoint POST /api/users that accepts {name, email} and returns {id, name, email}"

### Include Context
❌ "Fix the bug"
✅ "Fix the terminal reconnection loop issue in XTermView.tsx where sessions disconnect after 30 seconds"

### Define Success
❌ "Make it work"
✅ "Ensure all tests pass and the terminal stays connected for at least 5 minutes"

## Common Pitfalls

### 1. Assuming File Creation
Always verify files were actually created

### 2. Skipping Verification
Never skip the Code Reviewer step

### 3. Large Tasks
Break everything into smaller pieces

### 4. Vague Instructions
Be extremely specific

### 5. Not Using TodoWrite
Always track multi-step tasks

## Emergency Procedures

### If Agent Gets Stuck
1. Stop current task
2. Clear context with new conversation
3. Start with smaller task
4. Provide more specific instructions

### If Agent Produces Wrong Output
1. Don't try to fix in same conversation
2. Start fresh with correct instructions
3. Be more explicit about requirements

### If Agent Claims False Success
1. Use Code Reviewer to verify
2. List specific files to check
3. Ask for proof (show file contents)`
  },
  {
    filename: '14-agent-worklog.md',
    content: `# Agent Work Log

## 2025-08-11

### 23:00 - CLAUDE.md Documentation Reorganization
**Agent**: Human + Assistant
**Task**: Split heavy CLAUDE.md (2059 lines) into modular documentation
**Actions**:
- Created new index-based CLAUDE.md (104 lines)
- Split documentation into 14 separate files in /docs/claude/
- Created automated split scripts
- Organized by topic: project info, business logic, APIs, components, etc.
**Impact**: 95% reduction in main file size, improved agent efficiency

### 21:00 - Terminal V2 UI Modernization
**Agent**: Assistant with Code Reviewer
**Task**: Improve Terminal V2 UI that looked too plain
**Changes**:
- Added gradient backgrounds and glass morphism effects
- Implemented modern button styles with hover animations
- Enhanced tab design with gradient colors
- Updated modal with spring animations
- Added split view panel enhancements
**Result**: UI now comparable to VS Code Terminal, iTerm2, and Hyper

### 20:30 - Terminal V2 Split Screen Implementation
**Agent**: Assistant
**Task**: Add split screen UI menu like V1
**Implementation**:
- Added layout controls (single, horizontal, vertical, grid)
- Implemented PanelGroup with resizable panels
- Added maximize/minimize functionality
- Created separate panels for system and Claude terminals
**Files Modified**: TerminalContainerV2.tsx

### 16:00 - Terminal V2 Environment Verification
**Agent**: Assistant
**Task**: Verify Terminal V2 uses .env from project path
**Findings**:
- Confirmed terminal-ws-standalone.js loads .env files from workingDir
- Files loaded: .env, .env.local, .env.development, .env.production
- Project path correctly passed from frontend
**Status**: Working correctly

## Previous Work (From Original CLAUDE.md)

### Terminal System Major Fixes
- Fixed infinite WebSocket reconnection loops with Circuit Breaker
- Standardized session ID format: session_{timestamp}_{random}
- Implemented focus-based streaming (60% CPU reduction)
- Fixed parallel terminal background processing
- Enhanced real-time streaming for multiple terminals

### Production Deployment
- Successfully deployed to production environment
- Achieved 39x performance improvement (2.59ms vs 100ms target)
- 100% reliability with zero failures
- Phased rollout completed successfully

### Knowledge Base Development
- Created comprehensive development plan
- Designed database schema with 8 main tables
- Planned 3-phase implementation
- Prepared for Sprint 1 implementation

## Key Achievements Summary

### Performance Improvements
- 60% CPU reduction through focus-based streaming
- 95% reduction in CLAUDE.md file size
- 39x better response time than requirements
- 85% architecture simplification

### System Reliability
- 100% uptime achieved
- Zero critical errors in production
- Circuit breaker prevents cascade failures
- Graceful degradation implemented

### UI/UX Enhancements
- Modern glass morphism design
- Smooth animations with Framer Motion
- Responsive split screen layouts
- Professional color schemes and gradients

## Metrics & Impact

### Code Quality
- 95/100 Terminal System code review score
- 92/100 Production readiness assessment
- 98/100 Deployment confidence score

### Business Value
- 300%+ ROI through improved productivity
- 80% reduction in support tickets
- 60% improvement in developer efficiency

## Lessons Learned

### What Worked Well
1. Breaking tasks into atomic units
2. Using multiple agents for verification
3. Comprehensive testing before deployment
4. Documentation-first approach
5. Incremental improvements

### Areas for Improvement
1. Agent task size management
2. Earlier performance testing
3. More frequent documentation updates
4. Better error message clarity
5. Automated testing coverage

## Notes for Future Agents

1. **Always read CLAUDE.md index first** - Don't load all documentation
2. **Verify file creation** - Agents may claim false success
3. **Use TodoWrite** - Track all multi-step tasks
4. **Test incrementally** - Don't wait until end
5. **Update documentation** - Keep CLAUDE.md current
6. **Check known issues** - Before debugging
7. **Follow SOPs** - Maintain code standards

---
*Last Updated: 2025-08-11 23:00*`
  }
];

// Create all files
remainingDocs.forEach(doc => {
  const filePath = path.join(docsDir, doc.filename);
  fs.writeFileSync(filePath, doc.content, 'utf8');
  console.log(`✅ Created: ${doc.filename}`);
});

console.log('\n📚 All documentation files created successfully!');
console.log(`📁 Total files in ${docsDir}:`, fs.readdirSync(docsDir).length);