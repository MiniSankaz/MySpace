#!/bin/bash

# Git Workflow Helper Script
# This script helps manage the dev → uat → main workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if there are uncommitted changes
check_clean_working_tree() {
    if [[ -n $(git status -s) ]]; then
        print_error "Working tree is not clean. Please commit or stash your changes."
        exit 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "==================================="
    echo "Git Workflow Helper"
    echo "==================================="
    echo "Current branch: ${GREEN}$CURRENT_BRANCH${NC}"
    echo ""
    echo "1. Switch to dev branch"
    echo "2. Update current branch"
    echo "3. Commit and push to dev"
    echo "4. Merge dev to UAT (requires permission)"
    echo "5. Merge UAT to main (requires permission)"
    echo "6. Create feature branch"
    echo "7. View branch status"
    echo "8. Show commit history"
    echo "9. Exit"
    echo ""
    read -p "Select option (1-9): " choice
}

# Switch to dev branch
switch_to_dev() {
    print_info "Switching to dev branch..."
    git checkout dev
    git pull origin dev
    print_success "Switched to dev branch and updated"
}

# Update current branch
update_branch() {
    print_info "Updating $CURRENT_BRANCH branch..."
    git pull origin $CURRENT_BRANCH
    print_success "Branch updated"
}

# Commit and push to dev
commit_and_push() {
    if [ "$CURRENT_BRANCH" != "dev" ]; then
        print_warning "You're not on dev branch. Switching to dev..."
        git checkout dev
        git pull origin dev
    fi
    
    print_info "Current status:"
    git status
    
    read -p "Enter commit message (or 'cancel' to abort): " commit_msg
    
    if [ "$commit_msg" = "cancel" ]; then
        print_warning "Commit cancelled"
        return
    fi
    
    git add .
    git commit -m "$commit_msg"
    git push origin dev
    print_success "Changes committed and pushed to dev"
}

# Merge dev to UAT
merge_to_uat() {
    print_warning "This will merge dev into UAT branch."
    read -p "Do you have permission to deploy to UAT? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Operation cancelled"
        return
    fi
    
    check_clean_working_tree
    
    print_info "Updating branches..."
    git checkout dev
    git pull origin dev
    
    git checkout uat
    git pull origin uat
    
    print_info "Merging dev into UAT..."
    git merge dev
    
    print_info "Pushing to UAT..."
    git push origin uat
    
    print_success "Successfully merged dev to UAT"
    git checkout dev
}

# Merge UAT to main
merge_to_main() {
    print_error "⚠️  WARNING: This will deploy to PRODUCTION!"
    read -p "Do you have approval to deploy to production? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Operation cancelled"
        return
    fi
    
    check_clean_working_tree
    
    print_info "Updating branches..."
    git checkout uat
    git pull origin uat
    
    git checkout main
    git pull origin main
    
    print_info "Merging UAT into main..."
    git merge uat
    
    print_info "Pushing to main..."
    git push origin main
    
    read -p "Create a release tag? (yes/no): " create_tag
    if [ "$create_tag" = "yes" ]; then
        read -p "Enter version tag (e.g., v1.0.0): " tag_name
        git tag -a $tag_name -m "Release $tag_name"
        git push origin $tag_name
        print_success "Tag $tag_name created"
    fi
    
    print_success "Successfully deployed to production"
    git checkout dev
}

# Create feature branch
create_feature() {
    read -p "Enter feature name (will create feature/name): " feature_name
    
    if [ -z "$feature_name" ]; then
        print_error "Feature name cannot be empty"
        return
    fi
    
    print_info "Creating feature branch from dev..."
    git checkout dev
    git pull origin dev
    git checkout -b "feature/$feature_name"
    
    print_success "Created and switched to feature/$feature_name"
    print_info "When ready, push with: git push origin feature/$feature_name"
}

# View branch status
view_status() {
    echo ""
    print_info "Local branches:"
    git branch
    echo ""
    print_info "Remote branches:"
    git branch -r
    echo ""
    print_info "Current status:"
    git status
}

# Show commit history
show_history() {
    print_info "Recent commits on $CURRENT_BRANCH:"
    git log --oneline -10
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) switch_to_dev ;;
        2) update_branch ;;
        3) commit_and_push ;;
        4) merge_to_uat ;;
        5) merge_to_main ;;
        6) create_feature ;;
        7) view_status ;;
        8) show_history ;;
        9) print_info "Goodbye!"; exit 0 ;;
        *) print_error "Invalid option" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done