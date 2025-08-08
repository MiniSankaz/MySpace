# 🛠️ วิธีใช้ Isolated Fix Workflow

## 🎯 ภาพรวม

Isolated Fix Workflow คือระบบที่ช่วยแก้ปัญหา "แก้โค้ดแล้วพังที่อื่น" โดยแยก branch สำหรับแก้แต่ละปัญหา และทดสอบ impact ก่อน merge

## 📋 Scripts ที่ใช้งาน

### 1. `isolate-fix.sh` - สร้าง branch แยกสำหรับแก้ปัญหา

### 2. `test-impact.sh` - ตรวจสอบผลกระทบของการแก้ไข

### 3. `module-by-module-test.sh` - ทดสอบระบบทั้งหมด

### 4. `comprehensive-test.sh` - ทดสอบแบบละเอียด

## 🚀 ขั้นตอนการใช้งาน

### Step 1: วิเคราะห์ปัญหา

```bash
# ดูสถานะระบบทั้งหมด
./scripts/module-by-module-test.sh

# ดู TypeScript errors
npx tsc --noEmit

# ดู routes ที่ 404
./scripts/test-routes.sh | grep 404
```

### Step 2: สร้าง Isolated Branch

```bash
# Syntax: ./scripts/isolate-fix.sh [ชื่อ-fix] [คำอธิบาย]

# ตัวอย่าง 1: แก้หน้า contact ที่หาย
./scripts/isolate-fix.sh fix-contact-page "Create missing contact page"

# ตัวอย่าง 2: แก้ API security
./scripts/isolate-fix.sh fix-api-security "Add auth middleware to all APIs"

# ตัวอย่าง 3: แก้ TypeScript errors
./scripts/isolate-fix.sh fix-typescript "Fix type errors in components"
```

### Step 3: ทำงานใน Isolated Branch

Script จะ:

1. ✅ Stash งานที่ยังไม่ commit (ถ้ามี)
2. ✅ Update main branch ให้ล่าสุด
3. ✅ สร้าง branch ใหม่ `fix/[ชื่อ]`
4. ✅ Run baseline tests
5. ✅ แสดง guide การแก้ตามประเภทปัญหา
6. ✅ สร้าง tracking file

### Step 4: แก้ไขปัญหา

#### 🔧 ตัวอย่าง: แก้หน้า Contact ที่หาย

```bash
# 1. อยู่ใน branch fix/fix-contact-page แล้ว

# 2. สร้างโฟลเดอร์
mkdir -p src/app/\(public\)/contact

# 3. สร้าง page.tsx
cat > src/app/\(public\)/contact/page.tsx << 'EOF'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | CMS',
  description: 'Get in touch with us',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p>Contact form here...</p>
    </div>
  )
}
EOF

# 4. ทดสอบ
npm run dev
# เปิด browser: http://localhost:3100/contact
```

#### 🔒 ตัวอย่าง: แก้ API Security

```bash
# แก้ไข API route
vi src/app/api/posts/route.ts

# เปลี่ยนจาก:
export async function GET(req: Request) {
  const posts = await prisma.post.findMany()
  return Response.json({ data: posts })
}

# เป็น:
import { withApiMiddleware } from '@/lib/api-middleware'

export const GET = withApiMiddleware(
  async (req) => {
    const posts = await prisma.post.findMany()
    return Response.json({ data: posts })
  },
  { requireAuth: true }
)
```

### Step 5: ทดสอบการแก้ไข

```bash
# 1. Test เฉพาะไฟล์ที่แก้
npm test -- --findRelatedTests src/app/\(public\)/contact/page.tsx

# 2. Check TypeScript
npx tsc --noEmit

# 3. ดูว่าแก้อะไรไปบ้าง
git status
git diff

# 4. Test route ที่แก้
curl http://localhost:3100/contact
```

### Step 6: วิเคราะห์ Impact

```bash
# Run impact analysis
./scripts/test-impact.sh
```

Script จะตรวจสอบ:

- 📝 ไฟล์ที่เปลี่ยน
- 📘 TypeScript errors
- 🧪 Test results
- 🌐 Routes ที่กระทบ
- 🔌 APIs ที่กระทบ
- 📦 Modules ที่เกี่ยวข้อง
- 🏗️ Build status

### Step 7: Commit ถ้าผ่านทุกอย่าง

```bash
# Add files
git add .

# Commit with descriptive message
git commit -m "fix(contact): create missing contact page

- Add contact page component
- Include proper metadata
- Add basic contact form structure"

# Push to remote
git push -u origin fix/fix-contact-page
```

### Step 8: Create Pull Request

