-- CreateTable for project preferences
CREATE TABLE IF NOT EXISTS "ProjectPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "customIcon" TEXT,
    "customColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable for user sidebar settings
CREATE TABLE IF NOT EXISTS "UserSidebarSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL DEFAULT 250,
    "sortBy" TEXT NOT NULL DEFAULT 'lastAccessed',
    "viewMode" TEXT NOT NULL DEFAULT 'icons',
    "showStatusIndicators" BOOLEAN NOT NULL DEFAULT true,
    "groupBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSidebarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable for project status cache
CREATE TABLE IF NOT EXISTS "ProjectStatusCache" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gitStatus" JSONB,
    "terminalStatus" JSONB,
    "buildStatus" TEXT,
    "hasErrors" BOOLEAN NOT NULL DEFAULT false,
    "hasWarnings" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStatusCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPreferences_userId_projectId_key" ON "ProjectPreferences"("userId", "projectId");
CREATE INDEX "ProjectPreferences_userId_isPinned_idx" ON "ProjectPreferences"("userId", "isPinned");
CREATE INDEX "ProjectPreferences_userId_lastAccessedAt_idx" ON "ProjectPreferences"("userId", "lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSidebarSettings_userId_key" ON "UserSidebarSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatusCache_projectId_key" ON "ProjectStatusCache"("projectId");
CREATE INDEX "ProjectStatusCache_lastUpdatedAt_idx" ON "ProjectStatusCache"("lastUpdatedAt");

-- AddForeignKey
ALTER TABLE "ProjectPreferences" ADD CONSTRAINT "ProjectPreferences_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPreferences" ADD CONSTRAINT "ProjectPreferences_projectId_fkey" 
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSidebarSettings" ADD CONSTRAINT "UserSidebarSettings_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusCache" ADD CONSTRAINT "ProjectStatusCache_projectId_fkey" 
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;