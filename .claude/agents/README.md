# 🤖 Claude Project Agents System

## 🚀 Auto-Setup Feature (ไม่ต้องติดตั้งเอง!)

ระบบนี้จะ **ติดตั้งตัวเองอัตโนมัติ** เมื่อคุณ clone โปรเจกต์ไปยังเครื่องใหม่!

### การทำงานอัตโนมัติ:
1. **Auto-Detection** - ตรวจสอบว่า agents ถูกติดตั้งหรือยัง
2. **Auto-Setup** - ถ้ายังไม่ติดตั้ง จะติดตั้งให้อัตโนมัติ
3. **Auto-Update** - ถ้ามีการอัพเดต agents จะอัพเดตให้อัตโนมัติ

### 🎯 วิธีใช้งานเมื่อ Clone ไปเครื่องใหม่:

```bash
# 1. Clone โปรเจกต์
git clone [repository-url]

# 2. เข้าไปยังโฟลเดอร์โปรเจกต์
cd port

# 3. Agents จะถูกติดตั้งอัตโนมัติเมื่อเรียกใช้ครั้งแรก!
# หรือรันคำสั่งนี้เพื่อติดตั้งทันที:
./.claude/init-agents.sh
```

## 📋 Available Agents

### Project-Specific Agents (5 ตัว)

| Agent | Purpose | Language | Use Case |
|-------|---------|----------|----------|
| **business-analyst** | วิเคราะห์ความต้องการทางธุรกิจ | English | เริ่มโปรเจกต์ใหม่, วาง requirements |
| **development-planner** | วางแผนการพัฒนาเชิงเทคนิค | English | ออกแบบ architecture, วางแผน implementation |
| **devops-maturity-auditor** | ตรวจสอบ DevOps practices | English | ประเมิน CI/CD, security, monitoring |
| **sop-enforcer** | บังคับใช้มาตรฐานโปรเจกต์ | **Thai** | ป้องกันโค้ดพัง, ตรวจสอบ SOPs |
| **dev-life-consultant** | ให้คำปรึกษาแบบองค์รวม | English | Business strategy, productivity, debugging |

### Built-in Claude Agents (3 ตัว)

| Agent | Purpose | Use Case |
|-------|---------|----------|
| **code-reviewer** | Review คุณภาพโค้ด | ตรวจสอบก่อน commit |
| **technical-architect** | ออกแบบระบบ | สร้าง system design, API specs |
| **system-analyst** | วิเคราะห์ระบบ | เขียน technical docs |

## 🔥 Quick Start - วิธีใช้งาน Agents

### Method 1: ใช้ใน Claude CLI (แนะนำ)

เมื่อคุยกับ Claude ให้บอกว่าต้องการใช้ agent:

```
"ช่วยใช้ business-analyst agent วิเคราะห์ requirements สำหรับ feature payment"
```

Claude จะใช้ Task tool เรียก agent ให้:
```
Task tool:
- subagent_type: "business-analyst"
- prompt: "วิเคราะห์ requirements สำหรับ feature payment"
```

### Method 2: ใช้ผ่าน Helper Script

```bash
# รูปแบบคำสั่ง
./use-agent.sh <agent-name> "<task>"

# ตัวอย่าง
./use-agent.sh business-analyst "Analyze payment feature requirements"
./use-agent.sh sop-enforcer "ตรวจสอบโค้ดก่อน commit"
./use-agent.sh dev-life-consultant "How to improve productivity?"
```

## 🎭 Agent Workflows - กระบวนการทำงานแนะนำ

### 🆕 New Feature Development
```
1. business-analyst → วิเคราะห์ requirements
2. technical-architect → ออกแบบ architecture  
3. development-planner → วางแผน implementation
4. sop-enforcer → ตรวจสอบ SOPs
5. code-reviewer → review โค้ด
```

### 🐛 Bug Fix Process
```
1. sop-enforcer → ตรวจสอบ impact
2. code-reviewer → review การแก้ไข
```

### 🚀 Production Deployment
```
1. devops-maturity-auditor → ประเมิน readiness
2. sop-enforcer → validate SOPs
3. code-reviewer → final review
```

## 📁 File Structure

```
.claude/
├── agents/                     # Agent templates
│   ├── business-analyst.md     
│   ├── development-planner-enhanced.md
│   ├── devops-maturity-auditor.md
│   ├── sop-enforcer.md
│   ├── dev-life-consultant.md
│   └── README.md               # This file
├── init-agents.sh              # Auto-initialization script
├── agent-loader.json           # Agent configuration
└── settings.local.json         # Claude settings

port/
├── .claude-agents.json         # Generated agent config
├── use-agent.sh               # Agent helper script
└── docs/claude/17-project-agents.md  # Full documentation
```

## 🔧 Manual Setup (ถ้าจำเป็น)

ปกติไม่ต้องทำ แต่ถ้าต้องการ setup เอง:

```bash
# Run setup script
./scripts/setup-agents.sh

# หรือ initialize agents
./.claude/init-agents.sh
```

## ⚙️ Configuration Files

### `.claude-agents.json`
- Agent definitions และ capabilities
- Workflows configuration
- Auto-generated โดย setup script

### `.claude/agent-loader.json`
- Auto-load configuration
- Agent registration settings
- Model preferences

### `.claude/init-agents.sh`
- Auto-initialization script
- ตรวจสอบและติดตั้ง agents
- รันอัตโนมัติเมื่อจำเป็น

## 🌟 Best Practices

### ✅ DO:
1. **ใช้ agent ที่เหมาะกับงาน** - เลือก agent ตาม expertise
2. **ให้ context ที่ชัดเจน** - บอก agent รายละเอียดงาน
3. **ใช้ workflows ที่กำหนด** - ทำตาม process ที่แนะนำ
4. **Update documentation** - อัพเดต CLAUDE.md หลังเปลี่ยนแปลง

### ❌ DON'T:
1. **อย่าใช้ agent ผิดประเภท** - เช่น ใช้ devops agent มาเขียนโค้ด
2. **อย่าข้าม SOPs** - ต้องผ่าน sop-enforcer ก่อน commit
3. **อย่าลืม context** - agent ต้องการข้อมูลที่ครบถ้วน

## 🐛 Troubleshooting

### Problem: "Agent not found"
```bash
# Solution: Re-initialize agents
./.claude/init-agents.sh
```

### Problem: "Agents not working"
```bash
# Solution: Run setup script
./scripts/setup-agents.sh
```

### Problem: "Can't use agent in Claude"
```
# Solution: ใช้ Task tool format ที่ถูกต้อง
Task tool → subagent_type: "agent-name" → prompt: "your task"
```

## 🚨 Important Notes

1. **Auto-Setup** - ระบบจะติดตั้งเองเมื่อ clone ไปเครื่องใหม่
2. **Thai Agent** - `sop-enforcer` ใช้ภาษาไทยในการสื่อสาร
3. **No Manual Setup** - ไม่ต้องติดตั้งเอง ระบบจัดการให้
4. **Version Control** - Agent templates อยู่ใน git แล้ว

## 📞 Support

หากมีปัญหา:
1. ดู error messages
2. รัน `./.claude/init-agents.sh` 
3. ตรวจสอบ `.claude-agents.json` ว่ามีหรือไม่
4. ถาม Claude ใน CLI ได้เลย!

---

**Last Updated**: 2025-01-19  
**Version**: 1.0.0  
**Auto-Setup**: ✅ Enabled