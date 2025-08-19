import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding portfolio data...");

  try {
    // Create test user if not exists
    let user = await prisma.user.findUnique({
      where: { email: "portfolio@user.com" }
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash("Portfolio@2025", 10);
      user = await prisma.user.create({
        data: {
          email: "portfolio@user.com",
          name: "Portfolio User",
          password: hashedPassword,
          role: "USER",
          isActive: true,
        }
      });
      console.log("✅ Created portfolio user");
    }

    // Create portfolios
    const portfolio1 = await prisma.portfolio.create({
      data: {
        name: "Growth Portfolio",
        description: "High growth tech stocks",
        userId: user.id,
        initialCapital: 100000,
        currentValue: 125432.56,
        totalInvested: 100000,
        totalGain: 25432.56,
        totalGainPercent: 25.43,
      }
    });

    const portfolio2 = await prisma.portfolio.create({
      data: {
        name: "Dividend Income",
        description: "Dividend focused portfolio",
        userId: user.id,
        initialCapital: 80000,
        currentValue: 85234.12,
        totalInvested: 80000,
        totalGain: 5234.12,
        totalGainPercent: 6.54,
      }
    });

    const portfolio3 = await prisma.portfolio.create({
      data: {
        name: "Tech Stocks",
        description: "Technology sector focus",
        userId: user.id,
        initialCapital: 40000,
        currentValue: 45678.90,
        totalInvested: 40000,
        totalGain: 5678.90,
        totalGainPercent: 14.20,
      }
    });

    // Create holdings for portfolio 1
    await prisma.holding.createMany({
      data: [
        {
          portfolioId: portfolio1.id,
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: 100,
          avgCost: 150.25,
          currentPrice: 178.23,
          value: 17823.00,
          dayChange: 345.00,
          dayChangePercent: 1.97,
          totalGain: 2798.00,
          totalGainPercent: 18.63,
        },
        {
          portfolioId: portfolio1.id,
          symbol: "MSFT",
          name: "Microsoft Corp",
          quantity: 50,
          avgCost: 380.50,
          currentPrice: 412.56,
          value: 20628.00,
          dayChange: -115.50,
          dayChangePercent: -0.56,
          totalGain: 1603.00,
          totalGainPercent: 8.42,
        },
        {
          portfolioId: portfolio1.id,
          symbol: "GOOGL",
          name: "Alphabet Inc",
          quantity: 75,
          avgCost: 125.00,
          currentPrice: 142.78,
          value: 10708.50,
          dayChange: 425.25,
          dayChangePercent: 4.13,
          totalGain: 1333.50,
          totalGainPercent: 14.22,
        },
        {
          portfolioId: portfolio1.id,
          symbol: "NVDA",
          name: "NVIDIA Corp",
          quantity: 30,
          avgCost: 400.00,
          currentPrice: 456.78,
          value: 13703.40,
          dayChange: 261.90,
          dayChangePercent: 1.91,
          totalGain: 1703.40,
          totalGainPercent: 14.20,
        },
      ]
    });

    console.log("✅ Created portfolios:", {
      portfolio1: portfolio1.id,
      portfolio2: portfolio2.id,
      portfolio3: portfolio3.id,
    });

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });