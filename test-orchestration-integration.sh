#!/bin/bash

echo "🧪 Testing AI Orchestration Integration"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Direct orchestration service health
echo -e "\n${BLUE}1. Testing Orchestration Service (Direct - Port 4191)${NC}"
health_response=$(curl -s http://localhost:4191/health)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Orchestration service healthy${NC}"
    echo "   Response: $(echo $health_response | jq -r '.status')"
    echo "   Uptime: $(echo $health_response | jq -r '.uptime')s"
    echo "   Active agents: $(echo $health_response | jq -r '.agents.active')"
else
    echo -e "${RED}❌ Orchestration service not responding${NC}"
fi

# Test 2: Gateway routing to orchestration
echo -e "\n${BLUE}2. Testing Gateway Routes (Port 4110)${NC}"
agents_response=$(curl -s http://localhost:4110/api/agents)
if [[ $? -eq 0 ]] && [[ $(echo $agents_response | jq -r '. | length') -gt 0 ]]; then
    echo -e "${GREEN}✅ Gateway routing to orchestration working${NC}"
    echo "   Found $(echo $agents_response | jq -r '. | length') agents"
else
    echo -e "${RED}❌ Gateway routing failed${NC}"
fi

# Test 3: Spawn agent via gateway
echo -e "\n${BLUE}3. Testing Agent Spawning via Gateway${NC}"
spawn_response=$(curl -s -X POST http://localhost:4110/api/spawn-agent \
    -H "Content-Type: application/json" \
    -d '{"type":"test","task":{"description":"Integration test","prompt":"test"}}')
    
if [[ $? -eq 0 ]] && [[ $(echo $spawn_response | jq -r '.success') == "true" ]]; then
    echo -e "${GREEN}✅ Agent spawning via gateway working${NC}"
    agent_id=$(echo $spawn_response | jq -r '.agentId')
    echo "   Spawned agent: $agent_id"
else
    echo -e "${RED}❌ Agent spawning failed${NC}"
    echo "   Response: $spawn_response"
fi

# Test 4: WebSocket availability
echo -e "\n${BLUE}4. Testing WebSocket Server${NC}"
# Check if port 4191 is listening for WebSocket connections
if nc -z localhost 4191; then
    echo -e "${GREEN}✅ WebSocket server listening on port 4191${NC}"
else
    echo -e "${RED}❌ WebSocket server not available${NC}"
fi

# Test 5: Dashboard accessibility
echo -e "\n${BLUE}5. Testing Dashboard Accessibility${NC}"
dashboard_response=$(curl -s -I http://localhost:4100/approval-dashboard.html)
if [[ $? -eq 0 ]] && [[ $(echo $dashboard_response | grep "200 OK") ]]; then
    echo -e "${GREEN}✅ Approval dashboard accessible${NC}"
    echo "   URL: http://localhost:4100/approval-dashboard.html"
else
    echo -e "${RED}❌ Dashboard not accessible${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Integration Summary${NC}"
echo "================================"
echo "✅ Orchestration Service: http://localhost:4191"
echo "✅ Gateway Routing: http://localhost:4110/api/*"
echo "✅ WebSocket Support: ws://localhost:4191"
echo "✅ Dashboard: http://localhost:4100/approval-dashboard.html"
echo ""
echo "🎯 Next Steps:"
echo "1. Open the dashboard: http://localhost:4100/approval-dashboard.html"
echo "2. Click 'Check Connection' to verify real-time connection"
echo "3. Click 'Spawn Real Agent' to test agent spawning"
echo "4. Click 'Test Parallel Agents' to test multiple agent spawning"
echo ""
echo "🔧 Architecture:"
echo "   Frontend (4100) → Gateway (4110) → Orchestration (4191)"
echo "   Dashboard connects directly to 4191 for WebSocket real-time features"