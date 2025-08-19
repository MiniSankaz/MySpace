import { NextRequest, NextResponse } from 'next/server';

// Mock portfolio data
const mockPortfolios = [
  {
    id: "1",
    name: "Growth Portfolio",
    description: "High growth tech stocks",
    value: 125432.56,
    dayChange: 2145.32,
    dayChangePercent: 1.74,
    positions: 8,
    totalGain: 25432.56,
    totalGainPercent: 25.43,
    performance: [85, 88, 92, 87, 95, 98, 102, 105, 110, 108, 112, 115],
    isDefault: true,
  },
  {
    id: "2",
    name: "Dividend Income",
    description: "Dividend focused portfolio",
    value: 85234.12,
    dayChange: -532.45,
    dayChangePercent: -0.62,
    positions: 12,
    totalGain: 5234.12,
    totalGainPercent: 6.54,
    performance: [100, 101, 102, 103, 102, 104, 105, 104, 106, 107, 108, 107],
    isDefault: false,
  },
  {
    id: "3",
    name: "Tech Stocks",
    description: "Technology sector focus",
    value: 45678.90,
    dayChange: 1234.56,
    dayChangePercent: 2.78,
    positions: 5,
    totalGain: 5678.90,
    totalGainPercent: 14.20,
    performance: [80, 85, 82, 90, 95, 92, 98, 105, 115, 110, 118, 125],
    isDefault: false,
  },
];

export async function GET(request: NextRequest) {
  try {
    // Return mock data for now
    return NextResponse.json({
      success: true,
      data: mockPortfolios,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create new portfolio (mock)
    const newPortfolio = {
      id: Date.now().toString(),
      ...data,
      value: data.initialCapital || 0,
      dayChange: 0,
      dayChangePercent: 0,
      positions: 0,
      totalGain: 0,
      totalGainPercent: 0,
      performance: [],
      isDefault: false,
    };
    
    return NextResponse.json({
      success: true,
      data: newPortfolio,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}