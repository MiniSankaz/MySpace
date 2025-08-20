# Code Marking Service

A comprehensive multi-agent system for code marking, analysis, and refactoring with advanced indexing capabilities.

## Overview

The Code Marking Service provides intelligent code analysis through multiple AI agents working in parallel to identify issues, suggest improvements, and automate refactoring operations. It maintains a comprehensive index of your codebase for fast searching and dependency tracking.

## Features

### 🔍 Code Indexing
- **Full Codebase Indexing**: Build comprehensive index with symbols, dependencies, and metadata
- **Incremental Updates**: File watcher for real-time index updates
- **Symbol Extraction**: Functions, classes, methods, interfaces, components
- **Dependency Tracking**: Import/export relationships and circular dependency detection
- **Multi-Language Support**: TypeScript, JavaScript, Python, Java, Go, and more

### 📝 Code Marking
- **Pattern Detection**: Anti-patterns, code smells, security issues
- **Complexity Analysis**: Cyclomatic complexity, nesting depth, file metrics
- **Duplicate Detection**: Find duplicate code blocks across files
- **Unused Code Detection**: Identify dead code and unused symbols
- **Naming Convention Checks**: Enforce consistent naming standards
- **Performance Analysis**: Identify performance bottlenecks

### 🤖 Multi-Agent Analysis
- **Parallel Agent Execution**: Multiple agents work simultaneously
- **Agent Types**:
  - CODE_REVIEWER: Code quality and bug detection
  - TECHNICAL_ARCHITECT: Architecture and design patterns
  - SOP_ENFORCER: Standards compliance
  - SECURITY_AUDITOR: Security vulnerability detection
  - PERFORMANCE_OPTIMIZER: Performance improvements
- **Resource Coordination**: Intelligent resource locking for conflict prevention
- **Task Orchestration**: Complex workflows with agent coordination

### 🔧 Automated Refactoring
- **AI-Powered Refactoring**: Intelligent code transformation
- **Refactoring Types**:
  - Extract Function/Method
  - Remove Duplicate Code
  - Optimize Performance
  - Modernize Code
  - Add Type Annotations
  - Reorganize Imports
- **Risk Assessment**: Automatic risk evaluation
- **Rollback Support**: Backup before refactoring

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Code Marking Service                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Code Index   │  │   Marking    │  │  Refactoring │  │
│  │   Service    │  │    Engine    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pattern    │  │    Agent     │  │    Queue     │  │
│  │   Detector   │  │ Coordinator  │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                     │  │
│  │  (Files, Symbols, Markings, Patterns, Tasks)     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         AI Orchestration (Port 4191)              │  │
│  │     (Agent Spawning, Task Management)             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Navigate to service directory
cd services/code-marking

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Create a `.env` file:

```env
# Service Configuration
PORT=4192
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/code_marking

# Redis (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Orchestrator
AI_ORCHESTRATOR_URL=http://localhost:4191

# Project Settings
PROJECT_ROOT=/path/to/your/project

# Indexing Configuration
INDEX_BATCH_SIZE=50
MAX_FILE_SIZE=1048576

# Agent Configuration
MAX_CONCURRENT_AGENTS=5
AGENT_TIMEOUT=300000
```

## Usage

### Starting the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### CLI Commands

#### Indexing Operations

```bash
# Build complete index
npx tsx src/cli/index-cli.ts build --symbols --dependencies

# Index specific file
npx tsx src/cli/index-cli.ts file /path/to/file.ts

# Search files
npx tsx src/cli/index-cli.ts search "user" --language typescript

# Get metrics
npx tsx src/cli/index-cli.ts metrics

# Check status
npx tsx src/cli/index-cli.ts status
```

#### Code Marking

```bash
# Analyze file for issues
npx tsx src/cli/mark-cli.ts analyze <fileId> --complexity --patterns --security

# List markings
npx tsx src/cli/mark-cli.ts list <fileId> --severity HIGH

# Interactive review
npx tsx src/cli/mark-cli.ts review <fileId>

# Batch analyze
npx tsx src/cli/mark-cli.ts batch --pattern "*.ts" --language typescript

# Get statistics
npx tsx src/cli/mark-cli.ts stats
```

#### Refactoring

```bash
# Create refactoring plan
npx tsx src/cli/refactor-cli.ts plan <fileId>

# Execute refactoring
npx tsx src/cli/refactor-cli.ts execute <refactoringId> --auto-approve

# Apply changes
npx tsx src/cli/refactor-cli.ts apply <refactoringId>

# Batch refactor
npx tsx src/cli/refactor-cli.ts batch --type OPTIMIZE --pattern "*.ts"

# Interactive workflow
npx tsx src/cli/refactor-cli.ts interactive

# Get statistics
npx tsx src/cli/refactor-cli.ts stats
```

