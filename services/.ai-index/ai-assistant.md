# AI Assistant Service Index

## @AI-MARKER Quick Jump Points

### Core Components
- **Main Entry**: src/index.ts
- **Claude Service**: src/services/claude.service.ts
- **Task Orchestrator**: src/services/ai-orchestration/task-orchestrator.service.ts
- **Multi-Agent Coordinator**: src/services/ai-orchestration/multi-agent-coordinator.service.ts
- **Task Planner**: src/services/ai-orchestration/task-planner.service.ts

### AI Orchestration
- **Task Orchestrator**: 674 lines - Complex task chain management
- **Multi-Agent Coordinator**: 1,027 lines - Agent collaboration
- **Task Planner**: 960 lines - Intelligent task planning

### Controllers
- **Chat Controller**: src/controllers/chat.controller.ts
- **Chat CLI Controller**: src/controllers/chat-cli.controller.ts

### Services
- **Conversation Service**: src/services/conversation.service.ts
- **WebSocket Service**: src/services/websocket.service.ts

## Service Information
- **Port**: 4130
- **Type**: AI Assistant & Orchestration
- **Model**: Claude (API/CLI)

## Critical Paths
- **Chat Flow**: Request → Controller → Claude Service → Response
- **Task Orchestration**: Plan → Execute → Monitor → Complete
- **Multi-Agent**: Coordinate → Distribute → Sync → Aggregate

## API Routes
- `/api/v1/chat` - Chat endpoints
- `/api/v1/assistant` - Assistant features
- `/api/v1/orchestration` - Task orchestration
- `/api/v1/agents` - Multi-agent management

## Configuration
- **USE_CLAUDE_CLI**: Toggle CLI/API mode
- **MAX_TOKENS**: 4096
- **WebSocket**: Real-time chat support