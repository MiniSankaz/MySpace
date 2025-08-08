# 🤖 Claude Background Integration

## ✅ ระบบพร้อมใช้งาน Claude Background!

ระบบสามารถรัน Claude ใน background และเชื่อมต่อกับ chat interface ได้แล้ว

## 📋 วิธีใช้งาน

### 1. เริ่มระบบพร้อม Claude Background
```bash
./start-with-claude.sh
```
- จะเริ่ม Claude ใน background อัตโนมัติ
- Chat interface จะเชื่อมต่อกับ Claude process
- ข้อความทั้งหมดจะถูกส่งไปยัง Claude จริง

### 2. ควบคุม Claude แยกต่างหาก
```bash
# เริ่ม Claude
./claude-control.sh start

# หยุด Claude  
./claude-control.sh stop

# ดูสถานะ
./claude-control.sh status

# ดู logs
./claude-control.sh logs

# ส่งข้อความตรงๆ
./claude-control.sh send "Hello Claude"

# รีสตาร์ท
./claude-control.sh restart
```

### 3. เริ่มระบบปกติ (ไม่มี Claude background)
```bash
./start.sh
```
- ใช้ NLP fallback หรือ API mode
- เหมาะสำหรับทดสอบหรือไม่มี Claude CLI

## 🔧 การทำงาน

### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Chat Interface │────▶│  Assistant       │────▶│   Claude     │
│   (Browser)     │     │   Service        │     │  Background  │
└─────────────────┘     └──────────────────┘     └──────────────┘
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
   WebSocket              Claude Realtime           Terminal
                            Service                  Process
```

### Components

1. **ClaudeBackgroundService** (`/src/services/claude-background.service.ts`)
   - จัดการ Claude process ใน background
   - ใช้ named pipe สำหรับ IPC
   - Queue messages และ handle responses

2. **ClaudeRealtimeService** (`/src/modules/personal-assistant/services/claude-realtime.service.ts`)
   - Singleton service สำหรับ realtime communication
   - จัดการ sessions และ message routing
   - Auto-restart ถ้า Claude crash

3. **ClaudeAIService** (อัพเดทแล้ว)
   - ตรวจสอบ `CLAUDE_REALTIME` environment variable
   - ถ้า true จะใช้ realtime service
   - Fallback to API/local NLP ถ้าไม่มี

## 🎯 Features

### เมื่อใช้ Claude Background:
- **Real-time responses** - ตอบสนองแบบ streaming
- **Persistent context** - Claude จำบทสนทนาได้
- **No API limits** - ใช้ Claude CLI unlimited
- **Better performance** - ไม่ต้อง spawn process ใหม่ทุกครั้ง

### Commands ที่ใช้ได้:
- `ai [message]` - คุยกับ Claude
- `code [requirement]` - สร้างโค้ด
- `explain [concept]` - อธิบายแนวคิด
- `debug [error]` - ช่วย debug
- `analyze [code]` - วิเคราะห์โค้ด

## 📊 Monitoring

### ดู Claude Logs:
```bash
tail -f logs/claude.log
```

### ดู Server Logs:
```bash
# Terminal 1 - Server
npm run dev

# Terminal 2 - Claude logs
./claude-control.sh logs
```

## ⚙️ Configuration

### Environment Variables:
```env
# .env.local
CLAUDE_REALTIME=true    # เปิดใช้ background mode
CLAUDE_API_KEY=sk-...   # (Optional) สำหรับ API fallback
```

### Auto-start Claude:
```bash
# เพิ่มใน ~/.bashrc หรือ ~/.zshrc
alias assistant="cd /path/to/project && ./start-with-claude.sh"
```

## 🔍 Troubleshooting

### Claude ไม่ตอบสนอง:
```bash
# ตรวจสอบ status
./claude-control.sh status

# ดู logs
./claude-control.sh logs

# รีสตาร์ท
./claude-control.sh restart
```

### Port 4000 ถูกใช้:
```bash
# หา process ที่ใช้ port
lsof -i :4000

# หรือเปลี่ยน port
PORT=5000 ./start-with-claude.sh
```

### Claude CLI ไม่พบ:
```bash
# ติดตั้ง Claude CLI
npm install -g @anthropic/claude-cli

# หรือใช้โหมดปกติ
./start.sh
```

## ✨ Tips

1. **เริ่มแยก Terminal**: 
   - Terminal 1: `./start-with-claude.sh`
   - Terminal 2: `./claude-control.sh logs`

2. **Test Claude ตรงๆ**:
   ```bash
   ./claude-control.sh send "What is TypeScript?"
   ```

3. **Production Mode**:
   - ใช้ PM2 สำหรับ auto-restart
   - Setup systemd service สำหรับ boot startup

---

## 🎉 พร้อมใช้งาน!

ระบบสามารถ:
- ✅ รัน Claude ใน background
- ✅ เชื่อมต่อ chat interface กับ Claude process
- ✅ ส่งข้อความและรับคำตอบแบบ realtime
- ✅ Fallback ถ้า Claude ไม่พร้อม
- ✅ จัดการ sessions และ message queue

เริ่มใช้: `./start-with-claude.sh` 🚀