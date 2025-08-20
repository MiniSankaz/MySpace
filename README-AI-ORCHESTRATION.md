# 🤖 AI Orchestration System - คู่มือการใช้งาน

## 📋 Overview

ระบบ AI Orchestration ช่วยให้คุณสามารถ spawn และจัดการ Claude AI agents หลายตัวพร้อมกัน (parallel) เพื่อทำงานต่างๆ บน microservices ของคุณ

## 🚀 Quick Start

### 1. เริ่มต้นใช้งานด่วน

```bash
# Start orchestration server และ spawn 3 agents แบบ demo
./orchestrate-ai.sh demo
```

### 2. การใช้งานพื้นฐาน

```bash
# Start server
./orchestrate-ai.sh start

# Check status
./orchestrate-ai.sh status

# View active agents
./orchestrate-ai.sh agents

# Stop server
./orchestrate-ai.sh stop
```

## 🎯 การ Spawn Agents

### Single Agent
```bash
./orchestrate-ai.sh spawn business-analyst "Analyze requirements" "Analyze the authentication system"
```

### Multiple Agents (Parallel)
```bash
./orchestrate-ai.sh parallel
```

### Custom Parallel Tasks
```bash
# ใช้ test script
npx tsx test-parallel-agents.ts
```

## 📊 การใช้งานผ่าน API

### Spawn Single Agent
```bash
curl -X POST http://localhost:4190/api/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{
    "type": "code-reviewer",
    "task": {
      "description": "Review authentication code",
      "prompt": "Review the auth module for security issues"
    }
  }'
```

### Spawn Parallel Agents
```bash
curl -X POST http://localhost:4190/api/spawn-parallel \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "description": "Task 1",
        "prompt": "Do something"
      },
      {
        "description": "Task 2", 
        "prompt": "Do something else"
      }
    ]
  }'
```

## 🔧 Agent Types

| Type | Use Case |
|------|----------|
| `business-analyst` | วิเคราะห์ requirements |
| `code-reviewer` | Review code quality |
| `test-runner` | สร้างและรัน tests |
| `technical-architect` | ออกแบบ architecture |
| `development-planner` | วางแผนการพัฒนา |
| `sop-enforcer` | ตรวจสอบ standards |
| `general-purpose` | งานทั่วไป |

## 📡 Real-time Monitoring

### WebSocket Connection
```javascript
const socket = io('ws://localhost:4190');

socket.on('agent:output', (data) => {
  console.log(`Agent output: ${data.output}`);
});

socket.on('agent:completed', (agent) => {
  console.log(`Agent completed: ${agent.id}`);
});
```

### Dashboard
เปิด browser ไปที่: http://localhost:4190/health

## 🛠️ Configuration

### Environment Variables
```bash
# Max concurrent agents (default: 5)
export MAX_CONCURRENT_AGENTS=5

# Orchestration port (default: 4190)
export ORCHESTRATION_PORT=4190

# Claude CLI path
export CLAUDE_CLI_PATH=/usr/local/bin/claude
```

## 📝 Use Cases

### 1. Parallel Microservices Development
```bash
# พัฒนา 3 services พร้อมกัน
curl -X POST http://localhost:4190/api/spawn-parallel \
  -d '{
    "tasks": [
      {"description": "Develop User Service", "prompt": "..."},
      {"description": "Develop Portfolio Service", "prompt": "..."},
      {"description": "Develop Gateway Service", "prompt": "..."}
    ]
  }'
```

### 2. Code Review + Testing
```bash
# Review และ test พร้อมกัน
curl -X POST http://localhost:4190/api/spawn-parallel \
  -d '{
    "tasks": [
      {"description": "Review code", "prompt": "Review for security"},
      {"description": "Create tests", "prompt": "Create unit tests"}
    ]
  }'
```

### 3. Requirements Analysis + Planning
```bash
# วิเคราะห์และวางแผนพร้อมกัน
curl -X POST http://localhost:4190/api/spawn-parallel \
  -d '{
    "tasks": [
      {"description": "Analyze requirements", "prompt": "..."},
      {"description": "Create development plan", "prompt": "..."},
      {"description": "Design architecture", "prompt": "..."}
    ]
  }'
```

## 🔍 Troubleshooting

### Server ไม่ start
```bash
# Check port
lsof -i:4190

# Kill existing process
kill $(lsof -ti:4190)

# Restart
./orchestrate-ai.sh restart
```

### Agents ไม่ทำงาน
```bash
# Check logs
./orchestrate-ai.sh logs

# Check Claude CLI
which claude
claude --version
```

### Memory issues
```bash
# Clean up old logs
npx tsx scripts/cleanup-for-ai.ts

# Restart server
./orchestrate-ai.sh restart
```

## 📈 Performance Tips

1. **Limit concurrent agents**: ใช้ไม่เกิน 3-5 agents พร้อมกัน
2. **Use resource locks**: ป้องกัน conflicts เมื่อแก้ไขไฟล์เดียวกัน
3. **Monitor usage**: ตรวจสอบ API usage เป็นประจำ
4. **Clean logs regularly**: รัน cleanup script ทุกวัน

## 🎉 Example Success Case

```bash
# Start server
$ ./orchestrate-ai.sh start
✓ Server started on port 4190

# Run parallel agents
$ ./orchestrate-ai.sh demo
Spawning 3 agents in parallel...
✓ Successfully spawned 3 agents
  → Agent abc12345 (business-analyst)
  → Agent def67890 (code-reviewer)
  → Agent ghi13579 (test-runner)

# Check status after 30 seconds
$ ./orchestrate-ai.sh agents
Active: 1, Completed: 2, Failed: 0

# All agents completed!
```

## 🔐 Security Notes

- Agents run with your user permissions
- API requires authentication in production
- Logs may contain sensitive data
- Use approval gates for critical operations

## 📞 Support

หากพบปัญหา:
1. Check logs: `./orchestrate-ai.sh logs`
2. Check health: `./orchestrate-ai.sh status`
3. Restart server: `./orchestrate-ai.sh restart`
4. Review this documentation

---

**Ready to orchestrate AI agents!** 🚀