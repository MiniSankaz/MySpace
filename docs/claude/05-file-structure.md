# File & Module Structure

## Project Root Structure

```
port/
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   ├── modules/                  # Feature modules
│   ├── services/                 # Business logic
│   │   └── terminal-v2/         # Terminal V2 Clean Architecture
│   ├── components/               # Reusable UI
│   ├── config/                   # Configuration files
│   ├── core/                     # Core utilities
│   └── middleware/               # Middleware
├── prisma/                       # Database
│   ├── schema.prisma            # Schema definition
│   └── migrations/              # Migration files
├── scripts/                      # Utility scripts
│   ├── test-terminal-integration.ts  # Terminal V2 tests
│   └── load-test-terminal.ts         # Load testing
├── docs/                         # Documentation
│   ├── claude/                  # Agent documentation
│   └── terminal-v2-architecture.md  # Terminal V2 docs
├── public/                       # Static assets
├── _library/                     # Shared components
├── start-v2.sh                  # Terminal V2 startup script
└── .claude/                      # Agent configs
    └── agents/                  # Agent definitions
```

## App Router Structure

```
src/app/
├── (auth)/                      # Protected routes
│   ├── assistant/               # AI Assistant
│   ├── dashboard/              # Dashboard
│   ├── workspace/              # File management
│   ├── settings/               # User settings
│   ├── terminal/               # Web terminal
│   └── logs/                   # System logs
├── api/                         # API routes
│   ├── assistant/              # AI endpoints
│   ├── ums/                    # User management
│   ├── workspace/              # File operations
│   ├── terminal/               # Legacy Terminal API
│   ├── terminal-v2/            # Terminal V2 API
│   ├── dashboard/              # Metrics API
│   └── health/                 # Health checks
├── login/                       # Public login
└── register/                    # Public register
```

## Module Structure

```
src/modules/
├── i18n/                        # Internationalization
│   ├── locales/                # Translation files
│   └── utils/                  # i18n utilities
├── page-builder/                # Page builder
│   ├── components/             # Builder UI
│   ├── templates/              # Page templates
│   └── services/               # Builder logic
├── personal-assistant/          # AI Assistant
│   ├── components/             # Chat UI
│   ├── services/               # AI services
│   └── utils/                  # AI utilities
├── terminal/                    # Legacy terminal system
│   ├── components/             # Legacy terminal UI
│   ├── services/               # Legacy terminal logic
│   └── types/                  # Type definitions
├── ums/                         # User management
│   ├── components/             # User UI
│   ├── services/               # User services
│   └── types/                  # User types
├── user/                        # User features
│   ├── profile/                # Profile management
│   └── settings/               # User settings
└── workspace/                   # Workspace
    ├── components/             # Workspace UI
    ├── services/               # File services
    └── types/                  # Workspace types
```

## Services Architecture

```
src/services/
├── terminal-v2/                 # Terminal V2 Clean Architecture
│   ├── core/                   # Core services
│   │   ├── session-manager.service.ts    # Session management
│   │   ├── stream-manager.service.ts     # Stream management
│   │   └── metrics-collector.service.ts  # Metrics collection
│   ├── orchestrator/           # Orchestration layer
│   │   └── terminal-orchestrator.service.ts
│   ├── migration/              # Migration system
│   │   ├── migration-service.ts
│   │   └── legacy-adapter.service.ts
│   └── config/                 # Configuration
│       └── terminal.config.ts
├── claude-*.service.ts         # Claude AI services
│   ├── claude-direct           # Direct API
│   ├── claude-enhanced         # With tools
│   └── claude-realtime         # Streaming
├── dashboard.service.ts         # Dashboard logic
├── terminal-*.service.ts        # Legacy terminal services
├── workspace-*.service.ts      # Workspace operations
└── [other services]
```

## Core Utilities

```
src/core/
├── auth/                        # Authentication
│   ├── auth-client.ts         # Client auth
│   └── auth-server.ts         # Server auth
├── database/                    # Database
│   ├── prisma.ts              # Prisma client
│   ├── cache-manager.ts       # Cache logic
│   └── db-manager.ts          # Connection pool
├── security/                    # Security
│   ├── password.ts            # Password utils
│   ├── jwt.ts                 # JWT handling
│   └── sanitize.ts            # Input sanitization
└── utils/                       # General utilities
    ├── logger.ts              # Logging
    ├── date.ts                # Date helpers
    └── format.ts              # Formatters

src/config/
├── terminal.config.ts           # Base terminal config
├── terminal.development.config.ts  # Development config
└── terminal.production.config.ts    # Production config
```

## Naming Conventions

### Files

- Components: `PascalCase.tsx`
- Services: `kebab-case.service.ts`
- Utilities: `kebab-case.ts`
- Types: `PascalCase.types.ts`
- Tests: `[filename].test.ts`
- Styles: `[component].module.scss`

### Directories

- Features: `kebab-case/`
- Components: `PascalCase/` or `kebab-case/`
- Utilities: `kebab-case/`

### Variables & Functions

- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Functions: `camelCase`
- Classes: `PascalCase`
- Interfaces: `PascalCase`
- Types: `PascalCase`
- Enums: `PascalCase`
