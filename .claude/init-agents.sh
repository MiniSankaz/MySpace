#!/bin/bash

# =============================================================================
# Claude Agents Auto-Initialization Script
# =============================================================================
# This script automatically initializes agents when Claude CLI starts
# It checks if agents are configured and sets them up if needed
# =============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration files
AGENTS_CONFIG="$PROJECT_ROOT/.claude-agents.json"
INIT_FLAG="$SCRIPT_DIR/.agents-initialized"
AGENTS_DIR="$SCRIPT_DIR/agents"

# Function to check if agents are initialized
check_agents_initialized() {
    if [ -f "$INIT_FLAG" ]; then
        # Check if flag is older than agents directory
        if [ "$AGENTS_DIR" -nt "$INIT_FLAG" ]; then
            return 1  # Agents updated, need re-init
        fi
        return 0  # Already initialized
    fi
    return 1  # Not initialized
}

# Function to initialize agents
initialize_agents() {
    echo -e "${BLUE}🤖 Initializing Claude Agents...${NC}"
    
    # Create configuration if doesn't exist
    if [ ! -f "$AGENTS_CONFIG" ]; then
        echo -e "${YELLOW}📝 Creating agent configuration...${NC}"
        "$PROJECT_ROOT/scripts/setup-agents.sh" > /dev/null 2>&1
    fi
    
    # Create helper script if doesn't exist
    if [ ! -f "$PROJECT_ROOT/use-agent.sh" ]; then
        echo -e "${YELLOW}📝 Creating agent helper script...${NC}"
        cat > "$PROJECT_ROOT/use-agent.sh" << 'EOF'
#!/bin/bash
# Agent Helper Script
AGENT=$1
TASK=$2

if [ -z "$AGENT" ] || [ -z "$TASK" ]; then
    echo "Usage: ./use-agent.sh <agent-name> \"<task>\""
    echo "Available agents:"
    echo "  - business-analyst"
    echo "  - development-planner"
    echo "  - devops-maturity-auditor"
    echo "  - sop-enforcer"
    echo "  - dev-life-consultant"
    echo "  - code-reviewer"
    echo "  - technical-architect"
    echo "  - system-analyst"
    exit 1
fi

echo "🤖 Invoking $AGENT agent..."
echo "📋 Task: $TASK"
echo ""
echo "To use this agent in Claude CLI, use the Task tool with:"
echo "subagent_type: $AGENT"
echo "prompt: $TASK"
EOF
        chmod +x "$PROJECT_ROOT/use-agent.sh"
    fi
    
    # Mark as initialized
    touch "$INIT_FLAG"
    echo -e "${GREEN}✅ Agents initialized successfully${NC}"
}

# Function to list available agents
list_agents() {
    echo -e "${BLUE}📋 Available Project Agents:${NC}"
    echo "• business-analyst - Business requirements analysis"
    echo "• development-planner - Technical planning & architecture"
    echo "• devops-maturity-auditor - DevOps practices assessment"
    echo "• sop-enforcer - Standards enforcement (Thai)"
    echo "• dev-life-consultant - Holistic development consulting"
    echo "• code-reviewer - Code quality review"
    echo "• technical-architect - System design"
    echo "• system-analyst - System analysis"
}

# Main execution
main() {
    # Check if running in Claude CLI context
    if [ -n "$CLAUDE_CLI" ] || [ -n "$CLAUDE_CODE" ]; then
        if ! check_agents_initialized; then
            initialize_agents
        fi
    fi
    
    # If called directly, show status
    if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
        if check_agents_initialized; then
            echo -e "${GREEN}✅ Agents are initialized${NC}"
            list_agents
        else
            echo -e "${YELLOW}⚠️ Agents not initialized${NC}"
            initialize_agents
            list_agents
        fi
    fi
}

# Run main function
main "$@"