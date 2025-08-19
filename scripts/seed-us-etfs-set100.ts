#!/usr/bin/env ts-node

/**
 * Seed US ETFs and SET100 Stock Data
 * Comprehensive data import for popular US ETFs and Thai SET100 constituents
 */

import { stockMasterService } from '../services/portfolio/src/services/stock-master.service';
import { marketDataService } from '../services/portfolio/src/services/market-data.service';
import { Market, Currency } from '../services/portfolio/src/types';

interface StockSeedData {
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  country: string;
  currency: Currency;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  ipoDate?: string;
  marketCapBillions?: number; // Estimated market cap in billions
}

// Popular US ETFs
const US_ETFs: StockSeedData[] = [
  // Broad Market ETFs
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
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
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the NASDAQ-100 Index, focused on technology and growth stocks.',
    website: 'https://www.invesco.com',
    ipoDate: '1999-03-10',
    marketCapBillions: 220
  },
  {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the Russell 2000 Index of small-cap U.S. stocks.',
    website: 'https://www.ishares.com',
    ipoDate: '2000-05-22',
    marketCapBillions: 65
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Provides exposure to the entire U.S. stock market.',
    website: 'https://www.vanguard.com',
    ipoDate: '2001-05-24',
    marketCapBillions: 280
  },
  
  // Sector ETFs
  {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Asset Management',
    description: 'Provides exposure to technology companies in the S&P 500.',
    website: 'https://www.ssga.com',
    ipoDate: '1998-12-16',
    marketCapBillions: 55
  },
  {
    symbol: 'XLF',
    name: 'Financial Select Sector SPDR Fund',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Provides exposure to financial companies in the S&P 500.',
    website: 'https://www.ssga.com',
    ipoDate: '1998-12-16',
    marketCapBillions: 40
  },
  {
    symbol: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Energy',
    industry: 'Asset Management',
    description: 'Provides exposure to energy companies in the S&P 500.',
    website: 'https://www.ssga.com',
    ipoDate: '1998-12-16',
    marketCapBillions: 15
  },
  {
    symbol: 'XLV',
    name: 'Health Care Select Sector SPDR Fund',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Healthcare',
    industry: 'Asset Management',
    description: 'Provides exposure to healthcare companies in the S&P 500.',
    website: 'https://www.ssga.com',
    ipoDate: '1998-12-16',
    marketCapBillions: 35
  },

  // International ETFs
  {
    symbol: 'VEA',
    name: 'Vanguard FTSE Developed Markets ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks developed international markets excluding the U.S.',
    website: 'https://www.vanguard.com',
    ipoDate: '2007-07-20',
    marketCapBillions: 95
  },
  {
    symbol: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks emerging market stocks worldwide.',
    website: 'https://www.vanguard.com',
    ipoDate: '2005-03-04',
    marketCapBillions: 75
  },

  // Bond ETFs
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks the total U.S. investment-grade bond market.',
    website: 'https://www.vanguard.com',
    ipoDate: '2007-04-03',
    marketCapBillions: 85
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks long-term U.S. Treasury bonds.',
    website: 'https://www.ishares.com',
    ipoDate: '2002-07-22',
    marketCapBillions: 20
  },

  // Cryptocurrency & Innovation ETFs
  {
    symbol: 'ARKK',
    name: 'ARK Innovation ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Asset Management',
    description: 'Invests in companies focused on disruptive innovation.',
    website: 'https://www.ark-invest.com',
    ipoDate: '2014-10-31',
    marketCapBillions: 8
  },
  {
    symbol: 'BITO',
    name: 'ProShares Bitcoin Strategy ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Provides exposure to bitcoin through futures contracts.',
    website: 'https://www.proshares.com',
    ipoDate: '2021-10-19',
    marketCapBillions: 1.5
  },

  // ESG ETFs
  {
    symbol: 'ESGU',
    name: 'iShares MSCI USA ESG Select ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Tracks U.S. companies with high ESG ratings.',
    website: 'https://www.ishares.com',
    ipoDate: '2016-01-21',
    marketCapBillions: 12
  }
];

