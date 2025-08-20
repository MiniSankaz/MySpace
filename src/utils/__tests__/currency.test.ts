/**
 * Test suite for currency formatting utilities
 */

import {
  formatCurrency,
  formatTHB,
  formatUSD,
  convertCurrency,
  formatThaiNumber,
  parseCurrency,
  formatPercent,
  getCurrencySymbol,
  formatCompactCurrency,
  isValidCurrencyAmount,
  Currency,
  CURRENCIES
} from '../currency';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('should format Thai Baht with ฿ symbol', () => {
      expect(formatCurrency(1000, 'THB')).toBe('฿1,000.00');
      expect(formatCurrency(35500.50, 'THB')).toBe('฿35,500.50');
      expect(formatCurrency(1000000, 'THB')).toBe('฿1,000,000.00');
    });

    it('should format US Dollar with $ symbol', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
      expect(formatCurrency(35500.50, 'USD')).toBe('$35,500.50');
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1000, 'THB')).toBe('-฿1,000.00');
      expect(formatCurrency(-35500, 'USD')).toBe('-$35,500.00');
    });

    it('should show positive sign when requested', () => {
      expect(formatCurrency(1000, 'THB', { showSign: true })).toBe('+฿1,000.00');
      expect(formatCurrency(-1000, 'THB', { showSign: true })).toBe('-฿1,000.00');
      expect(formatCurrency(0, 'THB', { showSign: true })).toBe('฿0.00');
    });

    it('should format compact notation', () => {
      expect(formatCurrency(1000, 'THB', { compact: true })).toMatch(/฿1K|฿1,000/);
      expect(formatCurrency(1000000, 'THB', { compact: true })).toMatch(/฿1M|฿1,000,000/);
      expect(formatCurrency(1500000, 'USD', { compact: true })).toMatch(/\$1\.5M|\$1,500,000/);
    });

    it('should show currency code when requested', () => {
      expect(formatCurrency(1000, 'THB', { showCode: true })).toBe('฿1,000.00 THB');
      expect(formatCurrency(1000, 'USD', { showCode: true })).toBe('$1,000.00 USD');
    });
  });

  describe('formatTHB and formatUSD shortcuts', () => {
    it('should format THB correctly', () => {
      expect(formatTHB(35500)).toBe('฿35,500.00');
      expect(formatTHB(1000, { showSign: true })).toBe('+฿1,000.00');
    });

    it('should format USD correctly', () => {
      expect(formatUSD(1000)).toBe('$1,000.00');
      expect(formatUSD(1000, { showSign: true })).toBe('+$1,000.00');
    });
  });

  describe('convertCurrency', () => {
    it('should convert USD to THB', () => {
      const thb = convertCurrency(100, 'USD', 'THB');
      expect(thb).toBe(3550); // 100 * 35.50
    });

    it('should convert THB to USD', () => {
      const usd = convertCurrency(1000, 'THB', 'USD');
      expect(usd).toBeCloseTo(28.2, 1); // 1000 * 0.0282
    });

    it('should return same amount for same currency', () => {
      expect(convertCurrency(1000, 'THB', 'THB')).toBe(1000);
      expect(convertCurrency(1000, 'USD', 'USD')).toBe(1000);
    });
  });

  describe('formatThaiNumber', () => {
    it('should format numbers with Thai locale', () => {
      const formatted = formatThaiNumber(1234567.89);
      expect(formatted).toMatch(/1,234,567\.89|1234567\.89/);
    });

    it('should handle decimal places option', () => {
      expect(formatThaiNumber(1234.5678, { decimals: 2 })).toMatch(/1,234\.57|1234\.57/);
      expect(formatThaiNumber(1234, { decimals: 0 })).toMatch(/1,234|1234/);
    });

    it('should handle compact notation', () => {
      const formatted = formatThaiNumber(1000000, { compact: true });
      expect(formatted).toMatch(/1M|1,000,000/);
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency strings', () => {
      expect(parseCurrency('฿1,000.00')).toBe(1000);
      expect(parseCurrency('$35,500.50')).toBe(35500.50);
      expect(parseCurrency('THB 1,234.56')).toBe(1234.56);
      expect(parseCurrency('USD 999.99')).toBe(999.99);
    });

    it('should handle negative values', () => {
      expect(parseCurrency('-฿1,000.00')).toBe(-1000);
      expect(parseCurrency('-$500.50')).toBe(-500.50);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('invalid')).toBe(0);
      expect(parseCurrency('abc')).toBe(0);
    });
  });

  describe('formatPercent', () => {
    it('should format percentages', () => {
      expect(formatPercent(5.5)).toBe('5.50%');
      expect(formatPercent(-3.25)).toBe('-3.25%');
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('should show positive sign when requested', () => {
      expect(formatPercent(5.5, { showSign: true })).toBe('+5.50%');
      expect(formatPercent(-3.25, { showSign: true })).toBe('-3.25%');
      expect(formatPercent(0, { showSign: true })).toBe('0.00%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercent(5.5678, { decimals: 3 })).toBe('5.568%');
      expect(formatPercent(5.5, { decimals: 0 })).toBe('6%');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols', () => {
      expect(getCurrencySymbol('THB')).toBe('฿');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('should return currency code for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ' as Currency)).toBe('XYZ');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format large numbers with abbreviations', () => {
      expect(formatCompactCurrency(1000, 'THB')).toBe('฿1.0K');
      expect(formatCompactCurrency(1500000, 'THB')).toBe('฿1.5M');
      expect(formatCompactCurrency(2500000000, 'USD')).toBe('$2.5B');
    });

    it('should format small numbers normally', () => {
      expect(formatCompactCurrency(999, 'THB')).toBe('฿999.00');
      expect(formatCompactCurrency(50.50, 'USD')).toBe('$50.50');
    });

    it('should handle negative values', () => {
      expect(formatCompactCurrency(-1000000, 'THB')).toBe('฿-1.0M');
      expect(formatCompactCurrency(-5000, 'USD')).toBe('$-5.0K');
    });
  });

  describe('isValidCurrencyAmount', () => {
    it('should validate currency amount strings', () => {
      expect(isValidCurrencyAmount('1000')).toBe(true);
      expect(isValidCurrencyAmount('1000.50')).toBe(true);
      expect(isValidCurrencyAmount('-500.25')).toBe(true);
      expect(isValidCurrencyAmount('฿1,000.00')).toBe(true);
      expect(isValidCurrencyAmount('$500.50')).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(isValidCurrencyAmount('1000.555')).toBe(false); // Too many decimals
      expect(isValidCurrencyAmount('abc')).toBe(false);
      expect(isValidCurrencyAmount('10.50.25')).toBe(false);
      expect(isValidCurrencyAmount('')).toBe(false);
    });
  });

  describe('CURRENCIES constant', () => {
    it('should have THB configuration', () => {
      expect(CURRENCIES.THB).toEqual({
        code: 'THB',
        symbol: '฿',
        locale: 'th-TH',
        name: 'Thai Baht',
        decimalPlaces: 2
      });
    });

    it('should have USD configuration', () => {
      expect(CURRENCIES.USD).toEqual({
        code: 'USD',
        symbol: '$',
        locale: 'en-US',
        name: 'US Dollar',
        decimalPlaces: 2
      });
    });
  });
});

