# Smart Code Generator

เครื่องมือสำหรับสร้างโค้ดอัตโนมัติที่วิเคราะห์ patterns จากโค้ดที่มีอยู่แล้วในโปรเจค และสร้าง scaffolding ที่เหมาะสม พร้อมคำแนะนำสำหรับการปรับปรุงด้วย AI

## Features

- 🔍 **Pattern Analysis**: วิเคราะห์โครงสร้างและ patterns จากโค้ดที่มีอยู่
- 🚀 **Smart Templates**: สร้าง template ที่เหมาะสมตาม conventions ของโปรเจค
- 🤖 **AI Integration**: ให้คำแนะนำคำสั่ง AI สำหรับการปรับปรุงโค้ด
- ⚠️ **Issue Detection**: ตรวจจับปัญหาที่อาจเกิดขึ้น
- 📋 **Next Steps**: แนะนำขั้นตอนถัดไป

## Usage

### Basic Generator

```bash
# ใช้ script wrapper
./scripts/generate.sh [type] [name] [options]

# หรือใช้ npm script
npm run gen [type] [name] [options]
```

### Enhanced Generator (แนะนำ)

```bash
npm run gen:enhanced [type] [name] [options]
```

## Available Generators

### 1. API Route Generator

สร้าง API routes พร้อม CRUD operations

```bash
npm run gen:enhanced api products --auth --pagination --search
```

**Options:**

- `--auth`: เพิ่ม authentication
- `--pagination`: เพิ่ม pagination
- `--search`: เพิ่ม search functionality
- `--public`: API สาธารณะ (ไม่ต้อง auth)

**ไฟล์ที่สร้าง:**

- `src/app/api/admin/[name]/route.ts`

### 2. Admin Page Generator

สร้างหน้า admin panel พร้อม table และ filters

```bash
npm run gen:enhanced admin-page orders --table --filters --modal
```

**Options:**

- `--table`: เพิ่ม data table
- `--filters`: เพิ่ม filter functionality
- `--modal`: เพิ่ม modal dialogs

**ไฟล์ที่สร้าง:**

- `src/app/admin/[name]/page.tsx`

### 3. Component Generator

สร้าง React components พร้อม TypeScript types

```bash
npm run gen:enhanced component UserCard --client --state --effects
```

**Options:**

- `--client`: ทำเป็น client component
- `--state`: เพิ่ม useState hooks
- `--effects`: เพิ่ม useEffect hooks

**ไฟล์ที่สร้าง:**

- `src/components/admin/[Name].tsx`

### 4. Full CRUD Generator

สร้าง complete CRUD system (API + Admin Page + Component)

```bash
npm run gen:enhanced full-crud customers --all-features
```

**Options:**

- `--all-features`: เพิ่มทุก features (auth, pagination, search, etc.)
- `--component`: สร้าง component เพิ่มเติม

**ไฟล์ที่สร้าง:**

- `src/app/api/admin/[name]/route.ts`
- `src/app/admin/[name]/page.tsx`
- `src/components/admin/[Name]Table.tsx` (ถ้ามี --component)

### 5. Project Analysis

วิเคราะห์ patterns ในโปรเจค

```bash
npm run gen:enhanced analyze
```

## Generated Code Structure

### API Route Example

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/infrastructure/auth/auth";

export async function GET(request: NextRequest) {
  // Auth check
  // Pagination logic
  // Search logic
  // Database query
  // Error handling
}

export async function POST(request: NextRequest) {
  // Auth check
  // Data validation
  // Database create
  // Error handling
}
```

### Admin Page Example

```typescript
'use client'

export default function [Name]Page() {
  // State management
  // Data fetching
  // Search functionality
  // Pagination
  // Table rendering
  // Actions handling
}
```

## AI Refinement Workflow

หลังจากสร้างโค้ดแล้ว generator จะให้คำแนะนำคำสั่ง AI:

```bash
# 1. ปรับปรุง API
./u "review and enhance the products API with proper validation, error handling, and TypeScript types"

# 2. เพิ่ม validation
./u "add input validation schema for products API using Zod or similar"

# 3. ปรับปรุง UI
./u "enhance the products admin page with better UI components and responsive design"

