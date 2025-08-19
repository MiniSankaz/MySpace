import { NextRequest, NextResponse } from 'next/server';

// Proxy to Portfolio service for holdings
const PORTFOLIO_SERVICE_URL = process.env.PORTFOLIO_SERVICE_URL || 'http://127.0.0.1:4160';
const MARKET_DATA_URL = process.env.MARKET_DATA_URL || 'http://127.0.0.1:4170';

async function fetchCurrentPrices(symbols: string[]) {
  try {
    const symbolsParam = symbols.join(',');
    const response = await fetch(`${MARKET_DATA_URL}/api/v1/market/quotes?symbols=${symbolsParam}`);
    const result = await response.json();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('Error fetching current prices:', error);
    return {};
  }
}

async function proxyToPortfolioService(endpoint: string, options?: RequestInit) {
  const url = `${PORTFOLIO_SERVICE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Portfolio service error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Portfolio service proxy error:', error);
    // Return mock holdings as fallback
    return getMockHoldings();
  }
}

// Mock holdings data with real-time prices
const getMockHoldings = () => [
  {
    id: "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 100,
    avgCost: 170.50,
    averagePrice: 170.50,
    currentPrice: 175.84, // Will be updated with real prices
    value: 17584.00,
    marketValue: 17584.00,
    dayChange: 5.34,
    dayChangePercent: 0.31,
    totalGain: 534.00,
    totalGainPercent: 3.13,
    allocation: 35.2,
    currency: "USD",
    market: "NASDAQ"
  },
  {
    id: "2", 
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    quantity: 50,
    avgCost: 140.00,
    averagePrice: 140.00,
    currentPrice: 142.56,
    value: 7128.00,
    marketValue: 7128.00,
    dayChange: 2.56,
    dayChangePercent: 1.83,
    totalGain: 128.00,
    totalGainPercent: 1.83,
    allocation: 14.3,
    currency: "USD",
    market: "NASDAQ"
  },
  {
    id: "3",
    symbol: "CPALL",
    name: "CP ALL PCL",
    quantity: 1000,
    avgCost: 63.00,
    averagePrice: 63.00,
    currentPrice: 65.50,
    value: 65500.00,
    marketValue: 65500.00,
    dayChange: 2500.00,
    dayChangePercent: 3.97,
    totalGain: 2500.00,
    totalGainPercent: 3.97,
    allocation: 50.5,
    currency: "THB",
    market: "SET"
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const portfolioId = params.id;
    
    // Try to fetch from Portfolio service
    let holdings = await proxyToPortfolioService(`/api/v1/portfolios/${portfolioId}/holdings`);
    
    // If no holdings from service, use mock data
    if (!holdings?.data || holdings.data.length === 0) {
      holdings = { data: getMockHoldings() };
    }
    
    // Get current prices for all symbols
    const symbols = holdings.data.map((h: any) => h.symbol);
    const currentPrices = await fetchCurrentPrices(symbols);
    
    // Update holdings with current prices
    const updatedHoldings = holdings.data.map((holding: any) => {
      const priceData = currentPrices[holding.symbol];
      if (priceData) {
        const currentPrice = priceData.currentPrice || priceData.price;
        const quantity = holding.quantity || 0;
        const avgCost = holding.avgCost || holding.averagePrice || 0;
        const marketValue = currentPrice * quantity;
        const totalGain = marketValue - (avgCost * quantity);
        const totalGainPercent = avgCost > 0 ? (totalGain / (avgCost * quantity)) * 100 : 0;
        
        return {
          ...holding,
          currentPrice: currentPrice,
          value: marketValue,
          marketValue: marketValue,
          dayChange: priceData.change || 0,
          dayChangePercent: priceData.changePercent || 0,
          totalGain: totalGain,
          totalGainPercent: totalGainPercent,
          currency: priceData.currency || holding.currency,
          market: priceData.market || holding.market,
          timestamp: priceData.timestamp
        };
      }
      return holding;
    });
    
    return NextResponse.json({
      success: true,
      data: updatedHoldings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json({
      success: true,
      data: getMockHoldings(),
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const portfolioId = params.id;
    const data = await request.json();
    
    // Add holding via Portfolio service
    const result = await proxyToPortfolioService(
      `/api/v1/portfolios/${portfolioId}/holdings`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    
    return NextResponse.json({
      success: true,
      data: result.data || result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to add holding' },
      { status: 500 }
    );
  }
}