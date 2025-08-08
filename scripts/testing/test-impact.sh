#!/bin/bash

# Test Impact Analysis Script - ตรวจสอบผลกระทบของการแก้ไข
# Usage: ./scripts/test-impact.sh

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}============================================${NC}"
echo -e "${PURPLE}🔍 IMPACT ANALYSIS${NC}"
echo -e "${PURPLE}============================================${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "Current branch: ${BLUE}$CURRENT_BRANCH${NC}"

# Check if on main branch
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo -e "${RED}❌ Warning: You're on main branch!${NC}"
    echo -e "${YELLOW}Please use an isolated branch for fixes${NC}"
    exit 1
fi

# Create temp directory for results
RESULTS_DIR="test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Function to run test and capture result
test_category() {
    local name=$1
    local command=$2
    local output_file="$RESULTS_DIR/${name// /_}.log"
    
    echo -e "\n${YELLOW}Testing $name...${NC}"
    
    if eval "$command" > "$output_file" 2>&1; then
        echo -e "${GREEN}✓ $name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $name failed${NC}"
        return 1
    fi
}

# 1. Changed Files Analysis
echo -e "\n${BLUE}1️⃣ Changed Files Analysis${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

CHANGED_FILES=$(git diff --name-only main...HEAD)
CHANGED_COUNT=$(echo "$CHANGED_FILES" | grep -c .)

echo -e "Files changed: ${YELLOW}$CHANGED_COUNT${NC}"
echo "$CHANGED_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        echo -e "  📝 $file"
    fi
done

# Categorize changes
echo -e "\n${YELLOW}Change Categories:${NC}"
COMPONENT_CHANGES=$(echo "$CHANGED_FILES" | grep -c "components/" || true)
API_CHANGES=$(echo "$CHANGED_FILES" | grep -c "api/" || true)
SERVICE_CHANGES=$(echo "$CHANGED_FILES" | grep -c "services/" || true)
CONFIG_CHANGES=$(echo "$CHANGED_FILES" | grep -E -c "(tsconfig|package\.json|\.env)" || true)

[ $COMPONENT_CHANGES -gt 0 ] && echo -e "  🎨 UI Components: $COMPONENT_CHANGES files"
[ $API_CHANGES -gt 0 ] && echo -e "  🔌 API Routes: $API_CHANGES files"
[ $SERVICE_CHANGES -gt 0 ] && echo -e "  ⚙️  Services: $SERVICE_CHANGES files"
[ $CONFIG_CHANGES -gt 0 ] && echo -e "  📋 Config: $CONFIG_CHANGES files"

# 2. TypeScript Impact
echo -e "\n${BLUE}2️⃣ TypeScript Impact${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

# Check TypeScript before and after
echo -n "TypeScript errors before: "
git stash -q
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
git stash pop -q > /dev/null 2>&1

echo -n "TypeScript errors now: "
CURRENT_TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
echo "$CURRENT_TS_ERRORS"

if [ "$CURRENT_TS_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  TypeScript errors found:${NC}"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -5
fi

# 3. Test Impact
echo -e "\n${BLUE}3️⃣ Test Impact${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

# Run tests for changed files
CHANGED_TEST_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx)$' | grep -v test | tr '\n' ' ')
if [ -n "$CHANGED_TEST_FILES" ]; then
    echo -e "${YELLOW}Running tests for changed files...${NC}"
    npm test -- --findRelatedTests $CHANGED_TEST_FILES --passWithNoTests > "$RESULTS_DIR/related_tests.log" 2>&1 || true
    
    # Extract test results
    if grep -q "PASS" "$RESULTS_DIR/related_tests.log"; then
        echo -e "${GREEN}✓ Related tests passed${NC}"
    else
        echo -e "${RED}✗ Some related tests failed${NC}"
        grep -E "(FAIL|Error)" "$RESULTS_DIR/related_tests.log" | head -5
    fi
else
    echo -e "${YELLOW}No testable files changed${NC}"
fi

# 4. Route Impact
echo -e "\n${BLUE}4️⃣ Route Impact${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

# Check if any routes were affected
ROUTE_CHANGES=$(echo "$CHANGED_FILES" | grep -E "(page\.tsx|route\.ts)" | wc -l)
if [ $ROUTE_CHANGES -gt 0 ]; then
    echo -e "${YELLOW}Routes affected: $ROUTE_CHANGES${NC}"
    
    # Test affected routes
    echo "$CHANGED_FILES" | grep -E "(page\.tsx|route\.ts)" | while read -r file; do
        # Extract route from file path
        ROUTE=$(echo "$file" | sed -E 's|src/app||' | sed -E 's|/page\.tsx||' | sed -E 's|/route\.ts||' | sed 's|(public)/||' | sed 's|/\[.*\]|/{param}|g')
        [ -z "$ROUTE" ] && ROUTE="/"
        
        echo -n "  Testing route $ROUTE: "
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3100$ROUTE" 2>/dev/null || echo "fail")
        
        case $STATUS in
            200) echo -e "${GREEN}✓ 200 OK${NC}" ;;
            307) echo -e "${YELLOW}↩ 307 Redirect${NC}" ;;
            404) echo -e "${RED}✗ 404 Not Found${NC}" ;;
            *) echo -e "${RED}✗ Failed ($STATUS)${NC}" ;;
        esac
    done
