-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'SPLIT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'EXECUTED', 'CANCELLED', 'FAILED');

-- CreateEnum  
CREATE TYPE "PerformancePeriod" AS ENUM ('ONE_DAY', 'ONE_WEEK', 'ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'ONE_YEAR', 'THREE_YEARS', 'FIVE_YEARS', 'ALL');

-- CreateTable Portfolio
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalValue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalGainLoss" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalGainLossPercentage" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable PortfolioPosition
CREATE TABLE "PortfolioPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "averageCost" DECIMAL(20,4) NOT NULL,
    "currentPrice" DECIMAL(20,4) NOT NULL,
    "marketValue" DECIMAL(20,2) NOT NULL,
    "gainLoss" DECIMAL(20,2) NOT NULL,
    "gainLossPercentage" DECIMAL(10,4) NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioPosition_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE
);

-- CreateTable Stock
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "marketCap" DECIMAL(20,2),
    "price" DECIMAL(20,4) NOT NULL,
    "change" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "changePercentage" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable StockMetrics
CREATE TABLE "StockMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL UNIQUE,
    "pe" DECIMAL(10,2),
    "eps" DECIMAL(10,2),
    "beta" DECIMAL(10,2),
    "dividendYield" DECIMAL(10,4),
    "fiftyTwoWeekHigh" DECIMAL(20,4),
    "fiftyTwoWeekLow" DECIMAL(20,4),
    "averageVolume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMetrics_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE
);

-- CreateTable Trade
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "TradeType" NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,4) NOT NULL,
    "totalAmount" DECIMAL(20,2) NOT NULL,
    "fees" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE
);

-- CreateTable PortfolioPerformance
CREATE TABLE "PortfolioPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "period" "PerformancePeriod" NOT NULL,
    "totalReturn" DECIMAL(20,2) NOT NULL,
    "totalReturnPercentage" DECIMAL(10,4) NOT NULL,
    "annualizedReturn" DECIMAL(10,4),
    "volatility" DECIMAL(10,4),
    "sharpeRatio" DECIMAL(10,4),
    "maxDrawdown" DECIMAL(10,4),
    "historicalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioPerformance_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE
);

-- CreateTable PortfolioSnapshot
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalValue" DECIMAL(20,2) NOT NULL,
    "totalCost" DECIMAL(20,2) NOT NULL,
    "totalGainLoss" DECIMAL(20,2) NOT NULL,
    "totalGainLossPercentage" DECIMAL(10,4) NOT NULL,
    "positions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE
);

-- CreateTable StockPriceHistory
CREATE TABLE "StockPriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(20,4) NOT NULL,
    "high" DECIMAL(20,4) NOT NULL,
    "low" DECIMAL(20,4) NOT NULL,
    "close" DECIMAL(20,4) NOT NULL,
    "volume" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockPriceHistory_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");
CREATE INDEX "Portfolio_isActive_idx" ON "Portfolio"("isActive");

-- CreateIndex
CREATE INDEX "PortfolioPosition_portfolioId_idx" ON "PortfolioPosition"("portfolioId");
CREATE INDEX "PortfolioPosition_symbol_idx" ON "PortfolioPosition"("symbol");

-- CreateIndex
CREATE INDEX "Stock_symbol_idx" ON "Stock"("symbol");
CREATE INDEX "Stock_sector_idx" ON "Stock"("sector");

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");
CREATE INDEX "Trade_portfolioId_idx" ON "Trade"("portfolioId");
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");
CREATE INDEX "Trade_executedAt_idx" ON "Trade"("executedAt");
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "PortfolioPerformance_portfolioId_idx" ON "PortfolioPerformance"("portfolioId");
CREATE INDEX "PortfolioPerformance_period_idx" ON "PortfolioPerformance"("period");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_portfolioId_date_key" ON "PortfolioSnapshot"("portfolioId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockPriceHistory_stockId_date_key" ON "StockPriceHistory"("stockId", "date");