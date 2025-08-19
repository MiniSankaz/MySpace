# Project Information

## Basic Information

- **Project Name**: Stock Portfolio Management System
- **Description**: Comprehensive stock portfolio management platform with AI assistant, user management, terminal interface, and page builder
- **Version**: 0.1.0
- **Repository**: Git repository with branches: main, dev, feature/New-Module

## Technology Stack

### Frontend

- **Framework**: Next.js 15.4.5
- **UI Library**: React 19
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: Zustand
- **Animations**: Framer Motion

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **WebSocket**: Socket.io
- **Terminal**: node-pty

### Database

- **Database**: PostgreSQL (DigitalOcean hosted)
- **Port**: 25060
- **ORM**: Prisma 6.2.0

### AI Integration

- **AI Provider**: Claude API (Anthropic)
- **Services**: Direct, Enhanced, Real-time streaming

### Authentication

- **Method**: JWT with refresh tokens
- **Cookie**: httpOnly, secure

## URLs & Ports

### Development Environment

- **Main Application**: http://localhost:4110 (⚠️ NOT 4100)
- **WebSocket Terminal**: ws://localhost:4001
- **Claude Terminal**: ws://localhost:4002
- **Prisma Studio**: http://localhost:5555

### Production Environment

- **Main Application**: TBD
- **API Endpoint**: /api/v1

## Project Structure Overview

```
port/
├── src/                  # Source code
├── prisma/              # Database schema
├── scripts/             # Utility scripts
├── docs/                # Documentation
├── _library/            # Shared components
└── .claude/             # Agent configurations
```

## Key Configuration Files

- `.env.local` - Local environment variables
- `prisma/schema.prisma` - Database schema
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## Development Standards

- **Code Style**: ESLint + Prettier
- **Type Safety**: Strict TypeScript
- **Testing**: Jest + React Testing Library
- **Git Hooks**: Husky + lint-staged
- **Commit Convention**: Conventional Commits
