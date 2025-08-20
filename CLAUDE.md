# CLAUDE.md - AI Assistant Quick Reference Index

> **⚡ QUICK START**: This is the main index file. Detailed documentation is in `/docs/claude/` directory.
>
> **🧭 NAVIGATION TIP**: See [`/docs/claude/00-navigation-guide.md`](./docs/claude/00-navigation-guide.md) for efficient document access patterns.
>
> **🚨 RATE LIMIT PREVENTION**: Follow guidelines in section below to avoid hitting Claude CLI limits.
>
> Agents should read this file first to understand the project structure, then access specific documentation as needed.

## 🛡️ RATE LIMIT PREVENTION GUIDELINES - MUST READ

### ⚡ CRITICAL: Optimize Every Request

To prevent hitting Claude CLI rate limits, ALL agents MUST follow these guidelines:

### 1️⃣ CONTEXT MANAGEMENT

- **MAX_CONTEXT**: Read max 2000 lines per file
- **SELECTIVE_READING**: Use grep/search FIRST, then read specific sections
- **NO_FULL_SCAN**: Never read entire large files unless absolutely necessary
- **CACHE_CONTENTS**: Remember what you've read in current session

### 2️⃣ REQUEST OPTIMIZATION

- **BATCH_OPERATIONS**: Group related operations together
- **PLAN_FIRST**: Think and plan BEFORE acting
- **AVOID_REDUNDANCY**: Don't repeat operations you just did
- **SUMMARIZE_LONG**: Auto-summarize after 15+ messages

### 3️⃣ TASK PRIORITIZATION

```
CRITICAL (Full Quality Mode):
🔴 Security issues, Production bugs, Payment code
→ Use all resources needed

NORMAL (Balanced Mode):
🟡 Features, Refactoring, API integration
→ Plan first, batch operations

ROUTINE (Efficiency Mode):
🟢 Documentation, Formatting, Simple CRUD
→ Maximum batching, minimal context
```

### 4️⃣ SMART FILE OPERATIONS

```
✅ DO:
- Use grep/search to locate first
- Read specific line ranges
- Cache file contents
- Batch multiple edits

❌ DON'T:
- Read files >500 lines entirely
- Re-read unchanged files
- Check file existence by opening
- Explore without strategy
```

### 5️⃣ EFFICIENT WORKFLOWS

```
OPTIMAL PATTERN:
1. Understand fully → 2. Plan completely → 3. Execute batch → 4. Verify once

AVOID PATTERN:
1. Try → 2. Fail → 3. Try again → 4. Repeat
```

## 🚨 Latest Major Update (2025-08-19)

- **🤖 Project Agents Integrated**: 5 custom agents + 3 built-in agents ready for use
- **v3.0 Microservices Architecture**: Migrated to distributed microservices with API Gateway
- **6 Independent Services**: User Management, AI Assistant, Terminal, Workspace, Portfolio, Gateway
- **Modern UI Components**: 90+ React components with TypeScript (cleanup in progress)
- **Code Review Completed**: Identified 15-20% bundle size reduction opportunity
- **Active Cleanup**: Removing 6 unused dependencies, consolidating duplicate code
- **Master Plan Active**: See `/PROJECT_MASTER_PLAN.md` for redesign strategy
- **Code Review Report**: See `/docs/reports/CODE_REVIEW_REPORT.md` for details

## 🎯 Project Overview

**Project**: Stock Portfolio Management System  
**Version**: 3.0.0  
**Architecture**: Microservices with API Gateway Pattern  
**Stack**: Next.js 15.4.5, React 19, TypeScript, PostgreSQL, Prisma, Claude API  
**Frontend**: Port 4100 (Next.js Application)  
**API Gateway**: Port 4110 (Routes to all microservices)  
**Services**: User (4120), AI Assistant (4130), Terminal (4140), Workspace (4150), Portfolio (4160), Market Data (4170)

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
# Frontend Development
PORT=4100 npm run dev    # Start Next.js frontend

