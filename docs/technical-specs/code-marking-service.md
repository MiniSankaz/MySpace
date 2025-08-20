# Technical Specification: Code Marking and Refactoring Service

## Executive Summary

The Code Marking Service is a comprehensive multi-agent system designed for intelligent code analysis, marking, and automated refactoring. It leverages parallel AI agents to perform deep code analysis, identify issues, and execute complex refactoring operations while maintaining a comprehensive index of the entire codebase.

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Code Marking Service (4192)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Service Layer                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│   │
│  │  │Code Index│  │ Marking  │  │Refactor  │  │  Agent   ││   │
│  │  │ Service  │  │  Engine  │  │ Service  │  │Coordinator││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Support Services                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│   │
│  │  │ Pattern  │  │   File   │  │  Queue   │  │WebSocket ││   │
│  │  │ Detector │  │  Watcher │  │ Service  │  │  Server  ││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                             │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐     │   │
│  │  │    PostgreSQL DB     │  │     Redis Cache      │     │   │
│  │  └──────────────────────┘  └──────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              External Dependencies                        │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐     │   │
│  │  │  AI Orchestrator      │  │   Claude CLI Agents  │     │   │
│  │  │      (4191)           │  │                      │     │   │
│  │  └──────────────────────┘  └──────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Component Specifications

### 1. Code Index Service

**Purpose**: Maintains comprehensive index of codebase with symbols, dependencies, and metadata.

**Key Features**:
- Full and incremental indexing
- Symbol extraction (functions, classes, methods, components)
- Dependency graph construction
- Multi-language support

**Data Flow**:
```
File System → Parser → Symbol Extractor → Database
                ↓
         Dependency Analyzer → Relationship Mapper
```

**Technical Implementation**:
- Uses ts-morph for TypeScript/JavaScript parsing
- Babel parser for broader JavaScript support
- Parallel processing with worker threads
- MD5 hashing for change detection

### 2. Marking Engine Service

**Purpose**: Analyzes code for issues, patterns, and improvement opportunities.

**Analysis Types**:
- Complexity analysis (cyclomatic, cognitive)
- Duplicate code detection
- Pattern violation detection
- Security vulnerability scanning
- Performance bottleneck identification
- Naming convention enforcement
- Dead code detection

**Marking Severity Levels**:
- CRITICAL: Security issues, breaking bugs
- HIGH: Performance issues, major violations
- MEDIUM: Code smells, moderate complexity
- LOW: Style issues, minor improvements
- INFO: Suggestions, best practices

### 3. Agent Coordinator Service

**Purpose**: Manages multi-agent execution for complex analysis tasks.

**Agent Types**:
- CODE_REVIEWER: General code quality analysis
- TECHNICAL_ARCHITECT: Architecture and design patterns
- SYSTEM_ANALYST: Requirements and documentation
- SOP_ENFORCER: Standards compliance
- BUSINESS_ANALYST: Business logic validation
- DEVELOPMENT_PLANNER: Refactoring planning

**Coordination Features**:
- Parallel task execution
- Resource locking mechanism
- Task dependency management
- Priority-based scheduling
- Automatic retry with backoff

### 4. Refactoring Service

**Purpose**: Executes AI-powered code refactoring operations.

**Refactoring Types**:
- EXTRACT_FUNCTION: Extract code into functions
- EXTRACT_VARIABLE: Create variables for expressions
- RENAME: Rename symbols consistently
- REMOVE_DUPLICATE: Eliminate duplicate code
- OPTIMIZE: Performance optimizations
- MODERNIZE: Update to modern syntax
- ADD_TYPES: Add TypeScript annotations
- REORGANIZE_IMPORTS: Clean up imports

**Workflow**:
1. Analyze markings
2. Generate refactoring plan
3. Execute with AI agent
4. Generate diff
5. Review/approve
6. Apply changes

### 5. Pattern Detector Service

**Purpose**: Identifies code patterns and anti-patterns.

**Built-in Patterns**:
- Console.log statements
- Any type usage
- Magic numbers
- SQL injection risks
- Eval usage
- Nested loops
- Missing error handling
- Large functions

