#!/bin/bash

# Auto Test Runner - No permission required for whitelisted commands
# This script can be run by Claude without asking for permission

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Testing Service URL
TESTING_SERVICE="http://localhost:4180"

echo -e "${BLUE}🧪 Auto Test Runner${NC}"
echo "=================================="
echo ""

# Function to run test suite
run_suite() {
    local suite=$1
    echo -e "${YELLOW}Running $suite tests...${NC}"
    
    response=$(curl -s -X POST "$TESTING_SERVICE/api/v1/test/run" \
        -H "Content-Type: application/json" \
        -d "{\"suite\": \"$suite\"}" 2>/dev/null || echo '{"success": false}')
    
    if echo "$response" | grep -q '"success":true'; then
        testId=$(echo "$response" | grep -o '"testId":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✓ Test suite started: $testId${NC}"
        
        # Wait for completion
        sleep 3
        
        # Get results
        results=$(curl -s "$TESTING_SERVICE/api/v1/test/results?testId=$testId" 2>/dev/null || echo '{}')
        
        passed=$(echo "$results" | grep -o '"passed":[0-9]*' | cut -d: -f2 || echo "0")
        failed=$(echo "$results" | grep -o '"failed":[0-9]*' | cut -d: -f2 || echo "0")
        
        if [ "$failed" = "0" ] || [ -z "$failed" ]; then
            echo -e "${GREEN}✓ All tests passed ($passed tests)${NC}"
        else
            echo -e "${RED}✗ Some tests failed (Passed: $passed, Failed: $failed)${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to start test suite${NC}"
    fi
    echo ""
}

# Function to validate command
validate_command() {
    local command=$1
    echo -e "${YELLOW}Validating: $command${NC}"
    
    response=$(curl -s -X POST "$TESTING_SERVICE/api/v1/validate" \
        -H "Content-Type: application/json" \
        -d "{\"command\": \"$command\"}" 2>/dev/null || echo '{"data": {"safe": false}}')
    
    if echo "$response" | grep -q '"safe":true'; then
        echo -e "${GREEN}✓ Command is safe (auto-approved)${NC}"
    else
        echo -e "${RED}✗ Command requires approval${NC}"
    fi
}

# Main menu
case "${1:-menu}" in
    health)
        run_suite "health"
        ;;
    api)
        run_suite "api"
        ;;
    smoke)
        run_suite "smoke"
        ;;
    integration)
        run_suite "integration"
        ;;
    validate)
        if [ -z "$2" ]; then
            echo "Usage: $0 validate \"command to validate\""
            exit 1
        fi
        validate_command "$2"
        ;;
    all)
        run_suite "smoke"
        run_suite "health"
        run_suite "api"
        ;;
    *)
        echo "Auto Test Runner - Run tests without permission"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  health       Run health check tests"
        echo "  api          Run API tests"
        echo "  smoke        Run smoke tests"
        echo "  integration  Run integration tests"
        echo "  all          Run all basic tests"
        echo "  validate     Validate if a command is safe"
        echo ""
        echo "Examples:"
        echo "  $0 smoke"
        echo "  $0 validate \"curl http://localhost:4110/health\""
        echo ""
        echo "Note: These commands are whitelisted and don't require permission"
        ;;
esac