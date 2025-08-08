#!/bin/bash

# Setup Unified System - Initialize _library, _logs, _sop integration
# Run once to setup the complete system

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}=== Setting Up Unified System ===${NC}\n"

# 1. Create log directory structure
echo -e "${BLUE}1. Creating log directories...${NC}"
mkdir -p _logs/{fixes,errors,performance,security,reports,tests,build,library,sop-compliance}
mkdir -p _logs/{analysis,plans,decisions,sop-updates,ai-workflow}
mkdir -p _logs/reports/{daily,weekly,monthly}
mkdir -p _logs/errors/{api,ui,build}

echo -e "  ${GREEN}✓ Log directories created${NC}"

# 2. Setup SOP current directory
echo -e "\n${BLUE}2. Setting up SOP links...${NC}"
mkdir -p _sop/current

# Link active SOPs
for sop in docs/SOPs/SOP-*.md; do
    if [ -f "$sop" ]; then
        sop_name=$(basename "$sop")
        ln -sf "../../$sop" "_sop/current/$sop_name"
        echo -e "  ✓ Linked $sop_name"
    fi
done

# 3. Create library structure if missing
echo -e "\n${BLUE}3. Checking library structure...${NC}"
mkdir -p _library/{components/{ui,business,layout},hooks,utils,templates,patterns,generators}
mkdir -p _library/templates/{pages,components,modules}
mkdir -p _library/utils/{api,security,validation}

echo -e "  ${GREEN}✓ Library structure ready${NC}"

# 4. Create initial templates
echo -e "\n${BLUE}4. Creating starter templates...${NC}"

# Page template
cat > _library/templates/pages/PageTemplate.tsx << 'EOF'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title | CMS',
  description: 'Page description',
}

