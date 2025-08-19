#!/bin/bash

# Start Application in Offline Mode
# This script configures and starts the application without database dependency

echo "🚀 Starting Application in Offline Mode"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.offline exists
if [ ! -f .env.offline ]; then
    echo -e "${RED}Error: .env.offline file not found${NC}"
    echo "Creating default offline configuration..."
    
    cat > .env.offline << 'EOF'
# Offline Mode Configuration
PORT=4000
NEXT_PUBLIC_PORT=4000
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
NODE_ENV=development
OFFLINE_MODE=true
FORCE_OFFLINE=true
ENABLE_MOCK_DATA=true
ENABLE_DATABASE_FALLBACK=true
DATABASE_URL="postgresql://offline:offline@localhost:5432/offline?sslmode=disable"
JWT_SECRET=offline_jwt_secret_key
ACCESS_TOKEN_SECRET=offline_access_token
REFRESH_TOKEN_SECRET=offline_refresh_token
JWT_ACCESS_EXPIRY=-1
JWT_REFRESH_EXPIRY=-1
USE_MOCK_LOGS=true
TERMINAL_WS_PORT=4001
CLAUDE_TERMINAL_WS_PORT=4002
ENABLE_TERMINAL_LOGGING=true
ENABLE_ASSISTANT_LOGGING=true
EOF
    
    echo -e "${GREEN}Created .env.offline${NC}"
fi

# Backup current .env.local if it exists
if [ -f .env.local ]; then
    echo -e "${YELLOW}Backing up current .env.local to .env.local.backup${NC}"
    cp .env.local .env.local.backup
fi

# Copy offline config to .env.local
echo -e "${BLUE}Configuring offline mode...${NC}"
cp .env.offline .env.local

# Clear any existing cache
echo -e "${BLUE}Clearing cache...${NC}"
rm -rf .next/cache 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
fi

# Build the application
echo -e "${BLUE}Building application...${NC}"
npm run build

# Start the application
echo -e "${GREEN}Starting application in offline mode on port 4000...${NC}"
echo ""
echo "========================================="
echo -e "${GREEN}✅ Application is running in OFFLINE MODE${NC}"
echo "========================================="
echo ""
echo "Features in offline mode:"
echo "  • No database connection required"
echo "  • Using mock data for all operations"
echo "  • Local storage for data persistence"
echo "  • Automatic fallback for failed requests"
echo ""
echo "Test accounts:"
echo "  • Email: sankaz@admin.com"
echo "  • Email: admin@example.com"
echo "  • Email: dev@localhost.com"
echo "  • Password: any password will work in offline mode"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the development server
npm run dev