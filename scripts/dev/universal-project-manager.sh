#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Universal Project Manager
# สำหรับจัดการ Project แบบ Universal Standard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Current directory (source)
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show header
show_header() {
    clear
    print_color "$CYAN" "╔══════════════════════════════════════════════════════════╗"
    print_color "$CYAN" "║          Universal Project Manager v2.0                  ║"
    print_color "$CYAN" "║          Project Standard Setup & Management             ║"
    print_color "$CYAN" "╚══════════════════════════════════════════════════════════╝"
    echo
}

# Function to show menu
show_menu() {
    print_color "$YELLOW" "🚀 เลือกการดำเนินการ:"
    echo
    print_color "$GREEN" "  1) 🆕 New Project     - สร้างโปรเจคใหม่ตามมาตรฐาน"
    print_color "$GREEN" "  2) 🔄 Update SOP      - อัพเดท SOP และ Reusable Files"
    print_color "$GREEN" "  3) 🔧 Refactor Path   - Refactor โครงสร้างในโฟลเดอร์ที่ระบุ"
    print_color "$GREEN" "  4) 📦 Export Template - Export template files สำหรับ reuse"
    print_color "$GREEN" "  5) 🎯 Quick Setup     - Setup แบบรวดเร็ว (ใช้ค่า default)"
    print_color "$GREEN" "  6) 📋 List Projects   - แสดงรายการ projects ที่มี"
    print_color "$RED" "  0) ❌ Exit"
    echo
}

# Function to create new project
create_new_project() {
    print_color "$CYAN" "\n📁 สร้างโปรเจคใหม่"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get project path
    read -p "📍 ระบุ path สำหรับโปรเจคใหม่ (default: ../new-project): " PROJECT_PATH
    PROJECT_PATH=${PROJECT_PATH:-"../new-project"}
    
    # Get project name
    read -p "📝 ชื่อโปรเจค (default: my-universal-app): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-"my-universal-app"}
    
    # Get project type
    print_color "$YELLOW" "\nเลือกประเภทโปรเจค:"
    echo "  1) Next.js + TypeScript (Full Stack)"
    echo "  2) Next.js + TypeScript (Frontend Only)"
    echo "  3) Node.js + Express (API Only)"
    echo "  4) Monorepo (Multiple Apps)"
    read -p "เลือก (1-4) [default: 1]: " PROJECT_TYPE
    PROJECT_TYPE=${PROJECT_TYPE:-1}
    
    # Create absolute path
    FULL_PATH="$(cd "$(dirname "$SOURCE_DIR")" && pwd)/$PROJECT_PATH"
    
    print_color "$YELLOW" "\n🚀 กำลังสร้างโปรเจคที่: $FULL_PATH"
    
    # Create project directory
    mkdir -p "$FULL_PATH"
    
    # Initialize project based on type
    case $PROJECT_TYPE in
        1)
            print_color "$GREEN" "📦 สร้าง Next.js Full Stack Project..."
            create_nextjs_fullstack "$FULL_PATH" "$PROJECT_NAME"
            ;;
        2)
            print_color "$GREEN" "📦 สร้าง Next.js Frontend Project..."
            create_nextjs_frontend "$FULL_PATH" "$PROJECT_NAME"
            ;;
        3)
            print_color "$GREEN" "📦 สร้าง Node.js API Project..."
            create_nodejs_api "$FULL_PATH" "$PROJECT_NAME"
            ;;
        4)
            print_color "$GREEN" "📦 สร้าง Monorepo Project..."
            create_monorepo "$FULL_PATH" "$PROJECT_NAME"
            ;;
    esac
    
    # Copy reusable files
    copy_reusable_files "$FULL_PATH"
    
    print_color "$GREEN" "\n✅ สร้างโปรเจคสำเร็จ!"
    print_color "$CYAN" "📂 Location: $FULL_PATH"
    print_color "$YELLOW" "\n🎯 ขั้นตอนต่อไป:"
    print_color "$WHITE" "   cd $FULL_PATH"
    print_color "$WHITE" "   npm install"
    print_color "$WHITE" "   npm run dev"
}

