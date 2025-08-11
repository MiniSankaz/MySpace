#!/bin/bash

# Start Staging Services Script
# Generated with Claude Code - Production Deployment Assistant  
# Date: 2025-08-11

set -euo pipefail

# Configuration
STAGING_ENV=".env.staging"
STAGING_PORT=4100
STAGING_WS_PORT=4101
STAGING_CLAUDE_PORT=4102

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Staging Services${NC}"
echo -e "${BLUE}==============================${NC}"

# Check if staging environment exists
if [ ! -f "$STAGING_ENV" ]; then
    echo -e "${RED}❌ Staging environment file not found: $STAGING_ENV${NC}"
    echo "Run ./scripts/staging-setup.sh first"
    exit 1
fi

# Load staging environment
echo -e "${BLUE}📋 Loading staging environment...${NC}"
export $(grep -v '^#' "$STAGING_ENV" | xargs)

# Start the main application in staging mode
echo -e "${BLUE}🌐 Starting main application on port $STAGING_PORT...${NC}"
export NODE_ENV=staging
export PORT=$STAGING_PORT
export WS_TERMINAL_PORT=$STAGING_WS_PORT
export WS_CLAUDE_PORT=$STAGING_CLAUDE_PORT

# Start Next.js in staging mode
npm run build > /dev/null 2>&1
npm run start &
APP_PID=$!

# Wait for main app to start
echo -e "${BLUE}⏳ Waiting for main application to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$STAGING_PORT/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Main application started successfully${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Main application failed to start${NC}"
        exit 1
    fi
    sleep 2
done

# Start WebSocket services
echo -e "${BLUE}🔌 Starting WebSocket services...${NC}"

# Start terminal WebSocket server
export WS_PORT=$STAGING_WS_PORT
node src/server/websocket/terminal-ws-standalone.js &
WS_PID=$!

# Start Claude terminal WebSocket server  
export WS_PORT=$STAGING_CLAUDE_PORT
node src/server/websocket/claude-terminal-ws.js &
CLAUDE_PID=$!

# Wait for WebSocket services to start
sleep 5

# Test WebSocket connections
echo -e "${BLUE}🧪 Testing WebSocket connections...${NC}"
if nc -z localhost $STAGING_WS_PORT && nc -z localhost $STAGING_CLAUDE_PORT; then
    echo -e "${GREEN}✅ WebSocket services started successfully${NC}"
else
    echo -e "${RED}❌ WebSocket services failed to start${NC}"
    kill $APP_PID $WS_PID $CLAUDE_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}🎉 All staging services are running!${NC}"
echo -e "${BLUE}📍 Services:${NC}"
echo -e "   Main App: http://localhost:$STAGING_PORT"
echo -e "   Terminal WebSocket: ws://localhost:$STAGING_WS_PORT"
echo -e "   Claude WebSocket: ws://localhost:$STAGING_CLAUDE_PORT"

# Keep services running
echo -e "${BLUE}🔄 Services are running... Press Ctrl+C to stop${NC}"

# Trap cleanup
cleanup() {
    echo -e "\n${BLUE}🛑 Stopping staging services...${NC}"
    kill $APP_PID $WS_PID $CLAUDE_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Staging services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait for all processes
wait