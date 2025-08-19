#!/usr/bin/env node

/**
 * Script to split CLAUDE.md documentation into separate files
 * This helps reduce the main file size and improves agent efficiency
 */

const fs = require("fs");
const path = require("path");

const docsDir = path.join(__dirname, "..", "docs", "claude");

// Ensure directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Documentation files to create
const docFiles = [
  {
    filename: "03-workflows.md",
    title: "Workflows & Use Cases",
    content: `# Workflows & Use Cases

## Authentication Flow

### Login Process
\`\`\`mermaid
graph LR
    A[Login Page] --> B[Submit Credentials]
    B --> C[API Validation]
    C --> D{Valid?}
    D -->|Yes| E[Generate Tokens]
    D -->|No| F[Show Error]
    E --> G[Set Cookies]
    G --> H[Redirect to Dashboard]
\`\`\`

### Token Refresh Flow
1. Access token expires (15 minutes)
2. Client sends refresh token
3. Server validates refresh token
4. New access token generated
5. Continue session seamlessly

## AI Assistant Workflow

### Conversation Lifecycle
1. User opens AI Assistant (/assistant)
2. New session ID generated (UUID format)
3. User sends message
4. Message saved to database
5. Claude API processes request
6. Response streamed back
7. Response saved to database
8. Conversation history updated
9. Cache updated for quick retrieval

### Message Processing
- Input validation
- Context window management
- Token counting
- Rate limiting check
- Claude API call
- Stream processing
- Error handling
- Response formatting

## Workspace Management Flow

### File Operations
1. User accesses workspace (/workspace)
2. File explorer loads directory structure
3. User performs CRUD operations on files
4. Changes persisted to filesystem
5. Git integration tracks changes
6. Real-time updates via WebSocket

### Project Management
- Create new project
- Load existing project
- Switch between projects
- Delete project
- Archive project
- Share project (planned)

## Terminal Workflow

### Session Creation
1. User opens terminal
2. Project path determined
3. WebSocket connection established
4. PTY process spawned
5. Shell initialized with environment
6. Session persisted to database

### Terminal Interaction
- Command input
- Output streaming
- Session persistence
- Background processing
- Tab management
- Split screen views

## Error Handling Patterns

### API Errors
- Standardized format: \`{error: string, code: string}\`
- HTTP status codes
- User-friendly messages
- Logging for debugging
- Retry mechanisms

### Database Failures
- Cache fallback
- In-memory storage
- Graceful degradation
- Auto-recovery
- User notification

### Network Errors
- Retry with exponential backoff
- Circuit breaker pattern
- Offline mode activation
- Queue for later sync
- User feedback`,
  },
  {
    filename: "04-features.md",
    title: "Features",
    content: `# Features

## ✅ Completed Features

### User Authentication System
- Login, register, logout functionality
- JWT-based session management
- Refresh token mechanism
- Secure cookie storage
- Password reset flow
- Email verification (optional)

### AI Assistant
- Claude API integration
- Streaming responses
- Conversation history
- Session management
- Context preservation
- Error recovery

### Terminal System V2
- Multiple terminal support
- System and Claude terminals
- Session persistence
- Background processing
- Split screen layouts (single, horizontal, vertical, grid)
- Focus-based streaming (60% CPU reduction)
- Environment file loading from project paths
- Modern UI with glass morphism effects

### Dashboard
- Real-time metrics
- Health checks
- Recent activity feed
- System status
- User statistics
- Performance monitoring

### Workspace Explorer
- File/folder CRUD operations
- Real-time file sync
- Git integration
- Multi-project support
- File upload/download
- Directory navigation

### User Management System (UMS)
- Admin panel
- User CRUD operations
- Role management
- Permission control
- Activity logging
- Bulk operations

### Cache System
- Redis-like in-memory cache
- TTL support
- Auto-expiration
- Performance optimization
- Fallback mechanisms

### Settings Management
- User preferences
- System settings
- API configuration
- Theme selection
- Notification preferences

## 🚧 In Progress

### Page Builder (70% complete)
- Visual page construction
- Drag-and-drop interface
- Component library
- Template system
- Preview mode
- Export functionality

### Portfolio Management (40% complete)
- Stock tracking
- Portfolio analysis
- Performance metrics
- Transaction history
- Reporting tools

### Real-time Collaboration (20% complete)
- WebRTC integration
- Shared editing
- Cursor tracking
- Presence indicators
- Conflict resolution

### Knowledge Base System (Planning complete)
- Issue tracking
- Solution documentation
- Search functionality
- Category management
- AI-powered suggestions

## 📋 Planned Features

### Mobile App
- React Native implementation
- Cross-platform support
- Offline capability
- Push notifications
- Biometric authentication

### Advanced Analytics
- Portfolio performance metrics
- Predictive analysis
- Risk assessment
- Market trends
- Custom reports

### Export/Import
- Data backup
- Migration tools
- Format conversion
- Bulk operations
- Scheduled exports

### Webhooks
- Event-driven integrations
- Custom triggers
- Third-party services
- Notification system
- API callbacks

### Multi-language Support
- i18n implementation
- Language detection
- Translation management
- RTL support
- Locale formatting

### 2FA Authentication
- TOTP support
- SMS verification
- Backup codes
- Device management
- Security keys`,
  },
  {
    filename: "05-file-structure.md",
    title: "File Structure",
    content: `# File & Module Structure

## Project Root Structure

\`\`\`
port/
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   ├── modules/                  # Feature modules
│   ├── services/                 # Business logic
│   ├── components/               # Reusable UI
│   ├── core/                     # Core utilities
│   └── middleware/               # Middleware
├── prisma/                       # Database
│   ├── schema.prisma            # Schema definition
│   └── migrations/              # Migration files
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
│   └── claude/                  # Agent documentation
├── public/                       # Static assets
├── _library/                     # Shared components
└── .claude/                      # Agent configs
    └── agents/                  # Agent definitions
\`\`\`

## App Router Structure

\`\`\`
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
│   ├── terminal/               # Terminal API
│   ├── dashboard/              # Metrics API
│   └── health/                 # Health checks
├── login/                       # Public login
└── register/                    # Public register
\`\`\`

## Module Structure

\`\`\`
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
├── terminal/                    # Terminal system
│   ├── components/             # Terminal UI
│   ├── services/               # Terminal logic
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
\`\`\`

## Services Architecture

\`\`\`
src/services/
├── claude-*.service.ts         # Claude AI services
│   ├── claude-direct           # Direct API
│   ├── claude-enhanced         # With tools
│   └── claude-realtime         # Streaming
├── dashboard.service.ts         # Dashboard logic
├── terminal.service.ts          # Terminal management
├── workspace-*.service.ts      # Workspace operations
└── [other services]
\`\`\`

## Core Utilities

\`\`\`
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
\`\`\`

## Naming Conventions

### Files
- Components: \`PascalCase.tsx\`
- Services: \`kebab-case.service.ts\`
- Utilities: \`kebab-case.ts\`
- Types: \`PascalCase.types.ts\`
- Tests: \`[filename].test.ts\`
- Styles: \`[component].module.scss\`

### Directories
- Features: \`kebab-case/\`
- Components: \`PascalCase/\` or \`kebab-case/\`
- Utilities: \`kebab-case/\`

### Variables & Functions
- Variables: \`camelCase\`
- Constants: \`UPPER_SNAKE_CASE\`
- Functions: \`camelCase\`
- Classes: \`PascalCase\`
- Interfaces: \`PascalCase\`
- Types: \`PascalCase\`
- Enums: \`PascalCase\``,
  },
];

// Create all documentation files
docFiles.forEach((doc) => {
  const filePath = path.join(docsDir, doc.filename);
  fs.writeFileSync(filePath, doc.content, "utf8");
  console.log(`✅ Created: ${doc.filename}`);
});

console.log("\n📚 Documentation split completed successfully!");
console.log(`📁 Files created in: ${docsDir}`);
