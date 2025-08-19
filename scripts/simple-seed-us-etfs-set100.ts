#!/usr/bin/env ts-node

/**
 * Simple Seed Script for US ETFs and SET100 Stock Data
 * Simplified version without complex dependencies
 */

// Mock database storage for demonstration
const stockDatabase: any[] = [];

interface StockSeedData {
  symbol: string;
  name: string;
  exchange: string;
  market: string;
  country: string;
  currency: string;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  ipoDate?: string;
  marketCapBillions?: number;
}

// Popular US ETFs
const US_ETFs: StockSeedData[] = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the S&P 500 Index, providing exposure to large-cap U.S. stocks.',
    website: 'https://www.ssga.com',
    ipoDate: '1993-01-22',
    marketCapBillions: 450
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the NASDAQ-100 Index, focused on technology and growth stocks.',
    website: 'https://www.invesco.com',
    ipoDate: '1999-03-10',
    marketCapBillions: 220
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Provides exposure to the entire U.S. stock market.',
    website: 'https://www.vanguard.com',
    ipoDate: '2001-05-24',
    marketCapBillions: 280
  },
  {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the Russell 2000 Index of small-cap U.S. stocks.',
    website: 'https://www.ishares.com',
    ipoDate: '2000-05-22',
    marketCapBillions: 65
  },
  {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Asset Management',
    description: 'Provides exposure to technology companies in the S&P 500.',
    website: 'https://www.ssga.com',
    ipoDate: '1998-12-16',
    marketCapBillions: 55
  },
  {
    symbol: 'ARKK',
    name: 'ARK Innovation ETF',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Asset Management',
    description: 'Invests in companies focused on disruptive innovation.',
    website: 'https://www.ark-invest.com',
    ipoDate: '2014-10-31',
    marketCapBillions: 8
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    exchange: 'NYSE Arca',
    market: 'NYSE_ARCA',
    country: 'US',
    currency: 'USD',
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the total U.S. investment-grade bond market.',
    website: 'https://www.vanguard.com',
    ipoDate: '2007-04-03',
    marketCapBillions: 85
  }
];

// SET100 Constituent Stocks
const SET100_STOCKS: StockSeedData[] = [
  {
    symbol: 'KBANK',
    name: 'Kasikornbank Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Financial Services',
    industry: 'Banks - Regional',
    description: 'One of the largest commercial banks in Thailand.',
    website: 'https://www.kasikornbank.com',
    ipoDate: '1993-06-08',
    marketCapBillions: 15
  },
  {
    symbol: 'PTT',
    name: 'PTT Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Energy',
    industry: 'Oil & Gas Integrated',
    description: 'Thailand\'s national oil and gas company.',
    website: 'https://www.pttplc.com',
    ipoDate: '2001-12-14',
    marketCapBillions: 25
  },
  {
    symbol: 'CPALL',
    name: 'CP ALL Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Consumer Staples',
    industry: 'Grocery Stores',
    description: 'Largest convenience store chain in Thailand (7-Eleven).',
    website: 'https://www.cpall.co.th',
    ipoDate: '1988-11-29',
    marketCapBillions: 20
  },
  {
    symbol: 'ADVANC',
    name: 'Advanced Info Service Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Leading mobile network operator in Thailand.',
    website: 'https://www.ais.co.th',
    ipoDate: '1991-04-11',
    marketCapBillions: 22
  },
  {
    symbol: 'AOT',
    name: 'Airports of Thailand Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Industrials',
    industry: 'Airports & Air Services',
    description: 'Operates major airports in Thailand including Suvarnabhumi.',
    website: 'https://www.airportthai.co.th',
    ipoDate: '2002-06-27',
    marketCapBillions: 14
  },
  {
    symbol: 'SCG',
    name: 'Siam Cement Public Company Limited',
    exchange: 'SET',
    market: 'SET',
    country: 'TH',
    currency: 'THB',
    sector: 'Materials',
    industry: 'Building Materials',
    description: 'Integrated building materials and chemicals company.',
    website: 'https://www.scg.com',
    ipoDate: '1975-04-30',
    marketCapBillions: 18
  }
];

