# start-all.sh Updated with Market Data Service

**Date**: 2025-08-18  
**Status**: ✅ **COMPLETE**

## Updates Made

### 1. Added Market Data Service to Startup Sequence

**Location**: Line 225-239
```bash
# Start Market Data Service (Port 4600)
echo -e "${CYAN}⏳ Starting Market Data Service (Port 4600)...${NC}"
if [ -f "$PWD/services/simple-price-api.js" ]; then
    # Use simple price API if available
    start_service "Market Data Service" 4600 \
        "$PWD/services" \
        "node simple-price-api.js > /tmp/market-data.log 2>&1"
elif [ -d "$PWD/services/market-data" ]; then
    # Use full market data service if available
    start_service "Market Data Service" 4600 \
        "$PWD/services/market-data" \
        "npm run dev > /tmp/market-data.log 2>&1"
else
    echo -e "${YELLOW}⚠️  Market Data Service not found - Portfolio will use mock prices${NC}"
fi
```

### 2. Added Health Check for Market Data

**Location**: Line 278
```bash
check_health "Market Data Service" "http://localhost:4600/health" && health_results+=("market:ok") || health_results+=("market:fail")
```

### 3. Updated Service Count

Changed from 7 to 8 services:
- API Gateway (4000)
- User Management (4100)
- AI Assistant (4200)
- Terminal Service (4300)
- Workspace Service (4400)
- Portfolio Service (4500)
- **Market Data Service (4600)** ← NEW
- Frontend (3000)

### 4. Added Service Log Entry

**Location**: Line 347
```bash
echo "  • Market Data:    tail -f /tmp/market-data.log"
```

### 5. Added API Endpoints Reference

**Location**: Line 334-338
```bash
echo "📈 Real-Time Price API Endpoints:"
echo "  • Single Quote:   GET http://localhost:4600/api/v1/market/quote/:symbol"
echo "  • Multiple Quotes: GET http://localhost:4600/api/v1/market/quotes?symbols=AAPL,GOOGL"
echo "  • Portfolio Value: GET http://localhost:4000/api/v1/portfolios/:id/value"
echo "  • Available Symbols: AAPL, GOOGL, MSFT, TSLA, AMZN, META, NVDA, JPM, V, JNJ"
```

## Features

### Smart Service Detection
- Checks for `simple-price-api.js` first (lightweight option)
- Falls back to full `market-data` service if available
- Shows warning if neither exists (uses mock prices)

### Log Monitoring
```bash
# View Market Data Service logs
tail -f /tmp/market-data.log

# Check specific errors
grep -i error /tmp/market-data.log

# Watch real-time requests
tail -f /tmp/market-data.log | grep "GET"
```

### Quick Testing
```bash
# Test single quote
curl http://localhost:4600/api/v1/market/quote/AAPL

# Test multiple quotes
curl "http://localhost:4600/api/v1/market/quotes?symbols=AAPL,GOOGL,MSFT"

# Test portfolio value with real prices
curl http://localhost:4000/api/v1/portfolios/[id]/value -H "x-user-id: test-user"
```

## Usage

### Start All Services Including Market Data
```bash
./start-all.sh
```

### Monitor Market Data Service
```bash
# Check if running
ps aux | grep -i "simple-price-api\|market-data"

# View logs
tail -f /tmp/market-data.log

# Test health
curl http://localhost:4600/health
```

### Stop All Services
```bash
pkill -f 'node|npm'
```

## Status Display

The script now shows:
- Service count updated to 8 total services
- Market Data Service health status
- Market Data API access point
- Real-time price API endpoints
- Log file location for Market Data

## Troubleshooting

### If Market Data Service Fails
1. Check log: `tail -f /tmp/market-data.log`
2. Verify port 4600 is free: `lsof -i:4600`
3. Check file exists: `ls services/simple-price-api.js`
4. Test manually: `node services/simple-price-api.js`

### Fallback Mode
If Market Data Service is unavailable:
- Portfolio Service uses mock prices automatically
- System remains functional with static prices
- Warning shown in startup output

---

**Result**: ✅ start-all.sh now includes Market Data Service with proper logging and monitoring