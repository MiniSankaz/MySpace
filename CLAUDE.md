# CLAUDE.md - AI Assistant Guidelines

## Quick Navigation
- [Project Structure](#project-structure)
- [Key Files Mapping](#key-files-mapping)
- [Common Commands](#common-commands)
- [Module-Specific Tests](#module-specific-tests)
- [Troubleshooting Patterns](#troubleshooting-patterns)
- [Project Standards](#project-standards)

## Project Structure

```
port/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/               # Protected routes
│   │   │   └── assistant/        # AI Assistant UI
│   │   ├── api/                  # API routes
│   │   │   ├── assistant/        # Assistant API endpoints
│   │   │   └── ums/              # User Management System API
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   └── dashboard/            # Dashboard page
│   │
│   ├── modules/                  # Feature modules
│   │   ├── i18n/                 # Internationalization
│   │   ├── page-builder/         # Page builder components
│   │   ├── personal-assistant/   # AI Assistant module
│   │   ├── terminal/             # Terminal interface
│   │   ├── ums/                  # User Management System
│   │   └── user/                 # User services
│   │
│   ├── services/                 # Business logic services
│   │   ├── claude-*.service.ts  # Claude AI integrations
│   │   └── [other services]
│   │
│   ├── components/               # Reusable UI components
│   │   └── ui/                   # Basic UI components
│   │
│   ├── core/                     # Core utilities
│   │   ├── auth/                 # Authentication
│   │   ├── database/             # Database connections
│   │   ├── security/             # Security utilities
│   │   └── utils/                # General utilities
│   │
│   └── middleware/               # Express/Next.js middleware
│
├── prisma/                       # Database schema and migrations
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
└── _library/                     # Shared library components
```

## Key Files Mapping

### Authentication & User Management
- **Login System**: `src/app/login/page.tsx`, `src/app/api/ums/auth/login/route.ts`
- **User Service**: `src/modules/ums/services/user.service.ts`
- **Auth Middleware**: `src/middleware/auth.ts`, `src/core/auth/auth-middleware.ts`
- **Session Management**: `src/core/auth/auth.ts`

### AI Assistant
- **Chat Interface**: `src/modules/personal-assistant/components/ChatInterfaceWithFolders.tsx`
- **Claude Service**: `src/services/claude-direct.service.ts`
- **API Endpoints**: `src/app/api/assistant/chat/route.ts`
- **Session Storage**: `src/modules/personal-assistant/services/conversation-storage.ts`

### Database
- **Schema**: `prisma/schema.prisma`
- **Connection**: `src/core/database/prisma.ts`
- **Migrations**: Run `npx prisma migrate dev`

### Page Builder
- **Main Component**: `src/modules/page-builder/components/PageBuilder.tsx`
- **Component Definitions**: `src/modules/page-builder/data/component-definitions.ts`
- **Page Service**: `src/modules/page-builder/services/pageService.ts`

### Terminal
- **Web Terminal**: `src/modules/terminal/components/WebTerminal.tsx`
- **Socket Handler**: `src/modules/terminal/handlers/terminal.socket.ts`

## Common Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # Check TypeScript

# Database
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma client
npx prisma studio       # Open Prisma Studio
npm run db:reset        # Reset database
npm run db:seed         # Seed database

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:e2e        # Run E2E tests

# Scripts
./quick-restart.sh      # Quick restart development
./scripts/optimize-for-claude.sh  # Optimize for Claude Code
```

## Test Accounts

### Admin Account
- **Email**: sankaz@admin.com
- **Username**: sankaz
- **Password**: Sankaz#3E25167B@2025
- **Role**: Admin (Full access)

### Default Admin (from README)
- **Email**: admin@example.com
- **Password**: Admin@123

### Test Users (from seed)
- **Email**: admin@personalai.com
- **Password**: Check seed.ts or run setup script

### Create New Test User
```bash
# Run sankaz setup script (generates new password)
tsx scripts/database/cleanup-and-setup-sankaz.ts

# Or create admin manually
tsx scripts/create-admin.ts
```

## Module-Specific Tests

### User Management System (UMS)
```bash
# Test authentication with sankaz account
curl -X POST http://localhost:4000/api/ums/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sankaz@admin.com","password":"Sankaz#3E25167B@2025"}'

# Test with default admin
curl -X POST http://localhost:4000/api/ums/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# Test user endpoints
npm run test -- src/modules/ums/**/*.test.ts
```

### AI Assistant
```bash
# Test chat API
curl -X POST http://localhost:4000/api/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test-session"}'

# Test assistant module
npm run test -- src/modules/personal-assistant/**/*.test.ts
```

### Page Builder
```bash
# Test page rendering
npm run test -- src/modules/page-builder/**/*.test.ts

# Test component definitions
node -e "const defs = require('./src/modules/page-builder/data/component-definitions.ts'); console.log(defs);"
```

## Troubleshooting Patterns

### Common Issues & Solutions

#### Database Connection Errors
```bash
# Check database URL
cat .env.local | grep DATABASE_URL

# Reset database
npx prisma migrate reset --force

# Generate Prisma client
npx prisma generate
```

#### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm run build

# Check TypeScript errors
npm run typecheck

# Fix ESLint issues
npm run lint -- --fix
```

#### Authentication Issues
```bash
# Check session
curl http://localhost:3000/api/ums/users/me \
  -H "Cookie: [session-cookie]"

# Clear sessions
rm -rf data/sessions/*
```

#### Module Import Errors
```bash
# Check module exports
grep -r "export" src/modules/[module-name]/index.ts

# Verify import paths
npm run build -- --debug
```

### Performance Optimization
```bash
# Analyze bundle size
npm run build && npm run analyze

# Check for circular dependencies
npx madge --circular src/

# Profile runtime performance
NODE_OPTIONS='--inspect' npm run dev
```

## Project Standards

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Implement proper error handling
- Maximum file size: 200 lines

### Git Workflow
- Feature branches from `dev`
- Branch naming: `feature/[feature-name]`, `fix/[bug-name]`
- Conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- PR reviews required before merge
- Squash merge to main

### Testing Requirements
- Unit tests for utilities and services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage
- Test files: `*.test.ts`, `*.spec.ts`

### Documentation Standards
- JSDoc comments for functions
- README.md for each module
- API documentation with examples
- Architecture decision records (ADR)
- Update CLAUDE.md for AI-specific guidance

## Project-Specific Rules

1. **Imports**: Always use absolute imports (`@/` or from `src/`)
2. **Components**: Keep under 200 lines, extract logic to hooks/services
3. **Services**: Business logic in service files, not components
4. **Environment**: Use `.env.local` for development, `.env.production` for production
5. **Logging**: Use `src/core/utils/logger.ts` for consistent logging
6. **Security**: Never commit secrets, use environment variables
7. **Database**: Always use Prisma ORM, no raw SQL
8. **API Routes**: Follow RESTful conventions, use proper HTTP status codes
9. **Error Handling**: Wrap async operations in try-catch blocks
10. **State Management**: Use React hooks for local state, Context for global state

## File Naming Conventions
- Components: `PascalCase.tsx`
- Services: `kebab-case.service.ts`
- Utilities: `kebab-case.ts`
- Types: `PascalCase.types.ts` or in `types/index.ts`
- Tests: `[filename].test.ts` or `[filename].spec.ts`
- Styles: `[component].module.scss` or `[feature].css`

## Quick Start for New Features

1. **Create feature branch**: `git checkout -b feature/[name]`
2. **Generate module**: `npm run generate:module [name]`
3. **Implement feature**: Follow module structure in `src/modules/`
4. **Add tests**: Create `*.test.ts` files
5. **Update documentation**: Add to module README.md
6. **Run checks**: `npm run lint && npm run typecheck && npm run test`
7. **Commit changes**: `git commit -m "feat: [description]"`
8. **Create PR**: Push and create pull request to `dev` branch
## Project Statistics

_Last updated: Fri Aug  8 13:05:48 +07 2025_

- TypeScript files: 140
- JavaScript files: 0
- CSS/SCSS files: 4
- Documentation files: 52
- Total source files: 140

### Module Sizes
- i18n: 11 files
- page-builder: 20 files
- personal-assistant: 23 files
- terminal: 3 files
- ums: 6 files
- user: 4 files
- workspace: 10 files

## Critical Services & Ports

- **Development Server**: http://localhost:4000 (Main app - NOT 3000)
- **WebSocket Terminal**: ws://localhost:4001 (Terminal PTY)
- **Claude Terminal WS**: ws://localhost:4002 (Claude integration)
- **Database**: PostgreSQL on DigitalOcean (port 25060)
- **Prisma Studio**: http://localhost:5555

## Environment Files Priority

1. `.env.local` - Local development (highest priority)
2. `.env.development.local` - Development overrides
3. `.env` - Base configuration
4. `.env.production` - Production settings

## Service Dependencies

### Claude AI Integration
- Requires `ANTHROPIC_API_KEY` in environment
- Multiple service implementations for different use cases
- Session management for conversation persistence
- Background processing for long-running tasks

### Terminal Service
- WebSocket connection on port 4001
- Claude Terminal WebSocket on port 4002
- PTY (pseudo-terminal) support
- Real-time logging and analytics

## AI Agent System

### Available Agents (in .claude/agents/)
- **sop-compliance-guardian**: Validates code changes against SOPs
- **dev-life-consultant**: Development and life management assistance
- **devops-maturity-auditor**: DevOps practices assessment

### Agent Usage
- Agents are triggered via Task tool, not automatic
- Use before commits, creating routes, or when builds fail
- Each agent has specific expertise areas

## Performance Best Practices

1. **File Search**: Use Grep/Glob for specific searches, Agent for complex exploration
2. **Batch Operations**: Run multiple commands in parallel when possible
3. **Context Management**: Provide specific file paths and module names
4. **Testing**: Always run lint and type-check after code changes
5. **Git Operations**: Check SOP compliance before commits

## Security Reminders

- Never commit `.env` files or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Use Prisma parameterized queries only
- Check authentication on all protected routes

## Development Workflow

1. **Start Development**: `npm run dev` or `./quick-restart.sh`
2. **Make Changes**: Follow module structure and conventions
3. **Test Changes**: Run relevant tests and linters
4. **Check SOPs**: Use sop-compliance-guardian agent
5. **Commit**: Use conventional commit messages
6. **Document**: Update CLAUDE.md if adding new patterns
