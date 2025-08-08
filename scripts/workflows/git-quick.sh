#!/bin/bash

# Quick Git Commands for Dev Workflow

case "$1" in
    "push" | "p")
        # Quick commit and push to dev
        if [ -z "$2" ]; then
            echo "❌ Please provide a commit message"
            echo "Usage: ./git-quick.sh push \"your commit message\""
            exit 1
        fi
        git add .
        git commit -m "$2"
        git push origin dev
        echo "✅ Pushed to dev branch"
        ;;
        
    "update" | "u")
        # Update dev branch
        git pull origin dev
        echo "✅ Updated dev branch"
        ;;
        
    "status" | "s")
        # Show status
        echo "📌 Current branch: $(git branch --show-current)"
        git status
        ;;
        
    "switch" | "sw")
        # Switch to dev
        git checkout dev
        git pull origin dev
        echo "✅ Switched to dev branch"
        ;;
        
    "log" | "l")
        # Show recent commits
        git log --oneline -10
        ;;
        
    *)
        echo "Git Quick Commands"
        echo "=================="
        echo "./git-quick.sh push \"message\"  - Commit and push to dev"
        echo "./git-quick.sh update         - Pull latest from dev"
        echo "./git-quick.sh status         - Show git status"
        echo "./git-quick.sh switch         - Switch to dev branch"
        echo "./git-quick.sh log            - Show recent commits"
        echo ""
        echo "Shortcuts:"
        echo "p  = push"
        echo "u  = update"
        echo "s  = status"
        echo "sw = switch"
        echo "l  = log"
        ;;
esac