# Function to create Next.js fullstack project
create_nextjs_fullstack() {
    local PROJECT_PATH=$1
    local PROJECT_NAME=$2
    
    cd "$PROJECT_PATH"
    
    # Create package.json
    cat > package.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p \${PORT:-3000}",
    "build": "next build",
    "start": "next start -p \${PORT:-3000}",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "prepare": "husky install"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.50.0",
    "eslint-config-next": "14.1.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.0",
    "prisma": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
EOF

    # Create Next.js config
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
EOF

    # Create TypeScript config
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    # Create directory structure
    mkdir -p src/{app,components,lib,hooks,utils,types,styles}
    mkdir -p src/app/{api,\(auth\),\(public\),admin}
    mkdir -p prisma
    mkdir -p public
    mkdir -p docs/{architecture,guides,api}
    mkdir -p scripts/{setup,testing,database,utils}
    mkdir -p tests/{unit,integration,e2e}
    
    # Create basic files
    cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Universal App',
  description: 'Built with Universal Standards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

    cat > src/app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Universal App</h1>
      <p className="mt-4 text-lg text-gray-600">
        Built with Universal Project Standards
      </p>
    </main>
  )
}
EOF

    cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

    # Create Tailwind config
    cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
EOF

    # Create PostCSS config
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

    # Create Prisma schema
    cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
EOF

    # Create .env.example
    cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:$PORT_FRONTEND_MAIN"
NEXTAUTH_SECRET="your-secret-here"

# Application
NODE_ENV="development"
PORT=$PORT_FRONTEND_MAIN
EOF

    # Create .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
EOF

    # Create README
    cat > README.md << EOF
# $PROJECT_NAME

Universal Project built with Next.js, TypeScript, and Prisma.

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Run development server
npm run dev
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── app/           # Next.js App Router
├── components/    # Reusable components
├── lib/          # Library code
├── hooks/        # Custom React hooks
├── utils/        # Utility functions
├── types/        # TypeScript types
└── styles/       # Global styles

docs/
├── architecture/ # System architecture
├── guides/       # Development guides
└── api/         # API documentation

