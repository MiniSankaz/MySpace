# 🔥 Hot Reload & Auto-Rebuild Guide

## Quick Start

### 🚀 Option 1: Full Auto-Reload Development
```bash
# รันทุกอย่างพร้อม auto-reload
npm run dev:all

# หรือใช้ script
./scripts/dev-watch.sh
```

### ⚡ Option 2: Quick Restart (เมื่อแก้ code)
```bash
# Restart ด่วน (auto-detect การเปลี่ยนแปลง)
npm run restart

# หรือ
./quick-restart.sh
```

### 🔨 Option 3: Full Rebuild (เมื่อมีปัญหา)
```bash
# Rebuild ทั้งหมด
npm run rebuild

# หรือ
./rebuild.sh
```

## File Types & Reload Behavior

| File Type | Auto Reload? | Action Required |
|-----------|-------------|-----------------|
| ✅ React Components (`.tsx`) | Yes | ไม่ต้องทำอะไร |
| ✅ API Routes (`/api/`) | Yes | ไม่ต้องทำอะไร |
| ✅ Styles (`.css`) | Yes | ไม่ต้องทำอะไร |
| ⚠️ WebSocket (`socket-server.ts`) | No | รัน `npm run build:server` |
| ⚠️ Services (`/services/`) | No | รัน `npm run build:server` |
| ⚠️ Database Schema | No | รัน `npx prisma generate` |
| 🔴 Dependencies | No | รัน `npm install` + restart |
| 🔴 Environment Variables | No | Restart server |

## Commands Summary

```bash
# Development Commands
npm run dev          # Next.js dev server (port 4000)
npm run dev:server   # Server with nodemon (auto-restart)
npm run dev:all      # ทุกอย่าง + auto-reload
npm run watch:server # TypeScript watch mode

# Build Commands
npm run build        # Build Next.js
npm run build:server # Build server TypeScript files

# Utility Commands
npm run type-check   # Check TypeScript types
npm run lint         # Check code style
npm run format       # Auto-format code
```

## Workflow Examples

### 1️⃣ แก้ไข React Component
```bash
# ไม่ต้องทำอะไร! Next.js hot reload อัตโนมัติ
# แก้ไขไฟล์ใน src/app/ หรือ src/components/
# Browser จะ refresh เอง
```

### 2️⃣ แก้ไข WebSocket/Server Code
```bash
# Terminal 1: Watch TypeScript
npm run watch:server

# Terminal 2: Run with nodemon
npm run dev:server

# แก้ไขไฟล์ - จะ rebuild และ restart อัตโนมัติ
```

### 3️⃣ แก้ไข Database Schema
```bash
# 1. แก้ไข prisma/schema.prisma
# 2. Generate Prisma Client
npx prisma generate

# 3. Push to database (ถ้าต้องการ)
npx prisma db push

# 4. Restart server
npm run restart
```

### 4️⃣ เพิ่ม Dependencies ใหม่
```bash
# 1. Install package
npm install package-name

# 2. Full rebuild
npm run rebuild
```

## Troubleshooting

### ❌ Port 4000 Already in Use
```bash
npx kill-port 4000
npm run dev:all
```

### ❌ TypeScript Errors
```bash
# Check types
npm run type-check

# Clean และ rebuild
rm -rf dist/ .next/
npm run rebuild
```

### ❌ Database Connection Failed
```bash
# Test connection
npx tsx test-db-connection.ts

# Reset Prisma
npx prisma generate
```

### ❌ WebSocket Not Working
```bash
# Rebuild server files
npm run build:server

# Restart
npm run restart
```

## VS Code Integration

VS Code จะ:
- ✅ Auto-format on save
- ✅ Show TypeScript errors real-time
- ✅ Auto-fix ESLint issues
- ✅ Suggest imports

## Production Build

```bash
# Build everything for production
NODE_ENV=production npm run build
NODE_ENV=production npm run build:server

# Start production
NODE_ENV=production node server.js
```

## Tips & Best Practices

1. **ใช้ `npm run dev:all`** สำหรับ development ปกติ
2. **ใช้ `npm run restart`** เมื่อแก้ server code
3. **ใช้ `npm run rebuild`** เมื่อมีปัญหาหรือเพิ่ม dependencies
4. **เปิด VS Code** จะได้ auto-format และเห็น errors
5. **ดู logs** ด้วย `tail -f server.log`

---

**Last Updated**: January 2025
**Quick Help**: `npm run` to see all commands