#!/bin/bash

# =============================================================================
# Setup Claude Agents Script
# =============================================================================
# Description: Register all project agents with Claude CLI
# Author: Project Team
# Date: 2025-01-19
# =============================================================================

set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "   🤖 Claude Agents Setup & Registration"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Claude CLI is not installed${NC}"
    echo "Please install Claude CLI first: https://claude.ai/cli"
    exit 1
fi

echo -e "${GREEN}✅ Claude CLI found${NC}"
echo ""

# List available agents
echo -e "${BLUE}📋 Available Project Agents:${NC}"
echo "───────────────────────────────────────────────────────────────────"

# Array of available agents
declare -a AGENTS=(
    "business-analyst:Business Requirements Analyst:Analyze and document business requirements"
    "development-planner-enhanced:Enhanced Development Planner:Create detailed technical specifications"
    "devops-maturity-auditor:DevOps Maturity Auditor:Audit and improve DevOps practices"
    "sop-enforcer:SOP Enforcement Agent (Thai):Enforce project standards and SOPs"
    "dev-life-consultant:Development & Life Consultant:Provide holistic development and life advice"
)

# Display agents
index=1
for agent in "${AGENTS[@]}"; do
    IFS=':' read -r name title description <<< "$agent"
    echo -e "${YELLOW}$index.${NC} ${GREEN}$name${NC}"
    echo "   📝 $title"
    echo "   💡 $description"
    echo ""
    ((index++))
done

echo "───────────────────────────────────────────────────────────────────"
echo ""

# Create agent configuration file
CONFIG_FILE="$PROJECT_ROOT/.claude-agents.json"

echo -e "${BLUE}📝 Creating agent configuration...${NC}"

cat > "$CONFIG_FILE" << 'EOF'
{
  "version": "1.0.0",
  "project": "Stock Portfolio Management System",
  "agents": {
    "business-analyst": {
      "name": "Business Analyst",
      "description": "Analyze and document business requirements, create user stories, manage CLAUDE.md",
      "model": "claude-3-5-sonnet-20241022",
      "template": ".claude/agents/business-analyst.md",
      "capabilities": [
        "Requirements gathering",
        "Gap analysis",
        "User journey mapping",
        "Business process documentation",
        "CLAUDE.md management"
      ],
      "language": "en"
    },
    "development-planner": {
      "name": "Development Planner Enhanced",
      "description": "Create detailed technical specifications and development plans",
      "model": "claude-3-5-sonnet-20241022",
      "template": ".claude/agents/development-planner-enhanced.md",
      "capabilities": [
        "Technical architecture design",
        "WebSocket management planning",
        "Session management design",
        "Phased implementation planning",
        "Risk assessment"
      ],
      "language": "en"
    },
    "devops-maturity-auditor": {
      "name": "DevOps Maturity Auditor",
      "description": "Audit and improve DevOps practices against maturity standards",
      "model": "claude-3-5-sonnet-20241022",
      "template": ".claude/agents/devops-maturity-auditor.md",
      "capabilities": [
        "CI/CD pipeline assessment",
        "Infrastructure as Code review",
        "Security scanning integration",
        "Monitoring & observability",
        "Disaster recovery planning"
      ],
      "language": "en"
    },
    "sop-enforcer": {
      "name": "SOP Enforcer",
      "description": "Enforce project standards and prevent breaking changes",
      "model": "claude-3-5-sonnet-20241022",
      "template": ".claude/agents/sop-enforcer.md",
      "capabilities": [
        "Code change validation",
        "Git workflow enforcement",
        "Next.js routing standards",
        "Build/rebuild management",
        "Zero hardcoding policy"
      ],
      "language": "th"
    },
    "dev-life-consultant": {
      "name": "Development & Life Consultant",
      "description": "Provide holistic development and life management advice",
      "model": "claude-3-5-sonnet-20241022",
      "template": ".claude/agents/dev-life-consultant.md",
      "capabilities": [
        "Software architecture consulting",
        "Funding & business strategy",
        "Productivity optimization",
        "Work-life balance",
        "Technical debugging"
      ],
      "language": "en"
    },
    "code-reviewer": {
      "name": "Code Reviewer",
      "description": "Review code against project standards",
      "model": "claude-3-5-sonnet-20241022",
      "builtin": true,
      "capabilities": [
        "Code quality checks",
        "Security validation",
        "Performance analysis",
        "Best practices enforcement"
      ],
      "language": "en"
    },
    "technical-architect": {
      "name": "Technical Architect",
      "description": "Design system architecture and technical specifications",
      "model": "claude-3-5-sonnet-20241022",
      "builtin": true,
      "capabilities": [
        "System design",
        "API specification",
        "Database schema design",
        "Integration patterns"
      ],
      "language": "en"
    },
    "system-analyst": {
      "name": "System Analyst",
      "description": "Analyze system requirements and create technical documentation",
      "model": "claude-3-5-sonnet-20241022",
      "builtin": true,
      "capabilities": [
        "System analysis",
        "Technical documentation",
        "Process optimization",
        "Integration analysis"
      ],
      "language": "en"
    }
  },
  "workflows": {
    "new-feature": {
      "name": "New Feature Development",
      "steps": [
        {
          "agent": "business-analyst",
          "task": "Gather and analyze requirements"
        },
        {
          "agent": "technical-architect",
          "task": "Design technical architecture"
        },
        {
          "agent": "development-planner",
          "task": "Create implementation plan"
        },
        {
          "agent": "sop-enforcer",
          "task": "Validate against SOPs"
        },
        {
          "agent": "code-reviewer",
          "task": "Review implementation"
        }
      ]
    },
    "bug-fix": {
      "name": "Bug Fix Workflow",
      "steps": [
        {
          "agent": "sop-enforcer",
          "task": "Assess impact and check SOPs"
        },
        {
          "agent": "code-reviewer",
          "task": "Review fix implementation"
        }
      ]
    },
    "production-deployment": {
      "name": "Production Deployment",
      "steps": [
        {
          "agent": "devops-maturity-auditor",
          "task": "Audit deployment readiness"
        },
        {
          "agent": "sop-enforcer",
          "task": "Validate all SOPs"
        },
        {
          "agent": "code-reviewer",
          "task": "Final code review"
        }
      ]
    }
  }
}
EOF

