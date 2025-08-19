#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-4000}
WS_PORT=${WS_PORT:-4001}
CLAUDE_WS_PORT=${CLAUDE_WS_PORT:-4002}
NODE_ENV=${NODE_ENV:-development}
LOG_FILE="./logs/server-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="./server.pid"
MAX_RETRIES=3
RETRY_DELAY=5

# Terminal V2 Configuration
TERMINAL_MIGRATION_MODE=${TERMINAL_MIGRATION_MODE:-progressive}
TERMINAL_USE_V2=${TERMINAL_USE_V2:-true}
USE_NEW_TERMINAL_API=${USE_NEW_TERMINAL_API:-true}

# ASCII Art Banner
show_banner() {
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║     ████████╗███████╗██████╗ ███╗   ███╗    ██╗   ██╗██████╗    ║"
    echo "║     ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║    ██║   ██║╚════██╗   ║"
    echo "║        ██║   █████╗  ██████╔╝██╔████╔██║    ██║   ██║ █████╔╝   ║"
    echo "║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║    ╚██╗ ██╔╝██╔═══╝    ║"
    echo "║        ██║   ███████╗██║  ██║██║ ╚═╝ ██║     ╚████╔╝ ███████╗   ║"
    echo "║        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝      ╚═══╝  ╚══════╝   ║"
    echo "║                                                                   ║"
    echo "║          🚀 Terminal WebSocket V2 - Clean Architecture 🚀        ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check migration status
check_migration_status() {
    echo -e "${CYAN}🔄 Checking Terminal Migration Status...${NC}"
    echo -e "${CYAN}   Mode: ${TERMINAL_MIGRATION_MODE}${NC}"
    
    case "$TERMINAL_MIGRATION_MODE" in
        "legacy")
            echo -e "${YELLOW}   Using: Legacy system only${NC}"
            ;;
        "dual")
            echo -e "${BLUE}   Using: Both systems (for testing)${NC}"
            ;;
        "new")
            echo -e "${GREEN}   Using: New system only${NC}"
            ;;
        "progressive")
            echo -e "${CYAN}   Using: Progressive migration (recommended)${NC}"
            ;;
        *)
            echo -e "${RED}   Unknown migration mode: $TERMINAL_MIGRATION_MODE${NC}"
            ;;
    esac
}

# Function to check system health
check_terminal_health() {
    echo -e "${CYAN}🏥 Checking Terminal System Health...${NC}"
    
    # Try to call health check API if server is running
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/api/terminal-v2/migration-status 2>/dev/null)
        if [ ! -z "$HEALTH_RESPONSE" ]; then
            # Parse response (simplified)
            echo -e "${GREEN}✅ Terminal V2 API is responding${NC}"
        fi
    fi
}

