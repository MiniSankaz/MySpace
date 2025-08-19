import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPortfolioStocks() {
  try {
    // Get all unique stock symbols from holdings
    const holdings = await prisma.holdings.findMany({
      select: {
        symbol: true
      },
      distinct: ['symbol']
    });

    console.log('\n📊 หุ้นที่มีใน Portfolio Database:');
    console.log('================================');
    
    if (holdings.length === 0) {
      console.log('❌ ไม่พบหุ้นใน holdings table');
    } else {
      holdings.forEach((holding, index) => {
        console.log(`${index + 1}. ${holding.symbol}`);
      });
      console.log(`\n✅ พบหุ้นทั้งหมด ${holdings.length} ตัว`);
    }

    // Check stocks table as well
    const stocks = await prisma.stocks.findMany({
      select: {
        symbol: true,
        name: true
      }
    });

    console.log('\n📈 หุ้นที่มีใน Stocks Master Table:');
    console.log('====================================');
    
    if (stocks.length === 0) {
      console.log('❌ ไม่พบหุ้นใน stocks table');
    } else {
      stocks.forEach((stock, index) => {
        console.log(`${index + 1}. ${stock.symbol} - ${stock.name}`);
      });
      console.log(`\n✅ พบหุ้นทั้งหมด ${stocks.length} ตัว`);
    }

    // Check transactions for symbols
    const transactions = await prisma.transactions.findMany({
      select: {
        symbol: true
      },
      distinct: ['symbol']
    });

    console.log('\n💰 หุ้นที่มีการซื้อขายใน Transactions:');
    console.log('=======================================');
    
    if (transactions.length === 0) {
      console.log('❌ ไม่พบ transactions');
    } else {
      transactions.forEach((trans, index) => {
        console.log(`${index + 1}. ${trans.symbol}`);
      });
      console.log(`\n✅ พบหุ้นที่มีการซื้อขาย ${transactions.length} ตัว`);
    }

    // Get all unique symbols
    const allSymbols = new Set([
      ...holdings.map(h => h.symbol),
      ...stocks.map(s => s.symbol),
      ...transactions.map(t => t.symbol)
    ]);

    console.log('\n🎯 สรุปหุ้นทั้งหมดที่ต้อง request จาก API:');
    console.log('===========================================');
    Array.from(allSymbols).forEach((symbol, index) => {
      console.log(`${index + 1}. ${symbol}`);
    });
    console.log(`\n✅ หุ้นทั้งหมด ${allSymbols.size} ตัว\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPortfolioStocks();