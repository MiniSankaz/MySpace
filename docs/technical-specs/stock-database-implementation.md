# Stock Database Implementation Guide

## Overview

The Stock Database system provides comprehensive multi-market stock management with search, filtering, and auto-completion capabilities. This implementation supports global stock trading with market-specific validation and real-time data integration.

## 📊 Database Schema

### Core Tables

#### `stock_master`
Primary table for stock information across all markets.

```sql
CREATE TABLE stock_master (
  id                    TEXT PRIMARY KEY,
  symbol                TEXT NOT NULL,
  name                  TEXT NOT NULL,
  exchange              TEXT NOT NULL,
  market                TEXT NOT NULL,           -- SET, NYSE, NASDAQ, etc.
  country               TEXT DEFAULT 'US',
  currency              TEXT DEFAULT 'USD',
  sector                TEXT,
  industry              TEXT,
  description           TEXT,
  website               TEXT,
  logo                  TEXT,
  employees             INTEGER,
  market_cap            DECIMAL(20,2),
  shares_outstanding    DECIMAL(20,2),
  pe_ratio              DECIMAL(10,4),
  eps                   DECIMAL(10,4),
  beta                  DECIMAL(8,4),
  dividend_yield        DECIMAL(8,4),
  fifty_two_week_high   DECIMAL(10,4),
  fifty_two_week_low    DECIMAL(10,4),
  avg_volume            DECIMAL(20,2),
  is_active             BOOLEAN DEFAULT true,
  is_delisted           BOOLEAN DEFAULT false,
  delisted_date         TIMESTAMP,
  ipo_date              TIMESTAMP,
  fiscal_year_end       TEXT,                    -- MM-DD format
  last_updated          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  
  UNIQUE(symbol, market)
);

-- Performance indexes
CREATE INDEX idx_stock_master_symbol ON stock_master(symbol);
CREATE INDEX idx_stock_master_market ON stock_master(market);
CREATE INDEX idx_stock_master_country ON stock_master(country);
CREATE INDEX idx_stock_master_sector ON stock_master(sector);
CREATE INDEX idx_stock_master_active ON stock_master(is_active);
CREATE INDEX idx_stock_master_market_cap ON stock_master(market_cap);
```

#### `stock_price_history`
Historical price data for charting and analysis.

```sql
CREATE TABLE stock_price_history (
  id                    TEXT PRIMARY KEY,
  stock_id              TEXT NOT NULL REFERENCES stock_master(id) ON DELETE CASCADE,
  symbol                TEXT NOT NULL,           -- Denormalized for performance
  date                  DATE NOT NULL,
  open                  DECIMAL(10,4) NOT NULL,
  high                  DECIMAL(10,4) NOT NULL,
  low                   DECIMAL(10,4) NOT NULL,
  close                 DECIMAL(10,4) NOT NULL,
  adjusted_close        DECIMAL(10,4) NOT NULL,
  volume                DECIMAL(20,2) NOT NULL,
  change                DECIMAL(10,4),
  change_percent        DECIMAL(8,4),
  source                TEXT DEFAULT 'YAHOO',
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  
  UNIQUE(stock_id, date)
);

CREATE INDEX idx_stock_price_history_symbol_date ON stock_price_history(symbol, date);
CREATE INDEX idx_stock_price_history_date ON stock_price_history(date);
```

#### `stock_realtime_prices`
Current real-time price data.

```sql
CREATE TABLE stock_realtime_prices (
  id                    TEXT PRIMARY KEY,
  stock_id              TEXT UNIQUE NOT NULL REFERENCES stock_master(id) ON DELETE CASCADE,
  symbol                TEXT NOT NULL,
  price                 DECIMAL(10,4) NOT NULL,
  change                DECIMAL(10,4) NOT NULL,
  change_percent        DECIMAL(8,4) NOT NULL,
  volume                DECIMAL(20,2) NOT NULL,
  high                  DECIMAL(10,4) NOT NULL,
  low                   DECIMAL(10,4) NOT NULL,
  open                  DECIMAL(10,4) NOT NULL,
  previous_close        DECIMAL(10,4) NOT NULL,
  market_cap            DECIMAL(20,2),
  timestamp             TIMESTAMP NOT NULL,
  source                TEXT DEFAULT 'YAHOO',
  is_market_open        BOOLEAN DEFAULT false,
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_stock_realtime_prices_symbol ON stock_realtime_prices(symbol);
CREATE INDEX idx_stock_realtime_prices_timestamp ON stock_realtime_prices(timestamp);
```