async function seedSimpleStockData() {
  console.log('🌱 Starting Simple Stock Database Seeding...\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Combine all stocks
  const allStocks = [...US_ETFs, ...SET100_STOCKS];
  
  console.log(`📊 Total stocks to seed: ${allStocks.length}`);
  console.log(`   • US ETFs: ${US_ETFs.length}`);
  console.log(`   • SET100 stocks: ${SET100_STOCKS.length}\n`);

  // Seed all stocks
  for (const seedStock of allStocks) {
    try {
      console.log(`📈 Seeding ${seedStock.symbol} (${seedStock.market}) - ${seedStock.name}...`);
      
      // Add to mock database
      stockDatabase.push({
        id: `${seedStock.symbol}-${seedStock.market}`,
        symbol: seedStock.symbol,
        name: seedStock.name,
        exchange: seedStock.exchange,
        market: seedStock.market,
        country: seedStock.country,
        currency: seedStock.currency,
        sector: seedStock.sector,
        industry: seedStock.industry,
        description: seedStock.description,
        website: seedStock.website,
        ipoDate: seedStock.ipoDate ? new Date(seedStock.ipoDate) : undefined,
        marketCap: seedStock.marketCapBillions ? seedStock.marketCapBillions * 1000000000 : undefined,
        isActive: true,
        isDelisted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`  📊 Market cap: $${(seedStock.marketCapBillions || 0).toFixed(1)}B`);
      console.log(`  💱 Currency: ${seedStock.currency} | Exchange: ${seedStock.exchange}`);
      
      successCount++;
      console.log(`  ✅ Successfully seeded ${seedStock.symbol}\n`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      errorCount++;
      const errorMsg = `Failed to seed ${seedStock.symbol}: ${(error as Error).message || 'Unknown error'}`;
      errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}\n`);
    }
  }

  // Summary
  console.log('🏁 Simple Stock Database Seeding Complete');
  console.log('='.repeat(60));
  console.log(`✅ Successfully seeded: ${successCount}/${allStocks.length} stocks (${Math.round(successCount/allStocks.length*100)}%)`);
  console.log(`❌ Failed to seed: ${errorCount}/${allStocks.length} stocks`);
  
  if (errors.length > 0) {
    console.log('\n🚨 Errors encountered:');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  console.log('\n📊 Seeded Breakdown:');
  console.log(`🇺🇸 US ETFs: ${US_ETFs.length} securities`);
  console.log(`   • Broad Market: SPY, QQQ, VTI, IWM`);
  console.log(`   • Sector ETFs: XLK`);
  console.log(`   • Innovation: ARKK`);
  console.log(`   • Fixed Income: BND`);
  
  console.log(`🇹🇭 SET100 Stocks: ${SET100_STOCKS.length} companies`);
  console.log(`   • Banking: KBANK`);
  console.log(`   • Energy: PTT`);
  console.log(`   • Consumer: CPALL`);
  console.log(`   • Telecom: ADVANC`);
  console.log(`   • Infrastructure: AOT`);
  console.log(`   • Materials: SCG`);

  console.log('\n🎯 Mock Database Contents:');
  console.log(`  📈 Total entries: ${stockDatabase.length}`);
  console.log(`  🌍 Markets covered: NYSE_ARCA, SET`);
  console.log(`  💰 Total market cap: $${(allStocks.reduce((sum, stock) => sum + (stock.marketCapBillions || 0), 0)).toFixed(1)}B`);

  console.log('\n🔍 Sample Stock Data:');
  const sampleStock = stockDatabase[0];
  if (sampleStock) {
    console.log(`  Symbol: ${sampleStock.symbol}`);
    console.log(`  Name: ${sampleStock.name}`);
    console.log(`  Market: ${sampleStock.market}`);
    console.log(`  Currency: ${sampleStock.currency}`);
    console.log(`  Sector: ${sampleStock.sector}`);
  }

  console.log('\n💡 Next Steps:');
  console.log('  1. Integrate with actual database service');
  console.log('  2. Test stock search and filtering');
  console.log('  3. Connect with frontend components');
  console.log('  4. Add real-time price updates');
  
  console.log('\n🚀 Stock database simulation completed successfully!');
  console.log('📝 Data is available in stockDatabase array for integration');

  return {
    success: true,
    total: allStocks.length,
    seeded: successCount,
    failed: errorCount,
    data: stockDatabase
  };
}

// Run seeding if called directly
if (require.main === module) {
  seedSimpleStockData()
    .then((result) => {
      console.log(`\n🎉 Seeding completed! ${result.seeded}/${result.total} stocks processed`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedSimpleStockData };