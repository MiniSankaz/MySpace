#!/bin/bash

# Source port configuration
if [ -f "$(dirname "$0")/shared/config/ports.sh" ]; then
    source "$(dirname "$0")/shared/config/ports.sh"
else
    # Fallback to default ports if config not found
    PORT_FRONTEND_MAIN=4100
    PORT_FRONTEND_WS=4101
    PORT_GATEWAY_MAIN=4110
    PORT_GATEWAY_WS=4111
    PORT_SERVICE_USER=4120
    PORT_SERVICE_AI=4130
    PORT_SERVICE_TERMINAL=4140
    PORT_SERVICE_WORKSPACE=4150
    PORT_SERVICE_PORTFOLIO=4160
    PORT_SERVICE_MARKET=4170
    PORT_SERVICE_ORCHESTRATION=4190
fi

# =============================================================================
# Portfolio Management System - Complete Startup Script
# =============================================================================
# Usage: ./start-all.sh
# 
# This script starts all services required for the Portfolio Management System
# including Frontend, Backend Microservices, and Database connections
# Now with improved Redis handling and better error recovery
# =============================================================================

# set -e  # Exit on error - Commented out to allow script to continue even if some services fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Portfolio Management System - Complete Startup Script      ║"
echo "║                    Version 3.0.0 (Enhanced)                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Stopping existing $name on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to start service
start_service() {
    local name=$1
    local port=$2
    local path=$3
    local command=$4
    
    echo -e "${BLUE}Starting $name (Port $port)...${NC}"
    
    # Kill existing process if any
    kill_port $port "$name"
    
    # Start the service in a subshell to avoid changing current directory
    (cd "$path" && eval "$command") &
    
    # Wait for service to start
    sleep 3
    
    # Check if service started successfully
    if check_port $port; then
        echo -e "${GREEN}✅ $name started successfully on port $port${NC}"
    else
        echo -e "${RED}❌ Failed to start $name on port $port${NC}"
        return 1
    fi
}

