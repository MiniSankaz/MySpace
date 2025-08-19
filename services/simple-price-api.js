#!/usr/bin/env node

const express = require('express');
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('../shared/config/ports.cjs');
const portConfig = getPortConfig();
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4170;

// Mock prices with some randomization to simulate real-time changes
const mockPrices = {
  'AAPL': { base: 180.50, name: 'Apple Inc.' },
  'GOOGL': { base: 140.25, name: 'Alphabet Inc.' },
  'MSFT': { base: 380.75, name: 'Microsoft Corp.' },
  'TSLA': { base: 250.30, name: 'Tesla Inc.' },
  'AMZN': { base: 175.45, name: 'Amazon.com Inc.' },
  'META': { base: 485.20, name: 'Meta Platforms Inc.' },
  'NVDA': { base: 720.50, name: 'NVIDIA Corp.' },
  'JPM': { base: 195.80, name: 'JPMorgan Chase' },
  'V': { base: 265.30, name: 'Visa Inc.' },
  'JNJ': { base: 155.20, name: 'Johnson & Johnson' }
};

// Add some variance to simulate real-time price changes
function getRealtimePrice(symbol) {
  const stock = mockPrices[symbol.toUpperCase()];
  if (!stock) {
    return null;
  }
  
  // Add random variance of ±2%
  const variance = (Math.random() - 0.5) * 0.04;
  const currentPrice = stock.base * (1 + variance);
  const change = currentPrice - stock.base;
  const changePercent = (change / stock.base) * 100;
  
  return {
    symbol: symbol.toUpperCase(),
    name: stock.name,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    previousClose: stock.base,
    volume: Math.floor(Math.random() * 50000000) + 10000000,
    marketCap: Math.floor(stock.base * 1000000000),
    high: parseFloat((currentPrice * 1.01).toFixed(2)),
    low: parseFloat((currentPrice * 0.99).toFixed(2)),
    open: stock.base,
    timestamp: new Date().toISOString()
  };
}

// Enable CORS
app.use(cors({
  origin: [
    `http://localhost:${getFrontendPort()}`,
    `http://localhost:${getGatewayPort()}`,
    getServiceUrl("portfolio"),
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:4110',
    'http://127.0.0.1:4160'
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'simple-price-api',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    availableSymbols: Object.keys(mockPrices)
  });
});

// Get single quote
app.get('/api/v1/market/quote/:symbol', (req, res) => {
  const { symbol } = req.params;
  const quote = getRealtimePrice(symbol);
  
  if (!quote) {
    return res.status(404).json({
      success: false,
      error: `Symbol ${symbol} not found`
    });
  }
  
  res.json({
    success: true,
    data: quote
  });
});

// Get multiple quotes
app.get('/api/v1/market/quotes', (req, res) => {
  const symbols = req.query.symbols 
    ? req.query.symbols.split(',').map(s => s.trim())
    : Object.keys(mockPrices);
  
  const quotes = symbols
    .map(symbol => getRealtimePrice(symbol))
    .filter(q => q !== null);
  
  res.json({
    success: true,
    data: quotes,
    count: quotes.length
  });
});

// Get all available symbols
app.get('/api/v1/market/symbols', (req, res) => {
  const symbols = Object.keys(mockPrices).map(symbol => ({
    symbol,
    name: mockPrices[symbol].name,
    type: 'stock',
    exchange: 'NASDAQ'
  }));
  
  res.json({
    success: true,
    data: symbols,
    count: symbols.length
  });
});

// WebSocket endpoint for real-time updates (simplified)
app.get('/api/v1/market/stream/:symbol', (req, res) => {
  const { symbol } = req.params;
  
  // Set up SSE (Server-Sent Events)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send price updates every 2 seconds
  const interval = setInterval(() => {
    const quote = getRealtimePrice(symbol);
    if (quote) {
      res.write(`data: ${JSON.stringify(quote)}\n\n`);
    }
  }, 2000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Simple Price API running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health`);
  console.log(`   GET /api/v1/market/quote/:symbol`);
  console.log(`   GET /api/v1/market/quotes?symbols=AAPL,GOOGL`);
  console.log(`   GET /api/v1/market/symbols`);
  console.log(`   GET /api/v1/market/stream/:symbol (SSE)`);
  console.log(`\n💡 Available symbols: ${Object.keys(mockPrices).join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});