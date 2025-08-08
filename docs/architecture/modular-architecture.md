# โครงสร้างไฟล์แบบ Modular Architecture

## 1. โครงสร้างหลัก

```
cms-erp/
├── src/
│   ├── core/                      # Core functionality ที่ใช้ทุกโปรเจค
│   │   ├── auth/                  # Authentication & Authorization
│   │   ├── database/              # Database utilities
│   │   ├── security/              # Security utilities
│   │   ├── config/                # Configuration management
│   │   └── utils/                 # Shared utilities
│   │
│   ├── modules/                   # Business modules
│   │   ├── user/                  # User management
│   │   ├── media/                 # Media library
│   │   ├── blog/                  # Blog system
│   │   ├── page-builder/          # Page builder
│   │   ├── survey/                # Survey system
│   │   ├── analytics/             # Analytics
│   │   └── [module-name]/         # Other modules
│   │
│   ├── shared/                    # Shared resources
│   │   ├── components/            # Reusable UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── types/                 # TypeScript types
│   │   ├── constants/             # Constants
│   │   └── styles/                # Global styles
│   │
│   └── app/                       # Next.js App Router
│       ├── (public)/              # Public routes
│       ├── (auth)/                # Auth routes
│       └── api/                   # API routes
│
├── prisma/                        # Database schema
├── public/                        # Static files
├── scripts/                       # Build & utility scripts
├── docs/                          # Documentation
└── tests/                         # Test files
```

## 2. Module Structure (โครงสร้างของแต่ละ Module)

```
src/modules/[module-name]/
├── index.ts                       # Module exports
├── README.md                      # Module documentation
├── package.json                   # Module metadata (optional)
│
├── database/                      # Database schema & docs
│   ├── schema.prisma             # Prisma schema for this module
│   ├── migrations/               # Module-specific migrations
│   ├── seed.ts                   # Seed data
│   └── data-dictionary.md        # Data dictionary
│
├── components/                    # UI Components
│   ├── [ComponentName].tsx
│   └── index.ts
│
├── services/                      # Business logic
│   ├── [module].service.ts
│   └── index.ts
│
├── hooks/                         # Custom hooks
│   ├── use[ModuleName].ts
│   └── index.ts
│
├── api/                          # API routes
│   ├── route.ts
│   └── [action]/
│       └── route.ts
│
├── types/                        # TypeScript types
│   ├── [module].types.ts
│   └── index.ts
│
├── utils/                        # Module utilities
│   ├── [module].utils.ts
│   └── index.ts
│
├── constants/                    # Module constants
│   ├── [module].constants.ts
│   └── index.ts
│
├── styles/                       # Module styles
│   ├── [module].module.css
│   └── index.ts
│
└── tests/                        # Module tests
    ├── [module].test.ts
    └── fixtures/
```

## 3. Core Module Structure

```
src/core/
├── auth/
│   ├── services/
│   │   ├── auth.service.ts        # Authentication logic
│   │   ├── session.service.ts     # Session management
│   │   └── rbac.service.ts        # Role-based access control
│   ├── guards/
│   │   ├── auth.guard.ts          # Authentication guard
│   │   └── permission.guard.ts    # Permission guard
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePermission.ts
│   └── types/
│       └── auth.types.ts
│
├── database/
│   ├── prisma.ts                  # Prisma client
│   ├── seed.ts                    # Database seeding
│   └── migrations/                # Custom migrations
│
├── security/
│   ├── encryption.ts              # Encryption utilities
│   ├── validation.ts              # Input validation
│   ├── sanitization.ts            # Data sanitization
│   └── rate-limiting.ts           # Rate limiting
│
├── config/
│   ├── app.config.ts              # App configuration
│   ├── env.config.ts              # Environment config
│   └── feature-flags.ts           # Feature flags
│
└── utils/
    ├── logger.ts                  # Logging utility
    ├── error-handler.ts           # Error handling
    ├── response.ts                # API response helpers
    └── helpers.ts                 # General helpers
```

