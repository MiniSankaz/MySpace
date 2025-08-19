#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Staging Environment Setup Script
# Generated with Claude Code - Production Deployment Assistant
# Date: 2025-08-11

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_ENV=".env.staging"
STAGING_DB_SUFFIX="_staging"
STAGING_PORT=4100
STAGING_WS_PORT=4101
STAGING_CLAUDE_PORT=4102

echo -e "${BLUE}🚀 Stock Portfolio Management System - Staging Environment Setup${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

if ! command_exists node; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_status "Node.js found: $(node --version)"

if ! command_exists npm; then
    print_error "npm not found. Please install npm"
    exit 1
fi
print_status "npm found: $(npm --version)"

if ! command_exists git; then
    print_error "Git not found. Please install Git"
    exit 1
fi
print_status "Git found: $(git --version)"

if [ ! -f ".env.local" ]; then
    print_error ".env.local not found. Please create environment file"
    exit 1
fi
print_status ".env.local found"

# Create staging environment file
echo -e "${BLUE}🔧 Creating Staging Environment Configuration...${NC}"

cat > "$STAGING_ENV" <<EOF
# Staging Environment Configuration
# Auto-generated on $(date)

# Application Configuration
NODE_ENV=staging
PORT=$STAGING_PORT
NEXT_PUBLIC_PORT=$STAGING_PORT

# Database Configuration (Staging)
DATABASE_URL=\${DATABASE_URL}$STAGING_DB_SUFFIX

# WebSocket Configuration
WEBSOCKET_PORT=$STAGING_WS_PORT
CLAUDE_WEBSOCKET_PORT=$STAGING_CLAUDE_PORT

# API Configuration
ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
NEXT_PUBLIC_ANTHROPIC_API_KEY=\${NEXT_PUBLIC_ANTHROPIC_API_KEY}

# Authentication
JWT_SECRET=\${JWT_SECRET}_staging
NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}_staging
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=strict

# Performance Monitoring
ENABLE_MONITORING=true
PERFORMANCE_BASELINE_LATENCY=100
PERFORMANCE_BASELINE_MEMORY=50

# Staging Specific
STAGING_MODE=true
STAGING_BUILD_ID=$(date +%s)
STAGING_DEPLOYMENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=10000
HEALTH_CHECK_RETRIES=3

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE="0 2 * * *"

# Debug Configuration
DEBUG_MODE=false
LOG_LEVEL=info
VERBOSE_LOGGING=false

# Cache Configuration
CACHE_TTL=900
CACHE_MAX_SIZE=1000
EOF

print_status "Staging environment file created: $STAGING_ENV"

# Load environment variables from local file
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Create staging database
echo -e "${BLUE}🗄️  Setting up Staging Database...${NC}"

if [ -n "${DATABASE_URL:-}" ]; then
    STAGING_DATABASE_URL="${DATABASE_URL}${STAGING_DB_SUFFIX}"
    echo "DATABASE_URL=$STAGING_DATABASE_URL" >> "$STAGING_ENV"
    print_status "Staging database URL configured"
else
    print_warning "DATABASE_URL not found in .env.local - please configure manually"
fi

# Install dependencies
echo -e "${BLUE}📦 Installing Dependencies...${NC}"
npm install --silent
print_status "Dependencies installed"

# Generate Prisma client for staging
echo -e "${BLUE}🔄 Generating Prisma Client...${NC}"
npx prisma generate --silent
print_status "Prisma client generated"

# Create staging build
echo -e "${BLUE}🏗️  Creating Staging Build...${NC}"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Build completed successfully"
else
    print_error "Build failed - please check build logs"
    exit 1
fi

# Create staging scripts
echo -e "${BLUE}📜 Creating Staging Management Scripts...${NC}"

# Start staging script
cat > "scripts/start-staging.sh" <<'EOF'
#!/bin/bash
set -euo pipefail

echo "🚀 Starting Stock Portfolio Management System - Staging Environment"
echo "Port: 4100 | WebSocket: 4101 | Claude: 4102"

# Load staging environment
export $(grep -v '^#' .env.staging | xargs)

# Start WebSocket servers
node src/server/websocket/terminal-ws-standalone.js --port=4101 &
node src/server/websocket/claude-terminal-ws.js --port=4102 &

# Start main application
npm start

wait
EOF

chmod +x "scripts/start-staging.sh"
print_status "Staging start script created"

# Stop staging script
cat > "scripts/stop-staging.sh" <<'EOF'
#!/bin/bash
set -euo pipefail

