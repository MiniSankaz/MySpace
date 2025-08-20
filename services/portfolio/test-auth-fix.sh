#!/bin/bash

# Test Authentication Fix for Transaction API
# This script tests various authentication scenarios

echo "========================================="
echo "Testing Transaction Authentication Fixes"
echo "========================================="
echo ""

BASE_URL="http://localhost:4160"
PORTFOLIO_ID="test-portfolio-123"

# Test 1: Development mode with x-user-id header
echo "Test 1: Development mode with x-user-id header"
echo "----------------------------------------------"
curl -X POST "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/transactions" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -H "x-user-email: test@example.com" \
  -d '{
    "symbol": "AAPL",
    "type": "BUY",
    "quantity": 10,
    "price": 180.50,
    "date": "2025-01-19"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 2: Development mode with mock Bearer token
echo "Test 2: Development mode with mock Bearer token"
echo "----------------------------------------------"
curl -X POST "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{
    "symbol": "GOOGL",
    "type": "SELL",
    "quantity": 5,
    "price": 140.25,
    "date": "2025-01-19"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 3: Development mode with mock-user-* token
echo "Test 3: Development mode with mock-user-* token"
echo "----------------------------------------------"
curl -X POST "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-user-john" \
  -d '{
    "symbol": "MSFT",
    "type": "BUY",
    "quantity": 15,
    "price": 380.75,
    "date": "2025-01-19"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 4: Get transactions with authentication
echo "Test 4: Get transactions with authentication"
echo "----------------------------------------------"
curl -X GET "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/transactions" \
  -H "x-user-id: test-user-123" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 5: No authentication (should fail with helpful message)
echo "Test 5: No authentication (should fail)"
echo "----------------------------------------------"
curl -X POST "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TSLA",
    "type": "BUY",
    "quantity": 20,
    "price": 250.30,
    "date": "2025-01-19"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "========================================="
echo "Authentication Tests Complete"
echo "========================================="