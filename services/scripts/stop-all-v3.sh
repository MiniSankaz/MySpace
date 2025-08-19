#!/bin/bash

# V3.0 Microservices Stop Script
# Stops all 6 services

echo "🛑 Stopping Stock Portfolio v3.0 Microservices..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop service on port
stop_port() {
    local port=$1
    local name=$2
    
    echo -n "Stopping $name (port $port)... "
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ Stopped${NC}"
    else
        echo -e "${YELLOW}Not running${NC}"
    fi
}

# Stop each service
stop_port 4000 "Gateway Service"
stop_port 4100 "User Management"
stop_port 4200 "AI Assistant"
stop_port 4300 "Terminal Service"
stop_port 4400 "Workspace Service"
stop_port 4500 "Portfolio Service"

echo ""
echo "================================================"
echo "✅ All services stopped"
echo "================================================"