-- CreateTable
CREATE TABLE "market_quotes" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "close" DOUBLE PRECISION,
    "previousClose" DOUBLE PRECISION,
    "volume" BIGINT,
    "change" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "marketCap" BIGINT,
    "delaySeconds" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'polygon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_bars" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "vwap" DOUBLE PRECISION,
    "timeframe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_bars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_symbols" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "type" TEXT,
    "currency" TEXT,
    "country" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "marketCap" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_tracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "apiCallsUsed" INTEGER NOT NULL DEFAULT 1,
    "rateLimitRemaining" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiProvider" TEXT NOT NULL DEFAULT 'polygon',
    "credits" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "api_usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_quotes_symbol_timestamp_idx" ON "market_quotes"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "market_bars_symbol_timeframe_idx" ON "market_bars"("symbol", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "market_bars_symbol_timestamp_timeframe_key" ON "market_bars"("symbol", "timestamp", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "market_symbols_symbol_key" ON "market_symbols"("symbol");

-- CreateIndex
CREATE INDEX "api_usage_tracking_userId_timestamp_idx" ON "api_usage_tracking"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "api_usage_tracking_endpoint_timestamp_idx" ON "api_usage_tracking"("endpoint", "timestamp");
