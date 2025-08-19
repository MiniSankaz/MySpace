#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# =============================================================================
# Portfolio Management System - Complete Startup Script (FIXED)
# =============================================================================
# Usage: ./start-all-fixed.sh
# 
# This script starts all services required for the Portfolio Management System
# Fixed version that handles Redis connection issues gracefully
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Portfolio Management System - Complete Startup Script      ║"
echo "║                  Version 3.0.0 (FIXED)                        ║"
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
    
    echo -e " ${YELLOW}⚠️  Not responding (might be OK if service doesn't require Redis)${NC}"
    return 1
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
# OPTIONAL: REDIS (if available)
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 Checking Redis (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

if command -v redis-server &> /dev/null; then
    # Check if Redis is already running
    if ! pgrep -x "redis-server" > /dev/null 2>&1; then
        echo -e "${YELLOW}Starting Redis server...${NC}"
        redis-server --daemonize yes > /dev/null 2>&1
        sleep 2
    fi
    
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis is installed but not responding${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis is not installed - services will run in limited mode${NC}"
    echo -e "${YELLOW}    Some features like session management may not work${NC}"
fi

echo ""

# =============================================================================
# BACKEND MICROSERVICES
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Starting Backend Microservices${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Set environment variable to skip Redis for User Management if Redis is not available
if ! redis-cli ping > /dev/null 2>&1; then
    export SKIP_REDIS=true
    echo -e "${YELLOW}Setting SKIP_REDIS=true for services${NC}\n"
fi

# Start API Gateway (Port 4000)
start_service "API Gateway" 4000 \
    "$PWD/services/gateway" \
    "npm run dev > /tmp/gateway.log 2>&1"

# Start User Management Service (Port 4100) with Redis skip if needed
if [ "$SKIP_REDIS" = "true" ]; then
    start_service "User Management Service" 4100 \
        "$PWD/services/user-management" \
        "SKIP_REDIS=true npm run dev > /tmp/user-management.log 2>&1"
else
    start_service "User Management Service" 4100 \
        "$PWD/services/user-management" \
        "npm run dev > /tmp/user-management.log 2>&1"
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

echo ""

# =============================================================================
# FRONTEND APPLICATION
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🎨 Starting Frontend Application${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Start Next.js Frontend (Port 3000)
start_service "Next.js Frontend" 3000 \
    "$PWD" \
    "npx next dev -p 3000 > /tmp/frontend.log 2>&1"

echo ""

# =============================================================================
# HEALTH CHECKS
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🏥 Running Health Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

sleep 5  # Give services time to fully initialize

# Check each service with timeout
check_health "API Gateway" "http://localhost:$PORT_GATEWAY_MAIN/health" || true
check_health "User Management" "http://localhost:$PORT_SERVICE_USER/health" || true
check_health "AI Assistant" "http://localhost:$PORT_SERVICE_AI/health" || true
check_health "Terminal Service" "http://localhost:$PORT_SERVICE_TERMINAL/health" || true
check_health "Workspace Service" "http://localhost:$PORT_SERVICE_WORKSPACE/health" || true
check_health "Portfolio Service" "http://localhost:$PORT_SERVICE_PORTFOLIO/health" || true
check_health "Frontend" "http://localhost:$PORT_FRONTEND_MAIN" || true

echo ""

# =============================================================================
# SUMMARY
# =============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Startup Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Count running services
running_count=0
for port in 3000 4000 4100 4200 4300 4400 4500; do
    if check_port $port; then
        running_count=$((running_count + 1))
    fi
done

if [ $running_count -eq 7 ]; then
    echo -e "${GREEN}✅ All services started successfully!${NC}\n"
else
    echo -e "${YELLOW}⚠️  $running_count/7 services are running${NC}"
    echo -e "${YELLOW}    Some services may have issues, check logs for details${NC}\n"
fi

echo "🌐 Access Points:"
echo "  • Frontend:       http://localhost:$PORT_FRONTEND_MAIN"
echo "  • API Gateway:    http://localhost:$PORT_GATEWAY_MAIN"
echo "  • Health Check:   http://localhost:$PORT_GATEWAY_MAIN/health/all"
echo "  • Prisma Studio:  http://localhost:5555 (run: npx prisma studio)"
echo ""

echo "📝 Service Logs:"
echo "  • Gateway:        tail -f /tmp/gateway.log"
echo "  • User Service:   tail -f /tmp/user-management.log"
echo "  • AI Service:     tail -f /tmp/ai-assistant.log"
echo "  • Terminal:       tail -f /tmp/terminal.log"
echo "  • Workspace:      tail -f /tmp/workspace.log"
echo "  • Portfolio:      tail -f /tmp/portfolio.log"
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
echo "  • Health check:   curl http://localhost:$PORT_GATEWAY_MAIN/health/all | jq"
echo ""

if [ "$SKIP_REDIS" = "true" ]; then
    echo -e "${YELLOW}⚠️  Note: Running without Redis - some features may be limited${NC}"
    echo -e "${YELLOW}    To install Redis: brew install redis (macOS) or apt install redis (Linux)${NC}"
else
    echo -e "${GREEN}✅ Redis is connected - all features available${NC}"
fi

echo -e "${YELLOW}⚠️  Note: Database connection required for full functionality${NC}"
echo -e "${YELLOW}    Run 'npx prisma migrate deploy' if database is not initialized${NC}"
echo ""

echo -e "${GREEN}🎉 Portfolio Management System is ready!${NC}"
echo -e "${GREEN}   Open http://localhost:$PORT_FRONTEND_MAIN in your browser to get started${NC}"
echo ""

# Keep script running to maintain services
echo -e "${BLUE}Press Ctrl+C to stop all services...${NC}"
trap 'echo -e "\n${YELLOW}Stopping all services...${NC}"; pkill -f "node|npm"; exit' INT
while true; do sleep 1; done