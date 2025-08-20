import { PrismaClient, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.stockPrice.deleteMany();
  await prisma.stock.deleteMany();

  console.log('🗑️  Cleaned existing data');

  // Create stocks - Thai stocks (SET)
  const thaiStocks = await Promise.all([
    prisma.stock.create({
      data: {
        symbol: 'PTT.BK',
        name: 'PTT Public Company Limited',
        exchange: 'SET',
        sector: 'Energy',
        industry: 'Oil & Gas',
        marketCap: new Decimal('1200000000000'), // 1.2 trillion THB
        description: 'Thailand\'s national oil and gas company',
        website: 'https://www.pttplc.com'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'CPALL.BK',
        name: 'CP ALL Public Company Limited',
        exchange: 'SET',
        sector: 'Consumer',
        industry: 'Retail',
        marketCap: new Decimal('560000000000'), // 560 billion THB
        description: 'Operator of 7-Eleven stores in Thailand',
        website: 'https://www.cpall.co.th'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'AOT.BK',
        name: 'Airports of Thailand PCL',
        exchange: 'SET',
        sector: 'Transportation',
        industry: 'Airports',
        marketCap: new Decimal('980000000000'), // 980 billion THB
        description: 'Operates major airports in Thailand',
        website: 'https://www.airportthai.co.th'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'SCB.BK',
        name: 'Siam Commercial Bank',
        exchange: 'SET',
        sector: 'Financial',
        industry: 'Banking',
        marketCap: new Decimal('450000000000'), // 450 billion THB
        description: 'One of Thailand\'s largest commercial banks',
        website: 'https://www.scb.co.th'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'KBANK.BK',
        name: 'Kasikornbank PCL',
        exchange: 'SET',
        sector: 'Financial',
        industry: 'Banking',
        marketCap: new Decimal('380000000000'), // 380 billion THB
        description: 'Leading Thai commercial bank',
        website: 'https://www.kasikornbank.com'
      }
    })
  ]);

  // Create stocks - US stocks
  const usStocks = await Promise.all([
    prisma.stock.create({
      data: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: new Decimal('3500000000000'), // 3.5 trillion USD
        description: 'Designs, manufactures, and markets smartphones, computers, and consumer electronics',
        website: 'https://www.apple.com'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software',
        marketCap: new Decimal('3200000000000'), // 3.2 trillion USD
        description: 'Develops, licenses, and supports software, services, devices, and solutions',
        website: 'https://www.microsoft.com'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Internet Services',
        marketCap: new Decimal('2200000000000'), // 2.2 trillion USD
        description: 'Parent company of Google, specializing in internet services and products',
        website: 'https://www.abc.xyz'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        exchange: 'NASDAQ',
        sector: 'Consumer Cyclical',
        industry: 'E-Commerce',
        marketCap: new Decimal('1900000000000'), // 1.9 trillion USD
        description: 'E-commerce, cloud computing, digital streaming, and artificial intelligence company',
        website: 'https://www.amazon.com'
      }
    }),
    prisma.stock.create({
      data: {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        exchange: 'NASDAQ',
        sector: 'Consumer Cyclical',
        industry: 'Electric Vehicles',
        marketCap: new Decimal('850000000000'), // 850 billion USD
        description: 'Designs, develops, manufactures, and sells electric vehicles and energy storage',
        website: 'https://www.tesla.com'
      }
    })
  ]);

  console.log('📈 Created stocks:', [...thaiStocks, ...usStocks].length);

  // Add current prices for stocks
  for (const stock of thaiStocks) {
    const basePrice = stock.symbol === 'PTT.BK' ? 36.25 :
                     stock.symbol === 'CPALL.BK' ? 62.50 :
                     stock.symbol === 'AOT.BK' ? 68.75 :
                     stock.symbol === 'SCB.BK' ? 132.50 :
                     stock.symbol === 'KBANK.BK' ? 158.00 : 100;

    await prisma.stockPrice.create({
      data: {
        stockId: stock.id,
        symbol: stock.symbol,
        price: new Decimal(basePrice),
        open: new Decimal(basePrice * 0.98),
        high: new Decimal(basePrice * 1.02),
        low: new Decimal(basePrice * 0.97),
        close: new Decimal(basePrice),
        volume: BigInt(Math.floor(Math.random() * 10000000) + 1000000),
        change: new Decimal(basePrice * 0.015),
        changePercent: new Decimal(1.5)
      }
    });
  }

  for (const stock of usStocks) {
    const basePrice = stock.symbol === 'AAPL' ? 224.31 :
                     stock.symbol === 'MSFT' ? 420.21 :
                     stock.symbol === 'GOOGL' ? 164.90 :
                     stock.symbol === 'AMZN' ? 215.09 :
                     stock.symbol === 'TSLA' ? 204.79 : 100;

    await prisma.stockPrice.create({
      data: {
        stockId: stock.id,
        symbol: stock.symbol,
        price: new Decimal(basePrice),
        open: new Decimal(basePrice * 0.99),
        high: new Decimal(basePrice * 1.01),
        low: new Decimal(basePrice * 0.98),
        close: new Decimal(basePrice),
        volume: BigInt(Math.floor(Math.random() * 50000000) + 5000000),
        change: new Decimal(basePrice * 0.008),
        changePercent: new Decimal(0.8)
      }
    });
  }

  console.log('💰 Added stock prices');

  // Create sample portfolios
  const userId1 = 'user_sankaz_001';
  const userId2 = 'user_test_002';

  // Portfolio 1: Thai Portfolio (THB)
  const thaiPortfolio = await prisma.portfolio.create({
    data: {
      userId: userId1,
      name: 'Thai Stock Portfolio',
      description: 'My main Thai stock investments',
      currency: 'THB',
      isDefault: true
    }
  });

  // Portfolio 2: US Portfolio (USD)
  const usPortfolio = await prisma.portfolio.create({
    data: {
      userId: userId1,
      name: 'US Tech Portfolio',
      description: 'Technology stocks from US markets',
      currency: 'USD',
      isDefault: false
    }
  });

  // Portfolio 3: Mixed Portfolio (THB)
  const mixedPortfolio = await prisma.portfolio.create({
    data: {
      userId: userId2,
      name: 'Diversified Portfolio',
      description: 'Mixed Thai and international stocks',
      currency: 'THB',
      isDefault: true
    }
  });

  console.log('📁 Created portfolios:', 3);

  // Add holdings to Thai Portfolio
  const thaiHoldings = await Promise.all([
    prisma.holding.create({
      data: {
        portfolioId: thaiPortfolio.id,
        symbol: 'PTT.BK',
        quantity: new Decimal(1000),
        averagePrice: new Decimal(35.50)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: thaiPortfolio.id,
        symbol: 'CPALL.BK',
        quantity: new Decimal(500),
        averagePrice: new Decimal(60.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: thaiPortfolio.id,
        symbol: 'AOT.BK',
        quantity: new Decimal(300),
        averagePrice: new Decimal(65.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: thaiPortfolio.id,
        symbol: 'SCB.BK',
        quantity: new Decimal(200),
        averagePrice: new Decimal(128.00)
      }
    })
  ]);

  // Add holdings to US Portfolio
  const usHoldings = await Promise.all([
    prisma.holding.create({
      data: {
        portfolioId: usPortfolio.id,
        symbol: 'AAPL',
        quantity: new Decimal(50.5),
        averagePrice: new Decimal(215.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: usPortfolio.id,
        symbol: 'MSFT',
        quantity: new Decimal(25.25),
        averagePrice: new Decimal(405.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: usPortfolio.id,
        symbol: 'GOOGL',
        quantity: new Decimal(30.75),
        averagePrice: new Decimal(160.00)
      }
    })
  ]);

  // Add holdings to Mixed Portfolio
  const mixedHoldings = await Promise.all([
    prisma.holding.create({
      data: {
        portfolioId: mixedPortfolio.id,
        symbol: 'PTT.BK',
        quantity: new Decimal(500),
        averagePrice: new Decimal(34.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: mixedPortfolio.id,
        symbol: 'KBANK.BK',
        quantity: new Decimal(250),
        averagePrice: new Decimal(155.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: mixedPortfolio.id,
        symbol: 'AMZN',
        quantity: new Decimal(10.123456),
        averagePrice: new Decimal(200.00)
      }
    }),
    prisma.holding.create({
      data: {
        portfolioId: mixedPortfolio.id,
        symbol: 'TSLA',
        quantity: new Decimal(15.7654321),
        averagePrice: new Decimal(195.00)
      }
    })
  ]);

  console.log('📊 Created holdings:', [...thaiHoldings, ...usHoldings, ...mixedHoldings].length);

  // Add transactions for Thai Portfolio
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        portfolioId: thaiPortfolio.id,
        holdingId: thaiHoldings[0].id,
        type: TransactionType.BUY,
        symbol: 'PTT.BK',
        quantity: new Decimal(1000),
        price: new Decimal(35.50),
        fees: new Decimal(89),
        total: new Decimal(35589),
        notes: 'Initial purchase of PTT',
        executedAt: new Date('2024-01-15')
      }
    }),
    prisma.transaction.create({
      data: {
        portfolioId: thaiPortfolio.id,
        holdingId: thaiHoldings[1].id,
        type: TransactionType.BUY,
        symbol: 'CPALL.BK',
        quantity: new Decimal(500),
        price: new Decimal(60.00),
        fees: new Decimal(75),
        total: new Decimal(30075),
        notes: 'Adding CPALL to portfolio',
        executedAt: new Date('2024-02-20')
      }
    }),
    prisma.transaction.create({
      data: {
        portfolioId: usPortfolio.id,
        holdingId: usHoldings[0].id,
        type: TransactionType.BUY,
        symbol: 'AAPL',
        quantity: new Decimal(50.5),
        price: new Decimal(215.00),
        fees: new Decimal(10.86),
        total: new Decimal(10868.36),
        notes: 'Apple stock purchase',
        executedAt: new Date('2024-03-10')
      }
    }),
    prisma.transaction.create({
      data: {
        portfolioId: mixedPortfolio.id,
        holdingId: mixedHoldings[2].id,
        type: TransactionType.BUY,
        symbol: 'AMZN',
        quantity: new Decimal(10.123456),
        price: new Decimal(200.00),
        fees: new Decimal(2.02),
        total: new Decimal(2026.71),
        notes: 'Fractional shares purchase',
        executedAt: new Date('2024-04-05')
      }
    }),
    prisma.transaction.create({
      data: {
        portfolioId: mixedPortfolio.id,
        holdingId: mixedHoldings[3].id,
        type: TransactionType.BUY,
        symbol: 'TSLA',
        quantity: new Decimal(15.7654321),
        price: new Decimal(195.00),
        fees: new Decimal(3.07),
        total: new Decimal(3077.36),
        notes: 'Tesla fractional shares',
        executedAt: new Date('2024-04-15')
      }
    })
  ]);

  console.log('💸 Created transactions:', transactions.length);

  // Create watchlists
  const watchlists = await Promise.all([
    prisma.watchlist.create({
      data: {
        portfolioId: thaiPortfolio.id,
        userId: userId1,
        name: 'SET50 Watchlist',
        symbols: ['PTT.BK', 'CPALL.BK', 'AOT.BK', 'SCB.BK', 'KBANK.BK', 'BBL.BK', 'ADVANC.BK']
      }
    }),
    prisma.watchlist.create({
      data: {
        portfolioId: usPortfolio.id,
        userId: userId1,
        name: 'Tech Giants',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META']
      }
    }),
    prisma.watchlist.create({
      data: {
        portfolioId: mixedPortfolio.id,
        userId: userId2,
        name: 'My Watchlist',
        symbols: ['PTT.BK', 'KBANK.BK', 'AAPL', 'AMZN', 'TSLA']
      }
    })
  ]);

  console.log('👀 Created watchlists:', watchlists.length);

  // Create portfolio snapshots
  const snapshots = await Promise.all([
    prisma.portfolioSnapshot.create({
      data: {
        portfolioId: thaiPortfolio.id,
        totalValue: new Decimal(140625),
        totalCost: new Decimal(110100),
        dayChange: new Decimal(2109.38),
        dayChangePercent: new Decimal(1.52),
        totalReturn: new Decimal(30525),
        totalReturnPercent: new Decimal(27.73),
        timestamp: new Date()
      }
    }),
    prisma.portfolioSnapshot.create({
      data: {
        portfolioId: usPortfolio.id,
        totalValue: new Decimal(26093.69),
        totalCost: new Decimal(25700),
        dayChange: new Decimal(208.75),
        dayChangePercent: new Decimal(0.81),
        totalReturn: new Decimal(393.69),
        totalReturnPercent: new Decimal(1.53),
        timestamp: new Date()
      }
    }),
    prisma.portfolioSnapshot.create({
      data: {
        portfolioId: mixedPortfolio.id,
        totalValue: new Decimal(61402.44),
        totalCost: new Decimal(58602.07),
        dayChange: new Decimal(921.04),
        dayChangePercent: new Decimal(1.52),
        totalReturn: new Decimal(2800.37),
        totalReturnPercent: new Decimal(4.78),
        timestamp: new Date()
      }
    })
  ]);

  console.log('📸 Created portfolio snapshots:', snapshots.length);

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Stocks: ${[...thaiStocks, ...usStocks].length} (${thaiStocks.length} Thai, ${usStocks.length} US)`);
  console.log(`   - Portfolios: 3`);
  console.log(`   - Holdings: ${[...thaiHoldings, ...usHoldings, ...mixedHoldings].length}`);
  console.log(`   - Transactions: ${transactions.length}`);
  console.log(`   - Watchlists: ${watchlists.length}`);
  console.log(`   - Snapshots: ${snapshots.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });