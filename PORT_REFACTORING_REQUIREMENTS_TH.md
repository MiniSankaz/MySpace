# เอกสารความต้องการ: การ Refactor Port Configuration System

## สรุปผู้บริหาร

### วัตถุประสงค์หลัก
จากการวิเคราะห์ระบบ พบว่าโครงการกำลังประสบปัญหาจากการใช้พอร์ตแบบกระจาย และต้องการระบบจัดการพอร์ตแบบส่วนกลาง

### สถานะปัจจุบัน
- ✅ **อัปเดตช่วงพอร์ตสำเร็จ**: จาก 100-port gaps เป็น 10-port gaps (4100-4170)
- ✅ **บริการทำงาน**: 6 จาก 8 บริการรันสำเร็จ
- ❌ **บริการมีปัญหา**: AI Assistant (4130) และ Market Data (4170)
- ⚠️ **อ้างอิงพอร์ตเก่า**: 3,362 การอ้างอิงพอร์ตเก่าใน 394 ไฟล์

### เป้าหมายธุรกิจ
1. **เสถียรภาพระบบ**: บริการทั้งหมดต้องทำงานได้ 100%
2. **ประสิทธิภาพ**: ลดเวลาการเปลี่ยนแปลงพอร์ตจาก 394 ไฟล์เหลือ 1 ไฟล์
3. **ความยั่งยืน**: ระบบที่ง่ายต่อการบำรุงรักษาและขยาย

---

## 📋 รายการความต้องการหลัก

### FR-001: ระบบจัดการพอร์ตแบบส่วนกลาง
**ลำดับความสำคัญ**: Must Have  
**คำอธิบาย**: สร้างระบบการจัดการพอร์ตจากไฟล์ configuration เดียว

**เกณฑ์การยอมรับ**:
- ✅ Given: เมื่อต้องการเปลี่ยนพอร์ต
- ✅ When: แก้ไขไฟล์ `/shared/config/ports.config.ts` เพียงไฟล์เดียว
- ✅ Then: ระบบทั้งหมดใช้พอร์ตใหม่โดยอัตโนมัติ

**Dependencies**: ไม่มี  
**Risks**: การ refactor อาจทำให้ระบบหยุดทำงานชั่วขณะ

### FR-002: แก้ไขปัญหา AI Assistant Service (4130)
**ลำดับความสำคัญ**: Must Have  
**คำอธิบาย**: แก้ไขปัญหาการ crash ของ AI Assistant service

**เกณฑ์การยอมรับ**:
- ✅ Given: เมื่อเริ่มต้น AI Assistant service
- ✅ When: รันคำสั่ง `cd services/ai-assistant && PORT=4130 npm run dev`
- ✅ Then: บริการเริ่มต้นได้สำเร็จและตอบสนอง health check

**Dependencies**: การแก้ไขการอ้างอิงพอร์ตใน AI service  
**Risks**: อาจต้องปรับโครงสร้างโค้ดของ AI service

### FR-003: เริ่มต้น Market Data Service (4170)
**ลำดับความสำคัญ**: Should Have  
**คำอธิบาย**: สร้างและเริ่มต้น Market Data service ที่ยังไม่มี

**เกณฑ์การยอมรับ**:
- ✅ Given: เมื่อต้องการบริการข้อมูลตลาด
- ✅ When: รันคำสั่ง `cd services/market-data && PORT=4170 npm run dev`
- ✅ Then: บริการเริ่มต้นและให้บริการ API endpoint พื้นฐาน

**Dependencies**: การสร้างโครงสร้างพื้นฐานของ Market Data service  
**Risks**: เวลาพัฒนาอาจมากกว่าที่คาดไว้

### FR-004: อัปเดตการอ้างอิงพอร์ตเก่า
**ลำดับความสำคัญ**: Must Have  
**คำอธิบาย**: อัปเดตการอ้างอิงพอร์ตเก่า 3,362 รายการใน 394 ไฟล์

**เกณฑ์การยอมรับ**:
- ✅ Given: เมื่อมีการอ้างอิงพอร์ตเก่าในโค้ด
- ✅ When: รันเครื่องมือแก้ไขแบบ batch
- ✅ Then: ทุกการอ้างอิงใช้ระบบ configuration ใหม่

