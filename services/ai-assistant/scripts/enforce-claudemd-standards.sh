#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Script to enforce CLAUDE.md standards across all projects
# This ensures all agents read and update CLAUDE.md properly

set -e

echo "🔍 Enforcing CLAUDE.md Standards..."
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if CLAUDE.md exists and has required sections
check_claude_md() {
    local project_path="$1"
    local claude_file="$project_path/CLAUDE.md"
    
    if [ ! -f "$claude_file" ]; then
        echo -e "${RED}❌ CLAUDE.md not found in $project_path${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ CLAUDE.md found in $project_path${NC}"
    
    # Check for required sections
    local required_sections=(
        "Project Information"
        "Business Logic"
        "Flow/Use Cases"
        "Feature List"
        "File/Module Structure"
        "API/Service List"
        "Component/Module/UI List"
        "Import Guide"
        "Default SOP"
        "Test Accounts"
        "Common Commands"
        "Known Issues"
    )
    
    local missing_sections=()
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "## .*$section" "$claude_file"; then
            missing_sections+=("$section")
        fi
    done
    
    if [ ${#missing_sections[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Missing sections in CLAUDE.md:${NC}"
        for section in "${missing_sections[@]}"; do
            echo "   - $section"
        done
        return 2
    fi
    
    echo -e "${GREEN}✅ All required sections present${NC}"
    return 0
}

# Function to create/update CLAUDE.md template
create_claude_template() {
    local project_path="$1"
    local claude_file="$project_path/CLAUDE.md"
    
    if [ -f "$claude_file" ]; then
        echo -e "${YELLOW}📝 Backing up existing CLAUDE.md to CLAUDE.md.backup${NC}"
        cp "$claude_file" "$claude_file.backup"
    fi
    
    cat > "$claude_file" << 'EOF'
# CLAUDE.md - AI Assistant Guidelines

## Quick Navigation
- [Project Information](#project-information)
- [Business Logic](#business-logic)
- [Flow/Use Cases](#flowuse-cases)
- [Feature List](#feature-list)
- [File/Module Structure](#filemodule-structure)
- [API/Service List](#apiservice-list)
- [Component/Module/UI List](#componentmoduleui-list)
- [Import Guide](#import-guide)
- [Default SOP](#default-sop)
- [Test Accounts & Credentials](#test-accounts--credentials)
- [Common Commands](#common-commands)
- [Known Issues & Solutions](#known-issues--solutions)
- [Agent Work Log](#agent-work-log)

## Project Information
- **Project Name**: [Project Name]
- **Description**: [Brief description]
- **Technology Stack**: 
  - Frontend: [e.g., Next.js, React, TypeScript]
  - Backend: [e.g., Node.js, Express]
  - Database: [e.g., PostgreSQL, MongoDB]
- **URLs**:
  - Development: http://localhost:$PORT_FRONTEND_MAIN
  - Production: [Production URL]
- **Repository**: [Git repository URL]

## Business Logic
- **Core Business Rules**: [Document key rules]
- **User Roles**: [List roles and permissions]
- **Key Processes**: [Main business processes]
- **Data Flow**: [How data moves through the system]

## Flow/Use Cases
- **Authentication Flow**: [Login/logout process]
- **Main Features**: [Key user workflows]
- **Error Handling**: [Error patterns and recovery]

## Feature List
### Completed Features
- [Feature 1]: [Description]

### In Progress
- [Feature 2]: [Description and status]

### Planned
- [Feature 3]: [Description and priority]

## File/Module Structure
```
project/
├── src/
│   ├── components/
│   ├── services/
│   └── utils/
```

## API/Service List
### REST Endpoints
| Method | Path | Description | Parameters | Response |
|--------|------|-------------|------------|----------|
| GET | /api/example | Example endpoint | - | JSON |

## Component/Module/UI List
### Reusable Components
- **ComponentName**: Description, props, usage example

## Import Guide
### Services
```typescript
import { ServiceName } from '@/services/service-name';
```

### Components
```typescript
import { ComponentName } from '@/components/component-name';
```

## Default SOP
### Git Workflow
- Branch from `dev`
- Create feature branches: `feature/[name]`
- Commit format: `feat: description`

### Testing
- Unit tests required for utilities
- Integration tests for APIs

## Test Accounts & Credentials
- **Admin**: admin@example.com / [See .env]
- **User**: user@example.com / [See .env]

## Common Commands
```bash
npm run dev          # Start development
npm run build        # Build for production
npm run test         # Run tests
```

## Known Issues & Solutions
### Issue 1
- **Problem**: [Description]
- **Solution**: [Workaround or fix]

## Agent Work Log
<!-- Agents will auto-update this section -->
### [Date] - [Agent Name]
**Task**: [Description]
**Changes**: [What was modified]
**Notes**: [Important observations]
EOF
    
    echo -e "${GREEN}✅ CLAUDE.md template created/updated${NC}"
}

# Function to check agent configuration
check_agent_config() {
    local agent_file="$1"
    
    if [ ! -f "$agent_file" ]; then
        return 1
    fi
    
    # Check if agent has CLAUDE.md requirements
    if grep -q "CLAUDE.md" "$agent_file"; then
        echo -e "${GREEN}✅ $(basename $agent_file): Has CLAUDE.md integration${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $(basename $agent_file): Missing CLAUDE.md integration${NC}"
        return 1
    fi
}

# Main execution
main() {
    local project_root="${1:-.}"
    
    echo "📂 Checking project: $project_root"
    echo ""
    
    # Check CLAUDE.md
    check_claude_md "$project_root"
    local claude_status=$?
    
    if [ $claude_status -eq 1 ] || [ $claude_status -eq 2 ]; then
        echo ""
        read -p "Would you like to create/update CLAUDE.md? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_claude_template "$project_root"
        fi
    fi
    
    # Check agents if .claude/agents directory exists
    if [ -d "$project_root/.claude/agents" ]; then
        echo ""
        echo "🤖 Checking agent configurations..."
        echo "-----------------------------------"
        
        for agent_file in "$project_root/.claude/agents"/*.md; do
            if [ -f "$agent_file" ]; then
                check_agent_config "$agent_file"
            fi
        done
    fi
    
    echo ""
    echo "✨ CLAUDE.md standards check complete!"
    echo ""
    echo "📌 Remember: All agents should:"
    echo "   1. Read CLAUDE.md before starting work"
    echo "   2. Update CLAUDE.md after completing tasks"
    echo "   3. Document discoveries and solutions"
    echo "   4. Add entries to the Agent Work Log"
}

# Run main function
main "$@"