```bash
# ใช้ GitHub CLI
gh pr create --title "Fix: Missing contact page" \
  --body "Create missing contact page with proper structure and metadata"

# หรือเปิดใน browser
gh pr view --web
```

## 📊 ตัวอย่างการใช้งานจริง

### Case 1: แก้หลายหน้าที่หาย

```bash
# แก้ทีละหน้า ทีละ branch
./scripts/isolate-fix.sh fix-contact-page
# ... แก้ contact ...
git add . && git commit -m "fix: add contact page"
git push

./scripts/isolate-fix.sh fix-search-page
# ... แก้ search ...
git add . && git commit -m "fix: add search page"
git push
```

### Case 2: แก้ TypeScript Errors

```bash
# ดู errors ทั้งหมดก่อน
npx tsc --noEmit > typescript-errors.log

# แก้ทีละ module
./scripts/isolate-fix.sh fix-survey-types "Fix survey module type errors"
# แก้เฉพาะ src/modules/survey/
```

### Case 3: แก้ API Security ทั้งหมด

```bash
# หา APIs ที่ยังไม่ secure
find src/app/api -name "route.ts" -exec grep -L "withApiMiddleware" {} \;

# แก้ทีละกลุ่ม
./scripts/isolate-fix.sh fix-public-api-security
# แก้ public APIs

./scripts/isolate-fix.sh fix-admin-api-security
# แก้ admin APIs
```

## 🔍 Tracking และ Monitoring

### ดู Fix History

```bash
# List all fix branches
git branch | grep "fix/"

# ดู tracking files
ls -la .fix-tracking/

# ดูสถานะ fix ปัจจุบัน
cat .fix-tracking/fix-contact-page.md
```

### Run Helper Script

```bash
# Script จะสร้าง helper สำหรับแต่ละ fix
./.fix-tracking/fix-contact-page_helper.sh
```

## ⚠️ ข้อควรระวัง

### ❌ อย่าทำ

1. **อย่าแก้หลายปัญหาใน branch เดียว**

   ```bash
   # ❌ Wrong
   ./scripts/isolate-fix.sh fix-everything
   ```

2. **อย่า merge โดยไม่ test**

   ```bash
   # ❌ Wrong
   git checkout main && git merge fix/feature --no-test
   ```

3. **อย่าแก้ใน main branch**
   ```bash
   # ❌ Wrong
   git checkout main
   # แก้ไขโดยตรง
   ```

### ✅ ควรทำ

1. **แก้ทีละปัญหา**

   ```bash
   # ✅ Correct
   ./scripts/isolate-fix.sh fix-one-specific-issue
   ```

2. **Test impact ทุกครั้ง**

   ```bash
   # ✅ Correct
   ./scripts/test-impact.sh
   # ดูผลก่อน merge
   ```

3. **Document การแก้ไข**
   ```bash
   # ✅ Correct
   # Update tracking file
   vi .fix-tracking/fix-name.md
   ```

## 🆘 Troubleshooting

### ถ้า branch มีอยู่แล้ว

```bash
# Script จะถาม ตอบ y เพื่อลบและสร้างใหม่
Do you want to delete and recreate it? (y/N) y
```

### ถ้ามีงานค้าง

```bash
# Script จะถาม ตอบ y เพื่อ stash
Do you want to stash them? (y/N) y

# ดึง stash กลับมา
git stash pop
```

### ถ้า merge conflict

```bash
# 1. ดู conflicts
git status

# 2. แก้ conflicts
vi [conflicted-file]

# 3. Mark resolved
git add [file]
git commit
```

## 📈 Best Practices

1. **ตั้งชื่อ branch ให้ชัดเจน**
   - `fix-contact-page` ✅
   - `fix-stuff` ❌

2. **Commit message ที่ดี**

   ```
   fix(module): clear description

   - What was broken
   - How it was fixed
   - Any side effects
   ```

3. **Test ให้ครบ**
   - Unit tests
   - Integration tests
   - Manual testing
   - Impact analysis

4. **Review ก่อน merge**
   - Self review
   - Peer review
   - Test results
   - No conflicts

## 🎯 Summary

```bash
# Workflow สั้นๆ
./scripts/isolate-fix.sh [fix-name]    # 1. Create branch
# ... make fixes ...                    # 2. Fix issue
./scripts/test-impact.sh               # 3. Check impact
git add . && git commit                # 4. Commit
git push -u origin [branch]            # 5. Push
gh pr create                           # 6. Create PR
```

**Remember**: แก้ทีละอย่าง • ทดสอบให้ดี • Document ให้ครบ • ค่อย merge 🎯
