#!/bin/bash

# AI Orchestration Launcher Script
# ใช้สำหรับ spawn AI agents แบบ parallel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ORCHESTRATION_PORT=4190
SERVICE_DIR="services/ai-assistant"

echo -e "${BLUE}🚀 AI Orchestration System${NC}"
echo "================================"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to start orchestration server
start_server() {
    echo -e "${YELLOW}Starting Orchestration Server...${NC}"
    
    cd "$SERVICE_DIR"
    
    # Check if server is already running
    if check_port $ORCHESTRATION_PORT; then
        echo -e "${YELLOW}Server already running on port $ORCHESTRATION_PORT${NC}"
        return
    fi
    
    # Start the server in background
    nohup npx tsx src/orchestration-runner.ts > orchestration.log 2>&1 &
    echo $! > orchestration.pid
    
    # Wait for server to start
    sleep 3
    
    if check_port $ORCHESTRATION_PORT; then
        echo -e "${GREEN}✓ Server started on port $ORCHESTRATION_PORT${NC}"
    else
        echo -e "${RED}✗ Failed to start server${NC}"
        exit 1
    fi
}

# Function to spawn single agent
spawn_agent() {
    local agent_type=$1
    local task_desc=$2
    local task_prompt=$3
    
    echo -e "${YELLOW}Spawning $agent_type agent...${NC}"
    
    curl -s -X POST http://localhost:$ORCHESTRATION_PORT/api/spawn-agent \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"$agent_type\",
            \"task\": {
                \"description\": \"$task_desc\",
                \"prompt\": \"$task_prompt\"
            }
        }" | jq '.'
}

# Function to spawn parallel agents
spawn_parallel() {
    echo -e "${YELLOW}Spawning parallel agents...${NC}"
    
    local tasks_json=$1
    
    curl -s -X POST http://localhost:$ORCHESTRATION_PORT/api/spawn-parallel \
        -H "Content-Type: application/json" \
        -d "{\"tasks\": $tasks_json}" | jq '.'
}

# Function to get all agents status
get_agents() {
    echo -e "${YELLOW}Active Agents:${NC}"
    curl -s http://localhost:$ORCHESTRATION_PORT/api/agents | jq '.'
}

# Function to get health status
get_health() {
    curl -s http://localhost:$ORCHESTRATION_PORT/health | jq '.'
}

# Function to stop server
stop_server() {
    echo -e "${YELLOW}Stopping Orchestration Server...${NC}"
    
    if [ -f "$SERVICE_DIR/orchestration.pid" ]; then
        kill $(cat "$SERVICE_DIR/orchestration.pid") 2>/dev/null || true
        rm "$SERVICE_DIR/orchestration.pid"
    fi
    
    # Kill process on port if still running
    lsof -ti:$ORCHESTRATION_PORT | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✓ Server stopped${NC}"
}

# Function to show logs
show_logs() {
    if [ -f "$SERVICE_DIR/orchestration.log" ]; then
        tail -f "$SERVICE_DIR/orchestration.log"
    else
        echo -e "${RED}No logs found${NC}"
    fi
}

# Main menu
case "${1:-}" in
    start)
        start_server
        ;;
        
    stop)
        stop_server
        ;;
        
    restart)
        stop_server
        sleep 2
        start_server
        ;;
        
    status)
        get_health
        ;;
        
    agents)
        get_agents
        ;;
        
    spawn)
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
            echo "Usage: $0 spawn <agent-type> <description> <prompt>"
            echo "Agent types: business-analyst, code-reviewer, test-runner, technical-architect"
            exit 1
        fi
        spawn_agent "$2" "$3" "$4"
        ;;
        
    parallel)
        # Example: spawn 3 agents in parallel
        echo -e "${BLUE}Spawning 3 agents in parallel...${NC}"
        spawn_parallel '[
            {
                "description": "Analyze authentication requirements",
                "prompt": "Analyze the current authentication system and provide recommendations"
            },
            {
                "description": "Review code quality",
                "prompt": "Review the codebase for quality issues and best practices"
            },
            {
                "description": "Create test cases",
                "prompt": "Create comprehensive test cases for the authentication module"
            }
        ]'
        ;;
        
    logs)
        show_logs
        ;;
        
    demo)
        # Demo: Start server and spawn parallel agents
        echo -e "${BLUE}🎯 Running AI Orchestration Demo${NC}"
        echo "================================"
        
        # Start server
        start_server
        
        echo ""
        echo -e "${BLUE}Spawning 3 agents to work on microservices...${NC}"
        sleep 2
        
        # Spawn parallel agents for different services
        spawn_parallel '[
            {
                "description": "Optimize User Service",
                "prompt": "Analyze and optimize the User Management service for performance",
                "context": {"service": "user-management", "port": 4120}
            },
            {
                "description": "Add caching to Portfolio Service",
                "prompt": "Implement Redis caching for Portfolio service endpoints",
                "context": {"service": "portfolio", "port": 4160}
            },
            {
                "description": "Create API tests for Gateway",
                "prompt": "Create integration tests for API Gateway routes",
                "context": {"service": "gateway", "port": 4110}
            }
        ]'
        
        echo ""
        echo -e "${GREEN}✓ Demo started! Agents are working in parallel.${NC}"
        echo -e "${YELLOW}Check status: $0 agents${NC}"
        echo -e "${YELLOW}View logs: $0 logs${NC}"
        ;;
        
    *)
        echo "AI Orchestration System Control"
        echo "================================"
        echo "Usage: $0 {start|stop|restart|status|agents|spawn|parallel|logs|demo}"
        echo ""
        echo "Commands:"
        echo "  start     - Start orchestration server"
        echo "  stop      - Stop orchestration server"
        echo "  restart   - Restart orchestration server"
        echo "  status    - Show health status"
        echo "  agents    - List all active agents"
        echo "  spawn     - Spawn single agent"
        echo "  parallel  - Spawn multiple agents in parallel"
        echo "  logs      - Show server logs"
        echo "  demo      - Run demo with parallel agents"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 spawn business-analyst \"Analyze requirements\" \"Analyze the auth system\""
        echo "  $0 parallel"
        echo "  $0 demo"
        exit 1
        ;;
esac