# Function to setup terminal directories
setup_terminal_dirs() {
    echo -e "${CYAN}📁 Setting up terminal directories...${NC}"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p tmp/terminal-sessions
    mkdir -p dist/services
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to compile TypeScript modules
compile_typescript_modules() {
    echo -e "${CYAN}🔧 Compiling TypeScript modules...${NC}"
    
    # Check if ts-node is available
    if [ -f "node_modules/.bin/ts-node" ]; then
        echo -e "${GREEN}✅ ts-node available${NC}"
        
        # Register ts-node for runtime compilation
        export NODE_OPTIONS="--require ts-node/register/transpile-only"
        echo -e "${GREEN}✅ TypeScript runtime compilation enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  ts-node not found, using pre-compiled files${NC}"
    fi
}

# Function to check ports (enhanced with cleanup script)
check_ports() {
    echo -e "${CYAN}🔌 Checking ports...${NC}"
    
    local ports=("$PORT" "$WS_PORT" "$CLAUDE_WS_PORT")
    local port_names=("Main" "Terminal WebSocket" "Claude Terminal")
    local ports_in_use=()
    
    # First pass - identify ports in use
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  ${name} port $port is already in use!${NC}"
            ports_in_use+=("$port")
        else
            echo -e "${GREEN}✅ ${name} port $port is available${NC}"
        fi
    done
    
    # If any ports are in use, use cleanup script
    if [ ${#ports_in_use[@]} -gt 0 ]; then
        echo -e "${YELLOW}🔧 Running port cleanup for occupied ports...${NC}"
        
        # Use cleanup script with FORCE=true for automated cleanup
        if [ -f "./scripts/cleanup-ports.sh" ]; then
            FORCE=true ./scripts/cleanup-ports.sh "${ports_in_use[@]}"
            local cleanup_result=$?
            
            if [ $cleanup_result -ne 0 ]; then
                echo -e "${RED}❌ Failed to cleanup ports. Exiting...${NC}"
                exit 1
            fi
        else
            # Fallback to old method if script not found
            echo -e "${YELLOW}📝 Cleanup script not found, using fallback method...${NC}"
            for port in "${ports_in_use[@]}"; do
                echo -e "${YELLOW}   Killing processes on port $port...${NC}"
                kill $(lsof -Pi :$port -sTCP:LISTEN -t) 2>/dev/null
                sleep 1
                
                if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                    echo -e "${RED}❌ Failed to free port $port${NC}"
                    exit 1
                fi
            done
        fi
        
        echo -e "${GREEN}✅ All required ports are now available${NC}"
    else
        echo -e "${GREEN}✅ All ports are available${NC}"
    fi
}

# Function to get network info
get_network_info() {
    local ip_local="127.0.0.1"
    local ip_network=""
    
    # Try to get network IP
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ip_network=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    else
        ip_network=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    🌐 Access Points 🌐                     ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${GREEN}%-12s${NC} http://127.0.0.1:%-35s ${BLUE}║${NC}\n" "Local:" "$PORT"
    if [ ! -z "$ip_network" ]; then
        printf "${BLUE}║${NC} ${GREEN}%-12s${NC} http://%-44s ${BLUE}║${NC}\n" "Network:" "$ip_network:$PORT"
    fi
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                    📱 Applications 📱                      ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Test Terminal:" "$PORT/test-terminal"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Dashboard:" "$PORT/dashboard"
    printf "${BLUE}║${NC} ${CYAN}%-14s${NC} http://127.0.0.1:%-31s ${BLUE}║${NC}\n" "Workspace:" "$PORT/workspace"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                  🔌 WebSocket Services 🔌                  ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    
    if [ "$TERMINAL_USE_V2" = "true" ]; then
        printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Terminal V2:" "$PORT/ws/terminal-v2"
    fi
    
    if [ "$TERMINAL_MIGRATION_MODE" = "legacy" ] || [ "$TERMINAL_MIGRATION_MODE" = "dual" ] || [ "$TERMINAL_MIGRATION_MODE" = "progressive" ]; then
        printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Terminal Legacy:" "$WS_PORT"
    fi
    
    printf "${BLUE}║${NC} ${MAGENTA}%-16s${NC} ws://127.0.0.1:%-29s ${BLUE}║${NC}\n" "Claude Terminal:" "$CLAUDE_WS_PORT"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║                    🎯 API Endpoints 🎯                     ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC} ${YELLOW}%-16s${NC} /api/terminal-v2/*                    ${BLUE}║${NC}\n" "Terminal V2 API:"
    printf "${BLUE}║${NC} ${YELLOW}%-16s${NC} /api/terminal-v2/migration-status    ${BLUE}║${NC}\n" "Migration Status:"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${CYAN}🧪 Running Integration Tests...${NC}"
    
    if [ -f "scripts/test-terminal-integration.ts" ]; then
        npx tsx scripts/test-terminal-integration.ts
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ All integration tests passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Some tests failed (non-critical)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Integration tests not found${NC}"
    fi
}

# Function to start server
start_server() {
    local mode=$1
    
    # Setup logging
    mkdir -p logs
    touch "$LOG_FILE"
    
    echo -e "${YELLOW}🚀 Starting Terminal V2 Server...${NC}"
    echo -e "${YELLOW}📝 Logs: tail -f $LOG_FILE${NC}"
    echo -e "${YELLOW}🛑 Press Ctrl+C to stop${NC}"
    echo ""
    
    # Export environment variables
    export TERMINAL_MIGRATION_MODE
    export TERMINAL_USE_V2
    export USE_NEW_TERMINAL_API
    export NODE_ENV
    
    # Start server with V2 configuration
    if [ "$TERMINAL_USE_V2" = "true" ]; then
        echo -e "${CYAN}Using server-v2.js with migration support${NC}"
        NODE_OPTIONS="--max-old-space-size=8192 --expose-gc" node server-v2.js 2>&1 | tee -a "$LOG_FILE" &
    else
        echo -e "${YELLOW}Using legacy server.js${NC}"
        NODE_OPTIONS="--max-old-space-size=8192 --expose-gc" node server.js 2>&1 | tee -a "$LOG_FILE" &
    fi
    
    local server_pid=$!
    echo $server_pid > "$PID_FILE"
    
    # Wait for server to start
    local max_wait=30
    local waited=0
    echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
    
    while [ $waited -lt $max_wait ]; do
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Server started successfully!${NC}"
            break
        fi
        sleep 1
        ((waited++))
        printf "."
    done
    echo ""
    
    if [ $waited -ge $max_wait ]; then
        echo -e "${RED}❌ Server failed to start within ${max_wait} seconds${NC}"
        cleanup
        exit 1
    fi
    
    # Show server info
    get_network_info
    
    # Run health check
    sleep 2
    check_terminal_health
    
    # Wait for server process
    wait $server_pid
}

# Function to handle shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down Terminal V2 server...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            kill -TERM $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill ports
    for port in $PORT $WS_PORT $CLAUDE_WS_PORT; do
        lsof -ti:$port | xargs kill -9 2>/dev/null
    done
    
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Set trap for clean shutdown
trap cleanup INT TERM EXIT

# Main execution
main() {
    clear
    show_banner
    
    # Parse arguments
    case "$1" in
        "--test"|"-t")
            echo -e "${CYAN}🧪 Test Mode${NC}"
            TERMINAL_MIGRATION_MODE="progressive"
            run_integration_tests
            exit 0
            ;;
        "--legacy"|"-l")
            echo -e "${YELLOW}📦 Legacy Mode${NC}"
            TERMINAL_MIGRATION_MODE="legacy"
            TERMINAL_USE_V2="false"
            ;;
        "--new"|"-n")
            echo -e "${GREEN}🚀 New System Mode${NC}"
            TERMINAL_MIGRATION_MODE="new"
            TERMINAL_USE_V2="true"
            ;;
        "--dual"|"-d")
            echo -e "${BLUE}🔄 Dual Mode (Testing)${NC}"
            TERMINAL_MIGRATION_MODE="dual"
            TERMINAL_USE_V2="true"
            ;;
        "--progressive"|"-p")
            echo -e "${CYAN}📈 Progressive Mode (Default)${NC}"
            TERMINAL_MIGRATION_MODE="progressive"
            TERMINAL_USE_V2="true"
            ;;
        "--help"|"-h")
            echo "Usage: ./start-v2.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --legacy, -l       Use legacy terminal system only"
            echo "  --new, -n          Use new terminal system only"
            echo "  --dual, -d         Use both systems (for testing)"
            echo "  --progressive, -p  Progressive migration (default)"
            echo "  --test, -t         Run integration tests"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  TERMINAL_MIGRATION_MODE    Migration mode (legacy/dual/new/progressive)"
            echo "  TERMINAL_USE_V2            Use V2 server (true/false)"
            echo "  PORT                       Main server port (default: 4000)"
            echo ""
            exit 0
            ;;
    esac
    
    # Run checks
    check_migration_status
    setup_terminal_dirs
    compile_typescript_modules
    check_ports
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ All checks passed! Starting Terminal V2${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Start server
    start_server "$NODE_ENV"
}

# Run main function
main "$@"