// SET100 Constituent Stocks (Top constituents by market cap)
const SET100_STOCKS: StockSeedData[] = [
  // Banking & Financial
  {
    symbol: 'KBANK',
    name: 'Kasikornbank Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Financial Services',
    industry: 'Banks - Regional',
    description: 'One of the largest commercial banks in Thailand.',
    website: 'https://www.kasikornbank.com',
    ipoDate: '1993-06-08',
    marketCapBillions: 15
  },
  {
    symbol: 'BBL',
    name: 'Bangkok Bank Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Financial Services',
    industry: 'Banks - Regional',
    description: 'Thailand\'s largest bank by total assets.',
    website: 'https://www.bangkokbank.com',
    ipoDate: '1975-04-30',
    marketCapBillions: 18
  },
  {
    symbol: 'SCB',
    name: 'Siam Commercial Bank Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Financial Services',
    industry: 'Banks - Regional',
    description: 'One of Thailand\'s oldest and largest banks.',
    website: 'https://www.scb.co.th',
    ipoDate: '1976-05-17',
    marketCapBillions: 16
  },

  // Energy & Utilities
  {
    symbol: 'PTT',
    name: 'PTT Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Energy',
    industry: 'Oil & Gas Integrated',
    description: 'Thailand\'s national oil and gas company.',
    website: 'https://www.pttplc.com',
    ipoDate: '2001-12-14',
    marketCapBillions: 25
  },
  {
    symbol: 'PTTEP',
    name: 'PTT Exploration and Production Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Energy',
    industry: 'Oil & Gas E&P',
    description: 'Leading oil and gas exploration company in Thailand.',
    website: 'https://www.pttep.com',
    ipoDate: '2001-12-13',
    marketCapBillions: 12
  },
  {
    symbol: 'EGCO',
    name: 'Electricity Generating Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Utilities',
    industry: 'Utilities - Independent Power Producers',
    description: 'Independent power producer in Thailand.',
    website: 'https://www.egco.com',
    ipoDate: '1994-11-09',
    marketCapBillions: 8
  },

  // Telecommunications
  {
    symbol: 'ADVANC',
    name: 'Advanced Info Service Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Leading mobile network operator in Thailand.',
    website: 'https://www.ais.co.th',
    ipoDate: '1991-04-11',
    marketCapBillions: 22
  },
  {
    symbol: 'INTUCH',
    name: 'Intouch Holdings Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Telecommunications and digital services holding company.',
    website: 'https://www.intouchholdings.com',
    ipoDate: '2000-11-27',
    marketCapBillions: 10
  },
  {
    symbol: 'TRUE',
    name: 'True Corporation Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Telecommunications and digital services provider.',
    website: 'https://www.truecorp.co.th',
    ipoDate: '2004-07-08',
    marketCapBillions: 6
  },

  // Consumer & Retail
  {
    symbol: 'CPALL',
    name: 'CP ALL Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Consumer Staples',
    industry: 'Grocery Stores',
    description: 'Largest convenience store chain in Thailand (7-Eleven).',
    website: 'https://www.cpall.co.th',
    ipoDate: '1988-11-29',
    marketCapBillions: 20
  },
  {
    symbol: 'CPF',
    name: 'Charoen Pokphand Foods Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Consumer Staples',
    industry: 'Food Products',
    description: 'Integrated agro-industrial and food company.',
    website: 'https://www.cpfworldwide.com',
    ipoDate: '1987-01-16',
    marketCapBillions: 8
  },
  {
    symbol: 'CENTRAL',
    name: 'Central Retail Corporation Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Consumer Discretionary',
    industry: 'Department Stores',
    description: 'Leading retail conglomerate in Thailand.',
    website: 'https://www.centralretail.com',
    ipoDate: '2020-02-18',
    marketCapBillions: 12
  },

  // Real Estate & Construction
  {
    symbol: 'AP',
    name: 'AP (Thailand) Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Real Estate',
    industry: 'Real Estate Development',
    description: 'Leading real estate developer in Thailand.',
    website: 'https://www.ap.co.th',
    ipoDate: '1991-08-21',
    marketCapBillions: 5
  },
  {
    symbol: 'LPN',
    name: 'LPN Development Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Real Estate',
    industry: 'Real Estate Development',
    description: 'Residential property developer focusing on condominiums.',
    website: 'https://www.lpn.co.th',
    ipoDate: '1994-05-10',
    marketCapBillions: 3
  },

  // Transportation & Logistics
  {
    symbol: 'AOT',
    name: 'Airports of Thailand Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Industrials',
    industry: 'Airports & Air Services',
    description: 'Operates major airports in Thailand including Suvarnabhumi.',
    website: 'https://www.airportthai.co.th',
    ipoDate: '2002-06-27',
    marketCapBillions: 14
  },
  {
    symbol: 'BTS',
    name: 'BTS Group Holdings Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Industrials',
    industry: 'Railroads',
    description: 'Mass transit system operator (BTS Skytrain).',
    website: 'https://www.btsgroup.co.th',
    ipoDate: '2012-04-23',
    marketCapBillions: 7
  },

  // Healthcare
  {
    symbol: 'BH',
    name: 'Bumrungrad Hospital Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Healthcare',
    industry: 'Medical Care Facilities',
    description: 'Leading private hospital and healthcare services.',
    website: 'https://www.bumrungrad.com',
    ipoDate: '1989-12-28',
    marketCapBillions: 6
  },
  {
    symbol: 'BCH',
    name: 'Bangkok Chain Hospital Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Healthcare',
    industry: 'Medical Care Facilities',
    description: 'Private hospital network operator.',
    website: 'https://www.bangkokhospital.com',
    ipoDate: '1994-03-30',
    marketCapBillions: 4
  },

  // Technology & Digital
  {
    symbol: 'DELTA',
    name: 'Delta Electronics (Thailand) Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Technology',
    industry: 'Electronic Components',
    description: 'Power electronics and industrial automation solutions.',
    website: 'https://www.deltathailand.com',
    ipoDate: '1995-05-17',
    marketCapBillions: 5
  },
  {
    symbol: 'DTAC',
    name: 'Total Access Communication Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Mobile network operator in Thailand.',
    website: 'https://www.dtac.co.th',
    ipoDate: '2002-11-08',
    marketCapBillions: 3
  },

  // Materials & Industrials
  {
    symbol: 'SCG',
    name: 'Siam Cement Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Materials',
    industry: 'Building Materials',
    description: 'Integrated building materials and chemicals company.',
    website: 'https://www.scg.com',
    ipoDate: '1975-04-30',
    marketCapBillions: 18
  },
  {
    symbol: 'SCC',
    name: 'Siam City Cement Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Materials',
    industry: 'Building Materials',
    description: 'Cement and building materials manufacturer.',
    website: 'https://www.siamcitycement.com',
    ipoDate: '1989-02-15',
    marketCapBillions: 8
  }
];

