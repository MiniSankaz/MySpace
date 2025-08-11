# CLAUDE.md - AI Assistant Guidelines

## Quick Navigation
- [Project Information](#project-information)
- [Business Logic](#business-logic)
- [Flow/Use Cases](#flowuse-cases)
- [Feature List](#feature-list)
- [File/Module Structure](#filemodule-structure)
- [API/Service List](#apiservice-list)
- [Component/Module/UI List](#componentmoduleui-list)
- [Import Guide](#import-guide)
- [Default SOP](#default-sop)
- [Test Accounts & Credentials](#test-accounts--credentials)
- [Common Commands](#common-commands)
- [Known Issues & Solutions](#known-issues--solutions)
- [Agent Work Log](#agent-work-log)

## Project Information

- **Project Name**: Stock Portfolio Management System
- **Description**: Comprehensive stock portfolio management platform with AI assistant, user management, terminal interface, and page builder
- **Technology Stack**: 
  - Frontend: Next.js 15.4.5, React 19, TypeScript 5.x
  - Backend: Node.js, Express, Socket.io
  - Database: PostgreSQL (DigitalOcean hosted, port 25060)
  - ORM: Prisma 6.2.0
  - AI: Claude API (Anthropic)
  - Styling: TailwindCSS, shadcn/ui
  - Authentication: JWT with refresh tokens
- **URLs**:
  - Development: http://localhost:4000 (main app - NOT 3000)
  - WebSocket Terminal: ws://localhost:4001
  - Claude Terminal: ws://localhost:4002
  - Prisma Studio: http://localhost:5555
- **Repository**: Git repository with branches: main, dev, feature/New-Module
- **Version**: 0.1.0

## Business Logic

### Core Business Rules
- User authentication required for all protected routes under `(auth)`
- Session-based authorization with JWT access and refresh tokens
- AI Assistant maintains conversation history per user and session
- Workspace management with file explorer capabilities
- Role-based access control (Admin, User, Guest roles)
- Rate limiting on API endpoints (100 requests/15 minutes)
- File upload limited to 10MB per file
- AI conversations cached for 15 minutes

### User Roles & Permissions
- **Admin**: Full system access, user management, all features, system configuration
- **User**: Personal workspace, AI assistant, limited admin features
- **Guest**: Read-only access to public content

### Key Business Processes
1. **User Registration**:
   - Email validation required
   - Password complexity enforcement
   - Email verification (optional)
   - Default workspace creation

2. **Session Management**:
   - JWT with 15-minute access token
   - 7-day refresh token
   - Automatic token refresh
   - Secure httpOnly cookies

3. **AI Conversation**:
   - Per-user conversation isolation
   - Session-based chat history
   - Message persistence in database
   - Fallback to cache on DB failure

4. **File Management**:
   - User-scoped workspaces
   - Real-time file sync
   - Version control integration
   - Maximum 100MB per workspace

### Data Flow & State Management
```
Client → API Routes → Middleware → Services → Database
         ↓                ↓           ↓          ↓
      WebSocket      Auth Check   Business   Prisma ORM
                                   Logic
```

## Flow/Use Cases

### Authentication Flow
```mermaid
graph LR
    A[Login Page] --> B[Submit Credentials]
    B --> C[API Validation]
    C --> D{Valid?}
    D -->|Yes| E[Generate Tokens]
    D -->|No| F[Show Error]
    E --> G[Set Cookies]
    G --> H[Redirect to Dashboard]
```

### AI Assistant Flow
1. User opens AI Assistant (`/assistant`)
2. New session ID generated (UUID format)
3. User sends message
4. Message saved to database
5. Claude API processes request
6. Response streamed back
7. Response saved to database
8. Conversation history updated
9. Cache updated for quick retrieval

### Workspace Management Flow
1. User accesses workspace (`/workspace`)
2. File explorer loads directory structure
3. User performs CRUD operations on files
4. Changes persisted to filesystem
5. Git integration tracks changes
6. Real-time updates via WebSocket

### Error Handling Patterns
- API errors return standardized format: `{error: string, code: string}`
- Database failures trigger cache fallback
- Network errors show retry options
- Validation errors display field-specific messages

## Feature List

### Completed Features ✅
- **User Authentication System**: Login, register, logout, session management
- **AI Assistant**: Claude integration with streaming responses
- **Conversation History**: Persistent chat storage and retrieval
- **Dashboard**: Metrics, health checks, recent activity
- **Workspace Explorer**: File/folder CRUD operations
- **Terminal Interface**: Web-based terminal with PTY support
- **User Management System (UMS)**: Admin panel for user control
- **Cache System**: Redis-like in-memory cache with TTL
- **Offline Mode**: LocalStorage fallback for DB unavailability
- **Settings Management**: User preferences persistence
- **API Token Management**: Create, revoke, list API tokens
- **Health Monitoring**: System health checks and metrics

### In Progress 🚧
- **Page Builder**: Visual page construction tool (70% complete)
- **Portfolio Management**: Stock tracking and analysis (40% complete)
- **Real-time Collaboration**: WebRTC-based shared editing (20% complete)

### Planned Features 📋
- **Mobile App**: React Native companion app
- **Advanced Analytics**: Portfolio performance metrics
- **Export/Import**: Data backup and migration
- **Webhooks**: Event-driven integrations
- **Multi-language Support**: i18n implementation
- **2FA Authentication**: Enhanced security

## File/Module Structure

```
port/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/               # Protected routes (requires auth)
│   │   │   ├── assistant/        # AI Assistant UI
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── workspace/        # File management
│   │   │   ├── settings/         # User settings
│   │   │   ├── terminal/         # Web terminal
│   │   │   └── logs/             # System logs
│   │   ├── api/                  # API routes
│   │   │   ├── assistant/        # AI chat endpoints
│   │   │   ├── ums/              # User management
│   │   │   ├── workspace/        # File operations
│   │   │   ├── dashboard/        # Metrics & health
│   │   │   ├── settings/         # Settings CRUD
│   │   │   └── health/           # Health checks
│   │   ├── login/                # Public login page
│   │   └── register/             # Public registration
│   │
│   ├── modules/                  # Feature modules
│   │   ├── i18n/                 # Internationalization
│   │   ├── page-builder/         # Page builder feature
│   │   ├── personal-assistant/   # AI Assistant module
│   │   ├── terminal/             # Terminal interface
│   │   ├── ums/                  # User Management System
│   │   ├── user/                 # User services
│   │   └── workspace/            # Workspace management
│   │
│   ├── services/                 # Business logic services
│   │   ├── claude-*.service.ts  # Claude AI integrations
│   │   ├── dashboard.service.ts # Dashboard operations
│   │   └── [other services]
│   │
│   ├── components/               # Reusable UI components
│   │   └── ui/                   # Basic UI components
│   │
│   ├── core/                     # Core utilities
│   │   ├── auth/                 # Authentication logic
│   │   ├── database/             # Database connections
│   │   ├── security/             # Security utilities
│   │   └── utils/                # General utilities
│   │
│   └── middleware/               # Express/Next.js middleware
│
├── prisma/                       # Database schema and migrations
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
├── _library/                     # Shared library components
└── .claude/                      # Claude agent configurations
    └── agents/                   # Agent definitions
```

### Module Responsibilities
- **i18n**: Language management and translations
- **page-builder**: Visual page construction and templates
- **personal-assistant**: AI chat interface and history
- **terminal**: WebSocket-based terminal emulator
- **ums**: User CRUD operations and authentication
- **workspace**: File management and Git integration

### Naming Conventions
- Components: `PascalCase.tsx`
- Services: `kebab-case.service.ts`
- Utilities: `kebab-case.ts`
- Types: `PascalCase.types.ts`
- Tests: `[filename].test.ts`
- Styles: `[component].module.scss`

## API/Service List

### REST API Endpoints

#### Authentication (`/api/ums/auth`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/login` | User login | No |
| POST | `/register` | User registration | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh` | Refresh access token | No |
| GET | `/session` | Get current session | Yes |
| POST | `/verify-email` | Verify email address | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |

#### User Management (`/api/ums/users`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List all users | Admin |
| GET | `/me` | Get current user | Yes |
| GET | `/:id` | Get user by ID | Admin |
| PUT | `/:id` | Update user | Yes |
| DELETE | `/:id` | Delete user | Admin |
| POST | `/:id/roles` | Assign roles | Admin |

#### AI Assistant (`/api/assistant`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/chat` | Send chat message | Yes |
| GET | `/history` | Get conversation history | Yes |
| GET | `/sessions` | List user sessions | Yes |
| DELETE | `/session/:id` | Delete session | Yes |
| POST | `/export` | Export conversations | Yes |

#### Workspace (`/api/workspace`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/files` | List files/folders | Yes |
| POST | `/files` | Create file/folder | Yes |
| PUT | `/files` | Update file content | Yes |
| DELETE | `/files` | Delete file/folder | Yes |
| POST | `/upload` | Upload file | Yes |
| GET | `/download/:path` | Download file | Yes |

#### Dashboard (`/api/dashboard`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Get dashboard metrics | Yes |
| GET | `/health` | System health check | No |
| GET | `/stats` | User statistics | Yes |
| GET | `/activity` | Recent activity | Yes |

### Services Architecture

#### Core Services
- **claude-direct.service.ts**: Direct Claude API integration
- **claude-enhanced.service.ts**: Enhanced Claude with tools
- **claude-realtime.service.ts**: Real-time Claude streaming
- **dashboard.service.ts**: Dashboard metrics and health
- **cache-manager.ts**: In-memory caching with TTL
- **offline-store.ts**: LocalStorage fallback system
- **connection-manager.ts**: Database connection pooling

#### Module Services
- **user.service.ts**: User CRUD operations
- **auth.service.ts**: Authentication logic
- **conversation-storage.ts**: Chat persistence
- **workspace.service.ts**: File operations
- **pageService.ts**: Page builder logic
- **terminal.service.ts**: Terminal management

## Component/Module/UI List

### Reusable UI Components (`@/components/ui`)
| Component | Import Path | Props | Usage |
|-----------|------------|-------|-------|
| Button | `@/components/ui/button` | `variant, size, disabled` | Primary actions |
| Card | `@/components/ui/card` | `className, children` | Content containers |
| Input | `@/components/ui/input` | `type, placeholder, value` | Form inputs |
| Dialog | `@/components/ui/dialog` | `open, onOpenChange` | Modal dialogs |
| Toast | `@/components/ui/toast` | `title, description` | Notifications |
| Select | `@/components/ui/select` | `options, value` | Dropdowns |
| Table | `@/components/ui/table` | `columns, data` | Data grids |
| Tabs | `@/components/ui/tabs` | `defaultValue, children` | Tab navigation |

### Module Components

#### AI Assistant Components
- **ChatInterfaceWithFolders**: Main chat interface with session management
- **MessageList**: Chat message display
- **MessageInput**: Chat input with file attachments
- **SessionSidebar**: Session history navigation

#### Workspace Components
- **FileExplorer**: File tree navigation
- **FileEditor**: Code/text editor
- **FileUploader**: Drag-and-drop upload
- **PathBreadcrumb**: Current path display

#### Dashboard Components
- **MetricCard**: Single metric display
- **ActivityFeed**: Recent activity list
- **HealthStatus**: System health indicator
- **ChartWidget**: Data visualization

### Layout Components
- **DashboardLayout**: Main app layout with sidebar
- **AuthLayout**: Authentication pages wrapper
- **WorkspaceLayout**: Workspace-specific layout
- **SettingsLayout**: Settings pages layout

## Import Guide

### Services
```typescript
// Core services - use absolute imports
import { DashboardService } from '@/services/dashboard.service';
import { ClaudeDirectService } from '@/services/claude-direct.service';
import { CacheManager } from '@/core/database/cache-manager';

// Module services - use module path
import { UserService } from '@/modules/ums/services/user.service';
import { ConversationStorage } from '@/modules/personal-assistant/services/conversation-storage';
import { WorkspaceService } from '@/modules/workspace/services/workspace.service';
```

### Components
```typescript
// UI components - always from ui folder
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Module components - use full module path
import { ChatInterfaceWithFolders } from '@/modules/personal-assistant/components/ChatInterfaceWithFolders';
import { FileExplorer } from '@/modules/workspace/components/Sidebar/FileExplorer';
import { WebTerminal } from '@/modules/terminal/components/WebTerminal';
```

### Utilities
```typescript
// Core utilities
import { logger } from '@/core/utils/logger';
import { authClient } from '@/core/auth/auth-client';
import { prisma } from '@/core/database/prisma';
import { hashPassword, verifyPassword } from '@/core/security/password';

// Type imports
import type { User, Session } from '@prisma/client';
import type { ApiResponse } from '@/types/api';
```

### Hooks
```typescript
// Custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/use-toast';
```

## Default SOP

### Git Workflow
1. **Branch Strategy**:
   - Production: `main`
   - Development: `dev`
   - Features: `feature/[name]`
   - Fixes: `fix/[name]`
   - Docs: `docs/[name]`

2. **Commit Convention** (Conventional Commits):
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

3. **Pull Request Process**:
   - Create PR from feature to dev
   - At least 1 code review required
   - All tests must pass
   - Update CLAUDE.md if needed
   - Squash merge preferred

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced with pre-commit hooks
- **Prettier**: Auto-format on save
- **File Size**: Maximum 200 lines per file
- **Function Size**: Maximum 50 lines per function
- **Complexity**: Cyclomatic complexity < 10

### Testing Requirements
- **Unit Tests**: Required for all utilities
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for critical user flows
- **Coverage**: Minimum 80% code coverage
- **Test Files**: `*.test.ts` or `*.spec.ts`
- **Test Data**: Use factories and fixtures

### Security Standards
- **Secrets**: Never commit secrets, use environment variables
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use Prisma parameterized queries only
- **XSS Prevention**: Sanitize all outputs
- **CORS**: Configure appropriate origins
- **Rate Limiting**: Implement on all public endpoints
- **Authentication**: Use JWT with refresh tokens
- **Authorization**: Check permissions on every request

### Performance Standards
- **Page Load**: < 3 seconds
- **API Response**: < 500ms
- **Bundle Size**: < 500KB initial
- **Image Optimization**: Use Next.js Image component
- **Caching**: Implement at multiple levels
- **Database Queries**: Use indexes, limit results

## Test Accounts & Credentials

### Admin Accounts
```
Email: sankaz@admin.com
Username: sankaz
Password: Sankaz#3E25167B@2025
Role: Admin (Full access)

Email: admin@example.com
Password: Admin@123
Role: Admin (Default admin)
```

### Test Users
```
Email: user@example.com
Password: User@123
Role: User

Email: test@personalai.com
Password: Test@123
Role: User
```

### API Keys (Reference .env.local)
- `ANTHROPIC_API_KEY`: Claude API access
- `DATABASE_URL`: PostgreSQL connection
- `JWT_SECRET`: Token signing
- `NEXTAUTH_SECRET`: NextAuth encryption

### Create New Test User
```bash
# Run sankaz setup script
tsx scripts/database/cleanup-and-setup-sankaz.ts

# Or create admin manually
tsx scripts/create-admin.ts
```

## Common Commands

### Development
```bash
npm run dev              # Start development server (port 4000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # Check TypeScript types
./quick-restart.sh      # Quick restart development
```

### Database
```bash
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio (port 5555)
npx prisma db push      # Push schema changes
npm run db:reset        # Reset database
npm run db:seed         # Seed database
```

### Testing
```bash
npm run test            # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run E2E tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

### Scripts
```bash
./scripts/optimize-for-claude.sh    # Optimize for Claude
./scripts/enforce-claudemd-standards.sh  # Check CLAUDE.md compliance
tsx scripts/database/cleanup-and-setup-sankaz.ts  # Setup sankaz user
```

### Git Operations
```bash
git checkout dev        # Switch to dev branch
git checkout -b feature/name  # Create feature branch
git add .               # Stage changes
git commit -m "feat: description"  # Commit with convention
git push origin feature/name  # Push to remote
```

## Known Issues & Solutions

### Database Connection Timeouts
- **Problem**: PostgreSQL on DigitalOcean times out intermittently
- **Solution**: Implemented cache manager with 15-minute TTL and offline fallback
- **Workaround**: Restart server or use `./quick-restart.sh`

### Chat History Not Displaying
- **Problem**: Messages not showing after save in AI Assistant
- **Solution**: API returns messages array, frontend uses UUID session IDs
- **Code**: See `/src/app/api/assistant/chat/route.ts:112-120`

### Duplicate Project Creation
- **Problem**: Multiple default projects created on workspace load
- **Solution**: Added `isCreatingDefault` flag to prevent race conditions
- **Code**: See `/src/modules/workspace/contexts/WorkspaceContext.tsx:45`

### Build Errors with TypeScript
- **Problem**: Syntax errors in auth-client.ts
- **Solution**: Fixed orphaned methods outside class, removed duplicate exports
- **File**: `/src/core/auth/auth-client.ts`

### Session Cookie Issues
- **Problem**: Cookies not set in production
- **Solution**: Configure `sameSite` and `secure` flags properly
- **Config**: Check `AUTH_COOKIE_*` environment variables

### WebSocket Connection Failures
- **Problem**: Terminal WebSocket fails to connect
- **Solution**: Ensure ports 4001-4002 are not blocked
- **Test**: `lsof -i :4001` to check port usage

### Terminal Scrolling Issues (FIXED)
- **Problem**: Terminal scroll position jumps to top during interactions, especially in Claude Terminal
- **Root Causes**: 
  - Manual `scrollToBottom()` calls in resize handlers
  - No user scroll detection 
  - Auto-scroll during streaming overwrites user scroll position
- **Solution**: Implemented intelligent scroll management with:
  - User scroll position tracking
  - Conditional auto-scroll (only when user at bottom)
  - Scroll position preservation during window resize
  - MutationObserver for reliable scroll listener attachment
- **Files Fixed**:
  - `/src/modules/workspace/components/Terminal/ClaudeXTermView.tsx`
  - `/src/modules/workspace/components/Terminal/XTermView.tsx` 
  - `/src/modules/terminal/components/WebTerminal.tsx`

## Agent Work Log

### 2025-08-11 04:59 - Terminal Scrolling Fix
**Task**: Fixed Terminal scrolling issue in Claude Terminal interface
**Problem**: Terminal scroll position was jumping to top during interactions, disrupting user experience
**Root Causes Identified**:
- Manual `scrollToBottom()` calls in resize handlers at lines 81, 184 (ClaudeXTermView) and 81, 174 (XTermView)
- No user scroll detection mechanism
- Stream messages causing unwanted auto-scroll regardless of user intent
**Solution Implemented**:
- Added `isUserScrolledUp` state tracking and `scrollPositionRef` for position preservation
- Implemented intelligent scroll behavior: only auto-scroll if user is at bottom (within 10px threshold)
- Enhanced resize handlers to preserve scroll position or maintain bottom scroll appropriately
- Added MutationObserver for reliable scroll event listener attachment to terminal elements
- Conditional auto-scroll in stream handlers based on user scroll state
**Files Modified**:
- `/src/modules/workspace/components/Terminal/ClaudeXTermView.tsx`: Enhanced Claude terminal with smart scrolling
- `/src/modules/workspace/components/Terminal/XTermView.tsx`: Enhanced regular terminal with smart scrolling  
- `/src/modules/terminal/components/WebTerminal.tsx`: Enhanced base terminal component with smart scrolling
**Testing**: Build completed successfully, no TypeScript errors related to terminal components
**Impact**: Terminal experience now smooth without jumping scroll positions, maintains user intent

### 2025-01-11 15:00 - System Update
**Task**: Updated all agents to read and update CLAUDE.md
**Changes**:
- Modified sop-enforcer.md with CLAUDE.md requirements
- Modified dev-life-consultant.md with CLAUDE.md requirements
- Modified devops-maturity-auditor.md with CLAUDE.md requirements
- Created AGENT_TEMPLATE.md for standardization
- Created enforce-claudemd-standards.sh script
- Restructured CLAUDE.md with all required sections
**Issues Found**:
- CLAUDE.md was missing required sections
- Agents were not configured to read project context
**Solutions**:
- Added comprehensive CLAUDE.md management protocol
- Created template for future agent configurations
- Built enforcement script for compliance checking
**Notes**: All agents now must read CLAUDE.md before tasks and update after completion

---

*This document is maintained by AI agents and developers. Last update: 2025-01-11*