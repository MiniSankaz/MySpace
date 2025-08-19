# 🤖 Personal Assistant + Claude AI Integration

## 🚀 Quick Start

รัน Personal Assistant พร้อม Claude AI:

```bash
npm run assistant
```

หรือรันแยก:

```bash
# Terminal 1: Main server
npm run dev

# Terminal 2: Claude terminal
npm run ai:terminal
```

## 📋 Features

### 1. Personal Assistant Commands

- **Tasks**: `task add`, `task list`, `task complete`
- **Reminders**: `reminder set`, `reminder list`, `reminder delete`
- **Notes**: `note create`, `note list`, `note search`

### 2. AI-Powered Commands (Claude)

- **`ai [message]`** - คุยกับ Claude AI
- **`code [requirements]`** - สร้างโค้ดด้วย AI
- **`explain [concept]`** - อธิบายแนวคิด/โค้ด
- **`debug [error]`** - ช่วย debug
- **`analyze [code]`** - วิเคราะห์โค้ด

### 3. Natural Language Processing

ระบบเข้าใจภาษาธรรมชาติ เช่น:

- "เตือนฉันประชุม 2 โมง"
- "how to implement auth in Next.js"
- "ช่วยแก้ error undefined is not a function"

## 🔧 Architecture

```
┌─────────────────────────────────────┐
│         Web Interface               │
│     http://127.0.0.1:4110           │
└──────────┬──────────────────────────┘
           │
           ├── REST API
           ├── WebSocket
           │
┌──────────▼──────────────────────────┐
│     Assistant Service               │
│   - Command Registry                │
│   - Context Manager                 │
│   - NLP Processor                   │
└──────────┬──────────────────────────┘
           │
           ├── Local Commands
           │
┌──────────▼──────────────────────────┐
│      Claude AI Service              │
│   - API Integration                 │
│   - CLI Integration                 │
│   - Fallback Logic                  │
└─────────────────────────────────────┘
           │
           ├── Claude API
           ├── Claude CLI
           │
┌──────────▼──────────────────────────┐
│     Claude Terminal (Optional)      │
│   Parallel Process for Direct AI    │
└─────────────────────────────────────┘
```

## 🛠️ Configuration

### Environment Variables

```bash
# .env.local
CLAUDE_API_KEY=your-api-key-here  # Optional
PORT=4110
DATABASE_URL=postgresql://...
```

### AI Configuration

```typescript
// src/modules/personal-assistant/services/claude-ai.service.ts
{
  model: 'claude-3-sonnet',    // AI model
  maxTokens: 4110,              // Max response length
  temperature: 0.7,             // Creativity level
  command: 'claude'             // CLI command
}
```

## 📝 Usage Examples

### 1. Basic Task Management

```
You: task add ทำ presentation
Bot: ✅ Task added: "ทำ presentation"

You: task list
Bot: 📋 Pending Tasks:
     🟡 ทำ presentation (ID: task-123)
```

### 2. AI Code Generation

```
You: code React login form with validation
Bot: 🤖 AI Generated Code:
     [Complete React component with form validation]
```

### 3. Natural Language

```
You: เตือนฉันประชุมตอนบ่าย 2
Bot: ⏰ ตั้งเตือน: "ประชุม" เวลา 14:00

You: how to center a div in CSS?
Bot: 🤖 Claude AI: Here are several ways to center a div...
```

### 4. Code Debugging

```
You: debug TypeError: Cannot read property 'map' of undefined
Bot: 🔧 AI Debug Solution:
     The error occurs when trying to use .map() on undefined...
```

## 🔌 API Endpoints

### Chat API

```bash
POST /api/assistant/chat
{
  "message": "your message",
  "sessionId": "optional-session-id"
}
```

### Task API

```bash
GET /api/assistant/tasks
POST /api/assistant/tasks
PUT /api/assistant/tasks?id=task-id
DELETE /api/assistant/tasks?id=task-id
```

### WebSocket Events

```javascript
// Connect
const socket = io("ws://127.0.0.1:4110");

// Join session
socket.emit("join-session", { userId, sessionId });

// Send message
socket.emit("assistant-message", {
  userId,
  sessionId,
  message,
});

// Receive response
socket.on("assistant-response", (data) => {
  console.log(data.content);
});
```

## 🎯 Features by Phase

### ✅ Phase 1 (Complete)

- [x] Module structure
- [x] Database schema
- [x] Core services
- [x] Basic commands (17 total)
- [x] Chat interface
- [x] WebSocket support
- [x] Authentication
- [x] Rate limiting
- [x] Claude AI integration

### 🚧 Phase 2 (Planned)

- [ ] Voice recognition
- [ ] Calendar integration
- [ ] Email management
- [ ] File operations
- [ ] Third-party APIs

### 🔮 Phase 3 (Future)

- [ ] Workflow automation
- [ ] Machine learning
- [ ] Predictive suggestions
- [ ] Multi-modal interactions

## 🐛 Troubleshooting

### Claude AI Not Working

1. Check API key: `echo $CLAUDE_API_KEY`
2. Check Claude CLI: `which claude`
3. Falls back to local NLP if unavailable

### WebSocket Connection Failed

1. Check server is running: `lsof -i:4110`
2. Check browser console for errors
3. Try refresh page

### Rate Limit Exceeded

- Wait 60 seconds
- API: 60 req/min
- Assistant: 30 req/min
- Auth: 5 req/5min

## 📚 Development

### Run Tests

```bash
npm test
npm run test:e2e
```

### Build Production

```bash
npm run build
npm start
```

### Debug Mode

```bash
DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file

---

Built with ❤️ using Next.js, TypeScript, and Claude AI
