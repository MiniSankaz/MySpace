#!/bin/bash

# AI Orchestration CLI Tools Helper Script
# Usage: ./cli-tools.sh [command]

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           AI Orchestration CLI Tools Helper                    ║"
echo "║                    Quick Access Commands                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

show_help() {
    echo -e "${YELLOW}Available Commands:${NC}"
    echo ""
    echo -e "${GREEN}📊 Monitoring & Control:${NC}"
    echo "  ./cli-tools.sh approval    - Start Approval Monitor (Interactive)"
    echo "  ./cli-tools.sh agents      - List all agents"
    echo "  ./cli-tools.sh status      - Show orchestration status"
    echo "  ./cli-tools.sh health      - Check service health"
    echo ""
    echo -e "${GREEN}🚀 Agent Management:${NC}"
    echo "  ./cli-tools.sh spawn       - Spawn new agent (interactive)"
    echo "  ./cli-tools.sh clear       - Clear completed agents"
    echo "  ./cli-tools.sh kill <id>   - Terminate specific agent"
    echo ""
    echo -e "${GREEN}🛠️ Utility:${NC}"
    echo "  ./cli-tools.sh logs        - Show orchestration logs"
    echo "  ./cli-tools.sh ports       - Check port usage"
    echo "  ./cli-tools.sh dashboard   - Open web dashboard"
    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo "  1. ./cli-tools.sh approval     # Monitor approvals"
    echo "  2. ./cli-tools.sh spawn        # Create test agent"
    echo "  3. ./cli-tools.sh dashboard    # Open web interface"
    echo ""
}

case "$1" in
    "approval"|"monitor")
        echo -e "${GREEN}🔍 Starting Approval Monitor...${NC}"
        echo "Press Ctrl+C to exit"
        cd services/ai-assistant && npx tsx src/cli/approval-interactive.ts
        ;;
    
    "agents"|"list")
        echo -e "${GREEN}📋 Current Agents:${NC}"
        curl -s http://localhost:4191/api/agents | jq -r '.[] | "[\(.status)] \(.type) - \(.task.description)"' 2>/dev/null || echo "Orchestration service not running"
        ;;
    
    "status")
        echo -e "${GREEN}📊 Orchestration Status:${NC}"
        curl -s http://localhost:4191/health | jq '.' 2>/dev/null || echo "Service not responding"
        ;;
    
    "health")
        echo -e "${GREEN}🏥 Service Health Check:${NC}"
        echo "Orchestration Service (4191):"
        curl -s http://localhost:4191/health -w "HTTP %{http_code}\n" -o /dev/null 2>/dev/null || echo "❌ Not responding"
        echo "Frontend (4100):"
        curl -s http://localhost:4100 -w "HTTP %{http_code}\n" -o /dev/null 2>/dev/null || echo "❌ Not responding"
        ;;
    
    "spawn")
        echo -e "${GREEN}🚀 Spawning Agent (Interactive)...${NC}"
        cd services/ai-assistant && npx tsx src/cli/orchestration-cli.ts agent spawn --type code-reviewer --task "CLI Test Agent"
        ;;
    
    "clear")
        echo -e "${GREEN}🧹 Clearing Completed Agents...${NC}"
        curl -s -X POST http://localhost:4191/api/agents/clear | jq '.' 2>/dev/null || echo "Failed to clear agents"
        ;;
    
    "kill")
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Usage: ./cli-tools.sh kill <agent-id>${NC}"
            exit 1
        fi
        echo -e "${GREEN}🛑 Terminating Agent: $2${NC}"
        curl -s -X DELETE http://localhost:4191/api/agents/$2 | jq '.' 2>/dev/null || echo "Failed to terminate agent"
        ;;
    
    "logs")
        echo -e "${GREEN}📜 Orchestration Logs:${NC}"
        if [ -f "/tmp/orchestration.log" ]; then
            tail -f /tmp/orchestration.log
        else
            echo "Log file not found. Make sure orchestration service is running."
        fi
        ;;
    
    "ports")
        echo -e "${GREEN}🔌 Port Usage:${NC}"
        echo "Checking AI Orchestration ports..."
        lsof -i :4100,4110,4130,4191 2>/dev/null || echo "No services found on standard ports"
        ;;
    
    "dashboard"|"web")
        echo -e "${GREEN}🌐 Opening Web Dashboard...${NC}"
        echo "Orchestration Dashboard: http://localhost:4100/orchestration"
        echo "Approval Dashboard: http://localhost:4100/approval-dashboard.html"
        open http://localhost:4100/orchestration 2>/dev/null || echo "Use browser to open: http://localhost:4100/orchestration"
        ;;
    
    *)
        show_help
        ;;
esac