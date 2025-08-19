#!/bin/bash

# Claude Terminal Runner Script
# This script runs Claude AI in a separate terminal for parallel processing

echo "🤖 Starting Claude AI Terminal..."

# Check if TypeScript is compiled
if [ ! -d "dist" ]; then
  echo "📦 Building TypeScript files..."
  npm run build
fi

# Set environment variables
export CLAUDE_API_KEY=${CLAUDE_API_KEY:-""}
export NODE_ENV=${NODE_ENV:-"development"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Claude AI Terminal Interface        ║${NC}"
echo -e "${BLUE}║     Running in parallel mode            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if Claude CLI is installed
if command -v claude &> /dev/null; then
    echo -e "${GREEN}✓ Claude CLI detected${NC}"
else
    echo -e "${YELLOW}⚠ Claude CLI not found, using API mode${NC}"
fi

# Run the terminal
if [ -f "dist/modules/personal-assistant/terminal/claude-terminal.js" ]; then
    node dist/modules/personal-assistant/terminal/claude-terminal.js
else
    echo -e "${YELLOW}Building and running from TypeScript...${NC}"
    npx ts-node src/modules/personal-assistant/terminal/claude-terminal.ts
fi