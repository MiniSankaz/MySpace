# 🧪 Route Testing Guide

## 🎯 การตรวจสอบ Route Structure

### 1. **Automated Testing (ทุกครั้งที่ test)**

#### Run Route Tests

```bash
# ตรวจสอบเฉพาะ route structure
npm run test:routes

# รัน test ทั้งหมด (รวม route tests)
npm run test:all

# ดู coverage
npm run test:coverage
```

#### Test Coverage

- ✅ ตรวจสอบ duplicate routes
- ✅ ตรวจสอบ nested route groups
- ✅ ตรวจสอบ redundant patterns
- ✅ ตรวจสอบ naming conventions
- ✅ ตรวจสอบ file naming (page.tsx, route.ts)
- ✅ ตรวจสอบความลึกของ routes
- ✅ Generate route report

---

### 2. **Git Hooks (ทุกครั้งที่ commit)**

Pre-commit hook จะตรวจสอบอัตโนมัติ:

```bash
# Hook location: .husky/pre-commit

✓ Duplicate routes
✓ Nested route groups
✓ Anti-patterns
✓ ESLint rules
```

ถ้าพบปัญหา จะไม่สามารถ commit ได้

---

### 3. **CI/CD Pipeline (ทุกครั้งที่ push)**

GitHub Actions จะรัน:

- Route structure tests
- Generate route report
- Post comment on PR ถ้าพบปัญหา

---

### 4. **VS Code Integration**

#### Quick Commands (Cmd/Ctrl + Shift + P)

- `Tasks: Run Task` → `Check Route Structure`
- `Tasks: Run Task` → `Show Route Map`
- `Tasks: Run Task` → `Find Duplicate Routes`
- `Tasks: Run Task` → `Run All Route Checks`

#### Keyboard Shortcuts

เพิ่มใน `keybindings.json`:

```json
{
  "key": "cmd+shift+r",
  "command": "workbench.action.tasks.runTask",
  "args": "Run All Route Checks"
}
```

---

## 🔍 Manual Testing

### Check Current Structure

```bash
# ดูโครงสร้างทั้งหมด
tree src/app -d -I 'node_modules'

# ดูเฉพาะ pages
find src/app -name "page.tsx" | sort

# ดูเฉพาะ API routes
find src/app/api -name "route.ts" | sort

# ตรวจสอบ route groups
find src/app -type d -name "(*)"
```

### Find Issues

```bash
# หา duplicate routes
find src/app -name "page.tsx" | \
  sed 's|src/app||g' | \
  sed 's|/page.tsx||g' | \
  sed 's|(auth)||g' | \
  sed 's|(public)||g' | \
  sort | uniq -d

# หา nested route groups
find src/app -type d -name "(*)" -path "*(*)*"

# หา incorrect filenames
find src/app -name "index.tsx" -o -name "index.js"
```

---

## 🛠️ Fixing Common Issues

### Issue 1: Duplicate Routes

```bash
# Example: both exist
# app/(admin)/admin/users/page.tsx
# app/admin/users/page.tsx

# Fix:
mv app/(admin)/admin/* app/admin/
rm -rf app/(admin)
```

### Issue 2: Nested Route Groups

```bash
# Example: (admin)/(dashboard)/stats

# Fix:
mv app/(admin)/(dashboard)/stats app/admin/stats
rm -rf app/(admin)/(dashboard)
```

### Issue 3: Wrong Filenames

```bash
# Example: index.tsx instead of page.tsx

# Fix:
find src/app -name "index.tsx" -exec sh -c 'mv "$1" "${1%/index.tsx}/page.tsx"' _ {} \;
```

---

## 📊 Test Report Analysis

### Understanding Test Output

```
PASS  src/__tests__/routes.test.ts
  Next.js Route Structure
    ✓ should not have duplicate routes (15 ms)
    ✓ should not have nested route groups (8 ms)
    ✓ should not have redundant route groups (10 ms)
    ✓ should use page.tsx for all page components (12 ms)
    ✓ should use route.ts for all API routes (9 ms)
    ✓ should follow kebab-case naming convention (11 ms)
    ✓ should have essential routes configured (5 ms)
    ✓ should not have excessively deep route nesting (7 ms)
    ✓ should generate route structure report (13 ms)

📊 Route Structure Report:
Total Routes: 45
Public Routes: 12
Admin Routes: 28
API Routes: 5

All Routes:
  /
  /admin
  /admin/analytics
  ...
```

### Error Messages

```
❌ Duplicate routes detected!
  /admin/users

Please check these files:
  src/app/(admin)/admin/users/page.tsx
  src/app/admin/users/page.tsx
```

---

## 🚀 Best Practices

### 1. **Before Creating Routes**

```bash
# Check existing structure
npm run test:routes

# Plan your routes
echo "New routes needed:"
echo "- /feature/list"
echo "- /feature/[id]"
echo "- /api/feature"
```

### 2. **After Creating Routes**

```bash
# Test immediately
npm run test:routes

# Check in VS Code
Cmd+Shift+P → "Run All Route Checks"
```

### 3. **Before Committing**

```bash
# Routes will be checked automatically
git add .
git commit -m "Add new feature routes"
# If fails, fix and try again
```

### 4. **During Code Review**

- Check GitHub Actions results
- Review route structure report
- Verify naming conventions
- Check for anti-patterns

---

## 🔧 Configuration

### Customize Tests

Edit `src/__tests__/routes.test.ts`:

```typescript
// Change max depth
const MAX_DEPTH = 5; // default

// Add essential routes
const essentialRoutes = [
  "/",
  "/admin",
  "/login",
  // add more...
];
```

### Disable Specific Checks

```typescript
// Skip a test
it.skip("should check something", () => {
  // ...
});

// Conditional test
it.skipIf(process.env.SKIP_ROUTE_CHECKS)("should check routes", () => {
  // ...
});
```

---

## 📚 Resources

- [Next.js Routing Docs](https://nextjs.org/docs/app/building-your-application/routing)
- [SOP-NEXTJS-ROUTING.md](./SOP-NEXTJS-ROUTING.md)
- [QUICK-ROUTING-GUIDE.md](./QUICK-ROUTING-GUIDE.md)

---

## ❓ FAQ

**Q: Test ผ่านแต่ build ไม่ผ่าน?**
A: ตรวจสอบ TypeScript errors และ ESLint warnings

**Q: ต้องรัน test ทุกครั้งไหม?**
A: Git hooks จะรันให้อัตโนมัติ แต่ควรรันเองก่อน commit

**Q: เพิ่ม route ใหม่แล้ว test ไม่เจอ?**
A: ตรวจสอบว่าใช้ชื่อไฟล์ `page.tsx` หรือ `route.ts`

**Q: Performance impact?**
A: Route tests รันเร็วมาก (<100ms) ไม่กระทบ development flow
