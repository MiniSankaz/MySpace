#!/bin/bash

# Port Verification Script
# Checks if all ports are correctly configured

echo "======================================"
echo "🔍 Port Configuration Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Expected port mappings
declare -A EXPECTED_PORTS=(
    ["Frontend"]=4100
    ["Gateway"]=4110
    ["User"]=4120
    ["AI"]=4130
    ["Terminal"]=4140
    ["Workspace"]=4150
    ["Portfolio"]=4160
    ["Market"]=4170
)

# Files to check
echo "📁 Checking critical files..."
echo ""

# Check .env
echo "1. Checking .env file..."
if grep -q "PORT=4100" .env && grep -q "GATEWAY_PORT=4110" .env; then
    echo -e "${GREEN}✅ .env configured correctly${NC}"
else
    echo -e "${RED}❌ .env has incorrect ports${NC}"
fi

# Check package.json
echo "2. Checking package.json..."
if grep -q '"dev:next": "next dev -p 4100"' package.json; then
    echo -e "${GREEN}✅ package.json configured correctly${NC}"
else
    echo -e "${RED}❌ package.json has incorrect ports${NC}"
fi

# Check server.js
echo "3. Checking server.js..."
if grep -q "PORT || 4100" server.js && grep -q "WS_PORT || 4101" server.js; then
    echo -e "${GREEN}✅ server.js configured correctly${NC}"
else
    echo -e "${RED}❌ server.js has incorrect ports${NC}"
fi

# Check service-registry
echo "4. Checking service-registry.ts..."
if grep -q "port: 4120" services/gateway/src/services/service-registry.ts; then
    echo -e "${GREEN}✅ service-registry.ts configured correctly${NC}"
else
    echo -e "${RED}❌ service-registry.ts has incorrect ports${NC}"
fi

echo ""
echo "======================================"
echo "📊 Port Usage Summary"
echo "======================================"
echo ""

# Check for old ports
echo "🔍 Checking for old port references..."
OLD_PORTS=(3000 4000 4001 4002 4200 4300 4400 4500 4600)
FOUND_OLD=false

for port in "${OLD_PORTS[@]}"; do
    count=$(grep -r "localhost:$port\|127.0.0.1:$port\|PORT.*$port\|port:.*$port" \
        --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" \
        --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
        --exclude-dir=coverage --exclude-dir=logs --exclude-dir=backups \
        . 2>/dev/null | wc -l)
    
    if [ $count -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $count references to old port $port${NC}"
        FOUND_OLD=true
    fi
done

if [ "$FOUND_OLD" = false ]; then
    echo -e "${GREEN}✅ No old port references found${NC}"
fi

echo ""
echo "======================================"
echo "🎯 New Port Configuration"
echo "======================================"
echo ""

for service in "${!EXPECTED_PORTS[@]}"; do
    echo "$service: ${EXPECTED_PORTS[$service]}"
done

echo ""
echo "======================================"
echo "✅ Verification Complete"
echo "======================================"