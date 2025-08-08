# 🚀 Start Guide - Personal Assistant System

## Quick Start Options

### 1️⃣ Interactive Mode (Recommended)
```bash
./start.sh
```
เลือก mode ที่ต้องการ:
- **1** = Development with hot-reload (ดีที่สุดสำหรับ development)
- **2** = Development standard 
- **3** = Production mode
- **4** = Custom server.js with WebSocket

### 2️⃣ Command Line Options

#### Development with Hot-Reload (Best for coding)
```bash
./start.sh --dev-all
# หรือ
./start.sh -d
```
✅ Auto-reload เมื่อแก้ code
✅ TypeScript watch mode
✅ WebSocket enabled

#### Quick Start (Skip all checks)
```bash
./start.sh --quick
# หรือ
./start.sh -q
```
⚡ เร็วที่สุด แต่ไม่เช็คอะไรเลย

#### Production Mode
```bash
./start.sh --production
# หรือ
./start.sh -p
```
🔒 Optimized build
🚀 Best performance

#### Help
```bash
./start.sh --help
# หรือ
./start.sh -h
```

## Features ของ start.sh ใหม่

### ✨ Smart Checks
- ✅ ตรวจสอบ Node.js installation
- ✅ ตรวจสอบและติดตั้ง dependencies อัตโนมัติ
- ✅ ตรวจสอบ Prisma client
- ✅ ตรวจสอบ port availability
- ✅ ทดสอบ database connection
- ✅ ตรวจสอบและ build ถ้าจำเป็น

### 🎨 Beautiful UI
- สีสันสวยงาม ดูง่าย
- แสดง IP addresses ทั้งหมด
- แสดง URLs สำหรับทุก service
- Progress indicators

### 🔧 Auto-Build Detection
- ตรวจสอบว่า dist/ folder มีหรือไม่
- ตรวจสอบว่า .next/ folder มีหรือไม่
- ตรวจสอบว่า source files ใหม่กว่า build หรือไม่
- Build อัตโนมัติถ้าจำเป็น

### 🌐 Network Information
แสดง URLs สำหรับ:
- Local access (localhost)
- Network access (LAN IP)
- Main application
- Assistant interface
- API health check
- WebSocket endpoint

## Alternative Start Methods

### npm scripts
```bash
# Development
npm run dev          # Next.js only
npm run dev:server   # Server with nodemon
npm run dev:all      # Everything with hot-reload

# Production
npm run build        # Build Next.js
npm run build:server # Build server files
npm run start        # Start production

# Utilities
npm run rebuild      # Full rebuild
npm run restart      # Quick restart
```

### Direct scripts
```bash
# Full rebuild and start
./rebuild.sh

# Quick restart
./quick-restart.sh

# Development with watch
./scripts/dev-watch.sh
```

## Troubleshooting

### ❌ Port already in use
```bash
npx kill-port 4000
./start.sh
```

### ❌ Database connection failed
ไม่ต้องกังวล! ระบบจะใช้ file system แทน

### ❌ Build failed
```bash
# Clean and rebuild
rm -rf dist/ .next/ node_modules/
npm install
./rebuild.sh
```

### ❌ Permission denied
```bash
chmod +x start.sh
chmod +x rebuild.sh
chmod +x quick-restart.sh
chmod +x scripts/*.sh
```

## Environment Variables

สามารถ override ได้:
```bash
# Custom port
PORT=3000 ./start.sh

# Force production
NODE_ENV=production ./start.sh

# Database URL
DATABASE_URL="postgresql://..." ./start.sh
```

## Recommended Workflow

### For Development
```bash
# First time
./start.sh -d

# แก้ code - auto reload จะทำงาน

# ถ้ามีปัญหา
./quick-restart.sh
```

### For Testing
```bash
# Production-like environment
./start.sh -p
```

### For Deployment
```bash
# On server
NODE_ENV=production ./start.sh -p

# Or use PM2
pm2 start ecosystem.config.js
```

---

**Tips:**
- ใช้ `./start.sh -d` สำหรับ development (best)
- ใช้ `./start.sh -q` เมื่อต้องการเร็วๆ
- ใช้ `./start.sh -p` สำหรับ test production
- ใช้ `./start.sh` แบบไม่มี option เพื่อเลือก mode

**Quick Access:**
- App: http://127.0.0.1:4000
- Assistant: http://127.0.0.1:4000/assistant
- API: http://127.0.0.1:4000/api/health