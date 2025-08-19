#!/bin/bash

# Source port configuration
source "$(dirname "$0")/../shared/config/ports.sh"

# Market Data Service Setup Script

echo "🚀 Setting up Market Data Service..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 completed successfully${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# 1. Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
check_status "Dependencies installation"

# 2. Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate
check_status "Prisma client generation"

# 3. Run database migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
npx prisma migrate deploy
check_status "Database migrations"

# 4. Check Redis connection
echo -e "${YELLOW}🔍 Checking Redis connection...${NC}"
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️ Redis is not running. Starting Redis...${NC}"
    redis-server --daemonize yes
    check_status "Redis startup"
fi

# 5. Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build
check_status "TypeScript build"

# 6. Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p logs
check_status "Logs directory creation"

echo -e "${GREEN}✅ Market Data Service setup complete!${NC}"
echo ""
echo "To start the service, run:"
echo "  npm run dev    # Development mode"
echo "  npm start      # Production mode"
echo ""
echo "Service will run on port 4600"
echo "Access through API Gateway: http://localhost:$PORT_GATEWAY_MAIN/api/v1/market"