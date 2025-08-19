#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Script to start all Phase 2 microservices
echo "🚀 Starting Stock Portfolio v3.0 Microservices (Phase 2)"
echo "=================================================="

# Function to start a service in background
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    
    echo "Starting $service_name on port $port..."
    cd "$service_dir"
    npm start &
    local pid=$!
    echo "$pid" > "../$service_name.pid"
    cd ..
    sleep 2
}

# Start services
echo "📦 Starting Gateway Service (Port 4000)..."
start_service "gateway" "gateway" "4000"

echo "👤 Starting User Management Service (Port 4100)..."
start_service "user-management" "user-management" "4100"

echo "🖥️  Starting Terminal Service (Port 4300)..."
start_service "terminal" "terminal" "4300"

echo "📊 Starting Market Data Service (Port 4170)..."
start_service "market-data" "market-data" "4170"

echo ""
echo "✅ All services started!"
echo ""
echo "Service URLs:"
echo "- Gateway:          http://localhost:$PORT_GATEWAY_MAIN"
echo "- User Management:  http://localhost:$PORT_SERVICE_USER"
echo "- Terminal:         http://localhost:$PORT_SERVICE_TERMINAL"
echo "- Market Data:      http://localhost:$PORT_SERVICE_MARKET"
echo ""
echo "Health Checks:"
echo "- Gateway Health:   http://localhost:$PORT_GATEWAY_MAIN/health"
echo "- User Health:      http://localhost:$PORT_SERVICE_USER/health"
echo "- Terminal Health:  http://localhost:$PORT_SERVICE_TERMINAL/health"
echo "- Market Health:    http://localhost:$PORT_SERVICE_MARKET/health"
echo ""
echo "Service Info:"
echo "- Gateway Info:     http://localhost:$PORT_GATEWAY_MAIN/info"
echo "- User Info:        http://localhost:$PORT_SERVICE_USER/info"
echo "- Terminal Info:    http://localhost:$PORT_SERVICE_TERMINAL/info"
echo ""
echo "WebSocket Endpoints:"
echo "- Terminal WS:      ws://localhost:$PORT_SERVICE_TERMINAL/ws/terminal-v2/"
echo ""
echo "To stop all services, run: ./stop-all-services.sh"