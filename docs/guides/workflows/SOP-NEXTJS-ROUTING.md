# SOP: Next.js App Router Development Guidelines

> Standard Operating Procedure สำหรับการพัฒนา Next.js App Router

## 📋 Table of Contents

1. [Route Structure Guidelines](#route-structure-guidelines)
2. [Naming Conventions](#naming-conventions)
3. [Route Groups Best Practices](#route-groups-best-practices)
4. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
5. [Pre-Development Checklist](#pre-development-checklist)
6. [Code Review Checklist](#code-review-checklist)

---

## 1. Route Structure Guidelines

### ✅ Recommended Structure

```
src/app/
├── (auth)/                  # Route group สำหรับ authentication
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── layout.tsx          # Shared auth layout
│
├── (public)/               # Route group สำหรับ public pages
│   ├── blog/
│   ├── about/
│   ├── contact/
│   └── layout.tsx         # Public layout with header/footer
│
├── admin/                  # Admin section (protected)
│   ├── layout.tsx         # Admin layout with sidebar
│   ├── page.tsx           # Admin dashboard
│   └── [...features]/     # Admin features
│
├── api/                    # API routes
│   └── [...endpoints]/
│
├── layout.tsx              # Root layout
└── page.tsx                # Homepage
```

### ❌ Anti-Patterns to Avoid

```
// ❌ ห้ามทำแบบนี้
src/app/
├── (admin)/admin/          # ซ้ำซ้อน!
├── (auth)/auth/            # ซ้ำซ้อน!
├── admin/                  # Duplicate routes!
└── (dashboard)/dashboard/  # ซ้ำซ้อน!
```

---

## 2. Naming Conventions

### 📁 Folder Names

- ใช้ **kebab-case** สำหรับ folder names
- ใช้ **singular** สำหรับ dynamic routes: `[id]`, `[slug]`
- ใช้ **descriptive names**: `user-profile` ดีกว่า `profile`

### 📄 File Names

```typescript
// ✅ Correct
page.tsx; // Page component
layout.tsx; // Layout component
loading.tsx; // Loading UI
error.tsx; // Error UI
not - found.tsx; // 404 page
route.ts; // API route

// ❌ Wrong
Page.tsx; // ต้องเป็น lowercase
index.tsx; // ใช้ page.tsx แทน
api.ts; // ใช้ route.ts แทน
```

### 🏷️ Route Groups

```typescript
// ✅ Good Examples
auth(
  // Authentication pages
  public,
)(
  // Public pages
  marketing,
)(
  // Marketing pages
  dashboard,
)(
  // Dashboard pages

  // ❌ Bad Examples
  admin,
) /
  admin(
    // ซ้ำซ้อน
    user,
  ) /
  users(
    // ซ้ำซ้อน
    main,
  ); // ไม่ชัดเจน
```

---

## 3. Route Groups Best Practices

### When to Use Route Groups

1. **Shared Layouts**: เมื่อต้องการ layout ที่แตกต่างกัน
2. **Organization**: จัดกลุ่ม routes ที่เกี่ยวข้องกัน
3. **No URL Impact**: Route groups ไม่ส่งผลต่อ URL structure

### Example Implementation

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  )
}

// src/app/(public)/layout.tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
```

---

## 4. Common Mistakes to Avoid

### 🚫 Mistake 1: Duplicate Routes

```typescript
// ❌ Wrong
app/
├── (admin)/admin/posts/    // URL: /admin/posts
└── admin/posts/            // URL: /admin/posts (CONFLICT!)

// ✅ Correct
app/
└── admin/posts/            // URL: /admin/posts
```

### 🚫 Mistake 2: Nested Route Groups

```typescript
// ❌ Wrong
app/(admin)/(dashboard)/admin/dashboard/

// ✅ Correct
app/admin/dashboard/
// หรือ
app/(admin)/dashboard/
```

### 🚫 Mistake 3: Inconsistent Structure

```typescript
// ❌ Wrong - Mixed patterns
app/
├── admin/users/           // Direct folder
├── (admin)/products/      // Route group
└── dashboard/analytics/   // Different section?

// ✅ Correct - Consistent
app/
├── admin/
│   ├── users/
│   ├── products/
│   └── analytics/
```

### 🚫 Mistake 4: Wrong Dynamic Route Usage

```typescript
// ❌ Wrong
app/posts/[...slug]/page.tsx    // Catch-all when not needed
app/users/[userId]/[postId]/    // Over-nesting

// ✅ Correct
app/posts/[slug]/page.tsx       // Single dynamic segment
app/users/[id]/posts/[postId]/  // Clear hierarchy
```

---

## 5. Pre-Development Checklist

### Before Creating New Routes:

- [ ] **Check Existing Routes**: ดู route structure ที่มีอยู่ก่อน
- [ ] **Plan URL Structure**: วางแผน URL ที่ user จะเห็น
- [ ] **Determine Layout Needs**: ต้องการ layout แบบไหน
- [ ] **Consider Route Groups**: จำเป็นต้องใช้ route groups หรือไม่
- [ ] **API Routes**: วางแผน API endpoints ที่จำเป็น

### Route Planning Template:

```markdown
## New Feature: [Feature Name]

### Routes Needed:

- [ ] /feature-url (public/admin?)
- [ ] /api/feature (CRUD operations)

### Layout Requirements:

- [ ] Uses default layout
- [ ] Needs custom layout
- [ ] Route group needed? Why?

### Dynamic Routes:

- [ ] [id] - single item
- [ ] [slug] - SEO friendly URL
- [ ] [...path] - catch-all (justify why)
```

---

## 6. Code Review Checklist

### Route Structure Review:

#### ✅ Structure Check

- [ ] ไม่มี duplicate routes
- [ ] Route groups ใช้อย่างเหมาะสม
- [ ] ไม่มี nested route groups ที่ไม่จำเป็น
- [ ] Naming conventions ถูกต้อง

#### ✅ File Organization

- [ ] page.tsx อยู่ในทุก route ที่ต้องการ
- [ ] layout.tsx อยู่ในตำแหน่งที่เหมาะสม
- [ ] loading.tsx/error.tsx ตามความจำเป็น
- [ ] API routes ใช้ route.ts

#### ✅ Performance Check

- [ ] ไม่มี layout ที่ซ้ำซ้อน
- [ ] Component imports เหมาะสม
- [ ] Metadata exports ถูกต้อง

### Example Review Comments:

```typescript
// 🔴 Issue: Duplicate route detected
// File: app/(admin)/admin/users/page.tsx
// Conflict with: app/admin/users/page.tsx
// Action: Remove route group or consolidate

// 🟡 Warning: Nested route groups
// File: app/(dashboard)/(admin)/stats/page.tsx
// Suggestion: Simplify to app/admin/stats/page.tsx

// 🟢 Good: Clear route structure
// File: app/admin/users/[id]/edit/page.tsx
// URL: /admin/users/123/edit
```

---

## 7. Testing Routes

### Manual Testing Checklist:

```bash
# Test route accessibility
- [ ] /:                    Homepage loads
- [ ] /admin:               Admin dashboard (protected)
- [ ] /login:               Auth pages accessible
- [ ] /api/health:          API routes working
- [ ] /non-existent:        404 page shows

# Test dynamic routes
- [ ] /blog/[slug]          Dynamic content loads
- [ ] /users/[id]           User profiles work
- [ ] /api/posts/[id]       API dynamic routes
```

### Automated Testing:

```typescript
// __tests__/routes.test.ts
describe("Route Structure", () => {
  it("should not have duplicate routes", () => {
    const routes = getAllRoutes("./src/app");
    const duplicates = findDuplicates(routes);
    expect(duplicates).toHaveLength(0);
  });
});
```

---

## 8. Migration Guide

### When Restructuring Existing Routes:

1. **Document Current Structure**

   ```bash
   tree src/app -d > current-structure.txt
   ```

2. **Plan New Structure**
   - Create migration map
   - Identify redirects needed
   - Update imports

3. **Execute Migration**

   ```bash
   # Create backup
   cp -r src/app src/app.backup

   # Move routes systematically
   # Update imports
   # Test thoroughly
   ```

4. **Setup Redirects**
   ```typescript
   // next.config.js
   module.exports = {
     async redirects() {
       return [
         {
           source: "/old-path",
           destination: "/new-path",
           permanent: true,
         },
       ];
     },
   };
   ```

---

## 9. Quick Reference

### Do's ✅

- Use route groups for organization
- Keep consistent naming conventions
- Plan URL structure before coding
- Document special routing decisions
- Test all routes after changes

### Don'ts ❌

- Don't create duplicate routes
- Don't nest route groups unnecessarily
- Don't mix naming conventions
- Don't use catch-all routes without reason
- Don't forget to update imports after moving

---

## 10. Troubleshooting

### Common Errors and Solutions:

#### Error: "You cannot have two parallel pages that resolve to the same path"

**Cause**: Duplicate routes exist
**Solution**:

1. Run `find src/app -name "page.tsx" | sort`
2. Identify duplicates
3. Remove or consolidate

#### Error: "Module not found"

**Cause**: Imports not updated after restructuring
**Solution**:

1. Update all import paths
2. Use find & replace with regex
3. Check tsconfig.json paths

#### Error: "404 Not Found" in production

**Cause**: Route groups affecting URL
**Solution**:

1. Remember (folder) doesn't appear in URL
2. Check actual URL structure
3. Update links accordingly

---

## Document Version

- Version: 1.0
- Last Updated: 2024-08-02
- Author: Development Team
- Review Cycle: Monthly

## Related Documents

- [Next.js Official Routing Docs](https://nextjs.org/docs/app/building-your-application/routing)
- [Project Architecture Guide](./ARCHITECTURE.md)
- [Code Review Standards](./CODE-REVIEW.md)
