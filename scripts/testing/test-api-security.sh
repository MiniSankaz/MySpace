#!/bin/bash

# Test API Security Status

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3100"

echo -e "${BLUE}=== API Security Test ===${NC}\n"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_without_auth=$4
    local expected_with_auth=$5
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $method $endpoint"
    
    # Test without auth
    if [ "$method" = "GET" ]; then
        status_no_auth=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    else
        status_no_auth=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    echo -n "Without auth: "
    if [ "$status_no_auth" = "$expected_without_auth" ]; then
        echo -e "${GREEN}✓ $status_no_auth (Expected)${NC}"
    else
        echo -e "${RED}✗ $status_no_auth (Expected: $expected_without_auth)${NC}"
    fi
    
    # Test with auth (mock token)
    if [ "$method" = "GET" ]; then
        status_with_auth=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer mock-token" "$BASE_URL$endpoint")
    else
        status_with_auth=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Authorization: Bearer mock-token" "$BASE_URL$endpoint")
    fi
    
    echo -n "With auth: "
    if [ "$status_with_auth" = "$expected_with_auth" ]; then
        echo -e "${GREEN}✓ $status_with_auth (Expected)${NC}"
    else
        echo -e "${RED}✗ $status_with_auth (Expected: $expected_with_auth)${NC}"
    fi
    
    echo
}

echo -e "${BLUE}1. Content APIs${NC}\n"
test_endpoint "Posts List" "GET" "/api/posts" "200" "200"
test_endpoint "Create Post" "POST" "/api/posts" "401" "201"
test_endpoint "Categories List" "GET" "/api/categories" "200" "200"
test_endpoint "Create Category" "POST" "/api/categories" "401" "201"

echo -e "${BLUE}2. Page APIs${NC}\n"
test_endpoint "Pages List" "GET" "/api/pages" "401" "200"
test_endpoint "Public Pages" "GET" "/api/page-builder/pages/public?status=published" "200" "200"

echo -e "${BLUE}3. Survey APIs${NC}\n"
test_endpoint "Surveys List" "GET" "/api/surveys" "401" "200"
test_endpoint "Survey Templates" "GET" "/api/surveys/templates" "401" "200"

echo -e "${BLUE}4. Chat APIs${NC}\n"
test_endpoint "Chat Settings" "GET" "/api/chat/settings" "200" "200"

echo -e "${BLUE}Summary:${NC}"
echo "- Public endpoints should return 200 without auth"
echo "- Protected endpoints should return 401 without auth"
echo "- All endpoints should work with valid auth"