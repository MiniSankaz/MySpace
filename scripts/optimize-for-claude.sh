#!/bin/bash

# =========================================
# Optimize Project for Claude Code
# =========================================
# This script cleans up unnecessary files and generates
# useful information to help Claude Code work more efficiently

set -e

echo "🤖 Optimizing project for Claude Code..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Get project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"
cd "$PROJECT_ROOT"

# =========================================
# Step 1: Clean up unnecessary files
# =========================================
echo "📧 Step 1: Cleaning up unnecessary files..."

# Clean build artifacts
if [ -d ".next" ]; then
    rm -rf .next
    print_status "Removed .next directory"
fi

if [ -d "dist" ]; then
    rm -rf dist
    print_status "Removed dist directory"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    print_status "Cleared node_modules cache"
fi

# Clean log files
find . -name "*.log" -type f -delete 2>/dev/null || true
print_status "Removed log files"

# Clean test artifacts
if [ -d "coverage" ]; then
    rm -rf coverage
    print_status "Removed coverage directory"
fi

# Clean TypeScript build info
find . -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true
print_status "Removed TypeScript build info"

echo ""

# =========================================
# Step 2: Generate project structure tree
# =========================================
echo "🌳 Step 2: Generating project structure..."

STRUCTURE_FILE="docs/PROJECT_STRUCTURE.md"

cat > "$STRUCTURE_FILE" << 'EOF'
# Project Structure

Generated on: $(date)

## Directory Tree

```
EOF

# Generate tree (excluding node_modules and other large directories)
tree -I 'node_modules|.next|dist|coverage|.git|*.log|data/conversations' -L 3 >> "$STRUCTURE_FILE" 2>/dev/null || {
    print_warning "tree command not found, using find instead"
    find . -type d -not -path "./node_modules*" -not -path "./.next*" -not -path "./dist*" -not -path "./.git*" -not -path "./coverage*" | head -50 >> "$STRUCTURE_FILE"
}

echo '```' >> "$STRUCTURE_FILE"

print_status "Generated project structure at $STRUCTURE_FILE"
echo ""

# =========================================
# Step 3: Update CLAUDE.md with file stats
# =========================================
echo "📊 Step 3: Updating CLAUDE.md with statistics..."

# Count files by type
TS_COUNT=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
JS_COUNT=$(find src -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l | tr -d ' ')
CSS_COUNT=$(find src -name "*.css" -o -name "*.scss" 2>/dev/null | wc -l | tr -d ' ')
MD_COUNT=$(find . -name "*.md" -not -path "./node_modules*" 2>/dev/null | wc -l | tr -d ' ')

# Update or append statistics to CLAUDE.md
if grep -q "## Project Statistics" CLAUDE.md; then
    # Statistics section exists, update it
    sed -i.bak '/## Project Statistics/,/^##[^#]/d' CLAUDE.md
fi

# Append new statistics
cat >> CLAUDE.md << EOF

## Project Statistics

_Last updated: $(date)_

- TypeScript files: $TS_COUNT
- JavaScript files: $JS_COUNT
- CSS/SCSS files: $CSS_COUNT
- Documentation files: $MD_COUNT
- Total source files: $((TS_COUNT + JS_COUNT))

### Module Sizes
EOF

# Calculate module sizes
for module in src/modules/*/; do
    if [ -d "$module" ]; then
        module_name=$(basename "$module")
        file_count=$(find "$module" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
        echo "- $module_name: $file_count files" >> CLAUDE.md
    fi
done

print_status "Updated CLAUDE.md with project statistics"
echo ""

# =========================================
# Step 4: Generate quick reference
# =========================================
echo "📚 Step 4: Generating quick reference..."

QUICK_REF="docs/QUICK_REFERENCE.md"

cat > "$QUICK_REF" << 'EOF'
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
EOF

print_status "Generated quick reference at $QUICK_REF"
echo ""

# =========================================
# Step 5: Check for issues
# =========================================
echo "🔍 Step 5: Checking for potential issues..."

# Check for large files
print_info "Checking for large files (>1MB)..."
large_files=$(find src -type f -size +1M 2>/dev/null)
if [ -n "$large_files" ]; then
    print_warning "Found large files:"
    echo "$large_files"
else
    print_status "No large files found"
fi

# Check for circular dependencies (if madge is installed)
if command -v npx &> /dev/null && npx madge --version &> /dev/null; then
    print_info "Checking for circular dependencies..."
    circular=$(npx madge --circular src/ 2>/dev/null || true)
    if [ -n "$circular" ] && [ "$circular" != "✔ No circular dependency found!" ]; then
        print_warning "Circular dependencies found:"
        echo "$circular"
    else
        print_status "No circular dependencies found"
    fi
else
    print_info "Install madge to check for circular dependencies: npm install -g madge"
fi

echo ""

# =========================================
# Step 6: Final summary
# =========================================
echo "========================================="
echo -e "${GREEN}✨ Optimization Complete!${NC}"
echo "========================================="
echo ""
echo "Files created/updated:"
echo "  - .claudeignore (if not exists)"
echo "  - docs/PROJECT_STRUCTURE.md"
echo "  - docs/QUICK_REFERENCE.md"
echo "  - CLAUDE.md (statistics added)"
echo ""
echo "Next steps:"
echo "  1. Restart your Claude Code session to apply .claudeignore"
echo "  2. Review docs/QUICK_REFERENCE.md for common tasks"
echo "  3. Check CLAUDE.md for updated project statistics"
echo ""
print_info "Run this script periodically to keep the project optimized"