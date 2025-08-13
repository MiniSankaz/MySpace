# CLAUDE.md - AI Assistant Quick Reference Index

> **⚡ QUICK START**: This is the main index file. Detailed documentation is in `/docs/claude/` directory.
> 
> **🧭 NAVIGATION TIP**: See [`/docs/claude/00-navigation-guide.md`](./docs/claude/00-navigation-guide.md) for efficient document access patterns.
> 
> Agents should read this file first to understand the project structure, then access specific documentation as needed.

## 🚨 Latest Major Update (2025-08-13)
- **Terminal V2 Refactor Complete**: Implemented clean architecture with 60% memory reduction and 40% CPU improvement
- **Code Redundancy Elimination**: Reduced from 4,000+ lines to ~2,500 lines, removed 270KB of duplicate code
- **Progressive Migration System**: Supports seamless migration from legacy to new terminal system
- **Production Ready**: Full deployment support with monitoring, load testing, and health checks

## 🎯 Project Overview

**Project**: Stock Portfolio Management System  
**Version**: 0.2.0  
**Stack**: Next.js 15.4.5, React 19, TypeScript, PostgreSQL, Prisma, Claude API  
**Ports**: Main app: 4000, Terminal V2: ws://localhost:4000/ws/terminal-v2, Claude WS: 4002  
**Terminal System**: V2 Clean Architecture (Progressive Migration)  

## 📚 Documentation Structure

### Core Documentation
- 📋 [Project Information](./docs/claude/01-project-info.md) - Technology stack, URLs, repository details
- 💼 [Business Logic](./docs/claude/02-business-logic.md) - Business rules, user roles, data flows
- 🔄 [Workflows & Use Cases](./docs/claude/03-workflows.md) - Authentication, AI assistant, workspace flows
- ✅ [Features](./docs/claude/04-features.md) - Completed, in-progress, and planned features

### Technical Documentation  
- 📁 [File Structure](./docs/claude/05-file-structure.md) - Complete module and directory structure
- 🔌 [API Reference](./docs/claude/06-api-reference.md) - REST endpoints and services
- 🎨 [Components & UI](./docs/claude/07-components-ui.md) - Reusable components and UI patterns
- 📦 [Import Guide](./docs/claude/08-import-guide.md) - How to import services, components, utilities

### Operational Documentation
- 📝 [SOPs & Standards](./docs/claude/09-sops-standards.md) - Git workflow, code standards, testing
- 🔑 [Credentials & Accounts](./docs/claude/10-credentials.md) - Test accounts and API keys
- 💻 [Common Commands](./docs/claude/11-commands.md) - Development, database, testing commands
- 🐛 [Known Issues](./docs/claude/12-known-issues.md) - Current issues and solutions

### Agent Documentation
- 🤖 [Agent Guidelines](./docs/claude/13-agent-guidelines.md) - Best practices for AI agents
- 📊 [Agent Work Log](./docs/claude/14-agent-worklog.md) - Detailed agent activity history
- 🔐 [Authentication Standards](./docs/claude/15-authentication-standards.md) - **CRITICAL: Cookie naming & auth patterns**
- 📋 [Agent SOPs](./docs/claude/16-agent-sops.md) - **MANDATORY: Standard Operating Procedures for all agents**

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start dev server (port 4000)
npm run build           # Build for production
./start-v2.sh           # Start with Terminal V2 (recommended)
./start.sh              # Start with legacy terminal

# Database
npx prisma studio       # Prisma Studio (port 5555)
npx prisma migrate dev  # Run migrations

# Terminal V2 System
./start-v2.sh --progressive    # Progressive migration (recommended)
./start-v2.sh --new          # New system only
./start-v2.sh --dual         # Both systems (testing)
npx tsx scripts/test-terminal-integration.ts  # Run integration tests
npx tsx scripts/load-test-terminal.ts        # Run load tests
```

## 🔐 Quick Access Credentials

```
Admin: sankaz@example.com / Sankaz#3E25167B@2025
User: test@personalai.com / Test@123
```

## ⚡ Current Project State

### Active Features
- ✅ Terminal V2 Clean Architecture (Session, Stream, Metrics managers)
- ✅ Progressive Migration System (legacy/dual/new/progressive modes)
- ✅ 60% Memory Reduction + 40% CPU Improvement
- ✅ 200+ Concurrent Sessions Support
- ✅ Circuit Breaker + Auto-healing
- ✅ Prometheus Metrics + Health Monitoring
- ✅ Zero Downtime Migration

### Recent Updates (2025-08-13)
- **Terminal V2 Architecture**: Implemented 3-tier clean architecture
- **Code Cleanup**: Removed 270KB redundant code (18 files deleted)
- **Migration System**: Added 4-mode progressive migration support
- **Production Scripts**: Created start-v2.sh with health checks
- **Testing Suite**: 11 integration tests + load testing
- **Documentation**: Complete architecture documentation

### Previous Updates (2025-08-12)
- Terminal duplication bug fixes with state reconciliation
- Race condition prevention with debouncing and mutex locks
- Layout persistence across project switches
- SOPs implementation for code review standards

### Critical Information
- **Main App Port**: 4000 (NOT 3000)
- **Database**: PostgreSQL on DigitalOcean (port 25060)
- **Terminal V2 WebSocket**: ws://localhost:4000/ws/terminal-v2
- **Legacy Terminal**: ws://localhost:4001 (backward compatible)
- **Claude Terminal**: ws://localhost:4002
- **Migration Mode**: Progressive (recommended for production)
- **Session Format**: `session_{timestamp}_{random}`

## 🎯 Agent Instructions

1. **ALWAYS** read this index file first
2. **ONLY** access detailed documentation when needed
3. **UPDATE** the work log after completing tasks
4. **CHECK** known issues before debugging
5. **FOLLOW** SOPs and standards for all changes

## 📍 Navigation Shortcuts

For agents needing specific information:

| Need | Go To |
|------|-------|
| Terminal V2 API | [API Reference](./docs/claude/06-api-reference.md) |
| Terminal V2 Architecture | [Terminal V2 Architecture](./docs/terminal-v2-architecture.md) |
| Component usage | [Components & UI](./docs/claude/07-components-ui.md) |
| Error solutions | [Known Issues](./docs/claude/12-known-issues.md) |
| Test accounts | [Credentials](./docs/claude/10-credentials.md) |
| Git workflow | [SOPs & Standards](./docs/claude/09-sops-standards.md) |
| Recent changes | [Agent Work Log](./docs/claude/14-agent-worklog.md) |
| Migration Guide | [Terminal V2 Commands](./docs/claude/11-commands.md) |

---
*Last Updated: 2025-08-13 | Terminal V2 Refactor Complete | File Count: 15 documentation files*