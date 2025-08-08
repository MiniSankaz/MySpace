# Quick Reference for Claude Code

## Most Used Files

### Configuration
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `prisma/schema.prisma` - Database schema

### Entry Points
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page
- `server.js` - Express server for production

### Key Services
- `src/services/claude-direct.service.ts` - Main Claude AI service
- `src/core/auth/auth.ts` - Authentication logic
- `src/core/database/prisma.ts` - Database connection

### Main Components
- `src/modules/personal-assistant/components/ChatInterfaceWithFolders.tsx` - AI Chat UI
- `src/modules/ums/components/LoginForm.tsx` - Login component
- `src/modules/page-builder/components/PageBuilder.tsx` - Page builder

## Quick Commands

```bash
# Start development
npm run dev

# Quick restart
./quick-restart.sh

# Run this optimization script
./scripts/optimize-for-claude.sh

# Generate a new module
npm run generate:module [name]

# Reset database
npm run db:reset

# Check types
npm run typecheck

# Fix linting
npm run lint -- --fix
```

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `ANTHROPIC_API_KEY` - Claude API key (if using AI features)

## Common Tasks

### Add a new API route
1. Create file in `src/app/api/[route]/route.ts`
2. Export async functions: GET, POST, PUT, DELETE
3. Use `NextRequest` and `NextResponse`

### Add a new page
1. Create folder in `src/app/[page]/`
2. Add `page.tsx` file
3. Export default component

### Add a new module
1. Run `npm run generate:module [name]`
2. Module created in `src/modules/[name]/`
3. Update exports in `src/modules/index.ts`

### Fix common issues
- **Build error**: `rm -rf .next && npm run build`
- **Type error**: `npx prisma generate && npm run typecheck`
- **Database error**: `npx prisma migrate reset --force`
