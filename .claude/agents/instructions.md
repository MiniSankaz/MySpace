# Claude Code Agent Instructions

## Available Agents

### 1. sop
**Purpose**: Enforce project SOPs and prevent code changes from breaking other parts of the system.

**When to use**:
- Before making any code changes
- When fixing bugs or adding features
- When working with Git operations
- When dealing with build/rebuild issues
- When creating new modules or routes

**Key capabilities**:
- Isolated branch workflow management
- Git workflow enforcement (dev → uat → main)
- Next.js routing standards
- Build and hot reload management
- API security validation
- Emergency rollback procedures

## How to Use Agents

### Activating an Agent

1. **For specific tasks**:
   ```
   Use the sop agent to help me fix the login page issue
   ```

2. **For guidance**:
   ```
   What does the sop agent say about creating new API routes?
   ```

3. **For validation**:
   ```
   Check with sop agent if my changes follow the SOPs
   ```

### Agent Benefits

1. **ป้องกันปัญหา "แก้แล้วพังที่อื่น"** (Prevents cascading issues)
   - Enforces isolated branch workflow
   - Requires impact testing before commits
   - Follows "fix one thing at a time" principle

2. **มาตรฐานการทำงาน** (Standardized workflows)
   - Consistent Git operations
   - Proper commit message formats
   - Structured module development

3. **ความปลอดภัย** (Security)
   - API security standards enforcement
   - Input validation requirements
   - No sensitive data in commits

4. **การทดสอบ** (Testing)
   - Enforces testing before commits
   - Coverage requirements (80% minimum)
   - Impact analysis tools

5. **การแก้ไขฉุกเฉิน** (Emergency procedures)
   - Quick rollback procedures
   - Hotfix workflows
   - Port conflict resolution

## Quick Reference

### Common Agent Commands

```bash
# Before starting work
./scripts/isolate-fix.sh [feature-name]

# Check impact
./scripts/test-impact.sh

# Test modules
./scripts/module-by-module-test.sh

# Quick restart
./quick-restart.sh
```

### File Change Categories

**Auto-reload** ✅:
- React components (*.tsx)
- API routes
- CSS files

**Needs rebuild** ⚠️:
- Socket server
- Background services
- Server.js

**Needs restart** 🔴:
- package.json
- Database schema
- Environment variables

## Thai Summary (สรุปภาษาไทย)

### ประโยชน์ของ Agent

1. **ป้องกันโค้ดพัง**: ตรวจสอบก่อนแก้ไข ทดสอบก่อน commit
2. **ทำงานเป็นระบบ**: มี SOP ชัดเจน ทำตามขั้นตอน
3. **แก้ปัญหาเร็ว**: มีคำสั่งสำเร็จรูป รู้วิธี rollback
4. **ปลอดภัย**: ตรวจสอบ security, validate input
5. **ประหยัดเวลา**: ไม่ต้องจำคำสั่ง มี checklist

### วิธีใช้

1. เรียกใช้ agent เมื่อต้องการความช่วยเหลือ
2. ทำตาม checklist ที่ agent แนะนำ
3. ใช้คำสั่งสำเร็จรูปที่ agent ให้มา
4. ตรวจสอบด้วย agent ก่อน commit

### คำสั่งที่ใช้บ่อย

```bash
# เริ่มงาน
npm run dev

# ทดสอบ
npm test

# สร้าง module ใหม่
./scripts/create-module.sh [ชื่อ]

# restart ด่วน
./quick-restart.sh
```