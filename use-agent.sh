#!/bin/bash

# Agent Helper Script
# Usage: ./use-agent.sh <agent-name> "<task>"

AGENT=$1
TASK=$2

if [ -z "$AGENT" ] || [ -z "$TASK" ]; then
    echo "Usage: ./use-agent.sh <agent-name> \"<task>\""
    echo ""
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

# This would normally invoke the Claude CLI with the agent
# For now, it shows how to use the Task tool
echo "To use this agent in Claude CLI, use the Task tool with:"
echo "subagent_type: $AGENT"
echo "prompt: $TASK"
