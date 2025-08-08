# 🎯 Unified System - สรุปการใช้งาน

## ✅ สิ่งที่ระบบทำให้อัตโนมัติ

### 1. เมื่อเริ่ม Fix (`./scripts/unified-workflow.sh fix [name]`)

- 🔍 **ค้นหา Components** ที่มีอยู่ใน `_library/` อัตโนมัติ
- 📋 **แนะนำ SOPs** ที่เกี่ยวข้องจาก `_sop/` และ `docs/SOPs/`
- 📝 **Log การเริ่มงาน** ไปที่ `_logs/fixes/`
- 🚀 **สร้าง Isolated Branch** และให้คำแนะนำเฉพาะ
- 💾 **Track Progress** ใน `.fix-tracking/`

### 2. Component Management

```bash
# หา component ที่มีอยู่
./scripts/unified-workflow.sh component find Button

# สร้าง component ใหม่
./scripts/unified-workflow.sh component create MyButton

# ดู component ทั้งหมด
./scripts/unified-workflow.sh component list
```

### 3. Log Management

```bash
# ดู logs ล่าสุด
./scripts/unified-workflow.sh log recent

# ค้นหาใน logs
./scripts/unified-workflow.sh log search "error"

# ลบ logs เก่า (>30 วัน)
./scripts/unified-workflow.sh log clean
```

### 4. SOP Management

```bash
# หา SOP เกี่ยวกับหัวข้อ
./scripts/unified-workflow.sh sop find "security"

# ดู SOP ทั้งหมด
./scripts/unified-workflow.sh sop list

# Apply SOP
./scripts/unified-workflow.sh sop apply API-SECURITY
```

## 📊 ตัวอย่างการใช้งานจริง

### Case 1: แก้หน้า Contact ที่หาย

```bash
# 1. เริ่ม fix
./scripts/unified-workflow.sh fix contact-page

# ระบบจะ:
✓ แสดง PageTemplate จาก _library
✓ แนะนำ SOP-ROUTE-MANAGEMENT
✓ สร้าง branch fix/contact-page
✓ Log เวลาเริ่มงาน
✓ ให้คำแนะนำเฉพาะสำหรับสร้าง page

# 2. สร้างหน้า contact โดยใช้ template
cp _library/templates/pages/PageTemplate.tsx src/app/\(public\)/contact/page.tsx

# 3. แก้ไขตามต้องการ

# 4. Test impact
./scripts/test-impact.sh

# 5. Commit และ push
git add .
git commit -m "fix(contact): create missing contact page"
git push -u origin fix/contact-page
```

### Case 2: หา Component เพื่อใช้ซ้ำ

```bash
# ต้องการ Button component
./scripts/unified-workflow.sh component find Button

# Output:
In components/:
  📦 components/ui/ActionButton.tsx

# ใช้ใน code
import { ActionButton } from '@/_library/components/ui/ActionButton'
```

### Case 3: ตรวจสอบ System Health

```bash
./scripts/unified-workflow.sh check

# Output:
✓ _library (27 files)
✓ _logs (10 files)
✓ _sop (32 files)
✓ docs/SOPs (8 files)
🔧 Fixes: 1
❌ Errors: 0
📦 Components: 3
🔗 Linked SOPs: 7
```

## 🔄 Daily Workflow แนะนำ

### เช้า

```bash
# 1. Check system
./scripts/unified-workflow.sh check

# 2. ดู activity ล่าสุด
./scripts/unified-workflow.sh log recent

# 3. Sync ถ้าจำเป็น
./scripts/unified-workflow.sh sync
```

### ระหว่างวัน

```bash
# เริ่มงานใหม่ทุกครั้งด้วย
./scripts/unified-workflow.sh fix [task-name]

# หา component/SOP ก่อนสร้างใหม่
./scripts/unified-workflow.sh component find [name]
./scripts/unified-workflow.sh sop find [topic]
```

### เย็น

```bash
# Generate daily report
./scripts/unified-workflow.sh report

# Check incomplete fixes
cat _logs/fixes/$(date +%Y-%m-%d).log
```

## 📁 โครงสร้างที่สำคัญ

```
CMS/
├── _library/           # ✅ Reusable components
│   ├── components/     # UI components
│   ├── templates/      # Page/component templates
│   ├── hooks/          # Custom hooks
│   └── utils/          # Utilities
│
├── _logs/              # ✅ All system logs
│   ├── fixes/          # Fix tracking
│   ├── errors/         # Error logs
│   ├── reports/        # Generated reports
│   └── sop-compliance/ # SOP tracking
│
├── _sop/               # ✅ Base SOPs
│   ├── current/        # Links to active SOPs
│   └── [categories]/   # Original SOPs
│
└── docs/SOPs/          # ✅ Active project SOPs
```

## 🚀 Key Benefits

1. **ไม่ทำงานซ้ำ** - Check library ก่อนสร้างใหม่
2. **มี Guide ชัดเจน** - SOPs แนะนำทุกขั้นตอน
3. **Track ทุกอย่าง** - Logs บันทึกทุกการทำงาน
4. **หาได้ง่าย** - Search components/SOPs/logs
5. **Report อัตโนมัติ** - Daily/weekly summaries

## 🎯 Quick Commands Reference

```bash
# System
./scripts/unified-workflow.sh check      # Check status
./scripts/unified-workflow.sh sync       # Sync all
./scripts/unified-workflow.sh report     # Generate report

# Development
./scripts/unified-workflow.sh fix [name]           # Start fix
./scripts/unified-workflow.sh component find [x]   # Find component
./scripts/unified-workflow.sh component create [x] # Create component
./scripts/unified-workflow.sh sop find [topic]     # Find SOP

# Maintenance
./scripts/unified-workflow.sh log recent    # Recent logs
./scripts/unified-workflow.sh log clean     # Clean old
./scripts/unified-workflow.sh library index # Update index
```

---

**Remember**: ทุกครั้งที่จะทำอะไร ให้เริ่มด้วย `unified-workflow.sh` เพื่อใช้ประโยชน์จาก \_library, \_logs, และ \_sop อย่างเต็มที่!