## 4. Module Template Generator

สร้างไฟล์ script สำหรับ generate module ใหม่:

```typescript
// scripts/generate-module.ts
import fs from "fs";
import path from "path";

const moduleTemplate = {
  "index.ts": `export * from './components';
export * from './services';
export * from './hooks';
export * from './types';
export * from './utils';
export * from './constants';
`,
  "README.md": `# {{MODULE_NAME}} Module

## Description
[Module description here]

## Features
- Feature 1
- Feature 2

## Usage
\`\`\`typescript
import { {{MODULE_NAME}}Service } from '@/modules/{{MODULE_NAME_LOWER}}';
\`\`\`

## API Endpoints
- \`GET /api/{{MODULE_NAME_LOWER}}\` - List all
- \`POST /api/{{MODULE_NAME_LOWER}}\` - Create new
- \`PUT /api/{{MODULE_NAME_LOWER}}/[id]\` - Update
- \`DELETE /api/{{MODULE_NAME_LOWER}}/[id]\` - Delete
`,
  "components/index.ts": `// Export all components
`,
  "services/{{MODULE_NAME_LOWER}}.service.ts": `import { prisma } from '@/core/database';
import type { {{MODULE_NAME}}CreateInput, {{MODULE_NAME}}UpdateInput } from '../types';

export class {{MODULE_NAME}}Service {
  async findAll() {
    return prisma.{{MODULE_NAME_LOWER}}.findMany();
  }

  async findOne(id: string) {
    return prisma.{{MODULE_NAME_LOWER}}.findUnique({
      where: { id }
    });
  }

  async create(data: {{MODULE_NAME}}CreateInput) {
    return prisma.{{MODULE_NAME_LOWER}}.create({
      data
    });
  }

  async update(id: string, data: {{MODULE_NAME}}UpdateInput) {
    return prisma.{{MODULE_NAME_LOWER}}.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.{{MODULE_NAME_LOWER}}.delete({
      where: { id }
    });
  }
}

export const {{MODULE_NAME_LOWER}}Service = new {{MODULE_NAME}}Service();
`,
  "types/{{MODULE_NAME_LOWER}}.types.ts": `export interface {{MODULE_NAME}} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface {{MODULE_NAME}}CreateInput {
  // Define create input fields
}

export interface {{MODULE_NAME}}UpdateInput {
  // Define update input fields
}
`,
  "hooks/use{{MODULE_NAME}}.ts": `import { useState, useEffect } from 'react';
import { {{MODULE_NAME_LOWER}}Service } from '../services';

export function use{{MODULE_NAME}}() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await {{MODULE_NAME_LOWER}}Service.findAll();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}
`,
};
```

## 5. Package Structure for Reusability

```
cms-core-package/
├── package.json
├── README.md
├── src/
│   ├── index.ts                   # Main exports
│   ├── core/                      # Core modules
│   ├── shared/                    # Shared components
│   └── templates/                 # Project templates
│
├── templates/
│   ├── basic-cms/                 # Basic CMS template
│   ├── enterprise-cms/            # Enterprise template
│   └── saas-cms/                  # SaaS template
│
└── cli/
    └── create-cms-app.js          # CLI tool
```

## 6. Module Registry (module.config.ts)

```typescript
// src/modules/module.config.ts
export interface ModuleConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  dependencies: string[];
  routes: string[];
  permissions: string[];
  menuItems: MenuItem[];
  settings?: ModuleSetting[];
}

export const modules: Record<string, ModuleConfig> = {
  user: {
    name: "user",
    displayName: "User Management",
    description: "Manage users, roles, and permissions",
    version: "1.0.0",
    dependencies: ["auth"],
    routes: ["/admin/users", "/api/users"],
    permissions: ["user.view", "user.create", "user.update", "user.delete"],
    menuItems: [
      {
        title: "Users",
        path: "/admin/users",
        icon: "Users",
        permission: "user.view",
      },
    ],
  },
  media: {
    name: "media",
    displayName: "Media Library",
    description: "Manage media files and galleries",
    version: "1.0.0",
    dependencies: [],
    routes: ["/admin/media", "/api/media"],
    permissions: ["media.view", "media.upload", "media.delete"],
    menuItems: [
      {
        title: "Media Library",
        path: "/admin/media",
        icon: "Image",
        permission: "media.view",
      },
    ],
  },
  // ... other modules
};
```

## 7. Module Loader

```typescript
// src/core/module-loader.ts
import { modules } from "@/modules/module.config";

export class ModuleLoader {
  private enabledModules: Set<string> = new Set();

  constructor() {
    this.loadEnabledModules();
  }

  private loadEnabledModules() {
    // Load from config or database
    const enabled = process.env.ENABLED_MODULES?.split(",") || [];
    enabled.forEach((module) => this.enabledModules.add(module));
  }

  isModuleEnabled(moduleName: string): boolean {
    return this.enabledModules.has(moduleName);
  }

  getEnabledModules(): ModuleConfig[] {
    return Object.entries(modules)
      .filter(([name]) => this.isModuleEnabled(name))
      .map(([_, config]) => config);
  }

  getModuleRoutes(): string[] {
    return this.getEnabledModules().flatMap((module) => module.routes);
  }

  getModulePermissions(): string[] {
    return this.getEnabledModules().flatMap((module) => module.permissions);
  }
}

export const moduleLoader = new ModuleLoader();
```

## 8. Benefits ของโครงสร้างนี้

### 1. **Modularity**

- แต่ละ module แยกจากกันชัดเจน
- ง่ายต่อการ enable/disable features
- ลด dependencies ระหว่าง modules

### 2. **Reusability**

- Copy module ไปใช้ในโปรเจคอื่นได้ง่าย
- Core modules ใช้ซ้ำได้ทุกโปรเจค
- Template system สำหรับสร้างโปรเจคใหม่

### 3. **Maintainability**

- โครงสร้างที่สม่ำเสมอ
- ง่ายต่อการหา files
- Clear separation of concerns

### 4. **Scalability**

- เพิ่ม module ใหม่ได้ง่าย
- ไม่กระทบ modules อื่น
- Performance optimization ต่อ module

### 5. **Developer Experience**

- CLI tools สำหรับ generate code
- Clear documentation structure
- Type safety throughout

## 9. Migration Plan

### Phase 1: Core Extraction (1 สัปดาห์)

- แยก auth, database, security ออกมาเป็น core
- สร้าง shared components
- Setup module loader

### Phase 2: Module Refactoring (2 สัปดาห์)

- Refactor existing code into modules
- Create module configs
- Update imports

### Phase 3: Template Creation (1 สัปดาห์)

- Create project templates
- Build CLI tool
- Write documentation

### Phase 4: Testing & Optimization (1 สัปดาห์)

- Test module isolation
- Performance optimization
- Developer documentation

## 10. Example: Blog Module Database Structure

### database/schema.prisma

```prisma
// Blog Module Schema
model Post {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  content       Json      // Rich text content
  excerpt       String?
  featuredImage String?
  status        PostStatus @default(DRAFT)
  publishedAt   DateTime?

  // SEO
  metaTitle     String?
  metaDescription String?
  metaKeywords  String[]

  // Relations
  authorId      String
  author        User      @relation(fields: [authorId], references: [id])
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])
  tags          PostTag[]
  comments      Comment[]

  // Tracking
  viewCount     Int       @default(0)
  likeCount     Int       @default(0)
  shareCount    Int       @default(0)

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  @@index([slug])
  @@index([authorId])
  @@index([categoryId])
  @@index([status, publishedAt])
}

model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  parentId    String?
  parent      Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  posts       Post[]
  order       Int       @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([slug])
  @@index([parentId])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
  ARCHIVED
}
```

### database/data-dictionary.md

```markdown
# Blog Module Data Dictionary

## Post Table

