#!/bin/bash

# Test Gateway Routing Fix
echo "🔧 Testing Gateway Routing Fix for v3.0"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Clean up ports first
echo "🧹 Cleaning up ports..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:4500 | xargs kill -9 2>/dev/null
sleep 2

# Start Portfolio service
echo "🚀 Starting Portfolio service (port 4500)..."
cd /Users/sem4pro/Stock/port/services/portfolio
npm run dev > /tmp/portfolio.log 2>&1 &
PORTFOLIO_PID=$!
echo "Portfolio PID: $PORTFOLIO_PID"
sleep 3

# Check Portfolio service
echo -n "Checking Portfolio service... "
if curl -s http://localhost:4500/health | grep -q "OK"; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

# Start Gateway service
echo "🚀 Starting Gateway service (port 4000)..."
cd /Users/sem4pro/Stock/port/services/gateway
npm run build > /tmp/gateway-build.log 2>&1
npm run dev > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"
sleep 5

# Check Gateway service
echo -n "Checking Gateway service... "
if curl -s http://localhost:4000/health | grep -q "OK"; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    cat /tmp/gateway.log
    exit 1
fi

echo ""
echo "📋 Testing API Routes:"
echo "----------------------"

# Test direct Portfolio access
echo -n "1. Direct Portfolio access (/api/v1/stocks/trending)... "
DIRECT_RESPONSE=$(curl -s http://localhost:4500/api/v1/stocks/trending)
if echo "$DIRECT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Works${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    echo "Response: $DIRECT_RESPONSE"
fi

# Test Gateway routing to Portfolio
echo -n "2. Gateway → Portfolio routing (/api/v1/stocks/trending)... "
GATEWAY_RESPONSE=$(curl -s http://localhost:4000/api/v1/stocks/trending)
if echo "$GATEWAY_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Works!${NC}"
    echo ""
    echo -e "${GREEN}🎉 SUCCESS: Gateway routing is fixed!${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    echo "Response: $GATEWAY_RESPONSE"
    echo ""
    echo "Gateway logs:"
    tail -20 /tmp/gateway.log
fi

# Test another Portfolio endpoint through Gateway
echo -n "3. Gateway → Portfolio search (/api/v1/stocks/search?q=AAPL)... "
SEARCH_RESPONSE=$(curl -s "http://localhost:4000/api/v1/stocks/search?q=AAPL")
if echo "$SEARCH_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Works!${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    echo "Response: $SEARCH_RESPONSE"
fi

echo ""
echo "📊 Summary:"
echo "-----------"
echo "Portfolio service: http://localhost:4500"
echo "Gateway service: http://localhost:4000"
echo "Dashboard: http://localhost:4000/dashboard.html"
echo ""
echo "Logs:"
echo "- Portfolio: /tmp/portfolio.log"
echo "- Gateway: /tmp/gateway.log"
echo ""
echo "To stop services:"
echo "kill $PORTFOLIO_PID $GATEWAY_PID"
echo ""

# Keep services running for testing
echo "Services are running. Press Ctrl+C to stop..."
trap "kill $PORTFOLIO_PID $GATEWAY_PID; exit" INT
wait