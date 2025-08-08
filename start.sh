#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-4000}
NODE_ENV=${NODE_ENV:-development}

# Function to display header
show_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         🚀 Personal Assistant System Launcher 🚀          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed!${NC}"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    # Check Prisma
    if [ ! -d "node_modules/.prisma" ]; then
        echo -e "${YELLOW}🗄️ Generating Prisma client...${NC}"
        npx prisma generate
    fi
    
    echo -e "${GREEN}✅ Dependencies OK${NC}"
}

# Function to check and kill port
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $PORT is already in use!${NC}"
        echo -e "${YELLOW}   Stopping existing process...${NC}"
        npx kill-port $PORT 2>/dev/null || kill $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null
        sleep 2
    fi
    echo -e "${GREEN}✅ Port $PORT is available${NC}"
}

# Function to check database
check_database() {
    echo -e "${YELLOW}🔍 Testing database connection...${NC}"
    npx tsx test-db-connection.ts > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connected${NC}"
    else
        echo -e "${YELLOW}⚠️  Database connection failed (will use file fallback)${NC}"
    fi
}

# Function to build if needed
check_build() {
    local need_rebuild=false
    
    # Check if dist exists for server files
    if [ ! -d "dist" ]; then
        echo -e "${YELLOW}📦 Server files not compiled${NC}"
        need_rebuild=true
    fi
    
    # Check if .next exists for Next.js
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}📦 Next.js not built${NC}"
        need_rebuild=true
    fi
    
    # Check if any TypeScript files are newer than dist
    if [ -d "dist" ]; then
        if [ -n "$(find src -name '*.ts' -newer dist/src/lib/socket-server.js 2>/dev/null)" ]; then
            echo -e "${YELLOW}📦 Source files changed${NC}"
            need_rebuild=true
        fi
    fi
    
    if [ "$need_rebuild" = true ]; then
        if [ "$NODE_ENV" = "production" ]; then
            echo -e "${CYAN}🔨 Building for production...${NC}"
            npm run build
            npm run build:server
        else
            echo -e "${CYAN}🔨 Building for development...${NC}"
            npm run build:server
        fi
        echo -e "${GREEN}✅ Build complete${NC}"
    else
        echo -e "${GREEN}✅ Build is up to date${NC}"
    fi
}

# Function to get IP addresses
get_network_info() {
    local ip_local="127.0.0.1"
    local ip_network=""
    
    # Try to get network IP
    if command -v ipconfig &> /dev/null; then
        # macOS
        ip_network=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    elif command -v hostname &> /dev/null; then
        # Linux
        ip_network=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    🌐 Access Points 🌐                     ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}Local:${NC}    http://127.0.0.1:$PORT                          ${BLUE}║${NC}"
    if [ ! -z "$ip_network" ]; then
        printf "${BLUE}║${NC} ${GREEN}Network:${NC}  http://%-44s ${BLUE}║${NC}\n" "$ip_network:$PORT"
    fi
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                    📱 Applications 📱                      ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}Main App:${NC}      http://127.0.0.1:$PORT                     ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}Assistant:${NC}     http://127.0.0.1:$PORT/assistant           ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}API Health:${NC}    http://127.0.0.1:$PORT/api/health          ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}WebSocket:${NC}     ws://127.0.0.1:$PORT/socket.io             ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
}

# Function to select start mode
select_mode() {
    echo -e "${CYAN}Select startup mode:${NC}"
    echo -e "  ${GREEN}1)${NC} Development (hot-reload)"
    echo -e "  ${GREEN}2)${NC} Development (standard)"
    echo -e "  ${GREEN}3)${NC} Production"
    echo -e "  ${GREEN}4)${NC} Custom server.js"
    echo ""
    read -p "Enter choice [1-4] (default: 2): " choice
    
    case $choice in
        1)
            echo -e "${GREEN}Starting in Development mode with hot-reload...${NC}"
            echo -e "${YELLOW}Opening 3 terminals for concurrent processes...${NC}"
            ./scripts/dev-watch.sh
            ;;
        3)
            NODE_ENV=production
            echo -e "${GREEN}Starting in Production mode...${NC}"
            check_dependencies
            check_port
            check_database
            check_build
            get_network_info
            echo ""
            echo -e "${YELLOW}📊 Environment: PRODUCTION${NC}"
            echo -e "${YELLOW}🔒 Optimizations: Enabled${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
            echo ""
            npm run start
            ;;
        4)
            echo -e "${GREEN}Starting with custom server.js...${NC}"
            check_dependencies
            check_port
            check_database
            check_build
            get_network_info
            echo ""
            echo -e "${YELLOW}📊 Environment: $NODE_ENV${NC}"
            echo -e "${YELLOW}🔧 Mode: Custom Server${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
            echo ""
            node server.js
            ;;
        *)
            echo -e "${GREEN}Starting in Development mode...${NC}"
            check_dependencies
            check_port
            check_database
            check_build
            get_network_info
            echo ""
            echo -e "${YELLOW}📊 Environment: DEVELOPMENT${NC}"
            echo -e "${YELLOW}♻️  Hot-reload: Enabled${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
            echo ""
            npm run dev
            ;;
    esac
}

# Function to handle shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    pkill -f "next dev"
    pkill -f "node server.js"
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Set trap for clean shutdown
trap cleanup INT TERM

# Main execution
clear
show_header

# Check if quick mode is requested
if [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
    echo -e "${GREEN}Quick start mode...${NC}"
    check_port
    npm run dev
elif [ "$1" = "--production" ] || [ "$1" = "-p" ]; then
    NODE_ENV=production
    echo -e "${GREEN}Production mode...${NC}"
    check_dependencies
    check_port
    check_database
    check_build
    get_network_info
    echo ""
    npm run start
elif [ "$1" = "--dev-all" ] || [ "$1" = "-d" ]; then
    echo -e "${GREEN}Development with hot-reload...${NC}"
    ./scripts/dev-watch.sh
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: ./start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick, -q       Quick start (skip checks)"
    echo "  --production, -p  Start in production mode"
    echo "  --dev-all, -d     Start with hot-reload (all services)"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Without options: Interactive mode"
    exit 0
else
    # Interactive mode
    select_mode
fi

# Keep script running
wait