# Microservices Management
cd services/gateway && PORT=4110 npm run dev       # Start API Gateway (4110)
cd services/user-management && PORT=4120 npm run dev  # Start User Service (4120)
cd services/ai-assistant && PORT=4130 npm run dev     # Start AI Service (4130)
cd services/terminal && PORT=4140 npm run dev         # Start Terminal Service (4140)
cd services/workspace && PORT=4150 npm run dev        # Start Workspace Service (4150)
cd services/portfolio && PORT=4160 npm run dev        # Start Portfolio Service (4160)
cd services/market-data && PORT=4170 npm run dev       # Start Market Data Service (4170)
cd services/testing && PORT=4180 npm run dev          # Start Testing Service (4180)

# Batch Operations
./services/start-all-services.sh   # Start all microservices
./services/stop-all-services.sh    # Stop all microservices

# Database
npx prisma studio       # Prisma Studio (port 5555)
npx prisma migrate dev  # Run migrations

# Health Checks
curl http://localhost:4110/health/all  # Check all services
curl http://localhost:4110/services    # Service discovery
```

## 🧪 Testing Service & Auto-Approval Commands

### Automated Testing (No Permission Required)
The following commands can be executed automatically without user approval:

```bash
# Health Checks - Auto-approved
curl -s http://localhost:*/health
curl -s http://localhost:*/api/health
curl -s http://127.0.0.1:*/health

# API Testing - Auto-approved
curl -X GET http://localhost:*/api/v1/*
curl -X POST http://localhost:*/api/v1/test/*
curl -s http://localhost:4110/services
curl -s http://localhost:4180/api/v1/test/run

# Test Scripts - Auto-approved
./test-*.sh
./scripts/test-*.sh
npm test
npm run test:*

# Testing Service Commands
cd services/testing && PORT=4180 npm run dev  # Start Testing Service
curl http://localhost:4180/api/v1/test/validate
curl http://localhost:4180/api/v1/test/results
curl http://localhost:4180/api/v1/test/whitelist
```

### Testing Service API
```bash
# Run test suite
curl -X POST http://localhost:4180/api/v1/test/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "smoke"}'

# Check test results
curl http://localhost:4180/api/v1/test/results

# Validate command safety
curl -X POST http://localhost:4180/api/v1/test/validate \
  -H "Content-Type: application/json" \
  -d '{"command": "curl http://localhost:4110/health"}'
