# Common Imports Reference

อ้างอิง imports ที่ใช้บ่อยในโปรเจค เพื่อป้องกันการใช้ path ผิด

## 🔐 Authentication

```typescript
// Server-side authentication (API routes, server components)
import { auth } from "@core/auth";
import { signIn, signOut } from "@core/auth";

// Client-side authentication hooks
import { useSession } from "next-auth/react";

// ❌ อย่าใช้
import { authOptions } from "@/lib/auth"; // ไม่มี path นี้
import { getServerSession } from "next-auth"; // ใช้ auth() แทน
```

## 🗄️ Database

```typescript
// Prisma client
import { prisma } from "@core/database";

// ❌ อย่าใช้
import { prisma } from "@/lib/prisma"; // path เก่า
import { prisma } from "@/core/utils/database"; // path ผิด
```

## 🛡️ Permissions & Authorization

```typescript
// Permission checking
import { checkPermission } from "@core/auth/permissions";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from "@core/auth/permissions";

// Permission constants
import { PERMISSIONS, PERMISSION_GROUPS } from "@/config/permissions";
```

## 📁 File Upload

```typescript
import { FILE_UPLOAD_CONFIG } from "@/core/utils/file-upload";
import { uploadFile, deleteFile } from "@/core/utils/file-upload";
```

## 🌐 Internationalization (i18n)

```typescript
// Hooks
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";

// Server-side
import { getTranslation } from "@/modules/i18n/utils/getTranslation";
```

## 🎨 UI Components

```typescript
// Common UI components
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
```

## 📡 API Response Helpers

```typescript
import { NextRequest, NextResponse } from "next/server";

// Standard API response format
return NextResponse.json({ success: true, data });
return NextResponse.json({ error: "Error message" }, { status: 400 });
```

## 🏗️ Module Services

```typescript
// User Management
import { UserService } from "@/modules/ums/services/user.service";
import { RoleService } from "@/modules/ums/services/role.service";

// Page Builder
import { PageService } from "@/modules/page-builder/services/pageService";

// Media
import { MediaService } from "@/modules/media/services/mediaService";
```

## 📝 Type Imports

```typescript
// User types
import type { User, Role, Permission } from "@prisma/client";

// Custom types
import type {
  PageComponent,
  ComponentType,
} from "@/modules/page-builder/types";
```

## 🔧 Utils

```typescript
// Password utilities
import { hashPassword, verifyPassword } from "@/shared/utils/auth/password";

// Validation schemas
import { loginSchema, registerSchema } from "@/shared/utils/validation/auth";
```

## 📋 Standard API Route Template

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@core/auth";
import { prisma } from "@core/database";
import { checkPermission } from "@/core/services/permission/checkPermission";

export async function GET() {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization
    const hasPermission = await checkPermission(
      session.user.id,
      "resource:read",
    );
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Business logic
    const data = await prisma.model.findMany();

    // 4. Response
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

## ⚠️ Important Notes

1. ใช้ `@core/*` สำหรับ core modules
2. ใช้ `@modules/*` สำหรับ feature modules
3. ใช้ `@shared/*` สำหรับ shared utilities
4. ใช้ `@/` สำหรับ path ทั่วไปจาก src/
5. ตรวจสอบ tsconfig.json สำหรับ path aliases ที่ใช้ได้
