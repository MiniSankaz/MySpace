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
