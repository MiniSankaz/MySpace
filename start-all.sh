#!/bin/bash

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

# Start API Gateway (Port 4000)
start_service "API Gateway" 4000 \
    "$PWD/services/gateway" \
    "npm run dev > /tmp/gateway.log 2>&1"

# Start User Management Service (Port 4100) with Redis handling
if [ "$REDIS_AVAILABLE" = true ]; then
    start_service "User Management Service" 4100 \
        "$PWD/services/user-management" \
        "npm run dev > /tmp/user-management.log 2>&1"
else
    start_service "User Management Service" 4100 \
        "$PWD/services/user-management" \
        "SKIP_REDIS=true npm run dev > /tmp/user-management.log 2>&1"
fi

# Start AI Assistant Service (Port 4200)
start_service "AI Assistant Service" 4200 \
    "$PWD/services/ai-assistant" \
    "PORT=4200 npm run dev > /tmp/ai-assistant.log 2>&1"

# Start Terminal Service (Port 4300)
start_service "Terminal Service" 4300 \
    "$PWD/services/terminal" \
    "npm run dev > /tmp/terminal.log 2>&1"

# Start Workspace Service (Port 4400)
start_service "Workspace Service" 4400 \
    "$PWD/services/workspace" \
    "npm run dev > /tmp/workspace.log 2>&1"

# Start Portfolio Service (Port 4500)
start_service "Portfolio Service" 4500 \
    "$PWD/services/portfolio" \
    "npm run dev > /tmp/portfolio.log 2>&1"

# Start Market Data Service (Port 4600)
echo -e "${CYAN}⏳ Starting Market Data Service (Port 4600)...${NC}"
if [ -f "$PWD/services/simple-price-api.js" ]; then
    # Use simple price API if available
    start_service "Market Data Service" 4600 \
        "$PWD/services" \
        "node simple-price-api.js > /tmp/market-data.log 2>&1"
elif [ -d "$PWD/services/market-data" ]; then
    # Use full market data service if available
    start_service "Market Data Service" 4600 \
        "$PWD/services/market-data" \
        "npm run dev > /tmp/market-data.log 2>&1"
else
    echo -e "${YELLOW}⚠️  Market Data Service not found - Portfolio will use mock prices${NC}"
fi

echo ""

# =============================================================================
# FRONTEND APPLICATION
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🎨 Starting Frontend Application${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Start Next.js Frontend (Port 3000)
# Note: Using npm run dev which uses server.js with proper WebSocket support
start_service "Next.js Frontend" 3000 \
    "$PWD" \
    "PORT=3000 npm run dev > /tmp/frontend.log 2>&1"

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
check_health "API Gateway" "http://localhost:4000/health" && health_results+=("gateway:ok") || health_results+=("gateway:fail")
check_health "User Management" "http://localhost:4100/health" && health_results+=("user:ok") || health_results+=("user:fail")
check_health "AI Assistant" "http://localhost:4200/health" && health_results+=("ai:ok") || health_results+=("ai:fail")
check_health "Terminal Service" "http://localhost:4300/health" && health_results+=("terminal:ok") || health_results+=("terminal:fail")
check_health "Workspace Service" "http://localhost:4400/health" && health_results+=("workspace:ok") || health_results+=("workspace:fail")
check_health "Portfolio Service" "http://localhost:4500/health" && health_results+=("portfolio:ok") || health_results+=("portfolio:fail")
check_health "Market Data Service" "http://localhost:4600/health" && health_results+=("market:ok") || health_results+=("market:fail")
check_health "Frontend" "http://localhost:3000" && health_results+=("frontend:ok") || health_results+=("frontend:fail")

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
for port in 3000 4000 4100 4200 4300 4400 4500; do
    if check_port $port; then
        running_count=$((running_count + 1))
    else
        failed_count=$((failed_count + 1))
    fi
done

# Display status based on results
# Updated to count 8 services including Market Data
if [ $running_count -eq 8 ]; then
    echo -e "${GREEN}✅ All services started successfully!${NC}\n"
elif [ $running_count -ge 6 ]; then
    echo -e "${YELLOW}⚠️  $running_count/8 services are running${NC}"
    echo -e "${YELLOW}    System is operational with limited functionality${NC}\n"
elif [ $running_count -ge 4 ]; then
    echo -e "${YELLOW}⚠️  Only $running_count/8 services are running${NC}"
    echo -e "${YELLOW}    Check logs for failed services${NC}\n"
else
    echo -e "${RED}❌ Only $running_count/8 services started${NC}"
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
echo "  • Frontend:       http://localhost:3000"
echo "  • API Gateway:    http://localhost:4000"
echo "  • Health Check:   http://localhost:4000/health/all"
echo "  • Market Data API: http://localhost:4600/api/v1/market/quote/AAPL"
echo "  • Prisma Studio:  http://localhost:5555 (run: npx prisma studio)"
echo ""

echo "📈 Real-Time Price API Endpoints:"
echo "  • Single Quote:   GET http://localhost:4600/api/v1/market/quote/:symbol"
echo "  • Multiple Quotes: GET http://localhost:4600/api/v1/market/quotes?symbols=AAPL,GOOGL"
echo "  • Portfolio Value: GET http://localhost:4000/api/v1/portfolios/:id/value"
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
echo "  • Frontend:       tail -f /tmp/frontend.log"
echo ""

echo "🔑 Test Accounts:"
echo "  • User:    portfolio@user.com / Portfolio@2025"
echo "  • Admin:   admin@portfolio.com / Admin@2025"
echo "  • Demo:    demo@portfolio.com / Demo@2025"
echo ""

echo "⚙️  Useful Commands:"
echo "  • Stop all:       pkill -f 'node|npm'"
echo "  • Check ports:    lsof -i :3000,4000,4100,4200,4300,4400,4500"
echo "  • Health check:   curl http://localhost:4000/health/all | jq"
echo "  • Install Redis:  brew install redis (macOS) or apt install redis (Linux)"
echo ""

# Show troubleshooting tips if services failed
if [ $failed_count -gt 0 ]; then
    echo -e "${PURPLE}🔍 Troubleshooting Tips:${NC}"
    echo "  • Check if ports are already in use: lsof -i :4100,4200,4300,4400,4500"
    echo "  • View service logs: tail -f /tmp/*.log"
    echo "  • Kill stuck processes: pkill -f 'node|npm'"
    echo "  • Restart script after fixing issues"
    echo ""
fi

echo -e "${YELLOW}⚠️  Note: Database connection required for full functionality${NC}"
echo -e "${YELLOW}    Run 'npx prisma migrate deploy' if database is not initialized${NC}"
echo ""

if [ $running_count -ge 5 ]; then
    echo -e "${GREEN}🎉 Portfolio Management System is ready!${NC}"
    echo -e "${GREEN}   Open http://localhost:3000 in your browser to get started${NC}"
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
    pkill -f "next dev" 2>/dev/null
    
    # General cleanup
    pkill -f "node|npm" 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM
while true; do sleep 1; done