interface PageProps {
  params?: { [key: string]: string }
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function PageTemplate({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Page Title</h1>
      <div>
        {/* Page content here */}
      </div>
    </div>
  )
}
EOF

# API middleware utility
cat > _library/utils/api/middleware.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/infrastructure/auth'

interface MiddlewareOptions {
  requireAuth?: boolean
  permissions?: string[]
  rateLimit?: { requests: number; window: string }
}

export function withApiMiddleware(
  handler: (req: NextRequest) => Promise<Response>,
  options: MiddlewareOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      // Authentication check
      if (options.requireAuth) {
        const session = await auth()
        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
      }

      // Call handler
      return await handler(req)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
EOF

echo -e "  ${GREEN}✓ Templates created${NC}"

# 5. Create hooks
echo -e "\n${BLUE}5. Creating git hooks...${NC}"

# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Log all commits
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"action\":\"commit\",\"branch\":\"$(git branch --show-current)\"}" >> _logs/fixes/$(date +%Y-%m-%d).log

# Run checks
./scripts/unified-workflow.sh check > /dev/null 2>&1
EOF

chmod +x .git/hooks/pre-commit
echo -e "  ${GREEN}✓ Git hooks created${NC}"

# 6. Create cron job script
echo -e "\n${BLUE}6. Creating automated tasks...${NC}"

cat > scripts/automated-tasks.sh << 'EOF'
#!/bin/bash
# Automated tasks for unified system

# Daily report (run at 6 PM)
if [ "$(date +%H)" = "18" ]; then
    ./scripts/unified-workflow.sh report daily
fi

# Weekly sync (run on Monday)
if [ "$(date +%u)" = "1" ] && [ "$(date +%H)" = "09" ]; then
    ./scripts/unified-workflow.sh sync
    ./scripts/unified-workflow.sh report weekly
fi

# Clean old logs (run on 1st of month)
if [ "$(date +%d)" = "01" ]; then
    ./scripts/unified-workflow.sh log clean
fi
EOF

chmod +x scripts/automated-tasks.sh
echo -e "  ${GREEN}✓ Automated tasks created${NC}"

# 7. Update isolate-fix.sh to use unified system
echo -e "\n${BLUE}7. Updating isolate-fix.sh...${NC}"

# Add unified workflow integration to isolate-fix.sh
if [ -f "scripts/isolate-fix.sh" ]; then
    # Check if already integrated
    if ! grep -q "unified-workflow" scripts/isolate-fix.sh; then
        # Add integration after the shebang
        sed -i.bak '2i\
# Integration with unified workflow\
if [ -f "./scripts/unified-workflow.sh" ]; then\
    # Use unified fix instead if available\
    ./scripts/unified-workflow.sh fix "$@"\
    exit $?\
fi\
' scripts/isolate-fix.sh
        echo -e "  ${GREEN}✓ Updated isolate-fix.sh${NC}"
    else
        echo -e "  ${GREEN}✓ isolate-fix.sh already integrated${NC}"
    fi
fi

# 8. Create AI workflow shortcuts
echo -e "\n${BLUE}8. Creating AI workflow shortcuts...${NC}"

# Create ultra-short command (./uw)
cat > uw << 'UWEOF'
#!/bin/bash

# Unified Workflow - Short Commands
# Usage: ./uw [short-command] [args...]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Get the command
cmd="$1"
shift  # Remove first argument, keep the rest

# Smart parsing - if first arg looks like a problem description, assume 'aa'
if [ -n "$cmd" ] && [[ "$cmd" =~ ^[a-zA-Z0-9].*[[:space:]].*$ ]]; then
    # If it looks like a sentence/description, treat as quick analysis
    ./scripts/unified-workflow.sh ai-analyze "$cmd" "$@"
    exit 0
fi

# Show short help
show_short_help() {
    cat << EOF
${PURPLE}=== UW - Unified Workflow (Short Commands) ===${NC}

${YELLOW}Quick Commands:${NC}
  ${GREEN}c${NC}        - check status
  ${GREEN}f${NC}        - fix "problem"
  ${GREEN}fa${NC}       - fix "problem" --ai  
  ${GREEN}aa${NC}       - ai-analyze "problem"
  ${GREEN}aat${NC}      - ai-analyze "problem" true (interactive)
  ${GREEN}cp${NC}       - component find/create
  ${GREEN}l${NC}        - log search/recent
  ${GREEN}s${NC}        - sop find/apply
  ${GREEN}sync${NC}     - sync systems
  ${GREEN}r${NC}        - report
  ${GREEN}lib${NC}      - library management

${YELLOW}Quick Examples:${NC}
  ${GREEN}./uw c${NC}                           # Check status
  ${GREEN}./uw f "contact page errors"${NC}     # Regular fix
  ${GREEN}./uw fa "api security issues"${NC}    # AI-powered fix
  ${GREEN}./uw aa "websocket problems"${NC}     # AI analysis
  ${GREEN}./uw aat "database conflicts"${NC}    # Interactive AI analysis
  ${GREEN}./uw cp find Button${NC}              # Find component
  ${GREEN}./uw l search "error"${NC}            # Search logs
  ${GREEN}./uw s find "security"${NC}           # Find SOPs

${YELLOW}Special Shortcuts:${NC}
  ${GREEN}./uw t${NC}    - quick interactive mode: ./uw aat "\$1"
  ${GREEN}./uw q${NC}    - quick analysis: ./uw aa "\$1" 

${BLUE}Full command equivalent:${NC} ./scripts/unified-workflow.sh

EOF
}

# Map short commands to full commands
case "$cmd" in
    # Basic commands
    c|check)
        ./scripts/unified-workflow.sh check "$@"
        ;;
    f|fix)
        ./scripts/unified-workflow.sh fix "$@"
        ;;
    fa|fix-ai)
        ./scripts/unified-workflow.sh fix "$1" --ai
        ;;
    
    # AI Analysis commands
    aa|ai-analyze)
        ./scripts/unified-workflow.sh ai-analyze "$@"
        ;;
    aat|ai-analyze-interactive)
        ./scripts/unified-workflow.sh ai-analyze "$1" true
        ;;
    
    # Super quick shortcuts
    t|quick-interactive)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./uw t \"problem description\"${NC}"
            exit 1
        fi
        ./scripts/unified-workflow.sh ai-analyze "$1" true
        ;;
    q|quick-analyze)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./uw q \"problem description\"${NC}"
            exit 1
        fi
        ./scripts/unified-workflow.sh ai-analyze "$1" false
        ;;
    
    # Component commands
    cp|component)
        ./scripts/unified-workflow.sh component "$@"
        ;;
    
    # Log commands  
    l|log)
        ./scripts/unified-workflow.sh log "$@"
        ;;
    
    # SOP commands
    s|sop)
        ./scripts/unified-workflow.sh sop "$@"
        ;;
    
    # System commands
    sync)
        ./scripts/unified-workflow.sh sync "$@"
        ;;
    r|report)
        ./scripts/unified-workflow.sh report "$@"
        ;;
    lib|library)
        ./scripts/unified-workflow.sh library "$@"
        ;;
    
    # Help and fallback
    h|help|--help|-h)
        show_short_help
        ;;
    "")
        show_short_help
        ;;
    *)
        echo -e "${RED}Unknown command: $cmd${NC}"
        echo -e "${YELLOW}Use './uw h' for help${NC}"
        exit 1
        ;;
esac
UWEOF

# Create ultra-short alias
cat > u << 'UEOF'
#!/bin/bash

# Ultra-short alias for ./uw
./uw "$@"
UEOF

# Make executable
chmod +x uw u

echo -e "  ${GREEN}✓ AI workflow shortcuts created (./uw and ./u)${NC}"

