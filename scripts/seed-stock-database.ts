#!/usr/bin/env ts-node

/**
 * Seed Stock Database with Real Stock Data
 * Populates the stock_master table with actual stock information
 */

import { stockMasterService } from '../services/portfolio/src/services/stock-master.service';
import { marketDataService } from '../services/portfolio/src/services/market-data.service';
import { Market, Currency } from '../services/portfolio/src/types';

interface SeedStockData {
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
}

// Comprehensive stock data for seeding
const seedStocks: SeedStockData[] = [
  // US Tech Giants
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    website: 'https://www.apple.com',
    ipoDate: '1980-12-12'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ', 
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Internet Content & Information',
    description: 'Alphabet Inc. provides online advertising services worldwide through its Google search engine and other properties.',
    website: 'https://www.alphabet.com',
    ipoDate: '2004-08-19'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Software - Infrastructure',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
    website: 'https://www.microsoft.com',
    ipoDate: '1986-03-13'
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Consumer Discretionary',
    industry: 'Internet Retail',
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.',
    website: 'https://www.amazon.com',
    ipoDate: '1997-05-15'
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Consumer Discretionary',
    industry: 'Auto Manufacturers',
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
    website: 'https://www.tesla.com',
    ipoDate: '2010-06-29'
  },
  {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Internet Content & Information',
    description: 'Meta Platforms, Inc. develops products that enable people to connect and share with friends and family through mobile devices, personal computers, virtual reality headsets, and wearables.',
    website: 'https://www.meta.com',
    ipoDate: '2012-05-18'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    market: Market.NASDAQ,
    country: 'US',
    currency: Currency.USD,
    sector: 'Technology',
    industry: 'Semiconductors',
    description: 'NVIDIA Corporation operates as a computing company in the United States, Taiwan, China, Hong Kong, and internationally.',
    website: 'https://www.nvidia.com',
    ipoDate: '1999-01-22'
  },

  // US Blue Chips (NYSE)
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    exchange: 'NYSE',
    market: Market.NYSE,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Banks - Diversified',
    description: 'JPMorgan Chase & Co. operates as a financial services company worldwide.',
    website: 'https://www.jpmorganchase.com',
    ipoDate: '1969-03-05'
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    exchange: 'NYSE',
    market: Market.NYSE,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Credit Services',
    description: 'Visa Inc. operates as a payments technology company worldwide.',
    website: 'https://www.visa.com',
    ipoDate: '2008-03-19'
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    exchange: 'NYSE',
    market: Market.NYSE,
    country: 'US',
    currency: Currency.USD,
    sector: 'Healthcare',
    industry: 'Drug Manufacturers - General',
    description: 'Johnson & Johnson researches and develops, manufactures, and sells a range of products in the healthcare field worldwide.',
    website: 'https://www.jnj.com',
    ipoDate: '1944-09-25'
  },

  // Popular ETFs (NYSE Arca)
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'SPDR S&P 500 ETF Trust seeks to provide investment results that correspond generally to the price and yield performance of the S&P 500 Index.',
    website: 'https://www.ssga.com',
    ipoDate: '1993-01-22'
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
    description: 'Invesco QQQ Trust tracks the NASDAQ-100 Index, which includes 100 of the largest domestic and international non-financial securities listed on the NASDAQ Stock Market.',
    ipoDate: '1999-03-10'
  },
  {
    symbol: 'ICOI',
    name: 'Bitwise COIN Option Income Strategy ETF',
    exchange: 'NYSE Arca',
    market: Market.NYSE_ARCA,
    country: 'US',
    currency: Currency.USD,
    sector: 'Financial Services',
    industry: 'Asset Management',
    description: 'Bitwise COIN Option Income Strategy ETF seeks to track the performance of Coinbase Global Inc. while generating income through a covered call strategy.',
    ipoDate: '2024-01-01'
  },

  // Thai Stocks (SET)
  {
    symbol: 'CPALL',
    name: 'CP ALL Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Consumer Staples',
    industry: 'Grocery Stores',
    description: 'CP ALL PCL operates convenience stores in Thailand and other countries in Asia.',
    website: 'https://www.cpall.co.th',
    ipoDate: '1988-11-29'
  },
  {
    symbol: 'PTT',
    name: 'PTT Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Energy',
    industry: 'Oil & Gas Integrated',
    description: 'PTT PCL operates as a national oil company of Thailand.',
    website: 'https://www.pttplc.com',
    ipoDate: '2001-12-14'
  },
  {
    symbol: 'KBANK',
    name: 'Kasikornbank Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Financial Services',
    industry: 'Banks - Regional',
    description: 'Kasikornbank PCL provides banking and financial services in Thailand.',
    website: 'https://www.kasikornbank.com',
    ipoDate: '1993-06-08'
  },
  {
    symbol: 'ADVANC',
    name: 'Advanced Info Service Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'Advanced Info Service PCL provides mobile phone services in Thailand.',
    website: 'https://www.ais.co.th',
    ipoDate: '1991-04-11'
  },
  {
    symbol: 'AOT',
    name: 'Airports of Thailand Public Company Limited',
    exchange: 'SET',
    market: Market.SET,
    country: 'TH',
    currency: Currency.THB,
    sector: 'Industrials',
    industry: 'Airports & Air Services',
    description: 'Airports of Thailand PCL operates and manages airports in Thailand.',
    website: 'https://www.airportthai.co.th',
    ipoDate: '2002-06-27'
  },

  // Hong Kong Stocks
  {
    symbol: '0700',
    name: 'Tencent Holdings Limited',
    exchange: 'HKSE',
    market: Market.HKSE,
    country: 'HK',
    currency: Currency.HKD,
    sector: 'Technology',
    industry: 'Internet Content & Information',
    description: 'Tencent Holdings Limited provides Internet value-added services in China.',
    website: 'https://www.tencent.com',
    ipoDate: '2004-06-16'
  },
  {
    symbol: '0941',
    name: 'China Mobile Limited',
    exchange: 'HKSE',
    market: Market.HKSE,
    country: 'HK',
    currency: Currency.HKD,
    sector: 'Communication Services',
    industry: 'Telecom Services',
    description: 'China Mobile Limited provides mobile telecommunications and related services in China.',
    website: 'https://www.chinamobile.com',
    ipoDate: '1997-10-23'
  },
  {
    symbol: '0005',
    name: 'HSBC Holdings plc',
    exchange: 'HKSE',
    market: Market.HKSE,
    country: 'HK',
    currency: Currency.HKD,
    sector: 'Financial Services',
    industry: 'Banks - Diversified',
    description: 'HSBC Holdings plc provides banking and financial services worldwide.',
    website: 'https://www.hsbc.com',
    ipoDate: '1991-11-25'
  },

  // Japanese Stocks
  {
    symbol: '7203',
    name: 'Toyota Motor Corporation',
    exchange: 'TSE',
    market: Market.TSE,
    country: 'JP',
    currency: Currency.JPY,
    sector: 'Consumer Discretionary',
    industry: 'Auto Manufacturers',
    description: 'Toyota Motor Corporation designs, manufactures, and sells passenger cars, minivans, and commercial vehicles worldwide.',
    website: 'https://www.toyota.com',
    ipoDate: '1949-05-16'
  },
  {
    symbol: '6758',
    name: 'Sony Group Corporation',
    exchange: 'TSE',
    market: Market.TSE,
    country: 'JP',
    currency: Currency.JPY,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    description: 'Sony Group Corporation designs, develops, produces, and sells electronic equipment, instruments, and devices.',
    website: 'https://www.sony.com',
    ipoDate: '1958-12-04'
  },
  {
    symbol: '9984',
    name: 'SoftBank Group Corp.',
    exchange: 'TSE',
    market: Market.TSE,
    country: 'JP',
    currency: Currency.JPY,
    sector: 'Technology',
    industry: 'Telecom Services',
    description: 'SoftBank Group Corp. operates as a strategic investment holding company in Japan.',
    website: 'https://www.softbank.jp',
    ipoDate: '1994-07-19'
  }
];

