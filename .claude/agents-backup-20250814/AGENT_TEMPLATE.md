# Agent Configuration Template - CLAUDE.md Management

## 🔴 MANDATORY: CLAUDE.md Integration Protocol

This template MUST be included in ALL agents (Personal & Project types).

### **ก่อนเริ่มทำงานทุกครั้ง (BEFORE EVERY TASK):**

1. **ต้องอ่าน CLAUDE.md** ที่ root directory ของ project เสมอ
2. หากไม่มี CLAUDE.md หรือข้อมูลไม่ครบ ให้สร้าง/อัพเดตให้มีหัวข้อครบถ้วน:

```markdown
# CLAUDE.md - AI Assistant Guidelines

## 1. Project Information

- Project Name & Description
- Technology Stack (languages, frameworks, databases)
- Development/Production URLs
- Repository Information
- Version Information

## 2. Business Logic

- Core Business Rules
- User Roles & Permissions
- Key Business Processes
- Data Flow & State Management
- Business Constraints & Requirements
- Domain-Specific Knowledge

## 3. Flow/Use Cases

- User Journey Maps
- Authentication Flow
- Main Feature Workflows
- Error Handling Patterns
- Edge Cases & Exception Flows
- Integration Points

## 4. Feature List

- Completed Features (with descriptions)
- In-Progress Features (with status)
- Planned Features (with priorities)
- Feature Dependencies & Relationships
- Feature Flags & Toggles

## 5. File/Module Structure

- Directory Organization
- Module Responsibilities
- Naming Conventions
- File Size Limits
- Code Organization Patterns
- Architecture Decisions

## 6. API/Service List

- REST API Endpoints (method, path, description, params, response)
- GraphQL Schemas
- WebSocket Events
- External Service Integrations
- Service Dependencies
- API Versioning

## 7. Component/Module/UI List

- Reusable Components (props, usage, examples)
- Page Components
- Layout Components
- Utility Components
- HOCs and Hooks
- Component Dependencies
- Style System

## 8. Import Guide

- How to Import Services (with examples)
- How to Import Components (with examples)
- Absolute vs Relative Imports
- Barrel Exports
- Module Resolution Patterns
- Dependency Management

## 9. Default SOP

- Git Workflow (branches, commits, PRs)
- Code Review Process
- Testing Requirements
- Deployment Process
- Security Standards
- Performance Standards
- Documentation Standards

## 10. Test Accounts & Credentials

- Development Accounts
- Test User Credentials
- API Keys (reference to .env)
- Service Accounts
- Test Data Sets

## 11. Common Commands

- Development Commands
- Build & Deploy Commands
- Database Commands
- Testing Commands
- Utility Scripts
- Troubleshooting Commands

## 12. Known Issues & Solutions

- Current Bugs (with workarounds)
- Performance Issues
- Technical Debt
- Common Errors & Fixes
- Environment-Specific Issues

## 13. Agent Work Log (Auto-updated by agents)

- Date/Time
- Agent Name
- Task Performed
- Changes Made
- Issues Found
- Solutions Applied
```

### **หลังทำงานเสร็จทุกครั้ง (AFTER EVERY TASK):**

1. **ต้องอัพเดต CLAUDE.md** ด้วยข้อมูลใหม่:
   - Business logic ที่ค้นพบหรือเปลี่ยนแปลง
   - Features ที่เพิ่มหรือแก้ไข
   - APIs/Services/Components ใหม่
   - Import patterns หรือ best practices
   - Solutions สำหรับปัญหาที่พบ
   - Commands หรือ workflows ใหม่
   - Architecture decisions
   - Performance optimizations
   - Test accounts ที่สร้างเพิ่ม
   - Known issues และ workarounds

2. **เพิ่ม entry ใน Agent Work Log** section:
   ```markdown
   ### [Current Date/Time] - [Agent Name]

   **Task:** [Brief description]
   **Changes:**

   - [List of changes made]
     **Issues Found:**
   - [Any issues discovered]
     **Solutions:**
   - [Solutions implemented]
   ```

### **Special Requirements by Agent Type:**

#### For Business/Requirements Agents:

- Focus on updating Business Logic section
- Document user stories and acceptance criteria
- Update Feature List with detailed specifications

#### For Development/Code Agents:

- Update File/Module Structure
- Document new components and services
- Add import examples and usage patterns

#### For DevOps/Infrastructure Agents:

- Update deployment and CI/CD information
- Document infrastructure changes
- Add monitoring and alerting details

#### For Testing/QA Agents:

- Update test accounts and test data
- Document test coverage improvements
- Add testing commands and procedures

#### For Security/Compliance Agents:

- Update security standards and protocols
- Document compliance requirements
- Add security-related commands

### **Quality Checks:**

Before considering work complete, verify:

- [ ] CLAUDE.md has been read at start
- [ ] All relevant sections have been updated
- [ ] New discoveries are documented
- [ ] Work log entry is added
- [ ] Examples and usage guides are included
- [ ] Known issues are documented with workarounds
- [ ] Commands are tested and documented

### **Integration with Other Agents:**

When multiple agents work on the same project:

1. Check the Agent Work Log to see recent changes
2. Review updates made by other agents
3. Ensure your changes don't conflict
4. Build upon previous agent work
5. Reference other agent insights when relevant

---

## Implementation Instructions

To add this protocol to any agent:

1. Insert the CLAUDE.md requirements section at the beginning of the agent instructions
2. Ensure the agent checks for CLAUDE.md before any task
3. Make the agent update CLAUDE.md after completing work
4. Include specific focus areas based on agent type
5. Test that the agent properly reads and writes to CLAUDE.md

This ensures all agents maintain consistent project documentation and can build upon each other's work effectively.
