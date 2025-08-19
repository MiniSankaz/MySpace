#!/bin/bash

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

echo ""
echo "✅ All services started!"
echo ""
echo "Service URLs:"
echo "- Gateway:          http://localhost:4000"
echo "- User Management:  http://localhost:4100"
echo "- Terminal:         http://localhost:4300"
echo ""
echo "Health Checks:"
echo "- Gateway Health:   http://localhost:4000/health"
echo "- User Health:      http://localhost:4100/health"
echo "- Terminal Health:  http://localhost:4300/health"
echo ""
echo "Service Info:"
echo "- Gateway Info:     http://localhost:4000/info"
echo "- User Info:        http://localhost:4100/info"
echo "- Terminal Info:    http://localhost:4300/info"
echo ""
echo "WebSocket Endpoints:"
echo "- Terminal WS:      ws://localhost:4300/ws/terminal-v2/"
echo ""
echo "To stop all services, run: ./stop-all-services.sh"