## 🛠️ Service Layer

### StockMasterService

Core service for stock database operations.

```typescript
// Key methods
await stockMasterService.searchStocks(filters);           // Search with filters
await stockMasterService.getStock(symbol, market);        // Get specific stock
await stockMasterService.getStockSuggestions(query);      // Autocomplete
await stockMasterService.getStocksByMarket(market);       // Market stocks
await stockMasterService.getPopularStocks(market);        // Popular stocks
await stockMasterService.validateStockForTrading(symbol, market);  // Trading validation
```

### MarketValidationService

Handles market-specific validation and formatting.

```typescript
// Symbol formatting for different markets
MarketValidationService.formatSymbol('CPALL', Market.SET);     // → 'CPALL'
MarketValidationService.getYahooSymbol('CPALL', Market.SET);   // → 'CPALL.BK'
MarketValidationService.validateSymbol(symbol, market);       // Symbol validation
MarketValidationService.validateTrade(symbol, market, qty, price);  // Trade validation
```

## 🔍 API Endpoints

### Stock Search & Discovery

```http
GET /api/v1/stocks/search
GET /api/v1/stocks/suggestions
GET /api/v1/stocks/:symbol?market=SET
GET /api/v1/stocks/market/:market
GET /api/v1/stocks/popular/:market?
GET /api/v1/stocks/sectors/:market?
GET /api/v1/stocks/statistics/:market?
```

### Stock Validation & Management

```http
POST /api/v1/stocks/validate
POST /api/v1/stocks/refresh-price/:symbol
```

### Example API Calls

```javascript
// Search stocks
const response = await fetch('/api/v1/stocks/search?q=apple&market=NASDAQ&limit=10');

// Get suggestions for autocomplete
const suggestions = await fetch('/api/v1/stocks/suggestions?q=CPAll&market=SET');

// Validate stock for trading
const validation = await fetch('/api/v1/stocks/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symbol: 'CPALL', market: 'SET' })
});
```

## 🎨 Frontend Components

### StockSelector Component

Auto-complete component with multi-market support.

```tsx
import { StockSelector } from '@/components/portfolio/StockSelector';

<StockSelector
  value={selectedStock}
  onSelect={setSelectedStock}
  market={Market.SET}                    // Optional market filter
  placeholder="Search for stocks..."
  required
  error={errors.stock}
/>
```

### MarketSelector Component

Dropdown for market selection.

```tsx
import { MarketSelector } from '@/components/portfolio/StockSelector';

<MarketSelector
  value={selectedMarket}
  onChange={setSelectedMarket}
  className="w-full"
/>
```

### AddStockForm Component

Complete form with stock selection and validation.

```tsx
import { AddStockForm } from '@/components/portfolio/AddStockForm';

<AddStockForm
  onSubmit={handleStockSubmit}
  onCancel={handleCancel}
/>
```

## 🌍 Multi-Market Support

### Supported Markets

| Market | Country | Currency | Symbol Format | Yahoo Suffix |
|--------|---------|----------|---------------|--------------|
| **NYSE** | US | USD | AAPL | - |
| **NASDAQ** | US | USD | GOOGL | - |
| **NYSE_ARCA** | US | USD | ICOI | - |
| **SET** | TH | THB | CPALL | .BK |
| **MAI** | TH | THB | SIRI | .BK |
| **HKSE** | HK | HKD | 0700 | .HK |
| **TSE** | JP | JPY | 7203 | .T |
| **LSE** | GB | GBP | BARC | .L |
| **SGX** | SG | SGD | D05 | .SI |
| **ASX** | AU | AUD | CBA | .AX |

### Market-Specific Validation

```typescript
// Thai stocks (SET/MAI)
if (market === Market.SET && quantity % 100 !== 0) {
  warnings.push('Thai stocks typically trade in lots of 100 shares');
}

// Hong Kong stocks (HKSE)
if (market === Market.HKSE && price >= 10 && quantity % 100 !== 0) {
  warnings.push('Hong Kong stocks over $10 typically trade in lots of 100');
}

// Japanese stocks (TSE)
if (market === Market.TSE && !/^\d{4}$/.test(symbol)) {
  errors.push('Japanese stock symbols must be 4 digits');
}
```

## 📊 Database Seeding

### Seed Script Usage

```bash
# Run the stock database seeding
npx ts-node scripts/seed-stock-database.ts
```

