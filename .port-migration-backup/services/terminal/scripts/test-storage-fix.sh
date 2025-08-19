#!/bin/bash

# Test Terminal Storage Fix Script
# ทดสอบว่าปัญหา session duplication และ loop ได้รับการแก้ไขแล้ว

echo "🔧 Terminal Storage Fix Test Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build
echo -e "${YELLOW}📦 Step 1: Building application...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""

# Step 2: Kill existing processes
echo -e "${YELLOW}🛑 Step 2: Stopping existing processes...${NC}"
pkill -f "node.*server.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:4001 | xargs kill -9 2>/dev/null
lsof -ti:4002 | xargs kill -9 2>/dev/null
echo -e "${GREEN}✅ Processes stopped${NC}"

echo ""

# Step 3: Start server with LOCAL mode (fastest)
echo -e "${YELLOW}🚀 Step 3: Starting server with LOCAL storage...${NC}"
TERMINAL_STORAGE_MODE=LOCAL \
TERMINAL_COMPATIBILITY_MODE=hybrid \
NODE_ENV=development \
npm run dev > /tmp/terminal-storage-test.log 2>&1 &

SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
sleep 10

# Check if server is running
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    echo "Check logs at: /tmp/terminal-storage-test.log"
    tail -20 /tmp/terminal-storage-test.log
    exit 1
fi

echo ""

# Step 4: Test storage info endpoint
echo -e "${YELLOW}🔍 Step 4: Testing storage info endpoint...${NC}"
curl -s http://localhost:4000/api/terminal/storage-info | jq '.' 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Storage info endpoint working${NC}"
else
    echo -e "${YELLOW}⚠️  Storage info endpoint not available${NC}"
fi

echo ""

# Step 5: Show instructions
echo -e "${GREEN}=====================================
✅ System is ready for testing!
=====================================${NC}"
echo ""
echo "📋 Test Instructions:"
echo "1. Open browser: http://localhost:4000/workspace"
echo "2. Login with: sankaz@example.com / Sankaz#3E25167B@2025"
echo "3. Create a new terminal session"
echo "4. Check console logs for any duplicate sessions"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f /tmp/terminal-storage-test.log | grep -E 'LocalStorageProvider|TerminalStorageService'"
echo ""
echo "🛑 To stop server:"
echo "   kill $SERVER_PID"
echo ""
echo "📈 Check storage metrics:"
echo "   curl http://localhost:4000/api/terminal/storage-info | jq '.'"
echo ""