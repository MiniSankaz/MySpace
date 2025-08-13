# Agent Guidelines & Best Practices

## Working with AI Agents

### ⚠️ CRITICAL: Pre-Coding Checklist
1. **READ [Authentication Standards](./15-authentication-standards.md)** - MANDATORY for API work
2. **VERIFY variable names** - Check Login API for cookie names
3. **CHECK existing patterns** - Don't assume, verify with actual code
4. **NEVER use `auth-token`** - Always use `accessToken` for auth cookies

### Core Principles
1. **Trust but Verify** - Always verify agent outputs
2. **Atomic Tasks** - Break work into small, verifiable units
3. **Clear Context** - Provide specific, detailed instructions
4. **Progress Tracking** - Use TodoWrite for task management
5. **Documentation** - Update CLAUDE.md after significant changes
6. **Authentication First** - ALWAYS check auth standards before API work

## Known Agent Issues

### 1. Development Planner Overconfidence
**Problem**: Agent claims tasks complete without creating files
**Symptom**: "✅ API routes created" but files don't exist
**Root Cause**: Context limitations, hallucination, incomplete tool usage
**Solution**: Always verify with Code Reviewer after Development Planner

### 2. Context Length Limitations
**Problem**: Agents may "forget" earlier steps in long tasks
**Solution**: Break work into smaller phases, verify each phase

### 3. Hallucination Risk
**Problem**: Agents may imagine they've completed tasks
**Solution**: Use "Trust but Verify" approach

### 4. Code Duplication Blind Spot ⚠️ NEW
**Problem**: Agents may fix one file but miss similar/duplicate code in other files
**Symptom**: "✅ Fixed terminal-ws-standalone.js" but claude-terminal-ws.js has same issue
**Root Cause**: Tunnel vision, focusing on error logs instead of systematic search
**Solution**: 
- Always search globally: `grep -r "pattern" src/`
- Check for duplicate implementations before fixing
- Fix ALL similar files, not just the one with errors
- Use systematic approach: Find → Analyze → Fix All → Verify All

### 5. Incomplete Impact Analysis
**Problem**: Agents don't check all affected components
**Symptom**: Fix works for one component but breaks others
**Solution**:
- Create dependency map before changes
- Test ALL affected components
- Check both direct and indirect dependencies

## Recommended Agent Workflow

### ❌ BAD Pattern:
```
User: "Develop complete system with 5 phases"
Development Planner: "✅ All 5 phases complete!" 
[Reality: Only 2 phases done, API routes missing]
```

### ✅ GOOD Pattern:
```
User: "Create Phase 1: API routes"
Development Planner: [Creates files]
User: "Code review Phase 1"
Code Reviewer: [Verifies files exist and work]
User: "Continue with Phase 2"
```

## Agent Usage Guidelines

### Task Decomposition
- Maximum 3-5 files per agent task
- Verify completion before next task
- Define clear success criteria

### Verification Chain
```
Plan (BA) → Execute (Dev) → Verify (Code Review) → Test
```

### Clear Success Criteria
- Define what "done" means explicitly
- Include file paths that should exist
- Specify tests that should pass

### Use Multiple Agents
- **business-analyst**: Analyze and plan
- **development-planner**: Implement
- **code-reviewer**: Verify
- **sop-enforcer**: Ensure standards
- **dev-life-consultant**: Holistic view
- **technical-architect**: Design system architecture (use for Terminal V2 changes)

### Track Progress
- Use TodoWrite for task tracking
- Update after EACH completed task
- Don't mark complete until verified

## Agent-Specific Notes

### business-analyst
- Good at planning, not execution
- Use for requirements gathering
- Excellent for gap analysis

### development-planner
- May claim false completions
- Always verify outputs
- Good for structured implementation

### code-reviewer
- Most reliable for verification
- Thorough analysis
- Good at finding issues

### sop-enforcer
- Good for standards compliance
- May be overly strict
- Use for final checks

### dev-life-consultant
- Good for holistic view
- Balances technical and business
- Helpful for prioritization

## Best Practices

### 1. Start with Business Analyst
```
"Analyze requirements for [feature]"
→ Get clear plan
→ Break into phases
```

### 2. Implement with Development Planner
```
"Implement Phase 1 from the plan"
→ Create specific files
→ Small, verifiable chunks
```

### 3. Verify with Code Reviewer
```
"Review the implementation of Phase 1"
→ Check files exist
→ Verify functionality
→ Identify issues
```

### 4. Enforce Standards with SOP Enforcer
```
"Check if implementation follows SOPs"
→ Ensure compliance
→ Fix violations
```

## Communication Tips

### Be Specific
❌ "Build the feature"
✅ "Create REST API endpoint POST /api/users that accepts {name, email} and returns {id, name, email}"