**Pattern Matching**:
- Regex-based patterns
- AST-based patterns
- Custom function patterns
- Confidence scoring

## Data Models and Schemas

### Core Entities

#### CodeFile
```typescript
{
  id: string
  path: string (unique)
  relativePath: string
  name: string
  extension: string
  size: number
  lines: number
  language: string?
  hash: string
  lastModified: DateTime
  content: string?
  parsed: boolean
  indexed: boolean
  symbols: Symbol[]
  dependencies: Dependency[]
  markings: CodeMarking[]
  refactorings: Refactoring[]
  patterns: PatternMatch[]
}
```

#### Symbol
```typescript
{
  id: string
  fileId: string
  name: string
  type: SymbolType
  line: number
  column: number
  endLine: number?
  endColumn: number?
  signature: string?
  documentation: string?
  visibility: string?
  complexity: number?
  params: JSON?
  returnType: string?
}
```

#### CodeMarking
```typescript
{
  id: string
  fileId: string
  symbolId: string?
  type: MarkingType
  severity: MarkingSeverity
  category: string
  message: string
  suggestion: string?
  line: number
  column: number
  endLine: number?
  endColumn: number?
  context: JSON?
  autoFixable: boolean
  fixed: boolean
  ignored: boolean
}
```

#### Refactoring
```typescript
{
  id: string
  fileId: string
  type: RefactoringType
  status: RefactoringStatus
  description: string
  diff: string?
  appliedDiff: string?
  error: string?
  startedAt: DateTime?
  completedAt: DateTime?
  markings: RefactoringMark[]
  agentTasks: AgentTask[]
}
```

## API Specifications

### RESTful Endpoints

#### Indexing APIs
```yaml
POST /api/v1/index/build
  body:
    force: boolean
    patterns: string[]
    extractSymbols: boolean
    detectDependencies: boolean
  response:
    message: string
    status: IndexingStatus

GET /api/v1/index/status
  response:
    totalFiles: number
    indexedFiles: number
    pendingFiles: number
    failedFiles: number
    progress: number
    isRunning: boolean

POST /api/v1/index/file
  body:
    filePath: string
    options: IndexingOptions
  response:
    message: string

GET /api/v1/index/search
  query:
    pattern: string
    language?: string
    limit?: number
  response:
    files: CodeFile[]

GET /api/v1/index/metrics
  response:
    totalFiles: number
    totalLines: number
    totalSymbols: number
    totalDependencies: number
    languages: LanguageStats[]
```

#### Marking APIs
```yaml
POST /api/v1/markings/analyze
  body:
    fileId: string
    options: MarkingOptions
  response:
    message: string

GET /api/v1/markings/file/:fileId
  query:
    severity?: MarkingSeverity
    type?: MarkingType
    fixed?: boolean
  response:
    markings: CodeMarking[]

GET /api/v1/markings/stats
  query:
    fileId?: string
  response:
    byType: TypeStats[]
    bySeverity: SeverityStats[]
    byCategory: CategoryStats[]
```

#### Refactoring APIs
```yaml
POST /api/v1/refactoring/plan
  body:
    fileId: string
    markingIds: string[]
  response:
    plan: RefactoringPlan

POST /api/v1/refactoring/:id/execute
  body:
    autoApprove: boolean
  response:
    message: string

POST /api/v1/refactoring/:id/apply
  response:
    message: string

POST /api/v1/refactoring/batch
  body:
    fileIds: string[]
    type: RefactoringType
  response:
    message: string
```

#### Agent APIs
```yaml
POST /api/v1/agents/spawn
  body:
    type: AgentType
    prompt: string
    context?: object
    priority?: number
  response:
    result: AgentResult

POST /api/v1/agents/parallel
  body:
    tasks: AgentTask[]
  response:
    results: Map<string, AgentResult>

POST /api/v1/agents/workflow
  body:
    filePath: string
    analysisType: string
  response:
    workflow: WorkflowResult

GET /api/v1/agents/active
  response:
    agents: AgentStatus[]

GET /api/v1/agents/queue
  response:
    queue: QueueStatus
```

