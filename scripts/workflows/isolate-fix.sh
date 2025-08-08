#!/bin/bash
# Skip if called from unified workflow
if [ "$UNIFIED_WORKFLOW" = "true" ]; then
    # Continue with normal isolate-fix flow
    :
else
    # Integration with unified workflow
    if [ -f "./scripts/unified-workflow.sh" ]; then
        # Use unified fix instead if available
        UNIFIED_WORKFLOW=true ./scripts/unified-workflow.sh fix "$@"
        exit $?
    fi
fi

# Isolated Fix Script - แก้ปัญหาแบบแยก branch ไม่กระทบส่วนอื่น
# Usage: ./scripts/isolate-fix.sh [fix-name] [optional-description]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Check if fix name provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a fix name${NC}"
    echo -e "${YELLOW}Usage: $0 [fix-name] [optional-description]${NC}"
    echo -e "${YELLOW}Example: $0 fix-contact-page \"Create missing contact page\"${NC}"
    exit 1
fi

FIX_NAME=$1
DESCRIPTION=${2:-"Working on $FIX_NAME"}
BRANCH_NAME="fix/$FIX_NAME"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/fix_${FIX_NAME}_${TIMESTAMP}.log"

# Create logs directory if not exists
mkdir -p logs

echo -e "${PURPLE}============================================${NC}"
echo -e "${PURPLE}🔧 ISOLATED FIX WORKFLOW${NC}"
echo -e "${PURPLE}============================================${NC}"
echo -e "Fix Name: ${BLUE}$FIX_NAME${NC}"
echo -e "Branch: ${BLUE}$BRANCH_NAME${NC}"
echo -e "Description: ${BLUE}$DESCRIPTION${NC}"
echo -e "${PURPLE}============================================${NC}\n"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Function to run command and check status
run_command() {
    local cmd=$1
    local desc=$2
    
    log "${YELLOW}➤ $desc...${NC}"
    log "Command: $cmd"
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        log "${GREEN}✓ Success${NC}"
        return 0
    else
        log "${RED}✗ Failed${NC}"
        return 1
    fi
}

# Step 1: Check current branch and status
log "${BLUE}Step 1: Checking current status${NC}"

CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo -e "${YELLOW}Do you want to stash them? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_command "git stash push -m 'Auto-stash before $FIX_NAME'" "Stashing changes"
    else
        log "${RED}❌ Please commit or stash your changes first${NC}"
        exit 1
    fi
fi

# Step 2: Update main branch
log "\n${BLUE}Step 2: Updating main branch${NC}"
run_command "git checkout main" "Switching to main branch"
run_command "git pull origin main" "Pulling latest changes"

# Step 3: Create isolated branch
log "\n${BLUE}Step 3: Creating isolated branch${NC}"

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    log "${YELLOW}⚠️  Branch $BRANCH_NAME already exists${NC}"
    echo -e "${YELLOW}Do you want to delete and recreate it? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_command "git branch -D $BRANCH_NAME" "Deleting existing branch"
    else
        run_command "git checkout $BRANCH_NAME" "Switching to existing branch"
        EXISTING_BRANCH=true
    fi
fi

if [ -z "$EXISTING_BRANCH" ]; then
    run_command "git checkout -b $BRANCH_NAME" "Creating new branch"
fi

# Step 4: Run initial tests
log "\n${BLUE}Step 4: Running baseline tests${NC}"

# TypeScript check
log "${YELLOW}Checking TypeScript...${NC}"
npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE" | grep "error TS" | head -5
TS_ERRORS_BEFORE=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
log "TypeScript errors before: $TS_ERRORS_BEFORE"

# Run quick tests
if [ -f "package.json" ] && grep -q "test" package.json; then
    log "${YELLOW}Running quick tests...${NC}"
    npm run test:unit -- --passWithNoTests > /tmp/test_before.log 2>&1 || true
    TESTS_BEFORE=$(grep -E "(passed|failed)" /tmp/test_before.log | tail -1 || echo "No tests")
    log "Test status before: $TESTS_BEFORE"
fi

# Step 5: Show fix guidance
log "\n${BLUE}Step 5: Fix Guidance${NC}"

case "$FIX_NAME" in
    *contact*|*page*)
        cat << EOF | tee -a "$LOG_FILE"
${YELLOW}📝 Creating Missing Page Guide:${NC}
1. Create directory: ${GREEN}mkdir -p src/app/(public)/[page-name]${NC}
2. Create page.tsx with proper metadata
3. Test the route: ${GREEN}curl http://localhost:3100/[page-name]${NC}
4. Add to navigation if needed

${YELLOW}Example page.tsx:${NC}
${GREEN}
export const metadata = { title: 'Page Title' }
export default function PageName() {
  return <div>Content</div>
}
${NC}
EOF
        ;;
    
    *api*|*security*)
        cat << EOF | tee -a "$LOG_FILE"
${YELLOW}🔒 API Security Fix Guide:${NC}
1. Add withApiMiddleware wrapper to all routes
2. Set requireAuth: true/false explicitly
3. Add input validation with Zod
4. Test with: ${GREEN}curl -H "Authorization: Bearer token" http://localhost:3100/api/...${NC}

