#!/bin/bash

# Script to stop all Phase 2 microservices
echo "🛑 Stopping Stock Portfolio v3.0 Microservices (Phase 2)"
echo "=================================================="

# Function to stop a service
stop_service() {
    local service_name=$1
    
    if [ -f "$service_name.pid" ]; then
        local pid=$(cat "$service_name.pid")
        echo "Stopping $service_name (PID: $pid)..."
        kill $pid 2>/dev/null
        rm "$service_name.pid"
        echo "✅ $service_name stopped"
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop services in reverse order
stop_service "terminal"
stop_service "user-management"
stop_service "gateway"

echo ""
echo "✅ All services stopped!"