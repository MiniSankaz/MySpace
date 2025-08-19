#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Test Multi-Terminal System
echo "🧪 Testing Multi-Terminal System"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${CYAN}🔍 Checking server status...${NC}"
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Main server (port 4000) is running${NC}"
else
    echo -e "${RED}❌ Main server is not running${NC}"
    echo "Please start server first: npm run dev"
    exit 1
fi

if lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Terminal WebSocket (port 4001) is running${NC}"
else
    echo -e "${YELLOW}⚠️  Terminal WebSocket not detected on port 4001${NC}"
fi

echo ""

# Test terminal creation via API
echo -e "${CYAN}📝 Testing terminal creation API...${NC}"

# Create first terminal
echo -e "${YELLOW}Creating Terminal 1...${NC}"
RESPONSE1=$(curl -s -X POST http://localhost:$PORT_GATEWAY_MAIN/api/terminal/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project-001",
    "projectPath": "/tmp/test-project",
    "mode": "normal"
  }')

SESSION_ID1=$(echo $RESPONSE1 | jq -r '.session.id')
if [ "$SESSION_ID1" != "null" ] && [ ! -z "$SESSION_ID1" ]; then
    echo -e "${GREEN}✅ Terminal 1 created: $SESSION_ID1${NC}"
else
    echo -e "${RED}❌ Failed to create Terminal 1${NC}"
    echo "Response: $RESPONSE1"
fi

# Small delay
sleep 1

# Create second terminal
echo -e "${YELLOW}Creating Terminal 2...${NC}"
RESPONSE2=$(curl -s -X POST http://localhost:$PORT_GATEWAY_MAIN/api/terminal/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project-001",
    "projectPath": "/tmp/test-project",
    "mode": "normal"
  }')

SESSION_ID2=$(echo $RESPONSE2 | jq -r '.session.id')
if [ "$SESSION_ID2" != "null" ] && [ ! -z "$SESSION_ID2" ]; then
    echo -e "${GREEN}✅ Terminal 2 created: $SESSION_ID2${NC}"
else
    echo -e "${RED}❌ Failed to create Terminal 2${NC}"
    echo "Response: $RESPONSE2"
fi

# Small delay
sleep 1

# Create third terminal
echo -e "${YELLOW}Creating Terminal 3...${NC}"
RESPONSE3=$(curl -s -X POST http://localhost:$PORT_GATEWAY_MAIN/api/terminal/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project-001",
    "projectPath": "/tmp/test-project",
    "mode": "normal"
  }')

SESSION_ID3=$(echo $RESPONSE3 | jq -r '.session.id')
if [ "$SESSION_ID3" != "null" ] && [ ! -z "$SESSION_ID3" ]; then
    echo -e "${GREEN}✅ Terminal 3 created: $SESSION_ID3${NC}"
else
    echo -e "${RED}❌ Failed to create Terminal 3${NC}"
    echo "Response: $RESPONSE3"
fi

echo ""

# List all terminals
echo -e "${CYAN}📋 Listing all terminals for project...${NC}"
LIST_RESPONSE=$(curl -s http://localhost:$PORT_GATEWAY_MAIN/api/terminal/list?projectId=test-project-001)
SESSION_COUNT=$(echo $LIST_RESPONSE | jq '.sessions | length')

echo -e "${GREEN}Found $SESSION_COUNT active sessions${NC}"

# Show session details
echo $LIST_RESPONSE | jq -r '.sessions[] | "\(.tabName) - ID: \(.id) - Status: \(.status) - Focused: \(.isFocused)"'

echo ""

# Test storage info
echo -e "${CYAN}📊 Storage System Info:${NC}"
STORAGE_INFO=$(curl -s http://localhost:$PORT_GATEWAY_MAIN/api/terminal/storage-info)
echo $STORAGE_INFO | jq '.'

echo ""

# Test focus management
echo -e "${CYAN}🎯 Testing focus management...${NC}"
if [ ! -z "$SESSION_ID2" ]; then
    FOCUS_RESPONSE=$(curl -s -X POST http://localhost:$PORT_GATEWAY_MAIN/api/terminal/focus \
      -H "Content-Type: application/json" \
      -d "{
        \"sessionId\": \"$SESSION_ID2\",
        \"focused\": true
      }")
    
    if [ "$(echo $FOCUS_RESPONSE | jq -r '.success')" == "true" ]; then
        echo -e "${GREEN}✅ Successfully changed focus to Terminal 2${NC}"
    else
        echo -e "${YELLOW}⚠️  Focus change may have failed${NC}"
    fi
fi

echo ""

# Final summary
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}📊 Test Summary:${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

if [ "$SESSION_COUNT" -ge 3 ]; then
    echo -e "${GREEN}✅ Multi-terminal creation: PASSED${NC}"
    echo -e "${GREEN}   Created $SESSION_COUNT terminals successfully${NC}"
else
    echo -e "${RED}❌ Multi-terminal creation: FAILED${NC}"
    echo -e "${RED}   Only $SESSION_COUNT terminals created${NC}"
fi

# Check for duplicate sessions
UNIQUE_COUNT=$(echo $LIST_RESPONSE | jq -r '.sessions[].id' | sort -u | wc -l)
if [ "$UNIQUE_COUNT" -eq "$SESSION_COUNT" ]; then
    echo -e "${GREEN}✅ No duplicate sessions detected${NC}"
else
    echo -e "${RED}❌ Duplicate sessions found!${NC}"
fi

echo ""
echo -e "${CYAN}💡 Next Steps:${NC}"
echo "1. Open browser: http://localhost:$PORT_GATEWAY_MAIN/workspace"
echo "2. Login and check if all terminals are visible"
echo "3. Test switching between terminals"
echo "4. Verify that each terminal shows output correctly"
echo ""
echo -e "${CYAN}🔍 Monitor logs:${NC}"
echo "   grep -E 'TerminalStorageService|LocalStorageProvider|Terminal WS' server.log | tail -20"
echo ""