**Dependencies**: การสร้างเครื่องมือ migration  
**Risks**: การเปลี่ยนแปลงจำนวนมากอาจทำให้เกิด regression

---

## 📊 วิเคราะห์ความเสี่ยง

### ความเสี่ยงสูง (High Risk)
| ความเสี่ยง | ความน่าจะเป็น | ผลกระทบ | กลยุทธ์บรรเทา |
|------------|----------------|----------|----------------|
| **ระบบหยุดทำงาน** | กลาง | สูง | สร้าง backup และ rollback plan |
| **Breaking Changes** | สูง | สูง | ทดสอบแต่ละ service แยกกัน |
| **Port Conflicts** | กลาง | สูง | ตรวจสอบพอร์ตที่ใช้งานก่อน deployment |

### ความเสี่ยงกลาง (Medium Risk)
| ความเสี่ยง | ความน่าจะเป็น | ผลกระทบ | กลยุทธ์บรรเทา |
|------------|----------------|----------|----------------|
| **Performance Degradation** | กลาง | กลาง | Monitoring และ performance testing |
| **Configuration Errors** | กลาง | กลาง | Validation และ type checking |

---

## 🎯 ลำดับความสำคัญตามผลกระทบต่อธุรกิจ

### ลำดับที่ 1: ความเสถียรของระบบ (System Stability)
**ผลกระทบต่อธุรกิจ**: สูงมาก
- แก้ไข AI Assistant service crash (FR-002)
- ลำดับการทดสอบ: User Management → Terminal → Portfolio → Workspace

### ลำดับที่ 2: ระบบจัดการพอร์ตแบบส่วนกลาง (Centralized Port Management)
**ผลกระทบต่อธุรกิจ**: สูง
- สร้างระบบ configuration ใหม่ (FR-001)
- ลดความซับซ้อนในการบำรุงรักษา

### ลำดับที่ 3: การอัปเดตการอ้างอิงเก่า (Legacy References Update)
**ผลกระทบต่อธุรกิจ**: กลาง
- อัปเดตพอร์ตเก่า 3,362 รายการ (FR-004)
- ป้องกันปัญหาในอนาคต

### ลำดับที่ 4: Market Data Service
**ผลกระทบต่อธุรกิจ**: กลาง
- เริ่มต้น Market Data service (FR-003)
- ขยายความสามารถของระบบ

---

## ✅ เกณฑ์ความสำเร็จ

### เกณฑ์หลัก (Primary Success Criteria)
1. **Service Availability**: บริการทั้งหมดต้องทำงานได้ 100%
   - Health check ผ่านทุก service
   - Response time < 200ms สำหรับ health endpoints

2. **Port Configuration**: ระบบพอร์ตใหม่ทำงานได้สมบูรณ์
   - เปลี่ยนพอร์ตได้จากไฟล์เดียว
   - ไม่มี port conflicts

3. **Zero Downtime**: การเปลี่ยนแปลงไม่ทำให้ระบบหยุดทำงาน
   - Rolling deployment สำเร็จ
   - ข้อมูลไม่สูญหาย

### เกณฑ์รอง (Secondary Success Criteria)
1. **Performance**: ประสิทธิภาพไม่ลดลง
   - Memory usage ≤ ปัจจุบัน
   - CPU usage ≤ ปัจจุบัน

2. **Maintainability**: ง่ายต่อการบำรุงรักษา
   - Documentation ครบถ้วน
   - Error handling ชัดเจน

---

## 📋 แผนการดำเนินงาน (Implementation Roadmap)

### Phase 1: Foundation (สัปดาห์ที่ 1)
**เป้าหมาย**: สร้างโครงสร้างพื้นฐาน

**Tasks**:
1. สร้าง `/shared/config/ports.config.ts`
2. สร้างเครื่องมือ validation
3. ทดสอบ configuration loading

**Acceptance Criteria**:
- Configuration system โหลดได้สำเร็จ
- Type safety ทำงานได้
- Environment variables override ได้

