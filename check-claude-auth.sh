#!/bin/bash

echo "🔍 Checking Claude CLI Authentication Status..."
echo "================================================"

# Check Claude version
echo -e "\n📌 Claude CLI Version:"
claude --version 2>&1 || echo "❌ Claude CLI not found"

# Check for API key in environment
echo -e "\n📌 Environment API Key:"
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY not set"
else
    echo "✅ ANTHROPIC_API_KEY is set (${#ANTHROPIC_API_KEY} characters)"
fi

# Check for config file
echo -e "\n📌 Config File:"
if [ -f ~/.claude/config.json ]; then
    echo "✅ Config file exists at ~/.claude/config.json"
    # Check if it has apiKey
    if grep -q "apiKey" ~/.claude/config.json 2>/dev/null; then
        echo "✅ API key found in config"
    else
        echo "❌ No API key in config"
    fi
else
    echo "❌ No config file at ~/.claude/config.json"
fi

# Check auth token
echo -e "\n📌 Auth Token:"
if [ -f ~/.claude/auth.json ]; then
    echo "✅ Auth token file exists"
else
    echo "❌ No auth token file"
fi

# Test Claude CLI
echo -e "\n📌 Testing Claude CLI:"
echo "test" | claude 2>&1 | head -5

echo -e "\n================================================"
echo "📝 To login with your Claude account, run:"
echo "   claude login"
echo ""
echo "📝 Or set API key:"
echo "   export ANTHROPIC_API_KEY='your-api-key'"
echo "================================================"