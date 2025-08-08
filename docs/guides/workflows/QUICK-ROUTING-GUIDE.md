# 🚀 Next.js Routing Quick Reference

## 🎯 Golden Rules

### 1. **One Route = One Path**

```
❌ app/(admin)/admin/users  ➜ /admin/users
❌ app/admin/users         ➜ /admin/users  (CONFLICT!)

✅ app/admin/users         ➜ /admin/users
```

### 2. **Route Groups Don't Affect URLs**

```
app/(auth)/login     ➜ /login     (NOT /auth/login)
app/(public)/about   ➜ /about     (NOT /public/about)
```

### 3. **Keep It Simple**

```
❌ app/(admin)/(dashboard)/(protected)/stats
✅ app/admin/stats
```

## 📁 Standard Structure

```
app/
├── (auth)/          # No layout inheritance
│   ├── login/
│   └── register/
├── (public)/        # Public layout
│   ├── blog/
│   └── about/
├── admin/           # Admin layout
│   ├── users/
│   └── settings/
├── api/             # API routes
└── page.tsx         # Homepage
```

## ⚡ Quick Commands

### Check for Duplicate Routes

```bash
# Find all page.tsx files
find src/app -name "page.tsx" | sort

# Check route structure
tree src/app -d -I 'node_modules'

# Find specific route
find src/app -path "*/admin/*" -name "page.tsx"
```

### Fix Common Issues

```bash
# Remove nested route group
mv app/(admin)/admin/* app/admin/
rmdir app/(admin)/admin app/(admin)

# Rename route group
mv app/(dashboard) app/(admin)
```

## 🔍 Debugging Checklist

When "Route Not Found":

- [ ] Check if using route group (parentheses)
- [ ] Verify file is named `page.tsx`
- [ ] Ensure no duplicate routes
- [ ] Check file location matches URL

When "Conflict Error":

- [ ] Run duplicate route check
- [ ] Look for parallel routes
- [ ] Check route groups overlap
- [ ] Verify no same paths

## 📝 Common Patterns

### Dynamic Routes

```typescript
[id]          ➜ /users/123         (single)
[...slug]     ➜ /docs/a/b/c        (catch-all)
[[...slug]]   ➜ /shop or /shop/a/b (optional)
```

### API Routes

```typescript
app/api/users/route.ts         ➜ GET /api/users
app/api/users/[id]/route.ts    ➜ GET /api/users/123
```

### Protected Routes

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Check auth
  }
}
```

## 🚨 Red Flags

Watch out for:

- 📁 `(admin)/admin/`
- 📁 `(auth)/auth/`
- 📁 Multiple route groups: `(a)/(b)/(c)/`
- 📁 Duplicate paths in different locations
- 📁 Using `index.tsx` instead of `page.tsx`

## 💡 Pro Tips

1. **Plan URLs First**: Write down all URLs before creating files
2. **Use Route Groups Sparingly**: Only when layouts differ
3. **Consistent Naming**: Pick a convention and stick to it
4. **Document Special Cases**: Add README in complex routes
5. **Test After Moving**: Routes break when files move

---

**Remember**: When in doubt, keep it flat and simple! 🎯
