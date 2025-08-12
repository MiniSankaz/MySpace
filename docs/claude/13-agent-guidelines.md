# Agent Guidelines & Best Practices

## Working with AI Agents

### Core Principles
1. **Trust but Verify** - Always verify agent outputs
2. **Atomic Tasks** - Break work into small, verifiable units
3. **Clear Context** - Provide specific, detailed instructions
4. **Progress Tracking** - Use TodoWrite for task management
5. **Documentation** - Update CLAUDE.md after significant changes

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