${YELLOW}Example:${NC}
${GREEN}
export const GET = withApiMiddleware(
  async (req) => { return Response.json({}) },
  { requireAuth: true }
)
${NC}
EOF
        ;;
    
    *typescript*|*type*)
        cat << EOF | tee -a "$LOG_FILE"
${YELLOW}📘 TypeScript Fix Guide:${NC}
1. Run: ${GREEN}npx tsc --noEmit${NC} to see all errors
2. Fix imports and missing types
3. Use 'any' temporarily if needed (mark with TODO)
4. Run type check after each fix

${YELLOW}Common fixes:${NC}
- Add missing return types
- Fix import paths
- Add interface definitions
${NC}
EOF
        ;;
    
    *)
        log "${YELLOW}📋 General Fix Guide:${NC}"
        log "1. Make minimal changes"
        log "2. Test after each change"
        log "3. Document what you did"
        ;;
esac

# Step 6: Create fix tracking file
log "\n${BLUE}Step 6: Setting up fix tracking${NC}"

FIX_TRACK_FILE=".fix-tracking/$FIX_NAME.md"
mkdir -p .fix-tracking

cat > "$FIX_TRACK_FILE" << EOF
# Fix: $FIX_NAME

**Date**: $(date)
**Branch**: $BRANCH_NAME
**Description**: $DESCRIPTION

## Changes Made
- [ ] Change 1
- [ ] Change 2

## Files Modified
\`\`\`
(will be auto-updated)
\`\`\`

## Test Results
\`\`\`
Before: $TS_ERRORS_BEFORE TypeScript errors
After: (pending)
\`\`\`

## Notes
(Add any important notes here)
EOF

log "${GREEN}✓ Fix tracking file created: $FIX_TRACK_FILE${NC}"

# Step 7: Show helpful commands
log "\n${BLUE}Step 7: Helpful Commands${NC}"

cat << EOF | tee -a "$LOG_FILE"

${PURPLE}============================================${NC}
${PURPLE}🛠️  YOU ARE NOW IN ISOLATED FIX MODE${NC}
${PURPLE}============================================${NC}

${YELLOW}Useful commands while fixing:${NC}

${GREEN}# Test your specific changes:${NC}
npm test -- --findRelatedTests [file]

${GREEN}# Check TypeScript errors:${NC}
npx tsc --noEmit

${GREEN}# Test specific route:${NC}
curl http://localhost:3100/[route]

${GREEN}# See what you've changed:${NC}
git status
git diff

${GREEN}# Test impact before committing:${NC}
./scripts/test-impact.sh

${GREEN}# When ready to commit:${NC}
git add .
git commit -m "fix($FIX_NAME): $DESCRIPTION"

${GREEN}# Run full test suite:${NC}
npm test

${GREEN}# If all tests pass, push:${NC}
git push -u origin $BRANCH_NAME

${PURPLE}============================================${NC}
${YELLOW}📝 Next Steps:${NC}
1. Make your fixes
2. Test locally
3. Run impact analysis
4. Commit with descriptive message
5. Push and create PR

${YELLOW}⚠️  Remember:${NC}
- Fix ONLY the intended issue
- Test thoroughly before committing
- Update the tracking file: $FIX_TRACK_FILE
${PURPLE}============================================${NC}

Log file: ${BLUE}$LOG_FILE${NC}
EOF

# Create a helper script for this fix
HELPER_SCRIPT=".fix-tracking/${FIX_NAME}_helper.sh"
cat > "$HELPER_SCRIPT" << 'EOF'
#!/bin/bash

# Helper script for this specific fix

echo "🔍 Checking fix status..."

# Show changed files
echo -e "\n📝 Changed files:"
git diff --name-only main...HEAD

# Run TypeScript check
echo -e "\n📘 TypeScript errors:"
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Test changed files
echo -e "\n🧪 Testing changed files:"
CHANGED_FILES=$(git diff --name-only main...HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
if [ -n "$CHANGED_FILES" ]; then
    npm test -- --findRelatedTests $CHANGED_FILES --passWithNoTests
fi

# Update tracking file
echo -e "\n📋 Updating tracking file..."
cat > .fix-tracking/FIX_NAME.md << TRACKING
# Fix: FIX_NAME

**Date**: $(date)
**Branch**: $(git branch --show-current)

## Changes Made
$(git diff --name-only main...HEAD | sed 's/^/- /')

## Test Results
- TypeScript errors: $(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
- Tests: $(npm test -- --passWithNoTests 2>&1 | grep -E "(passed|failed)" | tail -1)

## Commit History
$(git log main...HEAD --oneline)
TRACKING

echo -e "\n✅ Fix status check complete!"
EOF

# Replace placeholders
sed -i.bak "s/FIX_NAME/$FIX_NAME/g" "$HELPER_SCRIPT" && rm "${HELPER_SCRIPT}.bak"
chmod +x "$HELPER_SCRIPT"

log "\n${GREEN}✓ Helper script created: $HELPER_SCRIPT${NC}"
log "${YELLOW}Run it anytime with: $HELPER_SCRIPT${NC}"

# Final message
log "\n${GREEN}✅ Isolated fix environment ready!${NC}"
log "${BLUE}Happy fixing! Remember: Fix one thing at a time.${NC}"