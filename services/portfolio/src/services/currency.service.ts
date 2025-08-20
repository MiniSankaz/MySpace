import axios from 'axios';
import { logger } from '../utils/logger';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

interface CurrencyQuote {
  base: string;
  rates: { [currency: string]: number };
  timestamp: string;
}

export class CurrencyService {
  private cache: Map<string, ExchangeRate> = new Map();
  private cacheTTL: number = 300000; // 5 minutes
  private primaryApiKey: string;
  private fallbackApiKey: string;
  
  // Static fallback rates for when APIs are unavailable
  private fallbackRates: { [key: string]: number } = {
    'USD_THB': 35.50,
    'THB_USD': 0.0282,
    'EUR_THB': 38.90,
    'THB_EUR': 0.0257,
    'GBP_THB': 45.20,
    'THB_GBP': 0.0221,
    'JPY_THB': 0.24,
    'THB_JPY': 4.17,
    'SGD_THB': 26.30,
    'THB_SGD': 0.0380,
    'HKD_THB': 4.53,
    'THB_HKD': 0.2208,
    'CNY_THB': 4.88,
    'THB_CNY': 0.2049
  };

  constructor() {
    this.primaryApiKey = process.env.EXCHANGE_RATE_API_KEY || '';
    this.fallbackApiKey = process.env.FIXER_API_KEY || '';
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    // Normalize currency codes
    from = from.toUpperCase();
    to = to.toUpperCase();
    
    // Same currency
    if (from === to) return 1;
    
    // Check cache
    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug(`Using cached rate for ${from}/${to}: ${cached.rate}`);
      return cached.rate;
    }
    
    try {
      // Try primary API (ExchangeRate-API)
      if (this.primaryApiKey) {
        const rate = await this.fetchFromExchangeRateAPI(from, to);
        if (rate) {
          this.cacheRate(from, to, rate);
          return rate;
        }
      }
      
      // Try fallback API (Fixer.io)
      if (this.fallbackApiKey) {
        const rate = await this.fetchFromFixer(from, to);
        if (rate) {
          this.cacheRate(from, to, rate);
          return rate;
        }
      }
      
      // Try free API (no key required)
      const rate = await this.fetchFromFreeAPI(from, to);
      if (rate) {
        this.cacheRate(from, to, rate);
        return rate;
      }
      
    } catch (error) {
      logger.error(`Failed to fetch exchange rate for ${from}/${to}:`, error);
    }
    
