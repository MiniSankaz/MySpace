#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ModuleConfig {
  name: string;
  displayName: string;
  description: string;
  includeDatabase: boolean;
  includeApi: boolean;
  includeUI: boolean;
}

const toPascalCase = (str: string): string => {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const templates = {
  "index.ts": `// {{MODULE_NAME}} Module Exports
export * from './components';
export * from './services';
export * from './hooks';
export * from './types';
export * from './utils';
export * from './constants';
`,

  "README.md": `# {{MODULE_DISPLAY_NAME}} Module

## Description
{{MODULE_DESCRIPTION}}

## Structure
\`\`\`
{{MODULE_NAME_LOWER}}/
├── database/          # Database schema and data dictionary
├── components/        # React components
├── services/         # Business logic
├── hooks/           # React hooks
├── api/             # API routes
├── types/           # TypeScript types
├── utils/           # Utilities
├── constants/       # Constants
└── tests/           # Tests
\`\`\`

## Database Schema
See \`database/schema.prisma\` for the complete schema.
See \`database/data-dictionary.md\` for detailed documentation.

## Usage

### Import the service
\`\`\`typescript
import { {{MODULE_NAME_CAMEL}}Service } from '@/modules/{{MODULE_NAME_LOWER}}';
\`\`\`

### Use the hook
\`\`\`typescript
import { use{{MODULE_NAME}} } from '@/modules/{{MODULE_NAME_LOWER}}';

function MyComponent() {
  const { data, loading, error } = use{{MODULE_NAME}}();
  // ...
}
\`\`\`

## API Endpoints
- \`GET /api/{{MODULE_NAME_LOWER}}\` - List all {{MODULE_NAME_LOWER}}
- \`GET /api/{{MODULE_NAME_LOWER}}/[id]\` - Get single {{MODULE_NAME_LOWER}}
- \`POST /api/{{MODULE_NAME_LOWER}}\` - Create new {{MODULE_NAME_LOWER}}
- \`PUT /api/{{MODULE_NAME_LOWER}}/[id]\` - Update {{MODULE_NAME_LOWER}}
- \`DELETE /api/{{MODULE_NAME_LOWER}}/[id]\` - Delete {{MODULE_NAME_LOWER}}

## Permissions
- \`{{MODULE_NAME_LOWER}}.view\` - View {{MODULE_NAME_LOWER}}
- \`{{MODULE_NAME_LOWER}}.create\` - Create {{MODULE_NAME_LOWER}}
- \`{{MODULE_NAME_LOWER}}.update\` - Update {{MODULE_NAME_LOWER}}
- \`{{MODULE_NAME_LOWER}}.delete\` - Delete {{MODULE_NAME_LOWER}}
`,

  "database/schema.prisma": `// {{MODULE_NAME}} Module Schema

model {{MODULE_NAME}} {
  id          String   @id @default(cuid())
  name        String
  description String?
  
  // Add your fields here
  // Example fields:
  // status      {{MODULE_NAME}}Status @default(ACTIVE)
  // order       Int      @default(0)
  // metadata    Json?
  
  // Common fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  // Relations
  createdById String?
  createdBy   User?    @relation("{{MODULE_NAME}}CreatedBy", fields: [createdById], references: [id])
  updatedById String?
  updatedBy   User?    @relation("{{MODULE_NAME}}UpdatedBy", fields: [updatedById], references: [id])
  
  // Indexes
  @@index([name])
  @@index([createdAt])
  @@index([deletedAt])
}

// Enum example (uncomment if needed)
// enum {{MODULE_NAME}}Status {
//   ACTIVE
//   INACTIVE
//   ARCHIVED
// }
`,

  "database/data-dictionary.md": `# {{MODULE_DISPLAY_NAME}} Data Dictionary

## Overview
**Module**: {{MODULE_DISPLAY_NAME}}  
**Version**: 1.0.0  
**Last Updated**: {{DATE}}  
**Description**: {{MODULE_DESCRIPTION}}

## Database Tables

### {{MODULE_NAME}} Table
**Description**: Main table for {{MODULE_NAME_LOWER}} data  
**Relationships**: User (createdBy, updatedBy)

| Field | Type | Required | Default | Description | Example | Notes |
|-------|------|----------|---------|-------------|---------|-------|
| id | String | Yes | cuid() | Unique identifier | "clh2x4..." | Primary Key |
| name | String | Yes | - | {{MODULE_NAME}} name | "Example Name" | |
| description | String | No | null | Description | "Example description" | |
| createdAt | DateTime | Yes | now() | Creation timestamp | "2024-08-04T10:00:00Z" | |
| updatedAt | DateTime | Yes | now() | Last update timestamp | "2024-08-04T10:00:00Z" | Auto-updated |
| deletedAt | DateTime | No | null | Soft delete timestamp | "2024-08-04T10:00:00Z" | Null = active |
| createdById | String | No | null | User who created | "clh2x4..." | FK to User |
| updatedById | String | No | null | User who updated | "clh2x4..." | FK to User |

### Indexes
- \`@@index([name])\` - Faster name searches
- \`@@index([createdAt])\` - Faster date filtering
- \`@@index([deletedAt])\` - Faster active record filtering

## Business Rules

### 1. Data Validation
- **name**: Required, min 3 chars, max 255 chars
- **description**: Optional, max 1000 chars

### 2. Soft Delete
- Records are never hard deleted
- Set \`deletedAt\` to current timestamp to "delete"
- All queries should filter \`WHERE deletedAt IS NULL\`

### 3. Audit Trail
- Track who created/updated via \`createdById\` and \`updatedById\`
- Automatically set on create/update operations

## API Endpoints

| Method | Endpoint | Description | Required Permissions | Rate Limit |
|--------|----------|-------------|---------------------|------------|
| GET | /api/{{MODULE_NAME_LOWER}} | List all | {{MODULE_NAME_LOWER}}.view | 100/min |
| GET | /api/{{MODULE_NAME_LOWER}}/[id] | Get single | {{MODULE_NAME_LOWER}}.view | 100/min |
| POST | /api/{{MODULE_NAME_LOWER}} | Create new | {{MODULE_NAME_LOWER}}.create | 20/min |
| PUT | /api/{{MODULE_NAME_LOWER}}/[id] | Update | {{MODULE_NAME_LOWER}}.update | 20/min |
| DELETE | /api/{{MODULE_NAME_LOWER}}/[id] | Soft delete | {{MODULE_NAME_LOWER}}.delete | 10/min |

## Sample Data

\`\`\`json
{
  "id": "clh2x4abc123",
  "name": "Sample {{MODULE_NAME}}",
  "description": "This is a sample {{MODULE_NAME_LOWER}}",
  "createdAt": "2024-08-04T10:00:00Z",
  "updatedAt": "2024-08-04T10:00:00Z",
  "deletedAt": null,
  "createdById": "clh2x4user123",
  "updatedById": "clh2x4user123"
}
\`\`\`
`,

  "database/seed.ts": `// {{MODULE_NAME}} Module Seed Data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed{{MODULE_NAME}}() {
  console.log('🌱 Seeding {{MODULE_NAME}}...');

  const {{MODULE_NAME_LOWER}}Data = [
    {
      name: 'Sample {{MODULE_NAME}} 1',
      description: 'This is the first sample {{MODULE_NAME_LOWER}}',
    },
    {
      name: 'Sample {{MODULE_NAME}} 2',
      description: 'This is the second sample {{MODULE_NAME_LOWER}}',
    },
  ];

  for (const data of {{MODULE_NAME_LOWER}}Data) {
    await prisma.{{MODULE_NAME_LOWER}}.create({
      data,
    });
  }

  console.log('✅ {{MODULE_NAME}} seeded');
}

// Run if called directly
if (require.main === module) {
  seed{{MODULE_NAME}}()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
`,

  "services/{{MODULE_NAME_LOWER}}.service.ts": `import { prisma } from '@/core/database/prisma';
import type { Prisma } from '@prisma/client';
import type { 
  {{MODULE_NAME}}CreateInput, 
  {{MODULE_NAME}}UpdateInput,
  {{MODULE_NAME}}ListParams 
} from '../types';

export class {{MODULE_NAME}}Service {
  /**
   * Get all {{MODULE_NAME_LOWER}} with pagination
   */
  async findAll(params: {{MODULE_NAME}}ListParams = {}) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = params;

    const where: Prisma.{{MODULE_NAME}}WhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.{{MODULE_NAME_LOWER}}.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      }),
      prisma.{{MODULE_NAME_LOWER}}.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single {{MODULE_NAME_LOWER}} by ID
   */
  async findOne(id: string) {
    return prisma.{{MODULE_NAME_LOWER}}.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        updatedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  }

  /**
   * Create new {{MODULE_NAME_LOWER}}
   */
  async create(data: {{MODULE_NAME}}CreateInput, userId?: string) {
    return prisma.{{MODULE_NAME_LOWER}}.create({
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  /**
   * Update {{MODULE_NAME_LOWER}}
   */
  async update(id: string, data: {{MODULE_NAME}}UpdateInput, userId?: string) {
    return prisma.{{MODULE_NAME_LOWER}}.update({
      where: { id },
      data: {
        ...data,
        updatedById: userId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete {{MODULE_NAME_LOWER}}
   */
  async delete(id: string, userId?: string) {
    return prisma.{{MODULE_NAME_LOWER}}.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: userId,
      },
    });
  }

  /**
   * Restore soft deleted {{MODULE_NAME_LOWER}}
   */
  async restore(id: string, userId?: string) {
    return prisma.{{MODULE_NAME_LOWER}}.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedById: userId,
      },
    });
  }

  /**
   * Check if {{MODULE_NAME_LOWER}} exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.{{MODULE_NAME_LOWER}}.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
}

export const {{MODULE_NAME_CAMEL}}Service = new {{MODULE_NAME}}Service();
`,

  "types/{{MODULE_NAME_LOWER}}.types.ts": `import type { {{MODULE_NAME}}, User } from '@prisma/client';

// Base {{MODULE_NAME}} type from Prisma
export type { {{MODULE_NAME}} } from '@prisma/client';

// {{MODULE_NAME}} with relations
export interface {{MODULE_NAME}}WithRelations extends {{MODULE_NAME}} {
  createdBy?: Pick<User, 'id' | 'displayName' | 'email'> | null;
  updatedBy?: Pick<User, 'id' | 'displayName' | 'email'> | null;
}

// Create input
export interface {{MODULE_NAME}}CreateInput {
  name: string;
  description?: string | null;
  // Add other fields as needed
}

// Update input
export interface {{MODULE_NAME}}UpdateInput {
  name?: string;
  description?: string | null;
  // Add other fields as needed
}

// List parameters
export interface {{MODULE_NAME}}ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response types
export interface {{MODULE_NAME}}ListResponse {
  data: {{MODULE_NAME}}WithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
`,

  "hooks/use{{MODULE_NAME}}.ts": `import { useState, useEffect, useCallback } from 'react';
import { {{MODULE_NAME_CAMEL}}Service } from '../services';
import type { {{MODULE_NAME}}WithRelations, {{MODULE_NAME}}ListParams } from '../types';

export function use{{MODULE_NAME}}(params: {{MODULE_NAME}}ListParams = {}) {
  const [data, setData] = useState<{{MODULE_NAME}}WithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await {{MODULE_NAME_CAMEL}}Service.findAll(params);
      setData(result.data);
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchData,
  };
}

export function use{{MODULE_NAME}}ById(id: string | null) {
  const [data, setData] = useState<{{MODULE_NAME}}WithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result = await {{MODULE_NAME_CAMEL}}Service.findOne(id);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
`,

  "constants/{{MODULE_NAME_LOWER}}.constants.ts": `// {{MODULE_NAME}} Module Constants

export const {{MODULE_NAME_UPPER}}_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export const {{MODULE_NAME_UPPER}}_PERMISSIONS = {
  VIEW: '{{MODULE_NAME_LOWER}}.view',
  CREATE: '{{MODULE_NAME_LOWER}}.create',
  UPDATE: '{{MODULE_NAME_LOWER}}.update',
  DELETE: '{{MODULE_NAME_LOWER}}.delete',
  ADMIN: '{{MODULE_NAME_LOWER}}.admin',
} as const;

export const {{MODULE_NAME_UPPER}}_ROUTES = {
  LIST: '/admin/{{MODULE_NAME_LOWER}}',
  CREATE: '/admin/{{MODULE_NAME_LOWER}}/new',
  EDIT: (id: string) => \`/admin/{{MODULE_NAME_LOWER}}/\${id}/edit\`,
  VIEW: (id: string) => \`/admin/{{MODULE_NAME_LOWER}}/\${id}\`,
} as const;

export const {{MODULE_NAME_UPPER}}_API = {
  BASE: '/api/{{MODULE_NAME_LOWER}}',
  BY_ID: (id: string) => \`/api/{{MODULE_NAME_LOWER}}/\${id}\`,
} as const;
`,

  "api/route.ts": `import { NextRequest, NextResponse } from 'next/server';
import { {{MODULE_NAME_CAMEL}}Service } from '@/modules/{{MODULE_NAME_LOWER}}/services';
import { auth } from '@core/auth';
import { checkPermission } from '@core/auth/permissions';
import { {{MODULE_NAME_UPPER}}_PERMISSIONS } from '@/modules/{{MODULE_NAME_LOWER}}/constants';

// GET /api/{{MODULE_NAME_LOWER}}
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, {{MODULE_NAME_UPPER}}_PERMISSIONS.VIEW);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    };

    // Fetch data
    const result = await {{MODULE_NAME_CAMEL}}Service.findAll(params);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching {{MODULE_NAME_LOWER}}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch {{MODULE_NAME_LOWER}}' },
      { status: 500 }
    );
  }
}

// POST /api/{{MODULE_NAME_LOWER}}
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, {{MODULE_NAME_UPPER}}_PERMISSIONS.CREATE);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();

    // Validate input
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create {{MODULE_NAME_LOWER}}
    const result = await {{MODULE_NAME_CAMEL}}Service.create(body, session.user.id);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating {{MODULE_NAME_LOWER}}:', error);
    return NextResponse.json(
      { error: 'Failed to create {{MODULE_NAME_LOWER}}' },
      { status: 500 }
    );
  }
}
`,

  "api/[id]/route.ts": `import { NextRequest, NextResponse } from 'next/server';
import { {{MODULE_NAME_CAMEL}}Service } from '@/modules/{{MODULE_NAME_LOWER}}/services';
import { auth } from '@core/auth';
import { checkPermission } from '@core/auth/permissions';
import { {{MODULE_NAME_UPPER}}_PERMISSIONS } from '@/modules/{{MODULE_NAME_LOWER}}/constants';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/{{MODULE_NAME_LOWER}}/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, {{MODULE_NAME_UPPER}}_PERMISSIONS.VIEW);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch data
    const result = await {{MODULE_NAME_CAMEL}}Service.findOne(params.id);
    
    if (!result) {
      return NextResponse.json({ error: '{{MODULE_NAME}} not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching {{MODULE_NAME_LOWER}}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch {{MODULE_NAME_LOWER}}' },
      { status: 500 }
    );
  }
}

// PUT /api/{{MODULE_NAME_LOWER}}/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, {{MODULE_NAME_UPPER}}_PERMISSIONS.UPDATE);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if exists
    const exists = await {{MODULE_NAME_CAMEL}}Service.exists(params.id);
    if (!exists) {
      return NextResponse.json({ error: '{{MODULE_NAME}} not found' }, { status: 404 });
    }

    // Get request body
    const body = await request.json();

    // Update {{MODULE_NAME_LOWER}}
    const result = await {{MODULE_NAME_CAMEL}}Service.update(params.id, body, session.user.id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating {{MODULE_NAME_LOWER}}:', error);
    return NextResponse.json(
      { error: 'Failed to update {{MODULE_NAME_LOWER}}' },
      { status: 500 }
    );
  }
}

// DELETE /api/{{MODULE_NAME_LOWER}}/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, {{MODULE_NAME_UPPER}}_PERMISSIONS.DELETE);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if exists
    const exists = await {{MODULE_NAME_CAMEL}}Service.exists(params.id);
    if (!exists) {
      return NextResponse.json({ error: '{{MODULE_NAME}} not found' }, { status: 404 });
    }

    // Soft delete {{MODULE_NAME_LOWER}}
    await {{MODULE_NAME_CAMEL}}Service.delete(params.id, session.user.id);
    
    return NextResponse.json({ message: '{{MODULE_NAME}} deleted successfully' });
  } catch (error) {
    console.error('Error deleting {{MODULE_NAME_LOWER}}:', error);
    return NextResponse.json(
      { error: 'Failed to delete {{MODULE_NAME_LOWER}}' },
      { status: 500 }
    );
  }
}
`,
};

async function createModuleStructure(config: ModuleConfig) {
  const moduleName = toPascalCase(config.name);
  const moduleNameLower = config.name.toLowerCase();
  const moduleNameCamel = toCamelCase(config.name);
  const moduleNameUpper = config.name.toUpperCase().replace(/-/g, "_");

  const baseDir = path.join(process.cwd(), "src", "modules", moduleNameLower);

  // Create base directory
  await fs.mkdir(baseDir, { recursive: true });

  // Create subdirectories
  const dirs = [
    "database",
    "components",
    "services",
    "hooks",
    "api",
    "api/[id]",
    "types",
    "utils",
    "constants",
    "styles",
    "tests",
    "tests/fixtures",
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(baseDir, dir), { recursive: true });
  }

  // Process and write templates
  for (const [filename, content] of Object.entries(templates)) {
    const processedContent = content
      .replace(/{{MODULE_NAME}}/g, moduleName)
      .replace(/{{MODULE_NAME_LOWER}}/g, moduleNameLower)
      .replace(/{{MODULE_NAME_CAMEL}}/g, moduleNameCamel)
      .replace(/{{MODULE_NAME_UPPER}}/g, moduleNameUpper)
      .replace(/{{MODULE_DISPLAY_NAME}}/g, config.displayName)
      .replace(/{{MODULE_DESCRIPTION}}/g, config.description)
      .replace(/{{DATE}}/g, new Date().toISOString().split("T")[0]);

    const processedFilename = filename
      .replace(/{{MODULE_NAME}}/g, moduleName)
      .replace(/{{MODULE_NAME_LOWER}}/g, moduleNameLower);

    const filePath = path.join(baseDir, processedFilename);
    await fs.writeFile(filePath, processedContent);
  }

  // Create empty index files for directories
  const indexDirs = ["components", "utils"];
  for (const dir of indexDirs) {
    await fs.writeFile(
      path.join(baseDir, dir, "index.ts"),
      `// Export ${dir} here\n`,
    );
  }

  console.log(
    `✅ Module "${config.displayName}" created successfully at: ${baseDir}`,
  );
  console.log("\nNext steps:");
  console.log(
    `1. Add the Prisma schema from database/schema.prisma to your main schema.prisma`,
  );
  console.log(`2. Run "npx prisma generate" to update the Prisma client`);
  console.log(`3. Run "npx prisma db push" to update the database`);
  console.log(`4. Import and use your module components and services`);
}

async function main() {
  console.log("🚀 Module Generator\n");

  const answers = await inquirer.prompt<ModuleConfig>([
    {
      type: "input",
      name: "name",
      message: "Module name (kebab-case):",
      validate: (input) => {
        if (!input) return "Module name is required";
        if (!/^[a-z]+(-[a-z]+)*$/.test(input)) {
          return "Module name must be in kebab-case (e.g., user-profile)";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "displayName",
      message: "Display name:",
      validate: (input) => (input ? true : "Display name is required"),
    },
    {
      type: "input",
      name: "description",
      message: "Description:",
      default: "Module description",
    },
    {
      type: "confirm",
      name: "includeDatabase",
      message: "Include database schema?",
      default: true,
    },
    {
      type: "confirm",
      name: "includeApi",
      message: "Include API routes?",
      default: true,
    },
    {
      type: "confirm",
      name: "includeUI",
      message: "Include UI components?",
      default: true,
    },
  ]);

  try {
    await createModuleStructure(answers);
  } catch (error) {
    console.error("❌ Error creating module:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