# 9. Create comprehensive usage guide
echo -e "\n${BLUE}9. Creating AI workflow guide...${NC}"

cat > UW_GUIDE.md << 'EOF'
# 🚀 UW - Unified Workflow Quick Guide

## ⚡ Ultra-Short Commands

### 🎯 Super Quick AI Analysis
```bash
# Method 1: Auto-detect (if text has spaces, assumes ai-analyze)
./uw "dashboard 404 errors"                # → ai-analyze
./u "api security problems"                 # → ai-analyze

# Method 2: Explicit shortcuts  
./uw q "websocket connection issues"        # Quick analysis
./uw t "database conflicts"                 # Interactive analysis
./u aa "page builder errors"                # ai-analyze
./u aat "security vulnerabilities"          # ai-analyze interactive
```

### 🔧 Common Operations
```bash
./u c                                       # Check status
./u f "contact page"                        # Regular fix
./u fa "api errors"                         # AI-powered fix
./u sync                                    # Sync all systems
```

### 📚 Component & Library
```bash
./u cp find Button                          # Find component
./u cp create NewComponent                  # Create component
./u lib stats                               # Library statistics
```

### 📋 Logs & SOPs
```bash
./u l search "error"                        # Search logs
./u l recent                                # Recent logs
./u s find "security"                       # Find SOPs
./u s apply API-SECURITY                    # Apply SOP
```

### 📊 Reports
```bash
./u r                                       # Generate report
./u r daily                                 # Daily report
```

## 🤖 AI Workflow Examples

### Quick Problem Solving
```bash
# Ultra-short - just describe the problem
./u "users can't login to admin panel"
./u "homepage loading very slow"
./u "websocket connection keeps dropping"

# With interactive PMO decisions
./u t "critical security vulnerability found"
./u t "database schema needs major changes"
```

### Specific Use Cases
```bash
# Page issues
./u "contact page showing 404 error"
./u t "blog page not rendering properly"

# API problems  
./u "authentication API returning 500"
./u fa "REST endpoints need rate limiting"

# Component issues
./u "button component styling broken"
./u q "form validation not working"

# Performance issues
./u "application startup time too slow"
./u t "memory usage constantly increasing"
```

## 🎮 Workflow Shortcuts

### Development Workflow
```bash
./u c                                       # 1. Check status
./u "fix navbar responsive issues"          # 2. AI analysis & fix
./u sync                                    # 3. Sync everything
./u r                                       # 4. Generate report
```

### Emergency Workflow
```bash
./u t "production server down"              # Interactive emergency mode
# → AI analysis → SOP lookup → PMO decision → Quick fix
```

### Library Management
```bash
./u cp find Modal                           # Find existing Modal
./u cp create Alert                         # Create new Alert
./u lib index                               # Update library index
```

## 🔍 Command Mapping

| Short | Long Command | Description |
|-------|-------------|-------------|
| `./u c` | `./scripts/unified-workflow.sh check` | System status |
| `./u f "problem"` | `./scripts/unified-workflow.sh fix "problem"` | Regular fix |
| `./u fa "problem"` | `./scripts/unified-workflow.sh fix "problem" --ai` | AI fix |
| `./u aa "problem"` | `./scripts/unified-workflow.sh ai-analyze "problem"` | AI analysis |
| `./u aat "problem"` | `./scripts/unified-workflow.sh ai-analyze "problem" true` | Interactive AI |
| `./u q "problem"` | `./scripts/unified-workflow.sh ai-analyze "problem" false` | Quick analysis |
| `./u t "problem"` | `./scripts/unified-workflow.sh ai-analyze "problem" true` | Quick interactive |

## 🏆 Pro Tips

1. **Auto-Detection**: If your first argument has spaces, `./uw` assumes you want AI analysis
2. **Ultra-Short**: Use `./u` instead of `./uw` for maximum speed
3. **Interactive Mode**: Use `t` for problems that might need PMO decisions
4. **Library First**: Always check `./u cp find ComponentName` before creating new ones
5. **Status Check**: Start any session with `./u c` to see system health

## 🚨 Emergency Commands

```bash
./u t "CRITICAL: production down"           # Emergency analysis
./u fa "URGENT: security breach detected"   # Emergency AI fix
./u s find "incident"                       # Find incident SOPs
```

## 📈 Performance Commands  

```bash
./u "slow page load times"                  # Performance analysis
./u "high memory usage"                     # Memory issue analysis
./u "database queries taking too long"      # DB performance
```

Remember: The shorter the command, the faster you can respond to issues! 🚀
EOF

# Also create traditional quickstart
cat > UNIFIED-SYSTEM-QUICKSTART.md << 'TRADEOF'
# 🚀 Unified System Quick Start

## 🤖 AI-Driven Commands (NEW!)