```

## 🔐 Quick Access Credentials

```
Admin: sankaz@example.com / Sankaz#3E25167B@2025
User: test@personalai.com / Test@123
```

## ⚡ Current Project State

### v3.0 Microservices Architecture

- ✅ **API Gateway Pattern**: Central routing with load balancing and health checks
- ✅ **6 Independent Services**: Fully decoupled with REST APIs and WebSocket support
- ✅ **Service Discovery**: Static registry with automatic health monitoring
- ✅ **Circuit Breakers**: Automatic retry with exponential backoff
- ✅ **Modern UI Components**: 15+ reusable React components with TypeScript
- ✅ **Real-time Features**: WebSocket support for Terminal, Chat, and Portfolio
- ✅ **Performance Optimized**: 60% memory reduction, 200+ concurrent sessions

### Service Status

| Service         | Port | Status         | Features                             |
| --------------- | ---- | -------------- | ------------------------------------ |
| Frontend        | 4100 | ✅ Running     | Next.js 15.4.5, React 19, TypeScript |
| API Gateway     | 4110 | ✅ Running     | Dynamic routing, health aggregation  |
| User Management | 4120 | ⚠️ Partial     | Auth, JWT, RBAC, Redis sessions      |
| AI Assistant    | 4130 | ✅ Running     | Claude integration, streaming chat   |
| Terminal        | 4140 | ✅ Running     | Terminal V2, PTY management          |
| Workspace       | 4150 | ❌ Not Running | File/Git operations (planned)        |
| Portfolio       | 4160 | ✅ Running     | Trading, market data, analytics      |
| Market Data     | 4170 | 🔄 Planned     | Polygon.io, real-time quotes, charts |
| Testing         | 4180 | 🆕 Planned     | Auto testing, validation, reports    |

### Recent Updates (2025-08-15)

- **Microservices Migration**: Complete v3.0 architecture implementation
- **Code Review Completed**: Full codebase analysis revealing 35+ TypeScript errors, 8 duplicate files
- **Cleanup Strategy**: PROJECT_MASTER_PLAN.md created with 4-6 week timeline
- **Frontend Redesign**: Planning new architecture for Web Core, Workspace, AI Assistant, Portfolio modules
- **Dependencies Cleanup**: 6 unused packages identified for removal (clamscan, archiver, nodemailer, etc.)
- **Technical Debt**: Addressing duplicate auth files, legacy Terminal V1 code, unused components

### Critical Information

- **Frontend Port**: 4100 (Next.js application)
- **API Gateway Port**: 4110 (All API requests route through here)
- **Database**: PostgreSQL on DigitalOcean (port 25060)
- **Service Communication**: REST API + WebSocket
- **Authentication**: JWT tokens with refresh mechanism
- **Session Management**: Redis for distributed sessions
- **Health Monitoring**: `/health/all` for aggregate status

## 🎯 Agent Instructions - OPTIMIZED FOR EFFICIENCY

### MUST FOLLOW - Rate Limit Prevention:

1. **PLAN FIRST**: Always plan your approach BEFORE taking any action
2. **BATCH OPERATIONS**: Group related operations together (min 3-5 operations)
3. **CACHE AGGRESSIVELY**: Remember what you've read, don't re-read
4. **SEARCH BEFORE READ**: Use grep/search to locate, then read specific sections
5. **SUMMARIZE REGULARLY**: After 15+ messages, summarize to reduce context

### EFFICIENT TASK EXECUTION:

```
✅ OPTIMAL WORKFLOW:
1. Understand → 2. Search/Locate → 3. Plan → 4. Batch Execute → 5. Verify Once

