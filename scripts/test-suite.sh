#!/bin/bash

# Main Test Suite Runner
# Comprehensive testing with Testing Service integration

set -e

# Source configuration if available
if [ -f "$(dirname "$0")/../shared/config/ports.sh" ]; then
    source "$(dirname "$0")/../shared/config/ports.sh"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Testing Service
TESTING_SERVICE_PORT=${PORT_TESTING:-4180}
TESTING_SERVICE_URL="http://localhost:$TESTING_SERVICE_PORT"

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🧪 Comprehensive Test Suite      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check if Testing Service is running
check_testing_service() {
    echo -e "${YELLOW}Checking Testing Service...${NC}"
    
    if curl -s "$TESTING_SERVICE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Testing Service is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Testing Service is not running${NC}"
        echo -e "${YELLOW}Starting Testing Service...${NC}"
        
        # Try to start Testing Service
        cd services/testing 2>/dev/null && npm run dev > /dev/null 2>&1 &
        sleep 5
        
        if curl -s "$TESTING_SERVICE_URL/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Testing Service started${NC}"
            return 0
        else
            echo -e "${RED}Failed to start Testing Service${NC}"
            return 1
        fi
    fi
}

# Run test suite via Testing Service
run_test_suite() {
    local suite=$1
    local description=$2
    
    echo ""
    echo -e "${BLUE}═══ $description ═══${NC}"
    
    # Run suite
    response=$(curl -s -X POST "$TESTING_SERVICE_URL/api/v1/test/run" \
        -H "Content-Type: application/json" \
        -d "{\"suite\": \"$suite\"}" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to run $suite suite${NC}"
        return 1
    fi
    
    testId=$(echo "$response" | grep -o '"testId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$testId" ]; then
        echo -e "${RED}✗ No test ID received${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Test ID: $testId${NC}"
    
    # Wait for completion
    echo -n "Running tests"
    for i in {1..10}; do
        echo -n "."
        sleep 1
        
        # Check status
        results=$(curl -s "$TESTING_SERVICE_URL/api/v1/test/results?testId=$testId" 2>/dev/null)
        status=$(echo "$results" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then
            echo ""
            break
        fi
    done
    
    # Display results
    passed=$(echo "$results" | grep -o '"passed":[0-9]*' | cut -d: -f2 || echo "0")
    failed=$(echo "$results" | grep -o '"failed":[0-9]*' | cut -d: -f2 || echo "0")
    duration=$(echo "$results" | grep -o '"duration":[0-9]*' | cut -d: -f2 || echo "0")
    
    echo -e "${CYAN}Results:${NC}"
    echo -e "  Passed: ${GREEN}$passed${NC}"
    echo -e "  Failed: ${RED}$failed${NC}"
    echo -e "  Duration: ${duration}ms"
    
    if [ "$failed" = "0" ]; then
        echo -e "${GREEN}✓ Suite passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Suite failed${NC}"
        return 1
    fi
}

# Manual health check (fallback)
manual_health_check() {
    echo ""
    echo -e "${BLUE}═══ Manual Health Checks ═══${NC}"
    
    local services=("4110:Gateway" "4120:User" "4130:AI" "4140:Terminal" "4150:Workspace" "4160:Portfolio" "4170:Market")
    
    for service in "${services[@]}"; do
        IFS=':' read -r port name <<< "$service"
        echo -n "  $name ($port): "
        
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Online${NC}"
        else
            echo -e "${RED}✗ Offline${NC}"
        fi
    done
}

# Main execution
main() {
    local total_passed=0
    local total_failed=0
    
    # Check Testing Service
    if check_testing_service; then
        echo ""
        echo -e "${CYAN}Running automated test suites...${NC}"
        
        # Run test suites
        if run_test_suite "smoke" "Smoke Tests"; then
            ((total_passed++))
        else
            ((total_failed++))
        fi
        
        if run_test_suite "health" "Health Checks"; then
            ((total_passed++))
        else
            ((total_failed++))
        fi
        
        if run_test_suite "api" "API Tests"; then
            ((total_passed++))
        else
            ((total_failed++))
        fi
        
        # Optional: Run integration tests
        if [ "$1" = "--full" ]; then
            if run_test_suite "integration" "Integration Tests"; then
                ((total_passed++))
            else
                ((total_failed++))
            fi
        fi
    else
        echo -e "${YELLOW}Running manual checks...${NC}"
        manual_health_check
    fi
    
    # Summary
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           Test Summary               ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo -e "  Suites Passed: ${GREEN}$total_passed${NC}"
    echo -e "  Suites Failed: ${RED}$total_failed${NC}"
    
    if [ $total_failed -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Handle arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --full    Run all test suites including integration"
        echo "  --help    Show this help message"
        echo ""
        echo "This script runs comprehensive tests using the Testing Service"
        ;;
    *)
        main "$@"
        ;;
esac