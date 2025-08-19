# Terminal Storage System - คู่มือการใช้งาน

## 📋 ภาพรวม

Terminal Storage System เป็นระบบจัดเก็บ session ของ terminal แบบยืดหยุ่น รองรับ 3 โหมดการทำงาน:

1. **LOCAL** - เก็บในหน่วยความจำ ความเร็วสูงสุด (<100ms)
2. **DATABASE** - เก็บในฐานข้อมูล PostgreSQL รองรับ persistence
3. **HYBRID** - ผสมผสานทั้งสองแบบ ได้ทั้งความเร็วและความถาวร

## 🚀 การติดตั้งและตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
npm install
npx prisma generate
```

### 2. ตั้งค่า Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง
cp .env.terminal-storage.example .env

# แก้ไขค่าตามต้องการ
TERMINAL_STORAGE_MODE=LOCAL        # เริ่มต้นด้วย LOCAL สำหรับความเร็ว
TERMINAL_COMPATIBILITY_MODE=hybrid # ใช้ทั้งระบบเก่าและใหม่
```

### 3. Migrate Database (ถ้าใช้ DATABASE หรือ HYBRID mode)

```bash
npx prisma migrate dev --name add-terminal-storage
```

## 📊 การเลือกโหมดที่เหมาะสม

| โหมด         | Use Case                          | ข้อดี                                                            | ข้อเสีย                                                |
| ------------ | --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| **LOCAL**    | Development, Single-user          | - ความเร็วสูงสุด<br>- ไม่ต้องใช้ database<br>- ง่ายต่อการ setup  | - ข้อมูลหายเมื่อ restart<br>- ไม่รองรับ multi-instance |
| **DATABASE** | Production, Multi-user            | - Persistent storage<br>- รองรับ multi-instance<br>- Scalable    | - ช้ากว่า LOCAL<br>- ต้องมี PostgreSQL                 |
| **HYBRID**   | Production ที่ต้องการทั้งสองอย่าง | - ความเร็วของ LOCAL<br>- Persistence ของ DATABASE<br>- Auto-sync | - ซับซ้อนกว่า<br>- ใช้ resources มากขึ้น               |

## 🔧 การใช้งาน

### เริ่มต้นใช้งานด่วน (Quick Start)

```bash
# ใช้ LOCAL mode สำหรับการพัฒนา
TERMINAL_STORAGE_MODE=LOCAL npm run dev

# ใช้ DATABASE mode สำหรับ production
TERMINAL_STORAGE_MODE=DATABASE npm run start

# ใช้ HYBRID mode สำหรับ performance + reliability
TERMINAL_STORAGE_MODE=HYBRID npm run start
```

### การ Migrate จากระบบเก่า

```bash
# Dry run เพื่อดูว่าจะ migrate อะไรบ้าง
npm run migrate:terminal -- --mode=LOCAL --dry-run

# Migrate จริง
npm run migrate:terminal -- --mode=LOCAL --force

# Migrate พร้อมแสดงรายละเอียด
npm run migrate:terminal -- --mode=DATABASE --force --verbose
```

### การเปลี่ยนโหมดแบบ Runtime

```javascript
// ในโค้ด TypeScript/JavaScript
import { terminalStorageService } from "@/services/storage/TerminalStorageService";

// เปลี่ยนโหมด
await terminalStorageService.switchMode("DATABASE");

// ตรวจสอบโหมดปัจจุบัน
const mode = terminalStorageService.getMode();
console.log(`Current mode: ${mode}`);
```

## 📈 Performance Tuning

### LOCAL Mode Optimization

```env
TERMINAL_MAX_SESSIONS=100           # เพิ่มจำนวน sessions สูงสุด
TERMINAL_PERSIST_TO_DISK=true       # เปิด disk backup
TERMINAL_FLUSH_INTERVAL=10000       # ลด frequency ของการ save
```

### DATABASE Mode Optimization

```env
TERMINAL_DB_POOL_SIZE=20            # เพิ่ม connection pool
TERMINAL_DB_CACHE=true              # เปิด caching
TERMINAL_CACHE_TTL=600000           # เพิ่ม cache lifetime (10 นาที)
```

### HYBRID Mode Optimization