| Field         | Type     | Required | Default | Description                        | Example                        |
| ------------- | -------- | -------- | ------- | ---------------------------------- | ------------------------------ |
| id            | String   | Yes      | cuid()  | Unique identifier                  | "clh2x4..."                    |
| title         | String   | Yes      | -       | Post title                         | "วิธีใช้ Next.js 15"           |
| slug          | String   | Yes      | -       | URL-friendly identifier            | "how-to-use-nextjs-15"         |
| content       | Json     | Yes      | -       | Rich text content (Lexical/TipTap) | {"type":"doc","content":[...]} |
| excerpt       | String   | No       | null    | Short description                  | "เรียนรู้การใช้..."            |
| featuredImage | String   | No       | null    | URL to featured image              | "/uploads/nextjs.jpg"          |
| status        | Enum     | Yes      | DRAFT   | Publication status                 | "PUBLISHED"                    |
| publishedAt   | DateTime | No       | null    | Publication date/time              | "2024-08-04T10:00:00Z"         |
| authorId      | String   | Yes      | -       | Reference to User                  | "clh2x4..."                    |
| categoryId    | String   | No       | null    | Reference to Category              | "clh2x4..."                    |
| viewCount     | Int      | Yes      | 0       | Number of views                    | 1234                           |
| likeCount     | Int      | Yes      | 0       | Number of likes                    | 56                             |
| shareCount    | Int      | Yes      | 0       | Number of shares                   | 12                             |

### Business Rules

1. **Slug Generation**: Auto-generate from title if not provided
2. **Status Transitions**:
   - DRAFT → PUBLISHED (require publishedAt)
   - PUBLISHED → ARCHIVED (keep publishedAt)
   - SCHEDULED → PUBLISHED (auto when publishedAt reached)
3. **Soft Delete**: Use deletedAt instead of hard delete
4. **SEO**: metaTitle defaults to title if not provided

## Category Table

| Field       | Type   | Required | Default | Description                   | Example          |
| ----------- | ------ | -------- | ------- | ----------------------------- | ---------------- |
| id          | String | Yes      | cuid()  | Unique identifier             | "clh2x4..."      |
| name        | String | Yes      | -       | Category name                 | "Technology"     |
| slug        | String | Yes      | -       | URL-friendly identifier       | "technology"     |
| description | String | No       | null    | Category description          | "All about tech" |
| parentId    | String | No       | null    | Parent category (for nesting) | "clh2x4..."      |
| order       | Int    | Yes      | 0       | Display order                 | 1                |

### Business Rules

1. **Hierarchical**: Support unlimited nesting levels
2. **Slug Uniqueness**: Must be unique across all categories
3. **Circular Reference**: Prevent category being its own parent
4. **Order**: Lower numbers display first

## API Endpoints

| Method | Endpoint               | Description     | Required Permissions |
| ------ | ---------------------- | --------------- | -------------------- |
| GET    | /api/blog/posts        | List all posts  | blog.view            |
| GET    | /api/blog/posts/[slug] | Get single post | blog.view            |
| POST   | /api/blog/posts        | Create new post | blog.create          |
| PUT    | /api/blog/posts/[id]   | Update post     | blog.update          |
| DELETE | /api/blog/posts/[id]   | Delete post     | blog.delete          |
| GET    | /api/blog/categories   | List categories | blog.view            |
| POST   | /api/blog/categories   | Create category | blog.admin           |
```

## 11. Example Commands

```bash
# Generate new module
npm run generate:module blog

# Create new project from template
npx create-cms-app my-new-cms --template enterprise

# Add module to existing project
npm run add:module ecommerce

# Remove module
npm run remove:module survey

# List available modules
npm run modules:list
```

โครงสร้างนี้จะทำให้ระบบ CMS ของคุณ:

- เป็นระเบียบและหาง่าย
- Reusable สูง
- ง่ายต่อการพัฒนาระบบใหม่
- Maintain ง่าย
- Scale ได้ดี
