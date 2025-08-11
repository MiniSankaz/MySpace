# 📋 สรุป Claude Code CLI Agents ทั้งหมด

> อัพเดต: วันที่ 11 มกราคม 2568

## 🤖 Agents ที่มีในระบบ (Personal Type)

ปัจจุบันมี **3 Agents** หลักในระบบ Claude Code CLI:

---

### 1. 🛡️ **SOP-Enforcer Agent**
**Model**: Sonnet  
**Color**: Pink  
**Type**: Personal  
**ภาษา**: ภาษาไทย

#### หน้าที่หลัก:
- **ป้องกันปัญหา "แก้แล้วพังที่อื่น"** - ตรวจสอบผลกระทบของการเปลี่ยนแปลงโค้ด
- **บังคับใช้มาตรฐาน Git Workflow** - dev → uat → main
- **ตรวจสอบมาตรฐาน Next.js** - routing, components, API routes
- **จัดการ Build/Rebuild** - แนะนำเมื่อต้อง rebuild หรือ restart
- **ตรวจสอบ Security** - API security, input validation
- **Emergency Rollback** - วิธีการ rollback เมื่อเกิดปัญหา

#### เมื่อควรใช้:
- ก่อน commit code ทุกครั้ง
- เมื่อสร้าง route หรือ module ใหม่
- เมื่อแก้ไข functionality ที่มีอยู่
- เมื่อ build fail หรือมี error
- เมื่อไม่แน่ใจว่าการเปลี่ยนแปลงจะกระทบส่วนอื่นหรือไม่

#### ตัวอย่างการใช้:
```
"ฉันเพิ่ง implement feature ใหม่เสร็จ พร้อม commit"
→ Agent จะตรวจสอบ SOPs ก่อน commit

"ต้องการเพิ่ม settings page ใหม่"
→ Agent จะตรวจสอบ routing standards

"Build fail หลังจากแก้โค้ด"
→ Agent จะวิเคราะห์ว่า SOP ไหนถูกละเมิด
```

---

### 2. 💡 **Dev-Life-Consultant Agent**
**Model**: Sonnet  
**Type**: Personal  

#### หน้าที่หลัก:
- **Software Development Consulting** - architecture, design patterns, debugging
- **Funding & Business Strategy** - VC, pitch decks, equity structures
- **Conceptual Thinking** - brainstorming, problem-solving, innovation
- **Personal Productivity** - task management, schedule optimization
- **Code Review** - performance, security, maintainability
- **Life-Work Balance** - จัดการเวลาระหว่างงานและชีวิตส่วนตัว

#### เมื่อควรใช้:
- ต้องการความช่วยเหลือทั้งเรื่อง technical และ life management
- ออกแบบ architecture แต่ต้อง pitch ให้ VC ด้วย
- Review code พร้อมวางแผน sprint
- Brainstorming ideas ใหม่ๆ
- จัดลำดับความสำคัญของงาน

#### ตัวอย่างการใช้:
```
"ต้องจัดการ deadline project กับ meeting investor อาทิตย์หน้า"
→ Agent จะช่วยจัดลำดับและวางแผน

"ออกแบบ scalable architecture แล้ว pitch ให้ VC"
→ Agent จะช่วยทั้ง technical และ business

"Review authentication code และวางแผน sprint 2 สัปดาห์"
→ Agent จะทำทั้ง code review และ planning
```

---

### 3. 📊 **DevOps-Maturity-Auditor Agent**
**Model**: Sonnet  
**Type**: Personal  

#### หน้าที่หลัก:
- **Maturity Assessment** - ประเมิน DevOps practices ตาม industry standards
- **CI/CD Pipeline Evaluation** - ตรวจสอบ automation pipeline
- **Infrastructure as Code** - Terraform, CloudFormation, Pulumi
- **Monitoring & Alerting** - metrics, logs, traces setup
- **Security Practices** - SAST, DAST, dependency scanning
- **Disaster Recovery** - backup, restore, failover planning

#### DevOps Maturity Checklist:
- ✅ Automated builds and tests
- ✅ Infrastructure as Code
- ✅ Continuous deployment
- ✅ Monitoring and alerting
- ✅ Centralized logging
- ✅ Automated rollback
- ✅ Security scanning
- ✅ Performance testing
- ✅ Documentation automation
- ✅ Disaster recovery

#### เมื่อควรใช้:
- ประเมิน DevOps practices ปัจจุบัน
- Setup CI/CD pipeline
- Implement monitoring
- ปรับปรุง security practices
- วางแผน disaster recovery

