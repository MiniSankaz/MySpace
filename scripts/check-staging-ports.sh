#!/bin/bash

# Check Staging Ports Availability Script
# Generated with Claude Code - Production Deployment Assistant
# Date: 2025-08-11

set -euo pipefail

# Staging port configuration
STAGING_PORT=4100
STAGING_WS_PORT=4101  
STAGING_CLAUDE_PORT=4102

# Check if a port is available
check_port() {
    local port=$1
    local port_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Port $port ($port_name) is in use"
        return 1
    else
        echo "✅ Port $port ($port_name) is available"
        return 0
    fi
}

echo "🔍 Checking staging port availability..."

# Track overall status
overall_status=0

# Check each port
if ! check_port $STAGING_PORT "main app"; then
    overall_status=1
fi

if ! check_port $STAGING_WS_PORT "WebSocket terminal"; then
    overall_status=1
fi

if ! check_port $STAGING_CLAUDE_PORT "Claude terminal"; then
    overall_status=1
fi

if [ $overall_status -eq 0 ]; then
    echo "✅ All staging ports are available"
    exit 0
else
    echo "❌ Some staging ports are not available"
    echo "💡 Run 'lsof -i :4100-4102' to see what's using the ports"
    exit 1
fi