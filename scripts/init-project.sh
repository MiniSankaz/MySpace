#!/bin/bash

# ============================================================================
# Project Initialization Script - Enterprise Standards Setup
# Version: 2.0.0
# Author: Claude Code Standards Team
# Description: Initialize new projects with production-ready standards
# Supports: Monolith, Microservices, Various Tech Stacks
# ============================================================================

set -e  # Exit on error

# ============================================================================
# COLORS & FORMATTING
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"
CURRENT_DATE=$(date +%Y-%m-%d)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}  $1${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${PURPLE}▶️  $1${NC}"
}

# ============================================================================
# PROJECT TYPE SELECTION
# ============================================================================
select_project_type() {
    print_header "   🏗️  PROJECT TYPE SELECTION                                     "
    
    echo "Select project architecture:"
    echo ""
    echo "  1) 🏢 Monolith (Single Application)"
    echo "  2) 🔧 Microservices (Distributed Services)"
    echo "  3) 🎯 Hybrid (Monolith + Optional Services)"
    echo "  4) 📦 Library/Package"
    echo "  5) 🔌 API Only"
    echo ""
    
    read -p "Enter your choice (1-5): " project_type_choice
    
    case $project_type_choice in
        1) PROJECT_TYPE="monolith" ;;
        2) PROJECT_TYPE="microservices" ;;
        3) PROJECT_TYPE="hybrid" ;;
        4) PROJECT_TYPE="library" ;;
        5) PROJECT_TYPE="api" ;;
        *) 
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_success "Selected: $PROJECT_TYPE architecture"
}

# ============================================================================
# TECH STACK SELECTION
# ============================================================================
select_tech_stack() {
    print_header "   💻 TECHNOLOGY STACK SELECTION                                  "
    
    echo "Select primary technology stack:"
    echo ""
    echo "  1) ⚛️  Next.js + TypeScript (Full-stack React)"
    echo "  2) ⚡ Node.js + Express + TypeScript"
    echo "  3) 🦕 Deno + Fresh"
    echo "  4) 🐍 Python + FastAPI"
    echo "  5) 🦀 Rust + Actix/Axum"
    echo "  6) 🚀 Go + Gin/Fiber"
    echo "  7) ☕ Java + Spring Boot"
    echo "  8) 💎 Ruby on Rails"
    echo "  9) 🔷 .NET Core"
    echo "  10) 🎯 Custom (Define your own)"
    echo ""
    
    read -p "Enter your choice (1-10): " tech_choice
    
    case $tech_choice in
        1) 
            TECH_STACK="nextjs-typescript"
            LANGUAGE="typescript"
            FRAMEWORK="nextjs"
            ;;
        2) 
            TECH_STACK="node-express-typescript"
            LANGUAGE="typescript"
            FRAMEWORK="express"
            ;;
        3) 
            TECH_STACK="deno-fresh"
            LANGUAGE="typescript"
            FRAMEWORK="fresh"
            ;;
        4) 
            TECH_STACK="python-fastapi"
            LANGUAGE="python"
            FRAMEWORK="fastapi"
            ;;
        5) 
            TECH_STACK="rust-actix"
            LANGUAGE="rust"
            FRAMEWORK="actix"
            ;;
        6) 
            TECH_STACK="go-gin"
            LANGUAGE="go"
            FRAMEWORK="gin"
            ;;
        7) 
            TECH_STACK="java-spring"
            LANGUAGE="java"
            FRAMEWORK="spring"
            ;;
        8) 
            TECH_STACK="ruby-rails"
            LANGUAGE="ruby"
            FRAMEWORK="rails"
            ;;
        9) 
            TECH_STACK="dotnet-core"
            LANGUAGE="csharp"
            FRAMEWORK="aspnetcore"
            ;;
        10) 
            read -p "Enter language: " LANGUAGE
            read -p "Enter framework: " FRAMEWORK
            TECH_STACK="custom-${LANGUAGE}-${FRAMEWORK}"
            ;;
        *) 
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_success "Selected: $TECH_STACK"
}

# ============================================================================
# PROJECT DETAILS
# ============================================================================
get_project_details() {
    print_header "   📝 PROJECT DETAILS                                            "
    
    read -p "Project name: " PROJECT_NAME
    read -p "Project description: " PROJECT_DESCRIPTION
    read -p "Author/Team name: " AUTHOR_NAME
    read -p "Repository URL (optional): " REPO_URL
    read -p "Initialize git? (y/n): " INIT_GIT
    
    # Clean project name for directory
    PROJECT_DIR=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    
    print_success "Project details captured"
}