echo -e "${GREEN}✅ Agent configuration created${NC}"
echo ""

# Create helper script for using agents
HELPER_SCRIPT="$PROJECT_ROOT/use-agent.sh"

echo -e "${BLUE}📝 Creating agent helper script...${NC}"

cat > "$HELPER_SCRIPT" << 'EOF'
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
EOF

chmod +x "$HELPER_SCRIPT"

echo -e "${GREEN}✅ Helper script created${NC}"
echo ""

# Update CLAUDE.md with agent information
echo -e "${BLUE}📝 Updating project documentation...${NC}"

# Create agents documentation
AGENTS_DOC="$PROJECT_ROOT/docs/claude/17-project-agents.md"

cat > "$AGENTS_DOC" << 'EOF'
# Project Agents Documentation

## Available Agents

### Project-Specific Agents

1. **business-analyst** - Business Requirements Analysis
   - Analyzes and documents business requirements
   - Creates user stories and journey maps
   - Manages CLAUDE.md updates
   - Language: English

2. **development-planner-enhanced** - Technical Planning
   - Creates detailed technical specifications
   - Designs system architecture
   - Plans phased implementations
   - Language: English

3. **devops-maturity-auditor** - DevOps Assessment
   - Audits CI/CD pipelines
   - Assesses infrastructure automation
   - Reviews security practices
   - Language: English

4. **sop-enforcer** - Standards Enforcement
   - Enforces project SOPs
   - Prevents breaking changes
   - Validates Git workflows
   - Language: Thai

5. **dev-life-consultant** - Holistic Consulting
   - Software architecture advice
   - Business strategy consulting
   - Productivity optimization
   - Language: English

### Built-in Claude Agents

6. **code-reviewer** - Code Review
   - Reviews code quality
   - Checks security practices
   - Validates performance

7. **technical-architect** - System Design
   - Creates system architectures
   - Designs APIs
   - Plans integrations

8. **system-analyst** - System Analysis
   - Analyzes requirements
   - Creates technical docs
   - Optimizes processes

## Using Agents

### In Claude CLI

Use the Task tool with the appropriate subagent_type:

```
Task tool:
- subagent_type: "business-analyst"
- prompt: "Analyze requirements for new payment feature"
```

### Via Helper Script

```bash
./use-agent.sh business-analyst "Analyze requirements for new payment feature"
```

## Agent Workflows

### New Feature Development
1. business-analyst → Gather requirements
2. technical-architect → Design architecture
3. development-planner → Create plan
4. sop-enforcer → Validate SOPs
5. code-reviewer → Review implementation

### Bug Fix Process
1. sop-enforcer → Check impact
2. code-reviewer → Review fix

### Production Deployment
1. devops-maturity-auditor → Audit readiness
2. sop-enforcer → Validate SOPs
3. code-reviewer → Final review

## Agent Configuration

Agents are configured in:
- Templates: `.claude/agents/*.md`
- Config: `.claude-agents.json`
- Helper: `use-agent.sh`

## Best Practices

1. **Choose the Right Agent**: Match agent expertise to task
2. **Provide Clear Context**: Give agents complete information
3. **Follow Workflows**: Use established workflows for common tasks
4. **Update Documentation**: Keep CLAUDE.md updated after changes
5. **Language Preference**: Use Thai for sop-enforcer, English for others

## Troubleshooting

- **Agent not found**: Check agent name spelling
- **No response**: Ensure Claude CLI is running
- **Wrong language**: Specify language preference in prompt
- **Missing context**: Provide more details about the task
EOF

echo -e "${GREEN}✅ Documentation updated${NC}"
echo ""

# Display summary
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}   ✅ Agent Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Files created:"
echo "   • $CONFIG_FILE"
echo "   • $HELPER_SCRIPT"
echo "   • $AGENTS_DOC"
echo ""
echo "🚀 How to use agents:"
echo ""
echo "1. In Claude CLI, use the Task tool:"
echo "   subagent_type: 'business-analyst'"
echo "   prompt: 'Your task here'"
echo ""
echo "2. Via helper script:"
echo "   ./use-agent.sh business-analyst 'Your task here'"
echo ""
echo "3. Available agents:"
for agent in "${AGENTS[@]}"; do
    IFS=':' read -r name title description <<< "$agent"
    echo "   • $name"
done
echo ""
echo "📚 Full documentation: docs/claude/17-project-agents.md"
echo ""
echo "═══════════════════════════════════════════════════════════════════"