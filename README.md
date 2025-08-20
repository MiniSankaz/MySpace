# Personal Digital Command Center v3.0
## 🎯 All-in-One Developer Workspace & Investment Hub

A comprehensive personal productivity platform that combines developer tools, investment portfolio management, and AI assistance into a unified digital workspace. Think of it as your "digital briefcase" - everything you need in one place.

## 🎯 Overview

**"Your Complete Digital Workspace"** - A powerful platform that integrates:
- **💻 Developer Workspace**: Full-featured cloud IDE with terminal, Git integration, and project management
- **💰 Investment Portfolio**: Real-time trading, portfolio tracking, and market analysis
- **🤖 AI Assistant**: Claude-powered coding assistant and investment advisor
- **📊 Data Analytics**: Comprehensive dashboards for both development metrics and investment performance
- **🔧 Personal Tools**: All your essential tools accessible from anywhere

Designed for developers who invest and investors who code - bringing together all your digital tools in one unified platform.

## ✨ Features

### Developer Workspace
- **🖥️ Cloud Terminal**: Full Linux terminal in your browser
- **📁 File Management**: Complete file system with Git integration
- **🔨 Project Management**: Organize and manage multiple projects
- **🤖 AI Pair Programming**: Claude-powered code completion and debugging
- **📝 Documentation Tools**: Integrated markdown editor and viewer

### Investment Platform
- **📈 Portfolio Management**: Track multiple portfolios with real-time valuations
- **💹 Stock Trading**: Buy, sell, and manage positions (Thai & US markets)
- **📊 Market Data**: Real-time quotes and historical data analysis
- **🎯 AI Trading Assistant**: Claude-powered insights and recommendations
- **💱 Multi-Currency**: Full support for THB (฿) and USD ($)
- **📱 Real-time Updates**: WebSocket-powered live market data

### Unified Features
- **🔐 Secure Authentication**: JWT-based auth with role management
- **⚡ Real-time Sync**: All data synchronized across services
- **🎨 Modern UI**: Responsive design with dark/light themes
- **📊 Analytics Dashboard**: Unified view of all your metrics
- **🔄 Cross-Platform**: Access from anywhere, on any device

## 🏗️ Architecture

### Microservices Architecture (v3.0)

**Designed as a modular platform** where each service represents a major feature area. This architecture allows for:
- Independent scaling of different workloads (coding vs trading)
- Feature isolation for stability
- Flexible deployment options
- Easy addition of new capabilities

The platform uses a distributed microservices architecture optimized for a comprehensive personal workspace:

| Service | Port | Purpose | Justification |
|---------|------|---------|---------------|
| **Frontend** | 4100 | Unified UI Dashboard | Single interface for all features |
| **API Gateway** | 4110 | Service Orchestration | Routes requests, handles auth |
| **User Management** | 4120 | Auth & Profiles | Secure multi-user support |
| **AI Assistant** | 4130 | Claude Integration | Code & investment AI assistance |
| **Terminal** | 4140 | Cloud IDE Terminal | Remote development capability |
| **Workspace** | 4150 | Project & File Mgmt | Git, file operations, projects |
| **Portfolio** | 4160 | Investment Tracking | Portfolio & trading management |
| **Market Data** | 4170 | Real-time Quotes | Market data aggregation |

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.4.5 with App Router
- **UI Library**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Context API + Custom hooks
- **Real-time**: WebSocket (Socket.io)

### Backend Services
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Queue**: Bull (Redis-based)

### Infrastructure
- **Authentication**: JWT with refresh tokens
- **AI Integration**: Claude API (Anthropic)
- **Market Data**: Polygon.io API
- **Monitoring**: Health checks, metrics
- **Logging**: Winston
- **Testing**: Jest, React Testing Library

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis 6 or higher
- npm or yarn
- Claude API key (for AI features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd port
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Database Setup

```bash
# Create databases
createdb portfolio_db
createdb user_management_db
createdb ai_assistant_db

# Run migrations
npx prisma migrate dev

# Seed data
npx prisma db seed
```

### 4. Start Services

#### Option A: Start All Services
```bash
./services/start-all-services.sh
```

#### Option B: Start Individual Services
```bash
# Terminal 1 - Frontend
PORT=4100 npm run dev

# Terminal 2 - API Gateway
cd services/gateway && PORT=4110 npm run dev

# Terminal 3 - User Management
cd services/user-management && PORT=4120 npm run dev

# Terminal 4 - AI Assistant
cd services/ai-assistant && PORT=4130 npm run dev

# Terminal 5 - Terminal Service
cd services/terminal && PORT=4140 npm run dev

# Terminal 6 - Workspace Service
cd services/workspace && PORT=4150 npm run dev

# Terminal 7 - Portfolio Service
cd services/portfolio && PORT=4160 npm run dev

# Terminal 8 - Market Data Service
cd services/market-data && PORT=4170 npm run dev
```

### 5. Access the Platform

Open [http://localhost:4100](http://localhost:4100) in your browser.

## 🔐 Default Credentials

```
Admin: sankaz@example.com / Sankaz#3E25167B@2025
User: test@personalai.com / Test@123
```

## 📊 Service Health Monitoring

Check all services health:
```bash
curl http://localhost:4110/health/all
```

Individual service health:
```bash
curl http://localhost:<service-port>/health
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific service tests
cd services/<service-name> && npm test
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)
- [Agent Guidelines](./docs/claude/13-agent-guidelines.md)

## 🤝 Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is proprietary software. All rights reserved.

## 🏆 Why This Architecture?

While this might seem over-engineered for a simple portfolio app, it's designed as a **comprehensive personal workspace** that combines:

1. **Developer Tools**: Full cloud IDE capabilities for coding on the go
2. **Investment Management**: Professional-grade portfolio tracking and trading
3. **AI Integration**: Cutting-edge AI assistance for both coding and investing
4. **Scalability**: Each module can grow independently as needs evolve
5. **Flexibility**: Easy to add new tools and features without affecting existing ones

Think of it as building your own **"Personal Operating System"** in the cloud - a single platform that replaces multiple separate tools and brings everything together in one cohesive experience.

## 🚀 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Voice commands integration
- [ ] Advanced AI automation workflows
- [ ] Social features for collaborative trading/coding
- [ ] Plugin system for custom tools
- [ ] Blockchain integration for DeFi
- [ ] Advanced backtesting engine
- [ ] CI/CD pipeline integration

---

**Built with ❤️ for developers who want everything in one place**