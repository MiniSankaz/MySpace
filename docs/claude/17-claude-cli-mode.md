# Claude CLI Mode - AI Assistant Service

## Overview

AI Assistant Service สามารถใช้งาน Claude ได้ 2 แบบ:

1. **CLI Mode** (Default) - ใช้ Claude CLI ที่ติดตั้งบนเครื่อง server
2. **API Mode** - ใช้ Anthropic API โดยตรง

## การทำงานของ CLI Mode

```
[Web Request] → [AI Service :4130] → [Terminal Service :4140] → [Execute: claude chat] → [Stream Response]
```

### ข้อดีของ CLI Mode

✅ **ไม่ต้องใช้ API Key** - ใช้ authentication ของ Claude CLI ที่ login ไว้แล้ว  
✅ **ประหยัด Cost** - ไม่มีค่าใช้จ่าย API  
✅ **Full Features** - เข้าถึงความสามารถทั้งหมดของ Claude CLI  
✅ **Real-time Streaming** - รับ response แบบ streaming ผ่าน terminal output  
✅ **Local Processing** - ข้อมูลไม่ต้องผ่าน external API

## Configuration

### 1. Environment Variables

```bash
# services/ai-assistant/.env

# Use Claude CLI instead of API (default: true)
USE_CLAUDE_CLI=true

# Terminal Service URL (for CLI mode)
TERMINAL_SERVICE_URL=http://localhost:4140

# Optional: API Key (only needed if USE_CLAUDE_CLI=false)
CLAUDE_API_KEY=your-api-key-here
```

### 2. Prerequisites

```bash
# Check Claude CLI installation
which claude
# Expected: /path/to/claude

# Check Claude CLI version
claude --version
# Expected: 1.0.83 (Claude Code) or later

# Check Claude CLI authentication
claude auth status
# Expected: Authenticated
```

## Architecture

### Service Components

```
┌─────────────────────────────────────────────┐
│          AI Assistant Service (4130)         │
│                                              │
│  ┌──────────────┐    ┌──────────────┐      │
│  │ Chat         │    │ WebSocket    │      │
│  │ Controller   │    │ Service      │      │
│  └──────┬───────┘    └──────┬───────┘      │
│         │                    │               │
│         └────────┬───────────┘               │
│                  │                           │
│         ┌────────▼────────┐                 │
│         │ Claude CLI      │                 │
│         │ Service         │                 │
│         └────────┬────────┘                 │
└─────────────────────────────────────────────┘
                   │
                   │ WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│         Terminal Service (4140)              │
│                                              │
│  ┌──────────────┐    ┌──────────────┐      │
│  │ Terminal     │    │ PTY          │      │
│  │ Manager      │    │ Process      │      │
│  └──────┬───────┘    └──────┬───────┘      │
│         │                    │               │
│         └────────┬───────────┘               │
│                  │                           │
│                  ▼                           │
│         ┌────────────────┐                  │
│         │ claude chat    │                  │
│         │ (CLI command)  │                  │
│         └────────────────┘                  │
└─────────────────────────────────────────────┘
```

### Code Flow

1. **Request Reception** (chat.controller.ts)

```typescript
if (this.useCLI) {
  // Use Claude CLI Service
  const cliSession = await claudeCLIService.createSession(userId);
  const responseGenerator = await claudeCLIService.sendMessage(
    cliSession.id,
    message,
  );
}
```

2. **CLI Execution** (claude-cli.service.ts)

```typescript
// Prepare Claude CLI command
const escapedMessage = this.escapeShellCommand(message);
const command = `claude chat "${escapedMessage}"`;

// Execute in terminal
this.socket.emit("terminal:execute", {
  sessionId: session.terminalSessionId,
  command,
});
```

3. **Response Streaming**

```typescript
for await (const chunk of responseGenerator) {
  if (chunk.content) {
    fullContent += chunk.content;
    // Stream to client
  }
}
```

## API Endpoints

All endpoints work the same whether using CLI or API mode:

### REST API

- `POST /chat/sessions` - Create new chat session
- `GET /chat/sessions/:id` - Get session with messages
- `POST /chat/message` - Send message and get response
- `DELETE /chat/sessions/:id` - Delete session

### WebSocket Events

- `auth` - Authenticate WebSocket connection
- `stream_chat` - Send message with streaming response
- `stream_chunk` - Receive response chunks
- `stream_complete` - Response complete

## Testing

### 1. Run Test Script

```bash
# Test CLI integration
node test-claude-cli.js
```

### 2. Manual Testing

```bash
# Send test message via curl
curl -X POST http://localhost:4130/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "userId": "test-user",
    "message": "Hello, Claude!"
  }'
```

### 3. Check Service Status

```bash
# Health check
curl http://localhost:4130/health

# Service info
curl http://localhost:4130/info
```

## Switching Between Modes

### Use CLI Mode (Default)

```bash
# In services/ai-assistant/.env
USE_CLAUDE_CLI=true
```

### Use API Mode

```bash
# In services/ai-assistant/.env
USE_CLAUDE_CLI=false
CLAUDE_API_KEY=sk-ant-api03-your-key-here
```

## Troubleshooting

### Common Issues

1. **Claude CLI not found**

```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli
```

2. **Claude CLI not authenticated**

```bash
# Login to Claude CLI
claude login
```

3. **Terminal Service not running**

```bash
# Start Terminal Service
cd services/terminal
npm run dev
```

4. **WebSocket connection failed**

```bash
# Check Terminal Service health
curl http://localhost:4140/health
```

### Debug Logging

```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev

# Check logs
tail -f logs/ai-assistant.log
```

## Performance Considerations

### CLI Mode

- **Latency**: ~100-200ms overhead for terminal execution
- **Throughput**: Limited by terminal I/O speed
- **Memory**: Lower memory usage (no SDK overhead)
- **Concurrency**: Limited by terminal session pool

### API Mode

- **Latency**: Direct API calls (faster)
- **Throughput**: Higher for concurrent requests
- **Memory**: Higher due to SDK buffers
- **Concurrency**: Limited only by API rate limits

## Security

### CLI Mode Security

- ✅ No API keys in code or environment
- ✅ Uses local system authentication
- ✅ Command injection protection via escaping
- ✅ Terminal session isolation per user

### Best Practices

1. Always escape user input before CLI execution
2. Implement rate limiting at application level
3. Monitor terminal session lifecycle
4. Clean up sessions after use

## Migration Guide

### From API to CLI Mode

1. **Update Environment**

```bash
# services/ai-assistant/.env
USE_CLAUDE_CLI=true
TERMINAL_SERVICE_URL=http://localhost:4140
```

2. **Ensure Services Running**

```bash
# Terminal Service must be running
cd services/terminal && npm run dev
```

3. **Authenticate Claude CLI**

```bash
claude auth status
# If not authenticated:
claude login
```

4. **Restart AI Service**

```bash
cd services/ai-assistant
npm run dev
```

5. **Test**

```bash
node test-claude-cli.js
```

---

## Summary

Claude CLI Mode ทำให้ AI Assistant Service สามารถใช้งาน Claude ผ่าน CLI ที่ติดตั้งบนเครื่อง server แทนการใช้ API โดยตรง ซึ่งช่วยประหยัด cost และให้ความยืดหยุ่นในการใช้งานมากขึ้น โดยยังคงรองรับ features ทั้งหมดเหมือนเดิม รวมถึง real-time streaming และ session management
