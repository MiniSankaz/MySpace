# 📚 Scripts Library

## 🚀 Quick Start

### Universal Project Manager

```bash
# Interactive menu
./scripts/universal-project-manager.sh

# Shortcut
./scripts/upm

# Direct commands
./scripts/upm new      # Create new project
./scripts/upm update   # Update SOP files
./scripts/upm refactor # Refactor structure
```

## 📁 Directory Structure

```
scripts/
├── generators/        # Code generation scripts
│   ├── generate-module-v2.ts
│   ├── generate-module-v3.ts
│   └── generate.sh
├── workflows/         # Workflow automation
│   ├── git-workflow.sh
│   ├── git-quick.sh
│   ├── isolate-fix.sh
│   └── unified-workflow.sh
├── setup/            # Setup scripts
│   ├── setup.sh
│   ├── setup-dev.sh
│   └── setup-production-env.sh
├── testing/          # Test scripts
│   ├── test.sh
│   ├── test-impact.sh
│   └── comprehensive-test.sh
├── database/         # Database management
│   ├── backup.sh
│   ├── restore.sh
│   └── reset-db.sh
└── utils/           # Utility scripts
    ├── fix-typescript-errors.sh
    └── update-imports.sh
```

## 🔧 Generator Scripts

### Generate Module V3

```bash
# Interactive module generator
tsx scripts/generators/generate-module-v3.ts

# With options
tsx scripts/generators/generate-module-v3.ts --name products --type full
```

### Smart Code Generator

```bash
# Generate component
tsx _library/cli/generate.ts component Button

# Generate API endpoint
tsx _library/cli/generate.ts api user

# Generate model
tsx _library/cli/generate.ts model Product
```

## 🔄 Workflow Scripts

### Git Workflow

```bash
# Complete git workflow
./scripts/workflows/git-workflow.sh

# Quick commit and push
./scripts/workflows/git-quick.sh "feat: add new feature"
```

### Isolate Fix Workflow

```bash
# Fix specific issues in isolation
./scripts/workflows/isolate-fix.sh
```

### Unified Workflow

```bash
# Run complete development workflow
./scripts/workflows/unified-workflow.sh
```

## 🧪 Testing Scripts

### Run Tests

```bash
# Run all tests
./scripts/testing/test.sh

# Test with impact analysis
./scripts/testing/test-impact.sh

# Comprehensive test suite
./scripts/testing/comprehensive-test.sh
```

## 💾 Database Scripts

### Database Management

```bash
# Backup database
./scripts/database/backup.sh

# Restore from backup
./scripts/database/restore.sh backup-20240101.sql

# Reset database
./scripts/database/reset-db.sh
```

## 🛠 Setup Scripts

### Initial Setup

```bash
# Development setup
./scripts/setup/setup-dev.sh

# Production setup
./scripts/setup/setup-production-env.sh
```

## 📝 Available NPM Scripts

Add these to your package.json:

```json
{
  "scripts": {
    "gen": "./scripts/generators/generate.sh",
    "gen:module": "tsx scripts/generators/generate-module-v3.ts",
    "smart:generate": "tsx _library/cli/generate.ts",
    "workflow": "./scripts/workflows/unified-workflow.sh",
    "fix": "./scripts/workflows/isolate-fix.sh",
    "setup": "./scripts/setup/setup-dev.sh"
  }
}
```

## 🎯 Tips

1. **Always make scripts executable**:

   ```bash
   chmod +x scripts/**/*.sh
   ```

2. **Use scripts from project root**:

   ```bash
   ./scripts/[category]/[script].sh
   ```

3. **Check script help**:

   ```bash
   ./scripts/upm --help
   ```

4. **Customize for your project**:
   - Edit scripts to match your project structure
   - Add project-specific configurations
   - Update paths and dependencies

## 📚 Documentation

See `/docs/sop/` for detailed Standard Operating Procedures for each workflow.
