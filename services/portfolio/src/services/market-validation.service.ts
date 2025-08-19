import { Market, Currency, MarketInfo, getMarketInfo, getMarketCurrency, getMarketCountry, isMarketOpen } from '../types';

/**
 * Market Validation Service
 * Handles market-specific validation and symbol formatting
 */
export class MarketValidationService {
  
  /**
   * Validate and format stock symbol based on market
   */
  static formatSymbol(symbol: string, market: Market): string {
    const cleanSymbol = symbol.toUpperCase().trim();
    
    switch (market) {
      case Market.SET:
      case Market.MAI:
        // Thai stocks don't need .BK suffix for our internal processing
        return cleanSymbol.replace('.BK', '');
        
      case Market.HKSE:
        // Hong Kong stocks might have .HK suffix
        return cleanSymbol.replace('.HK', '');
        
      case Market.TSE:
        // Japanese stocks might have .T suffix
        return cleanSymbol.replace('.T', '');
        
      case Market.LSE:
        // UK stocks might have .L suffix
        return cleanSymbol.replace('.L', '');
        
      case Market.ASX:
        // Australian stocks might have .AX suffix
        return cleanSymbol.replace('.AX', '');
        
      default:
        // US and other markets
        return cleanSymbol;
    }
  }

  /**
   * Get Yahoo Finance symbol format for different markets
   */
  static getYahooSymbol(symbol: string, market: Market): string {
    const cleanSymbol = this.formatSymbol(symbol, market);
    
    switch (market) {
      case Market.SET:
      case Market.MAI:
        return `${cleanSymbol}.BK`;
        
      case Market.HKSE:
        return `${cleanSymbol}.HK`;
        
      case Market.TSE:
        return `${cleanSymbol}.T`;
        
      case Market.LSE:
        return `${cleanSymbol}.L`;
        
      case Market.ASX:
        return `${cleanSymbol}.AX`;
        
      case Market.SGX:
        return `${cleanSymbol}.SI`;
        
      default:
        // US markets don't need suffix
        return cleanSymbol;
    }
  }

  /**
   * Validate symbol format for specific market
   */
  static validateSymbol(symbol: string, market: Market): { valid: boolean; error?: string } {
    const cleanSymbol = symbol.trim();
    
    if (!cleanSymbol) {
      return { valid: false, error: 'Symbol cannot be empty' };
    }

    switch (market) {
      case Market.SET:
      case Market.MAI:
        if (!/^[A-Z0-9]{2,10}(\.(BK|R|F|W))?$/.test(cleanSymbol.toUpperCase())) {
          return { valid: false, error: 'Invalid Thai stock symbol format' };
        }
        break;
        
      case Market.HKSE:
        if (!/^\d{1,5}(\.(HK|HM))?$/.test(cleanSymbol)) {
          return { valid: false, error: 'Invalid Hong Kong stock symbol format' };
        }
        break;
        
      case Market.TSE:
        if (!/^\d{4}(\.(T|JP))?$/.test(cleanSymbol)) {
          return { valid: false, error: 'Invalid Japanese stock symbol format' };
        }
        break;
        
      default:
        if (!/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(cleanSymbol.toUpperCase())) {
          return { valid: false, error: 'Invalid stock symbol format' };
        }
    }
    
    return { valid: true };
  }

  /**
   * Get market trading hours info
   */
  static getMarketHours(market: Market): {
    timezone: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  } {
    const info = getMarketInfo(market);
    const isOpen = isMarketOpen(market);
    
    // Default trading hours (simplified)
    const marketHours = {
      [Market.NYSE]: { open: '09:30', close: '16:00' },
      [Market.NASDAQ]: { open: '09:30', close: '16:00' },
      [Market.NYSE_ARCA]: { open: '09:30', close: '16:00' },
      [Market.SET]: { open: '10:00', close: '16:30' },
      [Market.MAI]: { open: '10:00', close: '16:30' },
      [Market.HKSE]: { open: '09:30', close: '16:00' },
      [Market.TSE]: { open: '09:00', close: '15:00' },
      [Market.LSE]: { open: '08:00', close: '16:30' },
      [Market.SGX]: { open: '09:00', close: '17:00' },
      [Market.ASX]: { open: '10:00', close: '16:00' }
    };
    
    const hours = marketHours[market] || { open: '09:00', close: '17:00' };
    
    return {
      timezone: info.timezone,
      openTime: hours.open,
      closeTime: hours.close,
      isOpen
    };
  }

  /**
   * Validate trade based on market rules
   */
  static validateTrade(symbol: string, market: Market, quantity: number, price: number): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Symbol validation
    const symbolValidation = this.validateSymbol(symbol, market);
    if (!symbolValidation.valid) {
      errors.push(symbolValidation.error!);
    }
    
    // Market hours check
    if (!isMarketOpen(market)) {
      warnings.push(`${getMarketInfo(market).name} is currently closed`);
    }
    
    // Quantity validation
    if (quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }
    
    // Price validation
    if (price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    // Market-specific validations
    switch (market) {
      case Market.SET:
      case Market.MAI:
        // Thai stocks: minimum lot size is typically 100 shares
        if (quantity % 100 !== 0) {
          warnings.push('Thai stocks typically trade in lots of 100 shares');
        }
        break;
        
      case Market.HKSE:
        // Hong Kong: board lot varies by price
        if (price >= 10 && quantity % 100 !== 0) {
          warnings.push('Hong Kong stocks over $10 typically trade in lots of 100');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get supported markets list
   */
  static getSupportedMarkets(): Array<{
    code: Market;
    name: string;
    currency: Currency;
    country: string;
    timezone: string;
  }> {
    return Object.entries(MarketInfo).map(([code, info]) => ({
      code: code as Market,
      name: info.name,
      currency: info.currency,
      country: info.country,
      timezone: info.timezone
    }));
  }

  /**
   * Get market by country code
   */
  static getMarketsByCountry(countryCode: string): Market[] {
    return Object.entries(MarketInfo)
      .filter(([_, info]) => info.country === countryCode)
      .map(([code, _]) => code as Market);
  }

  /**
   * Get default market for country
   */
  static getDefaultMarketForCountry(countryCode: string): Market {
    const markets = this.getMarketsByCountry(countryCode);
    
    // Return primary market for each country
    switch (countryCode) {
      case 'US': return Market.NYSE;
      case 'TH': return Market.SET;
      case 'HK': return Market.HKSE;
      case 'JP': return Market.TSE;
      case 'GB': return Market.LSE;
      case 'SG': return Market.SGX;
      case 'AU': return Market.ASX;
      default: return markets[0] || Market.OTHER;
    }
  }
}

export const marketValidationService = new MarketValidationService();