# ============================================================================
# FEATURES SELECTION
# ============================================================================
select_features() {
    print_header "   ✨ FEATURES SELECTION                                         "
    
    echo "Select features to include (space-separated numbers):"
    echo ""
    echo "  1) 🔐 Authentication & Authorization"
    echo "  2) 🗄️  Database Integration"
    echo "  3) 🔄 Real-time (WebSocket/SSE)"
    echo "  4) 📊 Monitoring & Logging"
    echo "  5) 🧪 Testing Framework"
    echo "  6) 📚 API Documentation"
    echo "  7) 🐳 Docker Configuration"
    echo "  8) ☸️  Kubernetes Manifests"
    echo "  9) 🔄 CI/CD Pipelines"
    echo "  10) 🤖 AI/Claude Integration"
    echo "  11) 📈 Analytics & Metrics"
    echo "  12) 💾 Caching Layer"
    echo "  13) 📧 Email Service"
    echo "  14) 💳 Payment Integration"
    echo "  15) 🌍 i18n (Internationalization)"
    echo ""
    
    read -p "Enter features (e.g., 1 2 5 7): " -a FEATURES
    
    print_success "Features selected: ${FEATURES[*]}"
}

# ============================================================================
# CREATE DIRECTORY STRUCTURE
# ============================================================================
create_directory_structure() {
    print_header "   📁 CREATING DIRECTORY STRUCTURE                               "
    
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # Core directories (always created)
    directories=(
        ".claude/agents"
        ".claude/templates"
        "docs/claude"
        "docs/technical-specs"
        "docs/sop"
        "scripts/dev"
        "scripts/devops"
        "scripts/database"
        "scripts/testing"
        "config/environments"
    )
    
    # Architecture-specific directories
    if [[ "$PROJECT_TYPE" == "monolith" ]]; then
        directories+=(
            "src/components"
            "src/services"
            "src/utils"
            "src/hooks"
            "src/types"
            "src/lib"
            "src/modules"
            "public"
            "tests/unit"
            "tests/integration"
            "tests/e2e"
        )
    elif [[ "$PROJECT_TYPE" == "microservices" ]]; then
        directories+=(
            "services/gateway"
            "services/auth"
            "shared/types"
            "shared/utils"
            "infrastructure/docker"
            "infrastructure/kubernetes"
            "infrastructure/terraform"
            "tests"
        )
    fi
    
    # Tech stack specific directories
    case $LANGUAGE in
        "typescript"|"javascript")
            directories+=(
                "src/middleware"
                "src/controllers"
                "src/models"
                "src/routes"
            )
            ;;
        "python")
            directories+=(
                "app/api"
                "app/core"
                "app/models"
                "app/schemas"
                "app/services"
            )
            ;;
        "go")
            directories+=(
                "cmd"
                "internal"
                "pkg"
                "api"
            )
            ;;
        "rust")
            directories+=(
                "src/handlers"
                "src/models"
                "src/db"
                "src/utils"
            )
            ;;
    esac
    
    # Create all directories
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        print_step "Created: $dir"
    done
    
    print_success "Directory structure created"
}