    // Use fallback rates
    const fallbackRate = this.getFallbackRate(from, to);
    logger.warn(`Using fallback rate for ${from}/${to}: ${fallbackRate}`);
    return fallbackRate;
  }

  /**
   * Get multiple exchange rates in batch
   */
  async getBatchRates(base: string, targets: string[]): Promise<Map<string, number>> {
    const rates = new Map<string, number>();
    base = base.toUpperCase();
    
    try {
      // Try to get all rates in one API call
      if (this.primaryApiKey) {
        const response = await axios.get(
          `https://v6.exchangerate-api.com/v6/${this.primaryApiKey}/latest/${base}`,
          { timeout: 5000 }
        );
        
        if (response.data?.conversion_rates) {
          for (const target of targets) {
            const targetUpper = target.toUpperCase();
            const rate = response.data.conversion_rates[targetUpper];
            if (rate) {
              rates.set(targetUpper, rate);
              this.cacheRate(base, targetUpper, rate);
            }
          }
          
          if (rates.size === targets.length) {
            return rates;
          }
        }
      }
    } catch (error) {
      logger.warn('Batch rate fetch failed, falling back to individual requests');
    }
    
    // Fallback to individual requests
    for (const target of targets) {
      const rate = await this.getExchangeRate(base, target);
      rates.set(target.toUpperCase(), rate);
    }
    
    return rates;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getExchangeRate(from, to);
    return parseFloat((amount * rate).toFixed(4));
  }

  /**
   * Convert portfolio values to display currency
   */
  async convertPortfolioValues(
    values: { amount: number; currency: string }[],
    targetCurrency: string
  ): Promise<{ amount: number; originalAmount: number; currency: string; rate: number }[]> {
    const results = [];
    
    for (const value of values) {
      if (value.currency === targetCurrency) {
        results.push({
          amount: value.amount,
          originalAmount: value.amount,
          currency: targetCurrency,
          rate: 1
        });
      } else {
        const rate = await this.getExchangeRate(value.currency, targetCurrency);
        results.push({
          amount: value.amount * rate,
          originalAmount: value.amount,
          currency: targetCurrency,
          rate
        });
      }
    }
    
    return results;
  }

  /**
   * Format amount with proper currency display
   */
  formatCurrency(amount: number, currency: string, options?: {
    locale?: string;
    showSign?: boolean;
    compact?: boolean;
  }): string {
    // Use Thai locale for THB, otherwise use provided locale or default
    const locale = options?.locale || (currency === 'THB' ? 'th-TH' : 'en-US');
    
    // Handle sign separately for better control
    const sign = options?.showSign && amount > 0 ? '+' : '';
    const absoluteAmount = Math.abs(amount);
    
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'THB' || currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'THB' || currency === 'JPY' ? 0 : 2,
      notation: options?.compact ? 'compact' : 'standard'
    });
    
    let formatted = formatter.format(absoluteAmount);
    
    // Special handling for Thai Baht to ensure ฿ symbol
    if (currency === 'THB') {
      // Replace THB with ฿ if the formatter didn't use the symbol
      formatted = formatted.replace(/THB\s?/g, '฿');
      // Ensure the symbol is at the beginning
      if (!formatted.startsWith('฿')) {
        formatted = formatted.replace(/([0-9])/, '฿$1');
      }
    }
    
    // Add sign if needed
    if (amount < 0) {
      formatted = '-' + formatted;
    } else if (sign) {
      formatted = sign + formatted;
    }
    
    return formatted;
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'THB': '฿',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'SGD': 'S$',
      'HKD': 'HK$',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    
    return symbols[currency.toUpperCase()] || currency;
  }

  /**
   * Check if market is using THB
   */
  isThaiMarket(exchange: string): boolean {
    const thaiExchanges = ['SET', 'MAI', 'TFEX', 'TBX'];
    return thaiExchanges.includes(exchange.toUpperCase());
  }

  /**
   * Get currency for a specific market/exchange
   */
  getMarketCurrency(exchange: string): string {
    const marketCurrencies: { [key: string]: string } = {
      'SET': 'THB',
      'MAI': 'THB',
      'NYSE': 'USD',
      'NASDAQ': 'USD',
      'LSE': 'GBP',
      'TSE': 'JPY',
      'HKSE': 'HKD',
      'SSE': 'CNY',
      'SGX': 'SGD',
      'ASX': 'AUD'
    };
    
    return marketCurrencies[exchange.toUpperCase()] || 'USD';
  }

  // Private helper methods

  private async fetchFromExchangeRateAPI(from: string, to: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${this.primaryApiKey}/pair/${from}/${to}`,
        { timeout: 5000 }
      );
      
      if (response.data?.conversion_rate) {
        return response.data.conversion_rate;
      }
    } catch (error) {
      logger.debug(`ExchangeRate-API failed for ${from}/${to}`);
    }
    return null;
  }

  private async fetchFromFixer(from: string, to: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `http://api.fixer.io/latest?access_key=${this.fallbackApiKey}&base=${from}&symbols=${to}`,
        { timeout: 5000 }
      );
      
      if (response.data?.rates?.[to]) {
        return response.data.rates[to];
      }
    } catch (error) {
      logger.debug(`Fixer.io failed for ${from}/${to}`);
    }
    return null;
  }

  private async fetchFromFreeAPI(from: string, to: string): Promise<number | null> {
    try {
      // Using exchangerate.host (free, no key required)
      const response = await axios.get(
        `https://api.exchangerate.host/convert?from=${from}&to=${to}`,
        { timeout: 5000 }
      );
      
      if (response.data?.result) {
        return response.data.result;
      }
    } catch (error) {
      logger.debug(`Free API failed for ${from}/${to}`);
    }
    return null;
  }

  private getFallbackRate(from: string, to: string): number {
    const key = `${from}_${to}`;
    
    // Check if we have a direct rate
    if (this.fallbackRates[key]) {
      return this.fallbackRates[key];
    }
    
    // Try reverse rate
    const reverseKey = `${to}_${from}`;
    if (this.fallbackRates[reverseKey]) {
      return 1 / this.fallbackRates[reverseKey];
    }
    
    // Try to calculate through USD
    if (from !== 'USD' && to !== 'USD') {
      const fromToUsd = this.getFallbackRate(from, 'USD');
      const usdToTarget = this.getFallbackRate('USD', to);
      return fromToUsd * usdToTarget;
    }
    
    // Default fallback
    logger.warn(`No fallback rate available for ${from}/${to}, using 1.0`);
    return 1.0;
  }

  private cacheRate(from: string, to: string, rate: number): void {
    const key = `${from}_${to}`;
    this.cache.set(key, {
      from,
      to,
      rate,
      timestamp: Date.now()
    });
    
    // Also cache the reverse rate
    const reverseKey = `${to}_${from}`;
    this.cache.set(reverseKey, {
      from: to,
      to: from,
      rate: 1 / rate,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the exchange rate cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Currency cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; pairs: string[] } {
    return {
      size: this.cache.size,
      pairs: Array.from(this.cache.keys())
    };
  }

  /**
   * Validate currency code
   */
  isValidCurrency(code: string): boolean {
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'THB', 'SGD', 'HKD', 
      'AUD', 'CAD', 'CHF', 'SEK', 'NZD', 'MXN', 'ZAR', 'INR',
      'KRW', 'TWD', 'BRL', 'RUB', 'NOK', 'DKK', 'PLN', 'IDR',
      'MYR', 'PHP', 'VND', 'TRY', 'AED', 'SAR', 'EGP', 'ILS'
    ];
    
    return validCurrencies.includes(code.toUpperCase());
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();