# 🧭 Agent Navigation Guide

## Quick Document Access for Agents

This guide helps agents quickly find the information they need without reading entire documents.

## 📚 Documentation Structure

### Core Documents (Always Read First)

1. **CLAUDE.md** (Main Index) - 103 lines
   - Project overview and quick references
   - Links to all detailed documentation

### Detailed Documentation (/docs/claude/)

Each document now has a navigation index at the top for quick access to specific sections.

## 🎯 Agent-Specific Navigation

### For business-analyst

**Primary Focus**:

- `02-business-logic.md` - Business rules and processes
- `03-workflows.md` - User flows and use cases
- `04-features.md` - Feature status and roadmap

**Quick Access in Work Log**:

- Search for "business" in `14-agent-worklog.md` index

### For system-analyst

**Primary Focus**:

- `05-file-structure.md` - System architecture
- `06-api-reference.md` - API specifications
- `07-components-ui.md` - Component catalog
- Previous BA work in `14-agent-worklog.md`

**Quick Access in Work Log**:

- Search for "technical specs" or "SA" in index

### For development-planner

**Primary Focus**:

- Previous BA & SA work in `14-agent-worklog.md` (REQUIRED)
- `05-file-structure.md` - Architecture planning
- `06-api-reference.md` - API implementation
- `09-sops-standards.md` - Development standards

**Quick Access in Work Log**:

- Must check for BA/SA entries first
- Search for "development plan" or "checklist"

### For code-reviewer

**Primary Focus**:

- `09-sops-standards.md` - Code standards (CRITICAL)
- `07-components-ui.md` - Component patterns
- `08-import-guide.md` - Import validation
- `12-known-issues.md` - Known problems to check

**Quick Access in Known Issues**:

- Check index for relevant issue categories
- Focus on "Common Issues" and "Build Errors"

### For sop-compliance-guardian

**Primary Focus**:

- `09-sops-standards.md` - All SOPs (REQUIRED)
- `12-known-issues.md` - Compliance violations
- `11-commands.md` - Valid commands

**Quick Access in Known Issues**:

- Check "Critical Issues" first
- Review "Build Errors" section

## 🔍 Efficient Document Reading

### Using Navigation Indexes

Both `12-known-issues.md` and `14-agent-worklog.md` now have navigation indexes:

1. **Open document and read ONLY the index first**
2. **Identify relevant sections from index**
3. **Jump directly to needed sections**
4. **Skip irrelevant content**

### Example Workflow

```markdown
1. Read CLAUDE.md (103 lines) - Get overview
2. Check 14-agent-worklog.md INDEX - Find previous related work
3. Read only relevant log entries
4. Access specific doc sections as needed
5. Update only changed sections
```

## 📊 Document Sizes (for planning)

| Document               | Lines | Read Time   |
| ---------------------- | ----- | ----------- |
| CLAUDE.md (index)      | 103   | 30 seconds  |
| 01-project-info.md     | 150   | 1 minute    |
| 02-business-logic.md   | 200   | 1.5 minutes |
| 03-workflows.md        | 180   | 1.5 minutes |
| 04-features.md         | 120   | 1 minute    |
| 05-file-structure.md   | 250   | 2 minutes   |
| 06-api-reference.md    | 300   | 2.5 minutes |
| 07-components-ui.md    | 280   | 2 minutes   |
| 08-import-guide.md     | 150   | 1 minute    |
| 09-sops-standards.md   | 350   | 3 minutes   |
| 10-test-accounts.md    | 80    | 30 seconds  |
| 11-commands.md         | 100   | 45 seconds  |
| 12-known-issues.md     | 180   | 1.5 minutes |
| 13-agent-guidelines.md | 150   | 1 minute    |
| 14-agent-worklog.md    | 190   | 1.5 minutes |

## ⚡ Speed Tips

### Fast Information Retrieval

1. **Use Ctrl+F/Cmd+F** to search within documents
2. **Read indexes first** - Never read full document initially
3. **Use section anchors** - Jump directly to relevant parts
4. **Skip historical entries** - Focus on recent work
5. **Cache important info** - Remember key patterns

### What NOT to Read

- Historical work logs older than 1 week (unless specifically needed)
- Completed/fixed issues in known-issues.md
- Features marked as "Completed ✅" (unless verifying)
- Detailed implementation of unrelated modules

## 🔄 Update Strategy

### When Updating Documentation

1. **Update specific section only** - Don't rewrite entire file
2. **Update index if adding sections** - Keep navigation current
3. **Add date stamps** - For tracking changes
4. **Update work log** - Always record agent activities

### Priority Updates

- **Critical**: CLAUDE.md main index, SOPs
- **Important**: API changes, known issues
- **Standard**: Work logs, feature status
- **Low**: Historical records, completed items

## 📝 Summary

**For Maximum Efficiency**:

1. Read CLAUDE.md index (30 seconds)
2. Check relevant document indexes (10 seconds each)
3. Jump to specific sections only
4. Update only what changed
5. Record work in log with timestamp

**Time Saved**:

- Old method: Read 2,059 lines (15+ minutes)
- New method: Read 103 lines + specific sections (2-3 minutes)
- **Efficiency Gain**: 80-85% time reduction

---

_This guide helps agents work efficiently with the modular documentation structure._