else
    echo -e "${GREEN}✓ No routes affected${NC}"
fi

# 5. API Impact
echo -e "\n${BLUE}5️⃣ API Impact${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

API_ROUTE_CHANGES=$(echo "$CHANGED_FILES" | grep -E "api/.*/route\.ts" | wc -l)
if [ $API_ROUTE_CHANGES -gt 0 ]; then
    echo -e "${YELLOW}API routes affected: $API_ROUTE_CHANGES${NC}"
    
    # List affected APIs
    echo "$CHANGED_FILES" | grep -E "api/.*/route\.ts" | while read -r file; do
        API_PATH=$(echo "$file" | sed -E 's|src/app||' | sed -E 's|/route\.ts||')
        echo "  🔌 $API_PATH"
    done
    
    echo -e "${YELLOW}Remember to test API authentication!${NC}"
else
    echo -e "${GREEN}✓ No API routes affected${NC}"
fi

# 6. Module Dependencies
echo -e "\n${BLUE}6️⃣ Module Dependencies${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

# Check which modules might be affected
AFFECTED_MODULES=$(echo "$CHANGED_FILES" | grep -oE "modules/[^/]+" | sort -u)
if [ -n "$AFFECTED_MODULES" ]; then
    echo -e "${YELLOW}Modules potentially affected:${NC}"
    echo "$AFFECTED_MODULES" | while read -r module; do
        echo -e "  📦 $module"
        
        # Check if module exports changed
        if echo "$CHANGED_FILES" | grep -q "$module/index.ts"; then
            echo -e "    ${RED}⚠️  Module exports changed - check all imports!${NC}"
        fi
    done
else
    echo -e "${GREEN}✓ No module changes${NC}"
fi

# 7. Build Test
echo -e "\n${BLUE}7️⃣ Build Test${NC}"
echo -e "${PURPLE}--------------------------------${NC}"

echo -e "${YELLOW}Running build test...${NC}"
if npm run build > "$RESULTS_DIR/build.log" 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo -e "${RED}Check $RESULTS_DIR/build.log for details${NC}"
fi

# 8. Summary Report
echo -e "\n${PURPLE}============================================${NC}"
echo -e "${PURPLE}📊 IMPACT SUMMARY${NC}"
echo -e "${PURPLE}============================================${NC}"

# Count issues
ISSUES=0
[ $CURRENT_TS_ERRORS -gt 0 ] && ((ISSUES++))
[ -f "$RESULTS_DIR/build.log" ] && ! grep -q "success" "$RESULTS_DIR/build.log" 2>/dev/null && ((ISSUES++))

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No negative impact detected!${NC}"
    echo -e "${GREEN}Your changes appear to be safe.${NC}"
else
    echo -e "${RED}⚠️  Found $ISSUES potential issues${NC}"
    echo -e "${YELLOW}Please review and fix before merging.${NC}"
fi

echo -e "\n${YELLOW}Recommendations:${NC}"
echo -e "1. Fix any TypeScript errors"
echo -e "2. Ensure all tests pass"
echo -e "3. Test affected routes manually"
echo -e "4. Update documentation if needed"

# Generate impact report
REPORT_FILE="$RESULTS_DIR/impact-report.md"
cat > "$REPORT_FILE" << EOF
# Impact Analysis Report

**Date**: $(date)
**Branch**: $CURRENT_BRANCH
**Files Changed**: $CHANGED_COUNT

## Change Summary
- Components: $COMPONENT_CHANGES files
- APIs: $API_CHANGES files  
- Services: $SERVICE_CHANGES files
- Config: $CONFIG_CHANGES files

## TypeScript Status
- Errors: $CURRENT_TS_ERRORS

## Test Results
$(grep -E "(PASS|FAIL)" "$RESULTS_DIR/related_tests.log" 2>/dev/null | tail -5 || echo "No test results")

## Build Status
$(tail -1 "$RESULTS_DIR/build.log" 2>/dev/null || echo "Not tested")

## Risk Assessment
$([ $ISSUES -eq 0 ] && echo "✅ LOW RISK - Safe to proceed" || echo "⚠️ MEDIUM RISK - Review needed")

## Files Changed
\`\`\`
$CHANGED_FILES
\`\`\`
EOF

echo -e "\n${BLUE}📄 Full report saved to: $REPORT_FILE${NC}"
echo -e "${PURPLE}============================================${NC}"

# Exit with appropriate code
exit $ISSUES