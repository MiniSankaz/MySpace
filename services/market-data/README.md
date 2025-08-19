# Market Data Service

Real-time and historical market data service powered by Polygon.io API.

## Features

- ✅ Real-time stock quotes
- ✅ Batch quote fetching (up to 100 symbols)
- ✅ Historical price data
- ✅ Two-tier caching (Redis + PostgreSQL)
- ✅ Rate limiting protection
- ✅ API usage tracking
- 🔄 Price charts (coming soon)
- 🔄 WebSocket streaming (coming soon)

## Setup

### 1. Install Dependencies

```bash
cd services/market-data
npm install
```

### 2. Configure Environment

Copy `.env` file and update if needed:
```bash
# Already configured with:
- Polygon.io API credentials
- PostgreSQL connection
- Redis configuration
- Port 4170
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

### 5. Start Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

All endpoints are accessible through the API Gateway at `http://localhost:4110`

### Get Single Quote
```bash
GET /api/v1/market/quote/:symbol

# Example
curl http://localhost:4110/api/v1/market/quote/AAPL
```

### Get Batch Quotes
```bash
GET /api/v1/market/quotes?symbols=AAPL,GOOGL,MSFT

# Example
curl "http://localhost:4110/api/v1/market/quotes?symbols=AAPL,GOOGL,MSFT"
```

### Clear Cache
```bash
POST /api/v1/market/quotes/cache/clear

# Clear all
curl -X POST http://localhost:4110/api/v1/market/quotes/cache/clear

# Clear specific symbol
curl -X POST http://localhost:4110/api/v1/market/quotes/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL"}'
```

### Health Check
```bash
GET /health

# Direct
curl http://localhost:4170/health

# Through Gateway
curl http://localhost:4110/health/market-data
```

## Response Format

### Quote Response
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 178.45,
    "change": 2.35,
    "changePercent": 1.33,
    "volume": 52341234,
    "high": 179.20,
    "low": 176.80,
    "open": 177.00,
    "previousClose": 176.10,
    "timestamp": "2025-08-17T14:30:00.000Z",
    "source": "polygon",
    "delay": 0
  },
  "meta": {
    "cached": false,
    "apiCallsUsed": 1,
    "rateLimit": {
      "remaining": 4,
      "reset": "2025-08-17T14:31:00.000Z"
    },
    "responseTime": 245
  }
}
```

## Rate Limits

### Polygon.io API Limits
- Free tier: 5 calls/minute, 1000 calls/month
- Basic tier: 100 calls/minute, 100,000 calls/month

### Service Rate Limits
- Per user: 60 requests/minute
- Global: 100 requests/second

## Caching Strategy

| Data Type | Cache TTL | Storage |
|-----------|-----------|---------|
| Real-time quotes | 30 seconds | Redis |
| Historical data (intraday) | 1 hour | Redis + PostgreSQL |
| Historical data (daily) | 24 hours | Redis + PostgreSQL |
| Symbol search | 1 hour | Redis |

## Database Tables

- `market_quotes` - Real-time quote snapshots
- `market_bars` - Historical OHLCV data
- `api_usage_tracking` - API call monitoring
- `market_symbols` - Stock symbol master data

## Development

### Run Tests
```bash
npm test
npm run test:coverage
```

### View Database
```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

### Logs
Logs are stored in `./logs/` directory:
- `market-data-combined.log` - All logs
- `market-data-errors.log` - Errors only
- `market-data-exceptions.log` - Uncaught exceptions
- `market-data-rejections.log` - Unhandled rejections

## Architecture

```
Market Data Service (4170)
├── Controllers
│   ├── QuoteController - Real-time quotes
│   ├── HistoryController - Historical data
│   └── ChartController - Chart data
├── Services
│   ├── PolygonService - Polygon.io API client
│   ├── CacheService - Redis cache manager
│   └── DatabaseService - PostgreSQL persistence
├── Middleware
│   ├── Authentication - JWT validation
│   ├── RateLimit - Request throttling
│   └── ErrorHandler - Global error handling
└── Utils
    └── Logger - Winston logging
```

## Troubleshooting

### Service won't start
- Check if port 4170 is available
- Verify PostgreSQL connection
- Ensure Redis is running
- Check Polygon.io API key

### No quote data
- Verify symbol is valid US stock
- Check Polygon.io API status
- Review rate limit status
- Check cache configuration

### High response times
- Monitor cache hit rate
- Check database query performance
- Review network latency
- Optimize batch request sizes

## Next Steps

- [ ] Add historical data endpoints
- [ ] Implement chart data endpoint
- [ ] Add WebSocket streaming
- [ ] Create symbol search endpoint
- [ ] Add technical indicators
- [ ] Implement portfolio integration
- [ ] Add frontend components
- [ ] Set up monitoring dashboards

## Support

For issues or questions, check:
- Service logs in `./logs/`
- API Gateway logs
- Polygon.io API status
- Database connection status