// Integration tests
describe('Currency Integration Tests', () => {
  it('should handle complete currency conversion workflow', () => {
    // User has $1000 USD
    const usdAmount = 1000;
    
    // Convert to THB for display
    const thbAmount = convertCurrency(usdAmount, 'USD', 'THB');
    expect(thbAmount).toBe(35500); // $1000 * 35.50
    
    // Format for display
    const formatted = formatTHB(thbAmount);
    expect(formatted).toBe('฿35,500.00');
    
    // Parse back from display
    const parsed = parseCurrency(formatted);
    expect(parsed).toBe(35500);
    
    // Convert back to USD
    const backToUsd = convertCurrency(parsed, 'THB', 'USD');
    expect(backToUsd).toBeCloseTo(1000, 0);
  });

  it('should handle portfolio value display in different currencies', () => {
    const portfolioValues = [
      { symbol: 'AAPL', value: 5000, currency: 'USD' },
      { symbol: 'PTT.BK', value: 35000, currency: 'THB' },
      { symbol: 'GOOGL', value: 3000, currency: 'USD' }
    ];
    
    // Calculate total in USD
    const totalUSD = portfolioValues.reduce((sum, item) => {
      if (item.currency === 'USD') {
        return sum + item.value;
      } else {
        return sum + convertCurrency(item.value, item.currency as Currency, 'USD');
      }
    }, 0);
    
    expect(totalUSD).toBeCloseTo(8000 + 35000 * 0.0282, 0);
    
    // Display in THB
    const totalTHB = convertCurrency(totalUSD, 'USD', 'THB');
    const formattedTHB = formatTHB(totalTHB);
    expect(formattedTHB).toMatch(/฿\d{1,3}(,\d{3})*\.\d{2}/);
  });

  it('should handle percentage changes with proper formatting', () => {
    const oldValue = 100000; // THB
    const newValue = 115500; // THB
    
    const change = newValue - oldValue;
    const changePercent = (change / oldValue) * 100;
    
    const formattedChange = formatTHB(change, { showSign: true });
    const formattedPercent = formatPercent(changePercent, { showSign: true });
    
    expect(formattedChange).toBe('+฿15,500.00');
    expect(formattedPercent).toBe('+15.50%');
  });
});