### Super Quick AI Analysis
```bash
./u "dashboard 404 errors"                  # Auto AI analysis
./u t "security vulnerability found"        # Interactive analysis
./u q "performance issues"                  # Quick analysis
./u fa "fix login problems"                 # AI-powered fix
```

### Traditional Long Commands
```bash
./scripts/unified-workflow.sh ai-analyze "problem description"
./scripts/unified-workflow.sh ai-analyze "problem description" true
./scripts/unified-workflow.sh fix "problem" --ai
```

## ⚡ Quick Commands

### Check system status
```bash
./u c                                       # Short
./scripts/unified-workflow.sh check        # Long
```

### Start a fix (with library support)
```bash
./u f "contact-page"                        # Short
./scripts/unified-workflow.sh fix contact-page  # Long
```

### Find reusable component
```bash
./u cp find Button                          # Short
./scripts/unified-workflow.sh component find Button  # Long
```

### Search logs
```bash
./u l search "error"                        # Short
./scripts/unified-workflow.sh log search "error"  # Long
```

### Find relevant SOP
```bash
./u s find "api security"                   # Short
./scripts/unified-workflow.sh sop find "api security"  # Long
```

## 📅 Weekly Tasks

### Sync all systems
```bash
./u sync                                    # Short
./scripts/unified-workflow.sh sync         # Long
```

### Generate report
```bash
./u r weekly                                # Short
./scripts/unified-workflow.sh report weekly  # Long
```

### Clean old logs
```bash
./u l clean                                 # Short
./scripts/unified-workflow.sh log clean    # Long
```

## 🧩 Component Creation

### Create new component
```bash
./u cp create MyComponent                   # Short
./scripts/unified-workflow.sh component create MyComponent  # Long
```

### Update library index
```bash
./u lib index                               # Short
./scripts/unified-workflow.sh library index  # Long
```

## 🎯 AI Analysis Flow

```
Problem/Requirement → Claude/AI Analysis → SOP Understanding → 
Design Action Plan → Conflict Detection → PMO Decision (if conflicts) → 
Library Reuse Check → Implementation → Impact Analysis → 
Commit & Log → Push (with conflict resolution)
```

## 💡 Tips
- **Start with short commands**: `./u` is faster than long commands
- **Use AI analysis**: Let AI help plan your fixes with `./u aa "problem"`
- **Interactive mode**: Use `./u t "problem"` for complex issues requiring PMO decisions
- **Library first**: Always check `./u cp find ComponentName` before creating new ones
- **All actions logged**: Everything is tracked automatically in `_logs/`
- **SOPs integrated**: Relevant SOPs are found and applied automatically
- **Reports available**: Daily/weekly/monthly reports generated
TRADEOF

echo -e "  ${GREEN}✓ Quick start guide created${NC}"

# 10. Run initial sync
echo -e "\n${BLUE}10. Running initial sync...${NC}"
./scripts/unified-workflow.sh sync

# 11. Generate first report
echo -e "\n${BLUE}11. Generating initial report...${NC}"
./scripts/unified-workflow.sh report

echo -e "\n${PURPLE}=== 🎉 AI-Enhanced Unified System Setup Complete! ===${NC}"
echo -e "\n${YELLOW}🚀 Quick Start (AI-Powered):${NC}"
echo -e "1. Check system: ${GREEN}./u c${NC}"
echo -e "2. AI analysis: ${GREEN}./u \"describe your problem\"${NC}"
echo -e "3. Interactive fix: ${GREEN}./u t \"complex issue\"${NC}"
echo -e "4. Read AI guide: ${GREEN}cat UW_GUIDE.md${NC}"
echo -e "\n${YELLOW}📚 Traditional Commands:${NC}"
echo -e "1. Check system: ${GREEN}./scripts/unified-workflow.sh check${NC}"
echo -e "2. Read guide: ${GREEN}cat UNIFIED-SYSTEM-QUICKSTART.md${NC}"
echo -e "3. Start fixing: ${GREEN}./scripts/unified-workflow.sh fix [issue-name]${NC}"
echo -e "\n${BLUE}🤖 AI Features Available:${NC}"
echo -e "- AI-driven problem analysis"
echo -e "- SOP understanding & recommendation"
echo -e "- Conflict detection & PMO decisions"
echo -e "- Library reuse analysis"
echo -e "- Impact analysis"
echo -e "- Smart action planning"
echo -e "\n${BLUE}📁 The system will now:${NC}"
echo -e "- Track all fixes in _logs/ (including AI analysis)"
echo -e "- Use components from _library/"
echo -e "- Follow SOPs from _sop/ and docs/SOPs/"
echo -e "- Generate reports automatically"
echo -e "- Provide ultra-short commands (./u, ./uw)"
echo -e "\n${GREEN}🎯 Start with: ./u \"your first problem\" - Let AI guide you! 🚀${NC}"