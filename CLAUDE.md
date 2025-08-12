# CLAUDE.md - AI Assistant Quick Reference Index

> **⚡ QUICK START**: This is the main index file. Detailed documentation is in `/docs/claude/` directory.
> 
> **🧭 NAVIGATION TIP**: See [`/docs/claude/00-navigation-guide.md`](./docs/claude/00-navigation-guide.md) for efficient document access patterns.
> 
> Agents should read this file first to understand the project structure, then access specific documentation as needed.

## 🚨 Recent Issues Fixed (2025-01-13)
- **Terminal Focus Issue**: Fixed terminal sessions not being active after creation due to sync issues between memory service and frontend
- **Git WebSocket Loop**: Resolved infinite reconnection loops with proper circuit breaker implementation
- **Memory Leaks**: Enhanced cleanup procedures for all components to prevent resource leaks
- **State Sync Issues**: Improved state synchronization between Terminal, Git, and File Explorer components

## 🎯 Project Overview

**Project**: Stock Portfolio Management System  
**Version**: 0.1.0  
**Stack**: Next.js 15.4.5, React 19, TypeScript, PostgreSQL, Prisma, Claude API  
**Ports**: Main app: 4000, Terminal WS: 4001, Claude WS: 4002  

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

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start dev server (port 4000)
npm run build           # Build for production
./quick-restart.sh      # Quick restart

# Database
npx prisma studio       # Prisma Studio (port 5555)
npx prisma migrate dev  # Run migrations

# Terminal System
# System Terminal: ws://localhost:4001
# Claude Terminal: ws://localhost:4002
```

## 🔐 Quick Access Credentials

```
Admin: sankaz@example.com / Sankaz#3E25167B@2025
User: test@personalai.com / Test@123
```

## ⚡ Current Project State

### Active Features
- ✅ Terminal V2 with split screen support
- ✅ Modern UI with glass morphism effects  
- ✅ Focus-based streaming (60% CPU reduction)
- ✅ Multi-terminal parallel processing
- ✅ Environment file loading from project paths

### Recent Updates (2025-08-12)
- Project Management Sidebar code review completed (82/100 score)
- Critical security and error handling issues identified
- Database schema and API endpoints implemented
- Component architecture established with TypeScript

### Previous Updates (2025-08-11)
- Terminal V2 UI modernization completed
- Split screen layouts (single, horizontal, vertical, grid)
- Glass morphism and gradient effects
- Enhanced animations and micro-interactions

### Critical Information
- **Main App Port**: 4000 (NOT 3000)
- **Database**: PostgreSQL on DigitalOcean (port 25060)
- **WebSocket Ports**: 4001 (system), 4002 (Claude)
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
| API endpoints | [API Reference](./docs/claude/06-api-reference.md) |
| Component usage | [Components & UI](./docs/claude/07-components-ui.md) |
| Error solutions | [Known Issues](./docs/claude/12-known-issues.md) |
| Test accounts | [Credentials](./docs/claude/10-credentials.md) |
| Git workflow | [SOPs & Standards](./docs/claude/09-sops-standards.md) |
| Recent changes | [Agent Work Log](./docs/claude/14-agent-worklog.md) |

---
*Last Updated: 2025-08-11 | File Count: 14 documentation files*