### Phase 2: Service Stabilization (สัปดาห์ที่ 2)
**เป้าหมาย**: แก้ไขปัญหาบริการที่มีปัญหา

**Tasks**:
1. แก้ไข AI Assistant service (4130)
2. ตรวจสอบ dependencies และ configurations
3. ทดสอบ service isolation

**Acceptance Criteria**:
- AI Assistant service เริ่มต้นได้สำเร็จ
- Health check ผ่าน
- API endpoints ตอบสนองได้

### Phase 3: Migration (สัปดาห์ที่ 3)
**เป้าหมาย**: อัปเดตการอ้างอิงพอร์ตเก่า

**Tasks**:
1. สร้าง migration scripts
2. อัปเดตไฟล์ตาม priority
3. ทดสอบแต่ละ component

**Acceptance Criteria**:
- Migration script ทำงานได้
- ไม่มี breaking changes
- All services ใช้ configuration ใหม่

### Phase 4: Market Data Service (สัปดาห์ที่ 4)
**เป้าหมาย**: เริ่มต้น Market Data service

**Tasks**:
1. สร้างโครงสร้างพื้นฐาน
2. เชื่อมต่อกับ Portfolio service
3. ทดสอบ integration

**Acceptance Criteria**:
- Market Data service รันได้
- API endpoints พื้นฐานทำงาน
- Integration กับ Portfolio สำเร็จ

---

## 🔍 แผนการทดสอบ

### Unit Testing
- Configuration loading
- Port validation
- Service initialization

### Integration Testing
- Service-to-service communication
- API Gateway routing
- Database connections

### System Testing
- End-to-end workflows
- Performance under load
- Failure scenarios

### User Acceptance Testing
- Frontend functionality
- Admin interfaces
- Developer experience

---

## 📈 เมตริกความสำเร็จ

### เมตริกเชิงปริมาณ (Quantitative Metrics)
| เมตริก | เป้าหมาย | วิธีการวัด |
|--------|----------|-----------|
| **Service Uptime** | 99.9% | Health check monitoring |
| **Response Time** | < 200ms | Performance monitoring |
| **Port Conflicts** | 0 | Automated scanning |
| **Migration Coverage** | 100% | Code analysis tools |

### เมตริกเชิงคุณภาพ (Qualitative Metrics)
| เมตริก | เป้าหมาย | วิธีการวัด |
|--------|----------|-----------|
| **Developer Experience** | ดีขึ้น | Developer feedback |
| **Code Maintainability** | ง่ายขึ้น | Code review |
| **Documentation Quality** | ครบถ้วน | Documentation review |

---

## 🛠️ Dependencies และ Constraints

### Technical Dependencies
- Node.js และ npm ecosystem
- TypeScript compilation
- Docker containers (ถ้าใช้)
- Database connections

### Business Constraints
- ไม่มี downtime ในช่วง business hours
- Budget limitations
- Timeline constraints
- Resource availability

### External Dependencies
- DigitalOcean PostgreSQL
- Claude API
- Third-party integrations

---

## 📞 Stakeholder Communication Plan

### รายงานความคืบหน้า
- **รายวัน**: Technical team updates
- **รายสัปดาห์**: Stakeholder summary
- **Milestone**: Executive briefing

### ช่องทางการสื่อสาร
- **Technical Issues**: GitHub Issues
- **Progress Updates**: Email reports
- **Emergency**: Direct communication

---

## 🚀 Go-Live Checklist

### Pre-deployment
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated

### Deployment
- [ ] Rolling deployment executed
- [ ] Health checks pass
- [ ] Smoke tests successful
- [ ] Rollback plan ready

### Post-deployment
- [ ] Monitoring active
- [ ] Performance verified
- [ ] User feedback collected
- [ ] Issues documented

---

**จัดทำโดย**: Business Analyst Agent  
**วันที่**: 19 สิงหาคม 2025  
**เวอร์ชัน**: 1.0  
**สถานะ**: ร่างเอกสาร - รอการอนุมัติ

---

*หมายเหตุ: เอกสารนี้เป็นเอกสารความต้องการที่ครอบคลุม สำหรับการ refactor port configuration system ของโครงการ Stock Portfolio Management System v3.0*