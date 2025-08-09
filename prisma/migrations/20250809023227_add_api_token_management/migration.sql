-- CreateTable
CREATE TABLE "public"."ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiUsageLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiRateLimit" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiWebhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_token_key" ON "public"."ApiToken"("token");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "public"."ApiToken"("userId");

-- CreateIndex
CREATE INDEX "ApiToken_token_idx" ON "public"."ApiToken"("token");

-- CreateIndex
CREATE INDEX "ApiToken_isActive_idx" ON "public"."ApiToken"("isActive");

-- CreateIndex
CREATE INDEX "ApiToken_expiresAt_idx" ON "public"."ApiToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_tokenId_idx" ON "public"."ApiUsageLog"("tokenId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_userId_idx" ON "public"."ApiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_endpoint_idx" ON "public"."ApiUsageLog"("endpoint");

-- CreateIndex
CREATE INDEX "ApiUsageLog_createdAt_idx" ON "public"."ApiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_statusCode_idx" ON "public"."ApiUsageLog"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ApiRateLimit_tokenId_key" ON "public"."ApiRateLimit"("tokenId");

-- CreateIndex
CREATE INDEX "ApiRateLimit_tokenId_idx" ON "public"."ApiRateLimit"("tokenId");

-- CreateIndex
CREATE INDEX "ApiRateLimit_windowStart_idx" ON "public"."ApiRateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "ApiWebhook_userId_idx" ON "public"."ApiWebhook"("userId");

-- CreateIndex
CREATE INDEX "ApiWebhook_isActive_idx" ON "public"."ApiWebhook"("isActive");

-- AddForeignKey
ALTER TABLE "public"."ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "public"."ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiWebhook" ADD CONSTRAINT "ApiWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
