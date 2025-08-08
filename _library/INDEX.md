# 📚 CMS-ERP Library Index

Generated: $(date)

## 📊 Quick Stats

- Components: 4 (ActionButton, DataTable, SmartForm + 1 template)
- Hooks: 3 (useApi, useSmartQuery + 1 index)
- Utils: 3 (middleware, validation, index)
- Generators: 1 (Smart Code Generator)
- CLI Tools: 1 (Interactive generator)

## 🎨 UI Components

### Buttons

- **ActionButton.tsx** - Versatile action button with loading states, variants, and security features
  ```tsx
  <ActionButton variant="primary" loading={isLoading} icon="save">
    Save Changes
  </ActionButton>
  ```

### Forms

- **SmartForm.tsx** - Auto-generating form with Zod validation and multiple layouts
  ```tsx
  <SmartForm
    schema={userSchema}
    onSubmit={handleSubmit}
    layout="grid"
    columns={2}
  />
  ```

### Tables

- **DataTable.tsx** - Advanced data table with sorting, filtering, and pagination
  ```tsx
  <DataTable data={users} columns={userColumns} />
  ```

## 🪝 Advanced Hooks

### Data Management

- **useApi.ts** - Basic API interaction hook
- **useSmartQuery.ts** - Advanced data fetching with caching, retry logic, and optimistic updates
  ```tsx
  const { data, loading, error, refetch, mutate } = useSmartQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  ```

## 🔧 Utilities

### API

- **middleware.ts** - API middleware for security and validation

### Validation

- **common.ts** - Common validation schemas and utilities

## 🤖 Smart Code Generator

### Features

- **Component Generation**: Creates React components with TypeScript, tests, and Storybook stories
- **API Route Generation**: Generates secure API routes with authentication, validation, and audit logging
- **Model Generation**: Creates Prisma models with services and TypeScript types
- **Security Integration**: Built-in security patterns and best practices

### CLI Usage

```bash
# Interactive component generation
npm run smart:component MyButton --interactive

# API route with authentication
npm run smart:api users --methods=GET,POST,PUT --interactive

# Prisma model with service
npm run smart:model Product --interactive

# Show library overview
npm run smart:lib
```

### Advanced Features

- 🔐 **Security by Default**: CSRF protection, input validation, rate limiting
- 📝 **Auto Documentation**: JSDoc comments and usage examples
- 🧪 **Test Generation**: Jest tests and React Testing Library
- 📚 **Storybook Integration**: Component stories for documentation
- 🔄 **Caching System**: Smart query caching with invalidation
- 📊 **Performance Optimized**: Code splitting and lazy loading

## 📝 Templates

### Pages

- **PageTemplate.tsx** - Base page template with layout and SEO
  ```tsx
  <PageTemplate title="My Page" description="Page description">
    <YourContent />
  </PageTemplate>
  ```

## 🚀 Getting Started

### 1. Generate a UI Component

```bash
npm run smart:component MyComponent -- --type=ui --interactive
```

### 2. Generate an API Route

```bash
npm run smart:api products -- --methods=GET,POST --interactive
```

### 3. Generate a Prisma Model

```bash
npm run smart:model Order -- --interactive
```

### 4. Use Smart Hooks

```tsx
import { useSmartQuery } from '@/_library/hooks/data/useSmartQuery'

function MyComponent() {
  const { data, loading } = useSmartQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json())
  })

  if (loading) return <div>Loading...</div>
  return <div>{data?.map(item => ...)}</div>
}
```

## 🎯 Design Principles

1. **Security First**: All generated code includes security best practices
2. **TypeScript Native**: Full TypeScript support with strict typing
3. **Performance Optimized**: Built-in caching and optimization patterns
4. **Developer Experience**: Rich IntelliSense and documentation
5. **Consistency**: Standardized patterns across all generated code
6. **Scalability**: Designed for enterprise-level applications

## 📊 Integration Status

- ✅ **Next.js 15**: Full App Router support
- ✅ **Prisma ORM**: Database schema generation
- ✅ **Zod Validation**: Type-safe validation schemas
- ✅ **NextAuth.js**: Authentication integration
- ✅ **Tailwind CSS**: Styling system
- ✅ **React Hook Form**: Form management
- ✅ **Jest & RTL**: Testing framework
- ✅ **Storybook**: Component documentation

## 🔄 Recent Updates

### v1.0.0 (Current)

- 🎉 Initial Smart Code Generator release
- 🎨 Enhanced UI components with security features
- 🪝 Advanced data fetching hooks with caching
- 🔧 Interactive CLI with prompts
- 📝 Auto-generated documentation and tests

---

_Generated with Smart Code Generator - Enterprise-grade code generation for modern web applications_