# Function to check service health with timeout
check_health() {
    local name=$1
    local url=$2
    local max_attempts=5
    local attempt=1
    
    echo -n "  Checking $name health"
    
    while [ $attempt -le $max_attempts ]; do
        echo -n "."
        if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✅ Healthy${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e " ${YELLOW}⚠️  Not responding (may still be starting)${NC}"
    return 1
}

# Function to check and start Redis if needed
check_and_start_redis() {
    echo -e "${CYAN}🔧 Checking Redis status...${NC}"
    
    if command -v redis-server &> /dev/null; then
        # Check if Redis is already running
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis is already running${NC}"
            return 0
        else
            # Try to start Redis
            echo -e "${YELLOW}Starting Redis server...${NC}"
            if command -v brew &> /dev/null && brew services list | grep -q redis; then
                # macOS with Homebrew
                brew services start redis > /dev/null 2>&1
                sleep 2
            elif systemctl list-units --type=service | grep -q redis; then
                # Linux with systemd
                sudo systemctl start redis > /dev/null 2>&1
                sleep 2
            else
                # Fallback to direct command
                redis-server --daemonize yes > /dev/null 2>&1
                sleep 2
            fi
            
            # Check if Redis started successfully
            if redis-cli ping > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Redis started successfully${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️  Could not start Redis automatically${NC}"
                return 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Redis is not installed${NC}"
        echo -e "${YELLOW}    Install with: brew install redis (macOS) or apt install redis (Linux)${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📦 Checking environment...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment check passed${NC}\n"

# =============================================================================
# REDIS CHECK AND SETUP
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 Redis Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

REDIS_AVAILABLE=false
if check_and_start_redis; then
    REDIS_AVAILABLE=true
    export REDIS_URL="redis://localhost:6379"
else
    echo -e "${YELLOW}⚠️  Services will run in limited mode without Redis${NC}"
    echo -e "${YELLOW}    Session management and caching features will be disabled${NC}"
    export SKIP_REDIS=true
fi

echo ""

# =============================================================================
# BACKEND MICROSERVICES
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Starting Backend Microservices${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Start API Gateway
start_service "API Gateway" $PORT_GATEWAY_MAIN \
    "$PWD/services/gateway" \
    "PORT=$PORT_GATEWAY_MAIN npm run dev > /tmp/gateway.log 2>&1"

# Start User Management Service with Redis handling
if [ "$REDIS_AVAILABLE" = true ]; then
    start_service "User Management Service" $PORT_SERVICE_USER \
        "$PWD/services/user-management" \
        "PORT=$PORT_SERVICE_USER npm run dev > /tmp/user-management.log 2>&1"
else
    start_service "User Management Service" $PORT_SERVICE_USER \
        "$PWD/services/user-management" \
        "PORT=$PORT_SERVICE_USER SKIP_REDIS=true npm run dev > /tmp/user-management.log 2>&1"
fi

# Start AI Assistant Service
start_service "AI Assistant Service" $PORT_SERVICE_AI \
    "$PWD/services/ai-assistant" \
    "PORT=$PORT_SERVICE_AI npm run dev > /tmp/ai-assistant.log 2>&1"

# Start Terminal Service
start_service "Terminal Service" $PORT_SERVICE_TERMINAL \
    "$PWD/services/terminal" \
    "PORT=$PORT_SERVICE_TERMINAL npm run dev > /tmp/terminal.log 2>&1"

# Start Workspace Service
start_service "Workspace Service" $PORT_SERVICE_WORKSPACE \
    "$PWD/services/workspace" \
    "PORT=$PORT_SERVICE_WORKSPACE npm run dev > /tmp/workspace.log 2>&1"

# Start Portfolio Service
start_service "Portfolio Service" $PORT_SERVICE_PORTFOLIO \
    "$PWD/services/portfolio" \
    "PORT=$PORT_SERVICE_PORTFOLIO npm run dev > /tmp/portfolio.log 2>&1"

# Start Market Data Service
echo -e "${CYAN}⏳ Starting Market Data Service (Port $PORT_SERVICE_MARKET)...${NC}"
if [ -f "$PWD/services/simple-price-api.js" ]; then
    # Use simple price API if available
    start_service "Market Data Service" $PORT_SERVICE_MARKET \
        "$PWD/services" \
        "PORT=$PORT_SERVICE_MARKET node simple-price-api.js > /tmp/market-data.log 2>&1"
elif [ -d "$PWD/services/market-data" ]; then
    # Use full market data service if available
    start_service "Market Data Service" $PORT_SERVICE_MARKET \
        "$PWD/services/market-data" \
        "PORT=$PORT_SERVICE_MARKET npm run dev > /tmp/market-data.log 2>&1"
else
    echo -e "${YELLOW}⚠️  Market Data Service not found - Portfolio will use mock prices${NC}"
fi

# Start AI Orchestration Service
echo -e "${CYAN}🤖 Starting AI Orchestration Service (Port $PORT_SERVICE_ORCHESTRATION)...${NC}"
if [ -f "$PWD/services/ai-assistant/src/orchestration-runner.ts" ]; then
    start_service "AI Orchestration Service" $PORT_SERVICE_ORCHESTRATION \
        "$PWD/services/ai-assistant" \
        "ORCHESTRATION_PORT=$PORT_SERVICE_ORCHESTRATION NODE_ENV=development npx tsx src/orchestration-runner.ts > /tmp/orchestration.log 2>&1"
else
    echo -e "${YELLOW}⚠️  AI Orchestration Service not found - Parallel agent features disabled${NC}"
fi

echo ""

# =============================================================================
# FRONTEND APPLICATION
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🎨 Starting Frontend Application${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Start Next.js Frontend
# Note: Using npm run dev which uses server.js with proper WebSocket support
start_service "Next.js Frontend" $PORT_FRONTEND_MAIN \
    "$PWD" \
    "PORT=$PORT_FRONTEND_MAIN npm run dev > /tmp/frontend.log 2>&1"

echo ""

# =============================================================================
# HEALTH CHECKS
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🏥 Running Health Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${CYAN}Waiting for services to initialize...${NC}"
sleep 5  # Give services time to fully initialize

# Run health checks without stopping on failure
health_results=()
check_health "API Gateway" "http://localhost:$PORT_GATEWAY_MAIN/health" && health_results+=("gateway:ok") || health_results+=("gateway:fail")
check_health "User Management" "http://localhost:$PORT_SERVICE_USER/health" && health_results+=("user:ok") || health_results+=("user:fail")
check_health "AI Assistant" "http://localhost:$PORT_SERVICE_AI/health" && health_results+=("ai:ok") || health_results+=("ai:fail")
check_health "Terminal Service" "http://localhost:$PORT_SERVICE_TERMINAL/health" && health_results+=("terminal:ok") || health_results+=("terminal:fail")
check_health "Workspace Service" "http://localhost:$PORT_SERVICE_WORKSPACE/health" && health_results+=("workspace:ok") || health_results+=("workspace:fail")
check_health "Portfolio Service" "http://localhost:$PORT_SERVICE_PORTFOLIO/health" && health_results+=("portfolio:ok") || health_results+=("portfolio:fail")
check_health "Market Data Service" "http://localhost:$PORT_SERVICE_MARKET/health" && health_results+=("market:ok") || health_results+=("market:fail")
check_health "AI Orchestration" "http://localhost:$PORT_SERVICE_ORCHESTRATION/health" && health_results+=("orchestration:ok") || health_results+=("orchestration:fail")
check_health "Frontend" "http://localhost:$PORT_FRONTEND_MAIN" && health_results+=("frontend:ok") || health_results+=("frontend:fail")

echo ""

# =============================================================================
# SUMMARY
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Startup Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Count running services
running_count=0
failed_count=0
for port in $PORT_FRONTEND_MAIN $PORT_GATEWAY_MAIN $PORT_SERVICE_USER $PORT_SERVICE_AI $PORT_SERVICE_TERMINAL $PORT_SERVICE_WORKSPACE $PORT_SERVICE_PORTFOLIO $PORT_SERVICE_MARKET $PORT_SERVICE_ORCHESTRATION; do
    if check_port $port; then
        running_count=$((running_count + 1))
    else
        failed_count=$((failed_count + 1))
    fi
done

# Display status based on results
# Updated to count 9 services including AI Orchestration
if [ $running_count -eq 9 ]; then
    echo -e "${GREEN}✅ All services started successfully!${NC}\n"
elif [ $running_count -ge 7 ]; then
    echo -e "${YELLOW}⚠️  $running_count/9 services are running${NC}"
    echo -e "${YELLOW}    System is operational with limited functionality${NC}\n"
elif [ $running_count -ge 5 ]; then
    echo -e "${YELLOW}⚠️  Only $running_count/9 services are running${NC}"
    echo -e "${YELLOW}    Check logs for failed services${NC}\n"
else
    echo -e "${RED}❌ Only $running_count/9 services started${NC}"
    echo -e "${RED}    System may not be functional. Check logs for errors${NC}\n"
fi

# Show Redis status
if [ "$REDIS_AVAILABLE" = true ]; then
    echo -e "${GREEN}✅ Redis: Connected - Full features available${NC}"
else
    echo -e "${YELLOW}⚠️  Redis: Not available - Running in limited mode${NC}"
    echo -e "${YELLOW}    Session management and caching disabled${NC}"
fi
echo ""

echo "🌐 Access Points:"
echo "  • Frontend:       http://localhost:$PORT_FRONTEND_MAIN"
echo "  • API Gateway:    http://localhost:$PORT_GATEWAY_MAIN"
echo "  • Health Check:   http://localhost:$PORT_GATEWAY_MAIN/health/all"
echo "  • Market Data API: http://localhost:$PORT_SERVICE_MARKET/api/v1/market/quote/AAPL"
echo "  • AI Orchestration: http://localhost:$PORT_SERVICE_ORCHESTRATION"
echo "  • Approval Dashboard: http://localhost:$PORT_FRONTEND_MAIN/approval-dashboard.html"
echo "  • Prisma Studio:  http://localhost:5555 (run: npx prisma studio)"
echo ""

echo "📈 Real-Time Price API Endpoints:"
echo "  • Single Quote:   GET http://localhost:$PORT_SERVICE_MARKET/api/v1/market/quote/:symbol"
echo "  • Multiple Quotes: GET http://localhost:$PORT_SERVICE_MARKET/api/v1/market/quotes?symbols=AAPL,GOOGL"
echo "  • Portfolio Value: GET http://localhost:$PORT_GATEWAY_MAIN/api/v1/portfolios/:id/value"
echo "  • Available Symbols: AAPL, GOOGL, MSFT, TSLA, AMZN, META, NVDA, JPM, V, JNJ"
echo ""

echo "📝 Service Logs:"
echo "  • Gateway:        tail -f /tmp/gateway.log"
echo "  • User Service:   tail -f /tmp/user-management.log"
echo "  • AI Service:     tail -f /tmp/ai-assistant.log"
echo "  • Terminal:       tail -f /tmp/terminal.log"
echo "  • Workspace:      tail -f /tmp/workspace.log"
echo "  • Portfolio:      tail -f /tmp/portfolio.log"
echo "  • Market Data:    tail -f /tmp/market-data.log"
echo "  • Orchestration:  tail -f /tmp/orchestration.log"
echo "  • Frontend:       tail -f /tmp/frontend.log"
echo ""

echo "🔑 Test Accounts:"
echo "  • User:    portfolio@user.com / Portfolio@2025"
echo "  • Admin:   admin@portfolio.com / Admin@2025"
echo "  • Demo:    demo@portfolio.com / Demo@2025"
echo ""

echo "⚙️  Useful Commands:"
echo "  • Stop all:       pkill -f 'node|npm'"
echo "  • Check ports:    lsof -i :$PORT_FRONTEND_MAIN,$PORT_GATEWAY_MAIN,$PORT_SERVICE_USER,$PORT_SERVICE_AI,$PORT_SERVICE_TERMINAL,$PORT_SERVICE_WORKSPACE,$PORT_SERVICE_PORTFOLIO,$PORT_SERVICE_ORCHESTRATION"
echo "  • Health check:   curl http://localhost:$PORT_GATEWAY_MAIN/health/all | jq"
echo "  • Spawn agents:   ./orchestrate-ai.sh spawn business-analyst 'Analyze requirements'"
echo "  • Install Redis:  brew install redis (macOS) or apt install redis (Linux)"
echo ""

# Show troubleshooting tips if services failed
if [ $failed_count -gt 0 ]; then
    echo -e "${PURPLE}🔍 Troubleshooting Tips:${NC}"
    echo "  • Check if ports are already in use: lsof -i :$PORT_SERVICE_USER,$PORT_SERVICE_AI,$PORT_SERVICE_TERMINAL,$PORT_SERVICE_WORKSPACE,$PORT_SERVICE_PORTFOLIO"
    echo "  • View service logs: tail -f /tmp/*.log"
    echo "  • Kill stuck processes: pkill -f 'node|npm'"
    echo "  • Restart script after fixing issues"
    echo ""
fi

echo -e "${YELLOW}⚠️  Note: Database connection required for full functionality${NC}"
echo -e "${YELLOW}    Run 'npx prisma migrate deploy' if database is not initialized${NC}"
echo ""

# AI Orchestration CLI Tools
echo -e "${CYAN}🛠️  AI Orchestration CLI Tools:${NC}"
echo "  • Quick Helper:       ./cli-tools.sh (shows all commands)"
echo "  • Approval Monitor:   ./cli-tools.sh approval"
echo "  • Agent Manager:      ./cli-tools.sh agents"
echo "  • Web Dashboard:      ./cli-tools.sh dashboard"
echo "  • Service Health:     ./cli-tools.sh health"
echo ""
echo -e "${CYAN}🌐 Web Interfaces:${NC}"
echo "  • Orchestration API:  http://localhost:$PORT_SERVICE_ORCHESTRATION/health"
echo "  • Dashboard:          http://localhost:$PORT_FRONTEND_MAIN/orchestration"
echo "  • Approval UI:        http://localhost:$PORT_FRONTEND_MAIN/approval-dashboard.html"
echo ""

if [ $running_count -ge 5 ]; then
    echo -e "${GREEN}🎉 Portfolio Management System is ready!${NC}"
    echo -e "${GREEN}   Open http://localhost:$PORT_FRONTEND_MAIN in your browser to get started${NC}"
    echo -e "${GREEN}   AI Orchestration: http://localhost:$PORT_SERVICE_ORCHESTRATION/health${NC}"
else
    echo -e "${YELLOW}⚠️  Some services failed to start. Check the logs above for details.${NC}"
fi
echo ""

# Keep script running to maintain services
echo -e "${BLUE}Press Ctrl+C to stop all services...${NC}"

# Improved cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping all services...${NC}"
    
    # Kill all node processes related to our services
    pkill -f "node.*gateway" 2>/dev/null
    pkill -f "node.*user-management" 2>/dev/null
    pkill -f "node.*ai-assistant" 2>/dev/null
    pkill -f "node.*terminal" 2>/dev/null
    pkill -f "node.*workspace" 2>/dev/null
    pkill -f "node.*portfolio" 2>/dev/null
    pkill -f "node.*orchestration" 2>/dev/null
    pkill -f "tsx.*orchestration-runner" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    
    # General cleanup
    pkill -f "node|npm" 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM
while true; do sleep 1; done