# 4. เพิ่ม security
./u "enhance authentication and authorization for products with role-based access"
```

## Best Practices

### 1. ตั้งชื่อให้ถูกต้อง

```bash
# ✅ ถูกต้อง
npm run gen:enhanced api products
npm run gen:enhanced admin-page users

# ❌ ผิด
npm run gen:enhanced api Products  # ใช้ lowercase
npm run gen:enhanced api product   # ใช้ plural
```

### 2. เลือก options ที่เหมาะสม

```bash
# สำหรับ admin APIs
npm run gen:enhanced api orders --auth --pagination --search

# สำหรับ public APIs
npm run gen:enhanced api blog-posts --public --pagination

# สำหรับ components ที่มี state
npm run gen:enhanced component UserProfile --client --state --effects
```

### 3. ตรวจสอบ warnings

Generator จะแจ้ง warnings หากพบปัญหา:

- Naming issues (เช่น productss)
- Missing error handling
- Missing authentication
- Missing validation

### 4. ทำตาม Next Steps

- อัพเดต imports
- เพิ่มใน navigation
- อัพเดต Prisma schema
- ทำการ test

## Integration with Project Structure

Generator จะวิเคราะห์และทำตาม patterns ที่มีอยู่:

### API Patterns

- Authentication patterns จาก existing APIs
- Error handling จาก existing routes
- Prisma usage patterns
- Response structures

### Component Patterns

- Import patterns
- Props interface patterns
- State management patterns
- Styling patterns

### Admin Page Patterns

- Layout structures
- Table implementations
- Pagination styles
- Filter implementations

## Troubleshooting

### Permission Issues

```bash
chmod +x scripts/generate.sh
```

### TypeScript Errors

หลังสร้างโค้ด อาจมี TypeScript errors:

1. ตรวจสอบ imports
2. อัพเดต Prisma schema
3. ใช้ AI refinement commands

### Missing Models

หากใช้ model ที่ยังไม่มีใน Prisma:

1. เพิ่ม model ใน `prisma/schema.prisma`
2. รัน `npm run db:push`
3. รัน `npm run db:generate`

## Advanced Usage

### Custom Templates

แก้ไข templates ใน `scripts/code-generator.ts`:

- `getApiTemplate()`
- `getAdminPageTemplate()`
- `getComponentTemplate()`

### Pattern Analysis

ดู patterns ที่วิเคราะห์ได้:

```bash
npm run gen:enhanced analyze > patterns.json
```

### Batch Generation

สร้างหลายไฟล์พร้อมกัน:

```bash
npm run gen:enhanced full-crud products --all-features
npm run gen:enhanced full-crud orders --all-features
npm run gen:enhanced full-crud customers --all-features
```

## Examples

### E-commerce System

```bash
# 1. สร้าง Products CRUD
npm run gen:enhanced full-crud products --all-features

# 2. ปรับปรุงด้วย AI
./u "enhance products system with inventory management and pricing"

# 3. สร้าง Orders CRUD
npm run gen:enhanced full-crud orders --all-features

# 4. เชื่อมโยง relationships
./u "add relationships between products and orders with proper foreign keys"
```

### Content Management

```bash
# 1. สร้าง Categories
npm run gen:enhanced api categories --auth --pagination

# 2. สร้าง Tags
npm run gen:enhanced api tags --auth --search

# 3. สร้าง admin interface
npm run gen:enhanced admin-page content-management --table --filters

# 4. ปรับปรุงระบบ
./u "create comprehensive content management system with categories, tags, and hierarchical structure"
```

## Tips

1. **เริ่มจาก analyze**: รู้จัก patterns ในโปรเจคก่อน
2. **ใช้ enhanced version**: ได้คำแนะนำ AI ที่ดีกว่า
3. **ทำ options ทีละน้อย**: เริ่มจาก basic แล้วค่อย refine
4. **ใช้ AI refinement**: จะได้โค้ดที่ complete มากขึ้น
5. **ทำตาม warnings**: จะช่วยป้องกันปัญหา

---

Generator นี้จะช่วยลดเวลาในการเขียน boilerplate code และให้คำแนะนำที่เหมาะสมสำหรับการใช้ AI ในการปรับปรุงโค้ดให้ complete และ production-ready!