scripts/
├── setup/       # Setup scripts
├── testing/     # Test scripts
├── database/    # Database scripts
└── utils/       # Utility scripts
\`\`\`

## 🛠️ Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint
- \`npm run test\` - Run tests
- \`npm run db:studio\` - Open Prisma Studio

## 📚 Documentation

See the [docs](./docs) directory for detailed documentation.
EOF
}

# Function to create Next.js frontend only
create_nextjs_frontend() {
    local PROJECT_PATH=$1
    local PROJECT_NAME=$2
    
    # Similar to fullstack but without Prisma and API routes
    create_nextjs_fullstack "$PROJECT_PATH" "$PROJECT_NAME"
    
    # Remove Prisma related
    rm -rf "$PROJECT_PATH/prisma"
    rm -rf "$PROJECT_PATH/src/app/api"
    
    # Update package.json to remove Prisma scripts
    cd "$PROJECT_PATH"
    node -e "
    const pkg = require('./package.json');
    delete pkg.scripts['db:push'];
    delete pkg.scripts['db:generate'];
    delete pkg.scripts['db:studio'];
    delete pkg.scripts['db:seed'];
    delete pkg.dependencies['@prisma/client'];
    delete pkg.devDependencies['prisma'];
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
    "
}

# Function to create Node.js API
create_nodejs_api() {
    local PROJECT_PATH=$1
    local PROJECT_NAME=$2
    
    cd "$PROJECT_PATH"
    
    # Create package.json for API
    cat > package.json << EOF
{
  "name": "$PROJECT_NAME-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{js,ts,json,md}\""
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0",
    "zod": "^3.22.0",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/cors": "^2.8.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "eslint": "^8.50.0",
    "prettier": "^3.2.0",
    "jest": "^29.7.0",
    "prisma": "^5.0.0"
  }
}
EOF

    # Create directory structure
    mkdir -p src/{routes,services,middlewares,utils,types}
    mkdir -p tests
    mkdir -p docs
    
    # Create basic Express server
    cat > src/index.ts << 'EOF'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
EOF
}

# Function to create monorepo
create_monorepo() {
    local PROJECT_PATH=$1
    local PROJECT_NAME=$2
    
    cd "$PROJECT_PATH"
    
    # Create monorepo package.json
    cat > package.json << EOF
{
  "name": "$PROJECT_NAME-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\""
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "prettier": "^3.2.0"
  }
}
EOF

    # Create turbo.json
    cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
EOF

    # Create workspace directories
    mkdir -p apps/{web,api}
    mkdir -p packages/{ui,utils,types}
    
    print_color "$YELLOW" "📦 Creating web app..."
    create_nextjs_frontend "$PROJECT_PATH/apps/web" "$PROJECT_NAME-web"
    
    print_color "$YELLOW" "📦 Creating API app..."
    create_nodejs_api "$PROJECT_PATH/apps/api" "$PROJECT_NAME-api"
}

# Function to copy reusable files
copy_reusable_files() {
    local TARGET_PATH=$1
    
    print_color "$CYAN" "\n📋 กำลัง copy reusable files..."
    
    # Create directories if not exist
    mkdir -p "$TARGET_PATH/scripts"
    mkdir -p "$TARGET_PATH/docs/sop"
    mkdir -p "$TARGET_PATH/.github/workflows"
    mkdir -p "$TARGET_PATH/.vscode"
    
    # Copy SOP and workflow files
    if [ -d "$SOURCE_DIR/scripts" ]; then
        # Copy useful scripts
        for script in \
            "git-workflow.sh" \
            "setup.sh" \
            "test.sh" \
            "backup.sh" \
            "deploy.sh"
        do
            if [ -f "$SOURCE_DIR/scripts/$script" ]; then
                cp "$SOURCE_DIR/scripts/$script" "$TARGET_PATH/scripts/" 2>/dev/null || true
            fi
        done
    fi
    
    # Copy documentation
    if [ -d "$SOURCE_DIR/docs" ]; then
        # Copy SOP files
        for doc in \
            "git-workflow-sop.md" \
            "developer-guide.md" \
            "deployment-guide.md" \
            "testing-guide.md"
        do
            if [ -f "$SOURCE_DIR/docs/$doc" ]; then
                cp "$SOURCE_DIR/docs/$doc" "$TARGET_PATH/docs/sop/" 2>/dev/null || true
            fi
        done
    fi
    
    # Copy GitHub workflows
    if [ -d "$SOURCE_DIR/.github/workflows" ]; then
        cp "$SOURCE_DIR/.github/workflows/"*.yml "$TARGET_PATH/.github/workflows/" 2>/dev/null || true
    fi
    
    # Copy VS Code settings
    if [ -d "$SOURCE_DIR/.vscode" ]; then
        cp "$SOURCE_DIR/.vscode/"*.json "$TARGET_PATH/.vscode/" 2>/dev/null || true
    fi
    
    # Create CLAUDE.md for AI assistance
    cat > "$TARGET_PATH/CLAUDE.md" << 'EOF'
# CLAUDE.md - AI Assistant Guidelines

## Project Standards

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Implement proper error handling

### Git Workflow
- Feature branches from `develop`
- Conventional commits (feat:, fix:, docs:, etc.)
- PR reviews required before merge
- Squash merge to main

### Testing
- Unit tests for utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

### Documentation
- JSDoc comments for functions
- README for each module
- API documentation with examples
- Architecture decision records (ADR)

## Project-Specific Rules

1. Always use absolute imports (@/)
2. Keep components under 200 lines
3. Extract business logic to services
4. Use environment variables for config
5. Implement proper logging

## Common Commands

```bash
npm run dev        # Start development
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Check code style
npm run format     # Format code
```
EOF

    print_color "$GREEN" "✅ Reusable files copied successfully"
}

# Function to update SOP files
update_sop_files() {
    print_color "$CYAN" "\n🔄 อัพเดท SOP และ Reusable Files"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "📍 ระบุ path ของโปรเจคที่ต้องการอัพเดท: " TARGET_PATH
    
    if [ ! -d "$TARGET_PATH" ]; then
        print_color "$RED" "❌ ไม่พบโฟลเดอร์: $TARGET_PATH"
        return 1
    fi
    
    # Backup existing files
    print_color "$YELLOW" "📦 สำรองข้อมูลเดิม..."
    BACKUP_DIR="$TARGET_PATH/.backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$TARGET_PATH/scripts" ]; then
        cp -r "$TARGET_PATH/scripts" "$BACKUP_DIR/"
    fi
    if [ -d "$TARGET_PATH/docs/sop" ]; then
        cp -r "$TARGET_PATH/docs/sop" "$BACKUP_DIR/"
    fi
    
    # Copy updated files
    copy_reusable_files "$TARGET_PATH"
    
    print_color "$GREEN" "✅ อัพเดท SOP files สำเร็จ!"
    print_color "$YELLOW" "📁 Backup saved at: $BACKUP_DIR"
}

# Function to refactor project structure
refactor_project_structure() {
    print_color "$CYAN" "\n🔧 Refactor โครงสร้างโปรเจค"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "📍 ระบุ path ของโปรเจคที่ต้องการ refactor: " TARGET_PATH
    
    if [ ! -d "$TARGET_PATH" ]; then
        print_color "$RED" "❌ ไม่พบโฟลเดอร์: $TARGET_PATH"
        return 1
    fi
    
    cd "$TARGET_PATH"
    
    print_color "$YELLOW" "🔍 วิเคราะห์โครงสร้างปัจจุบัน..."
    
    # Detect project type
    if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
        PROJECT_TYPE="nextjs"
    elif [ -f "package.json" ] && grep -q "express" package.json; then
        PROJECT_TYPE="express"
    else
        PROJECT_TYPE="unknown"
    fi
    
    print_color "$CYAN" "📊 Project Type: $PROJECT_TYPE"
    
    # Create standard directories
    print_color "$YELLOW" "📁 สร้างโครงสร้างมาตรฐาน..."
    
    mkdir -p docs/{architecture,guides,api,sop}
    mkdir -p scripts/{setup,testing,database,utils}
    mkdir -p tests/{unit,integration,e2e}
    
    if [ "$PROJECT_TYPE" = "nextjs" ]; then
        # Next.js specific structure
        mkdir -p src/{components,lib,hooks,utils,types,styles}
        mkdir -p src/components/{common,layout,features}
        mkdir -p src/lib/{api,db,auth}
        
        # Move files if they exist in wrong places
        if [ -d "components" ] && [ ! -d "src/components" ]; then
            print_color "$YELLOW" "📦 ย้าย components -> src/components"
            mv components/* src/components/ 2>/dev/null || true
            rmdir components 2>/dev/null || true
        fi
        
        if [ -d "lib" ] && [ ! -d "src/lib" ]; then
            print_color "$YELLOW" "📦 ย้าย lib -> src/lib"
            mv lib/* src/lib/ 2>/dev/null || true
            rmdir lib 2>/dev/null || true
        fi
    fi
    
    # Add standard config files if missing
    if [ ! -f ".prettierrc" ]; then
        cat > .prettierrc << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
EOF
        print_color "$GREEN" "✅ เพิ่ม .prettierrc"
    fi
    
    if [ ! -f ".eslintrc.json" ] && [ "$PROJECT_TYPE" = "nextjs" ]; then
        cat > .eslintrc.json << 'EOF'
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "react/no-unescaped-entities": "off"
  }
}
EOF
        print_color "$GREEN" "✅ เพิ่ม .eslintrc.json"
    fi
    
    print_color "$GREEN" "\n✅ Refactor โครงสร้างสำเร็จ!"
}

# Function to export template
export_template() {
    print_color "$CYAN" "\n📦 Export Template Files"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "📍 ระบุ path สำหรับ export (default: ../universal-template): " EXPORT_PATH
    EXPORT_PATH=${EXPORT_PATH:-"../universal-template"}
    
    FULL_EXPORT_PATH="$(cd "$(dirname "$SOURCE_DIR")" && pwd)/$EXPORT_PATH"
    
    print_color "$YELLOW" "📂 กำลัง export ไปที่: $FULL_EXPORT_PATH"
    
    mkdir -p "$FULL_EXPORT_PATH"
    
    # Export essential files
    mkdir -p "$FULL_EXPORT_PATH"/{scripts,docs,templates}
    
    # Copy scripts
    if [ -d "$SOURCE_DIR/scripts" ]; then
        cp -r "$SOURCE_DIR/scripts/"*.sh "$FULL_EXPORT_PATH/scripts/" 2>/dev/null || true
    fi
    
    # Copy docs
    if [ -d "$SOURCE_DIR/docs" ]; then
        cp -r "$SOURCE_DIR/docs/"*.md "$FULL_EXPORT_PATH/docs/" 2>/dev/null || true
    fi
    
    # Create template files
    create_template_files "$FULL_EXPORT_PATH/templates"
    
    # Create manifest
    cat > "$FULL_EXPORT_PATH/manifest.json" << EOF
{
  "name": "Universal Project Template",
  "version": "2.0.0",
  "created": "$(date -Iseconds)",
  "source": "$SOURCE_DIR",
  "includes": [
    "scripts",
    "docs",
    "templates"
  ]
}
EOF
    
    print_color "$GREEN" "✅ Export template สำเร็จ!"
    print_color "$CYAN" "📂 Location: $FULL_EXPORT_PATH"
}

# Function to create template files
create_template_files() {
    local TEMPLATE_DIR=$1
    
    mkdir -p "$TEMPLATE_DIR"
    
    # Docker template
    cat > "$TEMPLATE_DIR/Dockerfile.template" << 'EOF'
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
EOF

    # Docker Compose template
    cat > "$TEMPLATE_DIR/docker-compose.template.yml" << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
EOF

    # GitHub Actions template
    cat > "$TEMPLATE_DIR/github-actions.template.yml" << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linter
      run: npm run lint
    
    - name: Build
      run: npm run build
EOF
}

# Function for quick setup
quick_setup() {
    print_color "$CYAN" "\n⚡ Quick Setup - สร้างโปรเจคแบบรวดเร็ว"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Use default values
    PROJECT_PATH="../port"
    PROJECT_NAME="universal-port-app"
    
    FULL_PATH="$(cd "$(dirname "$SOURCE_DIR")" && pwd)/$PROJECT_PATH"
    
    print_color "$YELLOW" "🚀 กำลังสร้างโปรเจคที่: $FULL_PATH"
    print_color "$YELLOW" "📝 ชื่อโปรเจค: $PROJECT_NAME"
    print_color "$YELLOW" "📦 ประเภท: Next.js Full Stack"
    
    # Create project
    mkdir -p "$FULL_PATH"
    create_nextjs_fullstack "$FULL_PATH" "$PROJECT_NAME"
    copy_reusable_files "$FULL_PATH"
    
    print_color "$GREEN" "\n✅ Quick Setup สำเร็จ!"
    print_color "$CYAN" "📂 Location: $FULL_PATH"
    print_color "$YELLOW" "\n🎯 ขั้นตอนต่อไป:"
    print_color "$WHITE" "   cd $FULL_PATH"
    print_color "$WHITE" "   npm install"
    print_color "$WHITE" "   npm run dev"
}

# Function to list projects
list_projects() {
    print_color "$CYAN" "\n📋 รายการ Projects"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    PARENT_DIR="$(dirname "$SOURCE_DIR")"
    
    print_color "$YELLOW" "🔍 ค้นหา projects ใน: $PARENT_DIR"
    echo
    
    # Find directories with package.json
    find "$PARENT_DIR" -maxdepth 2 -name "package.json" -type f 2>/dev/null | while read -r pkg; do
        DIR=$(dirname "$pkg")
        NAME=$(basename "$DIR")
        
        # Get project info from package.json
        if command -v node > /dev/null; then
            PROJECT_NAME=$(node -e "console.log(require('$pkg').name || 'unnamed')" 2>/dev/null || echo "unnamed")
            VERSION=$(node -e "console.log(require('$pkg').version || '0.0.0')" 2>/dev/null || echo "0.0.0")
        else
            PROJECT_NAME=$NAME
            VERSION="unknown"
        fi
        
        print_color "$GREEN" "📁 $NAME"
        echo "   Name: $PROJECT_NAME"
        echo "   Version: $VERSION"
        echo "   Path: $DIR"
        echo
    done
}

# Main menu loop
main() {
    while true; do
        show_header
        show_menu
        
        read -p "เลือก [0-6]: " choice
        
        case $choice in
            1)
                create_new_project
                read -p "Press Enter to continue..."
                ;;
            2)
                update_sop_files
                read -p "Press Enter to continue..."
                ;;
            3)
                refactor_project_structure
                read -p "Press Enter to continue..."
                ;;
            4)
                export_template
                read -p "Press Enter to continue..."
                ;;
            5)
                quick_setup
                break
                ;;
            6)
                list_projects
                read -p "Press Enter to continue..."
                ;;
            0)
                print_color "$GREEN" "\n👋 ขอบคุณที่ใช้งาน Universal Project Manager!"
                exit 0
                ;;
            *)
                print_color "$RED" "\n❌ ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่"
                sleep 2
                ;;
        esac
    done
}

# Check if running with arguments
if [ $# -eq 0 ]; then
    main
else
    case "$1" in
        new)
            create_new_project
            ;;
        update)
            update_sop_files
            ;;
        refactor)
            refactor_project_structure
            ;;
        export)
            export_template
            ;;
        quick)
            quick_setup
            ;;
        list)
            list_projects
            ;;
        *)
            print_color "$RED" "❌ Unknown command: $1"
            print_color "$YELLOW" "Available commands: new, update, refactor, export, quick, list"
            exit 1
            ;;
    esac
fi