# SOP: Code Changes, Rebuild & Hot Reload

## Overview
Standard Operating Procedure สำหรับการจัดการเมื่อมีการแก้ไข code เพื่อให้ระบบ update อัตโนมัติและทำงานได้อย่างต่อเนื่อง

## 1. Development Mode (Hot Reload อัตโนมัติ)

### 1.1 Next.js App (React Components, Pages, API Routes)
```bash
# รัน development server
npm run dev

# Next.js จะ hot reload อัตโนมัติเมื่อ:
# - แก้ไข components ใน src/app/
# - แก้ไข API routes ใน src/app/api/
# - แก้ไข styles (CSS, Tailwind)
# - แก้ไข public assets
```

**✅ ไม่ต้อง rebuild** - Next.js จัดการให้อัตโนมัติ

### 1.2 TypeScript Type Changes
```bash
# ถ้าแก้ไข types/interfaces
# Next.js จะ recompile อัตโนมัติ
# แต่ถ้ามี error ให้รัน:
npm run type-check
```

## 2. Server-Side Code Changes (ต้อง Rebuild)

### 2.1 เมื่อแก้ไข WebSocket/Socket.IO Code
```bash
# 1. หยุด server เดิม
pkill -f "node server.js"

# 2. Compile TypeScript ใหม่
npx tsc -p tsconfig.server.json

# 3. Start server ใหม่
NODE_ENV=development node server.js
```

### 2.2 เมื่อแก้ไข Service Files (ที่ server.js ใช้)
```bash
# Files ที่ต้อง rebuild:
# - src/lib/socket-server.ts
# - src/modules/personal-assistant/services/*.ts
# - src/services/*.ts

# รัน rebuild script
npm run build:server
```

## 3. Auto-Rebuild Scripts

### 3.1 สร้าง Build Scripts
```json
// เพิ่มใน package.json
{
  "scripts": {
    "dev": "next dev -p 4000",
    "build:server": "tsc -p tsconfig.server.json",
    "dev:server": "nodemon server.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
    "watch:server": "tsc -p tsconfig.server.json --watch"
  }
}
```

### 3.2 ติดตั้ง Development Tools
```bash
# ติดตั้ง nodemon สำหรับ auto-restart
npm install --save-dev nodemon

# ติดตั้ง concurrently สำหรับรัน multiple processes
npm install --save-dev concurrently

# ติดตั้ง ts-node-dev สำหรับ TypeScript hot reload
npm install --save-dev ts-node-dev
```

### 3.3 สร้าง nodemon.json
```json
{
  "watch": ["dist/", "server.js", ".env"],
  "ext": "js,json",
  "ignore": ["src/**", "*.test.js"],
  "exec": "node server.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## 4. File Watcher Configuration

### 4.1 TypeScript Watch Mode
```bash
# Terminal 1: Watch และ compile TypeScript
npx tsc -p tsconfig.server.json --watch

# Terminal 2: รัน server ด้วย nodemon
npm run dev:server

# Terminal 3: รัน Next.js dev server
npm run dev
```

### 4.2 VS Code Settings
```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.watcherExclude": {
    "**/dist/**": false,
    "**/node_modules/**": true
  }
}
```

## 5. Quick Commands

### 5.1 Full Rebuild
```bash
# สร้าง shell script: rebuild.sh
#!/bin/bash
echo "🔄 Starting full rebuild..."

# Clean old builds
rm -rf dist/ .next/

# Rebuild server files
echo "📦 Building server files..."
npx tsc -p tsconfig.server.json

# Rebuild Next.js
echo "📦 Building Next.js..."
npm run build

# Restart services
echo "🚀 Restarting services..."
pkill -f "node server.js"
NODE_ENV=development node server.js &

echo "✅ Rebuild complete!"
```

### 5.2 Quick Restart
```bash
# สร้าง shell script: quick-restart.sh
#!/bin/bash
echo "🔄 Quick restart..."

# Kill existing processes
pkill -f "npm run dev"
pkill -f "node server.js"

# Start everything
npm run dev:all

echo "✅ Services restarted!"
```

## 6. File Change Detection Rules

### 6.1 ไฟล์ที่ Hot Reload อัตโนมัติ
- ✅ `src/app/**/*.tsx` - React components
- ✅ `src/app/**/*.css` - Styles
- ✅ `src/app/api/**/*.ts` - API routes
- ✅ `public/**/*` - Static assets

### 6.2 ไฟล์ที่ต้อง Rebuild
- ⚠️ `src/lib/socket-server.ts` - WebSocket server
- ⚠️ `src/services/*.ts` - Background services
- ⚠️ `server.js` - Main server file
- ⚠️ `tsconfig.json` - TypeScript config
- ⚠️ `.env` - Environment variables

### 6.3 ไฟล์ที่ต้อง Restart Server
- 🔴 `package.json` - Dependencies
- 🔴 `prisma/schema.prisma` - Database schema
- 🔴 `next.config.js` - Next.js config

## 7. Troubleshooting

### 7.1 Port Already in Use
```bash
# Find และ kill process ที่ใช้ port 4000
lsof -i :4000
kill -9 <PID>

# หรือใช้
npx kill-port 4000
```

### 7.2 TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf tsconfig.tsbuildinfo
rm -rf dist/

# Rebuild
npx tsc -p tsconfig.server.json
```

### 7.3 Database Connection Issues
```bash
# Reset Prisma client
npx prisma generate

# Test database connection
npx tsx test-db-connection.ts
```

## 8. Production Build

### 8.1 Build for Production
```bash
# Set environment
export NODE_ENV=production

# Build everything
npm run build
npm run build:server

# Start production server
node server.js
```

### 8.2 PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'personal-assistant',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    }
  }]
};
```

## 9. CI/CD Integration

### 9.1 GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run build:server
      - run: npm test
```

## 10. Monitoring Changes

### 10.1 File Change Logger
```javascript
// scripts/watch-changes.js
const chokidar = require('chokidar');

const watcher = chokidar.watch('src/**/*.{ts,tsx,js,jsx}', {
  ignored: /node_modules/,
  persistent: true
});

watcher
  .on('change', path => {
    console.log(`📝 File changed: ${path}`);
    
    if (path.includes('socket-server') || path.includes('services/')) {
      console.log('⚠️  Server rebuild required!');
      // Auto rebuild logic here
    }
  });
```

## Summary Checklist

### เมื่อแก้ไข Code ให้ตรวจสอบ:

- [ ] **Frontend (React/Next.js)** → Hot reload อัตโนมัติ
- [ ] **API Routes** → Hot reload อัตโนมัติ  
- [ ] **WebSocket/Services** → ต้อง rebuild: `npm run build:server`
- [ ] **Database Schema** → รัน `npx prisma generate`
- [ ] **Dependencies** → รัน `npm install` และ restart
- [ ] **Environment Variables** → Restart server
- [ ] **TypeScript Config** → Full rebuild ทั้งหมด

### Quick Commands:
```bash
# Development (auto reload)
npm run dev:all

# Rebuild server only
npm run build:server

# Full rebuild
./rebuild.sh

# Quick restart
./quick-restart.sh
```

---
**Last Updated**: January 2025
**Version**: 1.0.0