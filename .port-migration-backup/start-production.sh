#!/bin/bash

echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 Personal Assistant - Production Mode       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo -e "${YELLOW}Creating from .env...${NC}"
    cp .env .env.local
fi

# Load environment (properly handle comments and spaces)
set -a
source .env.local
set +a

# Check for Claude mode
if [ "$1" == "--with-claude" ] || [ "$CLAUDE_REALTIME" == "true" ]; then
    echo -e "${BLUE}🤖 Claude Background Mode Enabled${NC}"
    
    # Check if Claude CLI is installed
    if ! command -v claude &> /dev/null; then
        echo -e "${YELLOW}⚠️  Claude CLI not found, continuing without background service${NC}"
        export CLAUDE_REALTIME=false
    else
        export CLAUDE_REALTIME=true
        
        # Start Claude in background
        echo -e "${BLUE}Starting Claude background service...${NC}"
        
        # Create logs directory
        mkdir -p logs
        
        # Stop any existing Claude process
        if [ -f .claude.pid ]; then
            kill $(cat .claude.pid) 2>/dev/null
            rm .claude.pid
        fi
        
        # Start Claude
        ./claude-control.sh start > /dev/null 2>&1
        
        if [ -f .claude.pid ]; then
            echo -e "${GREEN}✅ Claude background service started${NC}"
        fi
    fi
fi

# Check Node modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Generate Prisma Client
echo -e "${BLUE}🔄 Setting up database client...${NC}"
npx prisma generate > /dev/null 2>&1

# Check if we need to build
if [ ! -d ".next" ] || [ "$2" == "--rebuild" ]; then
    echo -e "${YELLOW}🔨 Building application...${NC}"
    NODE_ENV=production npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed${NC}"
        echo -e "${YELLOW}Trying build without linting...${NC}"
        npm run build -- --no-lint
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Build still failed${NC}"
            exit 1
        fi
    fi
fi

# Function to stop Claude on exit
cleanup() {
    if [ "$CLAUDE_REALTIME" == "true" ] && [ -f .claude.pid ]; then
        echo ""
        echo -e "${YELLOW}Stopping Claude background service...${NC}"
        ./claude-control.sh stop > /dev/null 2>&1
    fi
}

# Trap exit signal
trap cleanup EXIT INT TERM

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✨ System Ready!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Get IP address
IP_ADDRESS=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo -e "${BLUE}📍 Access Points:${NC}"
echo -e "   • ${GREEN}Local:${NC}    http://localhost:4000/assistant"
echo -e "   • ${GREEN}Network:${NC}  http://${IP_ADDRESS}:4000/assistant"
echo -e "   • ${GREEN}API:${NC}      http://localhost:4000/api"
echo -e "   • ${GREEN}Health:${NC}   http://localhost:4000/api/health"
echo ""
echo -e "${BLUE}🎯 Features:${NC}"
echo -e "   • ${GREEN}✅${NC} Task Management"
echo -e "   • ${GREEN}✅${NC} Reminders"
echo -e "   • ${GREEN}✅${NC} Notes with search"
echo -e "   • ${GREEN}✅${NC} AI Assistant (17 commands)"
echo -e "   • ${GREEN}✅${NC} Real-time WebSocket"
echo -e "   • ${GREEN}✅${NC} PostgreSQL Database"

if [ "$CLAUDE_REALTIME" == "true" ]; then
    echo -e "   • ${GREEN}🤖${NC} Claude Background Active"
fi

echo ""
echo -e "${BLUE}📝 Usage:${NC}"
echo -e "   ${YELLOW}./start-production.sh${NC}                  # Normal mode"
echo -e "   ${YELLOW}./start-production.sh --with-claude${NC}    # With Claude background"
echo -e "   ${YELLOW}./start-production.sh --rebuild${NC}        # Force rebuild"
echo ""
echo -e "${YELLOW}Starting production server...${NC}"
echo -e "${BLUE}Press Ctrl+C to stop${NC}"
echo ""

# Start production server
NODE_ENV=production npm start