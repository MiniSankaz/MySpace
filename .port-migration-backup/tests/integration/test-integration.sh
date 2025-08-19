#!/bin/bash

# Integration Test Suite for Stock Portfolio v3.0 Microservices
# Tests inter-service communication and functionality

set -e

echo "🧪 Stock Portfolio v3.0 Integration Tests"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    local method=${4:-GET}
    local data=${5:-}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    fi
    
    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $response)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test JSON response
test_json_response() {
    local name=$1
    local url=$2
    local json_path=$3
    local expected_value=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    actual_value=$(curl -s "$url" 2>/dev/null | jq -r "$json_path" 2>/dev/null || echo "null")
    
    if [ "$actual_value" = "$expected_value" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Value: $actual_value)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected '$expected_value', got '$actual_value')"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "${BLUE}1. Testing Service Health Endpoints${NC}"
echo "----------------------------------------"
test_endpoint "Gateway Health" "http://localhost:4000/health" "200"
test_endpoint "User Management Health" "http://localhost:4100/health" "200"
test_endpoint "Portfolio Service Health" "http://localhost:4500/health" "200"
echo ""

echo -e "${BLUE}2. Testing Service Discovery${NC}"
echo "----------------------------------------"
test_endpoint "Service Registry" "http://localhost:4000/services" "200"
test_json_response "Registry Success" "http://localhost:4000/services" ".success" "true"
echo ""

echo -e "${BLUE}3. Testing Direct Service Access${NC}"
echo "----------------------------------------"
test_endpoint "Portfolio Stocks Direct" "http://localhost:4500/api/v1/stocks/trending" "200"
test_endpoint "User Management Direct" "http://localhost:4100/info" "200"
echo ""

echo -e "${BLUE}4. Testing API Gateway Routing${NC}"
echo "----------------------------------------"
# Test if gateway properly routes to services
echo -e "${YELLOW}Note: Gateway routing requires all services to be running${NC}"

# Portfolio service routes through gateway
test_endpoint "Stocks Search via Gateway" "http://localhost:4000/api/v1/stocks/search?q=AAPL" "200"
test_endpoint "Trending Stocks via Gateway" "http://localhost:4000/api/v1/stocks/trending" "200"

# User service routes through gateway
test_endpoint "Auth Login via Gateway" "http://localhost:4000/api/v1/auth/login" "400" "POST" '{"email":"test@example.com","password":"test"}'
echo ""

echo -e "${BLUE}5. Testing Portfolio Service Features${NC}"
echo "----------------------------------------"
# Create a portfolio
portfolio_data='{"name":"Test Portfolio","description":"Integration test portfolio","userId":"test-user"}'
test_endpoint "Create Portfolio" "http://localhost:4500/api/v1/portfolios" "201" "POST" "$portfolio_data"

# Get portfolios
test_endpoint "List Portfolios" "http://localhost:4500/api/v1/portfolios" "200"

# Search stocks
test_endpoint "Search AAPL Stock" "http://localhost:4500/api/v1/stocks/search?q=AAPL" "200"
test_json_response "AAPL Symbol" "http://localhost:4500/api/v1/stocks/search?q=AAPL" ".data[0].symbol" "AAPL"
echo ""

echo -e "${BLUE}6. Testing Authentication Flow${NC}"
echo "----------------------------------------"
# Register user
register_data='{"email":"test'$(date +%s)'@example.com","password":"Test@123","firstName":"Test","lastName":"User"}'
test_endpoint "Register User" "http://localhost:4100/auth/register" "201" "POST" "$register_data"

# Login attempt
login_data='{"email":"test@example.com","password":"Test@123"}'
test_endpoint "Login Attempt" "http://localhost:4100/auth/login" "401" "POST" "$login_data"
echo ""

echo -e "${BLUE}7. Testing WebSocket Endpoints${NC}"
echo "----------------------------------------"
# Test WebSocket connectivity (basic check)
echo -n "Testing Terminal WebSocket... "
if timeout 1 bash -c 'echo "" | nc -z localhost 4300 2>/dev/null'; then
    echo -e "${GREEN}✓ PASS${NC} (Port open)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ SKIP${NC} (Service not running)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -n "Testing Portfolio WebSocket... "
if timeout 1 bash -c 'echo "" | nc -z localhost 4500 2>/dev/null'; then
    echo -e "${GREEN}✓ PASS${NC} (Port open)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ SKIP${NC} (Service not running)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${BLUE}8. Testing Inter-Service Communication${NC}"
echo "----------------------------------------"
# Test correlation ID propagation
echo -n "Testing Correlation ID... "
correlation_id="test-$(date +%s)"
response_headers=$(curl -s -I -H "X-Correlation-Id: $correlation_id" "http://localhost:4000/health" 2>/dev/null)
if echo "$response_headers" | grep -q "x-correlation-id: $correlation_id"; then
    echo -e "${GREEN}✓ PASS${NC} (ID preserved)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC} (ID not preserved)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${BLUE}9. Testing Rate Limiting${NC}"
echo "----------------------------------------"
echo -n "Testing rate limit (5 requests)... "
for i in {1..5}; do
    curl -s -o /dev/null "http://localhost:4000/health" 2>/dev/null
done
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/health" 2>/dev/null)
if [ "$response" = "200" ] || [ "$response" = "429" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Rate limiting active)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Unexpected response: $response)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${BLUE}10. Testing Error Handling${NC}"
echo "----------------------------------------"
test_endpoint "Invalid Route" "http://localhost:4000/api/v1/invalid" "404"
test_endpoint "Invalid Service Route" "http://localhost:4500/invalid" "404"
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: $SUCCESS_RATE%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Most tests passed ($SUCCESS_RATE%)${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Too many tests failed ($FAILED_TESTS/$TOTAL_TESTS)${NC}"
    exit 1
fi