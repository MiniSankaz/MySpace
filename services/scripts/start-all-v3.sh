#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# V3.0 Microservices Startup Script
# Starts all 6 services for development

set -e

echo "🚀 Starting Stock Portfolio v3.0 Microservices..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service directories
SERVICES_DIR="/Users/sem4pro/Stock/port/services"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start service
start_service() {
    local name=$1
    local dir=$2
    local port=$3
    local special_cmd=$4
    
    echo -n "Starting $name (port $port)... "
    
    # Check if already running
    if check_port $port; then
        echo -e "${YELLOW}Already running${NC}"
        return 0
    fi
    
    # Change to service directory
    cd "$SERVICES_DIR/$dir"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install >/dev/null 2>&1
    fi
    
    # Build if needed
    if [ ! -d "dist" ]; then
        echo -e "${YELLOW}Building...${NC}"
        npm run build >/dev/null 2>&1 || true
    fi
    
    # Start service in background
    if [ -n "$special_cmd" ]; then
        eval "$special_cmd" >/dev/null 2>&1 &
    else
        npm start >/dev/null 2>&1 &
    fi
    
    # Wait for service to start
    sleep 3
    
    # Check if started successfully
    if check_port $port; then
        echo -e "${GREEN}✓ Started${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to start${NC}"
        return 1
    fi
}

# Kill existing processes on our ports
echo "Cleaning up existing processes..."
for port in 4000 4100 4200 4300 4400 4500; do
    if check_port $port; then
        echo "Killing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

echo ""
echo "Starting services..."
echo "--------------------"

# Start Redis if not running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis..."
    redis-server --daemonize yes >/dev/null 2>&1
fi

# Start each service
start_service "Gateway Service" "gateway" 4000
start_service "User Management" "user-management" 4100
start_service "AI Assistant" "ai-assistant" 4200
start_service "Terminal Service" "terminal" 4300
start_service "Workspace Service" "workspace" 4400
start_service "Portfolio Service" "portfolio" 4500 "USE_MOCK_PRICES=true npm start"

echo ""
echo "================================================"
echo "✅ All services started successfully!"
echo ""
echo "Service URLs:"
echo "  Gateway:         http://localhost:$PORT_GATEWAY_MAIN"
echo "  User Management: http://localhost:$PORT_SERVICE_USER"
echo "  AI Assistant:    http://localhost:$PORT_SERVICE_AI"
echo "  Terminal:        http://localhost:$PORT_SERVICE_TERMINAL (ws://localhost:$PORT_SERVICE_TERMINAL/ws)"
echo "  Workspace:       http://localhost:$PORT_SERVICE_WORKSPACE"
echo "  Portfolio:       http://localhost:$PORT_SERVICE_PORTFOLIO"
echo ""
echo "Health checks:"
for port in 4000 4100 4200 4300 4400 4500; do
    echo -n "  Port $port: "
    status=$(curl -s http://localhost:$port/health 2>/dev/null | jq -r .status 2>/dev/null || echo "Not responding")
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}$status${NC}"
    else
        echo -e "${RED}$status${NC}"
    fi
done
echo ""
echo "To stop all services, run: ./scripts/stop-all-v3.sh"
echo "================================================"