```env
TERMINAL_SYNC_STRATEGY=eventual     # ใช้ eventual consistency
TERMINAL_SYNC_INTERVAL=60000        # sync ทุก 1 นาที
TERMINAL_SYNC_BATCH_SIZE=20         # เพิ่ม batch size
```

## 🔍 Monitoring & Debugging

### ตรวจสอบสถานะระบบ

```bash
# Health check endpoint
curl http://localhost:4110/api/terminal/health

# Storage info endpoint
curl http://localhost:4110/api/terminal/storage-info
```

### เปิด Debug Logging

```env
TERMINAL_DEBUG=true
```

### ดู Metrics

```javascript
const info = await terminalStorageService.getStorageInfo();
console.log(`
  Mode: ${info.storageMode}
  Sessions: ${info.sessionCount}
  Memory: ${info.memoryUsage / 1024 / 1024}MB
  Avg Read Time: ${info.performance.avgReadTime}ms
  Avg Write Time: ${info.performance.avgWriteTime}ms
  Cache Hit Rate: ${info.performance.cacheHitRate}%
`);
```

## 🐛 การแก้ปัญหาที่พบบ่อย

### 1. Memory Usage สูง

**อาการ**: Memory usage เกิน 4GB

**แก้ไข**:

```env
TERMINAL_MAX_SESSIONS=30            # ลดจำนวน sessions
TERMINAL_SESSION_TIMEOUT=15         # ลด timeout
TERMINAL_MAX_MEMORY=2048           # ลด memory limit
```

### 2. Database Connection Error

**อาการ**: Cannot connect to database

**แก้ไข**:

1. ตรวจสอบ DATABASE_URL
2. ตรวจสอบว่า PostgreSQL ทำงานอยู่
3. Run migrations: `npx prisma migrate dev`

### 3. Sync Conflicts ใน HYBRID Mode

**อาการ**: Data inconsistency between local and database

**แก้ไข**:

```env
TERMINAL_CONFLICT_RESOLUTION=latest-wins  # หรือ local-wins, database-wins
TERMINAL_SYNC_STRATEGY=immediate         # sync ทันที
```

### 4. Sessions หายหลัง Restart

**อาการ**: Sessions หายเมื่อ restart server

**แก้ไข**:

```env
# เปิด persistence สำหรับ LOCAL mode
TERMINAL_PERSIST_TO_DISK=true

# หรือเปลี่ยนเป็น DATABASE/HYBRID mode
TERMINAL_STORAGE_MODE=DATABASE
```

## 📚 API Reference

### Storage Service Methods

```typescript
// สร้าง session ใหม่
const session = await terminalStorageService.createSession(
  projectId,
  projectPath,
  userId,
  mode,
);

// ดึงข้อมูล session
const session = await terminalStorageService.getSession(sessionId);

// อัพเดท status
await terminalStorageService.updateSessionStatus(sessionId, "active");

// ตั้ง focus
await terminalStorageService.setSessionFocus(sessionId, true);

// ปิด session
await terminalStorageService.closeSession(sessionId);

// Suspend/Resume project sessions
await terminalStorageService.suspendProjectSessions(projectId);
await terminalStorageService.resumeProjectSessions(projectId);
```

## 🔄 Migration Path

### Phase 1: Development (เริ่มต้น)

```env
TERMINAL_STORAGE_MODE=LOCAL
TERMINAL_COMPATIBILITY_MODE=hybrid
```

### Phase 2: Testing (ทดสอบ)

```env
TERMINAL_STORAGE_MODE=HYBRID
TERMINAL_COMPATIBILITY_MODE=hybrid
TERMINAL_SYNC_STRATEGY=eventual
```

### Phase 3: Production (ใช้งานจริง)

```env
TERMINAL_STORAGE_MODE=HYBRID
TERMINAL_COMPATIBILITY_MODE=storage  # ปิดระบบเก่า
TERMINAL_SYNC_STRATEGY=immediate
```

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ logs: `tail -f logs/terminal-storage.log`
2. Run diagnostics: `npm run diagnose:terminal`
3. ดู known issues ใน `/docs/claude/12-known-issues.md`

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-13  
**Status**: Production Ready ✅
