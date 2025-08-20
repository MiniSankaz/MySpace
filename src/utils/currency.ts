/**
 * Currency formatting utilities for Thai Baht (THB) and US Dollar (USD)
 */

export type Currency = 'THB' | 'USD';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  locale: string;
  name: string;
  decimalPlaces: number;
}

// Currency configurations
export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  THB: {
    code: 'THB',
    symbol: '฿',
    locale: 'th-TH',
    name: 'Thai Baht',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar',
    decimalPlaces: 2,
  },
};

// Exchange rates (in production, these should come from an API)
const EXCHANGE_RATES: Record<string, number> = {
  'USD_THB': 35.50,  // 1 USD = 35.50 THB
  'THB_USD': 0.0282, // 1 THB = 0.0282 USD
};

/**
 * Format a number as currency with proper symbol and locale
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'THB',
  options?: {
    showCode?: boolean;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  const config = CURRENCIES[currency];
  
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  // Handle sign separately for better control
  const sign = options?.showSign && amount > 0 ? '+' : '';
  const absoluteAmount = Math.abs(amount);

  // Format with Intl.NumberFormat
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
    notation: options?.compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(absoluteAmount);

  // Replace currency code with symbol for Thai Baht
  if (currency === 'THB') {
    // Thai formatter may return "THB 1,234.56" or "฿1,234.56"
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

  // Add currency code if requested
  if (options?.showCode) {
    formatted = `${formatted} ${config.code}`;
  }

  return formatted;
}

/**
 * Format currency with explicit Thai Baht symbol
 */
export function formatTHB(
  amount: number,
  options?: {
    showCode?: boolean;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  return formatCurrency(amount, 'THB', options);
}

/**
 * Format currency with explicit US Dollar symbol
 */
export function formatUSD(
  amount: number,
  options?: {
    showCode?: boolean;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  return formatCurrency(amount, 'USD', options);
}

/**
 * Convert between currencies
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) {
    return amount;
  }

  const rateKey = `${from}_${to}`;
  const rate = EXCHANGE_RATES[rateKey];

  if (!rate) {
    throw new Error(`No exchange rate available for ${from} to ${to}`);
  }

  return amount * rate;
}

/**
 * Format a number with Thai locale (for general numbers, not currency)
 */
export function formatThaiNumber(
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
  }
): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 2,
    notation: options?.compact ? 'compact' : 'standard',
  }).format(value);
}

/**
 * Parse a formatted currency string back to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and spaces
  const cleaned = value
    .replace(/[฿$,\s]/g, '')
    .replace(/THB|USD/g, '')
    .trim();
  
  return parseFloat(cleaned) || 0;
}

/**
 * Format percentage with proper sign
 */
export function formatPercent(
  value: number,
  options?: {
    showSign?: boolean;
    decimals?: number;
  }
): string {
  const decimals = options?.decimals ?? 2;
  const sign = options?.showSign && value > 0 ? '+' : '';
  
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES[currency]?.symbol || currency;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatCompactCurrency(
  amount: number,
  currency: Currency = 'THB'
): string {
  const config = CURRENCIES[currency];
  const symbol = config.symbol;

  const absAmount = Math.abs(amount);
  let formatted: string;
  
  if (absAmount >= 1e9) {
    formatted = `${symbol}${(amount / 1e9).toFixed(1)}B`;
  } else if (absAmount >= 1e6) {
    formatted = `${symbol}${(amount / 1e6).toFixed(1)}M`;
  } else if (absAmount >= 1e3) {
    formatted = `${symbol}${(amount / 1e3).toFixed(1)}K`;
  } else {
    formatted = formatCurrency(amount, currency);
  }
  
  return formatted;
}

/**
 * Validate if a string is a valid currency amount
 */
export function isValidCurrencyAmount(value: string): boolean {
  const pattern = /^-?\d+(\.\d{1,2})?$/;
  const cleaned = value.replace(/[฿$,\s]/g, '');
  return pattern.test(cleaned);
}

// Export all functions as default object for convenience
export default {
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
  CURRENCIES,
};