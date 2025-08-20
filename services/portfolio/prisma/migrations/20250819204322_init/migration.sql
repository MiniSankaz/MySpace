-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "public"."portfolios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holdings" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "averagePrice" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "holdingId" TEXT,
    "type" "public"."TransactionType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "fees" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stocks" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "marketCap" DECIMAL(65,30),
    "description" TEXT,
    "website" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_prices" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "open" DECIMAL(65,30),
    "high" DECIMAL(65,30),
    "low" DECIMAL(65,30),
    "close" DECIMAL(65,30),
    "volume" BIGINT,
    "change" DECIMAL(65,30),
    "changePercent" DECIMAL(65,30),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."watchlists" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbols" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "totalValue" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "dayChange" DECIMAL(65,30) NOT NULL,
    "dayChangePercent" DECIMAL(65,30) NOT NULL,
    "totalReturn" DECIMAL(65,30) NOT NULL,
    "totalReturnPercent" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolios_userId_idx" ON "public"."portfolios"("userId");

-- CreateIndex
CREATE INDEX "holdings_portfolioId_idx" ON "public"."holdings"("portfolioId");

-- CreateIndex
CREATE INDEX "holdings_symbol_idx" ON "public"."holdings"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_portfolioId_symbol_key" ON "public"."holdings"("portfolioId", "symbol");

-- CreateIndex
CREATE INDEX "transactions_portfolioId_idx" ON "public"."transactions"("portfolioId");

-- CreateIndex
CREATE INDEX "transactions_symbol_idx" ON "public"."transactions"("symbol");

-- CreateIndex
CREATE INDEX "transactions_executedAt_idx" ON "public"."transactions"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_symbol_key" ON "public"."stocks"("symbol");

-- CreateIndex
CREATE INDEX "stocks_symbol_idx" ON "public"."stocks"("symbol");

-- CreateIndex
CREATE INDEX "stock_prices_stockId_idx" ON "public"."stock_prices"("stockId");

-- CreateIndex
CREATE INDEX "stock_prices_symbol_idx" ON "public"."stock_prices"("symbol");

-- CreateIndex
CREATE INDEX "stock_prices_timestamp_idx" ON "public"."stock_prices"("timestamp");

-- CreateIndex
CREATE INDEX "watchlists_portfolioId_idx" ON "public"."watchlists"("portfolioId");

-- CreateIndex
CREATE INDEX "watchlists_userId_idx" ON "public"."watchlists"("userId");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_portfolioId_idx" ON "public"."portfolio_snapshots"("portfolioId");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_timestamp_idx" ON "public"."portfolio_snapshots"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "public"."holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_prices" ADD CONSTRAINT "stock_prices_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."watchlists" ADD CONSTRAINT "watchlists_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