async function seedStockDatabase() {
  console.log('🌱 Starting Stock Database Seeding...\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const seedStock of seedStocks) {
    try {
      console.log(`📈 Seeding ${seedStock.symbol} (${seedStock.market})...`);
      
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
        isActive: true,
        isDelisted: false
      };

      // Try to get real-time market data to enrich the stock
      try {
        const quote = await marketDataService.getQuoteByMarket(seedStock.symbol, seedStock.market);
        if (quote) {
          console.log(`  💰 Got live price: $${quote.price}`);
          // Add real market data if available (would be implemented in production)
        }
      } catch (quoteError) {
        console.log(`  ⚠️  No live price data available`);
      }

      // Insert stock into database
      await stockMasterService.upsertStock(stockData);
      
      successCount++;
      console.log(`  ✅ Successfully seeded ${seedStock.symbol}\n`);
      
      // Small delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      errorCount++;
      const errorMsg = `Failed to seed ${seedStock.symbol}: ${error.message}`;
      errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}\n`);
    }
  }

  // Summary
  console.log('🏁 Stock Database Seeding Complete');
  console.log('=' .repeat(50));
  console.log(`✅ Successfully seeded: ${successCount}/${seedStocks.length} stocks`);
  console.log(`❌ Failed to seed: ${errorCount}/${seedStocks.length} stocks`);
  
  if (errors.length > 0) {
    console.log('\n🚨 Errors encountered:');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  console.log('\n📊 Seeded Stock Summary by Market:');
  const marketCounts = seedStocks.reduce((acc, stock) => {
    acc[stock.market] = (acc[stock.market] || 0) + 1;
    return acc;
  }, {} as Record<Market, number>);
  
  Object.entries(marketCounts).forEach(([market, count]) => {
    console.log(`  ${market}: ${count} stocks`);
  });

  console.log('\n💡 Next Steps:');
  console.log('  1. Run portfolio service to access stock database');
  console.log('  2. Use Stock Selector component in forms');
  console.log('  3. Test stock search and filtering APIs');
  console.log('  4. Set up periodic price updates');
  
  console.log('\n🌟 Stock Database is ready for production use!');
}

// Run seeding if called directly
if (require.main === module) {
  seedStockDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedStockDatabase };