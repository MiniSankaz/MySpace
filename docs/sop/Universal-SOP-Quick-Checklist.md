# 🚀 Universal SOP Quick Checklist

## 🔥 แก้ปัญหาด่วน (ทำทันที)

### 1. Database Connection

```bash
# Test
npx prisma db push

# If failed
cat .env # Check DATABASE_URL
# Update .env then:
npx prisma migrate dev
```

### 2. Missing Pages (404s)

```bash
# Use isolated fix
./scripts/isolate-fix.sh fix-missing-pages

# Create pages
mkdir -p src/app/(public)/contact
mkdir -p src/app/(public)/search
# Add page.tsx files
```

## 📝 ทุกครั้งที่แก้โค้ด

### Before Starting

```bash
# 1. Create isolated branch
./scripts/isolate-fix.sh [feature-name]

# 2. Pull latest
git pull origin main

# 3. Check current status
npm test
npx tsc --noEmit
```

### While Coding

- [ ] แก้เฉพาะปัญหาที่ตั้งใจ
- [ ] ไม่แตะไฟล์ที่ไม่เกี่ยวข้อง
- [ ] Test locally หลังแก้
- [ ] No console.log
- [ ] Add/update tests

### Before Commit

```bash
# 1. Test your changes
npm test -- --related

# 2. Check TypeScript
npx tsc --noEmit

# 3. Test impact
./scripts/test-impact.sh

# 4. Lint & format
npm run lint
npm run format
```

### Before Push

```bash
# Run full test suite
npm test

# Build check
npm run build

# If all pass, push
git push origin [branch-name]
```

## 🛡️ Security Checklist

### Every API Route

```typescript
// ✅ Always use middleware
export const GET = withApiMiddleware(
  async (req) => {
    /* ... */
  },
  { requireAuth: true }, // or false for public
);
```

### Input Validation

```typescript
// ✅ Always validate
const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
});
const validated = validateInput(data, schema);
```

## 🏗️ Module Structure

### Creating New Module

```bash
./scripts/create-module.sh [module-name]
```

### Module Must Have

```
src/modules/[module]/
├── components/     # UI components
├── services/       # Business logic
├── types/          # TypeScript types
├── hooks/          # React hooks
└── index.ts        # Public exports
```

## 🧪 Testing Requirements

### Coverage Targets

- Overall: 80%
- New code: 90%
- Critical paths: 100%

### Test Commands

```bash
# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🚨 Emergency Fixes

### Production is Down

```bash
# 1. Revert immediately
git revert HEAD --no-edit
npm run build && npm run deploy

# 2. Fix in hotfix branch
git checkout -b hotfix/critical-issue
```

### Security Issue Found

```bash
# 1. Fix immediately
git checkout -b security/fix-vulnerability

# 2. Test security fix
npm audit
npm run test:security

# 3. Deploy ASAP
```

## 📊 Daily Tasks

### Morning Check

```bash
# 1. System health
./scripts/module-by-module-test.sh

# 2. TypeScript status
npx tsc --noEmit | grep "error" | wc -l

# 3. Check PRs
gh pr list
```

### End of Day

```bash
# 1. Commit your work
git add .
git commit -m "feat: [description]"

# 2. Run tests
npm test

# 3. Push if tests pass
git push
```

## 🔗 Quick Commands

```bash
# Create module
./scripts/create-module.sh [name]

# Create page
./scripts/create-public-page.sh [name]
./scripts/create-admin-page.sh [name]

# Test routes
./scripts/test-routes.sh

# Check impact
./scripts/test-impact.sh

# Full system test
./scripts/comprehensive-test.sh
```

## ⚡ VS Code Shortcuts

```json
// settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 📱 Contact for Help

- **Broken Build**: Check CI/CD logs first
- **TypeScript Errors**: Run `npx tsc --noEmit`
- **Test Failures**: Check test output carefully
- **Security Issues**: Report immediately

---

**Golden Rule**: แก้ทีละอย่าง • ทดสอบให้ดี • ค่อย merge

**Remember**: ถ้าไม่แน่ใจ ให้ถามก่อนแก้!
