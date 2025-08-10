-- CreateTable
CREATE TABLE "public"."GitConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPath" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "isGitRepo" BOOLEAN NOT NULL,
    "isBare" BOOLEAN NOT NULL,
    "workingDir" TEXT NOT NULL,
    "currentBranch" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "isClean" BOOLEAN NOT NULL,
    "ahead" INTEGER NOT NULL DEFAULT 0,
    "behind" INTEGER NOT NULL DEFAULT 0,
    "staged" INTEGER NOT NULL DEFAULT 0,
    "modified" INTEGER NOT NULL DEFAULT 0,
    "untracked" INTEGER NOT NULL DEFAULT 0,
    "userName" TEXT,
    "userEmail" TEXT,
    "remotes" JSONB NOT NULL,
    "branches" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "gitVersion" TEXT,
    "lastFetch" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GitConfigHistory" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "details" JSONB,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitConfig_projectId_key" ON "public"."GitConfig"("projectId");

-- CreateIndex
CREATE INDEX "GitConfig_projectId_idx" ON "public"."GitConfig"("projectId");

-- CreateIndex
CREATE INDEX "GitConfig_syncedAt_idx" ON "public"."GitConfig"("syncedAt");

-- CreateIndex
CREATE INDEX "GitConfigHistory_configId_idx" ON "public"."GitConfigHistory"("configId");

-- CreateIndex
CREATE INDEX "GitConfigHistory_projectId_idx" ON "public"."GitConfigHistory"("projectId");

-- CreateIndex
CREATE INDEX "GitConfigHistory_userId_idx" ON "public"."GitConfigHistory"("userId");

-- CreateIndex
CREATE INDEX "GitConfigHistory_timestamp_idx" ON "public"."GitConfigHistory"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."GitConfig" ADD CONSTRAINT "GitConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_configId_fkey" FOREIGN KEY ("configId") REFERENCES "public"."GitConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
