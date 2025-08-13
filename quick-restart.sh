#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Quick restart...${NC}"

# Kill existing processes
echo -e "${YELLOW}📍 Stopping services...${NC}"
pkill -f "npm run dev" 2>/dev/null
pkill -f "node server.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Always rebuild terminal-memory service
echo -e "${YELLOW}🔧 Building terminal-memory service...${NC}"

# Create dist/services directory if it doesn't exist
if [ ! -d "dist/services" ]; then
    mkdir -p dist/services
fi

# Copy pre-compiled terminal-memory service
if [ -f "dist/services/terminal-memory.service.js" ]; then
    # Already exists, check if source is newer
    if [ "src/services/terminal-memory.service.ts" -nt "dist/services/terminal-memory.service.js" ]; then
        echo -e "${YELLOW}⚙️ Terminal-memory service changed, rebuilding...${NC}"
        # Try to compile with TypeScript
        if command -v tsc &> /dev/null || [ -f "node_modules/.bin/tsc" ]; then
            TSC_CMD="tsc"
            if [ -f "node_modules/.bin/tsc" ]; then
                TSC_CMD="node_modules/.bin/tsc"
            fi
            $TSC_CMD src/services/terminal-memory.service.ts \
                --outDir dist \
                --module commonjs \
                --target es2018 \
                --esModuleInterop \
                --skipLibCheck \
                --allowJs \
                --resolveJsonModule \
                --downlevelIteration \
                --moduleResolution node \
                --noEmit false \
                --declaration false 2>/dev/null || true
        fi
    fi
else
    # First time, use the pre-compiled version
    if [ -f "src/services/terminal-memory.service.js.compiled" ]; then
        cp src/services/terminal-memory.service.js.compiled dist/services/terminal-memory.service.js
        echo -e "${GREEN}✅ Terminal-memory service ready${NC}"
    fi
fi

# Check if we need to rebuild other server files
if [ -n "$(find src/lib src/services src/modules/personal-assistant/services -name '*.ts' -newer dist/src/lib/socket-server.js 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚙️ Server files changed, rebuilding...${NC}"
    npx tsc -p tsconfig.server.json
fi

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"

# Start server with Node (8GB memory limit)
NODE_ENV=development nohup node --max-old-space-size=8192 --expose-gc server.js > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait a bit for server to initialize
sleep 3

# Verify server is running
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Server may have issues, check server.log${NC}"
fi

echo -e "${GREEN}✅ Quick restart complete!${NC}"
echo -e "${GREEN}📝 Logs: tail -f server.log${NC}"
echo -e "${GREEN}🌐 App: http://127.0.0.1:4000${NC}"
echo -e "${GREEN}🤖 Assistant: http://127.0.0.1:4000/assistant${NC}"

# Test server is running
echo -e "${YELLOW}🧪 Testing server availability...${NC}"
sleep 2

# Check if server responds
MAX_ATTEMPTS=5
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health 2>/dev/null | grep -q "200\|404"; then
        echo -e "${GREEN}✅ Server is responding${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "${YELLOW}⏳ Waiting for server... (attempt $ATTEMPT/$MAX_ATTEMPTS)${NC}"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}⚠️ Server may not be responding correctly${NC}"
fi

# Auto-terminate after testing
echo -e "${YELLOW}🛑 Auto-terminating quick-restart process...${NC}"
sleep 1

# Store server PID in file for manual stop if needed
echo $SERVER_PID > server.pid.quick-restart

echo -e "${GREEN}✅ Quick restart process completed and terminated${NC}"
echo -e "${GREEN}📌 Server is running in background with PID: $SERVER_PID${NC}"
echo -e "${GREEN}💡 To stop server manually: kill $(cat server.pid.quick-restart 2>/dev/null || echo 'PID')${NC}"

# Exit the script (terminate itself)
exit 0