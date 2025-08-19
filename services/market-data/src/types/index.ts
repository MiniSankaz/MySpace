// Type definitions for Market Data Service

// Quote types
export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: string;
  source: 'polygon' | 'cache';
  delay: number;
}

export interface QuoteRequest {
  symbol: string;
  fields?: string[];
}

export interface BatchQuotesRequest {
  symbols: string[];
  fields?: string[];
}

export interface QuoteResponse {
  success: boolean;
  data: QuoteData;
  meta: ResponseMeta;
}

export interface BatchQuotesResponse {
  success: boolean;
  data: QuoteData[];
  meta: ResponseMeta;
}

// Historical data types
export interface HistoryRequest {
  symbol: string;
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y';
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  from?: string;
  to?: string;
}

export interface BarData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryResponse {
  success: boolean;
  data: {
    symbol: string;
    period: string;
    interval: string;
    bars: BarData[];
  };
  meta: ResponseMeta;
}

// Chart types
export interface ChartRequest {
  symbol: string;
  timeframe: 'intraday' | 'daily' | 'weekly' | 'monthly';
  period: string;
  indicators?: string[];
}

export interface ChartResponse {
  success: boolean;
  data: {
    symbol: string;
    timeframe: string;
    period: string;
    bars: BarData[];
    indicators?: any;
  };
  meta: ResponseMeta;
}

// Search types
export interface SearchRequest {
  query: string;
  limit?: number;
  type?: 'stocks' | 'etf' | 'all';
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  meta: ResponseMeta;
}

// WebSocket types
export interface WebSocketMessage {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
  types: ('quotes' | 'trades' | 'bars')[];
}

export interface MarketUpdate {
  type: 'quote' | 'trade' | 'bar';
  symbol: string;
  data: QuoteData | TradeData | BarData;
  timestamp: string;
}

export interface TradeData {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  conditions?: string[];
}

// Metadata types
export interface ResponseMeta {
  cached: boolean;
  cacheExpiry?: string;
  apiCallsUsed: number;
  rateLimit: {
    remaining: number;
    reset: string;
  };
  responseTime?: number;
}

// Cache types
export interface CacheConfig {
  quotes: {
    ttl: number;
    maxSize: number;
    strategy: 'LRU' | 'FIFO';
  };
  historical: {
    ttl: number;
    dailyTtl: number;
    strategy: string;
  };
  search: {
    ttl: number;
    maxSize: number;
  };
}

// Rate limit types
export interface RateLimitConfig {
  polygonLimits: {
    freeApiKey: {
      requestsPerMinute: number;
      requestsPerMonth: number;
    };
    basicPlan: {
      requestsPerMinute: number;
      requestsPerMonth: number;
    };
  };
  serviceLimits: {
    perUser: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    global: {
      requestsPerSecond: number;
      concurrentConnections: number;
    };
  };
}

// Service state types
export interface ServiceState {
  polygonConnection: {
    status: 'connected' | 'disconnected' | 'error';
    lastCall: Date;
    callsRemaining: number;
    resetTime: Date;
  };
  cache: {
    hitRate: number;
    size: number;
    memory: number;
  };
  websockets: {
    activeConnections: number;
    subscriptions: Map<string, string[]>;
  };
}

// Polygon API types
export interface PolygonQuoteResponse {
  status: string;
  results?: {
    T: string; // ticker
    t: number; // timestamp
    c: number; // close
    h: number; // high
    l: number; // low
    o: number; // open
    v: number; // volume
    vw?: number; // volume weighted average
    n?: number; // number of trades
  }[];
  next_url?: string;
  count?: number;
}

export interface PolygonAggregateResponse {
  status: string;
  results?: {
    c: number; // close
    h: number; // high
    l: number; // low
    n?: number; // number of trades
    o: number; // open
    t: number; // timestamp
    v: number; // volume
    vw?: number; // volume weighted average
  }[];
  resultsCount?: number;
  adjusted?: boolean;
  queryCount?: number;
  request_id?: string;
  next_url?: string;
}

export interface PolygonTickerDetailsResponse {
  status: string;
  results?: {
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    market_cap?: number;
    description?: string;
    homepage_url?: string;
    total_employees?: number;
    list_date?: string;
    share_class_shares_outstanding?: number;
    weighted_shares_outstanding?: number;
  };
  request_id?: string;
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: ServiceError;
}