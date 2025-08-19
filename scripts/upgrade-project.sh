#!/bin/bash

# ============================================================================
# Project Upgrade Script - Add Enterprise Standards to Existing Projects
# Version: 2.0.0
# Author: Claude Code Standards Team
# Description: Upgrade existing projects with enterprise standards
# Features: Non-destructive, Backup, Rollback, Incremental
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
BACKUP_DIR=".backup-${CURRENT_DATE}-$$"
UPGRADE_LOG="upgrade-log-${CURRENT_DATE}.txt"

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
    echo "[$(date)] ✅ $1" >> "$UPGRADE_LOG"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[$(date)] ❌ $1" >> "$UPGRADE_LOG"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "[$(date)] ⚠️  $1" >> "$UPGRADE_LOG"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "[$(date)] ℹ️  $1" >> "$UPGRADE_LOG"
}

print_step() {
    echo -e "${PURPLE}▶️  $1${NC}"
    echo "[$(date)] ▶️  $1" >> "$UPGRADE_LOG"
}

# ============================================================================
# PROJECT ANALYSIS
# ============================================================================
analyze_project() {
    print_header "   🔍 ANALYZING EXISTING PROJECT                                "
    
    PROJECT_DIR="$(pwd)"
    ANALYSIS_RESULTS=()
    
    # Detect project type
    if [ -f "package.json" ]; then
        PROJECT_TYPE="node"
        PACKAGE_MANAGER="npm"
        [ -f "yarn.lock" ] && PACKAGE_MANAGER="yarn"
        [ -f "pnpm-lock.yaml" ] && PACKAGE_MANAGER="pnpm"
        ANALYSIS_RESULTS+=("📦 Node.js project detected (${PACKAGE_MANAGER})")
    fi
    
    if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
        PROJECT_TYPE="python"
        ANALYSIS_RESULTS+=("🐍 Python project detected")
    fi
    
    if [ -f "go.mod" ]; then
        PROJECT_TYPE="go"
        ANALYSIS_RESULTS+=("🚀 Go project detected")
    fi
    
    if [ -f "Cargo.toml" ]; then
        PROJECT_TYPE="rust"
        ANALYSIS_RESULTS+=("🦀 Rust project detected")
    fi
    
    if [ -f "pom.xml" ] || [ -f "build.gradle" ]; then
        PROJECT_TYPE="java"
        ANALYSIS_RESULTS+=("☕ Java project detected")
    fi
    
    if [ -f "Gemfile" ]; then
        PROJECT_TYPE="ruby"
        ANALYSIS_RESULTS+=("💎 Ruby project detected")
    fi
    
    # Check for existing standards
    [ -f "CLAUDE.md" ] && ANALYSIS_RESULTS+=("✅ CLAUDE.md exists")
    [ -d ".claude" ] && ANALYSIS_RESULTS+=("✅ .claude directory exists")
    [ -d "docs/claude" ] && ANALYSIS_RESULTS+=("✅ docs/claude exists")
    [ -d "scripts" ] && ANALYSIS_RESULTS+=("✅ scripts directory exists")
    
    # Check for version control
    if [ -d ".git" ]; then
        ANALYSIS_RESULTS+=("✅ Git repository detected")
        GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
        ANALYSIS_RESULTS+=("📌 Current branch: $GIT_BRANCH")
    else
        ANALYSIS_RESULTS+=("⚠️  No Git repository")
    fi
    
    # Check for Docker
    [ -f "Dockerfile" ] && ANALYSIS_RESULTS+=("🐳 Docker configuration found")
    [ -f "docker-compose.yml" ] && ANALYSIS_RESULTS+=("🐳 Docker Compose found")
    
    # Check for CI/CD
    [ -d ".github/workflows" ] && ANALYSIS_RESULTS+=("🔄 GitHub Actions found")
    [ -f ".gitlab-ci.yml" ] && ANALYSIS_RESULTS+=("🔄 GitLab CI found")
    [ -f "Jenkinsfile" ] && ANALYSIS_RESULTS+=("🔄 Jenkins pipeline found")
    
    # Display analysis results
    echo "Project Analysis Results:"
    echo "========================="
    for result in "${ANALYSIS_RESULTS[@]}"; do
        echo "  $result"
    done
    echo ""
    
    print_success "Project analysis complete"
}

