#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     🚀 Development Mode with Auto-Reload 🚀      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all processes...${NC}"
    pkill -f "tsc.*watch"
    pkill -f "nodemon"
    pkill -f "next dev"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use. Killing process...${NC}"
        npx kill-port $1
        sleep 2
    fi
}

check_port 4000

# Start TypeScript compiler in watch mode
echo -e "${GREEN}📦 Starting TypeScript compiler in watch mode...${NC}"
npx tsc -p tsconfig.server.json --watch &
TSC_PID=$!

# Wait for initial compilation
sleep 3

# Start server with nodemon
echo -e "${GREEN}🔄 Starting server with nodemon...${NC}"
npx nodemon &
NODEMON_PID=$!

# Wait for server to start
sleep 3

# Start Next.js dev server
echo -e "${GREEN}⚡ Starting Next.js development server...${NC}"
npm run dev &
NEXT_PID=$!

# Wait for everything to start
sleep 5

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🌐 App: http://127.0.0.1:4000${NC}"
echo -e "${GREEN}🤖 Assistant: http://127.0.0.1:4000/assistant${NC}"
echo -e "${GREEN}📡 WebSocket: ws://127.0.0.1:4000/socket.io${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Watching for changes...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Keep script running
wait