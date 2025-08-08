# SOP: การวิเคราะห์และจัดการ Import ส่วนกลาง

## วัตถุประสงค์

เพื่อป้องกันข้อผิดพลาด Module not found และสร้างความสอดคล้องในการใช้งาน imports ทั่วทั้งโปรเจค

## 1. โครงสร้าง Import Paths ที่ถูกต้อง

### 1.1 Authentication

```typescript
// ✅ ถูกต้อง
import { auth } from "@core/auth";

// ❌ ผิด - path เก่าที่ไม่มีอยู่
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
```

### 1.2 Database

```typescript
// ✅ ถูกต้อง
import { prisma } from "@core/database";

// ❌ ผิด
import { prisma } from "@/lib/prisma";
import { prisma } from "@/core/utils/database";
```

### 1.3 Core Services

```typescript
// ✅ ถูกต้อง - Permission checking
import { checkPermission } from "@core/auth/permissions";
import { hasPermission } from "@core/auth/permissions";

// ✅ ถูกต้อง - File upload
import { FILE_UPLOAD_CONFIG } from "@/core/utils/file-upload";
```

## 2. ขั้นตอนการตรวจสอบก่อนสร้างไฟล์ใหม่

### 2.1 ตรวจสอบ Import Pattern ที่มีอยู่

```bash
# ตรวจสอบว่าไฟล์อื่นใช้ import อะไร
grep -r "import.*auth" src/app/api --include="*.ts" | head -10
grep -r "import.*prisma" src/app/api --include="*.ts" | head -10
```

### 2.2 ตรวจสอบ Path Aliases ใน tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./src/core/*"],
      "@modules/*": ["./src/modules/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

## 3. การแก้ไขเมื่อพบ Module Not Found

### 3.1 วิเคราะห์ Error

```bash
Module not found: Can't resolve '@/lib/auth'
```

### 3.2 ค้นหา Module ที่ถูกต้อง

```bash
# ค้นหา export ของ function/variable ที่ต้องการ
rg "export.*auth\(" src/ --type ts
rg "export.*authOptions" src/ --type ts

# ค้นหาว่าไฟล์อื่นใช้อย่างไร
rg "from.*auth" src/app/api --type ts | grep -v "next-auth"
```

### 3.3 อัพเดทให้ถูกต้อง

```typescript
// เปลี่ยนจาก
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const session = await getServerSession(authOptions);

// เป็น
import { auth } from "@core/auth";
const session = await auth();
```

## 4. Standard Import Patterns สำหรับ API Routes

### 4.1 Basic API Route Template

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@core/auth";
import { prisma } from "@core/database";
import { checkPermission } from "@core/auth/permissions";

export async function GET() {
  try {
    // Authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization
    const canRead = await checkPermission(session.user.id, "resource:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Business logic
    const data = await prisma.model.findMany();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
```

## 5. Checklist สำหรับการสร้าง API Route ใหม่

- [ ] ใช้ `import { auth } from '@core/auth'` สำหรับ authentication
- [ ] ใช้ `import { prisma } from '@core/database'` สำหรับ database
- [ ] ใช้ `import { checkPermission } from '@core/auth/permissions'` สำหรับ authorization
- [ ] ไม่ใช้ `getServerSession` หรือ `authOptions`
- [ ] ตรวจสอบ import paths ให้ตรงกับ tsconfig.json
- [ ] ดูตัวอย่างจากไฟล์ API routes อื่นๆ ที่ทำงานได้

## 6. การป้องกันในอนาคต

### 6.1 สร้าง Import Map

สร้างไฟล์ `src/core/imports.md` เพื่อเก็บ mapping ของ imports ที่ใช้บ่อย:

```markdown
# Common Imports Reference

## Authentication

- `import { auth } from '@core/auth'` - Main auth function
- `import { signIn, signOut } from '@core/auth'` - Auth actions

## Database

- `import { prisma } from '@core/database'` - Prisma client

## Permissions

- `import { checkPermission } from '@core/auth/permissions'`
- `import { hasPermission } from '@/core/auth/permissions'`

## Utils

- `import { FILE_UPLOAD_CONFIG } from '@/core/utils/file-upload'`
```

### 6.2 Pre-commit Hook

เพิ่ม script ตรวจสอบ invalid imports:

```bash
#!/bin/bash
# scripts/check-imports.sh

# Check for deprecated imports
echo "Checking for deprecated imports..."

# Check for old auth imports
if grep -r "@/lib/auth" src/ --include="*.ts" --include="*.tsx"; then
  echo "❌ Found deprecated @/lib/auth import. Use @core/auth instead."
  exit 1
fi

# Check for getServerSession usage
if grep -r "getServerSession" src/app/api --include="*.ts"; then
  echo "❌ Found getServerSession usage. Use auth() from @core/auth instead."
  exit 1
fi

echo "✅ All imports are valid!"
```

### 6.3 VSCode Settings

เพิ่มใน `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.paths": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## 7. Emergency Fix Script

สร้าง script สำหรับแก้ไขอัตโนมัติ:

```bash
#!/bin/bash
# scripts/fix-auth-imports.sh

echo "Fixing auth imports..."

# Fix auth imports
find src/app/api -name "*.ts" -type f -exec sed -i '' \
  -e "s|import { authOptions } from '@/lib/auth'|import { auth } from '@core/auth'|g" \
  -e "s|import { getServerSession } from 'next-auth'||g" \
  -e "s|await getServerSession(authOptions)|await auth()|g" {} \;

echo "✅ Auth imports fixed!"
```

## สรุป

การปฏิบัติตาม SOP นี้จะช่วย:

1. ป้องกันข้อผิดพลาด Module not found
2. สร้างความสอดคล้องในการใช้ imports
3. ลดเวลาในการแก้ไขปัญหา
4. ทำให้ codebase มีมาตรฐานเดียวกัน
