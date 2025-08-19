#!/bin/bash

# Start Personal Assistant with Claude AI Integration
# This script runs both the web server and Claude terminal in parallel

echo "🚀 Starting Personal Assistant with AI Integration..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $SERVER_PID 2>/dev/null
    kill $CLAUDE_PID 2>/dev/null
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Personal Assistant + Claude AI Integration    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
echo -e "${CYAN}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the main server in background
echo -e "${GREEN}Starting main server on port 4000...${NC}"
npm run dev > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Server started successfully${NC}"
    echo -e "   ${CYAN}URL: http://localhost:4000/assistant${NC}"
else
    echo -e "${RED}✗ Server failed to start${NC}"
    exit 1
fi

# Start Claude terminal in new terminal window (macOS)
echo -e "${GREEN}Starting Claude AI Terminal...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - open new Terminal window
    osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && ./scripts/claude-terminal.sh"'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && ./scripts/claude-terminal.sh; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && ./scripts/claude-terminal.sh" &
    else
        # Fallback to running in same terminal with screen/tmux
        echo -e "${YELLOW}Opening Claude Terminal in screen session...${NC}"
        screen -dmS claude-terminal bash -c "cd $(pwd) && ./scripts/claude-terminal.sh"
        echo "Use 'screen -r claude-terminal' to attach"
    fi
else
    # Windows/Other - run in background
    ./scripts/claude-terminal.sh &
    CLAUDE_PID=$!
    echo "Claude Terminal PID: $CLAUDE_PID"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           System Ready!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Services running:${NC}"
echo -e "  • Web Interface: ${GREEN}http://localhost:4000/assistant${NC}"
echo -e "  • API Endpoint:  ${GREEN}http://localhost:4000/api/assistant${NC}"
echo -e "  • WebSocket:     ${GREEN}ws://localhost:4000/socket.io${NC}"
echo -e "  • Claude Terminal: ${GREEN}Running in separate window${NC}"
echo ""
echo -e "${YELLOW}Available AI Commands in chat:${NC}"
echo -e "  • ${CYAN}ai [message]${NC} - Chat with Claude"
echo -e "  • ${CYAN}code [requirement]${NC} - Generate code"
echo -e "  • ${CYAN}explain [concept]${NC} - Get explanation"
echo -e "  • ${CYAN}debug [error]${NC} - Debug assistance"
echo -e "  • ${CYAN}analyze [code]${NC} - Code analysis"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep script running and show logs
tail -f server.log