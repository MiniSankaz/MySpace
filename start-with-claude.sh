#!/bin/bash

echo "🤖 Starting Personal Assistant with Claude Background Service"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Claude CLI not found!${NC}"
    echo "Please install Claude CLI first:"
    echo "  npm install -g @anthropic/claude-cli"
    echo ""
    echo "Starting without Claude background service..."
    export CLAUDE_REALTIME=false
else
    echo -e "${GREEN}✅ Claude CLI found${NC}"
    export CLAUDE_REALTIME=true
fi

# Check if port 4000 is already in use
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 4000 is already in use!${NC}"
    echo "   Stopping existing process..."
    kill $(lsof -Pi :4000 -sTCP:LISTEN -t) 2>/dev/null
    sleep 2
fi

# Build if needed
if [ ! -d ".next" ]; then
    echo -e "${BLUE}📦 Building production bundle...${NC}"
    npm run build
fi

# Function to start Claude in background
start_claude_background() {
    if [ "$CLAUDE_REALTIME" = "true" ]; then
        echo -e "${BLUE}🚀 Starting Claude in background...${NC}"
        
        # Create a named pipe for Claude communication
        CLAUDE_PIPE="/tmp/claude_assistant_pipe"
        if [ ! -p "$CLAUDE_PIPE" ]; then
            mkfifo "$CLAUDE_PIPE"
        fi
        
        # Start Claude in background with output redirected
        (claude --continue < "$CLAUDE_PIPE" 2>&1 | tee -a logs/claude.log) &
        CLAUDE_PID=$!
        
        echo -e "${GREEN}✅ Claude running in background (PID: $CLAUDE_PID)${NC}"
        echo $CLAUDE_PID > .claude.pid
        
        # Keep pipe open
        exec 3>"$CLAUDE_PIPE"
    fi
}

# Function to stop Claude background
stop_claude_background() {
    if [ -f .claude.pid ]; then
        CLAUDE_PID=$(cat .claude.pid)
        echo -e "${YELLOW}Stopping Claude background service (PID: $CLAUDE_PID)...${NC}"
        kill $CLAUDE_PID 2>/dev/null
        rm .claude.pid
        
        # Close pipe
        exec 3>&-
        rm -f /tmp/claude_assistant_pipe
    fi
}

# Trap to clean up on exit
trap stop_claude_background EXIT INT TERM

# Create logs directory if not exists
mkdir -p logs

# Start Claude in background
start_claude_background

# Start the Next.js server
echo ""
echo -e "${GREEN}✅ Starting Personal Assistant server...${NC}"
echo ""
echo -e "${BLUE}📱 Access Points:${NC}"
echo "   Local: http://localhost:4000/assistant"
echo "   Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):4000/assistant"
echo ""

if [ "$CLAUDE_REALTIME" = "true" ]; then
    echo -e "${GREEN}🤖 Claude Features:${NC}"
    echo "   • Real-time Claude integration active"
    echo "   • Background processing enabled"
    echo "   • Chat commands: ai, code, explain, debug, analyze"
    echo ""
fi

echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start server
npm run start