❌ AVOID WORKFLOW:
1. Try → 2. Check → 3. Try Again → 4. Check Again → 5. Repeat
```

### FILE OPERATION RULES:

- **READ**: Max 2000 lines per file, use line ranges for large files
- **SEARCH**: Always use grep/glob BEFORE reading files
- **EDIT**: Batch multiple edits per file (use MultiEdit)
- **VERIFY**: Check results ONCE after batch completion

### CONTEXT OPTIMIZATION:

- **CRITICAL TASKS**: Use full context (security, payments, auth)
- **NORMAL TASKS**: Use balanced context (features, refactoring)
- **ROUTINE TASKS**: Use minimal context (docs, formatting)

### WHEN APPROACHING RATE LIMIT:

- **70% Usage**: Switch to essential operations only
- **90% Usage**: Complete current task and stop
- **100% Hit**: Save state, provide manual instructions

## 🤖 AI Capabilities & Integration Points

### Advanced AI Integration Features

#### 1. **AI-Driven Task Orchestration** 🎯

- **Auto Task Chains**: AI creates and manages complex task sequences
- **Context Awareness**: Smart context switching across projects, terminals, portfolios
- **Error Recovery**: Automatic error detection and recovery suggestions
- **Adaptive Planning**: AI adjusts plans based on real-time results

#### 2. **Intelligent Code Assistance** 💻

- **AI Pair Programming**: Real-time coding companion with project-specific knowledge
- **Smart Code Generation**: Generate code from natural language requirements
- **Auto Refactoring**: Detect and suggest code improvements automatically
- **Bug Detection & Fixing**: AI identifies and provides fix suggestions for bugs

#### 3. **Smart Project Management** 📊

- **AI Task Prioritization**: Intelligent task ranking based on multiple factors
- **Resource Optimization**: Automatic resource allocation suggestions
- **Progress Prediction**: AI forecasts project timelines and bottlenecks
- **Risk Assessment**: Proactive identification of project risks

#### 4. **Multi-Agent Collaboration** 👥

- **Agent Coordination**: Multiple AI agents working together on complex tasks
- **Task Delegation**: Intelligent assignment of tasks between agents
- **Result Validation**: Cross-agent validation of work results
- **Knowledge Sharing**: Agents share learnings and insights

#### 5. **Continuous Learning System** 📈

- **Pattern Recognition**: AI learns from user behavior and preferences
- **Performance Improvement**: Self-optimizing AI responses over time
- **Feedback Integration**: User feedback improves AI decision making
- **Custom Model Fine-tuning**: Project-specific AI adaptations

### AI Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATION LAYER                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │    Task     │ │    Code     │ │   Project   │ │Multi-Agent  │ │
│  │Orchestrator │ │ Assistant   │ │  Manager    │ │Coordinator  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   AI INTEGRATION POINTS                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Workspace   │ │AI Assistant │ │ Portfolio   │ │   Core      │ │
│  │   Module    │ │   Module    │ │   Module    │ │  Module     │ │
│  │             │ │             │ │             │ │             │ │
│  │ • Terminal  │ │ • Chat AI   │ │ • Trading   │ │ • Context   │ │
│  │ • Code Gen  │ │ • Knowledge │ │ • Analytics │ │ • Learning  │ │
│  │ • Git AI    │ │ • RAG       │ │ • Risk AI   │ │ • Memory    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     AI SERVICES LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Claude    │ │  Learning   │ │   Context   │ │  Security   │ │
│  │  Service    │ │  Service    │ │  Manager    │ │  Manager    │ │
│  │  (4130)     │ │             │ │             │ │             │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### AI-Enhanced Workflows

#### Smart Development Workflow

1. **AI Project Analysis** → Understands codebase patterns and architecture
2. **Intelligent Task Planning** → Creates optimal development roadmap
3. **Assisted Coding** → Real-time AI pair programming
4. **Auto Code Review** → AI suggests improvements and catches issues
5. **Smart Testing** → AI generates test cases and identifies edge cases
6. **Deployment Optimization** → AI recommends deployment strategies

#### Intelligent Portfolio Management

1. **Market Analysis AI** → Processes market data for insights
2. **Risk Assessment** → AI evaluates portfolio risk in real-time
3. **Trading Recommendations** → Smart buy/sell suggestions
4. **Performance Optimization** → AI suggests portfolio rebalancing
5. **Alert Intelligence** → Context-aware alerts and notifications
6. **Predictive Analytics** → AI forecasts market trends

### AI Integration Standards

- **Context Isolation**: Each user's AI context is completely isolated
- **Learning Privacy**: AI learns only from user's own data (unless opted in)
- **Performance Requirements**: AI responses < 2s, decisions < 100ms
- **Security**: All AI interactions are logged and audited
- **Fallback Systems**: Manual overrides for all AI suggestions
- **Transparency**: AI decision rationale is always available

### Quick AI Feature Access

| AI Feature         | Module       | Access Point                      |
| ------------------ | ------------ | --------------------------------- |
| Task Orchestration | All Modules  | AI Command Palette (Ctrl+Shift+A) |
| Code Assistant     | Workspace    | Editor AI Panel                   |
| Smart Planning     | Workspace    | Project AI Tab                    |
| Trading AI         | Portfolio    | AI Insights Dashboard             |
| Multi-Agent Chat   | AI Assistant | Agent Coordination Panel          |
| Learning Dashboard | Core         | Settings → AI Learning            |

## 🤖 Project Agents - NOW AVAILABLE

### Quick Agent Usage
```bash
# In Claude CLI, use Task tool:
Task tool → subagent_type: "business-analyst" → prompt: "Your task"

