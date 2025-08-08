#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Starting full rebuild...${NC}"

# Step 1: Kill existing processes
echo -e "${YELLOW}📍 Stopping existing processes...${NC}"
pkill -f "node server.js" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 2

# Step 2: Clean old builds
echo -e "${YELLOW}🧹 Cleaning old builds...${NC}"
rm -rf dist/ .next/ 2>/dev/null

# Step 3: Install dependencies if package.json changed
if [ -f "package.json" ]; then
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    npm install
fi

# Step 4: Generate Prisma client
echo -e "${YELLOW}🗄️ Generating Prisma client...${NC}"
npx prisma generate

# Step 5: Build server files
echo -e "${YELLOW}⚙️ Building server files...${NC}"
npx tsc -p tsconfig.server.json
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Server build failed!${NC}"
    exit 1
fi

# Step 6: Build Next.js
echo -e "${YELLOW}📦 Building Next.js...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Next.js build failed!${NC}"
    exit 1
fi

# Step 7: Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
npx tsx test-db-connection.ts
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Database connection failed, but continuing...${NC}"
fi

# Step 8: Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
NODE_ENV=development nohup node server.js > server.log 2>&1 &
echo "Server PID: $!"

# Wait for server to start
sleep 5

# Step 9: Verify server is running
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Server is running on http://127.0.0.1:4000${NC}"
else
    echo -e "${YELLOW}⚠️ Server might not be fully ready yet${NC}"
fi

echo -e "${GREEN}✅ Rebuild complete!${NC}"
echo -e "${GREEN}📝 Logs: tail -f server.log${NC}"
echo -e "${GREEN}🌐 App: http://127.0.0.1:4000${NC}"
echo -e "${GREEN}🤖 Assistant: http://127.0.0.1:4000/assistant${NC}"