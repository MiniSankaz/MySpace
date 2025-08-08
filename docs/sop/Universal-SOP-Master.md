# Universal SOP Master Document

## วัตถุประสงค์

รวบรวม SOPs ทั้งหมดเพื่อแก้ปัญหา "แก้โค้ดแล้วกระทบที่อื่น แก้ไม่จบสักที" แบบถาวร

## 🎯 ปัญหาหลักที่ต้องแก้

1. **Code changes causing cascading issues** - แก้ที่หนึ่งพังที่อื่น
2. **Missing pages and 404 errors** - หน้าหายเยอะ
3. **Inconsistent API security** - API ไม่ secure เท่ากัน
4. **No automated testing** - ไม่มีการทดสอบอัตโนมัติ
5. **No quality gates** - ไม่มีการตรวจสอบก่อน commit

## 📚 SOPs ที่สร้างแล้ว

### 1. [API Security Standards](./SOPs/SOP-API-SECURITY.md)

- **Purpose**: กำหนดมาตรฐานความปลอดภัย API
- **Key Points**:
  - ใช้ `withApiMiddleware` wrapper ทุก API
  - แยก Public vs Protected APIs ชัดเจน
  - Validate input ด้วย Zod
  - ไม่ expose internal errors

### 2. [Route Management](./SOPs/SOP-ROUTE-MANAGEMENT.md)

- **Purpose**: จัดการ routes ให้ถูกต้อง ไม่ 404
- **Key Points**:
  - โครงสร้าง routes ที่ถูกต้อง
  - Dynamic route ต้องเช็ค static files
  - ทุก route ต้องมี page.tsx
  - มี script สร้าง route อัตโนมัติ

### 3. [Module Development](./SOPs/SOP-MODULE-DEVELOPMENT.md)

- **Purpose**: พัฒนา module แบบ isolated
- **Key Points**:
  - Modular structure มาตรฐาน
  - Dependency injection
  - Clear interfaces
  - No circular dependencies

### 4. [Automated Testing](./SOPs/SOP-AUTOMATED-TESTING.md)

- **Purpose**: ทดสอบอัตโนมัติป้องกันพัง
- **Key Points**:
  - Unit/Integration/E2E tests
  - 80% coverage minimum
  - Test before commit
  - CI/CD integration

### 5. [Pre-commit & CI/CD](./SOPs/SOP-PRECOMMIT-CICD.md)

- **Purpose**: ตรวจสอบโค้ดก่อน commit/deploy
- **Key Points**:
  - Husky pre-commit hooks
  - GitHub Actions workflows
  - Quality gates
  - Automated deployment

### 6. [Fix Plan by Priority](./SOPs/FIX-PLAN-PRIORITY.md)

- **Purpose**: แผนแก้ไขตามความสำคัญ
- **Key Points**:
  - Priority 1: Database + Missing pages
  - Priority 2: API security + Auth
  - Priority 3: Admin pages + TypeScript
  - Priority 4: WebSocket + Tests

## 🚀 Quick Start Guide

### 1. เริ่มแก้ปัญหาแรก (Database)

```bash
# Check database
cat .env | grep DATABASE_URL
npx prisma db push

# If failed, fix .env
echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/cms_db\"" >> .env
npx prisma migrate dev
```

### 2. ใช้ Isolated Fix Workflow

```bash
# สร้าง branch แยกสำหรับแก้แต่ละปัญหา
./scripts/isolate-fix.sh fix-missing-pages

# แก้ไขใน branch
# ... make changes ...

# ทดสอบ impact
./scripts/test-impact.sh

# Merge ถ้าผ่านทุก test
git checkout main
git merge fix/missing-pages --no-ff
```

### 3. ติดตั้ง Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky
npx husky install

# Add hooks
npx husky add .husky/pre-commit "npm run lint-staged"
npx husky add .husky/pre-push "npm test"
```

## 📋 Daily Workflow

### Morning

1. Check system status

```bash
./scripts/module-by-module-test.sh
```

2. Review priority tasks

```bash
cat docs/SOPs/FIX-PLAN-PRIORITY.md | grep "Priority"
```

3. Create isolated branch

```bash
./scripts/isolate-fix.sh [today-task]
```

### During Development

1. Follow relevant SOP
2. Test changes locally
3. Run impact analysis
4. Commit with descriptive message

### Before Push

1. Run all tests
2. Check TypeScript
3. Verify no console.logs
4. Update documentation

## 🛡️ Prevention Checklist

### ทุกครั้งก่อน Commit:

- [ ] ใช้ isolated branch
- [ ] Test locally ผ่าน
- [ ] No TypeScript errors
- [ ] No console.log
- [ ] Updated tests
- [ ] Updated docs

### ทุกครั้งก่อน Merge:

- [ ] All CI checks pass
- [ ] Code reviewed
- [ ] Impact tested
- [ ] No breaking changes
- [ ] Documentation updated

### ทุกสัปดาห์:

- [ ] Review SOPs
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance check
- [ ] Team sync

## 🚨 Emergency Procedures

### ถ้าพังหลัง Deploy:

```bash
# 1. Rollback immediately
git revert HEAD --no-edit
npm run build && npm run deploy

# 2. Investigate in branch
git checkout -b hotfix/issue
# ... fix ...

# 3. Test thoroughly
npm test
./scripts/test-impact.sh

# 4. Deploy fix
git checkout main
git merge hotfix/issue
```

### ถ้าพบ Security Issue:

1. Patch immediately in hotfix branch
2. Test security fix
3. Deploy without waiting
4. Document in security log

## 📊 Success Metrics

### Short Term (1 week)

- Zero 404 errors ✅
- All APIs secured ✅
- Database stable ✅
- TypeScript clean ✅

### Medium Term (1 month)

- 80% test coverage
- Zero production incidents
- All features working
- Documentation complete

### Long Term (3 months)

- Automated everything
- Team follows SOPs
- No "แก้แล้วพังที่อื่น"
- Fast development cycle

## 🎓 Team Training

### Week 1: Basics

- Git workflow
- Testing basics
- SOP overview
- Tools setup

### Week 2: Advanced

- Module development
- Security practices
- Performance optimization
- CI/CD pipeline

### Ongoing

- Weekly code reviews
- Monthly SOP updates
- Quarterly security training
- Annual architecture review

## 🔗 Quick Links

- [Isolated Fix Script](../scripts/isolate-fix.sh)
- [Test Impact Script](../scripts/test-impact.sh)
- [Module Test Script](../scripts/module-by-module-test.sh)
- [Create Module Script](../scripts/create-module.sh)
- [Daily Progress Script](../scripts/daily-progress.sh)

## 📝 Notes

**Remember**: The goal is to prevent "แก้แล้วพังที่อื่น" by:

1. Testing everything
2. Isolating changes
3. Following standards
4. Automating checks
5. Documenting clearly

**วิธีการหลัก**:

- แก้ทีละอย่าง
- ทดสอบให้ครบ
- ใช้ automation
- ทำตาม SOP
- ไม่รีบร้อน

---

Last Updated: $(date)
Next Review: $(date -d "+1 month")