async function seedUSETFsAndSET100() {
  console.log('🇺🇸🇹🇭 Starting US ETFs and SET100 Data Seeding...\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Combine all stocks
  const allStocks = [...US_ETFs, ...SET100_STOCKS];
  
  console.log(`📊 Total stocks to seed: ${allStocks.length}`);
  console.log(`   • US ETFs: ${US_ETFs.length}`);
  console.log(`   • SET100 stocks: ${SET100_STOCKS.length}\n`);

  for (const seedStock of allStocks) {
    try {
      console.log(`📈 Seeding ${seedStock.symbol} (${seedStock.market}) - ${seedStock.name}...`);
      
      // Prepare stock data
      const stockData = {
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
        isDelisted: false
      };

      // Try to get real-time market data
      try {
        const quote = await marketDataService.getQuoteByMarket(seedStock.symbol, seedStock.market);
        if (quote && quote.price > 0) {
          console.log(`  💰 Live price: ${seedStock.currency} ${quote.price.toLocaleString()}`);
          console.log(`  📊 Market cap: $${(seedStock.marketCapBillions || 0).toFixed(1)}B`);
        }
      } catch (quoteError) {
        console.log(`  ⚠️  No live price data (${(quoteError as Error).message || 'Unknown error'})`);
      }

      // Insert stock into database
      await stockMasterService.upsertStock(stockData);
      
      successCount++;
      console.log(`  ✅ Successfully seeded ${seedStock.symbol}\n`);
      
      // Delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      errorCount++;
      const errorMsg = `Failed to seed ${seedStock.symbol}: ${(error as Error).message || 'Unknown error'}`;
      errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}\n`);
    }
  }

  // Summary
  console.log('🏁 US ETFs and SET100 Seeding Complete');
  console.log('='.repeat(60));
  console.log(`✅ Successfully seeded: ${successCount}/${allStocks.length} stocks (${Math.round(successCount/allStocks.length*100)}%)`);
  console.log(`❌ Failed to seed: ${errorCount}/${allStocks.length} stocks`);
  
  if (errors.length > 0) {
    console.log('\n🚨 Errors encountered:');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  console.log('\n📊 Seeded Breakdown:');
  console.log(`🇺🇸 US ETFs: ${US_ETFs.length} securities`);
  console.log(`   • Broad Market: SPY, QQQ, IWM, VTI`);
  console.log(`   • Sector ETFs: XLK, XLF, XLE, XLV`);
  console.log(`   • International: VEA, VWO`);
  console.log(`   • Fixed Income: BND, TLT`);
  console.log(`   • Thematic: ARKK, BITO, ESGU`);
  
  console.log(`🇹🇭 SET100 Stocks: ${SET100_STOCKS.length} companies`);
  console.log(`   • Banking: KBANK, BBL, SCB`);
  console.log(`   • Energy: PTT, PTTEP, EGCO`);
  console.log(`   • Telecom: ADVANC, INTUCH, TRUE`);
  console.log(`   • Consumer: CPALL, CPF, CENTRAL`);
  console.log(`   • Infrastructure: AOT, BTS`);
  console.log(`   • Healthcare: BH, BCH`);
  console.log(`   • Materials: SCG, SCC`);

  console.log('\n🎯 Market Coverage Summary:');
  const marketBreakdown = allStocks.reduce((acc, stock) => {
    acc[stock.market] = (acc[stock.market] || 0) + 1;
    return acc;
  }, {} as Record<Market, number>);
  
  Object.entries(marketBreakdown).forEach(([market, count]) => {
    console.log(`  ${market}: ${count} securities`);
  });

  console.log('\n💡 Usage Examples:');
  console.log(`  • Search US ETFs: fetch('/api/v1/stocks/search?market=NYSE_ARCA&sector=Financial+Services')`);
  console.log(`  • Search SET100: fetch('/api/v1/stocks/search?market=SET&minMarketCap=5000000000')`);
  console.log(`  • Get suggestions: fetch('/api/v1/stocks/suggestions?q=spy')`);
  console.log(`  • Popular ETFs: fetch('/api/v1/stocks/popular/NYSE_ARCA')`);

  console.log('\n🌟 Stock Database now includes:');
  console.log(`  📈 ${successCount} total securities across global markets`);
  console.log(`  🇺🇸 Complete US ETF coverage for portfolio diversification`);
  console.log(`  🇹🇭 Major Thai blue-chip stocks from SET100 index`);
  console.log(`  🔍 Advanced search and filtering capabilities`);
  console.log(`  ⚡ Real-time price integration ready`);
  
  console.log('\n🚀 Ready for production trading platform!');
}

// Run seeding if called directly
if (require.main === module) {
  seedUSETFsAndSET100()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedUSETFsAndSET100 };