echo "🛑 Stopping Staging Environment..."

# Kill processes by port
kill $(lsof -ti:4100) 2>/dev/null || true
kill $(lsof -ti:4101) 2>/dev/null || true
kill $(lsof -ti:4102) 2>/dev/null || true

echo "✅ Staging environment stopped"
EOF

chmod +x "scripts/stop-staging.sh"
print_status "Staging stop script created"

# Health check script
cat > "scripts/staging-health-check.sh" <<'EOF'
#!/bin/bash
set -euo pipefail

STAGING_URL="http://localhost:$PORT_SERVICE_USER"
HEALTH_ENDPOINT="$STAGING_URL/api/health"

echo "🔍 Staging Environment Health Check"
echo "=================================="

# Check main application
if curl -s "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
    echo "✅ Main Application: Healthy"
else
    echo "❌ Main Application: Unhealthy"
fi

# Check WebSocket servers
if nc -z localhost 4101 2>/dev/null; then
    echo "✅ Terminal WebSocket: Running"
else
    echo "❌ Terminal WebSocket: Down"
fi

if nc -z localhost 4102 2>/dev/null; then
    echo "✅ Claude WebSocket: Running"
else
    echo "❌ Claude WebSocket: Down"
fi

# Performance check
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$HEALTH_ENDPOINT" 2>/dev/null || echo "0")
if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
    echo "✅ Response Time: ${RESPONSE_TIME}s (Good)"
else
    echo "⚠️  Response Time: ${RESPONSE_TIME}s (Slow)"
fi

echo "=================================="
echo "Health Check Complete"
EOF

chmod +x "scripts/staging-health-check.sh"
print_status "Staging health check script created"

# Port check utility
cat > "scripts/check-staging-ports.sh" <<'EOF'
#!/bin/bash

echo "🔍 Checking Staging Ports Availability..."

check_port() {
    local port=$1
    local service=$2
    if nc -z localhost $port 2>/dev/null; then
        echo "❌ Port $port ($service) is already in use"
        lsof -i :$port
        return 1
    else
        echo "✅ Port $port ($service) is available"
        return 0
    fi
}

check_port 4100 "Main Application"
check_port 4101 "Terminal WebSocket"
check_port 4102 "Claude WebSocket"
EOF

chmod +x "scripts/check-staging-ports.sh"
print_status "Port check utility created"

# Create README for staging
cat > "STAGING_README.md" <<'EOF'
# Staging Environment Guide

## Quick Start
```bash
# Setup staging environment
./scripts/staging-setup.sh

# Check port availability
./scripts/check-staging-ports.sh

# Start staging
./scripts/start-staging.sh

# Health check
./scripts/staging-health-check.sh

# Stop staging
./scripts/stop-staging.sh
```

## URLs
- **Main Application**: http://localhost:$PORT_SERVICE_USER
- **WebSocket Terminal**: ws://localhost:4101
- **Claude Terminal**: ws://localhost:4102
- **Health Check**: http://localhost:$PORT_SERVICE_USER/api/health

## Configuration
- Environment: `.env.staging`
- Build: Production build with staging config
- Database: Staging database (isolated)
- Monitoring: Enabled with performance baselines

## Deployment Validation
1. All health checks pass
2. Performance within baselines (<100ms latency)
3. No memory leaks after 30 minutes
4. All features functional

## Support
- Check logs: `tail -f .next/logs/staging.log`
- Monitor performance: `./scripts/monitor-staging.js`
- Emergency stop: `./scripts/stop-staging.sh`
EOF

print_status "Staging README created"

echo
echo -e "${GREEN}🎉 Staging Environment Setup Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo
echo -e "Next Steps:"
echo -e "1. Review configuration: ${BLUE}$STAGING_ENV${NC}"
echo -e "2. Check ports: ${BLUE}./scripts/check-staging-ports.sh${NC}"
echo -e "3. Start staging: ${BLUE}./scripts/start-staging.sh${NC}"
echo -e "4. Validate deployment: ${BLUE}./scripts/staging-health-check.sh${NC}"
echo
echo -e "Staging URLs:"
echo -e "• Main App: ${BLUE}http://localhost:$PORT_SERVICE_USER${NC}"
echo -e "• Terminal WS: ${BLUE}ws://localhost:4101${NC}"
echo -e "• Claude WS: ${BLUE}ws://localhost:4102${NC}"
echo
echo -e "${GREEN}Ready for staging deployment validation! 🚀${NC}"