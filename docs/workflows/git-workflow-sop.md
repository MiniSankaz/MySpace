# Git Workflow SOP (Standard Operating Procedure)

## Branch Strategy

### Main Branches

1. **`main`** - Production branch (stable release)
2. **`uat`** - User Acceptance Testing branch
3. **`dev`** - Development branch (default working branch)

### Branch Flow

```
feature/* → dev → uat → main
   ↓         ↓      ↓      ↓
 develop    test  staging  production
```

## Development Workflow

### 1. Daily Development Work

```bash
# Always work on dev branch
git checkout dev

# Pull latest changes
git pull origin dev

# Make your changes...

# Stage and commit
git add .
git commit -m "feat: your feature description"

# Push to dev branch
git push origin dev
```

### 2. Feature Development

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Work on your feature...

# Commit changes
git add .
git commit -m "feat: implement new feature"

# Push feature branch
git push origin feature/your-feature-name

# Create PR to merge into dev
# After review, merge to dev
```

### 3. UAT Deployment (Only when instructed)

```bash
# Ensure dev is up to date
git checkout dev
git pull origin dev

# Switch to UAT and merge dev
git checkout uat
git pull origin uat
git merge dev

# Push to UAT
git push origin uat
```

### 4. Production Deployment (Only when approved)

```bash
# Ensure UAT is tested and approved
git checkout uat
git pull origin uat

# Switch to main and merge UAT
git checkout main
git pull origin main
git merge uat

# Push to main
git push origin main

# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc)
- **refactor**: Code refactoring
- **test**: Test additions or modifications
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
feat(auth): add two-factor authentication
fix(api): resolve timeout issue in user endpoint
docs(readme): update installation instructions
refactor(components): optimize Button component
```

## Quick Commands

### Check current branch

```bash
git branch --show-current
```

### Switch between branches

```bash
git checkout dev      # Switch to dev
git checkout uat      # Switch to uat (only when needed)
git checkout main     # Switch to main (rarely needed)
```

### Update branch with latest changes

```bash
git checkout dev
git pull origin dev
```

### View all branches

```bash
git branch -a         # Show all branches (local + remote)
```

## Important Rules

1. **NEVER commit directly to `main` branch**
2. **NEVER commit directly to `uat` branch**
3. **ALWAYS work on `dev` branch for daily development**
4. **ONLY push to `uat` when explicitly instructed**
5. **Create feature branches from `dev` for larger features**
6. **Always pull before push to avoid conflicts**
7. **Write clear, descriptive commit messages**

## Conflict Resolution

If you encounter merge conflicts:

```bash
# Update your branch
git pull origin dev

# If conflicts exist, resolve them manually
# Edit conflicted files
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "fix: resolve merge conflicts"
git push origin dev
```

## Emergency Rollback

If something goes wrong in production:

```bash
# Find the last known good commit
git log --oneline

# Checkout main and reset to that commit
git checkout main
git reset --hard <commit-hash>
git push origin main --force-with-lease
```

⚠️ **WARNING**: Force push should only be used in emergencies and with team approval.

## Automated Hooks

The project includes git hooks that run automatically:

- **pre-commit**: Runs linting and formatting
- **pre-push**: Runs tests
- **commit-msg**: Validates commit message format

## Current Branch Status

As of now, you should be working on the **`dev`** branch. All daily development work should be committed and pushed to this branch.

```bash
# Verify you're on dev branch
git branch --show-current
# Should output: dev
```
