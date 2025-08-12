#!/bin/bash

echo "🚨 EMERGENCY MODE STARTUP"
echo "Starting server with database-bypass configuration..."

# Copy emergency environment
if [ -f .env.emergency ]; then
    echo "✓ Loading emergency environment configuration"
    cp .env.emergency .env.local
else
    echo "❌ Emergency environment file not found"
    exit 1
fi

# Kill any existing processes on ports
echo "🔄 Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:4001 | xargs kill -9 2>/dev/null || true
lsof -ti:4002 | xargs kill -9 2>/dev/null || true

# Wait for ports to be freed
sleep 2

# Start with memory monitoring and reduced limits
echo "🚀 Starting server in emergency mode..."
echo "Memory limit: 2GB (reduced from 4GB)"
echo "Database persistence: DISABLED"
echo "Terminal sessions: LIMITED"

# Set emergency node options
export NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"

# Start the server
npm run dev

echo "🔄 Emergency mode server started"
echo "Monitor memory usage closely"
echo "If crashes continue, check network connectivity to DigitalOcean"