### Seeded Stock Data

The seed script includes:
- **US Stocks**: 13 stocks (AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA, JPM, V, JNJ, SPY, QQQ, ICOI)
- **Thai Stocks**: 5 stocks (CPALL, PTT, KBANK, ADVANC, AOT)
- **Hong Kong Stocks**: 3 stocks (0700, 0941, 0005)
- **Japanese Stocks**: 3 stocks (7203, 6758, 9984)

### Custom Stock Addition

```typescript
await stockMasterService.upsertStock({
  symbol: 'NEWSTOCK',
  name: 'New Company Inc.',
  exchange: 'NASDAQ',
  market: Market.NASDAQ,
  country: 'US',
  currency: Currency.USD,
  sector: 'Technology',
  isActive: true,
  isDelisted: false
});
```

## 🔄 Real-Time Data Integration

### Yahoo Finance Integration

```typescript
// Update stock with real-time data
await stockMasterService.updateStockPriceData('AAPL', Market.NASDAQ);

// Get quote with market context
const quote = await marketDataService.getQuoteByMarket('CPALL', Market.SET);
```

### Price Update Workflow

1. **Fetch from Yahoo Finance** using market-specific symbol format
2. **Update stock master** with latest price information
3. **Store in real-time prices** table for quick access
4. **Cache for 30 seconds** to reduce API calls

## 🚀 Usage Examples

### Basic Stock Search

```typescript
// Search for Thai stocks containing "CP"
const results = await stockMasterService.searchStocks({
  query: 'CP',
  market: Market.SET,
  limit: 10
});

console.log(results.stocks);
// Output: [{ symbol: 'CPALL', name: 'CP ALL Public...', market: 'SET' }]
```

### Form Integration

```tsx
function TradeForm() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [market, setMarket] = useState(Market.SET);

  const handleSubmit = async (data) => {
    // Validate stock exists and is tradeable
    const validation = await fetch('/api/v1/stocks/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: data.stock.symbol,
        market: data.stock.market
      })
    }).then(r => r.json());

    if (!validation.data.valid) {
      alert(`Cannot trade ${data.stock.symbol}: ${validation.data.errors.join(', ')}`);
      return;
    }

    // Proceed with trade execution
    await executeTradeAPI(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <MarketSelector value={market} onChange={setMarket} />
      <StockSelector 
        market={market}
        value={selectedStock}
        onSelect={setSelectedStock}
      />
      {/* Other form fields */}
    </form>
  );
}
```

### Portfolio Integration

```typescript
// Add stock to portfolio with database validation
const addToPortfolio = async (symbol, market, quantity, price) => {
  // 1. Validate stock exists
  const stock = await stockMasterService.getStock(symbol, market);
  if (!stock) {
    throw new Error(`Stock ${symbol} not found in ${market} market`);
  }

  // 2. Validate trade parameters
  const validation = await stockMasterService.validateStockForTrading(symbol, market);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // 3. Execute trade with validated stock data
  return await portfolioService.addPosition({
    stockId: stock.id,
    symbol: stock.symbol,
    market: stock.market,
    quantity,
    price
  });
};
```

## 📈 Benefits

### For Users
- **🔍 Smart Search**: Auto-complete with market filtering
- **🌍 Multi-Market**: Support for global stock trading
- **⚡ Fast Performance**: Optimized database queries and caching
- **✅ Validation**: Market-specific trading rules
- **📊 Rich Data**: Company information, sectors, financial metrics

### For Developers
- **🛠️ Easy Integration**: Simple API and React components
- **🔧 Extensible**: Easy to add new markets and data sources
- **📱 Responsive**: Works on all device types
- **🚀 Production Ready**: Comprehensive error handling and validation
- **📖 Well Documented**: Complete API and component documentation

## 🎯 Next Steps

### Immediate Enhancements
1. **Real-time Price Updates**: WebSocket integration for live prices
2. **Advanced Filtering**: Add more search filters (market cap, P/E ratio, etc.)
3. **Favorites/Watchlist**: User-specific stock favorites
4. **Historical Charts**: Integration with price history data

### Future Features
1. **AI-Powered Search**: Smart stock recommendations
2. **News Integration**: Stock-specific news feeds
3. **Fundamental Data**: Extended financial metrics
4. **Options/Derivatives**: Support for complex instruments
5. **Crypto Integration**: Digital asset support

---

**Last Updated**: 2025-08-19  
**Version**: 1.0.0  
**Author**: Portfolio System Team