### API Endpoints

#### Indexing
- `POST /api/v1/index/build` - Build full index
- `GET /api/v1/index/status` - Get indexing status
- `POST /api/v1/index/file` - Index single file
- `GET /api/v1/index/search` - Search files
- `GET /api/v1/index/metrics` - Get metrics

#### Markings
- `POST /api/v1/markings/analyze` - Analyze file
- `GET /api/v1/markings/file/:fileId` - Get file markings
- `GET /api/v1/markings/stats` - Get statistics

#### Patterns
- `POST /api/v1/patterns/detect` - Detect patterns
- `POST /api/v1/patterns/autofix` - Apply auto-fix
- `GET /api/v1/patterns/stats` - Get statistics

#### Refactoring
- `POST /api/v1/refactoring/plan` - Create plan
- `POST /api/v1/refactoring/:id/execute` - Execute refactoring
- `POST /api/v1/refactoring/:id/apply` - Apply changes
- `POST /api/v1/refactoring/batch` - Batch refactor
- `GET /api/v1/refactoring/stats` - Get statistics

#### Agents
- `POST /api/v1/agents/spawn` - Spawn agent
- `POST /api/v1/agents/parallel` - Execute parallel tasks
- `POST /api/v1/agents/workflow` - Execute workflow
- `GET /api/v1/agents/active` - Get active agents
- `GET /api/v1/agents/queue` - Get queue status

## Example Workflows

### 1. Full Codebase Analysis

```bash
# Build index
npx tsx src/cli/index-cli.ts build --symbols --dependencies

# Batch analyze all TypeScript files
npx tsx src/cli/mark-cli.ts batch --pattern "*.ts"

# View statistics
npx tsx src/cli/mark-cli.ts stats
```

### 2. Fix High-Priority Issues

```bash
# Find critical issues
curl http://localhost:4192/api/v1/markings/stats | jq '.bySeverity'

# Create refactoring plan for critical issues
npx tsx src/cli/refactor-cli.ts interactive
```

### 3. Continuous Monitoring

```bash
# Start service with file watching
npm run dev

# Files are automatically analyzed on change
# Check real-time updates via WebSocket
wscat -c ws://localhost:4192
> {"type": "subscribe", "payload": {"channel": "analysis"}}
```

## WebSocket Events

Connect to `ws://localhost:4192` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:4192');

// Subscribe to analysis updates
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { channel: 'analysis' }
}));

// Receive marking events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'marking') {
    console.log('New marking:', event.data);
  }
});
```

## Performance Optimization

### Indexing Performance
- Batch processing with configurable batch size
- Parallel file processing
- Incremental updates via file watching
- Content hashing for change detection

### Agent Performance
- Concurrent agent execution (up to 5 agents)
- Task queuing with priority support
- Resource locking for conflict prevention
- Automatic retry with exponential backoff

### Database Performance
- Indexed fields for fast queries
- Cascading deletes for consistency
- Batch insertions for efficiency

## Troubleshooting

### Common Issues

1. **Indexing Timeout**
   - Reduce `INDEX_BATCH_SIZE`
   - Increase `AGENT_TIMEOUT`

2. **Memory Issues**
   - Reduce `MAX_CONCURRENT_AGENTS`
   - Enable file size limits

3. **Agent Failures**
   - Check AI Orchestrator service
   - Verify agent quotas
   - Review error logs

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

## Development

### Running Tests

```bash
npm test
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Adding New Patterns

Edit `src/services/pattern-detector.service.ts`:

```typescript
this.addPattern({
  name: 'my-pattern',
  description: 'Description',
  type: PatternType.ANTIPATTERN,
  pattern: /regex-pattern/g,
  category: 'category',
  severity: 'high',
  autoFix: (code, match) => code.replace(match, 'fixed')
});
```

## Integration

### With AI Orchestrator

Ensure AI Orchestrator is running on port 4191:

```bash
cd services/ai-assistant
ORCHESTRATION_PORT=4191 npm run dev
```

### With Gateway

Register service in gateway configuration:

```json
{
  "name": "code-marking",
  "url": "http://localhost:4192",
  "healthCheck": "/health"
}
```

## License

MIT

## Support

For issues and questions, please check the documentation or create an issue in the repository.