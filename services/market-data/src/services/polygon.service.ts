import axios, { AxiosInstance } from 'axios';
import logger from '@utils/logger';
import {
  PolygonAggregateResponse,
  PolygonTickerDetailsResponse,
  QuoteData,
  BarData
} from '../types/index';

export class PolygonService {
  private client: AxiosInstance;
  private apiKey: string;
  private rateLimitPerMinute: number;
  private apiCallsThisMinute: number = 0;
  private minuteResetTime: Date;

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Polygon API key not configured - using limited functionality');
      // Don't throw error, allow service to start with limited functionality
    }

    this.rateLimitPerMinute = parseInt(process.env.RATE_LIMIT_FREE_PER_MINUTE || '5');
    this.minuteResetTime = new Date();

    this.client = axios.create({
      baseURL: process.env.POLYGON_BASE_URL || 'https://api.polygon.io',
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Polygon API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Polygon API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Polygon API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Polygon API Error: ${error.response.status} ${error.response.data?.message || error.message}`);
        } else {
          logger.error('Polygon API Network Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = new Date();
    
    // Reset counter if minute has passed
    if (now.getTime() - this.minuteResetTime.getTime() >= 60000) {
      this.apiCallsThisMinute = 0;
      this.minuteResetTime = now;
    }

    // Check if we've exceeded rate limit
    if (this.apiCallsThisMinute >= this.rateLimitPerMinute) {
      const waitTime = 60000 - (now.getTime() - this.minuteResetTime.getTime());
      logger.warn(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.apiCallsThisMinute = 0;
      this.minuteResetTime = new Date();
    }

    this.apiCallsThisMinute++;
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      await this.checkRateLimit();

      // Get previous close
      const prevCloseResponse = await this.client.get<PolygonAggregateResponse>(
        `/v2/aggs/ticker/${symbol}/prev`,
        { params: { adjusted: true } }
      );

      // Get latest quote (using aggregates as snapshot might require higher tier)
      const now = new Date();
      const to = now.toISOString().split('T')[0];
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await this.client.get<PolygonAggregateResponse>(
        `/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`,
        { params: { adjusted: true, sort: 'desc', limit: 1 } }
      );

      if (response.data.results && response.data.results.length > 0) {
        const latest = response.data.results[0];
        const prevClose = prevCloseResponse.data.results?.[0]?.c || latest.o;
        
        const quote: QuoteData = {
          symbol: symbol.toUpperCase(),
          price: latest.c,
          change: latest.c - prevClose,
          changePercent: ((latest.c - prevClose) / prevClose) * 100,
          volume: latest.v,
          high: latest.h,
          low: latest.l,
          open: latest.o,
          previousClose: prevClose,
          timestamp: new Date(latest.t).toISOString(),
          source: 'polygon',
          delay: 0
        };

        logger.info(`Fetched quote for ${symbol}: $${quote.price}`);
        return quote;
      }

      logger.warn(`No quote data available for ${symbol}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes for multiple symbols
   */
  async getBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const quotes: QuoteData[] = [];
    
    // Process in chunks to respect rate limits
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        if (quote) {
          quotes.push(quote);
        }
      } catch (error) {
        logger.error(`Failed to fetch quote for ${symbol}:`, error);
        // Continue with other symbols
      }
    }

    return quotes;
  }

  /**
   * Get historical bars for a symbol
   */
  async getHistoricalBars(
    symbol: string,
    interval: string,
    from: string,
    to: string
  ): Promise<BarData[]> {
    try {
      await this.checkRateLimit();

      // Map interval to Polygon format
      const multiplier = interval.replace(/[a-z]/g, '');
      const timespan = interval.includes('m') ? 'minute' : 
                       interval.includes('h') ? 'hour' : 'day';

      const response = await this.client.get<PolygonAggregateResponse>(
        `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        { params: { adjusted: true, sort: 'asc' } }
      );

      if (response.data.results) {
        return response.data.results.map(bar => ({
          timestamp: new Date(bar.t).toISOString(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v
        }));
      }

      return [];
    } catch (error) {
      logger.error(`Error fetching historical bars for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string, limit: number = 10): Promise<any[]> {
    try {
      await this.checkRateLimit();

      const response = await this.client.get('/v3/reference/tickers', {
        params: {
          search: query,
          active: true,
          limit,
          market: 'stocks'
        }
      });

      if (response.data.results) {
        return response.data.results.map((ticker: any) => ({
          symbol: ticker.ticker,
          name: ticker.name,
          exchange: ticker.primary_exchange,
          type: ticker.type
        }));
      }

      return [];
    } catch (error) {
      logger.error(`Error searching symbols for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get ticker details
   */
  async getTickerDetails(symbol: string): Promise<any> {
    try {
      await this.checkRateLimit();

      const response = await this.client.get<PolygonTickerDetailsResponse>(
        `/v3/reference/tickers/${symbol}`
      );

      return response.data.results;
    } catch (error) {
      logger.error(`Error fetching ticker details for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get remaining API calls
   */
  getRateLimitStatus() {
    const now = new Date();
    const resetIn = Math.max(0, 60000 - (now.getTime() - this.minuteResetTime.getTime()));
    
    return {
      remaining: Math.max(0, this.rateLimitPerMinute - this.apiCallsThisMinute),
      limit: this.rateLimitPerMinute,
      resetIn: Math.ceil(resetIn / 1000) // seconds
    };
  }
}