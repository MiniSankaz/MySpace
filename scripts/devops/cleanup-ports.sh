#!/bin/bash

# Port cleanup script - kills processes using specified ports
# Usage: ./scripts/cleanup-ports.sh [port1] [port2] [port3] ...

REQUIRED_PORTS=(4000 4001 4002)
CUSTOM_PORTS=("$@")

# If custom ports provided, use them; otherwise use defaults
if [ ${#CUSTOM_PORTS[@]} -gt 0 ]; then
    PORTS_TO_CHECK=("${CUSTOM_PORTS[@]}")
else
    PORTS_TO_CHECK=("${REQUIRED_PORTS[@]}")
fi

echo "🔍 Checking for processes using ports: ${PORTS_TO_CHECK[*]}"

cleanup_port() {
    local port=$1
    echo "📍 Checking port $port..."
    
    # Find processes using the port
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo "✅ Port $port is free"
        return 0
    fi
    
    echo "⚠️  Found processes using port $port: $pids"
    
    # Get process details
    for pid in $pids; do
        local process_info=$(ps -p $pid -o pid,command 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "   Process: $process_info"
        fi
    done
    
    # Ask for confirmation (skip in CI/automated environments)
    if [ -t 1 ] && [ "$FORCE" != "true" ]; then
        read -p "❓ Kill processes using port $port? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Skipping port $port"
            return 1
        fi
    else
        echo "🤖 Auto-killing processes (FORCE=true or non-interactive)"
    fi
    
    # Kill the processes
    for pid in $pids; do
        echo "💀 Killing process $pid..."
        kill -TERM $pid 2>/dev/null
        
        # Wait a bit for graceful shutdown
        sleep 1
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo "🔨 Force killing process $pid..."
            kill -KILL $pid 2>/dev/null
        fi
    done
    
    # Verify port is now free
    sleep 1
    local remaining_pids=$(lsof -ti :$port 2>/dev/null)
    if [ -z "$remaining_pids" ]; then
        echo "✅ Port $port is now free"
        return 0
    else
        echo "❌ Failed to free port $port, remaining processes: $remaining_pids"
        return 1
    fi
}

# Main cleanup loop
failed_ports=()
for port in "${PORTS_TO_CHECK[@]}"; do
    if ! cleanup_port $port; then
        failed_ports+=($port)
    fi
    echo
done

# Summary
echo "📊 Cleanup Summary:"
if [ ${#failed_ports[@]} -eq 0 ]; then
    echo "✅ All ports are now available"
    exit 0
else
    echo "❌ Failed to cleanup ports: ${failed_ports[*]}"
    echo "ℹ️  You may need to restart these services manually"
    exit 1
fi