# ============================================================================
# UPGRADE SELECTION
# ============================================================================
select_upgrades() {
    print_header "   📋 SELECT COMPONENTS TO UPGRADE                              "
    
    echo "Available upgrade components:"
    echo ""
    echo "  1) 📄 CLAUDE.md (AI Assistant Guidelines)"
    echo "  2) 🤖 AI Agents (.claude/agents/)"
    echo "  3) 📚 Documentation Structure (docs/claude/)"
    echo "  4) 📜 Utility Scripts (scripts/)"
    echo "  5) 📝 SOPs & Standards (docs/sop/)"
    echo "  6) ⚙️  Configuration Templates (.env.example, etc.)"
    echo "  7) 🧪 Testing Framework"
    echo "  8) 🔧 Git Hooks (pre-commit, etc.)"
    echo "  9) 🐳 Docker Configuration"
    echo "  10) 🔄 CI/CD Templates"
    echo "  11) 📊 Monitoring & Logging"
    echo "  12) 🔐 Security Standards"
    echo "  13) 📈 Performance Optimization"
    echo "  14) 🌍 i18n Support"
    echo "  15) ✨ All Essential Components (1-6)"
    echo ""
    
    read -p "Select components to upgrade (space-separated, e.g., 1 2 3): " -a SELECTED_COMPONENTS
    
    # Default to essential if nothing selected
    if [ ${#SELECTED_COMPONENTS[@]} -eq 0 ]; then
        SELECTED_COMPONENTS=(15)
        print_warning "No selection made, defaulting to essential components"
    fi
    
    # Handle "All Essential" selection
    if [[ " ${SELECTED_COMPONENTS[@]} " =~ " 15 " ]]; then
        SELECTED_COMPONENTS=(1 2 3 4 5 6)
        print_info "Upgrading all essential components"
    fi
    
    print_success "Components selected: ${SELECTED_COMPONENTS[*]}"
}

# ============================================================================
# BACKUP EXISTING FILES
# ============================================================================
create_backup() {
    print_header "   💾 CREATING BACKUP                                           "
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup files that might be modified
    FILES_TO_BACKUP=(
        "CLAUDE.md"
        ".claude"
        "docs"
        "scripts"
        ".env.example"
        ".gitignore"
        "README.md"
    )
    
    for file in "${FILES_TO_BACKUP[@]}"; do
        if [ -e "$file" ]; then
            cp -r "$file" "$BACKUP_DIR/" 2>/dev/null || true
            print_step "Backed up: $file"
        fi
    done
    
    # Create backup manifest
    cat > "$BACKUP_DIR/manifest.txt" << EOF
Backup created: $CURRENT_DATE
Project: $(basename "$PROJECT_DIR")
Components backed up:
$(ls -la "$BACKUP_DIR" | tail -n +2)
EOF
    
    print_success "Backup created in $BACKUP_DIR"
}

# ============================================================================
# UPGRADE CLAUDE.MD
# ============================================================================
upgrade_claude_md() {
    print_step "Upgrading CLAUDE.md..."
    
    if [ -f "CLAUDE.md" ]; then
        print_warning "CLAUDE.md exists, creating CLAUDE.md.new for review"
        TARGET_FILE="CLAUDE.md.new"
    else
        TARGET_FILE="CLAUDE.md"
    fi
    
    cat > "$TARGET_FILE" << 'EOF'
# CLAUDE.md - AI Assistant Guidelines

> **⚡ QUICK START**: This is the main index file. Detailed documentation is in `/docs/claude/` directory.
> **🚨 RATE LIMIT PREVENTION**: Follow guidelines below to avoid hitting Claude CLI limits.
> **📝 PROJECT SPECIFIC**: Update sections marked with [UPDATE] for your project.

## 🛡️ RATE LIMIT PREVENTION GUIDELINES

### ⚡ CRITICAL: Optimize Every Request

### 1️⃣ CONTEXT MANAGEMENT
- **MAX_CONTEXT**: Read max 2000 lines per file
- **SELECTIVE_READING**: Use grep/search FIRST
- **NO_FULL_SCAN**: Never read entire large files
- **CACHE_CONTENTS**: Remember what you've read

### 2️⃣ REQUEST OPTIMIZATION
- **BATCH_OPERATIONS**: Group related operations
- **PLAN_FIRST**: Think and plan BEFORE acting
- **AVOID_REDUNDANCY**: Don't repeat operations
- **SUMMARIZE_LONG**: Auto-summarize after 15+ messages

## 📋 Project Information

**Project**: [UPDATE: Your project name]
**Description**: [UPDATE: Project description]
**Stack**: [UPDATE: Technology stack]
**Repository**: [UPDATE: Repository URL]

## 💼 Business Logic

[UPDATE: Add your business logic here]

## 🔄 Workflows & Use Cases

[UPDATE: Document your workflows]

## ✅ Features

### Completed Features
- [UPDATE: List completed features]

### In-Progress Features
- [UPDATE: List in-progress features]

### Planned Features
- [UPDATE: List planned features]

## 📁 File Structure

See `/docs/claude/05-file-structure.md` for detailed structure.

## 🔌 API Reference

See `/docs/claude/06-api-reference.md` for API documentation.

## 📝 SOPs & Standards

See `/docs/sop/` for standard operating procedures.

## 🔑 Credentials & Test Accounts

[UPDATE: Add test accounts and credential references]

## 💻 Common Commands

[UPDATE: Add your common commands]

## 🐛 Known Issues & Solutions

[UPDATE: Document known issues]

## 🤖 Agent Instructions

Agents should:
1. Always read this file first
2. Follow rate limit prevention guidelines
3. Update documentation when making changes
4. Use batch operations for efficiency

---

*Last Updated: $(date +%Y-%m-%d) | Upgraded with Enterprise Standards*
EOF
    
    if [ "$TARGET_FILE" = "CLAUDE.md.new" ]; then
        print_warning "Review CLAUDE.md.new and merge with existing CLAUDE.md"
    else
        print_success "CLAUDE.md created"
    fi
}

# ============================================================================
# UPGRADE AI AGENTS
# ============================================================================
upgrade_agents() {
    print_step "Upgrading AI Agents..."
    
    mkdir -p .claude/agents
    
    # Check if setup-agents.sh exists
    if [ -f "${SCRIPT_DIR}/setup-agents.sh" ]; then
        bash "${SCRIPT_DIR}/setup-agents.sh" "$(pwd)"
    else
        print_warning "setup-agents.sh not found, creating basic agent structure"
        
        # Create basic agent files
        cat > .claude/agents/README.md << 'EOF'
# AI Agents Directory

This directory contains Personal Claude Agents for enhanced development support.

## Available Agents

1. **business-analyst** - Requirements analysis
2. **sop-enforcer** - Standards enforcement
3. **development-planner** - Technical planning

## Setup

Run `scripts/setup-agents.sh` to install all agents.
EOF
    fi
    
    print_success "AI Agents upgraded"
}

# ============================================================================
# UPGRADE DOCUMENTATION
# ============================================================================
upgrade_documentation() {
    print_step "Upgrading documentation structure..."
    
    mkdir -p docs/claude
    mkdir -p docs/sop
    mkdir -p docs/technical-specs
    
    # Create documentation files if they don't exist
    DOC_FILES=(
        "00-navigation-guide.md"
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
    
    for doc in "${DOC_FILES[@]}"; do
        if [ ! -f "docs/claude/$doc" ]; then
            touch "docs/claude/$doc"
            echo "# $(basename $doc .md | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')" > "docs/claude/$doc"
            echo "" >> "docs/claude/$doc"
            echo "[UPDATE: Add content for this section]" >> "docs/claude/$doc"
            print_step "Created: docs/claude/$doc"
        else
            print_info "Exists: docs/claude/$doc"
        fi
    done
    
    print_success "Documentation structure upgraded"
}

# ============================================================================
# UPGRADE SCRIPTS
# ============================================================================
upgrade_scripts() {
    print_step "Upgrading utility scripts..."
    
    mkdir -p scripts/dev
    mkdir -p scripts/devops
    mkdir -p scripts/database
    mkdir -p scripts/testing
    
    # Create essential scripts
    
    # Quick restart script
    if [ ! -f "scripts/quick-restart.sh" ]; then
        cat > scripts/quick-restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Quick Restart..."
pkill -f "node|npm|yarn" 2>/dev/null || true
sleep 1
npm run dev
EOF
        chmod +x scripts/quick-restart.sh
        print_step "Created: scripts/quick-restart.sh"
    fi
    
    # SOP check script
    if [ ! -f "scripts/sop-check.sh" ]; then
        cat > scripts/sop-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Running SOP checks..."

# Check for hardcoded values
echo "Checking for hardcoded values..."
grep -r "localhost\|127.0.0.1" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20

# Check for console.logs in production code
echo "Checking for console.logs..."
grep -r "console.log" --exclude-dir=node_modules --exclude-dir=.git --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | head -20

echo "✅ SOP check complete"
EOF
        chmod +x scripts/sop-check.sh
        print_step "Created: scripts/sop-check.sh"
    fi
    
    print_success "Scripts upgraded"
}

# ============================================================================
# UPGRADE SOPS
# ============================================================================
upgrade_sops() {
    print_step "Upgrading SOPs & Standards..."
    
    mkdir -p docs/sop
    
    # Create main SOP document
    cat > docs/sop/README.md << 'EOF'
# Standard Operating Procedures (SOPs)

## Git Workflow
1. Create feature branch from develop
2. Make changes following standards
3. Test thoroughly
4. Create PR with description
5. Code review required

## Coding Standards
- Consistent naming conventions
- Self-documenting code
- Comments for complex logic
- No hardcoded values

## Testing Requirements
- Minimum 80% coverage
- Unit tests for functions
- Integration tests for APIs
- E2E tests for critical paths

## Security Standards
- No secrets in code
- Use environment variables
- Validate all inputs
- Regular security audits

## Performance Standards
- Page load < 3s
- API response < 200ms
- Memory usage monitoring
- Regular performance audits
EOF
    
    print_success "SOPs upgraded"
}

# ============================================================================
# UPGRADE CONFIG TEMPLATES
# ============================================================================
upgrade_config() {
    print_step "Upgrading configuration templates..."
    
    # Create .env.example if it doesn't exist
    if [ ! -f ".env.example" ]; then
        cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=

# Authentication
JWT_SECRET=
SESSION_SECRET=

# External Services
API_KEY=

# Feature Flags
ENABLE_FEATURE_X=false
EOF
        print_step "Created: .env.example"
    fi
    
    # Update .gitignore
    if [ -f ".gitignore" ]; then
        # Check if certain entries exist, if not add them
        grep -q "\.env" .gitignore || echo -e "\n# Environment\n.env\n.env.local" >> .gitignore
        grep -q "\.DS_Store" .gitignore || echo -e "\n# OS\n.DS_Store\nThumbs.db" >> .gitignore
        grep -q "\.backup-" .gitignore || echo -e "\n# Backups\n.backup-*" >> .gitignore
        print_info "Updated .gitignore"
    fi
    
    print_success "Configuration templates upgraded"
}

# ============================================================================
# ROLLBACK FUNCTIONALITY
# ============================================================================
rollback() {
    print_header "   ⏪ ROLLING BACK CHANGES                                      "
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backup found at $BACKUP_DIR"
        
        # Look for recent backups
        echo "Available backups:"
        ls -d .backup-* 2>/dev/null || echo "No backups found"
        
        read -p "Enter backup directory name to restore: " BACKUP_TO_RESTORE
        BACKUP_DIR="$BACKUP_TO_RESTORE"
    fi
    
    if [ -d "$BACKUP_DIR" ]; then
        print_warning "This will restore files from $BACKUP_DIR"
        read -p "Are you sure? (y/n): " CONFIRM
        
        if [ "$CONFIRM" = "y" ]; then
            cp -r "$BACKUP_DIR"/* . 2>/dev/null || true
            print_success "Rollback completed from $BACKUP_DIR"
        else
            print_info "Rollback cancelled"
        fi
    else
        print_error "Backup directory not found: $BACKUP_DIR"
    fi
}

# ============================================================================
# VERIFICATION
# ============================================================================
verify_upgrade() {
    print_header "   ✅ VERIFYING UPGRADE                                         "
    
    VERIFICATION_RESULTS=()
    
    # Check what was upgraded
    [ -f "CLAUDE.md" ] && VERIFICATION_RESULTS+=("✅ CLAUDE.md present")
    [ -d ".claude/agents" ] && VERIFICATION_RESULTS+=("✅ AI Agents installed")
    [ -d "docs/claude" ] && VERIFICATION_RESULTS+=("✅ Documentation structure")
    [ -d "scripts" ] && VERIFICATION_RESULTS+=("✅ Scripts directory")
    [ -d "docs/sop" ] && VERIFICATION_RESULTS+=("✅ SOPs documented")
    [ -f ".env.example" ] && VERIFICATION_RESULTS+=("✅ Config templates")
    
    echo "Verification Results:"
    echo "===================="
    for result in "${VERIFICATION_RESULTS[@]}"; do
        echo "  $result"
    done
    
    print_success "Upgrade verification complete"
}

# ============================================================================
# MAIN UPGRADE PROCESS
# ============================================================================
upgrade_project() {
    # Initialize log
    echo "=== Upgrade Log Started: $(date) ===" > "$UPGRADE_LOG"
    
    # Analyze current project
    analyze_project
    
    # Select components to upgrade
    select_upgrades
    
    # Create backup
    create_backup
    
    # Process selected upgrades
    for component in "${SELECTED_COMPONENTS[@]}"; do
        case $component in
            1) upgrade_claude_md ;;
            2) upgrade_agents ;;
            3) upgrade_documentation ;;
            4) upgrade_scripts ;;
            5) upgrade_sops ;;
            6) upgrade_config ;;
            7) print_info "Testing framework upgrade - manual setup required" ;;
            8) print_info "Git hooks upgrade - manual setup required" ;;
            9) print_info "Docker configuration - manual setup required" ;;
            10) print_info "CI/CD templates - manual setup required" ;;
            11) print_info "Monitoring setup - manual setup required" ;;
            12) print_info "Security standards - manual review required" ;;
            13) print_info "Performance optimization - manual review required" ;;
            14) print_info "i18n support - manual setup required" ;;
            *) print_warning "Unknown component: $component" ;;
        esac
    done
    
    # Verify upgrade
    verify_upgrade
}

# ============================================================================
# INTERACTIVE MODE
# ============================================================================
interactive_mode() {
    print_header "   🚀 PROJECT UPGRADE TOOL - INTERACTIVE MODE                   "
    
    echo -e "${WHITE}Welcome to the Project Upgrade Tool!${NC}"
    echo -e "${CYAN}This tool will add enterprise standards to your existing project.${NC}"
    echo ""
    echo "Options:"
    echo "  1) 📈 Upgrade Project (Add Standards)"
    echo "  2) 🔍 Analyze Only (No Changes)"
    echo "  3) ⏪ Rollback Previous Upgrade"
    echo "  4) 📚 View Documentation"
    echo "  5) ❌ Exit"
    echo ""
    
    read -p "Select option (1-5): " OPTION
    
    case $OPTION in
        1) upgrade_project ;;
        2) 
            analyze_project
            print_info "Analysis complete - no changes made"
            ;;
        3) rollback ;;
        4) 
            echo "Documentation available at:"
            echo "  - CLAUDE.md (main index)"
            echo "  - docs/claude/ (detailed docs)"
            echo "  - docs/sop/ (procedures)"
            ;;
        5) 
            print_info "Exiting..."
            exit 0
            ;;
        *) 
            print_error "Invalid option"
            exit 1
            ;;
    esac
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    # Check if we're in a project directory
    if [ ! -f "package.json" ] && [ ! -f "requirements.txt" ] && [ ! -f "go.mod" ] && \
       [ ! -f "Cargo.toml" ] && [ ! -f "pom.xml" ] && [ ! -f "Gemfile" ]; then
        print_warning "No recognized project files found in current directory"
        read -p "Continue anyway? (y/n): " CONTINUE
        [ "$CONTINUE" != "y" ] && exit 1
    fi
    
    # Run interactive mode
    interactive_mode
    
    # Summary
    print_header "   📊 UPGRADE SUMMARY                                           "
    
    echo -e "${GREEN}Project upgrade process completed!${NC}"
    echo ""
    echo "📁 Backup location: $BACKUP_DIR"
    echo "📝 Upgrade log: $UPGRADE_LOG"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review any .new files created"
    echo "  2. Update [UPDATE] sections in CLAUDE.md"
    echo "  3. Customize agents for your project"
    echo "  4. Configure environment variables"
    echo "  5. Run scripts/sop-check.sh to verify standards"
    echo ""
    echo -e "${BLUE}To rollback changes:${NC}"
    echo "  ./upgrade-project.sh (select option 3)"
    echo ""
    echo -e "${CYAN}Happy coding with enterprise standards! 🚀${NC}"
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

# Check if running directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi