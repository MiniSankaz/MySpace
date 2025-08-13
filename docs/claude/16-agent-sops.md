# Agent Standard Operating Procedures (SOPs)

> **Last Updated**: 2025-01-13
> **Version**: 1.0.0
> **Status**: ACTIVE

## 📋 Table of Contents

1. [General Agent Requirements](#general-agent-requirements)
2. [Code Reviewer Agent SOPs](#code-reviewer-agent-sops)
3. [Technical Architect Agent SOPs](#technical-architect-agent-sops)
4. [Business Analyst Agent SOPs](#business-analyst-agent-sops)
5. [Development Planner Agent SOPs](#development-planner-agent-sops)
6. [SOP Enforcer Agent SOPs](#sop-enforcer-agent-sops)

---

## 🎯 General Agent Requirements

### ✅ MANDATORY Pre-Work Checklist

**ALL AGENTS MUST:**

1. **Read CLAUDE.md** - อ่าน `/CLAUDE.md` ก่อนเริ่มงานทุกครั้ง
2. **Check Known Issues** - ตรวจสอบ `/docs/claude/12-known-issues.md`
3. **Review Recent Work** - ดู `/docs/claude/14-agent-worklog.md`
4. **Follow Project Standards** - ปฏิบัติตาม `/docs/claude/09-sops-standards.md`
5. **Log All Activities** - บันทึกงานใน work log หลังเสร็จงาน

### 📝 Work Logging Requirements

```markdown
## [YYYY-MM-DD HH:MM] - [Agent Type]
### Task: [Task Description]
### Status: [Completed/In Progress/Failed]
### Changes Made:
- [List of changes]
### Issues Found:
- [List of issues]
### Recommendations:
- [Next steps]
```

---

## 🔍 Code Reviewer Agent SOPs

### Purpose
ตรวจสอบ code quality, security, performance และ compliance กับ standards

### Pre-Review Checklist
```yaml
mandatory_checks:
  - Read CLAUDE.md
  - Load project standards from /docs/claude/09-sops-standards.md
  - Check recent issues from /docs/claude/12-known-issues.md
  - Review authentication standards from /docs/claude/15-authentication-standards.md
```

### Review Criteria

#### 1. **Hardcoded Values Check (CRITICAL)**
```typescript
// ❌ REJECT - Hardcoded values
const API_URL = "http://localhost:3000";
const DB_PATH = "/tmp/database";
const PORT = 4000;

// ✅ ACCEPT - Dynamic configuration
const API_URL = process.env.API_URL || config.api.url;
const DB_PATH = getStoragePath('database');
const PORT = parseInt(process.env.PORT || '4000');
```

**Automatic Rejection Criteria:**
- Hardcoded URLs (http://, https://, ws://, wss://)
- Hardcoded ports (3000, 4000, etc.)
- Hardcoded file paths (/tmp, /var, C:\\, etc.)
- Hardcoded credentials or API keys
- Hardcoded database connections

#### 2. **Security Check**
- No exposed credentials
- No SQL injection vulnerabilities
- No XSS vulnerabilities
- Proper authentication checks
- Safe file path handling

#### 3. **Performance Check**
- No unnecessary re-renders
- Proper memoization
- Efficient algorithms
- Database query optimization
- Memory leak prevention

#### 4. **Code Quality Check**
- TypeScript types properly defined
- No `any` types without justification
- Proper error handling
- Clean code principles
- DRY (Don't Repeat Yourself)

### Review Output Format
```markdown
## Code Review Report
**Score**: XX/100
**Status**: [PASS/FAIL/NEEDS_IMPROVEMENT]

### Critical Issues ⚠️
1. [Issue description with line numbers]

### Security Vulnerabilities 🔒
1. [Vulnerability description]

### Performance Issues ⚡
1. [Performance issue]

### Code Quality 📊
1. [Quality issue]

### Hardcoded Values Found 🚫
1. File: [path], Line: [number], Value: [hardcoded value]

### Recommendations 💡
1. [Specific improvement suggestions]
```

### Post-Review Actions
1. Log review in `/docs/claude/14-agent-worklog.md`
2. Update known issues if new problems found
3. Create TODO items for required fixes

---

## 🏗️ Technical Architect Agent SOPs

### Pre-Work Requirements
```yaml
mandatory_reads:
  - /CLAUDE.md
  - /docs/claude/05-file-structure.md
  - /docs/claude/06-api-reference.md
  - /docs/claude/09-sops-standards.md
```

### Design Principles

#### 1. **No Hardcoding Policy**
- ALL configuration must use environment variables
- Create config modules for centralized management
- Use path helpers for file system operations
- Dynamic URL building for all endpoints

#### 2. **Architecture Standards**
```typescript
// Required structure for new modules
/src/modules/[module-name]/
  ├── components/     # UI components
  ├── services/       # Business logic
  ├── stores/         # State management
  ├── types/          # TypeScript definitions
  ├── utils/          # Helper functions
  └── config/         # Module configuration
```

#### 3. **Configuration Management**
```typescript
// Every module must have config.ts
export const moduleConfig = {
  api: {
    baseUrl: process.env.MODULE_API_URL,
    timeout: parseInt(process.env.MODULE_TIMEOUT || '5000')
  },
  storage: {
    path: getStoragePath('module-name')
  }
};
```

### Technical Documentation Format
```markdown
## Technical Specification: [Feature Name]

### Architecture Overview
[High-level design description]

### Configuration Requirements
- Environment Variables:
  - VAR_NAME: Description
- Storage Paths:
  - Path purpose and structure

### API Specifications
[Endpoint definitions]

### Database Schema
[Schema definitions]

### Integration Points
[How it connects with other modules]

### No-Hardcode Compliance ✅
- All values externalized to config
- Dynamic path generation implemented
- Environment-based URL building
```

---

## 📊 Business Analyst Agent SOPs

### Pre-Analysis Checklist
```yaml
required_reading:
  - /CLAUDE.md
  - /docs/claude/02-business-logic.md
  - /docs/claude/03-workflows.md
  - /docs/claude/04-features.md
```

### Requirements Analysis Process

1. **Understand Current State**
   - Review existing features
   - Check completed workflows
   - Identify integration points

2. **Document Requirements**
   ```markdown
   ## Requirement: [Name]
   ### Business Value
   [Why this is needed]
   
   ### Technical Constraints
   - No hardcoded values allowed
   - Must use existing config system
   - Follow project SOPs
   
   ### Success Criteria
   - [Measurable outcomes]
   ```

3. **Configuration Requirements**
   - List all configurable parameters
   - Define environment variables needed
   - Specify default values

### Output Deliverables
1. Requirements document
2. Configuration specification
3. Test scenarios
4. Update to `/docs/claude/14-agent-worklog.md`

---

## 📅 Development Planner Agent SOPs

### Planning Prerequisites
```yaml
must_review:
  - /CLAUDE.md
  - Technical specifications
  - Business requirements
  - /docs/claude/09-sops-standards.md
```

### Development Plan Structure

```markdown
## Development Plan: [Feature Name]

### Phase 1: Configuration Setup
- [ ] Create config module
- [ ] Define environment variables
- [ ] Setup path helpers
- [ ] Add to .env.example

### Phase 2: Implementation
- [ ] Core functionality
- [ ] API endpoints
- [ ] Database migrations
- [ ] UI components

### Phase 3: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Configuration tests
- [ ] Security tests

### Configuration Checklist ✅
- [ ] No hardcoded URLs
- [ ] No hardcoded ports
- [ ] No hardcoded paths
- [ ] All values in config
- [ ] Environment template updated
```

### Task Estimation
- Include configuration setup time
- Add time for removing existing hardcoded values
- Consider migration complexity

---

## 🛡️ SOP Enforcer Agent SOPs

### Enforcement Priorities

#### Level 1 - CRITICAL (Auto-Reject)
1. **Hardcoded Values**
   - Scan all code for hardcoded paths, URLs, ports
   - Check for embedded credentials
   - Verify configuration usage

2. **Security Violations**
   - Exposed secrets
   - Unsafe operations
   - Missing authentication

#### Level 2 - HIGH
1. **SOP Compliance**
   - Project structure adherence
   - Naming conventions
   - Git workflow compliance

2. **Documentation**
   - Missing CLAUDE.md updates
   - Incomplete work logs
   - Missing configuration docs

#### Level 3 - MEDIUM
1. **Code Quality**
   - TypeScript usage
   - Error handling
   - Performance optimization

### Enforcement Actions

```typescript
// Enforcement Response
interface EnforcementResult {
  status: 'PASS' | 'FAIL' | 'WARNING';
  violations: Violation[];
  blockers: string[];  // Issues that must be fixed
  warnings: string[];  // Issues that should be fixed
  suggestions: string[]; // Nice to have improvements
}

// Example enforcement
if (hasHardcodedValues(code)) {
  return {
    status: 'FAIL',
    blockers: ['Remove all hardcoded values'],
    violations: [{
      type: 'HARDCODED_VALUE',
      severity: 'CRITICAL',
      location: 'file:line',
      fix: 'Use environment variable or config'
    }]
  };
}
```

### Enforcement Report Format
```markdown
## SOP Enforcement Report
**Date**: [YYYY-MM-DD HH:MM]
**Status**: [PASS/FAIL]

### 🚫 Blockers (Must Fix)
1. Hardcoded port found at terminal.service.ts:455
2. Database URL embedded in code

### ⚠️ Warnings (Should Fix)
1. Missing configuration documentation
2. Work log not updated

### 💡 Suggestions
1. Consider extracting magic numbers to constants

### Remediation Steps
1. Create config module
2. Move values to environment
3. Update .env.example
4. Test configuration
```

---

## 📝 Work Log Template

All agents MUST log their work using this template:

```markdown
## [2025-01-13 14:30] - Code Reviewer Agent

### Task: Review Terminal Service Refactoring

### Pre-Work Completed ✅
- [x] Read CLAUDE.md
- [x] Checked known issues
- [x] Reviewed recent work log
- [x] Loaded project standards

### Review Results
**Score**: 78/100
**Status**: NEEDS_IMPROVEMENT

### Issues Found
1. **CRITICAL**: Hardcoded WebSocket ports (4001, 4002)
   - Location: terminal.service.ts:543-544
   - Fix: Use config.websocket.ports

2. **HIGH**: Direct localStorage access
   - Location: XTermView.tsx:65
   - Fix: Use authClient.getAccessToken()

### Changes Recommended
1. Create centralized config module
2. Extract all hardcoded values
3. Update environment template

### Time Spent: 45 minutes

### Next Steps
- Technical Architect to create config module
- Developer to implement fixes
- Re-review after fixes

---
```

## 🔄 SOP Update Process

1. **Propose Change**: Create issue with proposed SOP change
2. **Review**: Technical Architect reviews proposal
3. **Test**: Run trial with updated SOP
4. **Approve**: Team consensus required
5. **Document**: Update this file
6. **Notify**: Alert all agents of changes

## 📊 Compliance Metrics

Track and report monthly:
- Hardcoded values found: Target 0
- SOP violations: Target < 5
- Work log completion: Target 100%
- Pre-work checklist: Target 100%

## 🚨 Escalation Path

1. **Level 1**: Warning in review
2. **Level 2**: Block PR/commit
3. **Level 3**: Require architect review
4. **Level 4**: Team intervention

---

*This document is version controlled. All changes must be logged.*
*Last reviewed by: System*
*Next review date: 2025-02-13*