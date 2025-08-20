#!/bin/bash

# Simple test with Claude CLI
echo "🧪 Testing Claude CLI directly"
echo "=============================="
echo ""

# Create a simple prompt
PROMPT="What is 2+2? Answer in one word only."

echo "📝 Prompt: $PROMPT"
echo ""
echo "🤖 Calling Claude..."
echo ""

# Call Claude with a simple prompt
echo "$PROMPT" | claude

echo ""
echo "✅ Test completed!"