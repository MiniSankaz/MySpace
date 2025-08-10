#!/bin/bash

# System Health Check Script
# ===========================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "   🔍 SYSTEM HEALTH CHECK REPORT"
echo "========================================="
echo ""

# Overall status
OVERALL_STATUS="GREEN"
ISSUES_FOUND=0

# 1. Check Server Status
echo -e "${BLUE}[1/8] Checking Server Status...${NC}"
if ps aux | grep -q "[n]ode server.js"; then
    echo -e "  ✅ Main server: ${GREEN}RUNNING${NC}"
else
    echo -e "  ❌ Main server: ${RED}NOT RUNNING${NC}"
    OVERALL_STATUS="RED"
    ((ISSUES_FOUND++))
fi

# 2. Check Port Availability
echo -e "${BLUE}[2/8] Checking Ports...${NC}"
for port in 4000 4001 4002; do
    if lsof -i :$port | grep -q LISTEN; then
        echo -e "  ✅ Port $port: ${GREEN}LISTENING${NC}"
    else
        echo -e "  ❌ Port $port: ${RED}NOT LISTENING${NC}"
        OVERALL_STATUS="YELLOW"
        ((ISSUES_FOUND++))
    fi
done

# 3. Check Claude CLI
echo -e "${BLUE}[3/8] Checking Claude CLI...${NC}"
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>&1 || echo "Error")
    if [[ $CLAUDE_VERSION == *"Error"* ]] || [[ $CLAUDE_VERSION == *"Cannot find module"* ]]; then
        echo -e "  ⚠️  Claude CLI: ${YELLOW}INSTALLED BUT BROKEN${NC}"
        OVERALL_STATUS="YELLOW"
        ((ISSUES_FOUND++))
    else
        echo -e "  ✅ Claude CLI: ${GREEN}$CLAUDE_VERSION${NC}"
        
        # Check authentication
        if [ -n "$ANTHROPIC_API_KEY" ] || [ -f ~/.claude/config.json ]; then
            echo -e "  ✅ Authentication: ${GREEN}CONFIGURED${NC}"
        else
            echo -e "  ❌ Authentication: ${RED}NOT CONFIGURED${NC}"
            OVERALL_STATUS="YELLOW"
            ((ISSUES_FOUND++))
        fi
    fi
else
    echo -e "  ❌ Claude CLI: ${RED}NOT INSTALLED${NC}"
    OVERALL_STATUS="RED"
    ((ISSUES_FOUND++))
fi

# 4. Check Database Connection
echo -e "${BLUE}[4/8] Checking Database...${NC}"
DB_CHECK=$(npx prisma db push --skip-generate 2>&1)
if [[ $DB_CHECK == *"successfully"* ]] || [[ $DB_CHECK == *"up to date"* ]]; then
    echo -e "  ✅ Database: ${GREEN}CONNECTED${NC}"
else
    echo -e "  ❌ Database: ${RED}CONNECTION FAILED${NC}"
    OVERALL_STATUS="RED"
    ((ISSUES_FOUND++))
fi

# 5. Check API Health
echo -e "${BLUE}[5/8] Checking API Health...${NC}"
API_RESPONSE=$(curl -s http://127.0.0.1:4000/api/health 2>/dev/null)
if [[ $API_RESPONSE == *'"status":"ok"'* ]]; then
    echo -e "  ✅ API Health: ${GREEN}OK${NC}"
else
    echo -e "  ❌ API Health: ${RED}FAILED${NC}"
    OVERALL_STATUS="RED"
    ((ISSUES_FOUND++))
fi

# 6. Check Node.js Version
echo -e "${BLUE}[6/8] Checking Node.js Version...${NC}"
NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
echo -e "  ℹ️  Node.js: ${BLUE}$NODE_VERSION${NC}"
if [ "$NODE_MAJOR" -ge 22 ]; then
    echo -e "  ⚠️  ${YELLOW}Warning: Node.js v22+ may have issues with Claude CLI${NC}"
    echo -e "  💡 ${YELLOW}Recommendation: Use Node.js v18${NC}"
fi

# 7. Check Recent Errors
echo -e "${BLUE}[7/8] Checking Recent Errors...${NC}"
if [ -f server.log ]; then
    ERROR_COUNT=$(tail -100 server.log | grep -c -i "error" || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "  ⚠️  Recent errors: ${YELLOW}$ERROR_COUNT errors in last 100 lines${NC}"
        if [ "$ERROR_COUNT" -gt 10 ]; then
            OVERALL_STATUS="YELLOW"
        fi
    else
        echo -e "  ✅ Recent errors: ${GREEN}None${NC}"
    fi
else
    echo -e "  ⚠️  Log file: ${YELLOW}NOT FOUND${NC}"
fi

# 8. Check Claude CLI Test
echo -e "${BLUE}[8/8] Testing Claude CLI...${NC}"
CLAUDE_TEST=$(echo "test" | claude 2>&1 | head -1)
if [[ $CLAUDE_TEST == *"Invalid API key"* ]]; then
    echo -e "  ❌ Claude CLI: ${RED}NOT AUTHENTICATED${NC}"
    echo -e "     Run: ${YELLOW}claude login${NC}"
    OVERALL_STATUS="YELLOW"
    ((ISSUES_FOUND++))
elif [[ $CLAUDE_TEST == *"Error"* ]] || [[ $CLAUDE_TEST == *"Cannot find module"* ]]; then
    echo -e "  ❌ Claude CLI: ${RED}ERROR${NC}"
    OVERALL_STATUS="RED"
    ((ISSUES_FOUND++))
else
    echo -e "  ✅ Claude CLI: ${GREEN}WORKING${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "   📊 SUMMARY"
echo "========================================="
echo ""

if [ "$OVERALL_STATUS" == "GREEN" ]; then
    echo -e "Overall Status: ${GREEN}✅ HEALTHY${NC}"
    echo "System is fully operational!"
elif [ "$OVERALL_STATUS" == "YELLOW" ]; then
    echo -e "Overall Status: ${YELLOW}⚠️ MINOR ISSUES${NC}"
    echo "System is operational with $ISSUES_FOUND issue(s) to address."
else
    echo -e "Overall Status: ${RED}🔴 CRITICAL${NC}"
    echo "System has $ISSUES_FOUND critical issue(s) requiring immediate attention!"
fi

echo ""
echo "========================================="

# Recommendations
if [ $ISSUES_FOUND -gt 0 ]; then
    echo ""
    echo "📝 RECOMMENDATIONS:"
    echo "-------------------"
    
    if ! ps aux | grep -q "[n]ode server.js"; then
        echo "• Start server: npm run dev"
    fi
    
    if [ -z "$ANTHROPIC_API_KEY" ] && [ ! -f ~/.claude/config.json ]; then
        echo "• Configure Claude: claude login"
    fi
    
    if [[ $DB_CHECK != *"successfully"* ]] && [[ $DB_CHECK != *"up to date"* ]]; then
        echo "• Fix database: npx prisma migrate dev"
    fi
    
    echo ""
fi

echo "Run './quick-restart.sh' to restart all services"
echo "View logs: tail -f server.log"
echo ""