### WebSocket Events

#### Client → Server
```typescript
// Subscribe to channel
{
  type: 'subscribe',
  payload: {
    channel: 'analysis' | 'indexing' | 'refactoring'
  }
}

// Request status
{
  type: 'index:status' | 'agent:status'
}
```

#### Server → Client
```typescript
// Marking added
{
  type: 'marking',
  data: CodeMarking
}

// Indexing progress
{
  type: 'index:progress',
  data: {
    progress: number,
    filesProcessed: number,
    totalFiles: number
  }
}

// Agent status update
{
  type: 'agent:status',
  data: AgentStatus[]
}

// Refactoring update
{
  type: 'refactoring:update',
  data: {
    id: string,
    status: RefactoringStatus
  }
}
```

## Integration Requirements

### AI Orchestrator Integration
- **Endpoint**: http://localhost:4191
- **Authentication**: Bearer token (if configured)
- **Timeout**: 5 minutes per agent task
- **Retry**: 3 attempts with exponential backoff

### Database Requirements
- **PostgreSQL**: Version 13+
- **Indexes**: On frequently queried fields
- **Cascading**: Proper cascade deletes
- **Transactions**: For atomic operations

### Redis Requirements
- **Version**: 6.0+
- **Purpose**: Queue management, caching
- **Persistence**: AOF for queue durability

## Security Specifications

### Authentication & Authorization
- Service-to-service authentication via API keys
- Rate limiting per client
- Input validation on all endpoints
- SQL injection prevention via Prisma

### Data Security
- File content encryption at rest (optional)
- Secure diff generation
- Backup before refactoring
- Audit logging for all operations

## Performance Requirements

### Indexing Performance
- **Target**: 100+ files/second
- **Batch Size**: 50 files
- **Parallel Workers**: 5
- **Memory Limit**: 2GB per worker

### Analysis Performance
- **Target**: 10 files/second
- **Agent Concurrency**: 5
- **Queue Throughput**: 100 jobs/minute

### Response Times
- **Index Status**: < 100ms
- **File Search**: < 500ms
- **Marking Analysis**: < 5s per file
- **Refactoring Plan**: < 10s

## Implementation Guidelines

### Code Organization
```
services/code-marking/
├── src/
│   ├── index.ts           # Main entry point
│   ├── config.ts          # Configuration
│   ├── routes/            # API routes
│   ├── services/          # Core services
│   ├── models/            # Data models
│   ├── utils/             # Utilities
│   ├── workers/           # Background workers
│   └── cli/               # CLI tools
├── prisma/
│   └── schema.prisma      # Database schema
├── tests/                 # Test files
├── examples/              # Usage examples
└── docs/                  # Documentation
```

### Error Handling
- Graceful degradation on agent failure
- Comprehensive error logging
- User-friendly error messages
- Automatic recovery mechanisms

### Testing Requirements
- Unit tests for all services
- Integration tests for APIs
- E2E tests for workflows
- Performance benchmarks

## Deployment Considerations

### Environment Variables
```env
PORT=4192
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
AI_ORCHESTRATOR_URL=http://localhost:4191
PROJECT_ROOT=/path/to/project
MAX_CONCURRENT_AGENTS=5
```

### Scaling Strategy
- Horizontal scaling via multiple instances
- Load balancing for API requests
- Shared Redis for queue coordination
- Read replicas for database

### Monitoring & Observability
- Health check endpoint
- Prometheus metrics (optional)
- Structured logging
- Performance profiling

## Appendices

### A. Glossary
- **Symbol**: Named code construct (function, class, etc.)
- **Marking**: Identified issue or improvement opportunity
- **Refactoring**: Code transformation operation
- **Agent**: AI-powered analysis worker

### B. References
- TypeScript AST: https://ts-morph.com/
- Babel Parser: https://babeljs.io/docs/babel-parser
- Bull Queue: https://github.com/OptimalBits/bull
- Prisma ORM: https://www.prisma.io/

### C. Version History
- v1.0.0: Initial implementation with core features
- Future: Machine learning for pattern detection
- Future: Visual code analysis dashboard