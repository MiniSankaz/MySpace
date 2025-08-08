# Developer Guide

This guide provides technical documentation for developers working with the CMS.

## Architecture Overview

The CMS follows a modular monolith architecture with clear separation of concerns.

### Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS v3.4
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket for live chat
- **State Management**: React Context API
- **Drag & Drop**: @dnd-kit

### Directory Structure

```
src/
├── app/                    # Next.js app router
│   ├── (public)/          # Public routes
│   ├── admin/             # Admin routes
│   └── api/               # API endpoints
├── modules/               # Feature modules
│   ├── i18n/             # Translation system
│   ├── page-builder/     # Page builder module
│   ├── survey/           # Survey module
│   └── ...               # Other modules
├── components/           # Shared components
├── lib/                  # Utilities
└── types/               # TypeScript types
```

## Module Development

### Module Structure

Each module follows this structure:

```
modules/[module-name]/
├── components/          # Module-specific components
├── services/           # API services
├── hooks/              # Custom hooks
├── types/              # TypeScript interfaces
├── utils/              # Helper functions
└── index.ts           # Module exports
```

### Creating a New Module

1. Create module directory:

```typescript
// src/modules/my-module/types/index.ts
export interface MyModuleData {
  id: string;
  name: string;
  // ... other fields
}
```

2. Create service layer:

```typescript
// src/modules/my-module/services/myModuleService.ts
class MyModuleService {
  private baseUrl = "/api/my-module";

  async getAll(): Promise<MyModuleData[]> {
    const response = await fetch(this.baseUrl);
    return response.json();
  }

  async create(data: Partial<MyModuleData>): Promise<MyModuleData> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

export default new MyModuleService();
```

3. Create components:

```typescript
// src/modules/my-module/components/MyModuleList.tsx
'use client'

import React, { useState, useEffect } from 'react';
import myModuleService from '../services/myModuleService';
import { MyModuleData } from '../types';

export function MyModuleList() {
  const [items, setItems] = useState<MyModuleData[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await myModuleService.getAll();
    setItems(data);
  };

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## API Development

### Creating API Routes

Use Next.js 15 route handlers:

```typescript
// src/app/api/my-module/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const items = await prisma.myModel.findMany();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const item = await prisma.myModel.create({ data });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 },
    );
  }
}
```

### Dynamic Routes

```typescript
// src/app/api/my-module/[id]/route.ts
interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  const item = await prisma.myModel.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(item);
}
```

## Database Schema

### Adding Models

Edit `prisma/schema.prisma`:

```prisma
model MyModel {
  id          String   @id @default(cuid())
  name        String
  description String?
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("my_models")
}
```

Run migrations:

```bash
npx prisma migrate dev --name add-my-model
```

### Working with JSON Fields

```typescript
// Storing typed JSON data
interface Metadata {
  tags: string[];
  settings: Record<string, any>;
}

const item = await prisma.myModel.create({
  data: {
    name: "Example",
    metadata: {
      tags: ["tag1", "tag2"],
      settings: { key: "value" },
    } as Metadata,
  },
});
```

## Component Development

### Creating Reusable Components

```typescript
// src/components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled
}: ButtonProps) {
  const baseClasses = 'rounded-lg font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}
```

### Using Drag & Drop

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

function DraggableList({ items, onReorder }) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over?.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)}>
        {items.map(item => (
          <SortableItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

## Translation System

### Adding Translations

```typescript
// Using the translation hook
import { useTranslation } from '@/modules/i18n/hooks/useTranslation';

function MyComponent() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div>
      <h1>{t('my_module.title')}</h1>
      <p>{t('my_module.description')}</p>
    </div>
  );
}
```

### Translation Keys

```typescript
// src/modules/i18n/translations/en.ts
export const en = {
  my_module: {
    title: "My Module",
    description: "This is my custom module",
    actions: {
      create: "Create New",
      edit: "Edit",
      delete: "Delete",
    },
  },
};
```

## WebSocket Integration

### Client-side WebSocket

```typescript
import { useEffect } from "react";
import websocketService from "@/modules/chat/services/websocketService";

function useWebSocket() {
  useEffect(() => {
    websocketService.connect("ws://localhost:3100/ws");

    websocketService.on("message", (data) => {
      console.log("Received:", data);
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const sendMessage = (message: string) => {
    websocketService.send("message", { text: message });
  };

  return { sendMessage };
}
```

## Testing

### Unit Tests

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Testing

```typescript
// __tests__/api/my-module.test.ts
import { GET, POST } from "@/app/api/my-module/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  myModel: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

describe("/api/my-module", () => {
  it("GET returns items", async () => {
    const mockItems = [{ id: "1", name: "Test" }];
    prisma.myModel.findMany.mockResolvedValue(mockItems);

    const response = await GET(new Request("http://localhost"));
    const data = await response.json();

    expect(data).toEqual(mockItems);
  });
});
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for large components
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### Image Optimization

```typescript
import Image from 'next/image';

function OptimizedImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      loading="lazy"
      placeholder="blur"
      blurDataURL={shimmer}
    />
  );
}
```

### Caching Strategies

```typescript
// API route with caching
export async function GET(request: NextRequest) {
  const cached = await redis.get("my-data");
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const data = await fetchData();
  await redis.setex("my-data", 3600, JSON.stringify(data));

  return NextResponse.json(data);
}
```

## Deployment

### Environment Variables

```env
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXTAUTH_URL=https://yourdomain.com

# Feature flags
ENABLE_CHAT=true
ENABLE_NEWSLETTER=true
```

### Build Optimization

```json
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.com'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
}
```

## Security Best Practices

### Input Validation

```typescript
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const validated = createSchema.parse(body);
    // Process validated data
  } catch (error) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
```

### Authentication Check

```typescript
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process authenticated request
}
```
