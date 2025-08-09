-- CreateTable
CREATE TABLE "public"."UserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConfig_userId_idx" ON "public"."UserConfig"("userId");

-- CreateIndex
CREATE INDEX "UserConfig_category_idx" ON "public"."UserConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfig_userId_key_key" ON "public"."UserConfig"("userId", "key");

-- CreateIndex
CREATE INDEX "ApiConfig_userId_idx" ON "public"."ApiConfig"("userId");

-- CreateIndex
CREATE INDEX "ApiConfig_category_idx" ON "public"."ApiConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ApiConfig_userId_key_key" ON "public"."ApiConfig"("userId", "key");

-- AddForeignKey
ALTER TABLE "public"."UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiConfig" ADD CONSTRAINT "ApiConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
