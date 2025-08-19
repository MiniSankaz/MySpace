#!/bin/bash

# Stop Staging Services Script
# Generated with Claude Code - Production Deployment Assistant
# Date: 2025-08-11

set -euo pipefail

# Configuration  
STAGING_PORT=4100
STAGING_WS_PORT=4101
STAGING_CLAUDE_PORT=4102

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Staging Services${NC}"
echo -e "${BLUE}==============================${NC}"

# Function to stop processes using a specific port
stop_port_processes() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}🔍 Stopping processes on port $port ($service_name)...${NC}"
    
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}📋 Found processes: $pids${NC}"
        
        # Try graceful shutdown first
        kill $pids 2>/dev/null || true
        sleep 3
        
        # Check if processes are still running
        local remaining=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            echo -e "${YELLOW}⚠️  Force killing remaining processes: $remaining${NC}"
            kill -9 $remaining 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ Stopped $service_name${NC}"
    else
        echo -e "${GREEN}✅ No processes found on port $port${NC}"
    fi
}

# Stop all staging services
stop_port_processes $STAGING_PORT "Main Application"
stop_port_processes $STAGING_WS_PORT "Terminal WebSocket"
stop_port_processes $STAGING_CLAUDE_PORT "Claude WebSocket"

# Clean up any remaining Node.js processes that might be staging related
echo -e "${BLUE}🧹 Cleaning up staging processes...${NC}"

# Kill any Node processes that might be running staging services
pkill -f "node.*staging" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
pkill -f "next.*start" 2>/dev/null || true

sleep 2

# Verify cleanup
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"

failed_ports=()
if lsof -i :$STAGING_PORT >/dev/null 2>&1; then
    failed_ports+=($STAGING_PORT)
fi
if lsof -i :$STAGING_WS_PORT >/dev/null 2>&1; then
    failed_ports+=($STAGING_WS_PORT)
fi
if lsof -i :$STAGING_CLAUDE_PORT >/dev/null 2>&1; then
    failed_ports+=($STAGING_CLAUDE_PORT)
fi

if [ ${#failed_ports[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All staging services stopped successfully${NC}"
    echo -e "${GREEN}✅ Ports $STAGING_PORT, $STAGING_WS_PORT, $STAGING_CLAUDE_PORT are now free${NC}"
    exit 0
else
    echo -e "${RED}❌ Some services may still be running on ports: ${failed_ports[*]}${NC}"
    echo -e "${RED}💡 Run 'lsof -i :${failed_ports[*]}' to investigate${NC}"
    exit 1
fi