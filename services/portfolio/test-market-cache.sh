#!/bin/bash

# Test Market Data Caching with Redis
# This script tests the performance improvements from Redis caching

echo "========================================="
echo "Testing Market Data Cache Performance"
echo "========================================="
echo ""

BASE_URL="http://localhost:4160"

# Function to measure API response time
measure_time() {
    local url=$1
    local headers=$2
    local start=$(date +%s%N)
    curl -s -X GET "$url" $headers > /dev/null
    local end=$(date +%s%N)
    local elapsed=$((($end - $start) / 1000000))
    echo "$elapsed ms"
}

# Test 1: Single stock quote (first call - cache miss)
echo "Test 1: Single Stock Quote - Cache Miss"
echo "----------------------------------------------"
echo -n "AAPL first call: "
time1=$(measure_time "${BASE_URL}/api/v1/stocks/AAPL/quote" "-H 'x-user-id: test-user'")
echo "$time1"

# Test 2: Same stock quote (cache hit - should be < 50ms)
echo ""
echo "Test 2: Single Stock Quote - Cache Hit"
echo "----------------------------------------------"
echo -n "AAPL second call: "
time2=$(measure_time "${BASE_URL}/api/v1/stocks/AAPL/quote" "-H 'x-user-id: test-user'")
echo "$time2"

echo -n "AAPL third call: "
time3=$(measure_time "${BASE_URL}/api/v1/stocks/AAPL/quote" "-H 'x-user-id: test-user'")
echo "$time3"

# Test 3: Multiple stock quotes (batch request)
echo ""
echo "Test 3: Multiple Stock Quotes - Batch"
echo "----------------------------------------------"
SYMBOLS="AAPL,GOOGL,MSFT,TSLA,AMZN"

echo -n "Batch first call (5 symbols): "
time4=$(measure_time "${BASE_URL}/api/v1/stocks/quotes?symbols=${SYMBOLS}" "-H 'x-user-id: test-user'")
echo "$time4"

echo -n "Batch second call (cached): "
time5=$(measure_time "${BASE_URL}/api/v1/stocks/quotes?symbols=${SYMBOLS}" "-H 'x-user-id: test-user'")
echo "$time5"

# Test 4: Cache statistics
echo ""
echo "Test 4: Cache Statistics"
echo "----------------------------------------------"
curl -s -X GET "${BASE_URL}/api/v1/stocks/cache/stats" \
  -H "x-user-id: test-user" | jq '.'

# Test 5: Large batch (10 symbols)
echo ""
echo "Test 5: Large Batch Performance"
echo "----------------------------------------------"
LARGE_SYMBOLS="AAPL,GOOGL,MSFT,TSLA,AMZN,META,NVDA,JPM,V,JNJ"

echo -n "Large batch first call (10 symbols): "
time6=$(measure_time "${BASE_URL}/api/v1/stocks/quotes?symbols=${LARGE_SYMBOLS}" "-H 'x-user-id: test-user'")
echo "$time6"

echo -n "Large batch second call (cached): "
time7=$(measure_time "${BASE_URL}/api/v1/stocks/quotes?symbols=${LARGE_SYMBOLS}" "-H 'x-user-id: test-user'")
echo "$time7"

# Test 6: Portfolio value calculation with cached prices
echo ""
echo "Test 6: Portfolio Value Calculation"
echo "----------------------------------------------"
PORTFOLIO_ID="test-portfolio-123"

echo -n "Portfolio value calculation (with cache): "
time8=$(measure_time "${BASE_URL}/api/v1/portfolios/${PORTFOLIO_ID}/value" "-H 'x-user-id: test-user'")
echo "$time8"

# Performance Summary
echo ""
echo "========================================="
echo "Performance Summary"
echo "========================================="
echo "Single Stock:"
echo "  - First call (cache miss): $time1"
echo "  - Second call (cache hit): $time2"
echo "  - Third call (cache hit): $time3"
echo ""
echo "Batch (5 symbols):"
echo "  - First call: $time4"
echo "  - Cached call: $time5"
echo ""
echo "Large Batch (10 symbols):"
echo "  - First call: $time6"
echo "  - Cached call: $time7"
echo ""

# Calculate improvement
if [[ $time1 =~ ^[0-9]+$ ]] && [[ $time2 =~ ^[0-9]+$ ]]; then
    improvement=$(( ($time1 - $time2) * 100 / $time1 ))
    echo "Cache Performance Improvement: ~${improvement}%"
fi

echo "========================================="
echo "Market Data Cache Tests Complete"
echo "========================================="