#### ตัวอย่างการใช้:
```
"Review CI/CD setup ว่าขาดอะไร"
→ Agent จะประเมินตาม maturity checklist

"ต้องการ setup monitoring production"
→ Agent จะแนะนำ best practices

"ปรับปรุง security ใน pipeline"
→ Agent จะแนะนำ tools และวิธีการ
```

---

## 🚀 วิธีการเรียกใช้ Agents

### 1. ผ่านคำสั่งในแชท:
```
"ใช้ sop-enforcer agent ตรวจสอบก่อน commit"
"ให้ dev-life-consultant agent ช่วยวางแผน"
"เรียก devops-maturity-auditor agent มาประเมิน CI/CD"
```

### 2. ผ่าน Task Tool (สำหรับ Claude):
Agent จะถูกเรียกใช้อัตโนมัติเมื่อ context ตรงกับหน้าที่ของ agent

### 3. Proactive Usage:
Agents จะถูกเรียกใช้โดยอัตโนมัติในสถานการณ์ที่เหมาะสม เช่น:
- sop-enforcer: เมื่อมีการเปลี่ยนแปลงโค้ดสำคัญ
- dev-life-consultant: เมื่อมีคำถามที่ซับซ้อน
- devops-maturity-auditor: เมื่อมีปัญหา deployment

---

## 📊 สรุปภาพรวม

| Agent | Model | Type | ภาษา | Focus Area |
|-------|-------|------|------|------------|
| **sop-enforcer** | Sonnet | Personal | ไทย | Code Quality & Standards |
| **dev-life-consultant** | Sonnet | Personal | English/ไทย | Holistic Development |
| **devops-maturity-auditor** | Sonnet | Personal | English | DevOps Excellence |

## 💡 Best Practices

1. **เลือก Agent ให้ตรงกับงาน**
   - Code changes → sop-enforcer
   - Complex problems → dev-life-consultant
   - Infrastructure → devops-maturity-auditor

2. **ใช้ Agent ก่อนทำงานสำคัญ**
   - ก่อน commit
   - ก่อนสร้าง feature ใหม่
   - ก่อน deploy

3. **ทำตามคำแนะนำของ Agent**
   - Follow checklists
   - Run suggested commands
   - Implement recommendations

4. **Combine Agents**
   - ใช้หลาย agents ร่วมกันสำหรับงานซับซ้อน
   - เช่น sop-enforcer + devops-maturity-auditor สำหรับ deployment

---

## 📝 Quick Reference

### คำสั่งที่ใช้บ่อย (จาก Agents):

```bash
# SOP-Enforcer Commands
./scripts/isolate-fix.sh [feature-name]  # เริ่มงานใน branch แยก
./scripts/test-impact.sh                 # ตรวจสอบผลกระทบ
./scripts/module-by-module-test.sh       # ทดสอบแต่ละ module
./quick-restart.sh                        # Restart ด่วน

# DevOps Commands
npm run build                             # Build production
npm test                                  # Run tests
npm run lint                              # Check code quality
npm run type-check                        # TypeScript validation

# Git Workflow (SOP)
git checkout dev                         # ทำงานบน dev
git checkout -b feature/[name]           # สร้าง feature branch
git commit -m "feat: description"        # Conventional commit
git push origin feature/[name]           # Push to remote
```

### File Change Impact (จาก SOP-Enforcer):

| File Type | Auto-reload | Needs Rebuild | Needs Restart |
|-----------|-------------|---------------|---------------|
| *.tsx (React) | ✅ | ❌ | ❌ |
| API routes | ✅ | ❌ | ❌ |
| *.css | ✅ | ❌ | ❌ |
| Socket server | ❌ | ⚠️ | ❌ |
| server.js | ❌ | ⚠️ | 🔴 |
| package.json | ❌ | ❌ | 🔴 |
| .env | ❌ | ❌ | 🔴 |
| Prisma schema | ❌ | ⚠️ | 🔴 |

---

## 🎯 สรุป

Claude Code CLI มี 3 Agents หลักที่ช่วยในการพัฒนา:
1. **sop-enforcer** - รักษามาตรฐานและป้องกันโค้ดพัง
2. **dev-life-consultant** - ให้คำปรึกษาแบบองค์รวม
3. **devops-maturity-auditor** - ยกระดับ DevOps practices

ทั้ง 3 agents ทำงานร่วมกันเพื่อให้การพัฒนาเป็นไปอย่างมีประสิทธิภาพ ปลอดภัย และได้มาตรฐาน