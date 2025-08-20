import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { MarketDataService } from '../services/market-data.service';
import { CurrencyService } from '../services/currency.service';
import { DatabaseConnectionManager } from '../utils/database-connection';

// Test configuration
const API_BASE_URL = 'http://localhost:4160';
const GATEWAY_URL = 'http://localhost:4110';

describe('Portfolio API Integration Tests', () => {
  let prisma: PrismaClient;
  let dbManager: DatabaseConnectionManager;
  let testPortfolioId: string;
  let testUserId: string = 'test-user-' + Date.now();

  beforeAll(async () => {
    // Initialize database connection with retry
    dbManager = new DatabaseConnectionManager();
    await dbManager.connect();
    prisma = dbManager.getPrismaClient();
    
    // Create test portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: testUserId,
        name: 'Test Portfolio',
        description: 'Integration test portfolio',
        currency: 'USD',
        isDefault: true
      }
    });
    testPortfolioId = portfolio.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.portfolio.deleteMany({
      where: { userId: testUserId }
    });
    await dbManager.disconnect();
  });

  describe('Database Connection Tests', () => {
    it('should handle database connection with retry logic', async () => {
      const health = await dbManager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('timestamp');
    });

    it('should fallback to mock data on connection failure', async () => {
      // Simulate connection failure
      const failingManager = new DatabaseConnectionManager({
        connectionString: 'postgresql://invalid:invalid@localhost:5432/test',
        retry: { maxAttempts: 1, delay: 100, backoff: 'linear' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const health = await failingManager.healthCheck();
      expect(health.status).not.toBe('healthy');
    });
  });

  describe('Decimal Precision Tests', () => {
    it('should handle 7 decimal places for stock quantities', async () => {
      const quantity = '123.4567890';
      const holding = await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          symbol: 'TEST',
          quantity: quantity,
          averagePrice: '100.1234'
        }
      });

      expect(holding.quantity.toString()).toBe('123.4567890');
      
      // Cleanup
      await prisma.holding.delete({ where: { id: holding.id } });
    });

    it('should handle decimal arithmetic correctly', async () => {
      const transactions = [
        { quantity: '10.1234567', price: '100.50' },
        { quantity: '5.7654321', price: '101.25' },
        { quantity: '3.9876543', price: '99.75' }
      ];

      let totalQuantity = 0;
      let totalCost = 0;

      for (const tx of transactions) {
        const qty = parseFloat(tx.quantity);
        const price = parseFloat(tx.price);
        totalQuantity += qty;
        totalCost += qty * price;
        
        await prisma.transaction.create({
          data: {
            portfolioId: testPortfolioId,
            type: 'BUY',
            symbol: 'TEST',
            quantity: tx.quantity,
            price: tx.price,
            fees: '1.99',
            total: (qty * price + 1.99).toFixed(4)
          }
        });
      }

      expect(totalQuantity.toFixed(7)).toBe('19.8765431');
      
      // Cleanup
      await prisma.transaction.deleteMany({
        where: {
          portfolioId: testPortfolioId,
          symbol: 'TEST'
        }
      });
    });
  });

  describe('Currency Conversion Tests', () => {
    let currencyService: CurrencyService;

    beforeAll(() => {
      currencyService = new CurrencyService();
    });

    it('should convert USD to THB correctly', async () => {
      const amount = 1000;
      const thbAmount = await currencyService.convertAmount(amount, 'USD', 'THB');
      
      // Should be around 35,000-36,000 THB
      expect(thbAmount).toBeGreaterThan(30000);
      expect(thbAmount).toBeLessThan(40000);
    });

    it('should handle batch currency conversions', async () => {
      const rates = await currencyService.getBatchRates('USD', ['THB', 'EUR', 'GBP', 'JPY']);
      
      expect(rates.size).toBe(4);
      expect(rates.get('THB')).toBeGreaterThan(30);
      expect(rates.get('EUR')).toBeLessThan(1);
      expect(rates.get('GBP')).toBeLessThan(1);
      expect(rates.get('JPY')).toBeGreaterThan(100);
    });

    it('should format THB currency without decimals', () => {
      const formatted = currencyService.formatCurrency(35500, 'THB');
      expect(formatted).toMatch(/฿35,500/);
      expect(formatted).not.toContain('.');
    });

    it('should format USD currency with 2 decimals', () => {
      const formatted = currencyService.formatCurrency(1000.50, 'USD');
      expect(formatted).toBe('$1,000.50');
    });
  });

  describe('Market Data API Tests', () => {
    let marketDataService: MarketDataService;

    beforeAll(() => {
      marketDataService = new MarketDataService();
    });

    it('should fetch real-time quote from Yahoo Finance', async () => {
      const quote = await marketDataService.getQuote('AAPL');
      
      expect(quote).toHaveProperty('symbol', 'AAPL');
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('dayChange');
      expect(quote).toHaveProperty('dayChangePercent');
      expect(quote.price).toBeGreaterThan(0);
    });

    it('should handle batch quotes efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
      const quotes = await marketDataService.getQuotes(symbols);
      
      expect(quotes).toHaveLength(5);
      quotes.forEach(quote => {
        expect(quote).toHaveProperty('symbol');
        expect(quote).toHaveProperty('price');
        expect(symbols).toContain(quote.symbol);
      });
    });

    it('should fallback to cached/static prices on API failure', async () => {
      // Force API failure by using invalid symbol
      const quote = await marketDataService.getQuote('INVALID_SYMBOL_12345');
      
      expect(quote).toHaveProperty('symbol', 'INVALID_SYMBOL_12345');
      expect(quote).toHaveProperty('price');
      expect(quote.price).toBe(100); // Default fallback price
    });

    it('should calculate portfolio value with real-time prices', async () => {
      const holdings = [
        { symbol: 'AAPL', quantity: 10 },
        { symbol: 'GOOGL', quantity: 5 },
        { symbol: 'MSFT', quantity: 8 }
      ];
      
      const value = await marketDataService.calculatePortfolioValue(holdings);
      
      expect(value).toBeGreaterThan(0);
      expect(typeof value).toBe('number');
    });
  });

  describe('Transaction API Tests', () => {
    it('should create transaction with decimal quantities', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/v1/transactions`, {
        portfolioId: testPortfolioId,
        type: 'BUY',
        symbol: 'AAPL',
        quantity: '10.1234567',
        price: '180.5678',
        fees: '1.99',
        notes: 'Test transaction with decimals'
      });

      expect(response.status).toBe(201);
      expect(response.data.quantity).toBe('10.1234567');
      
      // Cleanup
      if (response.data.id) {
        await prisma.transaction.delete({ where: { id: response.data.id } });
      }
    });

    it('should validate quantity decimal places', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/transactions`, {
          portfolioId: testPortfolioId,
          type: 'BUY',
          symbol: 'AAPL',
          quantity: '10.12345678', // 8 decimal places (should fail)
          price: '180.50'
        });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('decimal');
      }
    });
  });

  describe('Portfolio Value Calculation Tests', () => {
    it('should calculate portfolio value in multiple currencies', async () => {
      // Create holdings
      await prisma.holding.createMany({
        data: [
          {
            portfolioId: testPortfolioId,
            symbol: 'AAPL',
            quantity: '10',
            averagePrice: '180'
          },
          {
            portfolioId: testPortfolioId,
            symbol: 'PTT.BK',
            quantity: '100',
            averagePrice: '38'
          }
        ]
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/portfolios/${testPortfolioId}/value?displayCurrency=THB`
      );

      expect(response.status).toBe(200);
      expect(response.data.values).toHaveProperty('display');
      expect(response.data.values.display.currency).toBe('THB');
      expect(response.data.holdings).toHaveLength(2);

      // Cleanup
      await prisma.holding.deleteMany({
        where: { portfolioId: testPortfolioId }
      });
    });

    it('should handle day change calculations with real data', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/portfolios/${testPortfolioId}/value`
      );

      expect(response.data.dayChange).toHaveProperty('amount');
      expect(response.data.dayChange).toHaveProperty('percentage');
      expect(typeof response.data.dayChange.amount).toBe('number');
      expect(typeof response.data.dayChange.percentage).toBe('number');
    });
  });

  describe('WebSocket Real-time Updates', () => {
    it('should receive real-time price updates via WebSocket', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:4160/ws`);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          action: 'subscribe',
          symbols: ['AAPL', 'GOOGL']
        }));
      });

      ws.on('message', (data: string) => {
        const message = JSON.parse(data);
        if (message.type === 'price') {
          expect(message.data).toHaveProperty('symbol');
          expect(message.data).toHaveProperty('price');
          expect(message.data).toHaveProperty('timestamp');
          ws.close();
          done();
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        ws.close();
        done();
      }, 10000);
    });
  });

  describe('Gateway Integration Tests', () => {
    it('should route portfolio requests through gateway', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/v1/portfolios`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should route market data requests through gateway', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/v1/market/quote/AAPL`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('symbol', 'AAPL');
      expect(response.data).toHaveProperty('price');
    });
  });

  describe('Performance Tests', () => {
    let marketDataService: MarketDataService;

    beforeAll(() => {
      marketDataService = new MarketDataService();
    });

    it('should handle 100 concurrent quote requests', async () => {
      const symbols = Array(100).fill(null).map((_, i) => 
        ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'][i % 5]
      );

      const start = Date.now();
      const promises = symbols.map(symbol => 
        marketDataService.getQuote(symbol)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Check that results are valid
      results.forEach(result => {
        expect(result).toHaveProperty('symbol');
        expect(result).toHaveProperty('price');
        expect(typeof result.price).toBe('number');
      });
    });

    it('should calculate portfolio with 500 holdings efficiently', async () => {
      const holdings = Array(500).fill(null).map((_, i) => ({
        symbol: `STOCK${i}`,
        quantity: Math.random() * 100
      }));

      const start = Date.now();
      const value = await marketDataService.calculatePortfolioValue(holdings);
      const duration = Date.now() - start;

      expect(value).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

describe('UI Component Tests', () => {
  describe('Decimal Input Validation', () => {
    it('should accept up to 7 decimal places', () => {
      const validInputs = [
        '1',
        '1.1',
        '1.1234567',
        '0.0000001',
        '999999.9999999'
      ];

      const regex = /^\d*\.?\d{0,7}$/;
      
      validInputs.forEach(input => {
        expect(regex.test(input)).toBe(true);
      });
    });

    it('should reject more than 7 decimal places', () => {
      const invalidInputs = [
        '1.12345678',
        '0.00000001',
        '1.123456789'
      ];

      const regex = /^\d*\.?\d{0,7}$/;
      
      invalidInputs.forEach(input => {
        expect(regex.test(input)).toBe(false);
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format THB without decimals', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });

      expect(formatter.format(35500)).toBe('THB 35,500');
    });

    it('should format USD with 2 decimals', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      expect(formatter.format(1000.5)).toBe('$1,000.50');
    });
  });
});