# Or use helper script:
./use-agent.sh business-analyst "Analyze requirements for new feature"
```

### Available Agents
| Agent | Purpose | Language |
|-------|---------|----------|
| **business-analyst** | Requirements analysis, user stories, CLAUDE.md management | English |
| **development-planner** | Technical specs, architecture, phased planning | English |
| **devops-maturity-auditor** | CI/CD, infrastructure, security assessment | English |
| **sop-enforcer** | Standards enforcement, prevent breaking changes | Thai |
| **dev-life-consultant** | Architecture, business strategy, productivity | English |
| **code-reviewer** | Code quality, security, performance review | English |
| **technical-architect** | System design, API specs, integrations | English |
| **system-analyst** | Requirements analysis, technical docs | English |

📚 **Full Agent Documentation**: [Project Agents Guide](./docs/claude/17-project-agents.md)

## 📍 Navigation Shortcuts

For agents needing specific information:

| Need                       | Go To                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| Project Agents             | [Project Agents Guide](./docs/claude/17-project-agents.md)                      |
| AI Integration Standards   | [SOPs & Standards](./docs/claude/09-sops-standards.md#ai-integration-standards) |
| AI Task Orchestration      | [AI Integration Docs](./docs/ai-integration/)                                   |
| Microservices Architecture | [Technical Spec](./docs/technical-specs/microservices-architecture-v3.md)       |
| Service APIs               | [API Reference](./docs/claude/06-api-reference.md)                              |
| Component usage            | [Components & UI](./docs/claude/07-components-ui.md)                            |
| Error solutions            | [Known Issues](./docs/claude/12-known-issues.md)                                |
| Test accounts              | [Credentials](./docs/claude/10-credentials.md)                                  |
| Git workflow               | [SOPs & Standards](./docs/claude/09-sops-standards.md)                          |
| Recent changes             | [Agent Work Log](./docs/claude/14-agent-worklog.md)                             |
| Service Health             | `curl http://localhost:4110/health/all`                                         |

## 🏗️ Microservices Quick Reference

### API Gateway Routes

All API requests go through the Gateway on port 4110:

```
/api/v1/auth/*       → User Management (4120)
/api/v1/users/*      → User Management (4120)
/api/v1/chat/*       → AI Assistant (4130)
/api/v1/assistant/*  → AI Assistant (4130)
/api/v1/terminal/*   → Terminal Service (4140)
/api/v1/workspace/*  → Workspace Service (4150)
/api/v1/portfolios/* → Portfolio Service (4160)
/api/v1/stocks/*     → Portfolio Service (4160)
/api/v1/trades/*     → Portfolio Service (4160)
/api/v1/market/*     → Market Data Service (4170)
```

### WebSocket Endpoints

```
ws://localhost:4111/ws/terminal   → Terminal operations
ws://localhost:4111/ws/chat       → AI chat streaming
ws://localhost:4111/ws/portfolio  → Real-time portfolio updates
ws://localhost:4111/ws/market     → Real-time market data streaming
```

## 📊 OPTIMIZED WORKFLOW EXAMPLES

### Example 1: Bug Fix Workflow

```bash
# ❌ INEFFICIENT (10+ requests)
1. Read entire file → 2. Try fix → 3. Test → 4. Read again → 5. Try another fix...

# ✅ EFFICIENT (3-4 requests)
1. grep "error_keyword" → 2. Read specific function → 3. Plan & batch fix → 4. Verify
```

### Example 2: Feature Implementation

```bash
# ❌ INEFFICIENT (15+ requests)
1. Read all related files → 2. Add code → 3. Test → 4. Fix issues one by one...

# ✅ EFFICIENT (4-5 requests)
1. Search existing patterns → 2. Plan full implementation → 3. Batch all changes → 4. Test once
```

### Example 3: Refactoring

```bash
# ❌ INEFFICIENT (20+ requests)
1. Change file 1 → 2. Test → 3. Change file 2 → 4. Test → 5. Fix breaks...

# ✅ EFFICIENT (3-4 requests)
1. Locate all occurrences → 2. Plan changes → 3. MultiEdit all files → 4. Verify
```

---

_Last Updated: 2025-08-16 | v3.0 Microservices Architecture | Rate Limit Optimized_