### Include Context
❌ "Fix the bug"
✅ "Fix the terminal reconnection loop issue in XTermView.tsx where sessions disconnect after 30 seconds"

### Define Success
❌ "Make it work"
✅ "Ensure all tests pass and the terminal stays connected for at least 5 minutes"

## Common Pitfalls

### 1. Assuming File Creation
Always verify files were actually created

### 2. Skipping Verification
Never skip the Code Reviewer step

### 3. Large Tasks
Break everything into smaller pieces

### 4. Vague Instructions
Be extremely specific

### 5. Not Using TodoWrite
Always track multi-step tasks

## Emergency Procedures

### If Agent Gets Stuck
1. Stop current task
2. Clear context with new conversation
3. Start with smaller task
4. Provide more specific instructions

### If Agent Produces Wrong Output
1. Don't try to fix in same conversation
2. Start fresh with correct instructions
3. Be more explicit about requirements

### If Agent Claims False Success
1. Use Code Reviewer to verify
2. List specific files to check
3. Ask for proof (show file contents)

## Terminal V2 Specific Agent Guidelines

### Working with Terminal V2 System
When working on Terminal V2 features, follow these agent-specific guidelines:

#### 1. Architecture Understanding First
```bash
# Before any Terminal V2 changes, agents should understand:
ls -la src/services/terminal-v2/core/          # Core services
ls -la src/services/terminal-v2/orchestrator/  # Orchestration
ls -la src/services/terminal-v2/migration/     # Migration system
```

#### 2. Use technical-architect Agent
For Terminal V2 changes, always start with technical-architect:
```
"Design Terminal V2 changes for [feature] considering clean architecture principles"
→ Get proper architecture design
→ Understand service boundaries
→ Plan integration points
```

#### 3. Migration Service Considerations
When making Terminal V2 changes, agents must consider:
- **Backward Compatibility**: Legacy system must continue working
- **Progressive Migration**: Changes must work in all migration modes
- **Feature Flags**: Use migration service to control feature rollout

#### 4. Testing Requirements for Agents
All Terminal V2 agent work must include:
```bash
# Integration testing
npx tsx scripts/test-terminal-integration.ts

# Load testing
npx tsx scripts/load-test-terminal.ts

# Health check verification
curl http://localhost:4000/api/terminal-v2/migration-status
```

#### 5. Service Responsibility Matrix
Agents must respect clean architecture boundaries:

| Service | Responsible For | NOT Responsible For |
|---------|----------------|-------------------|
| SessionManager | Session lifecycle, focus, suspend/resume | WebSocket handling, metrics |
| StreamManager | WebSocket, PTY processes, I/O | Session state, business logic |
| MetricsCollector | Performance monitoring | Session management, streams |
| Orchestrator | Service coordination | Direct business logic |
| Migration Service | Feature flags, progressive rollout | Core functionality |

#### 6. Common Agent Mistakes with Terminal V2
1. **Mixing Service Concerns**: Putting stream logic in session manager
2. **Bypassing Migration**: Direct service calls instead of using migration layer
3. **Missing Error Handling**: Not implementing circuit breaker patterns
4. **Incomplete Testing**: Only testing happy path, not migration scenarios

#### 7. Agent Verification Checklist for Terminal V2
Before marking Terminal V2 tasks complete, agents must verify:
- [ ] Service boundaries maintained
- [ ] Migration service integration working
- [ ] All migration modes tested (legacy/dual/new/progressive)
- [ ] Circuit breakers implemented
- [ ] Integration tests passing
- [ ] Load tests showing acceptable performance
- [ ] Health endpoint responding correctly
- [ ] Prometheus metrics available

#### 8. Escalation Path for Terminal V2
If agents encounter Terminal V2 issues:
1. **First**: Check Terminal V2 architecture documentation
2. **Second**: Run diagnostic commands to understand current state
3. **Third**: Use technical-architect agent to redesign approach
4. **Fourth**: Consult SOPs for Terminal V2 development standards

### Agent Communication Patterns for Terminal V2

#### ✅ GOOD Pattern for Terminal V2:
```
User: "Add session timeout feature to Terminal V2"
technical-architect: [Designs approach respecting clean architecture]
development-planner: [Implements following architecture design]
code-reviewer: [Verifies clean architecture maintained]
sop-enforcer: [Ensures Terminal V2 standards followed]
```

#### ❌ BAD Pattern for Terminal V2:
```
User: "Add session timeout to Terminal V2"
development-planner: [Directly modifies multiple services without architecture plan]
[Result: Breaks clean architecture, creates tight coupling]
```

### Terminal V2 Agent Success Criteria
- Clean architecture principles maintained
- Backward compatibility preserved
- Progressive migration supported
- All tests pass (unit + integration + load)
- Performance benchmarks met
- Documentation updated