# ============================================================================
# CREATE CLAUDE.MD
# ============================================================================
create_claude_md() {
    print_header "   📄 CREATING CLAUDE.md                                         "
    
    cat > CLAUDE.md << 'EOF'
# CLAUDE.md - AI Assistant Guidelines

> **⚡ QUICK START**: This is the main index file. Detailed documentation is in `/docs/claude/` directory.
> **🚨 RATE LIMIT PREVENTION**: Follow guidelines in section below to avoid hitting Claude CLI limits.

## 🛡️ RATE LIMIT PREVENTION GUIDELINES

### ⚡ CRITICAL: Optimize Every Request

To prevent hitting Claude CLI rate limits, ALL agents MUST follow these guidelines:

### 1️⃣ CONTEXT MANAGEMENT
- **MAX_CONTEXT**: Read max 2000 lines per file
- **SELECTIVE_READING**: Use grep/search FIRST, then read specific sections
- **NO_FULL_SCAN**: Never read entire large files unless absolutely necessary
- **CACHE_CONTENTS**: Remember what you've read in current session

### 2️⃣ REQUEST OPTIMIZATION
- **BATCH_OPERATIONS**: Group related operations together
- **PLAN_FIRST**: Think and plan BEFORE acting
- **AVOID_REDUNDANCY**: Don't repeat operations you just did
- **SUMMARIZE_LONG**: Auto-summarize after 15+ messages

## 📋 Project Information

**Project**: PROJECT_NAME_PLACEHOLDER
**Description**: PROJECT_DESCRIPTION_PLACEHOLDER
**Architecture**: PROJECT_TYPE_PLACEHOLDER
**Stack**: TECH_STACK_PLACEHOLDER
**Author**: AUTHOR_NAME_PLACEHOLDER
**Created**: CURRENT_DATE_PLACEHOLDER

## 💼 Business Logic

### Core Business Rules
- [Define your business rules here]

### User Roles & Permissions
- [Define user roles]

### Key Business Processes
- [Document main processes]

## 🔄 Workflows & Use Cases

### Authentication Flow
- [Document auth flow]

### Main Feature Workflows
- [Document feature flows]

## ✅ Features

### Completed Features
- [ ] Initial setup

### In-Progress Features
- [ ] [Feature name]

### Planned Features
- [ ] [Feature name]

## 📁 File Structure

See `/docs/claude/05-file-structure.md` for detailed structure.

## 🔌 API Reference

See `/docs/claude/06-api-reference.md` for API documentation.

## 🎨 Components & UI

See `/docs/claude/07-components-ui.md` for component documentation.

## 📦 Import Guide

### Services
```typescript
import { ServiceName } from '@/services/service-name';
```

### Components
```typescript
import { ComponentName } from '@/components/component-name';
```

### Utilities
```typescript
import { utilName } from '@/utils/util-name';
```

## 📝 SOPs & Standards

### Git Workflow
1. Create feature branch from `develop`
2. Make changes following coding standards
3. Test thoroughly
4. Create PR with detailed description
5. Code review required before merge

### Coding Standards
- Use consistent naming conventions
- Write self-documenting code
- Add comments for complex logic
- Follow language-specific best practices

### Testing Requirements
- Minimum 80% code coverage
- Unit tests for all functions
- Integration tests for APIs
- E2E tests for critical paths

## 🔑 Credentials & Test Accounts

See `.env.example` for required environment variables.

### Test Accounts
- Admin: admin@test.com / TestAdmin123
- User: user@test.com / TestUser123

## 💻 Common Commands

### Development
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run test      # Run tests
npm run lint      # Run linter
```

### Database
```bash
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
npm run db:reset      # Reset database
```

## 🐛 Known Issues & Solutions

### Issue 1: [Issue name]
**Problem**: [Description]
**Solution**: [How to fix]

## 🤖 Agent Instructions

Agents should:
1. Always read this file first
2. Follow rate limit prevention guidelines
3. Update documentation when making changes
4. Use batch operations for efficiency
5. Plan before executing

---

*Last Updated: CURRENT_DATE_PLACEHOLDER | Version: 1.0.0*
EOF
    
    # Replace placeholders
    sed -i.bak "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" CLAUDE.md
    sed -i.bak "s/PROJECT_DESCRIPTION_PLACEHOLDER/$PROJECT_DESCRIPTION/g" CLAUDE.md
    sed -i.bak "s/PROJECT_TYPE_PLACEHOLDER/$PROJECT_TYPE/g" CLAUDE.md
    sed -i.bak "s/TECH_STACK_PLACEHOLDER/$TECH_STACK/g" CLAUDE.md
    sed -i.bak "s/AUTHOR_NAME_PLACEHOLDER/$AUTHOR_NAME/g" CLAUDE.md
    sed -i.bak "s/CURRENT_DATE_PLACEHOLDER/$CURRENT_DATE/g" CLAUDE.md
    rm CLAUDE.md.bak
    
    print_success "CLAUDE.md created"
}

# ============================================================================
# CREATE DOCUMENTATION STRUCTURE
# ============================================================================
create_documentation() {
    print_header "   📚 CREATING DOCUMENTATION                                     "
    
    # Create navigation guide
    cat > docs/claude/00-navigation-guide.md << 'EOF'
# 🧭 Navigation Guide

## Quick Access Patterns

### For New Developers
1. Start with `01-project-info.md`
2. Review `09-sops-standards.md`
3. Check `11-commands.md`

### For Bug Fixes
1. Check `12-known-issues.md`
2. Review `09-sops-standards.md`
3. Update `14-agent-worklog.md`

### For Feature Development
1. Review `02-business-logic.md`
2. Check `03-workflows.md`
3. Update `04-features.md`

## Document Index

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| 01-project-info.md | Tech stack, URLs | Rarely |
| 02-business-logic.md | Business rules | On changes |
| 03-workflows.md | User flows | On changes |
| 04-features.md | Feature list | Weekly |
| 05-file-structure.md | Directory layout | On changes |
| 06-api-reference.md | API docs | On changes |
| 07-components-ui.md | UI components | On changes |
| 08-import-guide.md | Import patterns | Rarely |
| 09-sops-standards.md | Standards | Rarely |
| 10-credentials.md | Test accounts | On changes |
| 11-commands.md | CLI commands | On changes |
| 12-known-issues.md | Bug tracker | Daily |
| 13-agent-guidelines.md | AI guidelines | Rarely |
| 14-agent-worklog.md | Change log | Daily |
EOF
    
    # Create other documentation files
    local doc_files=(
        "01-project-info.md"
        "02-business-logic.md"
        "03-workflows.md"
        "04-features.md"
        "05-file-structure.md"
        "06-api-reference.md"
        "07-components-ui.md"
        "08-import-guide.md"
        "09-sops-standards.md"
        "10-credentials.md"
        "11-commands.md"
        "12-known-issues.md"
        "13-agent-guidelines.md"
        "14-agent-worklog.md"
    )
    
    for doc in "${doc_files[@]}"; do
        touch "docs/claude/$doc"
        print_step "Created: docs/claude/$doc"
    done
    
    print_success "Documentation structure created"
}

# ============================================================================
# COPY AGENTS
# ============================================================================
setup_agents() {
    print_header "   🤖 SETTING UP AI AGENTS                                       "
    
    # Create agent files
    cat > .claude/agents/business-analyst.md << 'EOF'
---
name: business-analyst
description: Analyze and structure business requirements
model: sonnet
color: blue
type: personal
---

You are an expert Business Analyst specializing in software project requirements analysis.

[Agent configuration content...]
EOF
    
    cat > .claude/agents/sop-enforcer.md << 'EOF'
---
name: sop-enforcer
description: Enforce SOPs and prevent breaking changes
model: sonnet
color: pink
type: personal
---

You are an expert SOP enforcement specialist. Use Thai for communication.

[Agent configuration content...]
EOF
    
    cat > .claude/agents/development-planner-enhanced.md << 'EOF'
---
name: development-planner-enhanced
description: Create technical specifications and architecture plans
model: sonnet
color: green
type: personal
---

You are an expert Development Planner specializing in technical architecture.

[Agent configuration content...]
EOF
    
    print_success "AI Agents configured"
}

# ============================================================================
# CREATE CONFIGURATION FILES
# ============================================================================
create_config_files() {
    print_header "   ⚙️  CREATING CONFIGURATION FILES                              "
    
    # Create .env.example
    cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# External Services
API_KEY=your-api-key

# Feature Flags
ENABLE_FEATURE_X=false
EOF
    
    # Create .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
vendor/
*.pyc
__pycache__/

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
out/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Testing
coverage/
.coverage
*.cover
.pytest_cache/

# Temporary
tmp/
temp/
*.tmp
EOF
    
    # Create tech-specific config files
    case $LANGUAGE in
        "typescript"|"javascript")
            # package.json
            cat > package.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "$PROJECT_DESCRIPTION",
  "author": "$AUTHOR_NAME",
  "license": "MIT",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "jest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {}
}
EOF
            
            # tsconfig.json
            cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
EOF
            ;;
            
        "python")
            # requirements.txt
            cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0
EOF
            
            # pyproject.toml
            cat > pyproject.toml << EOF
[tool.poetry]
name = "$PROJECT_NAME"
version = "1.0.0"
description = "$PROJECT_DESCRIPTION"
authors = ["$AUTHOR_NAME"]

[tool.poetry.dependencies]
python = "^3.11"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
EOF
            ;;
    esac
    
    print_success "Configuration files created"
}

# ============================================================================
# CREATE SCRIPTS
# ============================================================================
create_scripts() {
    print_header "   📜 CREATING UTILITY SCRIPTS                                   "
    
    # Quick restart script
    cat > quick-restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Quick Restart..."
pkill -f "node|npm|yarn" 2>/dev/null
sleep 1
npm run dev
EOF
    chmod +x quick-restart.sh
    
    # SOP check script
    cat > scripts/sop-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Running SOP checks..."

# Check for hardcoded values
echo "Checking for hardcoded values..."
grep -r "localhost\|127.0.0.1\|hardcoded" --exclude-dir=node_modules .

# Check for console.logs
echo "Checking for console.logs..."
grep -r "console.log" --exclude-dir=node_modules --include="*.ts" --include="*.tsx" .

echo "✅ SOP check complete"
EOF
    chmod +x scripts/sop-check.sh
    
    print_success "Utility scripts created"
}

# ============================================================================
# INITIALIZE GIT
# ============================================================================
init_git() {
    if [[ "$INIT_GIT" == "y" ]]; then
        print_header "   📦 INITIALIZING GIT REPOSITORY                               "
        
        git init
        git add .
        git commit -m "Initial commit - Project setup with enterprise standards"
        
        if [[ -n "$REPO_URL" ]]; then
            git remote add origin "$REPO_URL"
            print_info "Remote repository added: $REPO_URL"
        fi
        
        print_success "Git repository initialized"
    fi
}

# ============================================================================
# CREATE README
# ============================================================================
create_readme() {
    print_header "   📖 CREATING README                                            "
    
    cat > README.md << EOF
# $PROJECT_NAME

$PROJECT_DESCRIPTION

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development
npm run dev
\`\`\`

## 📚 Documentation

- Main documentation: \`CLAUDE.md\`
- Detailed docs: \`/docs/claude/\`
- SOPs: \`/docs/sop/\`

## 🏗️ Architecture

**Type**: $PROJECT_TYPE
**Stack**: $TECH_STACK

## 📁 Project Structure

\`\`\`
.
├── .claude/          # AI agent configurations
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── src/              # Source code
├── tests/            # Test files
└── CLAUDE.md         # AI assistant guidelines
\`\`\`

## 👥 Team

- $AUTHOR_NAME

## 📄 License

MIT

---

*Generated with Enterprise Project Initializer*
EOF
    
    print_success "README.md created"
}

# ============================================================================
# FINAL SETUP
# ============================================================================
final_setup() {
    print_header "   🎉 FINALIZING PROJECT SETUP                                  "
    
    # Create sample test file
    mkdir -p tests
    case $LANGUAGE in
        "typescript"|"javascript")
            cat > tests/example.test.ts << 'EOF'
describe('Example Test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
EOF
            ;;
        "python")
            cat > tests/test_example.py << 'EOF'
def test_example():
    assert True == True
EOF
            ;;
    esac
    
    # Create VS Code settings
    mkdir -p .vscode
    cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true
  }
}
EOF
    
    print_success "Project setup complete!"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    print_header "   🚀 ENTERPRISE PROJECT INITIALIZER                            "
    
    echo -e "${WHITE}Welcome to the Enterprise Project Initializer!${NC}"
    echo -e "${CYAN}This tool will set up a new project with production-ready standards.${NC}"
    echo ""
    
    # Run setup steps
    select_project_type
    select_tech_stack
    get_project_details
    select_features
    
    # Create project
    create_directory_structure
    create_claude_md
    create_documentation
    setup_agents
    create_config_files
    create_scripts
    create_readme
    init_git
    final_setup
    
    # Summary
    print_header "   ✅ PROJECT INITIALIZATION COMPLETE                            "
    
    echo -e "${GREEN}Project '$PROJECT_NAME' has been successfully initialized!${NC}"
    echo ""
    echo "📁 Location: $(pwd)"
    echo "🏗️  Architecture: $PROJECT_TYPE"
    echo "💻 Stack: $TECH_STACK"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. cd $PROJECT_DIR"
    echo "  2. Review and update CLAUDE.md"
    echo "  3. Configure .env file"
    echo "  4. Install dependencies"
    echo "  5. Start development"
    echo ""
    echo -e "${CYAN}Happy coding! 🚀${NC}"
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

# Check if running directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi