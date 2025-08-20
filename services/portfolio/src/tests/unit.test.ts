import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CurrencyService } from '../services/currency.service';

describe('Portfolio Service Unit Tests', () => {
  describe('Currency Service Tests', () => {
    let currencyService: CurrencyService;

    beforeEach(() => {
      currencyService = new CurrencyService();
    });

    describe('Currency Formatting', () => {
      it('should format THB currency without decimals', () => {
        const formatted = currencyService.formatCurrency(35500, 'THB');
        expect(formatted).toBe('฿35,500');
      });

      it('should format USD currency with 2 decimals', () => {
        const formatted = currencyService.formatCurrency(1000.50, 'USD');
        expect(formatted).toBe('$1,000.50');
      });

      it('should format large numbers correctly', () => {
        const formatted = currencyService.formatCurrency(1000000.99, 'USD');
        expect(formatted).toBe('$1,000,000.99');
      });

      it('should handle zero values', () => {
        expect(currencyService.formatCurrency(0, 'USD')).toBe('$0.00');
        expect(currencyService.formatCurrency(0, 'THB')).toBe('฿0');
      });

      it('should handle negative values', () => {
        expect(currencyService.formatCurrency(-100.50, 'USD')).toBe('-$100.50');
        expect(currencyService.formatCurrency(-3550, 'THB')).toBe('-฿3,550');
      });
    });

    describe('Exchange Rate Fallback', () => {
      it('should provide fallback rates when API is unavailable', async () => {
        // Mock fetch to simulate API failure
        global.fetch = jest.fn(() => 
          Promise.reject(new Error('API unavailable'))
        ) as jest.MockedFunction<typeof fetch>;

        const rate = await currencyService.getExchangeRate('USD', 'THB');
        expect(rate).toBe(35.50); // fallback rate
      });

      it('should cache rates to avoid repeated API calls', async () => {
        // First call
        const rate1 = await currencyService.getExchangeRate('USD', 'THB');
        
        // Second call should use cache
        const rate2 = await currencyService.getExchangeRate('USD', 'THB');
        
        expect(rate1).toBe(rate2);
      });
    });

    describe('Currency Conversion', () => {
      it('should convert amounts between currencies', async () => {
        const amount = 1000;
        const converted = await currencyService.convertAmount(amount, 'USD', 'THB');
        
        // Should be around 35,000-36,000 THB using fallback rate
        expect(converted).toBeGreaterThan(30000);
        expect(converted).toBeLessThan(40000);
      });

      it('should handle same currency conversion', async () => {
        const amount = 1000;
        const converted = await currencyService.convertAmount(amount, 'USD', 'USD');
        expect(converted).toBe(amount);
      });
    });
  });

  describe('Decimal Precision Tests', () => {
    it('should validate decimal precision up to 7 places', () => {
      const validQuantities = [
        '1',
        '1.1',
        '1.1234567',
        '0.0000001',
        '999999.9999999'
      ];

      const regex = /^\d+(\.\d{1,7})?$/;
      
      validQuantities.forEach(quantity => {
        expect(regex.test(quantity)).toBe(true);
      });
    });

    it('should reject more than 7 decimal places', () => {
      const invalidQuantities = [
        '1.12345678',
        '0.00000001',
        '1.123456789'
      ];

      const regex = /^\d+(\.\d{1,7})?$/;
      
      invalidQuantities.forEach(quantity => {
        expect(regex.test(quantity)).toBe(false);
      });
    });

    it('should handle decimal arithmetic correctly', () => {
      // Using string representation to avoid floating point issues
      const quantity1 = '10.1234567';
      const quantity2 = '5.7654321';
      const price = '100.50';

      const qty1 = parseFloat(quantity1);
      const qty2 = parseFloat(quantity2);
      const totalQty = qty1 + qty2;

      expect(totalQty.toFixed(7)).toBe('15.8888888');
    });
  });

  describe('Market Data Validation', () => {
    it('should validate stock symbols format', () => {
      const validSymbols = ['AAPL', 'GOOGL', 'MSFT', 'PTT.BK', 'KBANK.BK'];
      const invalidSymbols = ['', '123', 'A', 'TOOLONG1234567890'];

      const symbolRegex = /^[A-Z]{1,10}(\.[A-Z]{1,5})?$/;

      validSymbols.forEach(symbol => {
        expect(symbolRegex.test(symbol)).toBe(true);
      });

      invalidSymbols.forEach(symbol => {
        expect(symbolRegex.test(symbol)).toBe(false);
      });
    });

    it('should validate price ranges', () => {
      const validPrices = [0.01, 1.00, 999.99, 9999.99];
      const invalidPrices = [0, -1, -100];

      validPrices.forEach(price => {
        expect(price).toBeGreaterThan(0);
        expect(price).toBeLessThan(100000);
      });

      invalidPrices.forEach(price => {
        expect(price).toBeLessThanOrEqual(0);
      });
    });
  });

  describe('API Response Validation', () => {
    it('should validate market quote structure', () => {
      const validQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 50000000,
        timestamp: new Date().toISOString()
      };

      expect(validQuote).toHaveProperty('symbol');
      expect(validQuote).toHaveProperty('price');
      expect(validQuote).toHaveProperty('change');
      expect(validQuote).toHaveProperty('changePercent');
      expect(typeof validQuote.price).toBe('number');
      expect(typeof validQuote.change).toBe('number');
      expect(typeof validQuote.changePercent).toBe('number');
    });

    it('should validate transaction structure', () => {
      const validTransaction = {
        type: 'BUY',
        symbol: 'AAPL',
        quantity: '10.1234567',
        price: '150.25',
        fees: '1.99',
        total: '1504.47',
        notes: 'Test transaction'
      };

      expect(['BUY', 'SELL'].includes(validTransaction.type)).toBe(true);
      expect(validTransaction.symbol).toMatch(/^[A-Z]+$/);
      expect(parseFloat(validTransaction.quantity)).toBeGreaterThan(0);
      expect(parseFloat(validTransaction.price)).toBeGreaterThan(0);
    });
  });
});