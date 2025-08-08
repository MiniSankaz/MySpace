#!/bin/bash

# CMS Test Script
echo "🧪 Running CMS Tests"
echo "==================="
echo ""

# Check if test environment is setup
if [ ! -f ".env.test" ]; then
    echo "⚙️  Creating test environment..."
    cp .env.example .env.test
    
    # Update database URL for testing
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|cms_db|cms_test_db|' .env.test
    else
        sed -i 's|cms_db|cms_test_db|' .env.test
    fi
fi

# Run type checking
echo "🔍 Type checking..."
npx tsc --noEmit
echo ""

# Run linting
echo "🔍 Linting..."
npm run lint
echo ""

# Run unit tests
echo "🧪 Running unit tests..."
npm test
echo ""

# Run integration tests (if available)
if [ -f "tests/integration" ]; then
    echo "🧪 Running integration tests..."
    npm run test:integration
    echo ""
fi

echo "✅ All tests completed!"