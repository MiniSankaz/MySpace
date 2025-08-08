# Library Integration Guide

Quick guide for integrating the ERP CMS Code Library into your development workflow.

## 🚀 Quick Start

### 1. **Setup Path Alias**

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/library/*": ["_library/*"],
      "@/library": ["_library/index.ts"]
    }
  }
}
```

### 2. **Import Components**

```typescript
// Single imports
import { ActionButton } from "@/library/components/ui/buttons/ActionButton";
import { DataTable } from "@/library/components/ui/tables/DataTable";

// Bulk imports from index
import { ActionButton, DataTable, useApi, validateEmail } from "@/library";
```

### 3. **Use in Components**

```typescript
import React from 'react'
import { DataTable, ActionButton, useApi } from '@/library'
import type { ColumnDef } from '@/library'

interface User {
  id: string
  name: string
  email: string
}

export default function UserManagement() {
  const { data, loading, refetch } = useApi<User[]>('/api/users')

  const columns: ColumnDef<User>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => (
        <ActionButton
          variant="primary"
          size="sm"
          onClick={() => handleEdit(user)}
        >
          Edit
        </ActionButton>
      )
    }
  ]

  return (
    <div>
      <DataTable
        data={data || []}
        columns={columns}
        loading={loading}
        pagination={true}
        searchable={true}
      />
    </div>
  )
}
```

## 🛠️ Code Generation

### **Generate Component**

```bash
cd _library/generators/component-generator
./generate-component.js UserCard --type business --props "user:User,onClick:function" --with-tests
```

### **Generate CRUD**

```bash
cd _library/generators/crud-generator
./generate-crud.js Product --fields "name:String,price:Float,category:String" --module inventory --with-tests
```

## 📋 Development Workflow

### **1. Check Library First**

Before creating new components:

```bash
# Search for existing components
find _library -name "*table*" -type f
find _library -name "*button*" -type f
```

### **2. Extend Existing Components**

```typescript
// Extend ActionButton for domain-specific use
import { ActionButton } from '@/library'

interface SaveButtonProps {
  onSave: () => void
  loading?: boolean
}

export function SaveButton({ onSave, loading }: SaveButtonProps) {
  return (
    <ActionButton
      variant="primary"
      onClick={onSave}
      loading={loading}
      icon="save"
    >
      Save Changes
    </ActionButton>
  )
}
```

### **3. Contribute Back**

When creating reusable components:

```bash
# 1. Create component in library
cp MyComponent.tsx _library/components/ui/

# 2. Add to index
echo "export { MyComponent } from './ui/MyComponent'" >> _library/components/index.ts

# 3. Update documentation
# Add component to README.md
```

## 🎨 Styling Integration

### **With Tailwind CSS**

Components use Tailwind classes by default:

```typescript
import { cn } from '@/shared/lib/utils' // Tailwind class merger

<ActionButton
  className={cn(
    'my-custom-classes',
    variant === 'special' && 'bg-purple-600'
  )}
>
  Click me
</ActionButton>
```

### **Custom Themes**

```typescript
import { useTheme } from '@/library/hooks/ui'

function ThemedComponent() {
  const theme = useTheme()

  return (
    <div style={{ backgroundColor: theme.colors.primary }}>
      Themed content
    </div>
  )
}
```

## 🧪 Testing Integration

### **Component Testing**

```typescript
import { render, screen } from '@testing-library/react'
import { ActionButton } from '@/library'

describe('ActionButton Integration', () => {
  it('works in our module', () => {
    render(
      <ActionButton onClick={jest.fn()}>
        Test Button
      </ActionButton>
    )

    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })
})
```

### **Hook Testing**

```typescript
import { renderHook } from "@testing-library/react";
import { useApi } from "@/library";

describe("useApi Integration", () => {
  it("fetches data correctly", async () => {
    const { result } = renderHook(() => useApi("/api/test"));

    // Test hook behavior
  });
});
```

## 📚 Best Practices

### **1. Import Strategy**

```typescript
// ✅ Good - specific imports
import { ActionButton } from "@/library/components/ui/buttons/ActionButton";

// ✅ Good - bulk imports for commonly used
import { ActionButton, DataTable, useApi } from "@/library";

// ❌ Avoid - importing entire library
import * as Library from "@/library";
```

### **2. Component Composition**

```typescript
// ✅ Good - compose smaller components
function UserActions({ user }: { user: User }) {
  return (
    <div className="flex space-x-2">
      <ActionButton variant="secondary" size="sm">
        Edit
      </ActionButton>
      <ActionButton variant="danger" size="sm">
        Delete
      </ActionButton>
    </div>
  )
}

// Use in DataTable
const columns: ColumnDef<User>[] = [
  {
    key: 'actions',
    label: 'Actions',
    render: (_, user) => <UserActions user={user} />
  }
]
```

### **3. Error Handling**

```typescript
import { useApi } from '@/library'

function DataComponent() {
  const { data, loading, error, refetch } = useApi('/api/data')

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error.message}</p>
        <ActionButton onClick={refetch} className="mt-4">
          Retry
        </ActionButton>
      </div>
    )
  }

  return <div>{/* component content */}</div>
}
```

## 🔧 Configuration

### **Library Configuration**

Create `_library/config.ts`:

```typescript
export const libraryConfig = {
  theme: {
    primaryColor: "#2563eb",
    fontFamily: "Inter, sans-serif",
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
    timeout: 10000,
  },
  components: {
    defaultButtonSize: "md" as const,
    tablePageSize: 10,
  },
};
```

### **Environment Variables**

```bash
# .env.local
NEXT_PUBLIC_LIBRARY_VERSION=1.0.0
NEXT_PUBLIC_DEBUG_COMPONENTS=false
```

## 📊 Performance Tips

### **1. Code Splitting**

```typescript
// Lazy load heavy components
const DataTable = lazy(() => import('@/library/components/ui/tables/DataTable'))

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading table...</div>}>
      <DataTable data={data} columns={columns} />
    </Suspense>
  )
}
```

### **2. Memoization**

```typescript
import React, { memo } from "react";
import { DataTable } from "@/library";

// Memoize expensive components
const MemoizedDataTable = memo(DataTable);

// Use with stable props
const columns = useMemo(() => [{ key: "name", label: "Name" }], []);
```

## 🆘 Troubleshooting

### **Common Issues**

**Import Errors:**

```bash
# Fix path alias issues
npx tsc --noEmit  # Check TypeScript errors
```

**Style Conflicts:**

```typescript
// Use className prop to override styles
<ActionButton className="my-custom-styles">
  Button
</ActionButton>
```

**Hook Dependencies:**

```typescript
// Always include dependencies in useApi
const { data } = useApi("/api/users", {
  deps: [userId], // Re-fetch when userId changes
});
```

### **Getting Help**

1. Check component documentation in the component file
2. Look at generated examples
3. Check this integration guide
4. Ask in team chat or create GitHub issue

---

_This integration guide helps you leverage the full power of the ERP CMS Code Library._
