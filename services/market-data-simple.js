#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4170;

// Enable CORS
app.use(cors({
  origin: ['http://localhost:4100', 'http://127.0.0.1:4100', 'http://localhost:4110', 'http://127.0.0.1:4110'],
  credentials: true
}));

app.use(express.json());

// Mock stock prices - includes both US and Thai stocks
const mockPrices = {
  // US Stocks & ETFs
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 1.25, changePercent: 0.70, currency: 'USD', market: 'NASDAQ' },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: -1.45, changePercent: -0.38, currency: 'USD', market: 'NASDAQ' },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, change: 0.87, changePercent: 0.61, currency: 'USD', market: 'NASDAQ' },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 5.23, changePercent: 2.15, currency: 'USD', market: 'NASDAQ' },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: -0.95, changePercent: -0.53, currency: 'USD', market: 'NASDAQ' },
  'META': { symbol: 'META', name: 'Meta Platforms Inc.', price: 486.35, change: 3.67, changePercent: 0.76, currency: 'USD', market: 'NASDAQ' },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 725.12, change: 8.94, changePercent: 1.25, currency: 'USD', market: 'NASDAQ' },
  'SPY': { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 455.23, change: 1.89, changePercent: 0.42, currency: 'USD', market: 'NYSE' },
  'QQQ': { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 378.45, change: 2.14, changePercent: 0.57, currency: 'USD', market: 'NASDAQ' },
  'VTI': { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', price: 245.67, change: 1.23, changePercent: 0.50, currency: 'USD', market: 'NYSE' },
  'ICOI': { symbol: 'ICOI', name: 'iShares Core International ETF', price: 43.25, change: -0.15, changePercent: -0.35, currency: 'USD', market: 'NYSE' },
  
  // Thai SET100 Stocks  
  'CPALL': { symbol: 'CPALL', name: 'CP ALL PCL', price: 65.50, change: 1.50, changePercent: 2.34, currency: 'THB', market: 'SET' },
  'PTT': { symbol: 'PTT', name: 'PTT PCL', price: 42.75, change: -0.25, changePercent: -0.58, currency: 'THB', market: 'SET' },
  'KBANK': { symbol: 'KBANK', name: 'Kasikornbank PCL', price: 156.00, change: 2.00, changePercent: 1.30, currency: 'THB', market: 'SET' },
  'SCB': { symbol: 'SCB', name: 'Siam Commercial Bank PCL', price: 128.50, change: -1.50, changePercent: -1.15, currency: 'THB', market: 'SET' },
  'AOT': { symbol: 'AOT', name: 'Airports of Thailand PCL', price: 68.25, change: 0.75, changePercent: 1.11, currency: 'THB', market: 'SET' },
  'ADVANC': { symbol: 'ADVANC', name: 'Advanced Info Service PCL', price: 225.00, change: 3.00, changePercent: 1.35, currency: 'THB', market: 'SET' },
  'BBL': { symbol: 'BBL', name: 'Bangkok Bank PCL', price: 185.50, change: -2.50, changePercent: -1.33, currency: 'THB', market: 'SET' },
  'BDMS': { symbol: 'BDMS', name: 'Bangkok Dusit Medical Services PCL', price: 32.50, change: 0.50, changePercent: 1.56, currency: 'THB', market: 'SET' },
  'BEM': { symbol: 'BEM', name: 'Bangkok Expressway Metro PCL', price: 11.40, change: 0.10, changePercent: 0.88, currency: 'THB', market: 'SET' },
  'BGRIM': { symbol: 'BGRIM', name: 'B.Grimm Power PCL', price: 48.75, change: 1.25, changePercent: 2.63, currency: 'THB', market: 'SET' }
};

// Add some randomization to simulate real-time price changes
function getRealtimePrice(basePrice) {
  const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
  return parseFloat((basePrice.price * (1 + variation)).toFixed(2));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'market-data',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    symbols: Object.keys(mockPrices).length,
    uptime: process.uptime()
  });
});

// Get single quote
app.get('/api/v1/market/quote/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const basePrice = mockPrices[symbol];
  
  if (!basePrice) {
    return res.status(404).json({
      success: false,
      error: `Symbol ${symbol} not found`,
      availableSymbols: Object.keys(mockPrices)
    });
  }
  
  const currentPrice = getRealtimePrice(basePrice);
  const change = currentPrice - basePrice.price;
  const changePercent = (change / basePrice.price) * 100;
  
  res.json({
    success: true,
    data: {
      ...basePrice,
      price: currentPrice,
      currentPrice: currentPrice,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      timestamp: new Date().toISOString(),
      source: 'mock'
    }
  });
});

// Get multiple quotes
app.get('/api/v1/market/quotes', (req, res) => {
  const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
  
  if (symbols.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No symbols provided. Use ?symbols=AAPL,GOOGL,MSFT'
    });
  }
  
  const quotes = {};
  
  symbols.forEach(symbol => {
    const upperSymbol = symbol.trim().toUpperCase();
    const basePrice = mockPrices[upperSymbol];
    
    if (basePrice) {
      const currentPrice = getRealtimePrice(basePrice);
      const change = currentPrice - basePrice.price;
      const changePercent = (change / basePrice.price) * 100;
      
      quotes[upperSymbol] = {
        ...basePrice,
        price: currentPrice,
        currentPrice: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: new Date().toISOString(),
        source: 'mock'
      };
    }
  });
  
  res.json({
    success: true,
    data: quotes,
    timestamp: new Date().toISOString()
  });
});

// Get all available symbols
app.get('/api/v1/market/symbols', (req, res) => {
  const symbols = Object.keys(mockPrices).map(symbol => ({
    symbol,
    name: mockPrices[symbol].name,
    market: mockPrices[symbol].market,
    currency: mockPrices[symbol].currency
  }));
  
  res.json({
    success: true,
    data: symbols,
    total: symbols.length
  });
});

// Search symbols
app.get('/api/v1/market/search', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query required. Use ?q=apple'
    });
  }
  
  const results = Object.entries(mockPrices)
    .filter(([symbol, data]) => 
      symbol.toLowerCase().includes(query) || 
      data.name.toLowerCase().includes(query)
    )
    .map(([symbol, data]) => ({
      symbol,
      name: data.name,
      market: data.market,
      currency: data.currency
    }));
  
  res.json({
    success: true,
    data: results,
    query,
    total: results.length
  });
});

// Service info
app.get('/info', (req, res) => {
  res.json({
    service: 'market-data',
    description: 'Simple Market Data API',
    version: '1.0.0',
    features: [
      'Real-time stock quotes',
      'Multiple symbol lookup',
      'Symbol search',
      'US and Thai market support'
    ],
    endpoints: {
      health: '/health',
      quote: '/api/v1/market/quote/:symbol',
      quotes: '/api/v1/market/quotes?symbols=AAPL,GOOGL',
      symbols: '/api/v1/market/symbols',
      search: '/api/v1/market/search?q=apple'
    },
    markets: ['NASDAQ', 'NYSE', 'SET'],
    currencies: ['USD', 'THB']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Market Data API running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health`);
  console.log(`   GET /info`);
  console.log(`   GET /api/v1/market/quote/:symbol`);
  console.log(`   GET /api/v1/market/quotes?symbols=AAPL,GOOGL`);
  console.log(`   GET /api/v1/market/symbols`);
  console.log(`   GET /api/v1/market/search?q=apple`);
  console.log(`💡 Total symbols: ${Object.keys(mockPrices).length}`);
});