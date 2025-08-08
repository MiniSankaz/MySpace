#!/bin/bash

# Personal Assistant - Local Production Starter
# ใช้งานจริงบนเครื่องตัวเอง

echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 Personal Assistant - Local Production      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo -e "${BLUE}Checking requirements...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cat > .env.local << 'EOF'
# Local Production Configuration
NODE_ENV=production
PORT=4000

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:4000

# Database (SQLite for local)
DATABASE_URL="file:./local.db"

# Security (auto-generated)
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Features
ENABLE_AI=true
ENABLE_WEBSOCKET=true
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

# Setup SQLite database if using it
if grep -q "file:./local.db" .env.local; then
    if [ ! -f "local.db" ]; then
        echo -e "${YELLOW}🗄️ Setting up SQLite database...${NC}"
        npx prisma generate
        npx prisma db push --skip-generate
        echo -e "${GREEN}✅ Database ready${NC}"
    fi
fi

# Check if built
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}🔨 Building application...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build complete${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ System Ready!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo -e "   • Web Interface: ${GREEN}http://localhost:4000/assistant${NC}"
echo -e "   • API Endpoint:  ${GREEN}http://localhost:4000/api${NC}"
echo -e "   • Health Check:  ${GREEN}http://localhost:4000/api/health${NC}"
echo ""
echo -e "${BLUE}💡 Quick Commands:${NC}"
echo -e "   • ${YELLOW}help${NC} - Show all commands"
echo -e "   • ${YELLOW}task add [title]${NC} - Add a task"
echo -e "   • ${YELLOW}reminder set [text] at [time]${NC} - Set reminder"
echo -e "   • ${YELLOW}note create [content]${NC} - Create note"
echo -e "   • ${YELLOW}ai [question]${NC} - Ask AI assistant"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start the application
npm start